import React, { useState } from "react";
import { Link } from "react-router-dom";
import HindiText from "../components/HindiText.jsx";
import StatusPill from "../components/StatusPill.jsx";
import { checkDuplicate } from "../lib/api.js";

export default function DuplicateChecker() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState("");

  async function handleCheck(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    setMatches(null);
    try {
      const data = await checkDuplicate(text);
      setMatches(data.matches || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-100 mb-4">
          <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Duplicate RTI Checker</h1>
        <HindiText as="p" className="text-gray-500">
          अपना RTI प्रश्न यहाँ पेस्ट करें — AI समान RTI ढूंढेगा
        </HindiText>
        <p className="text-sm text-gray-500 mt-1">
          Paste your RTI question in Hindi or English. AI will find semantically similar filings.
        </p>
      </div>

      {/* Input form */}
      <form onSubmit={handleCheck} className="card p-6 mb-6">
        <label className="section-label block mb-2">
          अपना RTI प्रश्न यहाँ लिखें (Hindi or English)
        </label>
        <textarea
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="उदाहरण: मनरेगा योजना के अंतर्गत पिछले 3 वर्षों में जिले में कुल कितने मजदूरों को रोजगार प्रदान किया गया और उन्हें कितनी मजदूरी का भुगतान किया गया?"
          className="input-field hindi-text resize-none mb-4 text-sm leading-relaxed"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Uses AI semantic search — works with Hindi and English queries
          </p>
          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="btn-primary"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Checking...
              </span>
            ) : (
              "Duplicate जांचें"
            )}
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Error: {error}
        </div>
      )}

      {/* Results */}
      {matches !== null && (
        <div>
          {matches.length === 0 ? (
            <div className="card p-8 text-center">
              <div className="text-3xl mb-3">✅</div>
              <h2 className="font-semibold text-gray-900 mb-1 hindi-text">
                कोई मिलती-जुलती RTI नहीं मिली
              </h2>
              <p className="text-sm text-gray-500 mb-5">
                No similar RTIs found. This appears to be unique — go ahead and file it!
              </p>
              <Link to="/upload" className="btn-primary inline-block">
                Upload this RTI
              </Link>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-yellow-500 text-lg">⚠️</span>
                <HindiText as="h2" className="font-semibold text-gray-900">
                  {matches.length} मिलती-जुलती RTI मिली
                </HindiText>
                <span className="text-sm text-gray-500">
                  — review before filing
                </span>
              </div>

              <div className="space-y-4">
                {matches.map((match, idx) => (
                  <Link
                    key={match.id}
                    to={`/rti/${match.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block card p-4 hover:border-saffron-300"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <StatusPill status={match.response_status} />
                          <span className="text-xs font-semibold text-purple-600">
                            {!isNaN(match.similarity) ? Math.round(match.similarity * 100) : "~"}% similar
                          </span>
                        </div>
                        <HindiText as="h3" className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">
                          {match.title || "Untitled RTI"}
                        </HindiText>
                        <HindiText as="p" className="text-xs text-gray-600 line-clamp-2">
                          {match.subject}
                        </HindiText>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
                          {match.department && <span>{match.department}</span>}
                          {match.state && <span>{match.state}</span>}
                          {match.date_filed && (
                            <span>
                              Filed: {new Date(match.date_filed).toLocaleDateString("en-IN", { year: "numeric", month: "short" })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Similarity bar */}
                      <div className="shrink-0 w-16 text-center">
                        <div className="relative h-16 w-16">
                          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                            <circle
                              cx="18"
                              cy="18"
                              r="15.9"
                              fill="none"
                              stroke={
                                (match.similarity || 0) > 0.85
                                  ? "#ef4444"
                                  : (match.similarity || 0) > 0.7
                                  ? "#f97316"
                                  : "#a78bfa"
                              }
                              strokeWidth="3"
                              strokeDasharray={`${(match.similarity || 0) * 100} 100`}
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
                            {Math.round((match.similarity || 0) * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    {match.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {match.tags.slice(0, 5).map((tag) => (
                          <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 hindi-text">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Even if similar RTIs exist, you can still file yours — the information might have changed, or you may be targeting a different department/district. You can also contribute responses to existing RTIs.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
