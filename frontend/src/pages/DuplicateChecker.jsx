import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import StatusPill from "../components/StatusPill.jsx";
import TagPill from "../components/TagPill.jsx";
import { checkDuplicate } from "../lib/api.js";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useT, displayState } from "../lib/i18n.js";

const MIN_CHARS = 30;
const DEBOUNCE_MS = 700;

function Spinner({ className = "w-4 h-4" }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function PasteIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)" }}>
      <rect x="9" y="2" width="6" height="4" rx="1" />
      <path d="M9 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2h-3" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}
function ScanIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)" }}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
      <path d="M8 11h6M11 8v6" />
    </svg>
  );
}
function ReviewIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)" }}>
      <path d="M9 12l2 2 4-4" />
      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function WarningIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--amber)", flexShrink: 0 }}>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function UniquenessBar({ maxPct, searching, hasResult, t }) {
  let statusLabel, subLabel, indicatorColor, textColor;

  if (searching) {
    statusLabel = t("dup_meter_scanning");
    subLabel = null;
    indicatorColor = "var(--accent)";
    textColor = "var(--accent)";
  } else if (!hasResult) {
    statusLabel = t("dup_meter_start");
    subLabel = null;
    indicatorColor = "var(--rule-strong)";
    textColor = "var(--ink-4)";
  } else if (maxPct < 50) {
    statusLabel = t("dup_meter_unique");
    subLabel = t("dup_meter_unique_sub");
    indicatorColor = "var(--green)";
    textColor = "var(--green)";
  } else if (maxPct < 70) {
    statusLabel = t("dup_meter_some");
    subLabel = t("dup_meter_some_sub");
    indicatorColor = "var(--amber)";
    textColor = "var(--amber)";
  } else if (maxPct < 85) {
    statusLabel = t("dup_meter_high");
    subLabel = t("dup_meter_high_sub");
    indicatorColor = "var(--amber)";
    textColor = "var(--amber)";
  } else {
    statusLabel = t("dup_meter_very");
    subLabel = t("dup_meter_very_sub");
    indicatorColor = "var(--red)";
    textColor = "var(--red)";
  }

  const markerLeft = hasResult ? maxPct : searching ? 50 : 0;

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <span className="section-label">{t("dup_your_question_is")}</span>
        <span className="text-sm font-bold transition-colors duration-300 hindi-text" style={{ color: textColor }}>
          {statusLabel}
        </span>
      </div>

      {/* Gradient bar */}
      <div className="relative h-2.5 rounded-full mb-1"
        style={{ background: "linear-gradient(to right, #4A7A3A 0%, #8B5E00 50%, #9B2C2C 100%)" }}>
        {searching && (
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-white/30 animate-pulse" />
          </div>
        )}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-lg transition-all duration-500"
          style={{ left: `calc(${markerLeft}% - ${markerLeft * 0.16}px)`, backgroundColor: indicatorColor, border: "2px solid #fff", boxShadow: `0 0 0 3px ${indicatorColor}40` }}
        />
      </div>

      {/* Axis labels */}
      <div className="flex justify-between mt-1 mb-3">
        <span className="section-label hindi-text">{t("dup_unique_label")}</span>
        <span className="section-label hindi-text">{t("dup_duplicate_label")}</span>
      </div>

      <div className="text-sm text-center min-h-[1.5rem] hindi-text transition-all duration-300" style={{ color: textColor }}>
        {searching ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner />
            {t("dup_meter_scanning")}
          </span>
        ) : subLabel ? (
          subLabel
        ) : (
          <span className="text-[var(--ink-4)]">{t("dup_results_hint", { n: MIN_CHARS })}</span>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass rounded-[var(--r-md)] p-4 animate-pulse">
      <div className="flex gap-3 items-start">
        <div className="flex-1 space-y-2">
          <div className="h-3 rounded w-1/3" style={{ background: "var(--rule)" }} />
          <div className="h-4 rounded w-full" style={{ background: "var(--rule)" }} />
          <div className="h-3 rounded w-2/3" style={{ background: "var(--rule)" }} />
        </div>
        <div className="w-12 h-12 rounded-full shrink-0" style={{ background: "var(--rule)" }} />
      </div>
    </div>
  );
}

function SimilarityCircle({ similarity }) {
  const pct = Math.round((similarity || 0) * 100);
  const stroke = pct > 85 ? "var(--red)" : pct > 70 ? "var(--accent)" : pct > 50 ? "var(--amber)" : "var(--ink-3)";
  return (
    <div className="relative w-12 h-12 shrink-0">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--rule)" strokeWidth="3" />
        <circle cx="18" cy="18" r="15.9" fill="none" stroke={stroke} strokeWidth="3"
          strokeDasharray={`${pct} 100`} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold mono-text" style={{ color: "var(--ink)" }}>
        {pct}%
      </span>
    </div>
  );
}

export default function DuplicateChecker() {
  const { lang } = useLanguage();
  const t = useT(lang);
  const [text, setText] = useState("");
  const [searching, setSearching] = useState(false);
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState("");
  const debounceRef = useRef(null);

  const charsLeft = Math.max(0, MIN_CHARS - text.length);
  const hasResult = matches !== null;
  const maxPct = hasResult && matches.length > 0
    ? Math.round(Math.max(...matches.map(m => m.similarity || 0)) * 100)
    : hasResult ? 0 : null;

  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed.length < MIN_CHARS) {
      clearTimeout(debounceRef.current);
      setMatches(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await checkDuplicate(trimmed);
        setMatches(data.matches || []);
        setError("");
      } catch (err) {
        setError(err.message);
      } finally {
        setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [text]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero header with radial glow */}
      <div className="mb-8 text-center relative">
        <div
          className="absolute inset-x-0 top-0 h-32 pointer-events-none -mt-8"
          style={{ background: "radial-gradient(ellipse 60% 80% at 50% 0%, var(--accent-glass), transparent)" }}
        />
        <h1 className="text-2xl font-semibold text-[var(--ink)] mb-1 relative" style={{ letterSpacing: "-0.5px" }}>{t("dup_title")}</h1>
        <p className="text-[var(--ink-3)] hindi-text text-sm relative">{t("dup_subtitle")}</p>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { Icon: PasteIcon,  step: "1", text: t("dup_step1"), delay: "0s"    },
          { Icon: ScanIcon,   step: "2", text: t("dup_step2"), delay: "0.15s" },
          { Icon: ReviewIcon, step: "3", text: t("dup_step3"), delay: "0.3s"  },
        ].map(({ Icon, step, text: stepText, delay }) => (
          <div
            key={step}
            className="card p-4 text-center"
            style={{ animation: `fadeSlideUp 0.4s ease both`, animationDelay: delay }}
          >
            <div
              className="w-12 h-12 rounded-[var(--r-md)] flex items-center justify-center mx-auto mb-3"
              style={{ background: "var(--accent-glass)" }}
            >
              <Icon />
            </div>
            <div
              className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center mx-auto mb-1.5 mono-text"
              style={{ background: "var(--accent)", color: "#fff" }}
            >{step}</div>
            <p className="text-xs text-[var(--ink-3)] hindi-text leading-snug">{stepText}</p>
          </div>
        ))}
      </div>

      {/* Uniqueness Meter */}
      <UniquenessBar maxPct={maxPct} searching={searching} hasResult={hasResult} t={t} />

      {/* Split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT — Input panel */}
        <div className="card p-6 flex flex-col">
          <label className="section-label block mb-2 hindi-text">{t("dup_label")}</label>
          <textarea
            rows={12}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("dup_placeholder")}
            className="input-field hindi-text resize-none flex-1 text-sm leading-relaxed mb-3"
            autoFocus
          />
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--ink-3)] hindi-text">{t("dup_ai_hint")}</span>
            {charsLeft > 0 ? (
              <span className="mono-text font-medium" style={{ color: "var(--ink-4)" }}>
                {t("dup_chars_remaining", { n: charsLeft })}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-medium mono-text" style={{ color: "var(--accent)" }}>
                {searching && <Spinner />}
                {searching ? t("dup_scanning_live") : `${text.length} chars`}
              </span>
            )}
          </div>
        </div>

        {/* RIGHT — Results panel */}
        <div className="flex flex-col gap-3">
          {/* Empty state */}
          {!hasResult && !searching && (
            <div
              className="glass flex-1 flex flex-col items-center justify-center py-16 text-center border-dashed"
              style={{ borderRadius: "var(--r-md)", border: "2px dashed var(--rule-strong)" }}
            >
              <div className="text-4xl mb-3">🔍</div>
              <p className="font-medium text-[var(--ink-2)] hindi-text mb-1">{t("dup_results_empty")}</p>
              <p className="text-sm text-[var(--ink-4)] hindi-text">{t("dup_results_hint", { n: MIN_CHARS })}</p>
            </div>
          )}

          {/* Skeleton while searching */}
          {searching && !hasResult && (
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-[var(--r-sm)] p-4 text-sm" style={{ border: "1px solid rgba(155,44,44,0.25)", background: "var(--red-bg)", color: "var(--red)" }}>
              {t("search_error_prefix")} {error}
            </div>
          )}

          {/* No matches */}
          {hasResult && matches.length === 0 && !searching && (
            <div className="card p-8 text-center flex-1 flex flex-col items-center justify-center">
              <div className="text-4xl mb-3">✅</div>
              <h2 className="font-semibold text-[var(--ink)] mb-1 hindi-text">{t("dup_no_match_title")}</h2>
              <p className="text-sm text-[var(--ink-3)] mb-5 hindi-text">{t("dup_no_match_body")}</p>
              <Link to="/upload" className="btn-primary inline-block">{t("dup_upload_btn")}</Link>
            </div>
          )}

          {/* Matches */}
          {hasResult && matches.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <WarningIcon />
                <h2 className="text-sm font-semibold text-[var(--ink)] hindi-text">
                  {t("dup_found_title", { n: matches.length })}
                  <span className="font-normal text-[var(--ink-3)] ml-1">{t("dup_review_before")}</span>
                </h2>
                {searching && <Spinner className="w-3.5 h-3.5 ml-auto" style={{ color: "var(--accent)" }} />}
              </div>

              {matches.map((match) => (
                <Link
                  key={match.id}
                  to={`/rti/${match.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block card p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <StatusPill status={match.response_status} />
                      </div>
                      <h3 className="text-sm font-semibold text-[var(--ink)] line-clamp-2 hindi-text mb-1">
                        {match.title || "Untitled RTI"}
                      </h3>
                      <p className="text-xs text-[var(--ink-3)] line-clamp-2 hindi-text mb-2">
                        {match.subject}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--ink-4)] mono-text">
                        {match.department && <span className="hindi-text">{match.department}</span>}
                        {match.state && <span className="hindi-text">{displayState(match.state, lang)}</span>}
                        {match.date_filed && (
                          <span>{t("dup_filed_label")} {new Date(match.date_filed).toLocaleDateString("en-IN", { year: "numeric", month: "short" })}</span>
                        )}
                      </div>
                      {match.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {match.tags.slice(0, 4).map((tag) => (
                            <TagPill key={tag}>{tag}</TagPill>
                          ))}
                        </div>
                      )}
                    </div>
                    <SimilarityCircle similarity={match.similarity} />
                  </div>
                </Link>
              ))}

              <div
                className="p-4 rounded-[var(--r-sm)]"
                style={{ background: "var(--amber-bg)", border: "1px solid rgba(139,94,0,0.25)", color: "var(--amber)" }}
              >
                <p className="text-xs hindi-text">
                  <strong>{t("dup_note_title")}</strong> {t("dup_note_body")}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
