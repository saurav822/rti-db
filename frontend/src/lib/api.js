const BASE = import.meta.env.VITE_API_BASE_URL || "/api";
export const API_BASE = BASE;

export const LOCAL_RUNNER_KEY = "rti_local_runner_url";
export function getLocalRunnerBase() {
  return (typeof localStorage !== "undefined" && localStorage.getItem(LOCAL_RUNNER_KEY)) || null;
}

async function handleResponse(res) {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ---------------------------------------------------------------------------
// Upload: Step 1 — Parse PDF (no DB insert)
// ---------------------------------------------------------------------------
export async function parseRTI(formData) {
  const res = await fetch(`${BASE}/parse`, {
    method: "POST",
    body: formData,
  });
  return handleResponse(res);
}

// ---------------------------------------------------------------------------
// Upload: Step 2 — Submit confirmed fields to DB
// ---------------------------------------------------------------------------
export async function submitRTI(payload, token) {
  const res = await fetch(`${BASE}/entries/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// ---------------------------------------------------------------------------
// Legacy: Upload RTI (one-shot, kept for compatibility)
// ---------------------------------------------------------------------------
export async function uploadRTI(formData) {
  const res = await fetch(`${BASE}/upload`, {
    method: "POST",
    body: formData,
  });
  return handleResponse(res);
}

// ---------------------------------------------------------------------------
// Search RTIs
// ---------------------------------------------------------------------------
export async function searchRTIs(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ""))
  ).toString();
  const res = await fetch(`${BASE}/search?${qs}`);
  return handleResponse(res);
}

// ---------------------------------------------------------------------------
// Get single RTI entry
// ---------------------------------------------------------------------------
export async function getRTIEntry(id) {
  const res = await fetch(`${BASE}/entries/${id}`);
  return handleResponse(res);
}

// ---------------------------------------------------------------------------
// List entries
// ---------------------------------------------------------------------------
export async function listEntries(page = 1, limit = 12) {
  const res = await fetch(`${BASE}/entries?page=${page}&limit=${limit}`);
  return handleResponse(res);
}

// ---------------------------------------------------------------------------
// Upvote toggle
// ---------------------------------------------------------------------------
export async function toggleUpvote(id, userId) {
  const res = await fetch(`${BASE}/entries/${id}/upvote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
  return handleResponse(res);
}

// ---------------------------------------------------------------------------
// "This helped" toggle
// ---------------------------------------------------------------------------
export async function toggleHelpful(id, userId) {
  const res = await fetch(`${BASE}/entries/${id}/helpful`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
  return handleResponse(res);
}

// ---------------------------------------------------------------------------
// Get helpful count
// ---------------------------------------------------------------------------
export async function getHelpfulCount(id) {
  const res = await fetch(`${BASE}/entries/${id}/helpful-count`);
  return handleResponse(res);
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------
export async function getComments(id) {
  const res = await fetch(`${BASE}/entries/${id}/comments`);
  return handleResponse(res);
}

export async function addComment(id, { user_id, display_name, text }) {
  const res = await fetch(`${BASE}/entries/${id}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id, display_name, text }),
  });
  return handleResponse(res);
}

// ---------------------------------------------------------------------------
// Add response (official/community)
// ---------------------------------------------------------------------------
export async function addResponse(id, formData) {
  const res = await fetch(`${BASE}/entries/${id}/response`, {
    method: "POST",
    body: formData,
  });
  return handleResponse(res);
}

// ---------------------------------------------------------------------------
// Check duplicates
// ---------------------------------------------------------------------------
export async function checkDuplicate(text) {
  const res = await fetch(`${BASE}/check-duplicate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return handleResponse(res);
}

// ---------------------------------------------------------------------------
// Dashboard stats
// ---------------------------------------------------------------------------
export async function getStats() {
  const res = await fetch(`${BASE}/stats`);
  return handleResponse(res);
}

// ---------------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------------
export async function getDepartments() {
  const res = await fetch(`${BASE}/departments`);
  return handleResponse(res);
}

export async function getDepartmentByName(name, state) {
  const qs = new URLSearchParams({ name, state }).toString();
  const res = await fetch(`${BASE}/departments/by-name?${qs}`);
  return handleResponse(res);
}

// ---------------------------------------------------------------------------
// File RTI — Clarifying questions
// ---------------------------------------------------------------------------
export async function getRTIClarifyingQuestions(query) {
  const res = await fetch(`${BASE}/file-rti/clarify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return handleResponse(res);
}

// ---------------------------------------------------------------------------
// File RTI — Generate draft
// ---------------------------------------------------------------------------
export async function generateRTIDraftAPI(query, clarifications, language) {
  const res = await fetch(`${BASE}/file-rti/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, clarifications, language }),
  });
  return handleResponse(res);
}

// ---------------------------------------------------------------------------
// File RTI — Save draft
// ---------------------------------------------------------------------------
export async function saveRTIDraft(payload) {
  const res = await fetch(`${BASE}/file-rti/drafts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// ---------------------------------------------------------------------------
// File RTI — Get user's saved drafts
// ---------------------------------------------------------------------------
export async function getRTIDrafts(userId) {
  const res = await fetch(`${BASE}/file-rti/drafts?user_id=${encodeURIComponent(userId)}`);
  return handleResponse(res);
}

// ---------------------------------------------------------------------------
// File RTI — Update an existing draft (override)
// ---------------------------------------------------------------------------
export async function updateRTIDraft(id, payload) {
  const res = await fetch(`${BASE}/file-rti/drafts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// ---------------------------------------------------------------------------
// File RTI — Upload the filed PDF for a saved draft
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// File RTI — Get a single draft by ID
// ---------------------------------------------------------------------------
export async function getRTIDraftById(id) {
  const res = await fetch(`${BASE}/file-rti/drafts/${encodeURIComponent(id)}`);
  return handleResponse(res);
}

export async function generateRTIShareCard(draftId) {
  const res = await fetch(`${BASE}/file-rti/drafts/${encodeURIComponent(draftId)}/generate-card`, {
    method: "POST",
  });
  return handleResponse(res);
}

export async function uploadFiledRTIPDF(draftId, file) {
  const formData = new FormData();
  formData.append("pdf", file);
  const res = await fetch(`${BASE}/file-rti/drafts/${encodeURIComponent(draftId)}/upload-pdf`, {
    method: "POST",
    body: formData,
  });
  return handleResponse(res);
}

// ---------------------------------------------------------------------------
// File RTI — Get all portals
// ---------------------------------------------------------------------------
export async function getRTIPortals() {
  const res = await fetch(`${BASE}/file-rti/portals`);
  return handleResponse(res);
}

// ---------------------------------------------------------------------------
// File RTI — All ministries + authorities mirroring rtionline.gov.in dropdowns
// ---------------------------------------------------------------------------
export async function getRTIAuthorities() {
  const res = await fetch(`${BASE}/file-rti/authorities`);
  return handleResponse(res);
}

// ---------------------------------------------------------------------------
// File RTI — Launch autofill script + stream/continue controls
// ---------------------------------------------------------------------------
export async function continueAutofill(draftId) {
  const res = await fetch(`${getLocalRunnerBase() || BASE}/file-rti/drafts/${encodeURIComponent(draftId)}/autofill/continue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse(res);
}

export async function triggerAutofill(draftId, useCaptchaAi = true, userEmail = "") {
  const res = await fetch(`${getLocalRunnerBase() || BASE}/file-rti/drafts/${encodeURIComponent(draftId)}/autofill`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ use_captcha_ai: useCaptchaAi, user_email: userEmail }),
  });
  return handleResponse(res);
}

export async function removeFiledPDF(draftId) {
  const res = await fetch(`${BASE}/file-rti/drafts/${encodeURIComponent(draftId)}/pdf`, {
    method: "DELETE",
  });
  return handleResponse(res);
}

export async function triggerAutofetch(draftId, useCaptchaAi = true, userEmail = "") {
  const res = await fetch(`${getLocalRunnerBase() || BASE}/file-rti/drafts/${encodeURIComponent(draftId)}/autofetch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ use_captcha_ai: useCaptchaAi, user_email: userEmail }),
  });
  return handleResponse(res);
}

export async function continueAutofetch(draftId) {
  const res = await fetch(`${getLocalRunnerBase() || BASE}/file-rti/drafts/${encodeURIComponent(draftId)}/autofetch/continue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse(res);
}

export async function rateDepartment(deptId, { user_id, rating, rti_id }) {
  const res = await fetch(`${BASE}/departments/${deptId}/rate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id, rating, rti_id }),
  });
  return handleResponse(res);
}

// ---------------------------------------------------------------------------
// Admin: bulk upload
// ---------------------------------------------------------------------------
export async function adminMe(token) {
  const res = await fetch(`${BASE}/admin/me`, { headers: authHeaders(token) });
  return handleResponse(res);
}

export async function adminDeleteEntry(id, token) {
  const res = await fetch(`${BASE}/admin/entries/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  return handleResponse(res);
}

export async function adminProcessPdf(blob, filename, token) {
  const fd = new FormData();
  fd.append("file", blob, filename);
  const res = await fetch(`${BASE}/admin/process-pdf`, {
    method: "POST",
    headers: authHeaders(token),
    body: fd,
  });
  return handleResponse(res);
}
