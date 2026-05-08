import express from "express";
import supabase from "../lib/supabase.js";

const router = express.Router();

// GET /api/departments — list all departments ordered by avg_rating DESC
router.get("/departments", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("departments")
      .select("*")
      .order("avg_rating", { ascending: false })
      .order("rti_count", { ascending: false });

    if (error) {
      // Table may not exist yet (migration 002 not run)
      return res.json({ departments: [], migration_needed: true });
    }
    return res.json({ departments: data || [] });
  } catch (err) {
    return res.json({ departments: [], error: err.message });
  }
});

// POST /api/departments/:id/rate — submit or update a rating (1-5)
router.post("/departments/:id/rate", async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, rating, rti_id } = req.body;

    if (!user_id || !rating) {
      return res.status(400).json({ error: "user_id and rating are required" });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "rating must be between 1 and 5" });
    }

    // Verify department exists
    const { data: dept, error: deptErr } = await supabase
      .from("departments")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (deptErr || !dept) {
      return res.status(404).json({ error: "Department not found" });
    }

    // Upsert rating
    const { error: ratingErr } = await supabase
      .from("department_ratings")
      .upsert(
        { department_id: id, user_id, rating, rti_id: rti_id || null },
        { onConflict: "department_id,user_id" }
      );

    if (ratingErr) {
      return res.status(500).json({ error: ratingErr.message });
    }

    // Recalculate avg_rating
    await supabase.rpc("update_department_avg_rating", { dept_id: id });

    // Return updated department
    const { data: updated } = await supabase
      .from("departments")
      .select("avg_rating, rating_count")
      .eq("id", id)
      .single();

    return res.json({ success: true, avg_rating: updated?.avg_rating, rating_count: updated?.rating_count });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/departments/by-name — find or create dept by name+state
router.get("/departments/by-name", async (req, res) => {
  try {
    const { name, state } = req.query;
    if (!name || !state) return res.status(400).json({ error: "name and state required" });

    const { data, error } = await supabase
      .from("departments")
      .select("*")
      .eq("name", name)
      .eq("state", state)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ department: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
