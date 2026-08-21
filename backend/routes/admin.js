import express from "express";
import multer from "multer";
import supabase from "../lib/supabase.js";
import {
  parseRTIDocument,
  generateEmbedding,
  buildEmbeddingText,
  geminiWithRetry,
  checkAndIncrementGeminiUsage,
} from "../lib/gemini.js";
import { normalizeState } from "../lib/stateNormalizer.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    // Zip-extracted blobs often arrive as octet-stream; real validation is
    // done in the route via %PDF magic bytes
    const okType = ["application/pdf", "application/octet-stream", ""].includes(file.mimetype || "");
    const okName = (file.originalname || "").toLowerCase().endsWith(".pdf");
    if (okType || okName) cb(null, true);
    else cb(new Error("Only PDF files are accepted"));
  },
});

const STATUS_MAP = {
  responded: "full_response",
  partial: "partial_response",
  pending: "no_response",
  rejected: "no_response",
  appealed: "no_response",
};

function sanitizeFilename(name) {
  const base = (name || "file.pdf").split("/").pop();
  const safe = base.replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "");
  return safe && safe !== ".pdf" ? safe : `file-${Date.now()}.pdf`;
}

// ---------------------------------------------------------------------------
// GET /api/admin/me — auth ping so the frontend can verify admin access
// ---------------------------------------------------------------------------
router.get("/me", (req, res) => {
  res.json({ email: req.adminUser.email });
});

// ---------------------------------------------------------------------------
// POST /api/admin/process-pdf
// One PDF from the admin bulk-upload loop:
//   Storage → Gemini parse → embedding → insert rti_entries → dept upsert
// Duplicate check is intentionally skipped (admin bulk inserts everything).
// ---------------------------------------------------------------------------
// Wrap multer so its errors (bad type, >10MB) reach the report as a clear
// per-file failure instead of a generic 500
function uploadSingle(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (err) return res.json({ status: "failed", error: err.message });
    next();
  });
}

router.post("/process-pdf", uploadSingle, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const fileBuffer = req.file.buffer;
    const safeName = sanitizeFilename(req.file.originalname);

    if (fileBuffer.subarray(0, 4).toString("latin1") !== "%PDF") {
      return res.json({ status: "failed", error: "Not a valid PDF file" });
    }

    // Bulk-upload policy: original PDFs are NOT kept — the file is parsed
    // straight from memory and never written to Storage.

    // 1. Gemini quota guard
    const { allowed } = await checkAndIncrementGeminiUsage(supabase);
    if (!allowed) {
      return res.json({
        quota_exceeded: true,
        message: "आज का AI quota पूर्ण हो गया है। कल पुनः प्रयास करें। / Daily Gemini quota reached — resume tomorrow.",
      });
    }

    // 2. Parse
    let parsed;
    try {
      parsed = await geminiWithRetry(() => parseRTIDocument(fileBuffer));
    } catch (err) {
      console.error("Bulk parse error:", err.message);
      return res.json({
        status: "failed",
        error: `AI parsing failed: ${err.message}`,
      });
    }

    if (parsed.response_status && STATUS_MAP[parsed.response_status]) {
      parsed.response_status = STATUS_MAP[parsed.response_status];
    }
    const normalizedState = parsed.state ? normalizeState(parsed.state) : null;
    const validStatuses = ["full_response", "partial_response", "no_response"];
    const normalizedStatus = validStatuses.includes(parsed.response_status)
      ? parsed.response_status
      : "no_response";

    // 3. Embedding (best-effort, same as single upload)
    let embedding = null;
    try {
      const embeddingText = buildEmbeddingText({
        title: parsed.title,
        department: parsed.department,
        ministry: parsed.ministry,
        subject: parsed.subject,
        questions: parsed.questions,
        tags: parsed.tags,
      });
      embedding = await geminiWithRetry(() => generateEmbedding(embeddingText));
    } catch (err) {
      console.warn("Bulk embedding failed:", err.message);
    }

    // 4. Insert
    const { data: entry, error: insertError } = await supabase
      .from("rti_entries")
      .insert({
        title: parsed.title || safeName.replace(/\.pdf$/i, ""),
        department: parsed.department || null,
        ministry: parsed.ministry || null,
        state: normalizedState,
        district: parsed.district || null,
        area: parsed.area || null,
        subject: parsed.subject || null,
        questions: parsed.questions || [],
        response_summary: parsed.response_summary || null,
        response_full_text: parsed.response_full_text || null,
        response_status: normalizedStatus,
        response_tables: parsed.response_tables || null,
        date_filed: parsed.date_filed || null,
        date_of_response: parsed.date_of_response || null,
        rti_act_sections: parsed.rti_act_sections || [],
        tags: parsed.tags || [],
        language: parsed.language || "hindi",
        extracted_text: parsed.extracted_text || null,
        file_url: null,
        file_type: "pdf",
        is_anonymous: false,
        filer_name: null,
        embedding,
        uploaded_by: req.adminUser.id,
      })
      .select("id, title")
      .single();

    if (insertError) {
      console.error("Bulk insert error:", insertError.message);
      return res.json({ status: "failed", error: `DB insert failed: ${insertError.message}` });
    }

    // 5. Department upsert (best-effort)
    if (parsed.department && normalizedState) {
      try {
        await supabase
          .from("departments")
          .upsert(
            { name: parsed.department, state: normalizedState },
            { onConflict: "name,state", ignoreDuplicates: false }
          );
        await supabase.rpc("increment_department_rti_count", {
          dept_name: parsed.department,
          dept_state: normalizedState,
        });
      } catch (_) {
        // departments table may not exist yet — non-fatal
      }
    }

    return res.json({ status: "inserted", entry_id: entry.id, title: entry.title });
  } catch (err) {
    console.error("Admin process-pdf error:", err);
    return res.status(500).json({ error: "Unexpected error", detail: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/entries/:id
// Fully remove an RTI entry: unlink department_ratings (no cascade on that
// FK), remove stored PDF if any, delete the row (other children cascade),
// then best-effort decrement of the department's rti_count.
// ---------------------------------------------------------------------------
router.delete("/entries/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: entry, error: fetchErr } = await supabase
      .from("rti_entries")
      .select("id, file_url, department, state")
      .eq("id", id)
      .single();
    if (fetchErr || !entry) {
      return res.status(404).json({ error: "Entry not found" });
    }

    await supabase.from("department_ratings").update({ rti_id: null }).eq("rti_id", id);

    if (entry.file_url) {
      const marker = "/rti-documents/";
      const idx = entry.file_url.indexOf(marker);
      if (idx !== -1) {
        const key = decodeURIComponent(entry.file_url.slice(idx + marker.length));
        await supabase.storage.from("rti-documents").remove([key]);
      }
    }

    const { error: delErr } = await supabase.from("rti_entries").delete().eq("id", id);
    if (delErr) {
      return res.status(500).json({ error: "Delete failed", detail: delErr.message });
    }

    if (entry.department && entry.state) {
      try {
        const { data: dept } = await supabase
          .from("departments")
          .select("id, rti_count")
          .eq("name", entry.department)
          .eq("state", entry.state)
          .single();
        if (dept) {
          await supabase
            .from("departments")
            .update({ rti_count: Math.max(0, (dept.rti_count || 0) - 1) })
            .eq("id", dept.id);
        }
      } catch (_) {
        // departments table may not exist yet — non-fatal
      }
    }

    return res.json({ deleted: true, id });
  } catch (err) {
    console.error("Admin delete error:", err);
    return res.status(500).json({ error: "Unexpected error", detail: err.message });
  }
});

export default router;
