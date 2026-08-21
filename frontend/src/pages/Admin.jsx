import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import JSZip from "jszip";
import { useAuth } from "../contexts/AuthContext.jsx";
import { freshToken } from "../lib/supabase.js";
import { adminMe, adminProcessPdf } from "../lib/api.js";

const MAX_PDF_BYTES = 10 * 1024 * 1024;

function isJunkEntry(name) {
  const base = name.split("/").pop();
  return (
    name.startsWith("__MACOSX/") ||
    name.includes("/__MACOSX/") ||
    base.startsWith("._") ||
    base.startsWith(".")
  );
}

export default function Admin() {
  const { user, session, loading, signIn, signOut } = useAuth();
  const [authorized, setAuthorized] = useState(null); // null = checking
  const [authError, setAuthError] = useState("");

  const [zipName, setZipName] = useState("");
  const [files, setFiles] = useState([]);       // [{ name, size, entry }]
  const [skipped, setSkipped] = useState([]);   // [{ name, reason }]
  const [startFrom, setStartFrom] = useState(1);

  const [running, setRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState([]);   // [{ name, status, entry_id, error }]
  const [quotaHit, setQuotaHit] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const stopRef = useRef(false);

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

  async function readZip(file) {
    setZipName(file.name);
    setFiles([]);
    setSkipped([]);
    setResults([]);
    setQuotaHit(false);
    setStartFrom(1);
    try {
      const zip = await JSZip.loadAsync(file);
      const pdfs = [];
      const skips = [];
      const entries = Object.values(zip.files).sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        if (entry.dir || isJunkEntry(entry.name)) continue;
        if (!entry.name.toLowerCase().endsWith(".pdf")) {
          skips.push({ name: entry.name, reason: "Not a PDF" });
          continue;
        }
        pdfs.push({ name: entry.name.split("/").pop(), size: null, entry });
      }
      setFiles(pdfs);
      setSkipped(skips);
    } catch (err) {
      setSkipped([{ name: file.name, reason: `Could not read zip: ${err.message}` }]);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readZip(file);
  }

  async function start() {
    stopRef.current = false;
    setRunning(true);
    setQuotaHit(false);
    const begin = Math.max(1, Math.min(startFrom, files.length)) - 1;

    for (let i = begin; i < files.length; i++) {
      if (stopRef.current) break;
      setCurrentIndex(i);
      const { name, entry } = files[i];
      try {
        const raw = await entry.async("blob");
        // JSZip blobs carry no MIME type — set it or the backend rejects the file
        const blob = new Blob([raw], { type: "application/pdf" });
        if (blob.size > MAX_PDF_BYTES) {
          setResults((r) => [...r, { name, status: "skipped", error: "Over 10 MB limit" }]);
          continue;
        }
        const res = await adminProcessPdf(blob, name, await freshToken());
        if (res.quota_exceeded) {
          setQuotaHit(true);
          setStartFrom(i + 1); // resume point — this file was NOT processed
          break;
        }
        setResults((r) => [...r, {
          name,
          status: res.status,
          entry_id: res.entry_id || null,
          title: res.title || null,
          error: res.error || null,
        }]);
      } catch (err) {
        setResults((r) => [...r, { name, status: "failed", error: err.message }]);
      }
    }
    setRunning(false);
  }

  const done = results.length;
  const inserted = results.filter((r) => r.status === "inserted").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const skippedCount = results.filter((r) => r.status === "skipped").length;

  // ── Auth gates ─────────────────────────────────────────────────
  if (loading || (user && authorized === null)) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-[var(--ink-3)]">Checking access…</div>;
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
          <p className="text-sm text-[var(--ink-3)] mb-4">
            {authError || "This account does not have admin access."}
          </p>
          <p className="text-sm text-[var(--ink-3)] mb-6">Signed in as {user.email}</p>
          <button
            onClick={() => signOut().then(() => setAuthorized(null)).catch(console.error)}
            className="w-full px-4 py-3 font-medium shadow-sm"
            style={{ border: "1px solid var(--rule-strong)", background: "var(--surface)", color: "var(--ink)", borderRadius: "var(--r-md)" }}
          >
            Sign out & sign in again
          </button>
          <div className="mt-6">
            <Link to="/" className="text-sm" style={{ color: "var(--ink-3)" }}>← Back to home</Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Admin UI ───────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-[var(--ink)] mb-1">Bulk RTI Upload</h1>
      <p className="text-sm text-[var(--ink-3)] mb-8">
        Drop a zip of RTI PDFs. Each file is parsed by AI and published directly. Signed in as {user.email}.
      </p>

      {/* Zip dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className="card p-8 text-center mb-6"
        style={{ borderStyle: "dashed", borderWidth: 2, borderColor: dragOver ? "var(--ink)" : "var(--rule-strong)" }}
      >
        <p className="text-sm text-[var(--ink-3)] mb-3">
          {zipName ? `Loaded: ${zipName}` : "Drag & drop a .zip here, or"}
        </p>
        <label
          className="inline-block px-4 py-2 text-sm font-medium cursor-pointer shadow-sm"
          style={{ border: "1px solid var(--rule-strong)", background: "var(--surface)", color: "var(--ink)", borderRadius: "var(--r-md)" }}
        >
          Choose zip file
          <input
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            disabled={running}
            onChange={(e) => e.target.files?.[0] && readZip(e.target.files[0])}
          />
        </label>
      </div>

      {/* File list summary + controls */}
      {files.length > 0 && (
        <div className="card p-6 mb-6">
          <p className="text-sm text-[var(--ink)] mb-4">
            <strong>{files.length}</strong> PDFs found
            {skipped.length > 0 && <span className="text-[var(--ink-3)]"> · {skipped.length} non-PDF entries ignored</span>}
          </p>

          <div className="flex items-center gap-4 flex-wrap">
            {!running ? (
              <button
                onClick={start}
                className="px-5 py-2.5 font-medium text-white shadow-sm"
                style={{ background: "var(--ink)", borderRadius: "var(--r-md)" }}
              >
                {done > 0 || startFrom > 1 ? "Resume" : "Start upload"}
              </button>
            ) : (
              <button
                onClick={() => { stopRef.current = true; }}
                className="px-5 py-2.5 font-medium shadow-sm"
                style={{ border: "1px solid var(--rule-strong)", background: "var(--surface)", color: "var(--ink)", borderRadius: "var(--r-md)" }}
              >
                Stop after current file
              </button>
            )}

            <label className="text-sm text-[var(--ink-3)] flex items-center gap-2">
              Start from file #
              <input
                type="number"
                min={1}
                max={files.length}
                value={startFrom}
                disabled={running}
                onChange={(e) => setStartFrom(Number(e.target.value) || 1)}
                className="w-20 px-2 py-1 text-sm"
                style={{ border: "1px solid var(--rule-strong)", borderRadius: "var(--r-md)", background: "var(--surface)", color: "var(--ink)" }}
              />
            </label>
          </div>

          {/* Progress */}
          {(running || done > 0) && (
            <div className="mt-5">
              <div className="h-2 w-full overflow-hidden" style={{ background: "var(--rule)", borderRadius: 999 }}>
                <div
                  className="h-full transition-all"
                  style={{ width: `${Math.round((done / files.length) * 100)}%`, background: "#138808", borderRadius: 999 }}
                />
              </div>
              <p className="text-sm text-[var(--ink-3)] mt-2">
                {running ? `Processing ${currentIndex + 1} of ${files.length}: ${files[currentIndex]?.name}` : `Finished ${done} of ${files.length}`}
                {" · "}{inserted} added{failed > 0 && ` · ${failed} failed`}{skippedCount > 0 && ` · ${skippedCount} skipped`}
              </p>
            </div>
          )}

          {quotaHit && (
            <p className="text-sm mt-3" style={{ color: "#b45309" }}>
              Daily Gemini quota reached — stopped at file #{startFrom}. Reopen this page tomorrow, load the same
              zip, and it will resume from there.
            </p>
          )}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="card p-6 overflow-x-auto">
          <h2 className="text-lg font-semibold text-[var(--ink)] mb-4">Report</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--ink-3)]">
                <th className="pb-2 pr-4">#</th>
                <th className="pb-2 pr-4">File</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2">Detail</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--rule)" }}>
                  <td className="py-2 pr-4 text-[var(--ink-3)]">{i + 1}</td>
                  <td className="py-2 pr-4 text-[var(--ink)]" style={{ wordBreak: "break-all" }}>{r.name}</td>
                  <td className="py-2 pr-4">
                    <span style={{ color: r.status === "inserted" ? "#138808" : r.status === "failed" ? "#dc2626" : "#b45309" }}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-2">
                    {r.entry_id
                      ? <Link to={`/rti/${r.entry_id}`} className="underline" style={{ color: "var(--ink)" }}>{r.title || "View entry"}</Link>
                      : <span className="text-[var(--ink-3)]">{r.error || "—"}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
