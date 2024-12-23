import React from "react";
import HindiText from "./HindiText.jsx";

const STATES = [
  "केंद्र सरकार",
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
  { value: "pending", label: "Pending (लंबित)" },
  { value: "responded", label: "Responded (उत्तरित)" },
  { value: "partial", label: "Partial (आंशिक)" },
  { value: "rejected", label: "Rejected (अस्वीकृत)" },
  { value: "appealed", label: "Appealed (अपील)" },
];

const LANGUAGES = [
  { value: "hindi", label: "Hindi (हिंदी)" },
  { value: "english", label: "English" },
  { value: "mixed", label: "Mixed (मिश्रित)" },
];

export default function ParsedFieldForm({ data, onChange }) {
  function set(field, value) {
    onChange({ ...data, [field]: value });
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

  return (
    <div className="space-y-5">
      {/* Department & Ministry */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="section-label block mb-1">
            विभाग (Department) <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={data.department || ""}
            onChange={(e) => set("department", e.target.value)}
            className="input-field hindi-text"
            placeholder="विभाग का नाम"
          />
        </div>
        <div>
          <label className="section-label block mb-1">मंत्रालय (Ministry)</label>
          <input
            type="text"
            value={data.ministry || ""}
            onChange={(e) => set("ministry", e.target.value)}
            className="input-field hindi-text"
            placeholder="मंत्रालय"
          />
        </div>
      </div>

      {/* State & District */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="section-label block mb-1">राज्य (State)</label>
          <select
            value={data.state || ""}
            onChange={(e) => set("state", e.target.value)}
            className="input-field"
          >
            <option value="">Select state...</option>
            {STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="section-label block mb-1">जिला (District)</label>
          <input
            type="text"
            value={data.district || ""}
            onChange={(e) => set("district", e.target.value)}
            className="input-field hindi-text"
            placeholder="जिला"
          />
        </div>
      </div>

      {/* Area */}
      <div>
        <label className="section-label block mb-1">क्षेत्र (Area/Locality)</label>
        <input
          type="text"
          value={data.area || ""}
          onChange={(e) => set("area", e.target.value)}
          className="input-field hindi-text"
          placeholder="क्षेत्र या स्थान"
        />
      </div>

      {/* Subject */}
      <div>
        <label className="section-label block mb-1">
          विषय (Subject) <span className="text-red-400">*</span>
        </label>
        <textarea
          rows={3}
          value={data.subject || ""}
          onChange={(e) => set("subject", e.target.value)}
          className="input-field hindi-text resize-none"
          placeholder="RTI का विषय..."
        />
      </div>

      {/* Questions */}
      <div>
        <label className="section-label block mb-2">
          प्रश्न (Questions) <span className="text-red-400">*</span>
        </label>
        <div className="space-y-2">
          {(data.questions || [""]).map((q, idx) => (
            <div key={idx} className="flex gap-2">
              <span className="text-xs text-gray-400 mt-3 w-5 shrink-0">{idx + 1}.</span>
              <textarea
                rows={2}
                value={q}
                onChange={(e) => setQuestion(idx, e.target.value)}
                className="input-field hindi-text resize-none flex-1"
                placeholder={`प्रश्न ${idx + 1}`}
              />
              {(data.questions || []).length > 1 && (
                <button
                  type="button"
                  onClick={() => removeQuestion(idx)}
                  className="text-red-400 hover:text-red-600 mt-2 shrink-0"
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
          className="mt-2 text-sm text-saffron-600 hover:text-saffron-700 font-medium"
        >
          + प्रश्न जोड़ें (Add question)
        </button>
      </div>

      {/* Response summary */}
      <div>
        <label className="section-label block mb-1">उत्तर सारांश (Response Summary)</label>
        <textarea
          rows={3}
          value={data.response_summary || ""}
          onChange={(e) => set("response_summary", e.target.value)}
          className="input-field hindi-text resize-none"
          placeholder="उत्तर का सारांश (यदि उपलब्ध हो)..."
        />
      </div>

      {/* Status, Language, Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="section-label block mb-1">Status</label>
          <select
            value={data.response_status || "pending"}
            onChange={(e) => set("response_status", e.target.value)}
            className="input-field"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="section-label block mb-1">Date Filed</label>
          <input
            type="date"
            value={data.date_filed || ""}
            onChange={(e) => set("date_filed", e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="section-label block mb-1">Date of Response</label>
          <input
            type="date"
            value={data.date_of_response || ""}
            onChange={(e) => set("date_of_response", e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      {/* Language badge */}
      <div>
        <label className="section-label block mb-1">Detected Language</label>
        <div className="flex gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => set("language", l.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                data.language === l.value
                  ? "bg-saffron-500 text-white border-saffron-500"
                  : "bg-white text-gray-600 border-gray-300 hover:border-saffron-400"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="section-label block mb-2">टैग (Tags)</label>
        <div className="flex flex-wrap gap-2">
          {(data.tags || []).map((tag, idx) => (
            <div key={idx} className="flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1">
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(idx, e.target.value)}
                className="bg-transparent text-sm hindi-text w-20 outline-none"
                placeholder="tag"
              />
              <button
                type="button"
                onClick={() => removeTag(idx)}
                className="text-gray-400 hover:text-gray-600"
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
            className="px-3 py-1 rounded-full border border-dashed border-gray-300 text-xs text-gray-500 hover:border-saffron-400 hover:text-saffron-600"
          >
            + Tag
          </button>
        </div>
      </div>

      {/* RTI Act sections */}
      <div>
        <label className="section-label block mb-1">RTI Act Sections</label>
        <input
          type="text"
          value={(data.rti_act_sections || []).join(", ")}
          onChange={(e) =>
            set(
              "rti_act_sections",
              e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
            )
          }
          className="input-field"
          placeholder="धारा 6, धारा 7, धारा 19 (comma-separated)"
        />
      </div>
    </div>
  );
}
