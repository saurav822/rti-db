import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FileDropzone from "../components/FileDropzone.jsx";
import ParsedFieldForm from "../components/ParsedFieldForm.jsx";
import DuplicateWarning from "../components/DuplicateWarning.jsx";
import HindiText from "../components/HindiText.jsx";
import PDFRedactor from "../components/PDFRedactor.jsx";
import { parseRTI, submitRTI } from "../lib/api.js";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useT } from "../lib/i18n.js";

const PROCESSING_STEPS = [
  {
    hi: "दस्तावेज़ पढ़ा जा रहा है...",
    en: "Reading document...",
    iconPath: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    hi: "Hindi/English पाठ पहचाना जा रहा है...",
    en: "Recognising Hindi/English text...",
    iconPath: "M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z",
  },
  {
    hi: "AI से जानकारी निकाली जा रही है...",
    en: "Extracting information with AI...",
    iconPath: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  {
    hi: "विश्लेषण पूर्ण",
    en: "Analysis complete",
    iconPath: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  },
];

function StepIndicator({ currentStep, steps }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((label, idx) => (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all"
              style={
                idx < currentStep
                  ? { background: "var(--accent)", color: "#fff" }
                  : idx === currentStep
                  ? { background: "var(--accent)", color: "#fff", boxShadow: "0 0 0 4px var(--accent-glass)" }
                  : { background: "var(--surface)", color: "var(--ink-4)", border: "1px solid var(--rule-strong)" }
              }
            >
              {idx < currentStep ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                idx + 1
              )}
            </div>
            <span className="text-xs mt-1 hidden sm:block mono-text" style={{ color: "var(--ink-4)" }}>{label}</span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className="h-0.5 w-8 sm:w-14 transition-colors"
              style={{ background: idx < currentStep ? "var(--accent)" : "var(--rule-strong)" }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function Upload() {
  const navigate = useNavigate();
  const { user, signIn } = useAuth();
  const { lang } = useLanguage();
  const t = useT(lang);

  const STEPS = [
    t("upload_step_0"),
    t("upload_step_1"),
    t("upload_step_2"),
    t("upload_step_3"),
    t("upload_step_4"),
  ];

  const [step, setStep] = useState(0);
  const [isRedacting, setIsRedacting] = useState(false);
  const [file, setFile] = useState(null);
  const [processingStep, setProcessingStep] = useState(0);
  const [parsedData, setParsedData] = useState({});
  const [parseError, setParseError] = useState(false);
  const [fileKey, setFileKey] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [keepPdf, setKeepPdf] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedEntry, setSubmittedEntry] = useState(null);

  // STEP 0 → 1: Upload file and parse with AI
  async function handleParseClick(fileOverride) {
    const fileToUse = fileOverride !== undefined ? fileOverride : file;
    if (!fileToUse) return;

    // Require login to upload
    if (!user) {
      await signIn();
      return;
    }

    setIsRedacting(false);
    setStep(1);
    setProcessingStep(0);

    const stepInterval = setInterval(() => {
      setProcessingStep((p) => {
        if (p >= PROCESSING_STEPS.length - 2) { clearInterval(stepInterval); return p; }
        return p + 1;
      });
    }, 1200);

    try {
      const formData = new FormData();
      formData.append("file", fileToUse);

      const result = await parseRTI(formData);

      clearInterval(stepInterval);
      setProcessingStep(PROCESSING_STEPS.length - 1);

      setFileKey(result.file_key || null);
      setFileUrl(result.file_url || null);

      if (result.parse_error) {
        setParseError(true);
        setParsedData({});
      } else {
        setParseError(false);
        setParsedData(result.parsed || {});
      }

      setTimeout(() => setStep(2), 600);
    } catch (err) {
      clearInterval(stepInterval);
      setParseError(true);
      setParsedData({});
      setTimeout(() => setStep(2), 600);
    }
  }

  // STEP 3 → 4: Submit confirmed data to DB
  async function handleSubmit() {
    if (!fileKey) return;
    setSubmitting(true);
    setSubmitError("");

    try {
      let token = null;
      if (user) {
        const { data } = await supabase.auth.getSession();
        token = data?.session?.access_token || null;
      }

      const result = await submitRTI({
        file_key: fileKey,
        keep_pdf: keepPdf,
        is_anonymous: isAnonymous,
        uploaded_by: user?.id || null,
        filer_name: isAnonymous ? null : (user?.user_metadata?.full_name || user?.email || null),
        ...parsedData,
      }, token);

      if (result.entry) {
        setSubmittedEntry(result.entry);
        setDuplicates(result.potential_duplicates || []);
        setStep(4);
      } else {
        setSubmitError(result.error || "Submission failed. Please try again.");
      }
    } catch (err) {
      setSubmitError(err.message || "Upload failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // -------------------------------------------------------------------------
  // STEP 0: Upload (+ optional redact sub-step)
  // -------------------------------------------------------------------------
  if (step === 0) {
    // Show the PDF masking screen
    if (isRedacting && file) {
      return (
        <div className="max-w-4xl mx-auto px-4 py-10">
          <StepIndicator currentStep={0} steps={STEPS} />
          <PDFRedactor
            file={file}
            t={t}
            mandatory={isAnonymous}
            onSave={(redactedFile) => {
              setFile(redactedFile);
              handleParseClick(redactedFile);
            }}
            onSkip={() => handleParseClick(file)}
          />
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <StepIndicator currentStep={0} steps={STEPS} />
        <div className="card p-6">
          <h1 className="text-lg font-semibold text-[var(--ink)] mb-1">{t("upload_title")}</h1>
          <p className="text-sm text-[var(--ink-3)] mb-4">{t("upload_subtitle")}</p>

          <FileDropzone onFileSelected={setFile} file={file} />

          {/* Anonymous toggle */}
          <div
            className="mt-4 flex items-center justify-between p-4 rounded-[var(--r-md)]"
            style={{ border: "1px solid var(--rule-strong)", background: "var(--surface)" }}
          >
            <div>
              <p className="text-sm font-medium text-[var(--ink)]">{t("upload_anonymous")}</p>
              <p className="text-xs text-[var(--ink-3)] mt-0.5 hindi-text">{t("upload_anonymous_desc")}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAnonymous((a) => !a)}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0"
              style={{ background: isAnonymous ? "var(--accent)" : "var(--rule-strong)" }}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAnonymous ? "translate-x-6" : "translate-x-1"}`}
              />
            </button>
          </div>

          {/* Anonymous reminder */}
          {isAnonymous && file && (
            <div
              className="mt-3 flex items-start gap-2 rounded-[var(--r-sm)] px-3 py-2.5 text-xs hindi-text"
              style={{ border: "1px solid rgba(139,94,0,0.30)", background: "var(--amber-bg)", color: "var(--amber)" }}
            >
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--amber)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>{t("upload_redact_required")}</span>
            </div>
          )}

          {file && (
            <div className="mt-5 flex items-center justify-between gap-3">
              {/* Optional masking button — only show when NOT anonymous (anonymous forces it) */}
              {!isAnonymous && (
                <button
                  onClick={async () => {
                    if (!user) { await signIn(); return; }
                    setIsRedacting(true);
                  }}
                  className="btn-secondary hindi-text text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  {t("upload_redact_btn")}
                </button>
              )}
              <button
                onClick={async () => {
                  if (!user) { await signIn(); return; }
                  if (isAnonymous) {
                    setIsRedacting(true);
                  } else {
                    handleParseClick();
                  }
                }}
                className={`btn-primary hindi-text flex items-center gap-2 ${!isAnonymous ? "" : "w-full"}`}
              >
                {isAnonymous ? (
                  <>
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    {t("upload_redact_btn")}
                  </>
                ) : t("upload_parse_btn")}
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
        <StepIndicator currentStep={1} steps={STEPS} />
        <div className="card p-8 text-center">
          <div
            className="w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center"
            style={{ background: "var(--accent-glass)" }}
          >
            <svg className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-[var(--ink)] mb-6">{t("upload_processing")}</h2>
          <ul className="space-y-3 text-left max-w-sm mx-auto">
            {PROCESSING_STEPS.map((ps, idx) => (
              <li
                key={idx}
                className={`flex items-center gap-3 text-sm transition-opacity duration-500 ${idx <= processingStep ? "opacity-100" : "opacity-30"}`}
              >
                <span
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                  style={
                    idx < processingStep
                      ? { borderColor: "var(--green)", background: "var(--green)" }
                      : idx === processingStep
                      ? { borderColor: "var(--accent)", animation: "pulse 2s infinite" }
                      : { borderColor: "var(--rule-strong)" }
                  }
                >
                  {idx < processingStep && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <svg
                  className="w-4 h-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{ color: idx <= processingStep ? "var(--accent)" : "var(--ink-4)" }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={ps.iconPath} />
                </svg>
                <HindiText>{lang === "hi" ? ps.hi : ps.en}</HindiText>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // STEP 2: Review — ALWAYS shown (even on success)
  // -------------------------------------------------------------------------
  if (step === 2) {
    const blankFields = ["department", "subject"].filter((f) => !parsedData[f]);

    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <StepIndicator currentStep={2} steps={STEPS} />

        {parseError && (
          <div
            className="mb-4 rounded-[var(--r-sm)] p-4 text-sm hindi-text"
            style={{ border: "1px solid rgba(139,94,0,0.40)", background: "var(--amber-bg)", color: "var(--amber)" }}
          >
            <p className="mb-3">⚠️ {t("upload_parse_failed")}</p>
            <button
              onClick={handleParseClick}
              className="btn-primary inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t("upload_retry_ai")}
            </button>
          </div>
        )}

        {blankFields.length > 0 && !parseError && (
          <div
            className="mb-4 rounded-[var(--r-sm)] p-3 text-sm"
            style={{ border: "1px solid rgba(139,94,0,0.25)", background: "var(--amber-bg)", color: "var(--amber)" }}
          >
            ✏️ {t("upload_blank_fields", { fields: blankFields.join(", ") })}
          </div>
        )}

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-[var(--ink)] mb-1">{t("upload_review_title")}</h2>
          <p className="text-sm text-[var(--ink-3)] mb-5">{t("upload_review_subtitle")}</p>
          <ParsedFieldForm data={parsedData} onChange={setParsedData} />
          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep(0)} className="btn-secondary">{t("upload_back")}</button>
            <button onClick={() => setStep(3)} className="btn-primary">{t("upload_confirm_btn")}</button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // STEP 3: Identity — keep PDF toggle
  // -------------------------------------------------------------------------
  if (step === 3) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <StepIndicator currentStep={3} steps={STEPS} />
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-[var(--ink)] mb-5">{t("upload_identity_title")}</h2>

          {/* Keep PDF toggle */}
          <div
            className="flex items-start justify-between p-4 rounded-[var(--r-md)] mb-5"
            style={{ border: "1px solid var(--rule-strong)" }}
          >
            <div className="flex-1 mr-4">
              <p className="text-sm font-medium text-[var(--ink)]">{t("upload_keep_pdf")}</p>
              <p className="text-xs text-[var(--ink-3)] mt-0.5 hindi-text">{t("upload_keep_pdf_desc")}</p>
            </div>
            <button
              type="button"
              onClick={() => setKeepPdf((k) => !k)}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0"
              style={{ background: keepPdf ? "var(--accent)" : "var(--rule-strong)" }}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${keepPdf ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {/* Summary */}
          <div
            className="rounded-[var(--r-sm)] p-4 mb-5 space-y-2 text-sm"
            style={{ background: "var(--surface)", border: "1px solid var(--rule)" }}
          >
            <div className="flex justify-between">
              <span className="section-label">{t("upload_identity_label")}</span>
              <span className="font-medium text-[var(--ink)]">{isAnonymous ? t("detail_anonymous") : user?.user_metadata?.full_name || user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="section-label">{t("upload_pdf_stored_label")}</span>
              <span className="font-medium text-[var(--ink)]">{keepPdf ? t("upload_pdf_yes") : t("upload_pdf_no")}</span>
            </div>
            <div className="flex justify-between">
              <span className="section-label">{t("upload_dept_label")}</span>
              <span className="font-medium text-[var(--ink)] hindi-text truncate ml-4">{parsedData.department || "—"}</span>
            </div>
          </div>

          {submitError && (
            <div
              className="mb-4 text-sm rounded-[var(--r-sm)] p-3"
              style={{ color: "var(--red)", background: "var(--red-bg)", border: "1px solid rgba(155,44,44,0.25)" }}
            >
              {submitError}
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="btn-secondary">{t("upload_back")}</button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t("upload_uploading")}
                </span>
              ) : t("upload_submit_btn")}
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
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <StepIndicator currentStep={4} steps={STEPS} />
        <div className="card p-8 text-center">
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: "var(--green-bg)" }}
          >
            <svg className="w-8 h-8" style={{ color: "var(--green)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[var(--ink)] mb-1">{t("upload_success_title")}</h2>
          <HindiText as="p" className="text-[var(--ink-3)] mb-6">{t("upload_success_subtitle")}</HindiText>

          {duplicates.length > 0 && (
            <div className="mb-6 text-left">
              <DuplicateWarning duplicates={duplicates} />
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-3">
            {submittedEntry && (
              <Link to={`/rti/${submittedEntry.id}`} className="btn-primary">{t("upload_view_rti")}</Link>
            )}
            <button
              onClick={() => {
                setStep(0); setFile(null); setParsedData({}); setParseError(false);
                setDuplicates([]); setSubmittedEntry(null); setFileKey(null);
              }}
              className="btn-secondary"
            >
              {t("upload_upload_another")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
