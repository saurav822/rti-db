import React, { useCallback, useState } from "react";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useT } from "../lib/i18n.js";

const MAX_SIZE = 10 * 1024 * 1024;

export default function FileDropzone({ onFileSelected, file }) {
  const { lang } = useLanguage();
  const t = useT(lang);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");

  function validate(f) {
    if (!f) return t("dropzone_err_no_file");
    if (f.type !== "application/pdf") return t("dropzone_err_not_pdf");
    if (f.size > MAX_SIZE) return t("dropzone_err_too_big");
    return null;
  }

  const handleFile = useCallback((f) => {
    const err = validate(f);
    if (err) { setError(err); return; }
    setError("");
    onFileSelected(f);
  }, [onFileSelected, lang]);

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function onInputChange(e) {
    const f = e.target.files[0];
    if (f) handleFile(f);
  }

  const zoneStyle = dragOver
    ? { borderColor: "var(--accent)", background: "var(--accent-glass)" }
    : file
    ? { borderColor: "var(--green)", background: "var(--green-bg)" }
    : { borderColor: "var(--rule-strong)", background: "var(--surface)" };

  return (
    <div>
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed cursor-pointer transition-colors"
        style={{ borderRadius: "var(--r-lg)", ...zoneStyle }}
      >
        {file ? (
          <div className="text-center px-4">
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-red-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" /></svg>
            </div>
            <p className="text-sm font-medium text-[var(--ink)]">{file.name}</p>
            <p className="text-xs text-[var(--ink-3)] mt-1">{(file.size / 1024).toFixed(1)} KB</p>
            <p className="text-xs mt-1" style={{ color: "var(--green)" }}>{t("dropzone_change")}</p>
          </div>
        ) : (
          <div className="text-center px-4">
            <svg className="w-10 h-10 mx-auto mb-3 text-[var(--ink-4)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm font-medium text-[var(--ink)] hindi-text">{t("dropzone_title")}</p>
            <p className="text-xs text-[var(--ink-3)] mt-1">{t("dropzone_hint")}</p>
          </div>
        )}
        <input type="file" accept="application/pdf" className="hidden" onChange={onInputChange} />
      </label>
      {error && <p className="mt-2 text-sm" style={{ color: "var(--red)" }}>{error}</p>}
    </div>
  );
}
