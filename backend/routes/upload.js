import express from "express";
import multer from "multer";
import supabase from "../lib/supabase.js";
import {
  parseRTIDocument,
  generateEmbedding,
  buildEmbeddingText,
  checkDuplicates,
  geminiWithRetry,
  checkAndIncrementGeminiUsage,
} from "../lib/gemini.js";
import { uploadLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Multer: memory storage, PDF only, 10 MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are accepted"));
    }
  },
});

// ---------------------------------------------------------------------------
// POST /api/upload
// ---------------------------------------------------------------------------
router.post(
  "/upload",
  uploadLimiter,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const {
        is_anonymous = "true",
        filer_name,
        filer_email,
      } = req.body;
      const fileBuffer = req.file.buffer;
      const isAnon = is_anonymous === "true" || is_anonymous === true;

      // -----------------------------------------------------------------
      // 1. Upload original PDF to Supabase Storage
      // -----------------------------------------------------------------
      const fileName = `${Date.now()}-${req.file.originalname.replace(/\s+/g, "_")}`;
      const { error: storageError } = await supabase.storage
        .from("rti-documents")
        .upload(fileName, fileBuffer, { contentType: "application/pdf" });

      if (storageError) {
        console.error("Storage upload error:", storageError.message);
        return res
          .status(500)
          .json({ error: "Failed to store file", detail: storageError.message });
      }

      const fileUrl = supabase.storage
        .from("rti-documents")
        .getPublicUrl(fileName).data.publicUrl;

      // -----------------------------------------------------------------
      // 2. Check daily Gemini quota
      // -----------------------------------------------------------------
      const { allowed } = await checkAndIncrementGeminiUsage(supabase);
      if (!allowed) {
        return res.status(200).json({
          parse_error: true,
          quota_exceeded: true,
          file_url: fileUrl,
          message:
            "आज का AI quota पूर्ण हो गया है। कल पुनः प्रयास करें या मैन्युअल रूप से भरें।",
        });
      }

      // -----------------------------------------------------------------
      // 3. Parse with Gemini 2.5 Flash
      // -----------------------------------------------------------------
      let parsed;
      try {
        parsed = await geminiWithRetry(() => parseRTIDocument(fileBuffer));
      } catch (err) {
        console.error("Gemini parse error:", err.message);
        return res.status(200).json({
          parse_error: true,
          file_url: fileUrl,
          message: "AI parsing failed. Please fill in the fields manually.",
        });
      }

      // -----------------------------------------------------------------
      // 4. Generate embedding
      // -----------------------------------------------------------------
      let embedding = null;
      let potential_duplicates = [];
      try {
        const embeddingText = buildEmbeddingText(parsed);
        embedding = await geminiWithRetry(() =>
          generateEmbedding(embeddingText)
        );

        // -----------------------------------------------------------------
        // 5. Duplicate check (non-blocking)
        // -----------------------------------------------------------------
        potential_duplicates = await checkDuplicates(embeddingText, supabase);
      } catch (err) {
        console.warn("Embedding/duplicate check failed:", err.message);
        // Continue without embedding — not fatal
      }

      // -----------------------------------------------------------------
      // 6. Insert into rti_entries
      // -----------------------------------------------------------------
      const insertPayload = {
        title: parsed.title,
        department: parsed.department,
        ministry: parsed.ministry,
        state: parsed.state,
        district: parsed.district,
        area: parsed.area,
        subject: parsed.subject,
        questions: parsed.questions,
        response_summary: parsed.response_summary,
        response_status: parsed.response_status || "pending",
        date_filed: parsed.date_filed || null,
        date_of_response: parsed.date_of_response || null,
        rti_act_sections: parsed.rti_act_sections || [],
        tags: parsed.tags || [],
        language: parsed.language || "hindi",
        extracted_text: parsed.extracted_text,
        file_url: fileUrl,
        file_type: "pdf",
        is_anonymous: isAnon,
        filer_name: isAnon ? null : filer_name || null,
        filer_email: isAnon ? null : filer_email || null,
        embedding: embedding,
      };

      const { data: entry, error: insertError } = await supabase
        .from("rti_entries")
        .insert(insertPayload)
        .select()
        .single();

      if (insertError) {
        console.error("DB insert error:", insertError.message);
        return res.status(500).json({
          error: "Failed to save entry",
          detail: insertError.message,
        });
      }

      return res.json({
        entry,
        potential_duplicates,
      });
    } catch (err) {
      console.error("Upload route error:", err);
      return res
        .status(500)
        .json({ error: "Unexpected error", detail: err.message });
    }
  }
);

// Handle multer errors (file size / type)
router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError || err.message?.includes("PDF")) {
    return res.status(400).json({ error: err.message });
  }
  _next(err);
});

export default router;
