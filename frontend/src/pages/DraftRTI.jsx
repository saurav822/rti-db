import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useT } from "../lib/i18n.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import {
  getRTIClarifyingQuestions,
  generateRTIDraftAPI,
  saveRTIDraft,
  updateRTIDraft,
  getRTIDraftById,
  uploadFiledRTIPDF,
  generateRTIShareCard,
  triggerAutofill,
  continueAutofill,
  triggerAutofetch,
  continueAutofetch,
  removeFiledPDF,
  getRTIAuthorities,
  API_BASE,
  LOCAL_RUNNER_KEY,
} from "../lib/api.js";

// ── Icons ─────────────────────────────────────────────────────────────────

function Spinner({ className = "w-5 h-5", style }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24" style={style}>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--ink-4)" }}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }
}

function countWords(str) {
  return str ? str.trim().split(/\s+/).filter(Boolean).length : 0;
}

function buildApplicantBlock(template, { name, phone, address, state, pincode }) {
  if (!template) return "";
  let block = template;
  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
  if (name) block = block.replace("[Your Full Name]", name);
  if (address) {
    let fullAddress = address;
    if (state) fullAddress += `, ${state}`;
    if (pincode) fullAddress += ` - ${pincode}`;
    block = block
      .replace("[Complete Postal Address]", fullAddress)
      .replace("[Complete Address]", fullAddress)
      .replace("[City - PIN Code]", pincode || "")
      .replace("[City, State - PIN Code]", "");
  }
  if (phone) block = block.replace("[Phone Number]", phone);
  block = block.replace("[DD/MM/YYYY]", today);
  return block.replace(/\n{3,}/g, "\n\n").trim();
}

// ── Sub-components ────────────────────────────────────────────────────────

function CopyBtn({ text, field, copiedField, onCopy, label, t }) {
  const copied = copiedField === field;
  return (
    <button
      onClick={() => onCopy(text, field)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--r-sm)] text-xs font-medium transition-all shrink-0"
      style={copied
        ? { background: "var(--green-bg)", color: "var(--green)", border: "1px solid rgba(74,122,58,0.3)" }
        : { background: "var(--glass)", border: "1px solid var(--rule-strong)", color: "var(--ink-3)" }
      }
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      {label || (copied ? t("file_copied") : t("file_copy"))}
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function DraftRTI() {
  const { lang } = useLanguage();
  const t = useT(lang);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialQuery = searchParams.get("q") || "";
  const existingId = searchParams.get("id") || null;

  // Phase: idle | loading_questions | asking | loading_draft | reviewing | final | loading_saved
  const startPhase = existingId ? "loading_saved" : initialQuery ? "loading_questions" : "idle";

  const [text, setText] = useState(initialQuery);
  const [draftPhase, setDraftPhase] = useState(startPhase);
  const [clarifyingQs, setClarifyingQs] = useState([]);
  const [answers, setAnswers] = useState({});
  const [draftLang, setDraftLang] = useState("en");
  const [draft, setDraft] = useState(null);
  const [authority, setAuthority] = useState(null);
  const [allMinistries, setAllMinistries] = useState([]);
  const [authorityIsManual, setAuthorityIsManual] = useState(false);
  const [overrideMinistryId, setOverrideMinistryId] = useState("");
  const [editedSubject, setEditedSubject] = useState("");
  const [editedInfoSought, setEditedInfoSought] = useState("");
  const [editedFullApp, setEditedFullApp] = useState("");
  const [editedApplicant, setEditedApplicant] = useState("");
  const [savedDraftId, setSavedDraftId] = useState(existingId);
  const [applicant, setApplicant] = useState({ name: "", phone: "", gender: "", state: "", pincode: "", address: "" });
  const [copiedField, setCopiedField] = useState(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [showApplicantForm, setShowApplicantForm] = useState(false);
  const [uploadingPDF, setUploadingPDF] = useState(false);
  const [filedPdfUrl, setFiledPdfUrl] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [generatingCard, setGeneratingCard] = useState(false);
  const [shareCardUrl, setShareCardUrl] = useState(null);
  const [includeCard, setIncludeCard] = useState(true);
  const [useCaptchaAI, setUseCaptchaAI] = useState(true);
  const [autoFillLaunching, setAutoFillLaunching] = useState(false);
  const [autoFillError, setAutoFillError] = useState("");
  const [autoFetchLaunching, setAutoFetchLaunching] = useState(false);
  const [autoFetchError, setAutoFetchError] = useState("");
  const [autofetchLogs, setAutofetchLogs] = useState([]);
  const [autofetchPaused, setAutofetchPaused] = useState(null);
  const [autofetchDone, setAutofetchDone] = useState(false);
  const [streamSource, setStreamSource] = useState(null); // "autofill" | "autofetch"
  const [autofillLogs, setAutofillLogs] = useState([]);
  const [autofillPaused, setAutofillPaused] = useState(null);
  const [autofillDone, setAutofillDone] = useState(false);
  const [localRunnerUrl, setLocalRunnerUrl] = useState(() => localStorage.getItem(LOCAL_RUNNER_KEY) || "");
  const [localRunnerInput, setLocalRunnerInput] = useState(() => localStorage.getItem(LOCAL_RUNNER_KEY) || "");
  const fileInputRef = useRef(null);
  const esRef = useRef(null);
  const logRef = useRef(null);

  // Auth gate — wait for auth to resolve before redirecting
  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading]);

  // Auto-start clarifying questions from ?q=
  useEffect(() => {
    if (initialQuery && !existingId) {
      startClarifying(initialQuery);
    }
  }, []);

  // Load existing draft from ?id=
  useEffect(() => {
    if (!existingId) return;
    getRTIDraftById(existingId)
      .then((d) => {
        if (!d) { setDraftPhase("idle"); return; }
        setEditedSubject(d.draft_subject || "");
        setEditedInfoSought(d.draft_information_sought || "");
        setEditedFullApp(d.draft_body || "");
        setEditedApplicant(buildApplicantBlock(d.draft_applicant || "", {
          name: d.applicant_name || "",
          phone: d.applicant_phone || "",
          gender: d.applicant_gender || "",
          state: d.applicant_state || "",
          pincode: d.applicant_pincode || "",
          address: d.applicant_address || "",
        }));
        setFiledPdfUrl(d.filed_pdf_url || null);
        setShareCardUrl(d.share_card_url || null);
        if (d.ministry_id) {
          setAuthority({
            ministry_id: d.ministry_id,
            ministry_label: d.ministry_label,
            authority_id: d.authority_id,
            authority_label: d.authority_label,
          });
        }
        setApplicant({
          name: d.applicant_name || "",
          phone: d.applicant_phone || "",
          gender: d.applicant_gender || "",
          state: d.applicant_state || "",
          pincode: d.applicant_pincode || "",
          address: d.applicant_address || "",
        });
        // Minimal draft object for portal display
        setDraft({
          department: d.detected_dept,
          detected_state: d.detected_state,
          portal: d.portal_url ? { portal_url: d.portal_url, is_verified: false } : null,
          tip: null,
          applicant_block: d.draft_applicant || "",
        });
        setDraftPhase("final");
      })
      .catch(() => setDraftPhase("idle"));
  }, [existingId]);

  // Auto-scroll terminal log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [autofillLogs]);

  // Load ministry/authority list when reviewing a Central Govt RTI
  useEffect(() => {
    if (
      draftPhase === "reviewing" &&
      draft?.detected_state === "Central Government" &&
      allMinistries.length === 0
    ) {
      getRTIAuthorities().then(setAllMinistries).catch(() => {});
    }
  }, [draftPhase, draft?.detected_state]);

  // Once ministries load, seed overrideMinistryId from the AI-suggested authority
  useEffect(() => {
    if (allMinistries.length > 0 && authority?.ministry_id && !overrideMinistryId) {
      setOverrideMinistryId(authority.ministry_id);
    }
  }, [allMinistries.length, authority?.ministry_id]);

  // Cleanup SSE on unmount
  useEffect(() => () => {
    if (esRef.current) esRef.current.close();
    if (fetchEsRef.current) fetchEsRef.current.close();
  }, []);

  async function startClarifying(query) {
    setDraftPhase("loading_questions");
    setDraftError("");
    try {
      const result = await getRTIClarifyingQuestions(query.trim());
      if (result.quota_exceeded) {
        setDraftError(result.message);
        setDraftPhase("idle");
        return;
      }
      setClarifyingQs(result.questions || []);
      setDraftLang(result.language || "en");
      setAnswers({});
      setDraftPhase("asking");
    } catch {
      setDraftError(t("file_error_questions"));
      setDraftPhase("asking");
      setClarifyingQs([]);
    }
  }

  async function handleGenerateDraft() {
    setDraftPhase("loading_draft");
    setDraftError("");
    try {
      const clarifications = clarifyingQs.map((q, i) => ({ question: q, answer: answers[i] || "" }));
      const result = await generateRTIDraftAPI(text.trim(), clarifications, draftLang);
      if (result.quota_exceeded) {
        setDraftError(result.message);
        setDraftPhase("asking");
        return;
      }
      setDraft(result);
      setAuthority(result.authority || null);
      setEditedSubject(result.subject || "");
      setEditedInfoSought(result.information_sought || "");
      setEditedFullApp(result.full_application || "");
      setDraftPhase("reviewing");
    } catch {
      setDraftError(t("file_error_draft"));
      setDraftPhase("asking");
    }
  }

  function handleApproveDraft() {
    setEditedApplicant(buildApplicantBlock(draft?.applicant_block || "", applicant));
    setDraftPhase("final");
    handleSaveDraft(false);
  }

  async function handleSaveDraft(showFeedback = true) {
    if (!draft) return;
    try {
      const clarifications = clarifyingQs.map((q, i) => ({ question: q, answer: answers[i] || "" }));
      const result = await saveRTIDraft({
        user_id: user?.id || null,
        original_query: text.trim(),
        clarifications,
        draft_subject: editedSubject,
        draft_information_sought: editedInfoSought,
        draft_body: editedFullApp,
        draft_applicant: draft.applicant_block,
        applicant_name: applicant.name || null,
        applicant_phone: applicant.phone || null,
        applicant_gender: applicant.gender || null,
        applicant_state: applicant.state || null,
        applicant_pincode: applicant.pincode || null,
        applicant_address: applicant.address || null,
        detected_state: draft.detected_state,
        detected_dept: draft.department,
        portal_url: draft.portal?.portal_url || null,
        language: draftLang,
        ministry_id: authority?.ministry_id || null,
        ministry_label: authority?.ministry_label || null,
        authority_id: authority?.authority_id || null,
        authority_label: authority?.authority_label || null,
      });
      if (result?.id) {
        setSavedDraftId(result.id);
        // Replace ?q= with ?id= so a page reload (e.g. after autofetch) loads
        // the saved draft instead of restarting the clarifying-questions flow.
        window.history.replaceState(null, "", `/draft-rti?id=${result.id}`);
      }
      if (showFeedback) {
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 3000);
      }
    } catch (err) {
      console.error("Save draft failed:", err);
    }
  }

  async function handleUpdateDraft() {
    if (!savedDraftId) { handleSaveDraft(true); return; }
    try {
      await updateRTIDraft(savedDraftId, {
        draft_subject: editedSubject,
        draft_information_sought: editedInfoSought,
        draft_body: editedFullApp,
        draft_applicant: editedApplicant,
        applicant_name: applicant.name || null,
        applicant_phone: applicant.phone || null,
        applicant_gender: applicant.gender || null,
        applicant_state: applicant.state || null,
        applicant_pincode: applicant.pincode || null,
        applicant_address: applicant.address || null,
      });
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 3000);
    } catch (err) {
      console.error("Update draft failed:", err);
    }
  }

  function connectAutofillStream(draftId) {
    if (esRef.current) esRef.current.close();
    const streamBase = localRunnerUrl || API_BASE;
    const es = new EventSource(`${streamBase}/file-rti/drafts/${draftId}/autofill/stream`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "log") {
        setAutofillLogs(prev => [...prev, { kind: "log", text: data.text }]);
      } else if (data.type === "pause") {
        setAutofillPaused(data.prompt);
        setAutofillLogs(prev => [...prev, { kind: "pause", text: `👤 ${data.prompt}` }]);
      } else if (data.type === "done") {
        setAutofillPaused(null);
        setAutofillDone(true);
        setAutofillLogs(prev => [...prev, { kind: "done", text: data.code === 0 ? "✓ Script completed." : `Script exited (code ${data.code})` }]);
        es.close();
      } else if (data.type === "error") {
        setAutofillLogs(prev => [...prev, { kind: "log", text: data.text }]);
      }
    };
    es.onerror = () => es.close();
    esRef.current = es;
  }

  async function handleAutoFill() {
    if (!savedDraftId) return;
    setAutoFillLaunching(true);
    setAutoFillError("");
    setAutofillLogs([]);
    setAutofillPaused(null);
    setAutofillDone(false);
    try {
      await triggerAutofill(savedDraftId, useCaptchaAI, user?.email || "");
      setStreamSource("autofill");
      connectAutofillStream(savedDraftId);
    } catch (err) {
      setAutoFillError(err.message || "Failed to launch autofill script");
    } finally {
      setAutoFillLaunching(false);
    }
  }

  const fetchEsRef = useRef(null);

  function connectAutofetchStream(draftId) {
    if (fetchEsRef.current) fetchEsRef.current.close();
    const streamBase = localRunnerUrl || API_BASE;
    const es = new EventSource(`${streamBase}/file-rti/drafts/${draftId}/autofetch/stream`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "log") {
        setAutofetchLogs(prev => [...prev, { kind: "log", text: data.text }]);
      } else if (data.type === "pause") {
        setAutofetchPaused(data.prompt);
        setAutofetchLogs(prev => [...prev, { kind: "pause", text: `👤 ${data.prompt}` }]);
      } else if (data.type === "done") {
        setAutofetchPaused(null);
        setAutofetchDone(true);
        setAutofetchLogs(prev => [...prev, { kind: "done", text: data.code === 0 ? "✓ PDF fetched and uploaded." : `Script exited (code ${data.code})` }]);
        es.close();
        if (data.code === 0) window.location.reload();
      } else if (data.type === "error") {
        setAutofetchLogs(prev => [...prev, { kind: "log", text: data.text }]);
      }
    };
    es.onerror = () => {
      es.close();
      // If connection drops while we're waiting for a human checkpoint, clear
      // the paused state so the Continue button disappears rather than looping.
      setAutofetchPaused(prev => {
        if (prev) {
          setAutofetchLogs(l => [...l, { kind: "log", text: "  ⚠ Connection lost — script may have exited. Relaunch to retry." }]);
        }
        return null;
      });
    };
    fetchEsRef.current = es;
  }

  async function handleAutoFetch() {
    if (!savedDraftId) return;
    setAutoFetchLaunching(true);
    setAutoFetchError("");
    setAutofetchLogs([]);
    setAutofetchPaused(null);
    setAutofetchDone(false);
    try {
      await triggerAutofetch(savedDraftId, useCaptchaAI, user?.email || "");
      setStreamSource("autofetch");
      connectAutofetchStream(savedDraftId);
    } catch (err) {
      setAutoFetchError(err.message || "Failed to launch autofetch script");
    } finally {
      setAutoFetchLaunching(false);
    }
  }

  async function handleContinue() {
    if (!savedDraftId) return;
    try {
      if (streamSource === "autofetch") {
        await continueAutofetch(savedDraftId);
      } else {
        await continueAutofill(savedDraftId);
      }
      setAutofillPaused(null);
      setAutofillLogs(prev => [...prev, { kind: "log", text: "  ▶ Continuing…" }]);
    } catch {}
  }

  async function handlePDFUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !savedDraftId) return;
    setUploadingPDF(true);
    setUploadError("");
    try {
      const result = await uploadFiledRTIPDF(savedDraftId, file);
      setFiledPdfUrl(result.url);
    } catch {
      setUploadError(lang === "hi" ? "अपलोड विफल। पुनः प्रयास करें।" : "Upload failed. Please try again.");
    } finally {
      setUploadingPDF(false);
    }
  }

  async function handleGenerateCard() {
    if (!savedDraftId) return;
    setGeneratingCard(true);
    try {
      const result = await generateRTIShareCard(savedDraftId);
      setShareCardUrl(result.url);
      setIncludeCard(true);
    } catch {
      // silently fail — user can retry
    } finally {
      setGeneratingCard(false);
    }
  }

  function sendToWhatsApp() {
    const digits = (applicant.phone || "").replace(/\D/g, "");
    const waPhone = digits.length === 10 ? `91${digits}` : digits;

    const dept = draft?.department || "";
    const state = draft?.detected_state || "";
    const fileRtiUrl = `${window.location.origin}/file-rti`;
    const filedDate = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

    const cardLine = (includeCard && shareCardUrl)
      ? draftLang === "hi"
        ? `\n\n*दूसरों को भी पूछने की प्रेरणा दें — अपनी RTI कहानी शेयर करें:*\n${shareCardUrl}`
        : `\n\n*Inspire others to ask — share your RTI story:*\n${shareCardUrl}`
      : "";

    const message = draftLang === "hi"
      ? `*RTI दाखिल कर दी गई!*\n\n_सूचना का अधिकार अधिनियम, 2005 के तहत आपकी ओर से RTI दाखिल की गई है।_\n\n*विभाग:* ${dept}${state ? ` (${state})` : ""}\n*विषय:* ${editedSubject}\n*दिनांक:* ${filedDate}\n\n*आपकी दाखिल RTI यहाँ देखें:*\n${filedPdfUrl}${cardLine}\n\n*खुद RTI दाखिल करना चाहते हैं?*\n${fileRtiUrl}\n\n_#RTI #SachJannaHaHamara_`
      : `*Your RTI has been filed!*\n\n_An RTI was filed on your behalf under the Right to Information Act, 2005._\n\n*Department:* ${dept}${state ? ` (${state})` : ""}\n*Subject:* ${editedSubject}\n*Filed on:* ${filedDate}\n\n*View your filed RTI here:*\n${filedPdfUrl}${cardLine}\n\n*Want to file your own RTI?*\n${fileRtiUrl}\n\n_#RTI #ActiveDemocracy_`;

    const url = waPhone
      ? `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleStartOver() {
    setDraftPhase("idle");
    setClarifyingQs([]);
    setAnswers({});
    setDraft(null);
    setEditedSubject("");
    setEditedInfoSought("");
    setEditedFullApp("");
    setEditedApplicant("");
    setSavedDraftId(null);
    setApplicant({ name: "", phone: "", gender: "", state: "", pincode: "", address: "" });
    setCopiedField(null);
    setDraftSaved(false);
    setDraftError("");
    setShowApplicantForm(false);
    setAutoFillError("");
    setAutofillLogs([]);
    setAutofillPaused(null);
    setAutofillDone(false);
    setFiledPdfUrl(null);
    setUploadError("");
    setShareCardUrl(null);
    setIncludeCard(true);
    setAuthorityIsManual(false);
    setOverrideMinistryId("");
  }

  async function copyToClipboard(txt, field) {
    await copyText(txt);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">

      {/* Back + header */}
      <div className="mb-7">
        <Link
          to="/file-rti"
          className="inline-flex items-center gap-1.5 text-xs font-medium mb-4 transition-opacity hover:opacity-70"
          style={{ color: "var(--ink-3)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          {lang === "hi" ? "वापस" : "Back to File RTI"}
        </Link>

        <div className="relative text-center">
          <div
            className="absolute inset-x-0 top-0 h-24 pointer-events-none -mt-8"
            style={{ background: "radial-gradient(ellipse 60% 80% at 50% 0%, var(--accent-glass), transparent)" }}
          />
          <h1 className="text-2xl font-semibold text-[var(--ink)] mb-1 relative" style={{ letterSpacing: "-0.5px" }}>
            {lang === "hi" ? "RTI मसौदा तैयार करें" : "Draft RTI Application"}
          </h1>
          <p className="text-sm hindi-text relative" style={{ color: "var(--ink-3)" }}>
            {lang === "hi" ? "AI की मदद से पूर्ण RTI आवेदन बनाएं" : "AI-assisted RTI application in minutes"}
          </p>
        </div>
      </div>

      {/* Query chip (visible once past idle) */}
      {text && draftPhase !== "idle" && (
        <div
          className="rounded-[var(--r-sm)] px-4 py-2.5 mb-5 text-sm hindi-text"
          style={{ background: "var(--glass)", border: "1px solid var(--rule-strong)", color: "var(--ink-3)" }}
        >
          <span className="section-label mr-2">{lang === "hi" ? "आपकी क्वेरी:" : "Query:"}</span>
          <span className="text-[var(--ink)]">{text}</span>
        </div>
      )}

      {/* ── IDLE: text area entry ── */}
      {draftPhase === "idle" && (
        <div className="card p-6 space-y-4">
          <div>
            <label className="section-label block mb-2 hindi-text">
              {lang === "hi" ? "आप क्या जानकारी माँगना चाहते हैं?" : "What information do you want to request?"}
            </label>
            <textarea
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={lang === "hi" ? "उदाहरण: मैं जानना चाहता हूँ कि हमारे जिले में MGNREGA के तहत कितने लोगों को रोजगार दिया गया..." : "E.g., I want to know how many people were employed under MGNREGA in our district..."}
              className="input-field hindi-text text-sm leading-relaxed w-full resize-y"
              autoFocus
            />
          </div>
          {draftError && (
            <p className="text-xs hindi-text" style={{ color: "var(--red)" }}>{draftError}</p>
          )}
          <button
            onClick={() => startClarifying(text)}
            disabled={text.trim().length < 20}
            className="btn-primary w-full py-3"
          >
            {lang === "hi" ? "मसौदा तैयार करें →" : "Start Drafting →"}
          </button>
        </div>
      )}

      {/* ── LOADING QUESTIONS ── */}
      {draftPhase === "loading_questions" && (
        <div className="card p-12 text-center">
          <Spinner className="w-8 h-8 mx-auto mb-4" style={{ color: "var(--accent)" }} />
          <p className="hindi-text font-medium text-[var(--ink-2)]">{t("file_loading_questions")}</p>
        </div>
      )}

      {/* ── LOADING SAVED DRAFT ── */}
      {draftPhase === "loading_saved" && (
        <div className="card p-12 text-center">
          <Spinner className="w-8 h-8 mx-auto mb-4" style={{ color: "var(--accent)" }} />
          <p className="hindi-text font-medium text-[var(--ink-2)]">
            {lang === "hi" ? "मसौदा लोड हो रहा है…" : "Loading draft…"}
          </p>
        </div>
      )}

      {/* ── ASKING clarifying questions ── */}
      {draftPhase === "asking" && (
        <div className="card p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-[var(--ink)] hindi-text mb-1">{t("file_clarify_title")}</h2>
            <p className="text-sm hindi-text" style={{ color: "var(--ink-3)" }}>
              {lang === "hi"
                ? "इनके उत्तर आपकी RTI को अधिक सटीक और प्रभावशाली बनाते हैं। सभी वैकल्पिक हैं।"
                : "Answering these helps draft a stronger, more targeted RTI. All optional — leave any blank to skip."}
            </p>
          </div>

          {draftError && (
            <div className="mb-4 p-3 rounded-[var(--r-sm)] text-sm hindi-text" style={{ background: "var(--amber-bg)", border: "1px solid rgba(139,94,0,0.2)", color: "var(--amber)" }}>
              {draftError}
            </div>
          )}

          <div className="space-y-4 mb-6">
            {clarifyingQs.length === 0 ? (
              <p className="text-sm hindi-text text-[var(--ink-3)]">{t("file_error_questions")}</p>
            ) : (
              clarifyingQs.map((q, i) => (
                <div key={i} className="rounded-[var(--r-md)] p-4" style={{ background: "var(--glass)", border: "1px solid var(--rule-strong)" }}>
                  <div className="flex items-start gap-3 mb-3">
                    <span className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mono-text mt-0.5" style={{ background: "var(--accent)", color: "#fff" }}>
                      {i + 1}
                    </span>
                    <p className="text-sm font-medium hindi-text text-[var(--ink)]">{q}</p>
                  </div>
                  <div className="ml-9">
                    <input
                      type="text"
                      value={answers[i] || ""}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                      placeholder={lang === "hi" ? "यहाँ उत्तर दें… (वैकल्पिक)" : "Type your answer… (optional)"}
                      className="input-field hindi-text text-sm w-full"
                      onKeyDown={(e) => { if (e.key === "Enter") handleGenerateDraft(); }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <button onClick={handleStartOver} className="text-xs text-[var(--ink-4)] hover:text-[var(--ink)] underline">
              {t("file_start_over")}
            </button>
            <button onClick={handleGenerateDraft} className="btn-primary py-2.5 px-6">
              {t("file_generate_draft")}
            </button>
          </div>
        </div>
      )}

      {/* ── LOADING DRAFT ── */}
      {draftPhase === "loading_draft" && (
        <div className="card p-12 text-center">
          <Spinner className="w-8 h-8 mx-auto mb-4" style={{ color: "var(--accent)" }} />
          <p className="hindi-text font-medium text-[var(--ink-2)]">{t("file_generating")}</p>
        </div>
      )}

      {/* ── REVIEWING: edit Subject + Main Body before finalising ── */}
      {draftPhase === "reviewing" && draft && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--ink)] hindi-text">{t("file_draft_title")}</h2>
            <button onClick={handleStartOver} className="text-xs text-[var(--ink-4)] hover:text-[var(--ink)] underline">
              {t("file_start_over")}
            </button>
          </div>

          {draftError && (
            <div className="p-3 rounded-[var(--r-sm)] text-sm hindi-text" style={{ background: "var(--amber-bg)", color: "var(--amber)" }}>
              {draftError}
            </div>
          )}

          {/* Subject */}
          <div className="card p-5">
            <label className="section-label block mb-2">{t("file_subject_label")}</label>
            <input
              type="text"
              value={editedSubject}
              onChange={(e) => setEditedSubject(e.target.value)}
              className="input-field hindi-text text-sm w-full"
            />
          </div>

          {/* Main Body */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <label className="section-label">{t("file_info_sought_label")}</label>
              <span className="mono-text text-xs" style={{ color: "var(--ink-4)" }}>
                {t("file_words", { n: countWords(editedInfoSought) })}
              </span>
            </div>
            <p className="text-xs hindi-text mb-2" style={{ color: "var(--ink-4)" }}>{t("file_draft_edit_hint")}</p>
            <textarea
              rows={12}
              value={editedInfoSought}
              onChange={(e) => setEditedInfoSought(e.target.value)}
              className="input-field hindi-text text-sm leading-relaxed w-full resize-y"
            />
          </div>

          {/* Dept + State chips */}
          {draft.detected_state && (
            <div className="flex flex-wrap gap-2">
              {draft.department && (
                <span className="rounded-full px-3 py-1 text-xs font-medium hindi-text" style={{ background: "var(--accent-glass)", color: "var(--accent)", border: "1px solid rgba(184,134,11,0.2)" }}>
                  {draft.department}
                </span>
              )}
              <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: "var(--glass)", border: "1px solid var(--rule-strong)", color: "var(--ink-3)" }}>
                {draft.detected_state}
              </span>
            </div>
          )}

          {/* Authority classification — Central Govt only */}
          {authority && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="section-label">
                  {lang === "hi" ? "पहचाना गया विभाग (rtionline.gov.in)" : "Identified Authority (rtionline.gov.in)"}
                </p>
                <span
                  className="text-xs mono-text px-2 py-0.5 rounded-full"
                  style={authorityIsManual
                    ? { background: "var(--accent-glass)", color: "var(--accent)", border: "1px solid rgba(184,134,11,0.3)" }
                    : { background: "var(--green-bg)", color: "var(--green)", border: "1px solid rgba(74,122,58,0.25)" }
                  }
                >
                  {authorityIsManual ? (lang === "hi" ? "मैन्युअल चुना" : "Manually selected") : "AI matched"}
                </span>
              </div>

              {/* Ministry dropdown — always visible, pre-filled with AI value */}
              <div>
                <label className="section-label block mb-1">
                  {lang === "hi" ? "मंत्रालय" : "Ministry"}
                </label>
                <select
                  value={overrideMinistryId || authority.ministry_id}
                  onChange={(e) => {
                    const m = allMinistries.find(m => m.ministry_id === e.target.value);
                    if (!m) return;
                    setOverrideMinistryId(m.ministry_id);
                    setAuthority({
                      ministry_id: m.ministry_id,
                      ministry_label: m.ministry_label,
                      authority_id: m.ministry_id,
                      authority_label: m.ministry_label,
                    });
                    setAuthorityIsManual(true);
                  }}
                  className="input-field text-sm w-full"
                >
                  {/* Fallback option shown while list loads */}
                  {allMinistries.length === 0 && (
                    <option value={authority.ministry_id}>{authority.ministry_label}</option>
                  )}
                  {allMinistries.map(m => (
                    <option key={m.ministry_id} value={m.ministry_id}>{m.ministry_label}</option>
                  ))}
                </select>
              </div>

              {/* Authority dropdown — always visible, filtered to selected ministry */}
              {(() => {
                const activeMinId = overrideMinistryId || authority.ministry_id;
                const auths = allMinistries.find(m => m.ministry_id === activeMinId)?.authorities || [];
                return (
                  <div>
                    <label className="section-label block mb-1">
                      {lang === "hi" ? "प्राधिकरण / विभाग" : "Public Authority / Department"}
                    </label>
                    <select
                      value={authority.authority_id}
                      onChange={(e) => {
                        const a = auths.find(a => a.id === e.target.value);
                        if (!a) return;
                        setAuthority(prev => ({ ...prev, authority_id: a.id, authority_label: a.label }));
                        setAuthorityIsManual(true);
                      }}
                      className="input-field text-sm w-full"
                    >
                      {/* Fallback while list loads */}
                      {auths.length === 0 && (
                        <option value={authority.authority_id}>
                          {authority.authority_label || authority.ministry_label}
                        </option>
                      )}
                      {auths.map(a => (
                        <option key={a.id} value={a.id}>{a.label}</option>
                      ))}
                    </select>
                  </div>
                );
              })()}

              <p className="text-xs" style={{ color: "var(--ink-4)" }}>
                {lang === "hi"
                  ? "सत्यापित करें — यह सही विभाग है तो आगे बढ़ें।"
                  : "Verify this matches your intended department before proceeding."}
              </p>
            </div>
          )}

          {/* Optional applicant details */}
          <div className="card p-5">
            <button
              className="flex items-center justify-between w-full"
              onClick={() => setShowApplicantForm((v) => !v)}
            >
              <span className="section-label hindi-text">{t("file_applicant_title")}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className={`transition-transform ${showApplicantForm ? "rotate-180" : ""}`}
                style={{ color: "var(--ink-4)" }}
              >
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {showApplicantForm && (
              <div className="mt-4 space-y-3">
                <p className="text-xs hindi-text" style={{ color: "var(--ink-4)" }}>{t("file_anon_hint")}</p>
                {/* Row 1: Name + Gender */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="section-label block mb-1">{t("file_name_label")}</label>
                    <input
                      type="text"
                      value={applicant.name}
                      onChange={(e) => setApplicant((p) => ({ ...p, name: e.target.value }))}
                      className="input-field hindi-text text-sm w-full"
                      placeholder={lang === "hi" ? "आपका पूरा नाम" : "Your full name"}
                    />
                  </div>
                  <div>
                    <label className="section-label block mb-1">{t("file_gender_label")}</label>
                    <select
                      value={applicant.gender}
                      onChange={(e) => setApplicant((p) => ({ ...p, gender: e.target.value }))}
                      className="input-field hindi-text text-sm w-full"
                    >
                      <option value="">{t("file_gender_placeholder")}</option>
                      <option value="Male">{lang === "hi" ? "पुरुष" : "Male"}</option>
                      <option value="Female">{lang === "hi" ? "महिला" : "Female"}</option>
                      <option value="Other">{lang === "hi" ? "अन्य" : "Other"}</option>
                    </select>
                  </div>
                </div>
                {/* Row 2: Phone + PIN Code */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="section-label block mb-1">{t("file_phone_label")}</label>
                    <input
                      type="tel"
                      value={applicant.phone}
                      onChange={(e) => setApplicant((p) => ({ ...p, phone: e.target.value }))}
                      className="input-field text-sm w-full"
                      placeholder="9876543210"
                    />
                  </div>
                  <div>
                    <label className="section-label block mb-1">{t("file_pincode_label")}</label>
                    <input
                      type="text"
                      value={applicant.pincode}
                      onChange={(e) => setApplicant((p) => ({ ...p, pincode: e.target.value }))}
                      className="input-field text-sm w-full"
                      placeholder="110001"
                      maxLength={6}
                    />
                  </div>
                </div>
                {/* Row 3: State */}
                <div>
                  <label className="section-label block mb-1">{t("file_state_label")}</label>
                  <select
                    value={applicant.state}
                    onChange={(e) => setApplicant((p) => ({ ...p, state: e.target.value }))}
                    className="input-field hindi-text text-sm w-full"
                  >
                    <option value="">{t("file_state_placeholder")}</option>
                    {["Andaman and Nicobar Islands","Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chandigarh","Chhattisgarh","Dadra and Nagar Haveli and Daman and Diu","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jammu and Kashmir","Jharkhand","Karnataka","Kerala","Ladakh","Lakshadweep","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Puducherry","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                {/* Row 4: Address */}
                <div>
                  <label className="section-label block mb-1">{t("file_address_label")}</label>
                  <p className="text-xs hindi-text mb-1" style={{ color: "var(--ink-4)" }}>{t("file_address_hint")}</p>
                  <textarea
                    rows={2}
                    value={applicant.address}
                    onChange={(e) => setApplicant((p) => ({ ...p, address: e.target.value }))}
                    className="input-field hindi-text text-sm w-full resize-none"
                    placeholder={lang === "hi" ? "मकान नंबर/मोहल्ला, शहर" : "House/locality, City"}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button onClick={handleApproveDraft} className="btn-primary py-3 px-8 text-sm">
              {t("file_approve")}
            </button>
          </div>
        </div>
      )}

      {/* ── FINAL: Ready to File ── */}
      {draftPhase === "final" && draft && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--ink)] hindi-text">{t("file_final_title")}</h2>
              <p className="text-sm hindi-text mt-0.5" style={{ color: "var(--ink-3)" }}>{t("file_final_subtitle")}</p>
            </div>
            {!existingId && (
              <button onClick={handleStartOver} className="text-xs text-[var(--ink-4)] hover:text-[var(--ink)] underline">
                {t("file_start_over")}
              </button>
            )}
          </div>

          {/* 1. Department */}
          {draft.department && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <label className="section-label">{t("file_dept_field_label")}</label>
                <CopyBtn text={draft.department} field="department" copiedField={copiedField} onCopy={copyToClipboard} t={t} />
              </div>
              <div className="rounded-[var(--r-sm)] px-4 py-3 hindi-text text-sm font-medium" style={{ background: "var(--glass)", border: "1px solid var(--rule-strong)", color: "var(--ink)" }}>
                {draft.department}
              </div>
            </div>
          )}

          {/* 2. Subject */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="section-label">{t("file_subject_label")}</label>
              <CopyBtn text={editedSubject} field="subject" copiedField={copiedField} onCopy={copyToClipboard} t={t} />
            </div>
            <input
              type="text"
              value={editedSubject}
              onChange={(e) => setEditedSubject(e.target.value)}
              className="input-field hindi-text text-sm w-full"
            />
          </div>

          {/* 3. Main Body */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <label className="section-label">{t("file_info_sought_label")}</label>
              <CopyBtn text={editedInfoSought} field="info_sought" copiedField={copiedField} onCopy={copyToClipboard} t={t} />
            </div>
            <p className="text-xs hindi-text mb-3" style={{ color: "var(--ink-4)" }}>
              {lang === "hi" ? "पोर्टल के 'मुख्य भाग' या 'आवेदन विवरण' फ़ील्ड में पेस्ट करें" : "Paste into the portal's 'Body' or 'Application Details' field"}
            </p>
            <textarea
              rows={10}
              value={editedInfoSought}
              onChange={(e) => setEditedInfoSought(e.target.value)}
              className="input-field hindi-text text-sm leading-relaxed w-full resize-y"
              style={{ fontFamily: "inherit" }}
            />
          </div>

          {/* 4. Complete Application */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <label className="section-label">{t("file_full_app_label")}</label>
              <CopyBtn text={editedFullApp} field="full_app" copiedField={copiedField} onCopy={copyToClipboard} t={t} />
            </div>
            <p className="text-xs hindi-text mb-3" style={{ color: "var(--ink-4)" }}>
              {lang === "hi" ? "व्यक्तिगत दाखिल करने या एकल-फ़ील्ड पोर्टल के लिए" : "For physical filing or portals with a single free-form field"}
            </p>
            <textarea
              rows={18}
              value={editedFullApp}
              onChange={(e) => setEditedFullApp(e.target.value)}
              className="input-field hindi-text text-sm leading-relaxed w-full resize-y"
              style={{ fontFamily: "inherit" }}
            />
          </div>

          {/* 5. Applicant Details */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="section-label">{t("file_applicant_label")}</label>
              <CopyBtn text={editedApplicant} field="applicant" copiedField={copiedField} onCopy={copyToClipboard} t={t} />
            </div>
            <textarea
              rows={6}
              value={editedApplicant}
              onChange={(e) => setEditedApplicant(e.target.value)}
              className="input-field hindi-text text-sm leading-relaxed w-full resize-y"
              style={{ fontFamily: "inherit" }}
            />
          </div>

          {/* Tip */}
          {draft.tip && (
            <div className="rounded-[var(--r-sm)] p-4 flex gap-3" style={{ background: "var(--accent-glass)", border: "1px solid rgba(184,134,11,0.2)" }}>
              <span className="text-lg">💡</span>
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: "var(--accent)" }}>{t("file_tip_label")}</p>
                <p className="text-sm hindi-text" style={{ color: "var(--ink-2)" }}>{draft.tip}</p>
              </div>
            </div>
          )}

          {/* Portal — Manual link + Try Automatically button */}
          {(() => {
            const isCentralGovt = draft.detected_state === "Central Government"
              || !draft.detected_state   // null/empty → assume central govt
              || draft.portal?.portal_url?.includes("rtionline.gov.in");
            const portalUrl = draft.portal?.portal_url || (isCentralGovt ? "https://rtionline.gov.in" : null);
            const autofillAllowed = (import.meta.env.VITE_AUTOFILL_ALLOWED_EMAILS || "")
              .split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
            const showAuto = !!savedDraftId && (
              autofillAllowed.length === 0 ||
              autofillAllowed.includes((user?.email || "").toLowerCase())
            );
            return (
              <div className="card p-5">
                <p className="section-label mb-3">{t("file_portal_label")}</p>

                {/* Local runner URL — paste ngrok/cloudflare tunnel URL here */}
                {showAuto && (
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-1.5 rounded-[var(--r-sm)] px-2.5 py-1.5" style={{ background: "var(--glass)", border: "1px solid var(--rule-strong)" }}>
                      <span
                        className="shrink-0 w-2 h-2 rounded-full"
                        style={{ background: localRunnerUrl ? "var(--green)" : "var(--ink-4)" }}
                        title={localRunnerUrl ? "Local runner connected" : "No local runner set"}
                      />
                      <input
                        type="text"
                        value={localRunnerInput}
                        onChange={e => setLocalRunnerInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            const v = localRunnerInput.trim().replace(/\/$/, "");
                            setLocalRunnerUrl(v);
                            if (v) localStorage.setItem(LOCAL_RUNNER_KEY, v);
                            else localStorage.removeItem(LOCAL_RUNNER_KEY);
                          }
                        }}
                        placeholder="https://xyz.ngrok.io/api  (local runner)"
                        className="flex-1 bg-transparent text-xs outline-none"
                        style={{ color: "var(--ink-2)", minWidth: 0 }}
                      />
                      {localRunnerUrl && (
                        <button
                          onClick={() => {
                            setLocalRunnerUrl("");
                            setLocalRunnerInput("");
                            localStorage.removeItem(LOCAL_RUNNER_KEY);
                          }}
                          className="text-xs shrink-0"
                          style={{ color: "var(--ink-4)" }}
                          title="Clear"
                        >×</button>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        const v = localRunnerInput.trim().replace(/\/$/, "");
                        setLocalRunnerUrl(v);
                        if (v) localStorage.setItem(LOCAL_RUNNER_KEY, v);
                        else localStorage.removeItem(LOCAL_RUNNER_KEY);
                      }}
                      className="text-xs px-2.5 py-1.5 rounded-[var(--r-sm)] font-medium shrink-0"
                      style={{ background: "var(--glass)", border: "1px solid var(--rule-strong)", color: "var(--ink-2)" }}
                    >
                      Save
                    </button>
                  </div>
                )}

                <div className={`grid gap-3 ${showAuto ? "grid-cols-2" : "grid-cols-1"}`}>
                  {/* Manual link */}
                  {portalUrl ? (
                    <a
                      href={portalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 rounded-[var(--r-md)] px-4 py-3.5 font-semibold text-sm transition-all"
                      style={{ background: "var(--accent)", color: "#fff" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "var(--accent-hover)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "var(--accent)"; }}
                    >
                      <span className="hindi-text">{lang === "hi" ? "मैन्युअल दाखिल करें" : "File Manually"}</span>
                      <ExternalLinkIcon />
                    </a>
                  ) : (
                    <div className="rounded-[var(--r-sm)] p-3 text-sm hindi-text font-medium" style={{ background: "var(--glass)", border: "1px solid var(--rule-strong)", color: "var(--ink-3)" }}>
                      {t("file_portal_offline")}
                    </div>
                  )}

                  {/* Try Automatically — Central Govt only */}
                  {showAuto && (
                    <button
                      onClick={handleAutoFill}
                      disabled={autoFillLaunching}
                      className="flex items-center justify-center gap-2 rounded-[var(--r-md)] px-4 py-3.5 font-semibold text-sm transition-all"
                      style={{
                        background: autofillDone ? "var(--green-bg)" : "var(--glass)",
                        border: `1px solid ${autofillDone ? "rgba(74,122,58,0.3)" : "var(--rule-strong)"}`,
                        color: autofillDone ? "var(--green)" : "var(--ink-2)",
                        opacity: autoFillLaunching ? 0.65 : 1,
                      }}
                    >
                      {autoFillLaunching
                        ? <><Spinner className="w-4 h-4" style={{ color: "var(--accent)" }} />{lang === "hi" ? " लॉन्च हो रहा है…" : " Launching…"}</>
                        : autofillDone
                          ? <><CheckIcon />{lang === "hi" ? " पूर्ण ✓" : " Done ✓"}</>
                          : autofillLogs.length > 0
                            ? <>{lang === "hi" ? "⟳ फिर चलाएं" : "⟳ Run Again"}</>
                            : <>{lang === "hi" ? "⚡ स्वचालित दाखिल करें" : "⚡ Try Automatically"}</>
                      }
                    </button>
                  )}
                </div>

                {/* CAPTCHA AI toggle */}
                {showAuto && (
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={() => setUseCaptchaAI(v => !v)}
                      className="relative shrink-0 w-9 h-5 rounded-full transition-colors"
                      style={{ background: useCaptchaAI ? "var(--accent)" : "var(--rule-strong)" }}
                      aria-label="Toggle AI CAPTCHA"
                    >
                      <span
                        className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform block"
                        style={{ transform: useCaptchaAI ? "translateX(16px)" : "translateX(0)" }}
                      />
                    </button>
                    <span className="text-xs hindi-text" style={{ color: "var(--ink-3)" }}>
                      {lang === "hi"
                        ? (useCaptchaAI ? "AI से CAPTCHA हल होगा" : "CAPTCHA मैन्युअल भरें")
                        : (useCaptchaAI ? "AI solves CAPTCHA" : "Fill CAPTCHA manually")}
                    </span>
                  </div>
                )}

                {autoFillError && (
                  <p className="mt-2 text-xs hindi-text" style={{ color: "var(--red)" }}>{autoFillError}</p>
                )}

                {/* Terminal output panel */}
                {autofillLogs.length > 0 && (
                  <div className="mt-3">
                    <div
                      ref={logRef}
                      className="rounded-[var(--r-sm)] p-3 overflow-y-auto leading-relaxed"
                      style={{ background: "#0d1117", maxHeight: "220px", border: "1px solid #30363d", fontFamily: "monospace", fontSize: "11px" }}
                    >
                      {autofillLogs.map((log, i) => (
                        <div key={i} style={{
                          color: log.kind === "pause" ? "#79c0ff"
                               : log.kind === "done"  ? "#56d364"
                               : log.text?.includes("✓")  ? "#56d364"
                               : log.text?.includes("⚠")  ? "#e3b341"
                               : "#c9d1d9",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}>
                          {log.text}
                        </div>
                      ))}
                    </div>

                    {autofillPaused && (
                      <button
                        onClick={handleContinue}
                        className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-[var(--r-sm)] text-sm font-semibold transition-all"
                        style={{ background: "#79c0ff22", border: "1px solid #79c0ff55", color: "#79c0ff" }}
                      >
                        ▶ {lang === "hi" ? "जारी रखें" : "Continue"}
                      </button>
                    )}
                  </div>
                )}

                {!draft.portal?.is_verified && (
                  <p className="mt-2 text-xs mono-text" style={{ color: "var(--ink-4)" }}>⚠ {t("file_portal_unverified")}</p>
                )}
              </div>
            );
          })()}

          {/* Upload Filed PDF */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <UploadIcon />
              <div>
                <p className="text-sm font-semibold text-[var(--ink)] hindi-text">
                  {lang === "hi" ? "दाखिल RTI PDF अपलोड करें" : "Upload Filed RTI PDF"}
                </p>
                <p className="text-xs hindi-text" style={{ color: "var(--ink-4)" }}>
                  {lang === "hi" ? "पोर्टल पर दाखिल करने के बाद PDF अपलोड करें (वैकल्पिक)" : "Optional — upload after filing on the portal, for your records"}
                </p>
              </div>
            </div>

            {filedPdfUrl ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "var(--green)" }} />
                  <span className="text-xs font-medium" style={{ color: "var(--green)" }}>
                    {lang === "hi" ? "PDF अपलोड हो गई" : "Filed PDF uploaded"}
                  </span>
                  <a href={filedPdfUrl} target="_blank" rel="noopener noreferrer"
                    className="ml-auto text-xs font-medium flex items-center gap-1" style={{ color: "var(--accent)" }}>
                    {lang === "hi" ? "देखें" : "View"} <ExternalLinkIcon />
                  </a>
                  <button onClick={() => fileInputRef.current?.click()} className="text-xs" style={{ color: "var(--ink-4)" }}>
                    {lang === "hi" ? "बदलें" : "Replace"}
                  </button>
                  <button
                    onClick={async () => {
                      if (!savedDraftId) return;
                      try {
                        await removeFiledPDF(savedDraftId);
                        setFiledPdfUrl(null);
                        setShareCardUrl(null);
                      } catch (err) {
                        console.error("Remove PDF failed:", err);
                      }
                    }}
                    className="text-xs"
                    style={{ color: "var(--red)" }}
                  >
                    {lang === "hi" ? "हटाएं" : "Remove"}
                  </button>
                </div>

                {/* Poster + WhatsApp share */}
                <div className="space-y-3" style={{ borderTop: "1px solid var(--rule)", paddingTop: "0.75rem" }}>

                  {/* Step 1: Generate poster */}
                  {!shareCardUrl ? (
                    <button
                      onClick={handleGenerateCard}
                      disabled={generatingCard}
                      className="flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-[var(--r-sm)] text-sm font-medium transition-all"
                      style={{ background: "var(--glass)", border: "1px solid var(--rule-strong)", color: "var(--ink-2)", opacity: generatingCard ? 0.7 : 1 }}
                    >
                      {generatingCard
                        ? <><Spinner className="w-4 h-4" style={{ color: "var(--accent)" }} /> {lang === "hi" ? "पोस्टर बन रहा है…" : "Generating poster…"}</>
                        : <>{lang === "hi" ? "सोशल पोस्टर बनाएं" : "Generate Social Poster"}</>
                      }
                    </button>
                  ) : (
                    /* Step 2: Preview + toggle */
                    <div className="space-y-2.5">
                      <img
                        src={shareCardUrl}
                        alt="Social share card preview"
                        className="w-full rounded-[var(--r-md)]"
                        style={{ border: "1px solid var(--rule-strong)" }}
                      />
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={includeCard}
                            onChange={(e) => setIncludeCard(e.target.checked)}
                            className="w-4 h-4 accent-[var(--accent)]"
                          />
                          <span className="text-xs hindi-text font-medium text-[var(--ink-2)]">
                            {lang === "hi" ? "WhatsApp संदेश में पोस्टर जोड़ें" : "Include poster in WhatsApp message"}
                          </span>
                        </label>
                        <button
                          onClick={() => setShareCardUrl(null)}
                          className="text-xs"
                          style={{ color: "var(--ink-4)" }}
                        >
                          {lang === "hi" ? "दोबारा बनाएं" : "Regenerate"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: WhatsApp send */}
                  <button
                    onClick={sendToWhatsApp}
                    className="flex items-center gap-2.5 w-full justify-center px-4 py-2.5 rounded-[var(--r-sm)] text-sm font-semibold transition-all"
                    style={{ background: "#25D366", color: "#fff" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#1ebe5d"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#25D366"; }}
                  >
                    <WhatsAppIcon />
                    {lang === "hi" ? "WhatsApp पर शेयर करें" : "Share via WhatsApp"}
                  </button>
                  {!applicant.phone && (
                    <p className="text-xs text-center" style={{ color: "var(--ink-4)" }}>
                      {lang === "hi" ? "संपर्क नंबर जोड़ें तो सीधे भेजा जाएगा" : "Add a phone number in contact info to send directly"}
                    </p>
                  )}
                </div>
              </>
            ) : (
              (() => {
                const autofillAllowed = (import.meta.env.VITE_AUTOFILL_ALLOWED_EMAILS || "")
                  .split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
                const showFetch = !!savedDraftId && (
                  autofillAllowed.length === 0 ||
                  autofillAllowed.includes((user?.email || "").toLowerCase())
                );
                return (
                  <>
                    <div className={`grid gap-2 ${showFetch ? "grid-cols-2" : "grid-cols-1"}`}>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPDF || !savedDraftId}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-[var(--r-sm)] text-xs font-medium transition-all"
                        style={{ background: "var(--glass)", border: "1px solid var(--rule-strong)", color: "var(--ink-3)" }}
                        title={!savedDraftId ? "Save the draft first to enable PDF upload" : ""}
                      >
                        {uploadingPDF ? (
                          <><Spinner className="w-3.5 h-3.5" /> {lang === "hi" ? "अपलोड हो रहा है…" : "Uploading…"}</>
                        ) : (
                          <>{lang === "hi" ? "PDF चुनें" : "Choose PDF"}</>
                        )}
                      </button>

                      {showFetch && (
                        <button
                          onClick={handleAutoFetch}
                          disabled={autoFetchLaunching || !savedDraftId}
                          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-[var(--r-sm)] text-xs font-medium transition-all"
                          style={{
                            background: autofillDone && streamSource === "autofetch" ? "var(--green-bg)" : "var(--glass)",
                            border: `1px solid ${autofillDone && streamSource === "autofetch" ? "rgba(74,122,58,0.3)" : "var(--rule-strong)"}`,
                            color: autofillDone && streamSource === "autofetch" ? "var(--green)" : "var(--ink-2)",
                            opacity: autoFetchLaunching ? 0.65 : 1,
                          }}
                          title={!savedDraftId ? "Save the draft first" : ""}
                        >
                          {autoFetchLaunching
                            ? <><Spinner className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} /> {lang === "hi" ? "शुरू हो रहा है…" : "Starting…"}</>
                            : autofillDone && streamSource === "autofetch"
                              ? <><CheckIcon /> {lang === "hi" ? "PDF मिल गई ✓" : "Fetched ✓"}</>
                              : <>{lang === "hi" ? "⚡ पोर्टल से लाएं" : "⚡ Auto-fetch PDF"}</>
                          }
                        </button>
                      )}
                    </div>

                    {showFetch && (
                      <div className="flex items-center gap-3 mt-1">
                        <button
                          onClick={() => setUseCaptchaAI(v => !v)}
                          className="relative shrink-0 w-9 h-5 rounded-full transition-colors"
                          style={{ background: useCaptchaAI ? "var(--accent)" : "var(--rule-strong)" }}
                          aria-label="Toggle AI CAPTCHA"
                        >
                          <span
                            className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform block"
                            style={{ transform: useCaptchaAI ? "translateX(16px)" : "translateX(0)" }}
                          />
                        </button>
                        <span className="text-xs hindi-text" style={{ color: "var(--ink-3)" }}>
                          {lang === "hi"
                            ? (useCaptchaAI ? "AI से CAPTCHA हल होगा" : "CAPTCHA मैन्युअल भरें")
                            : (useCaptchaAI ? "AI solves CAPTCHA" : "Fill CAPTCHA manually")}
                        </span>
                      </div>
                    )}
                  </>
                );
              })()
            )}
            {uploadError && <p className="text-xs" style={{ color: "var(--red)" }}>{uploadError}</p>}
            {autoFetchError && <p className="text-xs" style={{ color: "var(--red)" }}>{autoFetchError}</p>}

            {/* Autofetch terminal */}
            {autofetchLogs.length > 0 && (
              <div className="mt-2">
                <div
                  ref={logRef}
                  className="rounded-[var(--r-sm)] p-3 overflow-y-auto leading-relaxed"
                  style={{ background: "#0d1117", maxHeight: "220px", border: "1px solid #30363d", fontFamily: "monospace", fontSize: "11px" }}
                >
                  {autofetchLogs.map((log, i) => (
                    <div key={i} style={{
                      color: log.kind === "pause" ? "#79c0ff"
                           : log.kind === "done"  ? "#56d364"
                           : log.text?.includes("✓") ? "#56d364"
                           : log.text?.includes("⚠") ? "#e3b341"
                           : "#c9d1d9",
                      whiteSpace: "pre-wrap", wordBreak: "break-word",
                    }}>
                      {log.text}
                    </div>
                  ))}
                </div>
                {autofetchPaused && (
                  <button
                    onClick={async () => {
                      try {
                        await continueAutofetch(savedDraftId);
                        setAutofetchPaused(null);
                        setAutofetchLogs(prev => [...prev, { kind: "log", text: "  ▶ Continuing…" }]);
                      } catch (err) {
                        const msg = err.message || "";
                        setAutofetchLogs(prev => [...prev, { kind: "log", text: `  ⚠ Continue failed: ${msg}` }]);
                        if (msg.toLowerCase().includes("no active") || msg.toLowerCase().includes("session")) {
                          setAutofetchPaused(null);
                          setAutofetchLogs(prev => [...prev, { kind: "log", text: "  Session ended. Relaunch Auto-fetch PDF to try again." }]);
                        }
                      }
                    }}
                    className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-[var(--r-sm)] text-sm font-semibold"
                    style={{ background: "#79c0ff22", border: "1px solid #79c0ff55", color: "#79c0ff" }}
                  >
                    ▶ {lang === "hi" ? "जारी रखें" : "Continue"}
                  </button>
                )}
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handlePDFUpload} />
          </div>

          {/* Save / update */}
          <div className="flex items-center justify-between">
            <Link to="/profile" className="text-xs text-[var(--ink-4)] hover:text-[var(--ink)] underline">
              {lang === "hi" ? "प्रोफ़ाइल पर जाएं" : "View all drafts →"}
            </Link>
            <button
              onClick={handleUpdateDraft}
              className="flex items-center gap-2 px-4 py-2 rounded-[var(--r-sm)] text-sm font-medium transition-all"
              style={draftSaved
                ? { background: "var(--green-bg)", color: "var(--green)", border: "1px solid rgba(74,122,58,0.3)" }
                : { background: "var(--glass)", border: "1px solid var(--rule-strong)", color: "var(--ink-3)" }
              }
            >
              {draftSaved ? <><CheckIcon /> {t("file_saved")}</> : t("file_save_draft")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
