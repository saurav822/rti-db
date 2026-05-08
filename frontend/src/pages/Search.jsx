import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import RTICard from "../components/RTICard.jsx";
import HindiText from "../components/HindiText.jsx";
import { searchRTIs } from "../lib/api.js";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useT } from "../lib/i18n.js";

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { lang } = useLanguage();
  const t = useT(lang);

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

  const STATUSES = [
    { value: "", label: t("search_all_levels") },
    { value: "full_response", label: t("search_full_response") },
    { value: "partial_response", label: t("search_partial_response") },
    { value: "no_response", label: t("search_no_response") },
  ];

  const LANGUAGES = [
    { value: "", label: t("search_all_languages") },
    { value: "hindi", label: t("search_lang_hindi") },
    { value: "english", label: t("search_lang_english") },
    { value: "mixed", label: t("search_lang_mixed") },
  ];

  const doSearch = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await searchRTIs({ q, mode, department: departmentFilter, state: stateFilter, status: statusFilter, language: languageFilter, from_date: fromDate, to_date: toDate, page });
      setResults(data.results || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [q, mode, departmentFilter, stateFilter, statusFilter, languageFilter, fromDate, toDate, page]);

  useEffect(() => { if (q) doSearch(); }, [doSearch]);

  function updateParam(key, value) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value); else params.delete(key);
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
        <div
          className="hidden sm:flex rounded-[var(--r-sm)] overflow-hidden shrink-0"
          style={{ border: "1px solid var(--rule-strong)" }}
        >
          {[
            { value: "keyword", label: t("search_mode_keyword_label") },
            { value: "semantic", label: t("search_mode_ai_label") },
          ].map(({ value, label }) => (
            <button key={value} type="button" onClick={() => setLocalMode(value)}
              className="px-3 py-2 text-xs font-medium transition-colors"
              style={
                localMode === value
                  ? { background: "var(--accent)", color: "#fff" }
                  : { color: "var(--ink-3)" }
              }
              onMouseEnter={(e) => { if (localMode !== value) e.currentTarget.style.background = "var(--glass-hover)"; }}
              onMouseLeave={(e) => { if (localMode !== value) e.currentTarget.style.background = ""; }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <input type="text" value={localQ} onChange={(e) => setLocalQ(e.target.value)}
            placeholder={t("searchbar_placeholder_compact")} className="input-field pl-9 hindi-text" />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ink-4)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button type="submit" className="btn-primary px-4 shrink-0">{t("searchbar_submit")}</button>
      </form>

      {/* Keyword hint */}
      {mode === "keyword" && (
        <div
          className="mb-4 text-xs rounded-[var(--r-sm)] px-4 py-2.5 flex items-start gap-2"
          style={{ background: "var(--accent-glass)", border: "1px solid var(--accent-glow)", color: "var(--ink-2)" }}
        >
          <span>💡</span>
          <span>
            <strong>{t("search_hint_title")}</strong> {t("search_hint_body")}{" "}
            <button onClick={() => { const p = new URLSearchParams(searchParams); p.set("q", "सड़क"); p.set("mode", "keyword"); setSearchParams(p); }} className="text-[var(--accent)] hover:underline hindi-text">सड़क</button>,{" "}
            <button onClick={() => { const p = new URLSearchParams(searchParams); p.set("q", "शिक्षा"); p.set("mode", "keyword"); setSearchParams(p); }} className="text-[var(--accent)] hover:underline hindi-text">शिक्षा</button>
          </span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters */}
        <aside className="w-full lg:w-56 shrink-0">
          <div className="card p-4 space-y-4">
            <h2 className="text-sm font-semibold text-[var(--ink-2)]">{t("search_filters")}</h2>
            <div>
              <label className="section-label block mb-1">{t("search_department")}</label>
              <input type="text" value={departmentFilter} onChange={(e) => updateParam("department", e.target.value)} className="input-field text-xs hindi-text" placeholder={t("search_department")} />
            </div>
            <div>
              <label className="section-label block mb-1">{t("search_state")}</label>
              <input type="text" value={stateFilter} onChange={(e) => updateParam("state", e.target.value)} className="input-field text-xs hindi-text" placeholder={t("search_state")} />
            </div>
            <div>
              <label className="section-label block mb-1">{t("search_response_level")}</label>
              <select value={statusFilter} onChange={(e) => updateParam("status", e.target.value)} className="input-field text-xs">
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="section-label block mb-1">{t("search_language")}</label>
              <select value={languageFilter} onChange={(e) => updateParam("language", e.target.value)} className="input-field text-xs">
                {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="section-label block mb-1">{t("search_filed_from")}</label>
              <input type="date" value={fromDate} onChange={(e) => updateParam("from_date", e.target.value)} className="input-field text-xs" />
            </div>
            <div>
              <label className="section-label block mb-1">{t("search_filed_to")}</label>
              <input type="date" value={toDate} onChange={(e) => updateParam("to_date", e.target.value)} className="input-field text-xs" />
            </div>
            <button type="button" onClick={() => { const p = new URLSearchParams(); p.set("q", q); p.set("mode", mode); setSearchParams(p); }}
              className="w-full text-xs text-[var(--ink-4)] hover:text-[var(--ink)] underline">
              {t("search_clear_btn")}
            </button>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            {q && !loading && (
              <p className="text-sm text-[var(--ink-3)] hindi-text">
                <span className="font-semibold text-[var(--ink)]">{total}</span> {t("search_results")}
                {mode === "semantic" && (
                  <span className="ml-2 text-xs font-medium mono-text" style={{ color: "var(--accent)" }}>
                    {t("search_ai_label")}
                  </span>
                )}
              </p>
            )}
          </div>

          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card p-4 animate-pulse space-y-3">
                  <div className="h-4 rounded w-1/2" style={{ background: "var(--rule)" }} />
                  <div className="h-5 rounded" style={{ background: "var(--rule)" }} />
                  <div className="h-4 rounded w-3/4" style={{ background: "var(--rule)" }} />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="text-center py-12" style={{ color: "var(--red)" }}>
              <p>{t("search_error_prefix")} {error}</p>
              <button onClick={doSearch} className="btn-secondary mt-3">{t("search_retry")}</button>
            </div>
          )}

          {!loading && !error && q && results.length === 0 && (
            <div className="text-center py-16 text-[var(--ink-3)]">
              <div className="text-4xl mb-3">🔍</div>
              <HindiText as="p" className="font-medium">"{q}" {t("search_no_results_for")}</HindiText>
              <p className="text-sm mt-2">{t("search_no_results_hint")}</p>
              {mode === "keyword" && (
                <button onClick={() => { const p = new URLSearchParams(searchParams); p.set("mode", "semantic"); setSearchParams(p); setLocalMode("semantic"); }} className="btn-primary inline-block mt-4">
                  {t("search_try_ai")}
                </button>
              )}
              <a href="/upload" className="btn-secondary inline-block mt-3">{t("search_upload_rti")}</a>
            </div>
          )}

          {!loading && !error && q && mode === "keyword" && results.length > 0 && results.length < 5 && (
            <div
              className="mb-4 p-3 rounded-[var(--r-sm)] flex items-center justify-between gap-3 text-sm"
              style={{ background: "var(--accent-glass)", border: "1px solid var(--accent-glow)" }}
            >
              <span className="text-[var(--ink-2)]">{t("search_few_results", { n: results.length })}</span>
              <button
                onClick={() => { const p = new URLSearchParams(searchParams); p.set("mode", "semantic"); setSearchParams(p); setLocalMode("semantic"); }}
                className="btn-primary shrink-0 text-xs px-3 py-1.5"
              >
                {t("search_try_ai")}
              </button>
            </div>
          )}

          {!loading && !q && (
            <div className="text-center py-16 text-[var(--ink-4)]">
              <div className="text-4xl mb-3">📂</div>
              <p>{t("search_empty_state")}</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {results.map((entry) => <RTICard key={entry.id} entry={entry} showSimilarity={mode === "semantic"} />)}
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1} className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40">{t("search_prev")}</button>
                  {[...Array(Math.min(totalPages, 7))].map((_, i) => {
                    const p = i + 1;
                    return (
                      <button
                        key={p}
                        onClick={() => handlePageChange(p)}
                        className="w-9 h-9 rounded-[var(--r-sm)] text-sm font-medium transition-colors mono-text"
                        style={
                          p === page
                            ? { background: "var(--accent)", color: "#fff" }
                            : { background: "var(--glass)", border: "1px solid var(--rule-strong)", color: "var(--ink-2)" }
                        }
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages} className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40">{t("search_next")}</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
