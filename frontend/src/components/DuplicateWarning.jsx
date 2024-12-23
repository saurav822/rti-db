import React, { useState } from "react";
import { Link } from "react-router-dom";
import HindiText from "./HindiText.jsx";

export default function DuplicateWarning({ duplicates = [] }) {
  const [expanded, setExpanded] = useState(false);

  if (!duplicates.length) return null;

  return (
    <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4">
      <div className="flex items-start gap-3">
        <span className="text-yellow-500 text-xl mt-0.5">⚠️</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-yellow-800 hindi-text">
            {duplicates.length} मिलती-जुलती RTI पहले से मौजूद है
          </p>
          <p className="text-xs text-yellow-700 mt-0.5">
            Similar RTIs already exist. Please review before submitting.
          </p>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="text-xs text-yellow-800 underline mt-1"
          >
            {expanded ? "Hide" : "देखें (View matches)"}
          </button>

          {expanded && (
            <ul className="mt-3 space-y-2">
              {duplicates.map((dup) => (
                <li key={dup.id} className="bg-white rounded-lg border border-yellow-200 p-3">
                  <Link
                    to={`/rti/${dup.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block hover:underline"
                  >
                    <HindiText as="p" className="text-sm font-medium text-gray-800 line-clamp-1">
                      {dup.title || "Untitled RTI"}
                    </HindiText>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{dup.department}</span>
                      <span>{dup.state}</span>
                      {dup.similarity && !isNaN(dup.similarity) && (
                        <span className="ml-auto font-medium text-yellow-700">
                          {Math.round(dup.similarity * 100)}% similar
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
