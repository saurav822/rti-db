import React from "react";
import { Link } from "react-router-dom";
import StatusPill from "./StatusPill.jsx";
import HindiText from "./HindiText.jsx";
import TagPill from "./TagPill.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useT, displayState } from "../lib/i18n.js";

export default function RTICard({ entry, showSimilarity }) {
  const { lang } = useLanguage();
  const t = useT(lang);

  const langStyle =
    entry.language === "hindi"
      ? { label: lang === "hi" ? "हिंदी" : "Hindi", style: { background: "rgba(180,72,36,0.10)", color: "#b04824", border: "1px solid rgba(180,72,36,0.22)" } }
      : entry.language === "english"
      ? { label: lang === "hi" ? "अंग्रेज़ी" : "English", style: { background: "rgba(30,64,175,0.09)", color: "#1e40af", border: "1px solid rgba(30,64,175,0.20)" } }
      : { label: lang === "hi" ? "मिश्रित" : "Mixed", style: { background: "rgba(15,118,110,0.09)", color: "#0f766e", border: "1px solid rgba(15,118,110,0.20)" } };

  return (
    <Link to={`/rti/${entry.id}`} className="block">
      <article className="card p-4 h-full flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <StatusPill status={entry.response_status} />
          <div className="flex items-center gap-2 shrink-0">
            {showSimilarity && entry.similarity != null && (
              <span className="mono-text text-xs text-[var(--ink-4)]">{Math.round(entry.similarity * 100)}% {t("card_match")}</span>
            )}
            <span className="status-pill" style={langStyle.style}>{langStyle.label}</span>
          </div>
        </div>
        <HindiText as="h3" className="text-sm font-semibold text-[var(--ink)] line-clamp-2 leading-snug">{entry.title || "—"}</HindiText>
        {entry.subject && <HindiText as="p" className="text-xs text-[var(--ink-3)] line-clamp-2">{entry.subject}</HindiText>}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--ink-3)]">
          {entry.department && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              <HindiText>{entry.department}</HindiText>
            </span>
          )}
          {entry.state && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
              <span className="hindi-text">{displayState(entry.state, lang)}</span>
            </span>
          )}
          {entry.date_filed && <span className="mono-text">{new Date(entry.date_filed).toLocaleDateString("en-IN", { year: "numeric", month: "short" })}</span>}
        </div>
        {entry.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {entry.tags.slice(0, 4).map((tag) => (
              <TagPill key={tag}>{tag}</TagPill>
            ))}
            {entry.tags.length > 4 && <span className="text-xs text-[var(--ink-4)] self-center leading-none">+{entry.tags.length - 4}</span>}
          </div>
        )}
      </article>
    </Link>
  );
}
