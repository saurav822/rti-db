import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import HindiText from "../components/HindiText.jsx";
import RTICard from "../components/RTICard.jsx";
import { getStats, listEntries } from "../lib/api.js";

const INDIA_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry", "Chandigarh",
  "Andaman and Nicobar Islands", "Lakshadweep",
  "Dadra and Nagar Haveli and Daman and Diu", "केंद्र सरकार",
];

const STATE_FLAGS = {
  "Maharashtra": "🏙️",
  "Uttar Pradesh": "🕌",
  "Delhi": "🏛️",
  "Bihar": "🌾",
  "Rajasthan": "🏰",
  "Gujarat": "⚓",
  "Karnataka": "💻",
  "Tamil Nadu": "🏛️",
  "Chhattisgarh": "🌲",
  "Odisha": "🛕",
  "केंद्र सरकार": "🇮🇳",
};

const TABS = ["Departments", "States", "Tags", "Recent"];

export default function Browse() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Departments");
  const [stats, setStats] = useState(null);
  const [recentEntries, setRecentEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentPage, setRecentPage] = useState(1);
  const [totalRecent, setTotalRecent] = useState(0);

  useEffect(() => {
    Promise.all([getStats(), listEntries(1, 12)])
      .then(([s, e]) => {
        setStats(s);
        setRecentEntries(e.entries || []);
        setTotalRecent(e.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function loadMoreRecent() {
    const next = recentPage + 1;
    try {
      const e = await listEntries(next, 12);
      setRecentEntries((prev) => [...prev, ...(e.entries || [])]);
      setRecentPage(next);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Browse RTI Database</h1>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-saffron-500 text-saffron-600"
                : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* DEPARTMENTS TAB */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "Departments" && (
        <div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="h-5 bg-gray-200 rounded mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : stats?.top_departments?.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {stats.top_departments.map(({ name, count }) => (
                <Link
                  key={name}
                  to={`/search?q=${encodeURIComponent(name)}&mode=keyword&department=${encodeURIComponent(name)}`}
                  className="card p-4 hover:border-saffron-300 block"
                >
                  <div className="w-10 h-10 rounded-lg bg-saffron-100 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-saffron-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <HindiText as="h3" className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">
                    {name}
                  </HindiText>
                  <p className="text-xs text-gray-500">{count} RTI{count !== 1 ? "s" : ""}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-12">No departments found</p>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STATES TAB */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "States" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {INDIA_STATES.map((state) => (
            <Link
              key={state}
              to={`/search?q=${encodeURIComponent(state)}&mode=keyword&state=${encodeURIComponent(state)}`}
              className="card p-3 hover:border-saffron-300 flex items-center gap-2 group"
            >
              <span className="text-xl">{STATE_FLAGS[state] || "📍"}</span>
              <HindiText as="span" className="text-xs font-medium text-gray-700 group-hover:text-saffron-700 line-clamp-1">
                {state}
              </HindiText>
            </Link>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAGS TAB */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "Tags" && (
        <div>
          {loading ? (
            <div className="flex flex-wrap gap-2">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="h-8 w-20 bg-gray-200 rounded-full animate-pulse" />
              ))}
            </div>
          ) : stats?.top_tags?.length > 0 ? (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                Click a tag to see all related RTIs
              </p>
              <div className="flex flex-wrap gap-3">
                {stats.top_tags.map(({ tag, count }, idx) => {
                  // Scale font size based on count rank
                  const maxCount = stats.top_tags[0]?.count || 1;
                  const scale = 0.8 + (count / maxCount) * 0.6;
                  return (
                    <Link
                      key={tag}
                      to={`/search?q=${encodeURIComponent(tag)}&mode=keyword`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-gray-200 hover:border-saffron-400 hover:bg-saffron-50 hover:text-saffron-700 text-gray-700 transition-colors hindi-text shadow-sm"
                      style={{ fontSize: `${scale}rem` }}
                    >
                      {tag}
                      <span className="text-gray-400 text-xs">{count}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-12">No tags found</p>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* RECENT TAB */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "Recent" && (
        <div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card p-4 animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-5 bg-gray-200 rounded" />
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : recentEntries.length > 0 ? (
            <>
              <p className="text-sm text-gray-500 mb-4">
                {totalRecent} total RTIs in the database
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentEntries.map((entry) => (
                  <RTICard key={entry.id} entry={entry} />
                ))}
              </div>
              {recentEntries.length < totalRecent && (
                <div className="text-center mt-8">
                  <button onClick={loadMoreRecent} className="btn-secondary">
                    Load More RTIs
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 text-gray-500">
              <div className="text-4xl mb-3">📂</div>
              <p>No RTIs uploaded yet</p>
              <Link to="/upload" className="btn-primary inline-block mt-4">
                Upload the first RTI
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
