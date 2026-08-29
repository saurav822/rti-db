import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { freshToken } from "../lib/supabase.js";
import { adminMe, adminListEntries } from "../lib/api.js";

function truncate(text, n) {
  if (!text) return "—";
  return text.length > n ? `${text.slice(0, n)}…` : text;
}

function firstQuestion(questions) {
  if (!Array.isArray(questions) || questions.length === 0) return "—";
  const suffix = questions.length > 1 ? ` (+${questions.length - 1} more)` : "";
  return truncate(questions[0], 70) + suffix;
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// Shared table used by both the "Old Uploads" and "New Uploads" admin pages.
// `source` is passed straight to GET /api/admin/entries — omit for all
// entries, or "json_import" to show only entries from the JSON-import flow.
export default function AdminUploadsList({ title, source, backTo, backLabel }) {
  const { user, session, loading, signIn } = useAuth();
  const [authorized, setAuthorized] = useState(null);
  const [authError, setAuthError] = useState("");

  const [entries, setEntries] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [exporting, setExporting] = useState(false);

  const token = session?.access_token;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setAuthorized(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const t = await freshToken();
        if (!t) throw new Error("Session expired — please sign out and sign in again");
        await adminMe(t);
        if (!cancelled) setAuthorized(true);
      } catch (err) {
        if (!cancelled) {
          setAuthorized(false);
          setAuthError(err.message);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [user, token, loading]);

  useEffect(() => {
    if (!authorized) return;
    let cancelled = false;
    (async () => {
      setFetching(true);
      setFetchError("");
      try {
        const t = await freshToken();
        const { entries: data } = await adminListEntries(t, { source });
        if (!cancelled) setEntries(data);
      } catch (err) {
        if (!cancelled) setFetchError(err.message);
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authorized, source]);

  function pdfUrl(e) {
    return e.admin_pdf_url || e.file_url || null;
  }

  async function downloadExcel() {
    setExporting(true);
    try {
      const { utils, writeFile } = await import("xlsx");
      const rows = entries.map((e) => ({
        ID: e.original_filename || "—",
        "Upload Date": e.created_at ? new Date(e.created_at).toLocaleString("en-IN") : "—",
        Department: e.department || "—",
        State: e.state || "—",
        Question: firstQuestion(e.questions),
        Summary: truncate(e.response_summary, 200),
        "RTI URL": `${window.location.origin}/rti/${e.id}`,
        "PDF Link": pdfUrl(e) || "—",
        Source: e.is_admin_upload ? "Admin" : "Individual",
      }));
      const ws = utils.json_to_sheet(rows);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "RTI Uploads");
      writeFile(wb, `rti-uploads-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  if (loading || (user && authorized === null)) {
    return <div className="max-w-6xl mx-auto px-4 py-16 text-center text-[var(--ink-3)]">Checking access…</div>;
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="card p-8 text-center">
          <h1 className="text-xl font-semibold text-[var(--ink)] mb-2">Admin</h1>
          <p className="text-sm text-[var(--ink-3)] mb-8">Sign in with the admin account to continue.</p>
          <button
            onClick={() => signIn().catch(console.error)}
            className="w-full px-4 py-3 font-medium shadow-sm"
            style={{ border: "1px solid var(--rule-strong)", background: "var(--surface)", color: "var(--ink)", borderRadius: "var(--r-md)" }}
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="card p-8 text-center">
          <h1 className="text-xl font-semibold text-[var(--ink)] mb-2">Not authorized</h1>
          <p className="text-sm text-[var(--ink-3)] mb-4">{authError || "This account does not have admin access."}</p>
          <div className="mt-6">
            <Link to="/" className="text-sm" style={{ color: "var(--ink-3)" }}>← Back to home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-4)] mb-2">Admin</p>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-1">
        <h1 className="text-2xl font-semibold text-[var(--ink)]">{title}</h1>
        <div className="flex items-center gap-3">
          <Link to={backTo} className="text-sm" style={{ color: "var(--ink-3)" }}>← {backLabel}</Link>
          <button
            onClick={downloadExcel}
            disabled={exporting || entries.length === 0}
            className="px-4 py-2 text-sm font-medium shadow-sm"
            style={{ background: "var(--ink)", color: "white", borderRadius: "var(--r-md)", opacity: exporting ? 0.6 : 1 }}
          >
            {exporting ? "Exporting…" : "Download Excel"}
          </button>
        </div>
      </div>
      <p className="text-sm text-[var(--ink-3)] mb-8">{entries.length} RTI entries total.</p>

      {fetching && <p className="text-sm text-[var(--ink-3)]">Loading…</p>}
      {fetchError && <p className="text-sm" style={{ color: "var(--red)" }}>{fetchError}</p>}

      {!fetching && !fetchError && (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--ink-3)]" style={{ borderBottom: "1px solid var(--rule)" }}>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Upload Date</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4">Question</th>
                <th className="py-3 px-4">Summary</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">URL</th>
                <th className="py-3 px-4 text-center">PDF</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const url = pdfUrl(e);
                return (
                  <tr key={e.id} style={{ borderTop: "1px solid var(--rule)" }}>
                    <td className="py-3 px-4 text-[var(--ink)]" style={{ maxWidth: 220, wordBreak: "break-word" }}>
                      {e.original_filename || "—"}
                    </td>
                    <td className="py-3 px-4 text-[var(--ink-3)] whitespace-nowrap">
                      {e.created_at ? new Date(e.created_at).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="py-3 px-4 text-[var(--ink-3)]">{e.department || "—"}</td>
                    <td className="py-3 px-4 text-[var(--ink-3)]">{e.state || "—"}</td>
                    <td className="py-3 px-4 text-[var(--ink-3)]" style={{ maxWidth: 260 }}>{firstQuestion(e.questions)}</td>
                    <td className="py-3 px-4 text-[var(--ink-3)]" style={{ maxWidth: 260 }}>{truncate(e.response_summary, 100)}</td>
                    <td className="py-3 px-4">
                      <span
                        className="status-pill"
                        style={
                          e.is_admin_upload
                            ? { background: "rgba(30,64,175,0.09)", color: "#1e40af", border: "1px solid rgba(30,64,175,0.20)" }
                            : { background: "var(--surface)", color: "var(--ink-3)", border: "1px solid var(--rule)" }
                        }
                      >
                        {e.is_admin_upload ? "Admin" : "Individual"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Link to={`/rti/${e.id}`} className="underline" style={{ color: "var(--ink)" }}>View</Link>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center"
                          style={{ color: "var(--ink)" }}
                          title="Open PDF"
                        >
                          <EyeIcon />
                        </a>
                      ) : (
                        <span style={{ color: "var(--ink-4)" }} title="No PDF available">
                          <EyeIcon />
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
