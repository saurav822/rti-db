import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import JSZip from "jszip";
import { useAuth } from "../contexts/AuthContext.jsx";
import { freshToken } from "../lib/supabase.js";
import { adminMe, adminImportRecord } from "../lib/api.js";

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

export default function AdminImport() {
  const { user, session, loading, signIn, signOut } = useAuth();
  const [authorized, setAuthorized] = useState(null);
  const [authError, setAuthError] = useState("");

  const [zipName, setZipName] = useState("");
  const [pairs, setPairs] = useState([]);       // [{ name, record, entry }]
  const [issues, setIssues] = useState([]);     // [{ name, reason }]
  const [startFrom, setStartFrom] = useState(1);

  const [running, setRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState([]);
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
    setPairs([]);
    setIssues([]);
    setResults([]);
    setQuotaHit(false);
    setStartFrom(1);
    try {
      const zip = await JSZip.loadAsync(file);
      const entries = Object.values(zip.files).filter((e) => !e.dir && !isJunkEntry(e.name));

      const jsonEntry = entries.find((e) => e.name.toLowerCase().endsWith(".json"));
      if (!jsonEntry) {
        setIssues([{ name: file.name, reason: "No .json manifest file found in the zip" }]);
        return;
      }

      const manifestText = await jsonEntry.async("string");
      let records;
      try {
        records = JSON.parse(manifestText);
      } catch (err) {
        setIssues([{ name: jsonEntry.name, reason: `Invalid JSON: ${err.message}` }]);
        return;
      }
      if (!Array.isArray(records)) {
        setIssues([{ name: jsonEntry.name, reason: "Manifest JSON must be an array of records" }]);
        return;
      }

      const pdfsByName = {};
      for (const e of entries) {
        if (e.name.toLowerCase().endsWith(".pdf")) pdfsByName[e.name.split("/").pop()] = e;
      }

      const matched = [];
      const skips = [];
      for (const record of records) {
        const filename = record.filename;
        if (!filename) {
          skips.push({ name: record.title || "(untitled record)", reason: "Record has no 'filename' field" });
          continue;
        }
        const entry = pdfsByName[filename];
        if (!entry) {
          skips.push({ name: filename, reason: "No matching PDF found in zip" });
          continue;
        }
        matched.push({ name: filename, record, entry });
      }

      matched.sort((a, b) => a.name.localeCompare(b.name));
      setPairs(matched);
      setIssues(skips);
    } catch (err) {
      setIssues([{ name: file.name, reason: `Could not read zip: ${err.message}` }]);
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
    const begin = Math.max(1, Math.min(startFrom, pairs.length)) - 1;

    for (let i = begin; i < pairs.length; i++) {
      if (stopRef.current) break;
      setCurrentIndex(i);
      const { name, record, entry } = pairs[i];
      try {
        const raw = await entry.async("blob");
        const blob = new Blob([raw], { type: "application/pdf" });
        if (blob.size > MAX_PDF_BYTES) {
          setResults((r) => [...r, { name, status: "skipped", error: "Over 10 MB limit" }]);
          continue;
        }
        const res = await adminImportRecord(record, blob, name, await freshToken());
        if (res.quota_exceeded) {
          setQuotaHit(true);
          setStartFrom(i + 1);
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
          <p className="text-sm text-[var(--ink-3)] mb-4">{authError || "This account does not have admin access."}</p>
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-4)] mb-2">Admin</p>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-1">
        <h1 className="text-2xl font-semibold text-[var(--ink)]">Import Pre-Parsed RTIs</h1>
        <div className="flex items-center gap-4">
          <Link to="/admin" className="text-sm underline" style={{ color: "var(--ink-3)" }}>Bulk Upload</Link>
          <Link to="/admin/entries/new" className="text-sm underline" style={{ color: "var(--ink-3)" }}>View new uploads →</Link>
        </div>
      </div>
      <p className="text-sm text-[var(--ink-3)] mb-8">
        Drop a zip containing the PDFs plus one manifest .json file (an array of records, each with a
        "filename" field matching a PDF in the zip). No AI parsing happens here — only a search embedding
        is generated per record. Signed in as {user.email}.
      </p>

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

      {(pairs.length > 0 || issues.length > 0) && (
        <div className="card p-6 mb-6">
          <p className="text-sm text-[var(--ink)] mb-4">
            <strong>{pairs.length}</strong> records matched to a PDF
            {issues.length > 0 && <span className="text-[var(--ink-3)]"> · {issues.length} skipped (see below)</span>}
          </p>

          {issues.length > 0 && (
            <ul className="text-xs text-[var(--ink-3)] mb-4 space-y-1">
              {issues.map((iss, i) => (
                <li key={i}>{iss.name} — {iss.reason}</li>
              ))}
            </ul>
          )}

          {pairs.length > 0 && (
            <>
              <div className="flex items-center gap-4 flex-wrap">
                {!running ? (
                  <button
                    onClick={start}
                    className="px-5 py-2.5 font-medium text-white shadow-sm"
                    style={{ background: "var(--ink)", borderRadius: "var(--r-md)" }}
                  >
                    {done > 0 || startFrom > 1 ? "Resume" : "Start import"}
                  </button>
                ) : (
                  <button
                    onClick={() => { stopRef.current = true; }}
                    className="px-5 py-2.5 font-medium shadow-sm"
                    style={{ border: "1px solid var(--rule-strong)", background: "var(--surface)", color: "var(--ink)", borderRadius: "var(--r-md)" }}
                  >
                    Stop after current record
                  </button>
                )}

                <label className="text-sm text-[var(--ink-3)] flex items-center gap-2">
                  Start from record #
                  <input
                    type="number"
                    min={1}
                    max={pairs.length}
                    value={startFrom}
                    disabled={running}
                    onChange={(e) => setStartFrom(Number(e.target.value) || 1)}
                    className="w-20 px-2 py-1 text-sm"
                    style={{ border: "1px solid var(--rule-strong)", borderRadius: "var(--r-md)", background: "var(--surface)", color: "var(--ink)" }}
                  />
                </label>
              </div>

              {(running || done > 0) && (
                <div className="mt-5">
                  <div className="h-2 w-full overflow-hidden" style={{ background: "var(--rule)", borderRadius: 999 }}>
                    <div
                      className="h-full transition-all"
                      style={{ width: `${Math.round((done / pairs.length) * 100)}%`, background: "#138808", borderRadius: 999 }}
                    />
                  </div>
                  <p className="text-sm text-[var(--ink-3)] mt-2">
                    {running ? `Processing ${currentIndex + 1} of ${pairs.length}: ${pairs[currentIndex]?.name}` : `Finished ${done} of ${pairs.length}`}
                    {" · "}{inserted} added{failed > 0 && ` · ${failed} failed`}{skippedCount > 0 && ` · ${skippedCount} skipped`}
                  </p>
                </div>
              )}

              {quotaHit && (
                <p className="text-sm mt-3" style={{ color: "#b45309" }}>
                  Daily Gemini quota reached — stopped at record #{startFrom}. Reopen this page tomorrow, load
                  the same zip, and it will resume from there.
                </p>
              )}
            </>
          )}
        </div>
      )}

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
