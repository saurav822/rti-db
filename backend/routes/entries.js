import express from "express";
import multer from "multer";
import supabase from "../lib/supabase.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files accepted"));
  },
});

// ---------------------------------------------------------------------------
// GET /api/entries — list all entries (paginated)
// ---------------------------------------------------------------------------
router.get("/entries", async (req, res) => {
  try {
    const { page = "1", limit = "12" } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, parseInt(limit, 10));
    const offset = (pageNum - 1) * limitNum;

    const { data, error, count } = await supabase
      .from("rti_entries")
      .select(
        "id, title, department, state, subject, response_status, tags, date_filed, language, upvotes, view_count, created_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) return res.status(500).json({ error: error.message });

    return res.json({ entries: data || [], total: count || 0, page: pageNum });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/entries/:id — full RTI detail + responses, increment view_count
// ---------------------------------------------------------------------------
router.get("/entries/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch entry
    const { data: entry, error } = await supabase
      .from("rti_entries")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !entry) {
      return res.status(404).json({ error: "Entry not found" });
    }

    // Fetch associated responses
    const { data: responses } = await supabase
      .from("rti_responses")
      .select("*")
      .eq("rti_id", id)
      .order("created_at", { ascending: true });

    // Increment view count (fire-and-forget)
    supabase
      .from("rti_entries")
      .update({ view_count: (entry.view_count || 0) + 1 })
      .eq("id", id)
      .then(() => {});

    return res.json({ entry, responses: responses || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/entries/:id/upvote — toggle upvote (uses anonymous session_id)
// ---------------------------------------------------------------------------
router.post("/entries/:id/upvote", async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body; // frontend sends anonymous UUID

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    // Check existing upvote
    const { data: existing } = await supabase
      .from("rti_upvotes")
      .select("id")
      .eq("rti_id", id)
      .eq("user_id", user_id)
      .maybeSingle();

    if (existing) {
      // Remove upvote
      await supabase.from("rti_upvotes").delete().eq("id", existing.id);
      await supabase.rpc("decrement_upvotes", { entry_id: id });
      return res.json({ upvoted: false });
    } else {
      // Add upvote
      await supabase.from("rti_upvotes").insert({ rti_id: id, user_id });
      await supabase.rpc("increment_upvotes", { entry_id: id });
      return res.json({ upvoted: true });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/entries/:id/response — add response text/file
// ---------------------------------------------------------------------------
router.post(
  "/entries/:id/response",
  upload.single("file"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { response_text, response_date, is_official, update_status } =
        req.body;

      let fileUrl = null;

      // Upload response file if present
      if (req.file) {
        const fileName = `responses/${Date.now()}-${req.file.originalname.replace(
          /\s+/g,
          "_"
        )}`;
        const { error: storageError } = await supabase.storage
          .from("rti-documents")
          .upload(fileName, req.file.buffer, {
            contentType: "application/pdf",
          });

        if (!storageError) {
          fileUrl = supabase.storage
            .from("rti-documents")
            .getPublicUrl(fileName).data.publicUrl;
        }
      }

      // Insert response record
      const { data: responseEntry, error: responseError } = await supabase
        .from("rti_responses")
        .insert({
          rti_id: id,
          response_text: response_text || null,
          response_date: response_date || null,
          is_official: is_official === "true",
          file_url: fileUrl,
        })
        .select()
        .single();

      if (responseError) {
        return res
          .status(500)
          .json({ error: "Failed to save response", detail: responseError.message });
      }

      // Optionally update response_status on parent entry
      if (update_status) {
        await supabase
          .from("rti_entries")
          .update({ response_status: update_status })
          .eq("id", id);
      }

      return res.json({ response: responseEntry });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/departments — list unique departments
// ---------------------------------------------------------------------------
router.get("/departments", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("rti_entries")
      .select("department")
      .not("department", "is", null)
      .order("department");

    if (error) return res.status(500).json({ error: error.message });

    const unique = [...new Set((data || []).map((d) => d.department))];
    return res.json({ departments: unique });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
