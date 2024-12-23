import React from "react";
import { Link } from "react-router-dom";
import StatusPill from "./StatusPill.jsx";
import HindiText from "./HindiText.jsx";

const LANG_BADGE = {
  hindi: { label: "हिंदी", className: "bg-orange-100 text-orange-700" },
  english: { label: "English", className: "bg-blue-100 text-blue-700" },
  mixed: { label: "Mixed", className: "bg-purple-100 text-purple-700" },
};

export default function RTICard({ entry, showSimilarity }) {
  const lang = LANG_BADGE[entry.language] || LANG_BADGE.hindi;

  return (
    <Link to={`/rti/${entry.id}`} className="block">
      <article className="card p-4 h-full flex flex-col gap-3 hover:border-saffron-300">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <StatusPill status={entry.response_status} />
            <span className={`status-pill ${lang.className}`}>{lang.label}</span>
          </div>
          {showSimilarity && entry.similarity != null && (
            <span className="text-xs text-gray-500 shrink-0">
              {Math.round(entry.similarity * 100)}% match
            </span>
          )}
        </div>

        {/* Title */}
        <HindiText as="h3" className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
          {entry.title || "—"}
        </HindiText>

        {/* Subject */}
        {entry.subject && (
          <HindiText as="p" className="text-xs text-gray-600 line-clamp-2">
            {entry.subject}
          </HindiText>
        )}

        {/* Meta row */}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          {entry.department && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <HindiText>{entry.department}</HindiText>
            </span>
          )}
          {entry.state && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <HindiText>{entry.state}</HindiText>
            </span>
          )}
          {entry.date_filed && (
            <span>
              {new Date(entry.date_filed).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "short",
              })}
            </span>
          )}
        </div>

        {/* Tags */}
        {entry.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {entry.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 hindi-text"
              >
                {tag}
              </span>
            ))}
            {entry.tags.length > 4 && (
              <span className="text-xs text-gray-400">+{entry.tags.length - 4}</span>
            )}
          </div>
        )}

        {/* Upvotes */}
        {entry.upvotes > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zm6-4a1.5 1.5 0 113 0v10a1.5 1.5 0 01-3 0v-10zm6 2a1.5 1.5 0 113 0v8a1.5 1.5 0 01-3 0v-8z" />
            </svg>
            {entry.upvotes} upvotes
          </div>
        )}
      </article>
    </Link>
  );
}
