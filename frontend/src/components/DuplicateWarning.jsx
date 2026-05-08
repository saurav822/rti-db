import React, { useState } from "react";
import { Link } from "react-router-dom";
import HindiText from "./HindiText.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";

export default function DuplicateWarning({ duplicates = [] }) {
  const [expanded, setExpanded] = useState(false);
  const { lang } = useLanguage();

  if (!duplicates.length) return null;

  const isHi = lang === "hi";

  return (
    <div className="rounded-[var(--r-md)] border overflow-hidden" style={{ borderColor: "rgba(139,94,0,0.28)" }}>
      {/* Header row */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-3"
        style={{ background: "var(--amber-bg)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "rgba(139,94,0,0.15)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--amber)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm font-semibold hindi-text" style={{ color: "var(--amber)" }}>
            {isHi
              ? `${duplicates.length} मिलती-जुलती RTI मौजूद है`
              : `${duplicates.length} Similar RTIs exist`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--r-sm)] text-xs font-medium shrink-0 transition-colors"
          style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(139,94,0,0.30)", color: "var(--amber)" }}
        >
          {expanded ? (
            <>
              {isHi ? "छिपाएं" : "Hide"}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
              </svg>
            </>
          ) : (
            <>
              {isHi ? "देखें" : "View matches"}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </>
          )}
        </button>
      </div>

      {/* Expanded match list */}
      {expanded && (
        <div className="px-4 py-3 space-y-2" style={{ background: "rgba(237,234,222,0.60)" }}>
          {duplicates.map((dup) => (
            <div key={dup.id} className="glass p-3 rounded-[var(--r-sm)]">
              <Link
                to={`/rti/${dup.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:underline"
              >
                <HindiText as="p" className="text-sm font-medium text-[var(--ink)] line-clamp-1">
                  {dup.title || "Untitled RTI"}
                </HindiText>
                <div className="flex items-center gap-3 mt-1 text-xs text-[var(--ink-3)]">
                  <span className="hindi-text">{dup.department}</span>
                  <span className="hindi-text">{dup.state}</span>
                  {dup.similarity && !isNaN(dup.similarity) && (
                    <span className="ml-auto mono-text font-medium" style={{ color: "var(--amber)" }}>
                      {Math.round(dup.similarity * 100)}% {isHi ? "मिलता-जुलता" : "similar"}
                    </span>
                  )}
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
