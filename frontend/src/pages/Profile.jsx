import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useT } from "../lib/i18n.js";
import RTICard from "../components/RTICard.jsx";
import { getRTIDrafts } from "../lib/api.js";
import { supabase } from "../lib/supabase.js";

// ── Shared icons ──────────────────────────────────────────────────────────

function ExternalLinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
    </svg>
  );
}

function CopyIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function CheckIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }
}


// ── Draft Card — simple tile, click to open /draft-rti?id= ───────────────

function DraftCard({ draft, lang }) {
  const [copiedField, setCopiedField] = useState(null);

  const isFinalized = draft.status === "finalized" || !!draft.filed_pdf_url;
  const dateStr = new Date(draft.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  function handleCopyAll(e) {
    e.preventDefault();
    const parts = [];
    if (draft.detected_dept) parts.push(`DEPARTMENT (ADDRESSEE):\n${draft.detected_dept}`);
    if (draft.draft_subject) parts.push(`SUBJECT:\n${draft.draft_subject}`);
    if (draft.draft_information_sought) parts.push(`MAIN BODY (INFORMATION SOUGHT):\n${draft.draft_information_sought}`);
    if (draft.draft_body) parts.push(`COMPLETE APPLICATION:\n${draft.draft_body}`);
    copyText(parts.join("\n\n---\n\n"));
    setCopiedField("all");
    setTimeout(() => setCopiedField(null), 2000);
  }

  return (
    <Link
      to={`/draft-rti?id=${draft.id}`}
      className="block card p-5 transition-all hover:shadow-sm"
      style={{ textDecoration: "none" }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Subject */}
          <div className="flex items-center gap-2 mb-1">
            {isFinalized && (
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "var(--green)" }} title="Filed" />
            )}
            {draft.draft_subject ? (
              <p className="text-sm font-semibold hindi-text text-[var(--ink)] leading-snug line-clamp-2">
                {draft.draft_subject}
              </p>
            ) : (
              <p className="text-sm italic" style={{ color: "var(--ink-4)" }}>
                {lang === "hi" ? "विषय नहीं" : "No subject"}
              </p>
            )}
          </div>
          {/* Query */}
          <p className="text-xs hindi-text line-clamp-1 mb-2" style={{ color: "var(--ink-4)" }}>
            {draft.original_query}
          </p>
          {/* Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {draft.detected_dept && (
              <span className="text-xs hindi-text px-2 py-0.5 rounded-full" style={{ background: "var(--glass)", border: "1px solid var(--rule-strong)", color: "var(--ink-3)" }}>
                {draft.detected_dept}
              </span>
            )}
            {draft.detected_state && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--glass)", border: "1px solid var(--rule-strong)", color: "var(--ink-4)" }}>
                {draft.detected_state}
              </span>
            )}
            <span className="mono-text ml-auto" style={{ fontSize: 10, color: "var(--ink-4)" }}>{dateStr}</span>
            <span
              className="mono-text px-1.5 py-0.5 rounded-full uppercase"
              style={{ fontSize: 9, letterSpacing: "0.05em", background: "var(--accent-glass)", color: "var(--accent)", border: "1px solid rgba(184,134,11,0.2)" }}
            >
              {draft.language === "hi" ? "HI" : "EN"}
            </span>
          </div>
        </div>

        {/* Copy All + arrow */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--r-sm)] text-xs font-medium transition-all"
            style={copiedField === "all"
              ? { background: "var(--green-bg)", color: "var(--green)", border: "1px solid rgba(74,122,58,0.3)" }
              : { background: "var(--glass)", border: "1px solid var(--rule-strong)", color: "var(--ink-3)" }
            }
          >
            {copiedField === "all" ? <CheckIcon /> : <CopyIcon />}
            {lang === "hi" ? "सब" : "All"}
          </button>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--ink-4)" }}>
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

// ── Contact Group Card ────────────────────────────────────────────────────
// contact = { name, phone, address, drafts: [{ id, draft_subject, created_at }, ...] }

function ContactCard({ contact, lang }) {
  return (
    <div className="card p-5">
      {/* Contact identity */}
      <div className="flex items-start gap-4 mb-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
          style={{ background: "var(--accent-glass)", color: "var(--accent)", border: "1px solid rgba(184,134,11,0.2)" }}
        >
          {contact.name[0]?.toUpperCase() || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--ink)] hindi-text">{contact.name}</p>
          <p className="text-xs mt-0.5 font-medium" style={{ color: "var(--ink-3)" }}>{contact.phone}</p>
          {contact.address && (
            <p className="text-xs hindi-text mt-1 line-clamp-2" style={{ color: "var(--ink-4)" }}>{contact.address}</p>
          )}
        </div>
      </div>

      {/* Drafts under this contact */}
      <div style={{ borderTop: "1px solid var(--rule)", paddingTop: "0.75rem" }}>
        <p className="text-xs font-medium mb-2" style={{ color: "var(--ink-4)" }}>
          {lang === "hi" ? `RTI मसौदे (${contact.drafts.length})` : `RTI Drafts (${contact.drafts.length})`}
        </p>
        <div className="space-y-1.5">
          {contact.drafts.map((d) => (
            <Link
              key={d.id}
              to={`/draft-rti?id=${d.id}`}
              className="flex items-center justify-between gap-3 group"
              style={{ textDecoration: "none" }}
            >
              <span
                className="text-xs hindi-text line-clamp-1 flex-1 group-hover:underline"
                style={{ color: "var(--accent)" }}
              >
                {d.draft_subject || (lang === "hi" ? "विषय नहीं" : "Untitled draft")}
              </span>
              <span className="mono-text shrink-0" style={{ fontSize: 10, color: "var(--ink-4)" }}>
                {new Date(d.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function Profile() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const t = useT(lang);

  const [uploads, setUploads] = useState([]);
  const [loadingUploads, setLoadingUploads] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [draftsExpanded, setDraftsExpanded] = useState(true);
  const [contactsExpanded, setContactsExpanded] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;

    setLoadingUploads(true);
    supabase
      .from("rti_entries")
      .select("id, title, department, state, subject, response_status, tags, date_filed, language, upvotes, view_count, created_at")
      .eq("uploaded_by", user.id)
      .order("created_at", { ascending: false })
      .limit(12)
      .then(({ data }) => setUploads(data || []))
      .catch(console.error)
      .finally(() => setLoadingUploads(false));

    setLoadingDrafts(true);
    getRTIDrafts(user.id)
      .then((data) => setDrafts(data || []))
      .catch(console.error)
      .finally(() => setLoadingDrafts(false));
  }, [user]);

  if (loading || !user) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-[var(--ink-4)]">Loading...</div>;
  }

  const displayName = user?.user_metadata?.full_name || user?.email || "";

  // Group drafts by unique (name + phone)
  const contactGroupMap = {};
  drafts.forEach((d) => {
    if (!d.applicant_name || !d.applicant_phone) return;
    const key = `${d.applicant_name}||${d.applicant_phone}`;
    if (!contactGroupMap[key]) {
      contactGroupMap[key] = {
        name: d.applicant_name,
        phone: d.applicant_phone,
        address: d.applicant_address || null,
        drafts: [],
      };
    }
    contactGroupMap[key].drafts.push(d);
  });
  const contactGroups = Object.values(contactGroupMap);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Profile header */}
      <div className="card p-6 mb-8 flex items-center gap-5">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
          style={{ background: "var(--ink)", color: "#fff", fontFamily: "DM Mono, monospace" }}
        >
          {displayName[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-[var(--ink)]">{displayName}</h1>
          <p className="text-sm text-[var(--ink-3)] mt-0.5">{user.email}</p>
        </div>
        <button
          onClick={() => signOut().then(() => navigate("/"))}
          className="btn-secondary text-sm hindi-text"
          style={{ color: "var(--red)", borderColor: "rgba(155,44,44,0.30)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--red-bg)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
        >
          {t("profile_sign_out")}
        </button>
      </div>

      {/* ── My RTI Drafts ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setDraftsExpanded((v) => !v)}
            className="flex items-center gap-2 text-left group"
          >
            <h2 className="text-base font-semibold text-[var(--ink)] hindi-text">
              {t("profile_my_drafts")}
              {!loadingDrafts && drafts.length > 0 && (
                <span className="ml-2 mono-text text-sm font-normal" style={{ color: "var(--ink-4)" }}>({drafts.length})</span>
              )}
            </h2>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ color: "var(--ink-4)", transition: "transform 0.2s", transform: draftsExpanded ? "rotate(0deg)" : "rotate(-90deg)", flexShrink: 0 }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <Link to="/file-rti" className="text-xs font-medium" style={{ color: "var(--accent)" }}>
            {t("profile_draft_new")} →
          </Link>
        </div>

        {draftsExpanded && (
          loadingDrafts ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="card p-5 animate-pulse space-y-3">
                  <div className="h-4 rounded w-2/3" style={{ background: "var(--rule)" }} />
                  <div className="h-3 rounded w-full" style={{ background: "var(--rule)" }} />
                  <div className="h-3 rounded w-1/2" style={{ background: "var(--rule)" }} />
                </div>
              ))}
            </div>
          ) : drafts.length > 0 ? (
            <div className="space-y-3">
              {drafts.map((draft) => (
                <DraftCard key={draft.id} draft={draft} lang={lang} />
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center">
              <div className="text-3xl mb-3">📝</div>
              <p className="text-sm hindi-text text-[var(--ink-3)] mb-4">{t("profile_no_drafts")}</p>
              <Link to="/file-rti" className="btn-primary inline-block">
                {t("profile_draft_new")}
              </Link>
            </div>
          )
        )}
      </div>

      {/* ── Contact Info ── */}
      {!loadingDrafts && contactGroups.length > 0 && (
        <div className="mb-8">
          <button
            onClick={() => setContactsExpanded((v) => !v)}
            className="flex items-center gap-2 text-left mb-3 group"
          >
            <h2 className="text-base font-semibold text-[var(--ink)] hindi-text">
              {lang === "hi" ? "संपर्क जानकारी" : "Saved Contact Info"}
              <span className="ml-2 mono-text text-sm font-normal" style={{ color: "var(--ink-4)" }}>({contactGroups.length})</span>
            </h2>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ color: "var(--ink-4)", transition: "transform 0.2s", transform: contactsExpanded ? "rotate(0deg)" : "rotate(-90deg)", flexShrink: 0 }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {contactsExpanded && (
            <div className="space-y-3">
              {contactGroups.map((contact) => (
                <ContactCard key={`${contact.name}||${contact.phone}`} contact={contact} lang={lang} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── My Uploads ── */}
      <h2 className="text-base font-semibold text-[var(--ink)] mb-4">{t("profile_my_uploads")} ({uploads.length})</h2>
      {loadingUploads ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse space-y-3">
              <div className="h-4 rounded w-1/2" style={{ background: "var(--rule)" }} />
              <div className="h-5 rounded" style={{ background: "var(--rule)" }} />
            </div>
          ))}
        </div>
      ) : uploads.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {uploads.map((entry) => <RTICard key={entry.id} entry={entry} />)}
        </div>
      ) : (
        <div className="text-center py-12 text-[var(--ink-4)]">
          <p>No RTIs uploaded yet.</p>
          <Link to="/upload" className="btn-primary inline-block mt-4">{t("nav_upload")}</Link>
        </div>
      )}
    </div>
  );
}
