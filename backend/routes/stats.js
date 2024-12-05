import express from "express";
import supabase from "../lib/supabase.js";

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/stats — aggregated dashboard statistics
// ---------------------------------------------------------------------------
router.get("/stats", async (_req, res) => {
  try {
    // Total entries
    const { count: totalEntries } = await supabase
      .from("rti_entries")
      .select("*", { count: "exact", head: true });

    // Unique departments
    const { data: deptData } = await supabase
      .from("rti_entries")
      .select("department")
      .not("department", "is", null);
    const departmentsCount = new Set(
      (deptData || []).map((d) => d.department)
    ).size;

    // Unique states
    const { data: stateData } = await supabase
      .from("rti_entries")
      .select("state")
      .not("state", "is", null);
    const statesCount = new Set((stateData || []).map((d) => d.state)).size;

    // Response rate
    const { count: respondedCount } = await supabase
      .from("rti_entries")
      .select("*", { count: "exact", head: true })
      .neq("response_status", "pending");

    const responseRate =
      totalEntries > 0
        ? Math.round(((respondedCount || 0) / totalEntries) * 100)
        : 0;

    // Top 8 departments by count
    const { data: allDeptRows } = await supabase
      .from("rti_entries")
      .select("department")
      .not("department", "is", null);

    const deptCounts = {};
    (allDeptRows || []).forEach(({ department }) => {
      deptCounts[department] = (deptCounts[department] || 0) + 1;
    });
    const topDepartments = Object.entries(deptCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    // Top 12 tags
    const { data: tagRows } = await supabase
      .from("rti_entries")
      .select("tags")
      .not("tags", "is", null);

    const tagCounts = {};
    (tagRows || []).forEach(({ tags }) => {
      (tags || []).forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([tag, count]) => ({ tag, count }));

    // Monthly filings — last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: monthlyData } = await supabase
      .from("rti_entries")
      .select("created_at")
      .gte("created_at", sixMonthsAgo.toISOString());

    const monthlyCounts = {};
    (monthlyData || []).forEach(({ created_at }) => {
      const d = new Date(created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyCounts[key] = (monthlyCounts[key] || 0) + 1;
    });

    // Fill in last 6 months (including zeros)
    const monthlyFilings = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("default", {
        month: "short",
        year: "2-digit",
      });
      monthlyFilings.push({ month: label, key, count: monthlyCounts[key] || 0 });
    }

    // Hindi % (language = 'hindi' or 'mixed')
    const { count: hindiCount } = await supabase
      .from("rti_entries")
      .select("*", { count: "exact", head: true })
      .in("language", ["hindi", "mixed"]);

    const hindiPercentage =
      totalEntries > 0
        ? Math.round(((hindiCount || 0) / totalEntries) * 100)
        : 0;

    return res.json({
      total_entries: totalEntries || 0,
      departments_count: departmentsCount,
      states_count: statesCount,
      response_rate: responseRate,
      top_departments: topDepartments,
      top_tags: topTags,
      monthly_filings: monthlyFilings,
      hindi_percentage: hindiPercentage,
    });
  } catch (err) {
    console.error("Stats error:", err);
    return res.status(500).json({ error: "Failed to fetch stats", detail: err.message });
  }
});

export default router;
