import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import StatusPill from "../components/StatusPill.jsx";
import HindiText from "../components/HindiText.jsx";
import RTICard from "../components/RTICard.jsx";
import { getRTIEntry, toggleUpvote, addResponse, searchRTIs } from "../lib/api.js";
import { getAnonymousUserId } from "../lib/supabase.js";

export default function RTIDetail() {
  const { id } = useParams();
  const [entry, setEntry] = useState(null);
  const [responses, setResponses] = useState([]);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upvoted, setUpvoted] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(0);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [responseDate, setResponseDate] = useState("");
  const [responseStatus, setResponseStatus] = useState("");
  const [responseFile, setResponseFile] = useState(null);
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    getRTIEntry(id)
      .then(({ entry: e, responses: r }) => {
        setEntry(e);
        setResponses(r || []);
        setUpvoteCount(e.upvotes || 0);

        // Load related entries by subject
        if (e.subject || e.title) {
          searchRTIs({ q: e.subject || e.title, mode: "keyword" })
            .then((d) => {
              setRelated((d.results || []).filter((r) => r.id !== id).slice(0, 4));
            })
            .catch(() => {});
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleUpvote() {
    const userId = getAnonymousUserId();
    try {
      const result = await toggleUpvote(id, userId);
      setUpvoted(result.upvoted);
      setUpvoteCount((c) => (result.upvoted ? c + 1 : c - 1));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleResponseSubmit(e) {
    e.preventDefault();
    setSubmittingResponse(true);
    try {
      const formData = new FormData();
      if (responseText) formData.append("response_text", responseText);
      if (responseDate) formData.append("response_date", responseDate);
      if (responseStatus) formData.append("update_status", responseStatus);
      if (responseFile) formData.append("file", responseFile);

      const { response } = await addResponse(id, formData);
      setResponses((r) => [...r, response]);
      setShowResponseForm(false);
      setResponseText("");
      setResponseDate("");
      setResponseFile(null);
    } catch (err) {
      alert("Failed to add response: " + err.message);
    } finally {
      setSubmittingResponse(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-2/3" />
        <div className="h-4 bg-gray-100 rounded w-1/2" />
        <div className="h-48 bg-gray-100 rounded" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-500">
        <p className="text-4xl mb-3">🔍</p>
        <p className="font-medium">RTI not found</p>
        <Link to="/" className="btn-primary inline-block mt-4">Go Home</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* ---------------------------------------------------------------- */}
        {/* Main content */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex-1 min-w-0">
          {/* Breadcrumb */}
          <nav className="text-xs text-gray-500 mb-4 flex items-center gap-1">
            <Link to="/" className="hover:text-gray-700">Home</Link>
            <span>/</span>
            <Link to="/browse" className="hover:text-gray-700">Browse</Link>
            <span>/</span>
            <span className="text-gray-400 truncate">{entry.title}</span>
          </nav>

          {/* Status + language badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            <StatusPill status={entry.response_status} />
            {entry.language && (
              <span className={`status-pill ${
                entry.language === "hindi"
                  ? "bg-orange-100 text-orange-700"
                  : entry.language === "mixed"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-blue-100 text-blue-700"
              }`}>
                {entry.language === "hindi" ? "हिंदी" : entry.language === "mixed" ? "Mixed" : "English"}
              </span>
            )}
            {entry.verified && (
              <span className="status-pill bg-green-100 text-green-700">✓ Verified</span>
            )}
          </div>

          {/* Title */}
          <HindiText as="h1" className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 leading-tight">
            {entry.title || "Untitled RTI"}
          </HindiText>

          {/* Meta grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {[
              { label: "विभाग", value: entry.department },
              { label: "मंत्रालय", value: entry.ministry },
              { label: "राज्य", value: entry.state },
              { label: "जिला", value: entry.district },
              { label: "क्षेत्र", value: entry.area },
              {
                label: "Filed",
                value: entry.date_filed
                  ? new Date(entry.date_filed).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
                  : null,
              },
              {
                label: "Response Date",
                value: entry.date_of_response
                  ? new Date(entry.date_of_response).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
                  : null,
              },
              {
                label: "Filed by",
                value: entry.is_anonymous ? "गुमनाम (Anonymous)" : entry.filer_name || "—",
              },
            ]
              .filter((m) => m.value)
              .map((m) => (
                <div key={m.label} className="bg-gray-50 rounded-lg p-3">
                  <p className="section-label">{m.label}</p>
                  <HindiText as="p" className="text-sm text-gray-800 mt-0.5 font-medium">
                    {m.value}
                  </HindiText>
                </div>
              ))}
          </div>

          {/* Subject */}
          {entry.subject && (
            <section className="mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">विषय (Subject)</h2>
              <HindiText as="p" className="text-sm text-gray-800 leading-relaxed bg-gray-50 rounded-lg p-4 border border-gray-100">
                {entry.subject}
              </HindiText>
            </section>
          )}

          {/* Questions */}
          {entry.questions?.length > 0 && (
            <section className="mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                प्रश्न (Questions)
              </h2>
              <ol className="space-y-3">
                {entry.questions.map((q, idx) => (
                  <li key={idx} className="flex gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-saffron-100 text-saffron-700 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <HindiText as="p" className="text-sm text-gray-800 leading-relaxed">
                      {q}
                    </HindiText>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* RTI Act Sections */}
          {entry.rti_act_sections?.length > 0 && (
            <section className="mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">RTI Act Sections</h2>
              <div className="flex flex-wrap gap-2">
                {entry.rti_act_sections.map((s) => (
                  <span key={s} className="px-3 py-1 rounded-full bg-india-blue text-white text-xs hindi-text">
                    {s}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Response */}
          {entry.response_summary && (
            <section className="mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">
                उत्तर सारांश (Response Summary)
              </h2>
              <HindiText as="div" className="text-sm text-gray-800 leading-relaxed bg-green-50 border border-green-200 rounded-lg p-4">
                {entry.response_summary}
              </HindiText>
            </section>
          )}

          {/* PDF embed */}
          {entry.file_url && (
            <section className="mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Original Document</h2>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <embed
                  src={entry.file_url}
                  type="application/pdf"
                  width="100%"
                  height="500px"
                  className="block"
                />
              </div>
              <a
                href={entry.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 text-sm text-saffron-600 hover:text-saffron-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </a>
            </section>
          )}

          {/* Responses */}
          {responses.length > 0 && (
            <section className="mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                Responses ({responses.length})
              </h2>
              <div className="space-y-3">
                {responses.map((r) => (
                  <div key={r.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    {r.is_official && (
                      <span className="status-pill bg-blue-100 text-blue-800 mb-2 inline-block">
                        Official Response
                      </span>
                    )}
                    {r.response_text && (
                      <HindiText as="p" className="text-sm text-gray-800 leading-relaxed">
                        {r.response_text}
                      </HindiText>
                    )}
                    {r.file_url && (
                      <a href={r.file_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline mt-2 block">
                        View Response PDF
                      </a>
                    )}
                    {r.response_date && (
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(r.response_date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 mb-8">
            <button
              onClick={handleUpvote}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                upvoted
                  ? "bg-saffron-50 border-saffron-400 text-saffron-700"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <svg className="w-4 h-4" fill={upvoted ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              {upvoteCount} Upvote{upvoteCount !== 1 ? "s" : ""}
            </button>

            <button
              onClick={copyLink}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copied ? "Copied!" : "Share"}
            </button>

            <button
              onClick={() => setShowResponseForm((f) => !f)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-saffron-500 text-white text-sm font-medium hover:bg-saffron-600"
            >
              + Add Response
            </button>
          </div>

          {/* Add Response form */}
          {showResponseForm && (
            <form onSubmit={handleResponseSubmit} className="card p-5 mb-8 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Add Response</h3>
              <div>
                <label className="section-label block mb-1">Response Text</label>
                <textarea
                  rows={4}
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  className="input-field hindi-text resize-none"
                  placeholder="उत्तर का पाठ यहाँ लिखें..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="section-label block mb-1">Response Date</label>
                  <input
                    type="date"
                    value={responseDate}
                    onChange={(e) => setResponseDate(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="section-label block mb-1">Update Status</label>
                  <select
                    value={responseStatus}
                    onChange={(e) => setResponseStatus(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Keep current</option>
                    <option value="responded">Responded</option>
                    <option value="partial">Partial</option>
                    <option value="rejected">Rejected</option>
                    <option value="appealed">Appealed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="section-label block mb-1">Attach PDF (optional)</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setResponseFile(e.target.files[0])}
                  className="text-sm text-gray-600"
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={submittingResponse} className="btn-primary">
                  {submittingResponse ? "Submitting..." : "Submit Response"}
                </button>
                <button type="button" onClick={() => setShowResponseForm(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Extracted text (collapsible) */}
          {entry.extracted_text && (
            <details className="mb-6">
              <summary className="text-sm font-semibold text-gray-700 cursor-pointer hover:text-gray-900">
                Full Extracted Text (expand)
              </summary>
              <HindiText as="pre" className="mt-3 text-xs text-gray-700 bg-gray-50 rounded-lg p-4 border overflow-auto max-h-96 whitespace-pre-wrap leading-relaxed">
                {entry.extracted_text}
              </HindiText>
            </details>
          )}

          {/* Tags */}
          {entry.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {entry.tags.map((tag) => (
                <Link
                  key={tag}
                  to={`/search?q=${encodeURIComponent(tag)}&mode=keyword`}
                  className="px-3 py-1 rounded-full text-xs bg-gray-100 hover:bg-saffron-100 hover:text-saffron-700 text-gray-700 transition-colors hindi-text"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* Stats footer */}
          <div className="flex items-center gap-4 text-xs text-gray-400 border-t pt-4">
            <span>{entry.view_count || 0} views</span>
            <span>
              Added {new Date(entry.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Related sidebar */}
        {/* ---------------------------------------------------------------- */}
        {related.length > 0 && (
          <aside className="w-full lg:w-64 shrink-0">
            <div className="sticky top-20">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Related RTIs</h2>
              <div className="space-y-3">
                {related.map((r) => (
                  <RTICard key={r.id} entry={r} />
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
