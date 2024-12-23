import React, { useCallback, useState } from "react";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export default function FileDropzone({ onFileSelected, file }) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");

  function validate(f) {
    if (!f) return "No file selected";
    if (f.type !== "application/pdf") return "Only PDF files are accepted";
    if (f.size > MAX_SIZE) return "File must be smaller than 10 MB";
    return null;
  }

  const handleFile = useCallback(
    (f) => {
      const err = validate(f);
      if (err) {
        setError(err);
        return;
      }
      setError("");
      onFileSelected(f);
    },
    [onFileSelected]
  );

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

  return (
    <div>
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
          dragOver
            ? "border-saffron-500 bg-saffron-50"
            : file
            ? "border-green-400 bg-green-50"
            : "border-gray-300 bg-gray-50 hover:bg-gray-100"
        }`}
      >
        {file ? (
          <div className="text-center px-4">
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-red-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">{file.name}</p>
            <p className="text-xs text-gray-500 mt-1">
              {(file.size / 1024).toFixed(1)} KB
            </p>
            <p className="text-xs text-green-600 mt-1">Click to change file</p>
          </div>
        ) : (
          <div className="text-center px-4">
            <svg
              className="w-10 h-10 mx-auto mb-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm font-medium text-gray-700 hindi-text">
              RTI दस्तावेज़ अपलोड करें
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PDF only, max 10 MB — drag & drop or click
            </p>
          </div>
        )}
        <input
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={onInputChange}
        />
      </label>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
