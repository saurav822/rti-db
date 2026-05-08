import React, { useState } from "react";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useT } from "../lib/i18n.js";

export default function SearchBar({ onSearch, onModeChange, initialQuery = "", initialMode = "keyword", compact = false }) {
  const { lang } = useLanguage();
  const t = useT(lang);
  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState(initialMode);
  const [focused, setFocused] = useState(false);

  function switchMode(newMode) {
    setMode(newMode);
    onModeChange?.(newMode);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim(), mode);
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchbar_placeholder_compact")}
            className="input-field pl-9 py-2 text-sm hindi-text"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ink-4)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button type="submit" className="btn-primary py-2 px-3 text-sm">{t("searchbar_submit")}</button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex justify-center mb-4">
        <div
          className="inline-flex overflow-hidden"
          style={{ border: "1px solid var(--rule-strong)", borderRadius: "var(--r-sm)", background: "var(--surface)" }}
        >
          {[
            { value: "keyword", label: t("searchbar_keyword") },
            { value: "semantic", label: t("searchbar_ai") },
          ].map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => switchMode(value)}
              className="px-5 py-2 text-sm font-medium transition-colors"
              style={
                mode === value
                  ? { background: "var(--accent)", color: "#fff", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)" }
                  : { color: "var(--ink-3)" }
              }
            >
              {value === "semantic" && <span className="mr-1">✨</span>}
              {label}
            </button>
          ))}
        </div>
      </div>
      {/* Flex wrapper acts as the "input box" — border + focus ring live here */}
      <div
        className="flex items-center rounded-[var(--r-md)] transition-all"
        style={{
          border: `1px solid ${focused ? "var(--accent)" : "var(--rule-strong)"}`,
          background: "rgba(255,253,245,0.70)",
          boxShadow: focused ? "0 0 0 3px var(--accent-glass)" : "none",
        }}
      >
        <svg className="w-5 h-5 shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--ink-4)" }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search RTIs..."
          className="flex-1 min-w-0 bg-transparent border-none outline-none px-3 py-3 sm:py-4 text-sm sm:text-base hindi-text"
          style={{ color: "var(--ink)", fontFamily: "Instrument Sans, Noto Sans Devanagari, sans-serif" }}
        />
        <div className="shrink-0 p-1.5">
          <button
            type="submit"
            className="btn-primary px-5 py-2 text-sm"
            style={{ borderRadius: "calc(var(--r-md) - 4px)" }}
          >
            {t("searchbar_submit")}
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-[var(--ink-3)] text-center hindi-text">
        {mode === "semantic" ? t("searchbar_hint_ai") : t("searchbar_hint_keyword")}
      </p>
    </form>
  );
}
