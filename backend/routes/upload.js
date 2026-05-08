import express from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import supabase from "../lib/supabase.js";
import {
  parseRTIDocument,
  generateEmbedding,
  buildEmbeddingText,
  checkDuplicates,
  geminiWithRetry,
  checkAndIncrementGeminiUsage,
} from "../lib/gemini.js";
import { uploadLimiter, duplicateLimiter } from "../middleware/rateLimiter.js";
import { normalizeState } from "../lib/stateNormalizer.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are accepted"));
  },
});

// ---------------------------------------------------------------------------
// POST /api/parse
// Parse PDF with Gemini, upload to temp Storage — do NOT insert to DB yet
// Returns parsed fields + file_key for the frontend Review step
// ---------------------------------------------------------------------------
router.post(
  "/parse",
  uploadLimiter,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const fileBuffer = req.file.buffer;
      const tempKey = `temp/${uuidv4()}-${req.file.originalname.replace(/\s+/g, "_")}`;

      // 1. Upload PDF to temp folder in Storage
      const { error: storageError } = await supabase.storage
        .from("rti-documents")
        .upload(tempKey, fileBuffer, { contentType: "application/pdf" });

      if (storageError) {
        return res.status(500).json({ error: "Failed to store file", detail: storageError.message });
      }

      const fileUrl = supabase.storage.from("rti-documents").getPublicUrl(tempKey).data.publicUrl;

      // 2. Gemini quota check
      const { allowed } = await checkAndIncrementGeminiUsage(supabase);
      if (!allowed) {
        return res.json({
          parse_error: true,
          quota_exceeded: true,
          file_key: tempKey,
          file_url: fileUrl,
          message: "आज का AI quota पूर्ण हो गया है। कल पुनः प्रयास करें या मैन्युअल रूप से भरें।",
        });
      }

      // 3. Parse with Gemini
      let parsed;
      try {
        parsed = await geminiWithRetry(() => parseRTIDocument(fileBuffer));
      } catch (err) {
        console.error("Gemini parse error:", err.message);
        return res.json({
          parse_error: true,
          file_key: tempKey,
          file_url: fileUrl,
          parsed: {},
          message: "AI parsing could not complete. Please fill in the fields manually.",
        });
      }

      // Normalize status to new 3-value system
      const STATUS_MAP = {
        responded: "full_response",
        partial: "partial_response",
        pending: "no_response",
        rejected: "no_response",
        appealed: "no_response",
      };
      if (parsed.response_status && STATUS_MAP[parsed.response_status]) {
        parsed.response_status = STATUS_MAP[parsed.response_status];
      }

      // Normalize state name to canonical form
      if (parsed.state) parsed.state = normalizeState(parsed.state);

      return res.json({
        parse_error: false,
        file_key: tempKey,
        file_url: fileUrl,
        parsed,
      });
    } catch (err) {
      console.error("Parse route error:", err);
      return res.status(500).json({ error: "Unexpected error", detail: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/entries/submit
// Finalize an RTI entry after user review:
//   - Accepts confirmed fields as JSON body + file_key (already in Storage)
//   - If keep_pdf=false: deletes the file from Storage
//   - Generates embedding, checks duplicates, inserts to rti_entries
//   - Auto-upserts department into departments table
// ---------------------------------------------------------------------------
router.post("/entries/submit", async (req, res) => {
  try {
    const {
      file_key,
      keep_pdf = true,
      is_anonymous = true,
      uploaded_by = null,
      filer_name = null,
      // confirmed RTI fields
      title, department, ministry, state, district, area,
      subject, questions, response_summary, response_full_text, response_status,
      response_tables, date_filed, date_of_response,
      rti_act_sections, tags, language, extracted_text,
    } = req.body;

    if (!file_key) {
      return res.status(400).json({ error: "file_key is required" });
    }

    // 1. Determine final file URL (or null if user chose not to keep PDF)
    let fileUrl = null;
    if (keep_pdf) {
      const finalKey = file_key.replace(/^temp\//, "uploads/");
      // Move file: copy then delete original
      const { error: copyErr } = await supabase.storage
        .from("rti-documents")
        .copy(file_key, finalKey);

      if (!copyErr) {
        await supabase.storage.from("rti-documents").remove([file_key]);
        fileUrl = supabase.storage.from("rti-documents").getPublicUrl(finalKey).data.publicUrl;
      } else {
        // If copy fails, use original temp URL
        fileUrl = supabase.storage.from("rti-documents").getPublicUrl(file_key).data.publicUrl;
      }
    } else {
      // Delete from Storage — user chose not to keep PDF
      await supabase.storage.from("rti-documents").remove([file_key]);
    }

    // 2. Generate embedding from confirmed fields
    let embedding = null;
    let potential_duplicates = [];
    try {
      const embeddingText = buildEmbeddingText({ title, department, ministry, subject, questions, tags });
      embedding = await geminiWithRetry(() => generateEmbedding(embeddingText));
      potential_duplicates = await checkDuplicates(embeddingText, supabase);
    } catch (err) {
      console.warn("Embedding/duplicate check failed:", err.message);
    }

    // Normalize status and state
    const validStatuses = ["full_response", "partial_response", "no_response"];
    const normalizedStatus = validStatuses.includes(response_status) ? response_status : "no_response";
    const normalizedState = normalizeState(state);

    // 3. Insert into rti_entries
    const { data: entry, error: insertError } = await supabase
      .from("rti_entries")
      .insert({
        title, department, ministry, state: normalizedState, district, area,
        subject,
        questions: questions || [],
        response_summary: response_summary || null,
        response_full_text: response_full_text || null,
        response_status: normalizedStatus,
        response_tables: response_tables || null,
        date_filed: date_filed || null,
        date_of_response: date_of_response || null,
        rti_act_sections: rti_act_sections || [],
        tags: tags || [],
        language: language || "hindi",
        extracted_text: extracted_text || null,
        file_url: fileUrl,
        file_type: "pdf",
        is_anonymous: Boolean(is_anonymous),
        filer_name: Boolean(is_anonymous) ? null : (filer_name || null),
        embedding,
        uploaded_by: uploaded_by || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("DB insert error:", insertError.message);
      return res.status(500).json({ error: "Failed to save entry", detail: insertError.message });
    }

    // 4. Auto-upsert department into departments table (best-effort, non-blocking)
    if (department && normalizedState) {
      try {
        await supabase
          .from("departments")
          .upsert(
            { name: department, state: normalizedState },
            { onConflict: "name,state", ignoreDuplicates: false }
          );
        await supabase.rpc("increment_department_rti_count", {
          dept_name: department,
          dept_state: normalizedState,
        });
      } catch (_) {
        // departments table may not exist yet — non-fatal
      }
    }

    return res.json({ entry, potential_duplicates });
  } catch (err) {
    console.error("Submit route error:", err);
    return res.status(500).json({ error: "Unexpected error", detail: err.message });
  }
});

// Keep old /api/upload as a compatibility shim (redirects to parse + submit)
router.post(
  "/upload",
  uploadLimiter,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const { is_anonymous = "true", filer_name, filer_email } = req.body;
      const isAnon = is_anonymous === "true" || is_anonymous === true;
      const fileBuffer = req.file.buffer;

      const fileName = `uploads/${Date.now()}-${req.file.originalname.replace(/\s+/g, "_")}`;
      const { error: storageError } = await supabase.storage
        .from("rti-documents")
        .upload(fileName, fileBuffer, { contentType: "application/pdf" });

      if (storageError) {
        return res.status(500).json({ error: "Failed to store file", detail: storageError.message });
      }
      const fileUrl = supabase.storage.from("rti-documents").getPublicUrl(fileName).data.publicUrl;

      const { allowed } = await checkAndIncrementGeminiUsage(supabase);
      if (!allowed) {
        return res.json({ parse_error: true, quota_exceeded: true, file_url: fileUrl });
      }

      let parsed;
      try {
        parsed = await geminiWithRetry(() => parseRTIDocument(fileBuffer));
      } catch (err) {
        return res.json({ parse_error: true, file_url: fileUrl });
      }

      const STATUS_MAP = { responded: "full_response", partial: "partial_response", pending: "no_response", rejected: "no_response", appealed: "no_response" };
      if (parsed.response_status && STATUS_MAP[parsed.response_status]) {
        parsed.response_status = STATUS_MAP[parsed.response_status];
      }
      if (parsed.state) parsed.state = normalizeState(parsed.state);

      let embedding = null;
      let potential_duplicates = [];
      try {
        const embeddingText = buildEmbeddingText(parsed);
        embedding = await geminiWithRetry(() => generateEmbedding(embeddingText));
        potential_duplicates = await checkDuplicates(embeddingText, supabase);
      } catch (err) {
        console.warn("Embedding failed:", err.message);
      }

      const { data: entry, error: insertError } = await supabase
        .from("rti_entries")
        .insert({
          ...parsed,
          response_status: parsed.response_status || "no_response",
          file_url: fileUrl,
          file_type: "pdf",
          is_anonymous: isAnon,
          filer_name: isAnon ? null : filer_name || null,
          filer_email: isAnon ? null : filer_email || null,
          embedding,
        })
        .select()
        .single();

      if (insertError) return res.status(500).json({ error: "Failed to save entry", detail: insertError.message });

      return res.json({ entry, potential_duplicates });
    } catch (err) {
      return res.status(500).json({ error: "Unexpected error", detail: err.message });
    }
  }
);

router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError || err.message?.includes("PDF")) {
    return res.status(400).json({ error: err.message });
  }
  _next(err);
});

export default router;
