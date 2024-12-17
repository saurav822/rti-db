const BASE = import.meta.env.VITE_API_BASE_URL || "/api";

async function handleResponse(res) {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

// ---------------------------------------------------------------------------
// Upload RTI PDF
// ---------------------------------------------------------------------------
export async function uploadRTI(formData) {
  const res = await fetch(`${BASE}/upload`, {
    method: "POST",
    body: formData, // multipart — do NOT set Content-Type header
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
// Add response
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
// List departments
// ---------------------------------------------------------------------------
export async function getDepartments() {
  const res = await fetch(`${BASE}/departments`);
  return handleResponse(res);
}
