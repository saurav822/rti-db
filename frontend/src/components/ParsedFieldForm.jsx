import React, { useState } from "react";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { displayState } from "../lib/i18n.js";
import { STATUS_CONFIG } from "./StatusPill.jsx";

const STATES = [
  "Central Government",
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

const STATUSES = [
  { value: "full_response",     en: "Full Response",     hi: "पूर्ण उत्तर",       color: "var(--green)", bg: "var(--green-bg)", border: "rgba(74,122,58,0.25)" },
  { value: "partial_response",  en: "Partial Response",  hi: "आंशिक उत्तर",      color: "#0369a1",      bg: "rgba(3,105,161,0.09)", border: "rgba(3,105,161,0.22)" },
  { value: "no_response",       en: "No Response",       hi: "कोई उत्तर नहीं",   color: "var(--red)",   bg: "var(--red-bg)", border: "rgba(155,44,44,0.25)" },
];

const LANGUAGES = [
  { value: "hindi", en: "Hindi", hi: "हिंदी" },
  { value: "english", en: "English", hi: "अंग्रेज़ी" },
  { value: "mixed", en: "Mixed", hi: "मिश्रित" },
];

function TableModal({ table, onClose, onSave }) {
  const [rows, setRows] = useState(table.rows.map((r) => [...r]));

  function updateCell(ri, ci, val) {
    setRows((prev) => {
      const next = prev.map((r) => [...r]);
      next[ri][ci] = val;
      return next;
    });
  }

  function save() {
    onSave(rows);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="glass rounded-[var(--r-lg)] shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--rule)]">
          <h3 className="text-sm font-semibold text-[var(--ink)] hindi-text">
            {table.title || "Table"}
          </h3>
          <button onClick={onClose} className="text-[var(--ink-4)] hover:text-[var(--ink)]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-auto flex-1 p-4">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {table.headers.map((h, ci) => (
                  <th key={ci} className="border border-[var(--rule)] px-3 py-2 text-left font-medium text-[var(--ink-3)] hindi-text whitespace-nowrap" style={{ background: "var(--surface)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="hover:bg-[var(--accent-glass)]">
                  {row.map((cell, ci) => (
                    <td key={ci} className="border border-[var(--rule)] px-1 py-1">
                      <input
                        type="text"
                        value={cell}
                        onChange={(e) => updateCell(ri, ci, e.target.value)}
                        className="w-full bg-transparent px-2 py-1 text-sm hindi-text outline-none rounded focus:bg-[var(--accent-glass)]"
                        style={{ color: "var(--ink)" }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-[var(--rule)]">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button onClick={save} className="btn-primary text-sm">Save Changes</button>
        </div>
      </div>
    </div>
  );
}

export default function ParsedFieldForm({ data, onChange }) {
  const { lang } = useLanguage();
  const isHi = lang === "hi";
  const [openTableIdx, setOpenTableIdx] = useState(null);

  function set(field, value) {
    onChange({ ...data, [field]: value });
  }

  function lbl(en, hi) {
    return isHi ? hi : en;
  }

  function setQuestion(idx, value) {
    const questions = [...(data.questions || [])];
    questions[idx] = value;
    set("questions", questions);
  }

  function addQuestion() {
    set("questions", [...(data.questions || []), ""]);
  }

  function removeQuestion(idx) {
    const questions = (data.questions || []).filter((_, i) => i !== idx);
    set("questions", questions);
  }

  function setTag(idx, value) {
    const tags = [...(data.tags || [])];
    tags[idx] = value;
    set("tags", tags);
  }

  function addTag() {
    set("tags", [...(data.tags || []), ""]);
  }

  function removeTag(idx) {
    const tags = (data.tags || []).filter((_, i) => i !== idx);
    set("tags", tags);
  }

  function saveTableRows(idx, rows) {
    const tables = (data.response_tables || []).map((t, i) =>
      i === idx ? { ...t, rows } : t
    );
    set("response_tables", tables);
  }

  const tables = data.response_tables || [];
  const openTable = openTableIdx !== null ? tables[openTableIdx] : null;

  return (
    <div className="space-y-5">
      {openTable && (
        <TableModal
          table={openTable}
          onClose={() => setOpenTableIdx(null)}
          onSave={(rows) => saveTableRows(openTableIdx, rows)}
        />
      )}

      {/* Department */}
      <div>
        <label className="section-label block mb-1">
          {lbl("Department", "विभाग")} <span style={{ color: "var(--red)" }}>*</span>
        </label>
        <input
          type="text"
          value={data.department || ""}
          onChange={(e) => set("department", e.target.value)}
          className="input-field hindi-text"
          placeholder={lbl("Department name", "विभाग का नाम")}
        />
      </div>

      {/* State */}
      <div>
        <label className="section-label block mb-1">{lbl("State", "राज्य")}</label>
        <select
          value={data.state || ""}
          onChange={(e) => set("state", e.target.value)}
          className="input-field"
        >
          <option value="">{lbl("Select state...", "राज्य चुनें...")}</option>
          {STATES.map((s) => (
            <option key={s} value={s}>{displayState(s, lang)}</option>
          ))}
        </select>
      </div>

      {/* Subject */}
      <div>
        <label className="section-label block mb-1">
          {lbl("Subject", "विषय")} <span style={{ color: "var(--red)" }}>*</span>
        </label>
        <textarea
          rows={3}
          value={data.subject || ""}
          onChange={(e) => set("subject", e.target.value)}
          className="input-field hindi-text resize-none"
          placeholder={lbl("RTI subject...", "RTI का विषय...")}
        />
      </div>

      {/* Questions */}
      <div>
        <label className="section-label block mb-2">
          {lbl("Questions", "प्रश्न")} <span style={{ color: "var(--red)" }}>*</span>
        </label>
        <div className="space-y-2">
          {(data.questions || [""]).map((q, idx) => (
            <div key={idx} className="flex gap-2">
              <span className="text-xs text-[var(--ink-4)] mt-3 w-5 shrink-0">{idx + 1}.</span>
              <textarea
                rows={2}
                value={q}
                onChange={(e) => setQuestion(idx, e.target.value)}
                className="input-field hindi-text resize-none flex-1"
                placeholder={lbl(`Question ${idx + 1}`, `प्रश्न ${idx + 1}`)}
              />
              {(data.questions || []).length > 1 && (
                <button
                  type="button"
                  onClick={() => removeQuestion(idx)}
                  className="mt-2 shrink-0"
                  style={{ color: "var(--red)" }}
                  aria-label="Remove question"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addQuestion}
          className="mt-2 text-sm font-medium"
          style={{ color: "var(--accent)" }}
        >
          {lbl("+ Add question", "+ प्रश्न जोड़ें")}
        </button>
      </div>

      {/* Response Summary */}
      <div>
        <label className="section-label block mb-1">{lbl("Response Summary", "उत्तर सारांश")}</label>
        <textarea
          rows={3}
          value={data.response_summary || ""}
          onChange={(e) => set("response_summary", e.target.value)}
          className="input-field hindi-text resize-none"
          placeholder={lbl("Summary of response (if available)...", "उत्तर का सारांश (यदि उपलब्ध हो)...")}
        />
      </div>

      {/* Full Response Tables */}
      {tables.length > 0 && (
        <div>
          <label className="section-label block mb-2">
            {lbl("Full Response", "पूर्ण उत्तर")}
          </label>
          <div className="flex flex-wrap gap-2">
            {tables.map((tbl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setOpenTableIdx(idx)}
                className="flex items-center gap-2 px-4 py-2 rounded-[var(--r-sm)] border text-sm transition-colors"
                style={{ borderColor: "var(--accent-glow)", background: "var(--accent-glass)", color: "var(--accent)" }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M14 3v18M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
                </svg>
                <span className="hindi-text">{tbl.title || lbl(`Table ${idx + 1}`, `तालिका ${idx + 1}`)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Detected Language */}
      <div>
        <label className="section-label block mb-1">{lbl("Detected Language", "पहचानी गई भाषा")}</label>
        <div className="flex gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => set("language", l.value)}
              className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
              style={
                data.language === l.value
                  ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }
                  : { background: "var(--surface)", color: "var(--ink-3)", borderColor: "var(--rule-strong)" }
              }
            >
              {isHi ? l.hi : l.en}
            </button>
          ))}
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="section-label block mb-1">{lbl("Date Filed", "दाखिल तिथि")}</label>
          <input
            type="date"
            value={data.date_filed || ""}
            onChange={(e) => set("date_filed", e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="section-label block mb-1">{lbl("Date of Response", "उत्तर तिथि")}</label>
          <input
            type="date"
            value={data.date_of_response || ""}
            onChange={(e) => set("date_of_response", e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="section-label block mb-2">{lbl("Tags", "टैग")}</label>
        <div className="flex flex-wrap gap-2">
          {(data.tags || []).map((tag, idx) => (
            <div key={idx} className="flex items-center gap-1 rounded-full px-3 py-1 border" style={{ background: "var(--accent-glass)", borderColor: "var(--accent-glow)" }}>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(idx, e.target.value)}
                className="bg-transparent text-sm hindi-text w-20 outline-none"
                style={{ color: "var(--accent)" }}
                placeholder="tag"
              />
              <button
                type="button"
                onClick={() => removeTag(idx)}
                className="text-[var(--ink-4)] hover:text-[var(--ink)]"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addTag}
            className="px-3 py-1 rounded-full border border-dashed text-xs transition-colors"
            style={{ borderColor: "var(--rule-strong)", color: "var(--ink-4)" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--rule-strong)"; e.currentTarget.style.color = "var(--ink-4)"; }}
          >
            + {lbl("Tag", "टैग")}
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="pt-2 border-t border-[var(--rule)]">
        <label className="section-label block mb-2">{lbl("Response Status", "उत्तर स्थिति")}</label>
        <div className="flex flex-col sm:flex-row gap-2">
          {STATUSES.map((s) => {
            const isActive = (data.response_status || "no_response") === s.value;
            const { Icon } = STATUS_CONFIG[s.value];
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => set("response_status", s.value)}
                className="flex items-center gap-2 px-3 py-2 rounded-[var(--r-sm)] text-sm font-medium border transition-all flex-1"
                style={
                  isActive
                    ? { background: s.bg, color: s.color, borderColor: s.border }
                    : { background: "var(--surface)", color: "var(--ink-3)", borderColor: "var(--rule-strong)" }
                }
              >
                <Icon />
                <span className="hindi-text">{isHi ? s.hi : s.en}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
