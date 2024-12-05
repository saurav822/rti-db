import express from "express";
import supabase from "../lib/supabase.js";
import {
  generateEmbedding,
  geminiWithRetry,
  checkAndIncrementGeminiUsage,
} from "../lib/gemini.js";
import { duplicateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();
const PAGE_SIZE = 12;

// ---------------------------------------------------------------------------
// GET /api/search
// Query params: q, department, state, status, from_date, to_date,
//               mode (keyword|semantic), page
// ---------------------------------------------------------------------------
router.get("/search", async (req, res) => {
  try {
    const {
      q = "",
      department,
      state,
      status,
      from_date,
      to_date,
      language,
      mode = "keyword",
      page = "1",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const offset = (pageNum - 1) * PAGE_SIZE;

    // -----------------------------------------------------------------------
    // SEMANTIC mode — embedding cosine similarity via RPC
    // -----------------------------------------------------------------------
    if (mode === "semantic" && q.trim()) {
      const { allowed } = await checkAndIncrementGeminiUsage(supabase);
      if (!allowed) {
        return res.status(429).json({
          error: "Gemini quota exceeded for today. Please use keyword search.",
        });
      }

      let embedding;
      try {
        embedding = await geminiWithRetry(() => generateEmbedding(q));
      } catch (err) {
        return res
          .status(500)
          .json({ error: "Embedding generation failed", detail: err.message });
      }

      const { data: semanticResults, error } = await supabase.rpc(
        "match_rti_entries",
        {
          query_embedding: embedding,
          match_threshold: 0.5,
          match_count: PAGE_SIZE,
        }
      );

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      // Apply post-RPC filters
      let filtered = semanticResults || [];
      if (department) {
        filtered = filtered.filter((r) =>
          r.department?.toLowerCase().includes(department.toLowerCase())
        );
      }
      if (state) {
        filtered = filtered.filter((r) =>
          r.state?.toLowerCase().includes(state.toLowerCase())
        );
      }
      if (status) {
        filtered = filtered.filter((r) => r.response_status === status);
      }

      return res.json({
        results: filtered,
        total: filtered.length,
        page: pageNum,
        mode: "semantic",
      });
    }

    // -----------------------------------------------------------------------
    // KEYWORD mode — full-text search with 'simple' dictionary (Hindi safe)
    // -----------------------------------------------------------------------
    let query = supabase
      .from("rti_entries")
      .select(
        "id, title, department, ministry, state, district, subject, response_status, tags, date_filed, language, upvotes, view_count, created_at, is_anonymous, filer_name",
        { count: "exact" }
      );

    if (q.trim()) {
      query = query.textSearch(
        "fts_document",
        q.trim(),
        { config: "simple", type: "plain" }
      );
    }

    if (department) query = query.ilike("department", `%${department}%`);
    if (state) query = query.ilike("state", `%${state}%`);
    if (status) query = query.eq("response_status", status);
    if (language) query = query.eq("language", language);
    if (from_date) query = query.gte("date_filed", from_date);
    if (to_date) query = query.lte("date_filed", to_date);

    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    const { data, error, count } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      results: data || [],
      total: count || 0,
      page: pageNum,
      total_pages: Math.ceil((count || 0) / PAGE_SIZE),
      mode: "keyword",
    });
  } catch (err) {
    console.error("Search error:", err);
    return res.status(500).json({ error: "Search failed", detail: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/check-duplicate
// Body: { text: string } — accepts Hindi or English
// ---------------------------------------------------------------------------
router.post("/check-duplicate", duplicateLimiter, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ error: "text is required" });
    }

    const { allowed } = await checkAndIncrementGeminiUsage(supabase);
    if (!allowed) {
      return res.status(429).json({
        error: "Gemini quota exceeded for today. Try again tomorrow.",
      });
    }

    let embedding;
    try {
      embedding = await geminiWithRetry(() => generateEmbedding(text));
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Embedding generation failed", detail: err.message });
    }

    const { data, error } = await supabase.rpc("match_rti_entries", {
      query_embedding: embedding,
      match_threshold: 0.6,
      match_count: 5,
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ matches: data || [] });
  } catch (err) {
    console.error("Duplicate check error:", err);
    return res
      .status(500)
      .json({ error: "Duplicate check failed", detail: err.message });
  }
});

export default router;
