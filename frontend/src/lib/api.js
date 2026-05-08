const BASE = import.meta.env.VITE_API_BASE_URL || "/api";

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

export async function rateDepartment(deptId, { user_id, rating, rti_id }) {
  const res = await fetch(`${BASE}/departments/${deptId}/rate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id, rating, rti_id }),
  });
  return handleResponse(res);
}
