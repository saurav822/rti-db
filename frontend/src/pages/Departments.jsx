import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { getDepartments } from "../lib/api.js";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useT, displayState } from "../lib/i18n.js";

function StarRating({ rating, max = 5 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(max)].map((_, i) => (
        <svg
          key={i}
          className="w-3.5 h-3.5"
          style={{ color: i < Math.round(rating) ? "#D4A017" : "var(--rule-strong)" }}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      <span className="ml-1 text-xs mono-text" style={{ color: "var(--ink-4)" }}>
        {rating > 0 ? rating.toFixed(1) : "—"}
      </span>
    </div>
  );
}

const SORT_OPTIONS = [
  { value: "rating_desc", label: "Rating: High → Low" },
  { value: "rating_asc",  label: "Rating: Low → High" },
  { value: "rtis_desc",   label: "RTI Count: High → Low" },
  { value: "name_asc",    label: "Name: A → Z" },
  { value: "name_desc",   label: "Name: Z → A" },
];

function sortDepts(depts, sortBy) {
  const arr = [...depts];
  switch (sortBy) {
    case "rating_desc": return arr.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
    case "rating_asc":  return arr.sort((a, b) => (a.avg_rating || 0) - (b.avg_rating || 0));
    case "rtis_desc":   return arr.sort((a, b) => (b.rti_count || 0) - (a.rti_count || 0));
    case "name_asc":    return arr.sort((a, b) => a.name.localeCompare(b.name));
    case "name_desc":   return arr.sort((a, b) => b.name.localeCompare(a.name));
    default: return arr;
  }
}

function DeptLink({ dept, children }) {
  return (
    <Link
      to={`/search?q=${encodeURIComponent(dept.name)}&mode=keyword&department=${encodeURIComponent(dept.name)}&state=${encodeURIComponent(dept.state)}`}
    >
      {children}
    </Link>
  );
}

// ── Tile card ──────────────────────────────────────────────────────────────────
function TileCard({ dept, rank, lang }) {
  return (
    <DeptLink dept={dept}>
      <article className="card p-5 block group h-full">
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-10 h-10 rounded-[var(--r-sm)] flex items-center justify-center shrink-0"
            style={{ background: "var(--accent-glass)" }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--accent)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <span className="mono-text text-xs" style={{ color: "var(--ink-4)" }}>#{rank}</span>
        </div>
        <p className="text-sm font-semibold hindi-text mb-0.5 leading-snug transition-colors text-[var(--ink)] group-hover:text-[var(--accent)]">
          {dept.name}
        </p>
        <p className="text-xs hindi-text mb-3" style={{ color: "var(--ink-4)" }}>
          {displayState(dept.state, lang)}
        </p>
        <div className="border-t pt-3 flex items-center justify-between" style={{ borderColor: "var(--rule)" }}>
          <div>
            <span className="text-lg font-bold mono-text" style={{ color: "var(--accent)" }}>
              {dept.rti_count}
            </span>
            <span className="section-label ml-1.5">RTIs</span>
          </div>
          {dept.rating_count > 0 ? (
            <StarRating rating={dept.avg_rating} />
          ) : (
            <span className="text-xs" style={{ color: "var(--ink-4)" }}>No ratings</span>
          )}
        </div>
      </article>
    </DeptLink>
  );
}

// ── List row ───────────────────────────────────────────────────────────────────
function ListRow({ dept, rank, lang }) {
  return (
    <DeptLink dept={dept}>
      <div
        className="flex items-center gap-4 px-4 py-3 group transition-colors rounded-[var(--r-sm)]"
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-glass)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
      >
        {/* Rank */}
        <span className="mono-text text-xs w-8 shrink-0 text-right" style={{ color: "var(--ink-4)" }}>
          #{rank}
        </span>
        {/* Icon */}
        <div
          className="w-8 h-8 rounded-[var(--r-sm)] flex items-center justify-center shrink-0"
          style={{ background: "var(--accent-glass)" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--accent)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        {/* Name + state */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold hindi-text text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors truncate">
            {dept.name}
          </p>
          <p className="text-xs hindi-text" style={{ color: "var(--ink-4)" }}>
            {displayState(dept.state, lang)}
          </p>
        </div>
        {/* RTI count */}
        <div className="shrink-0 text-right w-20">
          <span className="text-sm font-bold mono-text" style={{ color: "var(--accent)" }}>
            {dept.rti_count}
          </span>
          <span className="section-label ml-1">RTIs</span>
        </div>
        {/* Rating */}
        <div className="shrink-0 w-28">
          {dept.rating_count > 0 ? (
            <StarRating rating={dept.avg_rating} />
          ) : (
            <span className="text-xs" style={{ color: "var(--ink-4)" }}>No ratings</span>
          )}
        </div>
        {/* Arrow */}
        <svg className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--accent)" }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </DeptLink>
  );
}

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [view, setView]               = useState("tile");   // "tile" | "list"
  const [sortBy, setSortBy]           = useState("rating_desc");
  const { lang } = useLanguage();
  const t = useT(lang);

  useEffect(() => {
    getDepartments()
      .then((d) => setDepartments(d.departments || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => sortDepts(departments, sortBy), [departments, sortBy]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--ink)] mb-0.5">{t("dept_title")}</h1>
          <p className="text-sm text-[var(--ink-3)] hindi-text">{t("dept_subtitle")}</p>
        </div>

        {/* Controls */}
        {!loading && departments.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            {/* Sort dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input-field pr-8 text-xs py-1.5 appearance-none cursor-pointer"
                style={{ width: "auto", minWidth: 170 }}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--ink-4)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* View toggle */}
            <div
              className="flex items-center p-0.5 rounded-[var(--r-sm)]"
              style={{ background: "var(--rule)", gap: 2 }}
            >
              <button
                onClick={() => setView("tile")}
                className="p-1.5 rounded transition-all"
                style={view === "tile"
                  ? { background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.10)", color: "var(--accent)" }
                  : { background: "transparent", color: "var(--ink-4)" }}
                title="Tile view"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setView("list")}
                className="p-1.5 rounded transition-all"
                style={view === "list"
                  ? { background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.10)", color: "var(--accent)" }
                  : { background: "transparent", color: "var(--ink-4)" }}
                title="List view"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass rounded-[var(--r-md)] p-5 animate-pulse space-y-3">
              <div className="h-10 w-10 rounded-[var(--r-sm)]" style={{ background: "var(--rule)" }} />
              <div className="h-4 rounded w-3/4" style={{ background: "var(--rule)" }} />
              <div className="h-3 rounded w-1/2" style={{ background: "var(--rule)" }} />
              <div className="h-px" style={{ background: "var(--rule)" }} />
              <div className="h-5 rounded w-1/3" style={{ background: "var(--rule)" }} />
            </div>
          ))}
        </div>
      ) : departments.length === 0 ? (
        <div className="text-center py-16" style={{ color: "var(--ink-4)" }}>
          <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="hindi-text">{t("dept_no_depts")}</p>
          <Link to="/upload" className="btn-primary inline-block mt-4">{t("nav_upload")}</Link>
        </div>
      ) : view === "tile" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((dept, idx) => (
            <TileCard key={dept.id} dept={dept} rank={idx + 1} lang={lang} />
          ))}
        </div>
      ) : (
        /* List view */
        <div className="card overflow-hidden">
          {/* List header */}
          <div
            className="hidden sm:grid px-4 py-2 border-b"
            style={{
              gridTemplateColumns: "2rem 2rem 1fr 6rem 7rem 1rem",
              gap: "1rem",
              background: "var(--surface)",
              borderColor: "var(--rule)",
            }}
          >
            <span className="section-label text-right">#</span>
            <span />
            <span className="section-label">Department</span>
            <span className="section-label text-right">RTIs</span>
            <span className="section-label">Rating</span>
            <span />
          </div>
          <div className="divide-y" style={{ borderColor: "var(--rule)" }}>
            {sorted.map((dept, idx) => (
              <ListRow key={dept.id} dept={dept} rank={idx + 1} lang={lang} />
            ))}
          </div>
        </div>
      )}

      {/* Count footer */}
      {!loading && departments.length > 0 && (
        <p className="mt-4 text-xs mono-text text-center" style={{ color: "var(--ink-4)" }}>
          {departments.length} department{departments.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
