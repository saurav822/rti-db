import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import SearchBar from "../components/SearchBar.jsx";
import RTICard from "../components/RTICard.jsx";
import HindiText from "../components/HindiText.jsx";
import { getStats, listEntries } from "../lib/api.js";

export default function Home() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentEntries, setRecentEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStats(), listEntries(1, 6)])
      .then(([s, e]) => {
        setStats(s);
        setRecentEntries(e.entries || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function handleSearch(query, mode) {
    navigate(`/search?q=${encodeURIComponent(query)}&mode=${mode}`);
  }

  return (
    <div>
      {/* ------------------------------------------------------------------ */}
      {/* Hero */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-gradient-to-b from-saffron-50 to-white border-b border-gray-200 py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-saffron-100 text-saffron-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
            <span>🇮🇳</span> सूचना का अधिकार अधिनियम 2005
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 leading-tight">
            India's Open RTI Knowledge Base
          </h1>
          <HindiText as="p" className="text-lg text-gray-600 mb-8">
            RTI दस्तावेज़ खोजें, अपलोड करें और साझा करें — नागरिकों, NGO और पत्रकारों के लिए
          </HindiText>
          <SearchBar onSearch={handleSearch} />
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-gray-500">
            <span>Try:</span>
            {["सड़क निर्माण", "मनरेगा मजदूरी", "PDS राशन", "शिक्षा"].map((q) => (
              <button
                key={q}
                onClick={() => handleSearch(q, "keyword")}
                className="text-saffron-600 hover:underline hindi-text"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Stats row */}
      {/* ------------------------------------------------------------------ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-2" />
                <div className="h-4 bg-gray-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { value: stats.total_entries?.toLocaleString("en-IN"), label: "Total RTIs", icon: "📄" },
              { value: stats.departments_count, label: "Departments", icon: "🏛️" },
              { value: stats.states_count, label: "States & UTs", icon: "🗺️" },
              { value: `${stats.response_rate}%`, label: "Response Rate", icon: "✅" },
            ].map((s) => (
              <div key={s.label} className="card p-5">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Charts + Tags */}
      {/* ------------------------------------------------------------------ */}
      {stats && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Departments Chart */}
            <div className="card p-5 lg:col-span-2">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                Top Departments by RTI Count
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={stats.top_departments}
                  margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value) => [value, "RTIs"]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly trend */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                Monthly Filings (Last 6 Months)
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={stats.monthly_filings}
                  margin={{ top: 0, right: 0, left: -30, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value) => [value, "Filings"]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#f97316" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Trending tags */}
          {stats.top_tags?.length > 0 && (
            <div className="mt-6 card p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                Trending Topics / टॉपिक
              </h2>
              <div className="flex flex-wrap gap-2">
                {stats.top_tags.map(({ tag, count }) => (
                  <button
                    key={tag}
                    onClick={() => handleSearch(tag, "keyword")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-saffron-100 hover:text-saffron-700 text-sm text-gray-700 transition-colors hindi-text"
                  >
                    {tag}
                    <span className="text-xs text-gray-400">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Recent uploads */}
      {/* ------------------------------------------------------------------ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Recent RTI Uploads
          </h2>
          <Link
            to="/browse"
            className="text-sm text-saffron-600 hover:text-saffron-700 font-medium"
          >
            Browse all →
          </Link>
        </div>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentEntries.map((entry) => (
              <RTICard key={entry.id} entry={entry} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500">
            <div className="text-4xl mb-3">📂</div>
            <p className="font-medium">No RTIs uploaded yet</p>
            <Link to="/upload" className="btn-primary inline-block mt-4">
              Upload the first RTI
            </Link>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* CTA strip */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-saffron-500 py-10 px-4">
        <div className="max-w-3xl mx-auto text-center text-white">
          <HindiText as="h2" className="text-xl font-bold mb-2">
            अपना RTI अपलोड करें और दूसरों की मदद करें
          </HindiText>
          <p className="text-saffron-100 mb-5 text-sm">
            Build the commons. Your RTI could help thousands of citizens.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/upload"
              className="bg-white text-saffron-600 font-semibold px-6 py-2.5 rounded-lg hover:bg-saffron-50 transition-colors"
            >
              Upload RTI
            </Link>
            <Link
              to="/check"
              className="border border-white text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-saffron-600 transition-colors"
            >
              Check Duplicates
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
