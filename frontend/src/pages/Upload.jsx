import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FileDropzone from "../components/FileDropzone.jsx";
import ParsedFieldForm from "../components/ParsedFieldForm.jsx";
import DuplicateWarning from "../components/DuplicateWarning.jsx";
import HindiText from "../components/HindiText.jsx";
import { uploadRTI } from "../lib/api.js";

const PROCESSING_STEPS = [
  { label: "📄 दस्तावेज़ पढ़ा जा रहा है...", en: "Reading document..." },
  { label: "🔍 Hindi/English पाठ पहचाना जा रहा है...", en: "Recognizing text..." },
  { label: "🧠 AI से जानकारी निकाली जा रही है...", en: "Extracting with AI..." },
  { label: "✅ विश्लेषण पूर्ण", en: "Analysis complete" },
];

const STEPS = ["Upload", "Processing", "Review", "Identity", "Submit"];

function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((label, idx) => (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                idx < currentStep
                  ? "bg-saffron-500 text-white"
                  : idx === currentStep
                  ? "bg-saffron-500 text-white ring-4 ring-saffron-100"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {idx < currentStep ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                idx + 1
              )}
            </div>
            <span className="text-xs mt-1 text-gray-500 hidden sm:block">{label}</span>
          </div>
          {idx < STEPS.length - 1 && (
            <div
              className={`h-0.5 w-8 sm:w-14 transition-colors ${
                idx < currentStep ? "bg-saffron-500" : "bg-gray-200"
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function Upload() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0=Upload 1=Processing 2=Review 3=Identity 4=Submit
  const [file, setFile] = useState(null);
  const [processingStep, setProcessingStep] = useState(0);
  const [parsedData, setParsedData] = useState({});
  const [parseError, setParseError] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [filerName, setFilerName] = useState("");
  const [filerEmail, setFilerEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedEntry, setSubmittedEntry] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);

  async function handleParseClick() {
    if (!file) return;
    setStep(1);
    setProcessingStep(0);

    // Animate processing steps
    const stepInterval = setInterval(() => {
      setProcessingStep((p) => {
        if (p >= PROCESSING_STEPS.length - 2) {
          clearInterval(stepInterval);
          return p;
        }
        return p + 1;
      });
    }, 1200);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("is_anonymous", "true");

      const result = await uploadRTI(formData);

      clearInterval(stepInterval);
      setProcessingStep(PROCESSING_STEPS.length - 1);

      if (result.parse_error) {
        setParseError(true);
        setFileUrl(result.file_url || null);
        // Jump directly to Review step with empty form
        setTimeout(() => setStep(2), 800);
        return;
      }

      if (result.entry) {
        // Full success — skip review, go to submit
        setSubmittedEntry(result.entry);
        setDuplicates(result.potential_duplicates || []);
        setTimeout(() => setStep(4), 800);
        return;
      }
    } catch (err) {
      clearInterval(stepInterval);
      setParseError(true);
      setTimeout(() => setStep(2), 800);
    }
  }

  async function handleSubmitWithIdentity() {
    if (!file) return;
    setSubmitting(true);
    setSubmitError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("is_anonymous", String(isAnonymous));
      if (!isAnonymous) {
        formData.append("filer_name", filerName);
        formData.append("filer_email", filerEmail);
      }

      const result = await uploadRTI(formData);

      if (result.entry) {
        setSubmittedEntry(result.entry);
        setDuplicates(result.potential_duplicates || []);
        setStep(4);
      } else if (result.parse_error) {
        setSubmitError(result.message || "Parsing failed. Please try again.");
      }
    } catch (err) {
      setSubmitError(err.message || "Upload failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // -------------------------------------------------------------------------
  // STEP 0: Upload
  // -------------------------------------------------------------------------
  if (step === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <StepIndicator currentStep={0} />
        <div className="card p-6">
          <h1 className="text-lg font-semibold text-gray-900 mb-1">
            Upload RTI Document
          </h1>
          <HindiText as="p" className="text-sm text-gray-500 mb-6">
            RTI दस्तावेज़ अपलोड करें — AI स्वचालित रूप से जानकारी निकालेगा
          </HindiText>
          <FileDropzone onFileSelected={setFile} file={file} />
          {file && (
            <div className="mt-6 flex justify-end">
              <button onClick={handleParseClick} className="btn-primary">
                Parse with AI →
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // STEP 1: Processing
  // -------------------------------------------------------------------------
  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <StepIndicator currentStep={1} />
        <div className="card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-saffron-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-saffron-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-900 mb-6">
            Gemini AI is reading your RTI document
          </h2>
          <ul className="space-y-3 text-left max-w-sm mx-auto">
            {PROCESSING_STEPS.map((ps, idx) => (
              <li
                key={idx}
                className={`flex items-center gap-3 text-sm transition-opacity duration-500 ${
                  idx <= processingStep ? "opacity-100" : "opacity-30"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    idx < processingStep
                      ? "border-green-500 bg-green-500"
                      : idx === processingStep
                      ? "border-saffron-500 animate-pulse"
                      : "border-gray-300"
                  }`}
                >
                  {idx < processingStep && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <HindiText>{ps.label}</HindiText>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // STEP 2: Review & Edit (manual if parse failed)
  // -------------------------------------------------------------------------
  if (step === 2) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <StepIndicator currentStep={2} />
        {parseError && (
          <div className="mb-4 rounded-lg border border-orange-300 bg-orange-50 p-4 text-sm text-orange-800 hindi-text">
            ⚠️ AI parsing could not complete. Please fill in the fields manually.
          </div>
        )}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">
            Review & Edit Parsed Fields
          </h2>
          <ParsedFieldForm data={parsedData} onChange={setParsedData} />
          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep(0)} className="btn-secondary">
              ← Back
            </button>
            <button onClick={() => setStep(3)} className="btn-primary">
              Continue →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // STEP 3: Identity
  // -------------------------------------------------------------------------
  if (step === 3) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <StepIndicator currentStep={3} />
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Identity</h2>

          {/* Anonymous toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 mb-5">
            <div>
              <HindiText as="p" className="text-sm font-medium text-gray-900">
                गुमनाम रहें (Stay Anonymous)
              </HindiText>
              <p className="text-xs text-gray-500">Your name won't be shown publicly</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAnonymous((a) => !a)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isAnonymous ? "bg-saffron-500" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isAnonymous ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {!isAnonymous && (
            <div className="space-y-4 mb-5">
              <div>
                <label className="section-label block mb-1">नाम (Name)</label>
                <input
                  type="text"
                  value={filerName}
                  onChange={(e) => setFilerName(e.target.value)}
                  className="input-field"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="section-label block mb-1">Email</label>
                <input
                  type="email"
                  value={filerEmail}
                  onChange={(e) => setFilerEmail(e.target.value)}
                  className="input-field"
                  placeholder="your@email.com"
                />
              </div>
            </div>
          )}

          {submitError && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {submitError}
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="btn-secondary">
              ← Back
            </button>
            <button
              onClick={handleSubmitWithIdentity}
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Uploading...
                </span>
              ) : (
                "Submit RTI →"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // STEP 4: Success
  // -------------------------------------------------------------------------
  if (step === 4) {
    const shareUrl = submittedEntry
      ? `${window.location.origin}/rti/${submittedEntry.id}`
      : window.location.origin;

    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <StepIndicator currentStep={4} />
        <div className="card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">RTI Submitted!</h2>
          <HindiText as="p" className="text-gray-500 mb-6">
            आपकी RTI सफलतापूर्वक अपलोड हो गई है।
          </HindiText>

          {duplicates.length > 0 && (
            <div className="mb-6 text-left">
              <DuplicateWarning duplicates={duplicates} />
            </div>
          )}

          {/* Shareable link */}
          <div className="bg-gray-50 rounded-lg border p-3 mb-6 flex items-center gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 bg-transparent text-sm text-gray-700 outline-none"
            />
            <button
              onClick={() => navigator.clipboard.writeText(shareUrl)}
              className="text-xs text-saffron-600 font-medium hover:text-saffron-700 shrink-0"
            >
              Copy
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {submittedEntry && (
              <Link
                to={`/rti/${submittedEntry.id}`}
                className="btn-primary"
              >
                View RTI
              </Link>
            )}
            <button
              onClick={() => {
                setStep(0);
                setFile(null);
                setParsedData({});
                setParseError(false);
                setDuplicates([]);
                setSubmittedEntry(null);
              }}
              className="btn-secondary"
            >
              Upload Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
