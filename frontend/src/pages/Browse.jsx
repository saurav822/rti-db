import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import HindiText from "../components/HindiText.jsx";
import RTICard from "../components/RTICard.jsx";
import TagPill from "../components/TagPill.jsx";
import { getStats, listEntries, getDepartments } from "../lib/api.js";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useT, displayState } from "../lib/i18n.js";
import STATE_MAPS from "../lib/stateMaps.js";

const INDIA_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry", "Chandigarh",
  "Andaman and Nicobar Islands", "Lakshadweep",
  "Dadra and Nagar Haveli and Daman and Diu", "Central Government",
];

const INDIA_VIEWBOX = "-114 -50.4 611.9 695.7";
const ALL_STATE_PATHS = Object.values(STATE_MAPS).map((s) => s.path);

function StateMapIcon({ state }) {
  const data = STATE_MAPS[state];
  if (!data) {
    // Central Government — full India silhouette from all state paths combined
    return (
      <svg viewBox={INDIA_VIEWBOX} className="w-full h-full" style={{ padding: "8%" }}>
        {ALL_STATE_PATHS.map((d, i) => (
          <path key={i} d={d} fill="var(--accent)" stroke="none" />
        ))}
      </svg>
    );
  }
  return (
    <svg viewBox={data.viewBox} className="w-full h-full" style={{ padding: "10%" }}>
      <path d={data.path} fill="var(--accent)" stroke="none" />
    </svg>
  );
}

function StarDisplay({ rating }) {
  return (
    <div className="flex items-center gap-0.5 mt-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className={`w-3 h-3 ${s <= Math.round(rating) ? "text-yellow-400" : ""}`} fill="currentColor" viewBox="0 0 24 24"
          style={s > Math.round(rating) ? { color: "var(--rule-strong)" } : {}}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      <span className="mono-text ml-0.5" style={{ fontSize: 10, color: "var(--ink-4)" }}>{rating > 0 ? rating.toFixed(1) : ""}</span>
    </div>
  );
}

export default function Browse() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const t = useT(lang);

  const TABS = [
    t("browse_tab_departments"),
    t("browse_tab_states"),
    t("browse_tab_tags"),
    t("browse_tab_recent"),
  ];

  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [stats, setStats] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [recentEntries, setRecentEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentPage, setRecentPage] = useState(1);
  const [totalRecent, setTotalRecent] = useState(0);

  useEffect(() => {
    Promise.all([getStats(), listEntries(1, 12), getDepartments()])
      .then(([s, e, d]) => {
        setStats(s);
        setRecentEntries(e.entries || []);
        setTotalRecent(e.total || 0);
        setDepartments(d.departments || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setActiveTab(TABS[0]);
  }, [lang]);

  async function loadMoreRecent() {
    const next = recentPage + 1;
    try {
      const e = await listEntries(next, 12);
      setRecentEntries((prev) => [...prev, ...(e.entries || [])]);
      setRecentPage(next);
    } catch (err) { console.error(err); }
  }

  const deptTab = TABS[0];
  const stateTab = TABS[1];
  const tagTab = TABS[2];
  const recentTab = TABS[3];

  const tabBtnClass = (tab) =>
    `px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
      activeTab === tab
        ? "border-[var(--accent)] text-[var(--accent)]"
        : "border-transparent text-[var(--ink-3)] hover:text-[var(--ink)] hover:border-[var(--rule-strong)]"
    }`;

  const skeletonCard = (
    <div className="glass rounded-[var(--r-md)] p-4 animate-pulse">
      <div className="h-5 rounded mb-2" style={{ background: "var(--rule)" }} />
      <div className="h-4 rounded w-1/2" style={{ background: "var(--rule)" }} />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-xl font-bold text-[var(--ink)] mb-6">{t("browse_title")}</h1>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 overflow-x-auto" style={{ borderBottom: "1px solid var(--rule)" }}>
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={tabBtnClass(tab)}>{tab}</button>
        ))}
      </div>

      {/* DEPARTMENTS TAB */}
      {activeTab === deptTab && (
        <div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => <React.Fragment key={i}>{skeletonCard}</React.Fragment>)}
            </div>
          ) : departments.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {departments.map((dept) => (
                <Link
                  key={dept.id}
                  to={`/search?q=${encodeURIComponent(dept.name)}&mode=keyword&department=${encodeURIComponent(dept.name)}&state=${encodeURIComponent(dept.state)}`}
                  className="card p-4 block group"
                >
                  <div className="w-10 h-10 rounded-[var(--r-sm)] flex items-center justify-center mb-3" style={{ background: "var(--accent-glass)" }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--accent)" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <HindiText as="h3" className="text-sm font-semibold text-[var(--ink)] mb-0.5 line-clamp-2 group-hover:text-[var(--accent)] transition-colors">{dept.name}</HindiText>
                  <p className="text-xs text-[var(--ink-4)] mb-1 hindi-text">{displayState(dept.state, lang)}</p>
                  <p className="text-xs text-[var(--ink-3)]">{t("browse_rti_count", { n: dept.rti_count })}</p>
                  {dept.rating_count > 0 && <StarDisplay rating={dept.avg_rating} />}
                </Link>
              ))}
            </div>
          ) : stats?.top_departments?.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {stats.top_departments.map(({ name, count }) => (
                <Link
                  key={name}
                  to={`/search?q=${encodeURIComponent(name)}&mode=keyword&department=${encodeURIComponent(name)}`}
                  className="card p-4 block group"
                >
                  <div className="w-10 h-10 rounded-[var(--r-sm)] flex items-center justify-center mb-3" style={{ background: "var(--accent-glass)" }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--accent)" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <HindiText as="h3" className="text-sm font-semibold text-[var(--ink)] mb-1 line-clamp-2 group-hover:text-[var(--accent)] transition-colors">{name}</HindiText>
                  <p className="text-xs text-[var(--ink-3)]">{t("browse_rti_count", { n: count })}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-[var(--ink-3)] text-center py-12">{t("browse_no_departments")}</p>
          )}
        </div>
      )}

      {/* STATES TAB */}
      {activeTab === stateTab && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {INDIA_STATES.map((state) => (
            <Link
              key={state}
              to={`/search?q=${encodeURIComponent(state)}&mode=keyword&state=${encodeURIComponent(state)}`}
              className="card p-3 flex items-center gap-3 group"
            >
              <div
                className="shrink-0 w-10 h-10 rounded-[var(--r-sm)] flex items-center justify-center overflow-hidden"
                style={{ background: "var(--accent-glass)" }}
              >
                <StateMapIcon state={state} />
              </div>
              <span className="text-xs font-medium text-[var(--ink)] group-hover:text-[var(--accent)] line-clamp-2 hindi-text transition-colors leading-snug">{displayState(state, lang)}</span>
            </Link>
          ))}
        </div>
      )}

      {/* TAGS TAB — Mosaic grid */}
      {activeTab === tagTab && (
        <div>
          {loading ? (
            <div>
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="col-span-2 row-span-2 rounded-[var(--r-lg)] animate-pulse min-h-[160px]" style={{ background: "var(--rule)" }} />
                <div className="rounded-[var(--r-md)] animate-pulse min-h-[76px]" style={{ background: "var(--rule)" }} />
                <div className="rounded-[var(--r-md)] animate-pulse min-h-[76px]" style={{ background: "var(--rule)" }} />
                <div className="rounded-[var(--r-md)] animate-pulse min-h-[76px]" style={{ background: "var(--rule)" }} />
                <div className="rounded-[var(--r-md)] animate-pulse min-h-[76px]" style={{ background: "var(--rule)" }} />
                <div className="rounded-[var(--r-md)] animate-pulse min-h-[76px]" style={{ background: "var(--rule)" }} />
              </div>
            </div>
          ) : stats?.top_tags?.length > 0 ? (
            (() => {
              const top6 = stats.top_tags.slice(0, 6);
              const rest = stats.top_tags.slice(6);
              return (
                <div>
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {/* Hero tile — largest, same glass as others; dark wash appears on hover */}
                    {top6[0] && (
                      <Link
                        to={`/search?q=${encodeURIComponent(top6[0].tag)}&mode=keyword`}
                        className="col-span-2 row-span-2 rounded-[var(--r-lg)] border flex flex-col items-center justify-center p-6 group min-h-[160px] transition-all"
                        style={{ background: "var(--glass)", borderColor: "var(--rule-strong)" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#2C2519";
                          e.currentTarget.style.borderColor = "transparent";
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.14)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "var(--glass)";
                          e.currentTarget.style.borderColor = "var(--rule-strong)";
                          e.currentTarget.style.transform = "";
                          e.currentTarget.style.boxShadow = "";
                        }}
                      >
                        <span className="text-4xl font-semibold tabular-nums leading-none mono-text" style={{ color: "var(--accent)" }}>
                          {top6[0].count}
                        </span>
                        <span className="text-[0.6875rem] font-medium uppercase tracking-widest mt-1 mb-4 mono-text text-[var(--ink-3)] group-hover:text-white/50 transition-colors">RTIs</span>
                        <span className="text-xl font-bold hindi-text text-center text-[var(--ink-2)] group-hover:text-white transition-colors">
                          {top6[0].tag}
                        </span>
                      </Link>
                    )}
                    {/* Tiles 2–6 */}
                    {top6.slice(1).map(({ tag, count }, i) => (
                      <Link
                        key={tag}
                        to={`/search?q=${encodeURIComponent(tag)}&mode=keyword`}
                        className="rounded-[var(--r-md)] border flex flex-col items-center justify-center p-3 group transition-all"
                        style={{ background: "var(--glass)", borderColor: "var(--rule-strong)" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#2C2519";
                          e.currentTarget.style.borderColor = "transparent";
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "var(--glass)";
                          e.currentTarget.style.borderColor = "var(--rule-strong)";
                          e.currentTarget.style.transform = "";
                          e.currentTarget.style.boxShadow = "";
                        }}
                      >
                        <span className={`${i < 2 ? "text-xl" : "text-lg"} font-semibold tabular-nums mono-text`} style={{ color: "var(--accent)" }}>{count}</span>
                        <span className="text-[0.6875rem] font-medium uppercase tracking-widest mb-1 mono-text text-[var(--ink-3)] group-hover:text-white/50 transition-colors">RTIs</span>
                        <span className="text-sm font-semibold text-[var(--ink-2)] hindi-text text-center line-clamp-2 group-hover:text-white transition-colors">{tag}</span>
                      </Link>
                    ))}
                  </div>
                  {rest.length > 0 && (
                    <div>
                      <h2 className="section-label mb-3">{t("browse_all_tags")}</h2>
                      <div className="flex flex-wrap gap-2">
                        {rest.map(({ tag, count }) => (
                          <TagPill key={tag} to={`/search?q=${encodeURIComponent(tag)}&mode=keyword`}>
                            {tag}
                            <span className="mono-text ml-1" style={{ fontSize: 10, color: "var(--ink-4)" }}>{count}</span>
                          </TagPill>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            <p className="text-[var(--ink-3)] text-center py-12">{t("browse_no_tags")}</p>
          )}
        </div>
      )}

      {/* RECENT TAB */}
      {activeTab === recentTab && (
        <div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass rounded-[var(--r-md)] p-4 animate-pulse space-y-3">
                  <div className="h-4 rounded w-1/2" style={{ background: "var(--rule)" }} />
                  <div className="h-5 rounded" style={{ background: "var(--rule)" }} />
                  <div className="h-4 rounded w-3/4" style={{ background: "var(--rule)" }} />
                </div>
              ))}
            </div>
          ) : recentEntries.length > 0 ? (
            <>
              <p className="section-label mb-4">
                {totalRecent} {t("browse_total")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentEntries.map((entry) => <RTICard key={entry.id} entry={entry} />)}
              </div>
              {recentEntries.length < totalRecent && (
                <div className="text-center mt-8">
                  <button onClick={loadMoreRecent} className="btn-secondary">{t("browse_load_more")}</button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16" style={{ color: "var(--ink-4)" }}>
              <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
              </svg>
              <p className="text-[var(--ink-3)]">{t("browse_no_rtis")}</p>
              <Link to="/upload" className="btn-primary inline-block mt-4">{t("browse_upload_first")}</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
