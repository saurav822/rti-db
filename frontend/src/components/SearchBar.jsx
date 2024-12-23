import React, { useState } from "react";

export default function SearchBar({ onSearch, initialQuery = "", initialMode = "keyword", compact = false }) {
  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState(initialMode); // "keyword" | "semantic"

  function handleSubmit(e) {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim(), mode);
    }
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="RTI खोजें... (Search RTIs)"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-400 focus:border-saffron-400 hindi-text"
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
        <button type="submit" className="btn-primary py-2 px-3 text-sm">
          Search
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      {/* Mode toggle */}
      <div className="flex justify-center mb-4">
        <div className="inline-flex rounded-lg border border-gray-300 bg-white overflow-hidden">
          {[
            { value: "keyword", label: "Keyword Search" },
            { value: "semantic", label: "AI Semantic Search" },
          ].map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                mode === value
                  ? "bg-saffron-500 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {value === "semantic" && (
                <span className="mr-1">✨</span>
              )}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Search input */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="RTI खोजें... (Search RTIs by keyword, department, topic)"
            className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-saffron-400 focus:border-saffron-400 hindi-text shadow-sm"
          />
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button
          type="submit"
          className="btn-primary px-6 py-4 text-base rounded-xl"
        >
          खोजें
        </button>
      </div>

      {mode === "semantic" && (
        <p className="mt-2 text-xs text-gray-500 text-center">
          AI-powered semantic search finds related RTIs even with different words
        </p>
      )}
    </form>
  );
}
