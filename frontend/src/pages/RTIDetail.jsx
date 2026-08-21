import React, { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import HindiText from "../components/HindiText.jsx";
import RTICard from "../components/RTICard.jsx";
import TagPill from "../components/TagPill.jsx";
import {
  getRTIEntry, searchRTIs,
  toggleHelpful, getHelpfulCount, getComments, addComment,
  rateDepartment, getDepartmentByName, adminDeleteEntry,
} from "../lib/api.js";
import { getAnonymousUserId, freshToken } from "../lib/supabase.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useT, displayState } from "../lib/i18n.js";

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="6" cy="6" r="5.5" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="0.75" />
      <path d="M3.5 6.25l2 1.75 3-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function MinusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="6" cy="6" r="5.5" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="0.75" />
      <path d="M3.5 6h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function CrossIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="6" cy="6" r="5.5" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="0.75" />
      <path d="M4 4l4 4M8 4l-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

const STATUS_BANNERS = {
  full_response: { text: "status_full", bg: "var(--green-bg)", border: "rgba(74,122,58,0.25)", color: "var(--green)", Icon: CheckIcon },
  partial_response: { text: "status_partial", bg: "rgba(3,105,161,0.09)", border: "rgba(3,105,161,0.22)", color: "#0369a1", Icon: MinusIcon },
  no_response: { text: "status_none", bg: "var(--red-bg)", border: "rgba(155,44,44,0.25)", color: "var(--red)", Icon: CrossIcon },
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / (86400 * 7))}w ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function StarRatingInput({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="text-2xl transition-colors"
        >
          <svg
            className="w-7 h-7 transition-colors"
            style={{ color: star <= (hovered || value) ? "#D4A017" : "var(--rule-strong)" }}
            fill="currentColor" viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function ResponseTable({ table, t }) {
  async function downloadExcel() {
    const { utils, writeFile } = await import("xlsx");
    const ws = utils.aoa_to_sheet([table.headers || [], ...(table.rows || [])]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "RTI Data");
    writeFile(wb, `${table.title || "rti-table"}.xlsx`);
  }

  return (
    <div className="mb-4">
      {table.title && <h3 className="text-xs font-semibold text-[var(--ink-2)] mb-2 hindi-text">{table.title}</h3>}
      <div className="overflow-x-auto rounded-[var(--r-sm)]" style={{ border: "1px solid var(--rule)" }}>
        <table className="min-w-full text-sm">
          {table.headers?.length > 0 && (
            <thead style={{ background: "var(--surface)", borderBottom: "1px solid var(--rule)" }}>
              <tr>
                {table.headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left section-label hindi-text">{h}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y" style={{ borderColor: "var(--rule)" }}>
            {(table.rows || []).map((row, ri) => (
              <tr key={ri} className="transition-colors" style={{ "--hover-bg": "var(--accent-glass)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-glass)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
              >
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2 text-[var(--ink)] hindi-text">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={downloadExcel}
        className="mt-2 flex items-center gap-1.5 text-xs font-medium transition-colors"
        style={{ color: "var(--green)" }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {t("detail_download_excel")}
      </button>
    </div>
  );
}

export default function RTIDetail() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  async function handleAdminDelete() {
    if (!window.confirm("Delete this RTI entry permanently? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await adminDeleteEntry(id, await freshToken());
      navigate("/browse");
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
      setDeleting(false);
    }
  }
  const { lang } = useLanguage();
  const t = useT(lang);

  const [entry, setEntry] = useState(null);
  const [responses, setResponses] = useState([]);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [helped, setHelped] = useState(false);
  const [helpfulCount, setHelpfulCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef(null);

  // Comments
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);

  // Department rating
  const [dept, setDept] = useState(null);
  const [myRating, setMyRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);

  useEffect(() => {
    function handleClick(e) {
      if (shareRef.current && !shareRef.current.contains(e.target)) setShareOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getRTIEntry(id),
      getHelpfulCount(id),
      getComments(id),
    ]).then(([{ entry: e, responses: r }, { count }, { comments: c }]) => {
      setEntry(e);
      setResponses(r || []);
      setHelpfulCount(count || 0);
      setComments(c || []);

      if (e.subject || e.title) {
        searchRTIs({ q: e.subject || e.title, mode: "keyword" })
          .then((d) => setRelated((d.results || []).filter((r) => r.id !== id).slice(0, 4)))
          .catch(() => {});
      }

      if (e.department && e.state) {
        getDepartmentByName(e.department, e.state)
          .then(({ department }) => setDept(department))
          .catch(() => {});
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  async function handleHelped() {
    const userId = user?.id || getAnonymousUserId();
    try {
      const result = await toggleHelpful(id, userId);
      setHelped(result.helped);
      setHelpfulCount((c) => (result.helped ? c + 1 : c - 1));
    } catch (err) { console.error(err); }
  }

  async function handlePostComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setPostingComment(true);
    try {
      const { comment } = await addComment(id, {
        user_id: user?.id || null,
        display_name: user?.user_metadata?.full_name || "Anonymous",
        text: commentText.trim(),
      });
      setComments((c) => [...c, comment]);
      setCommentText("");
    } catch (err) { alert("Failed to post comment: " + err.message); }
    finally { setPostingComment(false); }
  }

  async function handleRating(rating) {
    if (!user) { window.location.href = "/login"; return; }
    if (!dept) return;
    setMyRating(rating);
    setRatingLoading(true);
    try {
      await rateDepartment(dept.id, { user_id: user.id, rating, rti_id: id });
      setRatingSubmitted(true);
    } catch (err) { console.error(err); }
    finally { setRatingLoading(false); }
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(entry?.title + " — " + window.location.href)}`, "_blank");
  }

  function shareTwitter() {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(entry?.title)}&url=${encodeURIComponent(window.location.href)}`, "_blank");
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 animate-pulse space-y-4">
        <div className="h-8 rounded w-2/3" style={{ background: "var(--rule)" }} />
        <div className="h-4 rounded w-1/2" style={{ background: "var(--rule)" }} />
        <div className="h-48 rounded" style={{ background: "var(--rule)" }} />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-[var(--ink-3)]">
        <p className="text-4xl mb-3">🔍</p>
        <p className="font-medium">{t("detail_not_found")}</p>
        <Link to="/" className="btn-primary inline-block mt-4">{t("detail_go_home")}</Link>
      </div>
    );
  }

  const banner = STATUS_BANNERS[entry.response_status];
  const isUploader = user && entry.uploaded_by && user.id === entry.uploaded_by;
  const visibleComments = showAllComments ? comments : comments.slice(0, 5);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Breadcrumb */}
          <nav className="text-xs text-[var(--ink-4)] mb-4 flex items-center gap-1">
            <Link to="/" className="text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors">{t("detail_home")}</Link>
            <span>/</span>
            <Link to="/browse" className="text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors">{t("detail_browse_link")}</Link>
            <span>/</span>
            <span className="text-[var(--ink-4)] truncate">{entry.title}</span>
          </nav>

          {/* Status banner */}
          {banner && (
            <div
              className="rounded-[var(--r-sm)] px-4 py-3 mb-4 font-semibold text-sm flex items-center gap-2"
              style={{ background: banner.bg, border: `1px solid ${banner.border}`, color: banner.color }}
            >
              <banner.Icon />
              {t(banner.text)}
            </div>
          )}

          {/* Language badge */}
          <div className="flex flex-wrap gap-2 mb-3">
            {entry.language && (
              <span
                className="status-pill"
                style={
                  entry.language === "hindi"
                    ? { background: "rgba(180,72,36,0.10)", color: "#b04824", border: "1px solid rgba(180,72,36,0.22)" }
                    : entry.language === "mixed"
                    ? { background: "rgba(15,118,110,0.09)", color: "#0f766e", border: "1px solid rgba(15,118,110,0.20)" }
                    : { background: "rgba(30,64,175,0.09)", color: "#1e40af", border: "1px solid rgba(30,64,175,0.20)" }
                }
              >
                {entry.language === "hindi" ? t("detail_language_hindi") : entry.language === "mixed" ? t("detail_language_mixed") : t("detail_language_english")}
              </span>
            )}
            {entry.verified && (
              <span className="status-pill" style={{ background: "var(--green-bg)", color: "var(--green)" }}>
                {t("detail_verified")}
              </span>
            )}
            {isAdmin && (
              <button
                onClick={handleAdminDelete}
                disabled={deleting}
                className="status-pill ml-auto cursor-pointer"
                style={{ background: "var(--red-bg)", color: "var(--red)", border: "1px solid rgba(155,44,44,0.25)", opacity: deleting ? 0.6 : 1 }}
              >
                {deleting ? "Deleting…" : "Delete entry (admin)"}
              </button>
            )}
          </div>

          {/* Title */}
          <HindiText as="h1" className="text-xl sm:text-2xl font-bold text-[var(--ink)] mb-4 leading-tight">
            {entry.title || "Untitled RTI"}
          </HindiText>

          {/* Meta grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {[
              { label: t("detail_dept_label"), value: entry.department },
              { label: t("detail_ministry_label"), value: entry.ministry },
              { label: t("detail_state_label"), value: displayState(entry.state, lang) },
              { label: t("detail_district_label"), value: entry.district },
              { label: t("detail_area_label"), value: entry.area },
              { label: t("detail_filed_label"), value: entry.date_filed ? new Date(entry.date_filed).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }) : null },
              { label: t("detail_response_date_label"), value: entry.date_of_response ? new Date(entry.date_of_response).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }) : null },
              { label: t("detail_filed_by_label"), value: entry.is_anonymous ? t("detail_anonymous") : entry.filer_name || "—" },
            ].filter((m) => m.value).map((m) => (
              <div key={m.label} className="rounded-[var(--r-sm)] p-3" style={{ background: "var(--surface)" }}>
                <p className="section-label">{m.label}</p>
                <HindiText as="p" className="text-sm text-[var(--ink)] mt-0.5 font-medium">{m.value}</HindiText>
              </div>
            ))}
          </div>

          {/* Subject */}
          {entry.subject && (
            <section className="mb-6">
              <h2 className="text-sm font-semibold text-[var(--ink-2)] mb-2">{t("detail_subject")}</h2>
              <HindiText as="p" className="text-sm text-[var(--ink)] leading-relaxed p-4 rounded-[var(--r-sm)]"
                style={{ background: "var(--surface)", border: "1px solid var(--rule)" }}>
                {entry.subject}
              </HindiText>
            </section>
          )}

          {/* Questions */}
          {entry.questions?.length > 0 && (
            <section className="mb-6">
              <h2 className="text-sm font-semibold text-[var(--ink-2)] mb-3">{t("detail_questions")}</h2>
              <ol className="space-y-3">
                {entry.questions.map((q, idx) => (
                  <li key={idx} className="flex gap-3 p-3 rounded-[var(--r-sm)]"
                    style={{ background: "var(--surface)", border: "1px solid var(--rule)" }}>
                    <span
                      className="shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mono-text"
                      style={{ background: "var(--accent-glass)", color: "var(--accent)" }}
                    >
                      {idx + 1}
                    </span>
                    <HindiText as="p" className="text-sm text-[var(--ink)] leading-relaxed">{q}</HindiText>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* RTI Act Sections */}
          {entry.rti_act_sections?.length > 0 && (
            <section className="mb-6">
              <h2 className="text-sm font-semibold text-[var(--ink-2)] mb-2">{t("detail_rti_act")}</h2>
              <div className="flex flex-wrap gap-2">
                {entry.rti_act_sections.map((s) => (
                  <span key={s} className="px-3 py-1 rounded-full text-xs hindi-text font-medium"
                    style={{ background: "var(--ink)", color: "#fff" }}>
                    {s}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Response summary */}
          {entry.response_summary && (
            <section className="mb-6">
              <h2 className="text-sm font-semibold text-[var(--ink-2)] mb-2">{t("detail_response")}</h2>
              <HindiText as="div" className="text-sm text-[var(--ink)] leading-relaxed p-4 rounded-[var(--r-sm)]"
                style={{ background: "var(--green-bg)", border: "1px solid rgba(74,122,58,0.25)" }}>
                {entry.response_summary}
              </HindiText>
            </section>
          )}

          {/* Response tables */}
          {entry.response_tables?.length > 0 && (
            <section className="mb-6">
              <h2 className="text-sm font-semibold text-[var(--ink-2)] mb-3">{t("detail_response_data")}</h2>
              {entry.response_tables.map((table, i) => (
                <ResponseTable key={i} table={table} t={t} />
              ))}
            </section>
          )}

          {/* PDF embed */}
          {entry.file_url && (
            <section className="mb-6">
              <h2 className="text-sm font-semibold text-[var(--ink-2)] mb-2">{t("detail_original_doc")}</h2>
              <div className="overflow-hidden rounded-[var(--r-sm)]" style={{ border: "1px solid var(--rule)" }}>
                <embed src={entry.file_url} type="application/pdf" width="100%" height="500px" className="block" />
              </div>
              <a href={entry.file_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium transition-colors"
                style={{ color: "var(--accent)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--accent)"; }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t("detail_download_pdf")}
              </a>
            </section>
          )}

          {/* Community responses (read-only) */}
          {responses.length > 0 && (
            <section className="mb-6">
              <h2 className="text-sm font-semibold text-[var(--ink-2)] mb-3">{t("detail_responses")} ({responses.length})</h2>
              <div className="space-y-3">
                {responses.map((r) => (
                  <div key={r.id} className="rounded-[var(--r-sm)] p-4"
                    style={{ background: "var(--surface)", border: "1px solid var(--rule)" }}>
                    {r.is_official && (
                      <span className="status-pill mb-2 inline-block"
                        style={{ background: "var(--accent-glass)", color: "var(--accent)" }}>
                        {t("detail_official_resp")}
                      </span>
                    )}
                    {r.response_text && <HindiText as="p" className="text-sm text-[var(--ink)] leading-relaxed">{r.response_text}</HindiText>}
                    {r.file_url && <a href={r.file_url} target="_blank" rel="noopener noreferrer" className="text-xs mt-2 block" style={{ color: "var(--accent)" }}>{t("detail_view_resp_pdf")}</a>}
                    {r.response_date && <p className="text-xs text-[var(--ink-4)] mt-2">{new Date(r.response_date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Full extracted text — uploader only */}
          {entry.extracted_text && isUploader && (
            <details className="mb-6">
              <summary className="text-sm font-semibold text-[var(--ink-2)] cursor-pointer hover:text-[var(--ink)] transition-colors">
                {t("detail_extracted_text")}
              </summary>
              <HindiText as="pre" className="mt-3 text-xs text-[var(--ink)] rounded-[var(--r-sm)] p-4 border overflow-auto max-h-96 whitespace-pre-wrap leading-relaxed"
                style={{ background: "var(--surface)", borderColor: "var(--rule)" }}>
                {entry.extracted_text}
              </HindiText>
            </details>
          )}

          {/* Tags + stats line */}
          {entry.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {entry.tags.map((tag) => (
                <TagPill key={tag} to={`/search?q=${encodeURIComponent(tag)}&mode=keyword`}>
                  #{tag}
                </TagPill>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-[var(--ink-4)] border-t pt-4 mb-6 mono-text"
            style={{ borderColor: "var(--rule)" }}>
            <span>{entry.view_count || 0} {t("detail_views")}</span>
            <span>{t("detail_added")} {new Date(entry.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</span>
          </div>

          {/* Action buttons — This Helped + Share */}
          <div className="flex flex-wrap gap-3 mb-8">
            {/* This Helped */}
            <button
              onClick={handleHelped}
              className={`group flex items-center gap-2.5 px-5 py-2.5 rounded-full border-2 text-sm font-semibold transition-all duration-200 ${
                helped
                  ? "bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-200"
                  : "border-[var(--rule-strong)] text-[var(--ink-2)] hover:border-rose-400 hover:text-rose-500 hover:bg-rose-50"
              }`}
            >
              <svg
                className={`transition-transform duration-200 group-hover:scale-110 ${helped ? "scale-110" : ""}`}
                style={{ width: "1.125rem", height: "1.125rem" }}
                fill={helped ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {t("detail_this_helped")}
              {helpfulCount > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold mono-text ${helped ? "bg-white/25 text-white" : "bg-[var(--rule)] text-[var(--ink-4)]"}`}>
                  {helpfulCount}
                </span>
              )}
            </button>

            {/* Share dropdown */}
            <div className="relative" ref={shareRef}>
              <button
                onClick={() => setShareOpen((o) => !o)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border-2 text-sm font-semibold transition-all duration-200"
                style={{ borderColor: "var(--rule-strong)", color: "var(--ink-2)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.color = "var(--accent)";
                  e.currentTarget.style.background = "var(--accent-glass)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--rule-strong)";
                  e.currentTarget.style.color = "var(--ink-2)";
                  e.currentTarget.style.background = "";
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                {t("detail_share")}
              </button>
              {shareOpen && (
                <div className="absolute left-0 mt-1 w-44 glass rounded-[var(--r-md)] py-1 z-20"
                  style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
                  <button onClick={copyLink} className="flex items-center gap-2.5 w-full text-left px-4 py-2 text-sm text-[var(--ink)] transition-colors"
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-glass)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}>
                    <svg className="w-3.5 h-3.5 shrink-0 text-[var(--ink-3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    {copied ? t("detail_copied") : t("detail_copy_link")}
                  </button>
                  <button onClick={shareWhatsApp} className="flex items-center gap-2.5 w-full text-left px-4 py-2 text-sm text-[var(--ink)] transition-colors"
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-glass)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}>
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#25D366" }}>
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    {t("detail_whatsapp")}
                  </button>
                  <button onClick={shareTwitter} className="flex items-center gap-2.5 w-full text-left px-4 py-2 text-sm text-[var(--ink)] transition-colors"
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-glass)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}>
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--ink)" }}>
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    {t("detail_twitter")}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bottom engagement section */}
          <div className="space-y-6">
            {/* Department rating */}
            {entry.department && (
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-[var(--ink)] mb-1">{t("detail_rate_dept")}</h3>
                <p className="text-xs text-[var(--ink-3)] mb-3 hindi-text">{entry.department} — {t("detail_rate_desc")}</p>
                {ratingSubmitted ? (
                  <p className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--green)" }}>
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {t("detail_rating_thanks")}
                  </p>
                ) : (
                  <div className="flex items-center gap-3">
                    <StarRatingInput value={myRating} onChange={handleRating} />
                    {ratingLoading && <span className="text-xs text-[var(--ink-4)]">{t("detail_saving")}</span>}
                    {!user && (
                      <span className="text-xs text-[var(--ink-4)]">
                        (<Link to="/login" className="transition-colors" style={{ color: "var(--accent)" }}
                          onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.textDecoration = ""; }}>
                          {t("nav_login")}
                        </Link> {t("detail_login_to_rate")})
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Discussion thread */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-[var(--ink)] mb-4">{t("detail_discussion")} ({comments.length})</h3>
              {comments.length === 0 ? (
                <p className="text-sm text-[var(--ink-4)] mb-4">{t("detail_no_comments")}</p>
              ) : (
                <div className="mb-4 divide-y" style={{ borderColor: "var(--rule)" }}>
                  {visibleComments.map((c) => (
                    <div key={c.id} className="flex items-start gap-3 py-3 first:pt-0">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: "var(--accent-glass)", color: "var(--accent)", marginTop: "1px" }}
                      >
                        {(c.display_name || "A")[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-[var(--ink)]">{c.display_name || "Anonymous"}</span>
                          <span className="text-xs text-[var(--ink-4)] mono-text">{timeAgo(c.created_at)}</span>
                        </div>
                        <HindiText as="p" className="text-sm text-[var(--ink-2)]">{c.text}</HindiText>
                      </div>
                    </div>
                  ))}
                  {comments.length > 5 && !showAllComments && (
                    <button onClick={() => setShowAllComments(true)}
                      className="text-sm transition-colors" style={{ color: "var(--accent)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.textDecoration = ""; }}>
                      {t("detail_show_all_comments", { n: comments.length })}
                    </button>
                  )}
                </div>
              )}

              <form onSubmit={handlePostComment} className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={t("detail_add_comment")}
                  className="input-field flex-1 text-sm hindi-text"
                />
                <button type="submit" disabled={postingComment || !commentText.trim()} className="btn-primary px-4 text-sm disabled:opacity-40">
                  {t("detail_post_comment")}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Related sidebar */}
        {related.length > 0 && (
          <aside className="w-full lg:w-64 shrink-0">
            <div className="sticky top-20">
              <h2 className="text-sm font-semibold text-[var(--ink-2)] mb-3">{t("detail_related")}</h2>
              <div className="space-y-3">
                {related.map((r) => <RTICard key={r.id} entry={r} />)}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
