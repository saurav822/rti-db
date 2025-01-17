import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import RTICard from "../components/RTICard.jsx";
import HindiText from "../components/HindiText.jsx";
import { searchRTIs } from "../lib/api.js";

const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending (लंबित)" },
  { value: "responded", label: "Responded (उत्तरित)" },
  { value: "partial", label: "Partial (आंशिक)" },
  { value: "rejected", label: "Rejected (अस्वीकृत)" },
  { value: "appealed", label: "Appealed (अपील)" },
];

const LANGUAGES = [
  { value: "", label: "All Languages" },
  { value: "hindi", label: "Hindi (हिंदी)" },
  { value: "english", label: "English" },
  { value: "mixed", label: "Mixed" },
];

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const q = searchParams.get("q") || "";
  const mode = searchParams.get("mode") || "keyword";
  const departmentFilter = searchParams.get("department") || "";
  const stateFilter = searchParams.get("state") || "";
  const statusFilter = searchParams.get("status") || "";
  const languageFilter = searchParams.get("language") || "";
  const fromDate = searchParams.get("from_date") || "";
  const toDate = searchParams.get("to_date") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [localQ, setLocalQ] = useState(q);
  const [localMode, setLocalMode] = useState(mode);

  const doSearch = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await searchRTIs({
        q,
        mode,
        department: departmentFilter,
        state: stateFilter,
        status: statusFilter,
        language: languageFilter,
        from_date: fromDate,
        to_date: toDate,
        page,
      });
      setResults(data.results || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [q, mode, departmentFilter, stateFilter, statusFilter, languageFilter, fromDate, toDate, page]);

  useEffect(() => {
    if (q) doSearch();
  }, [doSearch]);

  function updateParam(key, value) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.set("page", "1");
    setSearchParams(params);
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    params.set("q", localQ);
    params.set("mode", localMode);
    params.set("page", "1");
    setSearchParams(params);
  }

  function handlePageChange(p) {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(p));
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Search bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-3 mb-6">
        {/* Mode toggle */}
        <div className="hidden sm:flex rounded-lg border border-gray-300 overflow-hidden shrink-0">
          {[
            { value: "keyword", label: "Keyword" },
            { value: "semantic", label: "✨ AI" },
          ].map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setLocalMode(value)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                localMode === value
                  ? "bg-saffron-500 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <input
            type="text"
            value={localQ}
            onChange={(e) => setLocalQ(e.target.value)}
            placeholder="RTI खोजें... (keyword, department, topic)"
            className="input-field pl-9 hindi-text"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button type="submit" className="btn-primary px-4 shrink-0">
          खोजें
        </button>
      </form>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ---------------------------------------------------------------- */}
        {/* Filters sidebar */}
        {/* ---------------------------------------------------------------- */}
        <aside className="w-full lg:w-56 shrink-0">
          <div className="card p-4 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Filters</h2>

            {/* Department */}
            <div>
              <label className="section-label block mb-1">Department</label>
              <input
                type="text"
                value={departmentFilter}
                onChange={(e) => updateParam("department", e.target.value)}
                className="input-field text-xs hindi-text"
                placeholder="Filter by department"
              />
            </div>

            {/* State */}
            <div>
              <label className="section-label block mb-1">State</label>
              <input
                type="text"
                value={stateFilter}
                onChange={(e) => updateParam("state", e.target.value)}
                className="input-field text-xs hindi-text"
                placeholder="Filter by state"
              />
            </div>

            {/* Status */}
            <div>
              <label className="section-label block mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => updateParam("status", e.target.value)}
                className="input-field text-xs"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Language */}
            <div>
              <label className="section-label block mb-1">Language</label>
              <select
                value={languageFilter}
                onChange={(e) => updateParam("language", e.target.value)}
                className="input-field text-xs"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>

            {/* Date range */}
            <div>
              <label className="section-label block mb-1">Filed From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => updateParam("from_date", e.target.value)}
                className="input-field text-xs"
              />
            </div>
            <div>
              <label className="section-label block mb-1">Filed To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => updateParam("to_date", e.target.value)}
                className="input-field text-xs"
              />
            </div>

            {/* Clear filters */}
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams();
                params.set("q", q);
                params.set("mode", mode);
                setSearchParams(params);
              }}
              className="w-full text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Clear filters
            </button>
          </div>
        </aside>

        {/* ---------------------------------------------------------------- */}
        {/* Results */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex-1">
          {/* Results header */}
          <div className="flex items-center justify-between mb-4">
            {q && !loading && (
              <p className="text-sm text-gray-600 hindi-text">
                <span className="font-semibold text-gray-900">{total}</span> RTI{total !== 1 ? "s" : ""} मिलीं
                {mode === "semantic" && (
                  <span className="ml-2 text-xs text-purple-600 font-medium">✨ AI Semantic</span>
                )}
              </p>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card p-4 animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-5 bg-gray-200 rounded" />
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-center py-12 text-red-600">
              <p>Error: {error}</p>
              <button onClick={doSearch} className="btn-secondary mt-3">
                Retry
              </button>
            </div>
          )}

          {/* No results */}
          {!loading && !error && q && results.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <div className="text-4xl mb-3">🔍</div>
              <HindiText as="p" className="font-medium">
                "{q}" के लिए कोई RTI नहीं मिली
              </HindiText>
              <p className="text-sm mt-2">
                No results found. Try different keywords or upload this RTI.
              </p>
              <a href="/upload" className="btn-primary inline-block mt-5">
                Upload this RTI
              </a>
            </div>
          )}

          {/* Empty state before search */}
          {!loading && !q && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">📂</div>
              <p>Enter a search query above to find RTI documents</p>
            </div>
          )}

          {/* Results grid */}
          {!loading && results.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {results.map((entry) => (
                  <RTICard
                    key={entry.id}
                    entry={entry}
                    showSimilarity={mode === "semantic"}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                    className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40"
                  >
                    ← Prev
                  </button>
                  {[...Array(Math.min(totalPages, 7))].map((_, i) => {
                    const p = i + 1;
                    return (
                      <button
                        key={p}
                        onClick={() => handlePageChange(p)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                          p === page
                            ? "bg-saffron-500 text-white"
                            : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
