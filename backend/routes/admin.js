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

    // 4. Store PDF — admin-only: kept in Storage but written to admin_pdf_url,
    // never to the public file_url column, so it never surfaces on the
    // public RTIDetail page. Best-effort — a storage failure shouldn't lose
    // the extracted data.
    let adminPdfUrl = null;
    try {
      const storageKey = `admin-bulk/${Date.now()}-${safeName}`;
      const { error: storageError } = await supabase.storage
        .from("rti-documents")
        .upload(storageKey, fileBuffer, { contentType: "application/pdf" });
      if (!storageError) {
        adminPdfUrl = supabase.storage.from("rti-documents").getPublicUrl(storageKey).data.publicUrl;
      } else {
        console.warn("Bulk PDF storage failed:", storageError.message);
      }
    } catch (err) {
      console.warn("Bulk PDF storage failed:", err.message);
    }

    // 5. Insert
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
        is_admin_upload: true,
        original_filename: safeName,
        admin_pdf_url: adminPdfUrl,
      })
      .select("id, title")
      .single();

    if (insertError) {
      console.error("Bulk insert error:", insertError.message);
      return res.json({ status: "failed", error: `DB insert failed: ${insertError.message}` });
    }

    // 6. Department upsert (best-effort)
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
// POST /api/admin/import-record
// One record from the "New Uploads" JSON-import flow: a pre-parsed RTI
// record (from an external AI) plus its matching PDF. No Gemini parsing —
// only an embedding call, so this route is far cheaper than process-pdf.
// Multipart form: `record` (JSON string), `file` (PDF, optional).
// ---------------------------------------------------------------------------
router.post("/import-record", uploadSingle, async (req, res) => {
  try {
    let record;
    try {
      record = JSON.parse(req.body.record || "{}");
    } catch (err) {
      return res.json({ status: "failed", error: "Invalid record JSON" });
    }
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      return res.json({ status: "failed", error: "Record must be a JSON object" });
    }

    const validStatuses = ["full_response", "partial_response", "no_response"];
    const normalizedStatus = validStatuses.includes(record.response_status)
      ? record.response_status
      : "no_response";
    const normalizedState = record.state ? normalizeState(record.state) : null;

    // 1. Store PDF if provided (admin-only — never written to file_url)
    let adminPdfUrl = null;
    let safeName = record.filename ? sanitizeFilename(record.filename) : null;
    if (req.file) {
      const fileBuffer = req.file.buffer;
      if (fileBuffer.subarray(0, 4).toString("latin1") !== "%PDF") {
        return res.json({ status: "failed", error: "Not a valid PDF file" });
      }
      safeName = sanitizeFilename(req.file.originalname || record.filename);
      try {
        const storageKey = `admin-bulk/${Date.now()}-${safeName}`;
        const { error: storageError } = await supabase.storage
          .from("rti-documents")
          .upload(storageKey, fileBuffer, { contentType: "application/pdf" });
        if (!storageError) {
          adminPdfUrl = supabase.storage.from("rti-documents").getPublicUrl(storageKey).data.publicUrl;
        } else {
          console.warn("Import PDF storage failed:", storageError.message);
        }
      } catch (err) {
        console.warn("Import PDF storage failed:", err.message);
      }
    }

    // 2. Gemini quota guard — embedding still counts against the daily cap
    const { allowed } = await checkAndIncrementGeminiUsage(supabase);
    if (!allowed) {
      return res.json({
        quota_exceeded: true,
        message: "आज का AI quota पूर्ण हो गया है। कल पुनः प्रयास करें। / Daily Gemini quota reached — resume tomorrow.",
      });
    }

    // 3. Embedding (best-effort, same pattern as the other admin route)
    let embedding = null;
    try {
      const embeddingText = buildEmbeddingText({
        title: record.title,
        department: record.department,
        ministry: record.ministry,
        subject: record.subject,
        questions: record.questions,
        tags: record.tags,
      });
      embedding = await geminiWithRetry(() => generateEmbedding(embeddingText));
    } catch (err) {
      console.warn("Import embedding failed:", err.message);
    }

    // 4. Insert
    const { data: entry, error: insertError } = await supabase
      .from("rti_entries")
      .insert({
        title: record.title || safeName?.replace(/\.pdf$/i, "") || "Untitled RTI",
        department: record.department || null,
        ministry: record.ministry || null,
        state: normalizedState,
        district: record.district || null,
        area: record.area || null,
        subject: record.subject || null,
        questions: Array.isArray(record.questions) ? record.questions : [],
        response_summary: record.response_summary || null,
        response_full_text: record.response_full_text || null,
        response_status: normalizedStatus,
        response_tables: record.response_tables || null,
        date_filed: record.date_filed || null,
        date_of_response: record.date_of_response || null,
        rti_act_sections: Array.isArray(record.rti_act_sections) ? record.rti_act_sections : [],
        tags: Array.isArray(record.tags) ? record.tags : [],
        language: record.language || "hindi",
        extracted_text: record.extracted_text || null,
        file_url: null,
        file_type: "pdf",
        is_anonymous: false,
        filer_name: null,
        embedding,
        uploaded_by: req.adminUser.id,
        is_admin_upload: true,
        is_json_import: true,
        original_filename: safeName,
        admin_pdf_url: adminPdfUrl,
      })
      .select("id, title")
      .single();

    if (insertError) {
      console.error("Import insert error:", insertError.message);
      return res.json({ status: "failed", error: `DB insert failed: ${insertError.message}` });
    }

    // 5. Department upsert (best-effort)
    if (record.department && normalizedState) {
      try {
        await supabase
          .from("departments")
          .upsert(
            { name: record.department, state: normalizedState },
            { onConflict: "name,state", ignoreDuplicates: false }
          );
        await supabase.rpc("increment_department_rti_count", {
          dept_name: record.department,
          dept_state: normalizedState,
        });
      } catch (_) {
        // departments table may not exist yet — non-fatal
      }
    }

    return res.json({ status: "inserted", entry_id: entry.id, title: entry.title });
  } catch (err) {
    console.error("Admin import-record error:", err);
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
      .select("id, file_url, admin_pdf_url, department, state")
      .eq("id", id)
      .single();
    if (fetchErr || !entry) {
      return res.status(404).json({ error: "Entry not found" });
    }

    await supabase.from("department_ratings").update({ rti_id: null }).eq("rti_id", id);

    const marker = "/rti-documents/";
    for (const url of [entry.file_url, entry.admin_pdf_url]) {
      if (!url) continue;
      const idx = url.indexOf(marker);
      if (idx !== -1) {
        const key = decodeURIComponent(url.slice(idx + marker.length));
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

// ---------------------------------------------------------------------------
// GET /api/admin/entries
// Full list of RTI entries for the admin uploads table. Includes both
// admin_pdf_url (admin-bulk PDFs, never shown publicly) and file_url
// (individual uploads that kept their PDF) so the frontend can resolve a
// single "PDF link" per row.
// ---------------------------------------------------------------------------
router.get("/entries", async (req, res) => {
  try {
    let query = supabase
      .from("rti_entries")
      .select(
        "id, original_filename, title, created_at, department, state, questions, response_summary, file_url, admin_pdf_url, is_admin_upload, is_json_import"
      )
      .order("created_at", { ascending: false });

    if (req.query.source === "json_import") {
      query = query.eq("is_json_import", true);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: "Failed to load entries", detail: error.message });
    }
    return res.json({ entries: data || [] });
  } catch (err) {
    console.error("Admin list entries error:", err);
    return res.status(500).json({ error: "Unexpected error", detail: err.message });
  }
});

export default router;
