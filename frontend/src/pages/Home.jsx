import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import RTICard from "../components/RTICard.jsx";
import HindiText from "../components/HindiText.jsx";
import TagPill from "../components/TagPill.jsx";
import DarkCTA from "../components/DarkCTA.jsx";
import { getStats, listEntries } from "../lib/api.js";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useT } from "../lib/i18n.js";

const SAMPLE_QUERIES = {
  keyword: {
    en: ["Road Construction", "MNREGA Wages", "PDS Ration", "Education"],
    hi: ["सड़क निर्माण", "मनरेगा मजदूरी", "PDS राशन", "शिक्षा"],
  },
  semantic: {
    en: ["How much was spent on road construction?", "Why were MNREGA workers not paid on time?"],
    hi: ["सड़क बनाने में कितना पैसा खर्च हुआ?", "मनरेगा मजदूरों को समय पर भुगतान क्यों नहीं मिला?"],
  },
};

const SEARCH_HINTS = {
  keyword: { en: "Exact keyword match across all RTI documents", hi: "सभी RTI दस्तावेज़ों में सटीक कीवर्ड खोज" },
  semantic: { en: "Describe what you're looking for — AI understands natural language", hi: "आप क्या खोज रहे हैं बताएं — AI प्राकृतिक भाषा समझता है" },
};

const PLACEHOLDERS = {
  keyword: { en: "Search RTIs...", hi: "RTI खोजें..." },
  semantic: { en: "Search RTIs...", hi: "RTI खोजें..." },
};

const STAT_LABELS = ["01 — TOTAL", "02 — DEPTS", "03 — STATES", "04 — RATE"];

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--rule)",
  color: "var(--ink)",
  borderRadius: "var(--r-sm)",
  fontFamily: "DM Mono, monospace",
  fontSize: 11,
};

export default function Home() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const t = useT(lang);
  const [stats, setStats] = useState(null);
  const [recentEntries, setRecentEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchMode, setSearchMode] = useState("keyword");
  const [query, setQuery] = useState("");

  useEffect(() => {
    Promise.all([getStats(), listEntries(1, 6)])
      .then(([s, e]) => { setStats(s); setRecentEntries(e.entries || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function handleSearch(q, mode) {
    navigate(`/search?q=${encodeURIComponent(q)}&mode=${mode}`);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (query.trim()) handleSearch(query.trim(), searchMode);
  }

  const statCells = stats ? [
    { idx: STAT_LABELS[0], num: stats.total_entries?.toLocaleString("en-IN"), lbl: t("home_total_rtis") },
    { idx: STAT_LABELS[1], num: stats.departments_count, lbl: t("home_departments") },
    { idx: STAT_LABELS[2], num: stats.states_count, lbl: t("home_states") },
    { idx: STAT_LABELS[3], num: `${stats.response_rate}%`, lbl: t("home_response_rate") },
  ] : null;

  return (
    <div>
      {/* ── HERO ── centered */}
      <section
        className="relative overflow-hidden"
        style={{ borderBottom: "1px solid var(--rule-strong)" }}
      >
        {/* Radial glow top-center */}
        <div
          className="absolute inset-x-0 top-0 pointer-events-none"
          style={{
            height: 320,
            background: "radial-gradient(ellipse 70% 100% at 50% -10%, rgba(184,134,11,0.12) 0%, transparent 70%)",
          }}
        />

        {/* Floating data particles */}
        {(() => {
          const mono  = "DM Mono, monospace";
          const sans  = "Instrument Sans, sans-serif";
          const deva  = "Noto Sans Devanagari, sans-serif";
          const acc   = "var(--accent)";
          const ink   = "var(--ink)";

          const LEFT_EN = [
            { text: "Sec 4",       sz: 10, font: mono,  rot: -4,  color: acc,  left: "3%",  top: "75%", dur: "9s",  delay: "0s"   },
            { text: "30 days",     sz: 11, font: sans,  rot:  2,  color: ink,  left: "7%",  top: "58%", dur: "13s", delay: "3s"   },
            { text: "Sec 6(1)(a)", sz:  9, font: mono,  rot: -2,  color: acc,  left: "2%",  top: "42%", dur: "11s", delay: "6s"   },
            { text: "CPIO",        sz: 13, font: sans,  rot:  3,  color: ink,  left: "9%",  top: "82%", dur: "14s", delay: "1.5s" },
            { text: "Public Info", sz:  9, font: mono,  rot: -3,  color: ink,  left: "5%",  top: "62%", dur: "12s", delay: "7.5s" },
            { text: "Appellate",   sz: 10, font: sans,  rot:  1,  color: acc,  left: "1%",  top: "88%", dur: "15s", delay: "4s"   },
            { text: "2025",        sz: 14, font: mono,  rot:  0,  color: ink,  left: "8%",  top: "48%", dur: "10s", delay: "9s"   },
          ];
          const RIGHT_EN = [
            { text: "Sec 8(1)(j)", sz:  9, font: mono,  rot:  3,  color: acc,  right: "3%",  top: "70%", dur: "11s", delay: "2s"   },
            { text: "Disclosure",  sz: 11, font: sans,  rot: -2,  color: ink,  right: "8%",  top: "52%", dur: "9s",  delay: "5s"   },
            { text: "PIO",         sz: 14, font: sans,  rot:  4,  color: ink,  right: "2%",  top: "80%", dur: "13s", delay: "0.5s" },
            { text: "RTI Act",     sz: 10, font: mono,  rot: -3,  color: acc,  right: "7%",  top: "44%", dur: "10s", delay: "7s"   },
            { text: "Third Party", sz:  9, font: sans,  rot:  2,  color: ink,  right: "5%",  top: "64%", dur: "12s", delay: "2.5s" },
            { text: "Exempt",      sz: 10, font: mono,  rot: -1,  color: acc,  right: "9%",  top: "86%", dur: "14s", delay: "8.5s" },
            { text: "2024",        sz: 13, font: mono,  rot:  0,  color: ink,  right: "4%",  top: "56%", dur: "11s", delay: "4.5s" },
          ];

          const LEFT_HI = [
            { text: "धारा 4",      sz: 10, font: deva,  rot: -3,  color: acc,  left: "3%",  top: "75%", dur: "9s",  delay: "0s"   },
            { text: "30 दिन",      sz: 11, font: deva,  rot:  2,  color: ink,  left: "7%",  top: "58%", dur: "13s", delay: "3s"   },
            { text: "धारा ६(१)(क)", sz:  9, font: deva,  rot: -2,  color: acc,  left: "2%",  top: "42%", dur: "11s", delay: "6s"   },
            { text: "लोक सूचना",   sz: 10, font: deva,  rot:  3,  color: ink,  left: "9%",  top: "82%", dur: "14s", delay: "1.5s" },
            { text: "जनहित",       sz: 11, font: deva,  rot: -3,  color: ink,  left: "5%",  top: "62%", dur: "12s", delay: "7.5s" },
            { text: "अपील",        sz: 10, font: deva,  rot:  1,  color: acc,  left: "1%",  top: "88%", dur: "15s", delay: "4s"   },
            { text: "२०२५",        sz: 14, font: deva,  rot:  0,  color: ink,  left: "8%",  top: "48%", dur: "10s", delay: "9s"   },
          ];
          const RIGHT_HI = [
            { text: "धारा ८(१)",   sz:  9, font: deva,  rot:  3,  color: acc,  right: "3%",  top: "70%", dur: "11s", delay: "2s"   },
            { text: "प्रकटीकरण",   sz: 10, font: deva,  rot: -2,  color: ink,  right: "8%",  top: "52%", dur: "9s",  delay: "5s"   },
            { text: "विभाग",       sz: 13, font: deva,  rot:  4,  color: ink,  right: "2%",  top: "80%", dur: "13s", delay: "0.5s" },
            { text: "RTI अधिनियम", sz:  9, font: deva,  rot: -3,  color: acc,  right: "7%",  top: "44%", dur: "10s", delay: "7s"   },
            { text: "तृतीय पक्ष",  sz:  9, font: deva,  rot:  2,  color: ink,  right: "5%",  top: "64%", dur: "12s", delay: "2.5s" },
            { text: "छूट",         sz: 12, font: deva,  rot: -1,  color: acc,  right: "9%",  top: "86%", dur: "14s", delay: "8.5s" },
            { text: "जवाब",        sz: 13, font: deva,  rot:  0,  color: ink,  right: "4%",  top: "56%", dur: "11s", delay: "4.5s" },
          ];

          const left  = lang === "hi" ? LEFT_HI  : LEFT_EN;
          const right = lang === "hi" ? RIGHT_HI : RIGHT_EN;

          return [...left, ...right].map((p, i) => {
            const pos = p.left ? { left: p.left } : { right: p.right };
            return (
              <span
                key={i}
                className="particle hidden lg:block"
                style={{
                  ...pos,
                  top: p.top,
                  fontSize: p.sz,
                  fontFamily: p.font,
                  color: p.color,
                  animationDuration: p.dur,
                  animationDelay: p.delay,
                  "--p-rot": `${p.rot}deg`,
                }}
              >
                {p.text}
              </span>
            );
          });
        })()}

        <div className="max-w-2xl mx-auto px-6 py-16 sm:py-20 text-center relative flex flex-col items-center gap-6">

          {/* Eyebrow */}
          <div
            className="flex items-center justify-center gap-2.5"
            style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "var(--accent)", letterSpacing: "2px", textTransform: "uppercase" }}
          >
            <span style={{ display: "block", width: 20, height: 1, background: "var(--accent)" }} />
            {lang === "hi" ? "भारत का ओपन RTI डेटाबेस" : "India's Open RTI Knowledge Base"}
            <span style={{ display: "block", width: 20, height: 1, background: "var(--accent)" }} />
          </div>

          {/* H1 */}
          <div>
            <h1
              style={{ fontSize: "clamp(40px,6vw,60px)", fontWeight: 600, lineHeight: 1.0, letterSpacing: "-2.5px", color: "var(--ink)", marginBottom: 6 }}
            >
              {lang === "hi" ? (
                <>हर <em style={{ fontStyle: "italic", fontWeight: 400, color: "var(--accent)" }}>RTI.</em> एक जगह।</>
              ) : (
                <>Every <em style={{ fontStyle: "italic", fontWeight: 400, color: "var(--accent)" }}>RTI.</em> One place.</>
              )}
            </h1>
            <span
              className="block hindi-text"
              style={{ fontSize: 20, fontWeight: 500, color: "var(--ink-3)", letterSpacing: 0, lineHeight: 1.4 }}
            >
              {lang === "hi" ? "Every RTI. One place." : "हर RTI, एक जगह।"}
            </span>
          </div>

          {/* Description */}
          <p className="hindi-text" style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.75, maxWidth: 480 }}>
            {lang === "hi"
              ? "खोजने योग्य, संरचित RTI दाखिलें और सरकारी प्रतिक्रियाएं — हिन्दी और अंग्रेज़ी में। नागरिकों द्वारा, नागरिकों के लिए।"
              : "Searchable, structured RTI filings and government responses — in English and हिन्दी. Uploaded by citizens, for citizens."}
          </p>

          {/* Mode toggle */}
          <div
            className="flex rounded-[var(--r-md)] p-[3px]"
            style={{
              background: "var(--glass)",
              border: "1px solid var(--glass-border)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            {[
              { value: "keyword", label: t("search_mode_keyword_label") },
              { value: "semantic", label: `✦ ${t("search_mode_ai_label")}` },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setSearchMode(value)}
                className="px-5 py-2 text-xs font-medium rounded-[10px] transition-all duration-200"
                style={
                  searchMode === value
                    ? { background: "var(--accent)", color: "#fff", boxShadow: "0 2px 8px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.2)" }
                    : { color: "var(--ink-3)" }
                }
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search field */}
          <div className="w-full">
            <form onSubmit={handleSubmit}>
              <div
                className="flex rounded-[var(--r-md)] overflow-hidden w-full"
                style={{
                  border: "1px solid var(--glass-border)",
                  background: "rgba(255,255,255,0.70)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                <div className="flex items-center px-4 shrink-0" style={{ color: "var(--ink-4)" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={PLACEHOLDERS[searchMode][lang] || PLACEHOLDERS[searchMode].en}
                  className="flex-1 py-3.5 bg-transparent outline-none hindi-text"
                  style={{ fontSize: 14, color: "var(--ink)", fontFamily: "Noto Sans Devanagari, Instrument Sans, sans-serif" }}
                />
                <button
                  type="submit"
                  className="px-6 text-xs font-semibold shrink-0 transition-colors"
                  style={{ background: "var(--accent)", color: "#fff", letterSpacing: "0.3px" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--accent)"; }}
                >
                  {t("searchbar_submit")}
                </button>
              </div>
            </form>
            <p
              className="mt-2 hindi-text text-center"
              style={{ fontFamily: "DM Mono, monospace", fontSize: 12, color: "var(--ink-3)" }}
            >
              {SEARCH_HINTS[searchMode][lang] || SEARCH_HINTS[searchMode].en}
            </p>
          </div>

          {/* Try chips */}
          <div className="flex flex-col items-center gap-2">
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "var(--ink-4)", letterSpacing: "1px", textTransform: "uppercase" }}>
              {t("home_try")}
            </span>
            <div className="flex flex-wrap gap-2 justify-center">
              {(SAMPLE_QUERIES[searchMode][lang] || SAMPLE_QUERIES[searchMode].en).map((q) => (
                <button
                  key={q}
                  onClick={() => handleSearch(q, searchMode)}
                  className="hindi-text transition-all duration-150"
                  style={{
                    fontSize: 12, color: "var(--accent)", background: "var(--accent-glass)",
                    border: "1px solid rgba(184,134,11,0.15)", borderRadius: "100px",
                    padding: "3px 12px", fontWeight: 500, cursor: "pointer",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(184,134,11,0.15)"; e.currentTarget.style.borderColor = "rgba(184,134,11,0.35)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--accent-glass)"; e.currentTarget.style.borderColor = "rgba(184,134,11,0.15)"; }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4"
        style={{ borderBottom: "1px solid var(--rule-strong)" }}
      >
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="relative px-8 py-7 animate-pulse" style={{ borderRight: i < 3 ? "1px solid var(--rule)" : "none" }}>
              <div className="h-3 w-20 rounded mb-3" style={{ background: "var(--rule)" }} />
              <div className="h-9 w-16 rounded mb-2" style={{ background: "var(--rule)" }} />
              <div className="h-3 w-24 rounded" style={{ background: "var(--rule)" }} />
            </div>
          ))
        ) : statCells ? statCells.map((cell, i) => (
          <div key={i} className="relative px-6 sm:px-8 py-7 flex flex-col gap-1"
            style={{ borderRight: i < 3 ? "1px solid var(--rule)" : "none" }}>
            <span className="mono-text" style={{ fontSize: 9, color: "var(--ink-4)", letterSpacing: "1px", marginBottom: 4 }}>
              {cell.idx}
            </span>
            <span style={{ fontSize: 38, fontWeight: 600, letterSpacing: "-2px", color: "var(--ink)", lineHeight: 1 }}>
              {cell.num}
            </span>
            <span style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{cell.lbl}</span>
            {/* Accent underbar */}
            <div style={{ position: "absolute", bottom: 0, left: 32, height: 2, width: 32, background: "var(--accent)", borderRadius: 1 }} />
          </div>
        )) : null}
      </div>

      {/* ── CHARTS ── */}
      {stats && (() => {
        const depts = stats.top_departments || [];
        const monthly = stats.monthly_filings || [];
        const maxCount = depts[0]?.count || 1;
        const latest = monthly[monthly.length - 1];
        const prev = monthly[monthly.length - 2];
        const growth = prev?.count > 0 ? Math.round(((latest.count - prev.count) / prev.count) * 100) : null;
        return (
          <div
            className="grid grid-cols-1 lg:grid-cols-3"
            style={{ borderBottom: "1px solid var(--rule-strong)" }}
          >
            {/* Ranked department list */}
            <div className="lg:col-span-2 px-6 sm:px-8 py-7" style={{ borderRight: "1px solid var(--rule-strong)" }}>
              <div className="pb-4 mb-2" style={{ borderBottom: "1px solid var(--rule)" }}>
                <span className="section-label">{t("home_chart_top_depts")}</span>
              </div>
              <div>
                {depts.slice(0, 7).map((dept, i) => {
                  const pct = Math.round((dept.count / maxCount) * 100);
                  return (
                    <div key={dept.name} className="flex items-center gap-3 py-2.5" style={{ borderBottom: "1px solid var(--rule)" }}>
                      <span className="mono-text shrink-0 w-5 text-right" style={{ fontSize: 10, color: "var(--ink-4)" }}>#{i + 1}</span>
                      <span className="hindi-text text-sm flex-1 truncate" style={{ color: "var(--ink-2)" }}>{dept.name}</span>
                      <div className="w-28 h-1.5 rounded-full shrink-0" style={{ background: "var(--rule-strong)" }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "var(--accent)" }} />
                      </div>
                      <span className="mono-text shrink-0 w-6 text-right" style={{ fontSize: 12, color: "var(--ink-3)" }}>{dept.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Monthly trend + sparkline */}
            <div className="px-6 sm:px-8 py-7 flex flex-col">
              <div className="pb-4 mb-5" style={{ borderBottom: "1px solid var(--rule)" }}>
                <span className="section-label">{t("home_chart_monthly")}</span>
              </div>
              {latest && (
                <div className="flex flex-col items-center text-center mb-6">
                  <span className="mono-text" style={{ fontSize: 48, fontWeight: 700, color: "var(--accent)", lineHeight: 1 }}>{latest.count}</span>
                  <span className="text-xs mt-1.5" style={{ color: "var(--ink-3)" }}>{lang === "hi" ? "इस माह RTI" : "RTIs this month"}</span>
                  {growth !== null && (
                    <span className="mono-text text-xs mt-2 px-2 py-0.5 rounded-full" style={{
                      background: growth >= 0 ? "var(--green-bg)" : "var(--red-bg)",
                      color: growth >= 0 ? "var(--green)" : "var(--red)",
                    }}>
                      {growth >= 0 ? "↑" : "↓"} {Math.abs(growth)}% {lang === "hi" ? "पिछले माह से" : "vs prev month"}
                    </span>
                  )}
                </div>
              )}
              <div className="flex-1 min-h-0" style={{ minHeight: 80 }}>
                <ResponsiveContainer width="100%" height={90}>
                  <LineChart data={monthly} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                    <Tooltip formatter={(v) => [v, lang === "hi" ? "आवेदन" : "Filings"]} contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="count" stroke="var(--accent)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "var(--accent)" }} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex justify-between mt-1">
                  {monthly.length > 0 && <>
                    <span className="mono-text" style={{ fontSize: 9, color: "var(--ink-4)" }}>{monthly[0]?.month}</span>
                    <span className="mono-text" style={{ fontSize: 9, color: "var(--ink-4)" }}>{monthly[monthly.length - 1]?.month}</span>
                  </>}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── TRENDING TAGS ── */}
      {stats?.top_tags?.length > 0 && (
        <div className="px-6 sm:px-8 py-6" style={{ borderBottom: "1px solid var(--rule-strong)" }}>
          <div className="flex items-center justify-between pb-4" style={{ borderBottom: "1px solid var(--rule)" }}>
            <span className="section-label">{t("home_trending")}</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {stats.top_tags.map(({ tag, count }) => (
              <TagPill key={tag} onClick={() => handleSearch(tag, "keyword")}>
                {tag}
                <span className="mono-text ml-1.5" style={{ fontSize: 10, color: "var(--accent-hover)" }}>{count}</span>
              </TagPill>
            ))}
          </div>
        </div>
      )}

      {/* ── RECENT UPLOADS ── */}
      <section className="px-6 sm:px-8 py-7" style={{ borderBottom: "1px solid var(--rule-strong)" }}>
        <div className="flex items-center justify-between pb-4 mb-5" style={{ borderBottom: "1px solid var(--rule)" }}>
          <span className="section-label">{t("home_recent_uploads")}</span>
          <Link to="/browse" className="text-xs font-medium transition-colors" style={{ color: "var(--accent)" }}>
            {t("home_browse_all")} →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass rounded-[var(--r-lg)] p-4 animate-pulse space-y-3">
                <div className="h-4 rounded w-1/2" style={{ background: "var(--rule)" }} />
                <div className="h-5 rounded" style={{ background: "var(--rule)" }} />
                <div className="h-4 rounded w-3/4" style={{ background: "var(--rule)" }} />
              </div>
            ))}
          </div>
        ) : recentEntries.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentEntries.map((entry) => <RTICard key={entry.id} entry={entry} />)}
          </div>
        ) : (
          <div className="text-center py-16 text-[var(--ink-3)]">
            <div className="text-4xl mb-3">📂</div>
            <p className="font-medium">{t("home_no_rtis_yet")}</p>
            <Link to="/upload" className="btn-primary inline-block mt-4">{t("home_upload_first_rti")}</Link>
          </div>
        )}
      </section>

      {/* ── CTA ── */}
      <DarkCTA>
        <HindiText as="h2" className="text-2xl font-semibold mb-3" style={{ color: "#ffffff", letterSpacing: "-0.5px" }}>
          {t("home_cta_title")}
        </HindiText>
        <p className="hindi-text mb-6 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>{t("home_cta_desc")}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/upload" className="btn-primary">{t("nav_upload")}</Link>
          <Link
            to="/check"
            className="px-5 py-2 text-sm font-semibold rounded-[var(--r-sm)] transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.80)" }}
          >
            {t("home_check_duplicates")}
          </Link>
        </div>
      </DarkCTA>
    </div>
  );
}
