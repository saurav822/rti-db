import express from "express";
import multer from "multer";
import { spawn } from "child_process";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import supabase from "../lib/supabase.js";
import {
  generateClarifyingQuestions,
  generateRTIDraft,
  checkAndIncrementGeminiUsage,
  classifyRTIAuthority,
} from "../lib/gemini.js";
import { generateShareCard } from "../lib/generateShareCard.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = express.Router();

// Lazily load and cache the portal_authorities.json (scraped from rtionline.gov.in)
let _authoritiesCache = null;
function loadAuthoritiesData() {
  if (!_authoritiesCache) {
    const p = path.resolve(__dirname, "../python/autofill/portal_authorities.json");
    _authoritiesCache = existsSync(p)
      ? JSON.parse(readFileSync(p, "utf-8")).ministries
      : [];
  }
  return _authoritiesCache;
}

// ---------------------------------------------------------------------------
// GET /api/file-rti/authorities — All ministries + their sub-authorities
// Mirrors the exact dropdown values on rtionline.gov.in
// ---------------------------------------------------------------------------
router.get("/file-rti/authorities", (req, res) => {
  try {
    res.json(loadAuthoritiesData());
  } catch (err) {
    console.error("Load authorities error:", err);
    res.status(500).json({ error: "Failed to load authorities" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/file-rti/clarify
// Takes a raw RTI query and returns 2-3 clarifying questions
// ---------------------------------------------------------------------------
router.post("/file-rti/clarify", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || query.trim().length < 10) {
      return res.status(400).json({ error: "Query too short (minimum 10 characters)" });
    }

    const quota = await checkAndIncrementGeminiUsage(supabase);
    if (!quota.allowed) {
      return res.status(200).json({
        quota_exceeded: true,
        message: "AI quota reached for today. Please try again tomorrow. / आज का AI कोटा समाप्त हो गया। कल पुनः प्रयास करें।",
      });
    }

    const result = await generateClarifyingQuestions(query.trim());
    res.json(result);
  } catch (err) {
    console.error("Clarify error:", err);
    res.status(500).json({ error: "Failed to generate clarifying questions" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/file-rti/generate
// Takes query + clarification answers and returns a complete RTI draft
// ---------------------------------------------------------------------------
router.post("/file-rti/generate", async (req, res) => {
  try {
    const { query, clarifications = [], language = "en" } = req.body;
    if (!query || query.trim().length < 10) {
      return res.status(400).json({ error: "Query too short" });
    }

    const quota = await checkAndIncrementGeminiUsage(supabase);
    if (!quota.allowed) {
      return res.status(200).json({
        quota_exceeded: true,
        message: "AI quota reached for today. Please try again tomorrow.",
      });
    }

    const draft = await generateRTIDraft(query.trim(), clarifications, language);

    // Look up portal for detected state
    let portal = null;
    if (draft.detected_state) {
      const { data } = await supabase
        .from("rti_portals")
        .select("portal_name, portal_url, submission_type, notes")
        .eq("state", draft.detected_state)
        .maybeSingle();
      portal = data;
    }

    // Two-step authority classification — Central Government only
    let authority = null;
    if (draft.detected_state === "Central Government") {
      authority = await classifyRTIAuthority(query.trim(), draft.department, supabase).catch((e) => {
        console.warn("Authority classification failed:", e.message, e.stack);
        return null;
      });
      console.log("Authority classification result:", JSON.stringify(authority));
    }

    res.json({ ...draft, portal, authority });
  } catch (err) {
    console.error("Generate draft error:", err);
    res.status(500).json({ error: "Failed to generate RTI draft" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/file-rti/portals
// Returns all portal entries for display/lookup
// ---------------------------------------------------------------------------
router.get("/file-rti/portals", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("rti_portals")
      .select("state, portal_name, portal_url, submission_type, notes, is_verified")
      .order("state");
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("Portals error:", err);
    res.status(500).json({ error: "Failed to fetch portals" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/file-rti/drafts — Save a draft
// ---------------------------------------------------------------------------
router.post("/file-rti/drafts", async (req, res) => {
  try {
    const {
      user_id,
      original_query,
      clarifications,
      draft_subject,
      draft_information_sought,
      draft_body,
      draft_applicant,
      applicant_name,
      applicant_phone,
      applicant_address,
      applicant_gender,
      applicant_state,
      applicant_pincode,
      detected_state,
      detected_dept,
      portal_url,
      language,
      ministry_id,
      ministry_label,
      authority_id,
      authority_label,
    } = req.body;

    if (!original_query) {
      return res.status(400).json({ error: "original_query is required" });
    }

    const { data, error } = await supabase
      .from("rti_drafts")
      .insert({
        user_id: user_id || null,
        original_query,
        clarifications: clarifications || [],
        draft_subject,
        draft_information_sought,
        draft_body,
        draft_applicant,
        applicant_name: applicant_name || null,
        applicant_phone: applicant_phone || null,
        applicant_address: applicant_address || null,
        applicant_gender: applicant_gender || null,
        applicant_state: applicant_state || null,
        applicant_pincode: applicant_pincode || null,
        detected_state,
        detected_dept,
        portal_url,
        language: language || "en",
        status: "draft",
        ministry_id: ministry_id || null,
        ministry_label: ministry_label || null,
        authority_id: authority_id || null,
        authority_label: authority_label || null,
      })
      .select("id")
      .single();

    if (error) throw error;
    res.json({ id: data.id });
  } catch (err) {
    console.error("Save draft error:", err);
    res.status(500).json({ error: "Failed to save draft" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/file-rti/drafts/:id — Fetch a single draft by ID
// ---------------------------------------------------------------------------
router.get("/file-rti/drafts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("rti_drafts")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Fetch single draft error:", err);
    res.status(500).json({ error: "Failed to fetch draft" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/file-rti/drafts/:id — Update (override) an existing draft
// ---------------------------------------------------------------------------
router.patch("/file-rti/drafts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      draft_subject,
      draft_information_sought,
      draft_body,
      draft_applicant,
      applicant_name,
      applicant_phone,
      applicant_address,
      applicant_gender,
      applicant_state,
      applicant_pincode,
    } = req.body;

    const updates = {
      updated_at: new Date().toISOString(),
    };
    if (draft_subject !== undefined)           updates.draft_subject = draft_subject;
    if (draft_information_sought !== undefined) updates.draft_information_sought = draft_information_sought;
    if (draft_body !== undefined)              updates.draft_body = draft_body;
    if (draft_applicant !== undefined)         updates.draft_applicant = draft_applicant;
    if (applicant_name !== undefined)          updates.applicant_name = applicant_name || null;
    if (applicant_phone !== undefined)         updates.applicant_phone = applicant_phone || null;
    if (applicant_address !== undefined)       updates.applicant_address = applicant_address || null;
    if (applicant_gender !== undefined)        updates.applicant_gender = applicant_gender || null;
    if (applicant_state !== undefined)         updates.applicant_state = applicant_state || null;
    if (applicant_pincode !== undefined)       updates.applicant_pincode = applicant_pincode || null;
    const { error } = await supabase
      .from("rti_drafts")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("Update draft error:", err);
    res.status(500).json({ error: "Failed to update draft" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/file-rti/drafts/:id/pdf — Remove filed PDF from storage + DB
// ---------------------------------------------------------------------------
router.delete("/file-rti/drafts/:id/pdf", async (req, res) => {
  try {
    const { id } = req.params;

    // Get current filed_pdf_url
    const { data: draft, error: fetchErr } = await supabase
      .from("rti_drafts")
      .select("filed_pdf_url")
      .eq("id", id)
      .single();

    if (fetchErr) throw fetchErr;

    // Delete from Supabase Storage if URL exists
    if (draft?.filed_pdf_url) {
      // Extract the storage path from the public URL
      // URL format: .../storage/v1/object/public/filed-rtis/pdfs/<id>.pdf
      const urlParts = draft.filed_pdf_url.split("/filed-rtis/");
      if (urlParts.length > 1) {
        const storagePath = urlParts[1].split("?")[0]; // strip query params
        await supabase.storage.from("filed-rtis").remove([storagePath]);
      }
    }

    // Clear from DB
    const { error: updateErr } = await supabase
      .from("rti_drafts")
      .update({ filed_pdf_url: null, status: "draft", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updateErr) throw updateErr;
    res.json({ success: true });
  } catch (err) {
    console.error("Remove PDF error:", err);
    res.status(500).json({ error: "Failed to remove PDF" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/file-rti/drafts?user_id=xxx
// ---------------------------------------------------------------------------
router.get("/file-rti/drafts", async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.json([]);

    const { data, error } = await supabase
      .from("rti_drafts")
      .select("id, original_query, draft_subject, draft_information_sought, draft_body, draft_applicant, applicant_name, applicant_phone, applicant_address, applicant_gender, applicant_state, applicant_pincode, detected_state, detected_dept, portal_url, language, status, filed_pdf_url, filed_at, share_card_url, created_at")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("Fetch drafts error:", err);
    res.status(500).json({ error: "Failed to fetch drafts" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/file-rti/drafts/:id/generate-card — Generate social share card
// ---------------------------------------------------------------------------
router.post("/file-rti/drafts/:id/generate-card", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: draft, error } = await supabase
      .from("rti_drafts")
      .select("draft_subject, share_card_url")
      .eq("id", id)
      .single();

    if (error) throw error;

    // Return cached URL if already generated
    if (draft.share_card_url) {
      return res.json({ url: draft.share_card_url });
    }

    if (!draft.draft_subject) {
      return res.status(400).json({ error: "Draft has no subject" });
    }

    const buffer = generateShareCard();

    const filename = `share-cards/${id}.png`;
    const { error: uploadError } = await supabase.storage
      .from("filed-rtis")
      .upload(filename, buffer, { contentType: "image/png", upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from("filed-rtis").getPublicUrl(filename);

    await supabase.from("rti_drafts").update({ share_card_url: publicUrl }).eq("id", id);

    res.json({ url: publicUrl });
  } catch (err) {
    console.error("Generate card error:", err);
    res.status(500).json({ error: "Failed to generate share card" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/file-rti/drafts/:id/upload-pdf — Upload the filed RTI PDF
// ---------------------------------------------------------------------------
router.post("/file-rti/drafts/:id/upload-pdf", upload.single("pdf"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: "No file provided" });
    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ error: "Only PDF files are accepted" });
    }

    const filename = `${id}/${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("filed-rtis")
      .upload(filename, req.file.buffer, { contentType: "application/pdf", upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from("filed-rtis").getPublicUrl(filename);

    const { error: updateError } = await supabase
      .from("rti_drafts")
      .update({ filed_pdf_url: publicUrl, filed_at: new Date().toISOString(), status: "finalized" })
      .eq("id", id);

    if (updateError) throw updateError;

    res.json({ url: publicUrl });
  } catch (err) {
    console.error("PDF upload error:", err);
    res.status(500).json({ error: "Failed to upload PDF" });
  }
});

// Active autofill processes keyed by draft ID
const activeAutofills = new Map();

// ---------------------------------------------------------------------------
// POST /api/file-rti/drafts/:id/autofill — Launch script, stream output via SSE
// ---------------------------------------------------------------------------
router.post("/file-rti/drafts/:id/autofill", async (req, res) => {
  try {
    const { id } = req.params;
    const { use_captcha_ai = true } = req.body;

    const { data: draft, error } = await supabase
      .from("rti_drafts")
      .select("detected_state")
      .eq("id", id)
      .single();

    if (error || !draft) return res.status(404).json({ error: "Draft not found" });

    // Email allowlist check
    const allowedEmails = (process.env.AUTOFILL_ALLOWED_EMAILS || "")
      .split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
    if (allowedEmails.length > 0) {
      const userEmail = (req.body.user_email || "").trim().toLowerCase();
      if (!userEmail || !allowedEmails.includes(userEmail)) {
        return res.status(403).json({ error: "Auto-filing is not available for your account." });
      }
    }

    // Pick the portal-specific filler based on detected state.
    const AUTOFILL_SCRIPTS = {
      "Central Government": "autofill.py",
      "Delhi": "autofill_delhi.py",
    };
    const scriptName = AUTOFILL_SCRIPTS[draft.detected_state];
    if (!scriptName) {
      return res.status(400).json({
        error: "Automation is available for Central Government and Delhi RTIs only. Use the manual portal link for other states.",
      });
    }

    const autofillDir = path.resolve(__dirname, "../python/autofill");
    const scriptPath  = path.join(autofillDir, scriptName);
    const backendUrl  = `http://localhost:${process.env.PORT || 3001}`;

    const venvCandidates = [".venv", "rti-automation", "venv"];
    const pythonBin = venvCandidates
      .map(v => path.join(autofillDir, v, "bin/python"))
      .find(p => existsSync(p));

    if (!pythonBin) {
      return res.status(500).json({
        error: "Python venv not found. Run: python3 -m venv .venv && pip install -r requirements.txt && playwright install chromium  (inside backend/python/autofill/)",
      });
    }

    // Kill any existing process for this draft
    if (activeAutofills.has(id)) {
      try { activeAutofills.get(id).process.kill(); } catch {}
      activeAutofills.delete(id);
    }

    const args = ["-u", scriptPath, "--draft-id", id, "--backend", backendUrl, "--yes"];
    // Delhi reads its captcha from the DOM, so it has no --no-captcha-ai flag.
    if (!use_captcha_ai && scriptName === "autofill.py") args.push("--no-captcha-ai");

    const proc = spawn(pythonBin, args, {
      cwd: autofillDir,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      stdio: ["pipe", "pipe", "pipe"],
    });

    const state = { process: proc, sseClients: [] };
    activeAutofills.set(id, state);

    function broadcast(data) {
      const msg = `data: ${JSON.stringify(data)}\n\n`;
      state.sseClients.forEach(c => { try { c.write(msg); } catch {} });
    }

    let outBuf = "";
    proc.stdout.on("data", chunk => {
      outBuf += chunk.toString();
      const lines = outBuf.split("\n");
      outBuf = lines.pop();
      for (const line of lines) {
        const clean = line.replace(/\r.*/, ""); // strip carriage-return overwrites
        if (!clean.trim()) continue;
        if (clean.startsWith("__PAUSE__:")) {
          broadcast({ type: "pause", prompt: clean.slice("__PAUSE__:".length).trim() });
        } else {
          broadcast({ type: "log", text: clean });
        }
      }
    });

    let errBuf = "";
    proc.stderr.on("data", chunk => {
      errBuf += chunk.toString();
      const lines = errBuf.split("\n");
      errBuf = lines.pop();
      for (const line of lines) {
        if (line.trim()) broadcast({ type: "log", text: line });
      }
    });

    proc.on("close", code => {
      broadcast({ type: "done", code });
      activeAutofills.delete(id);
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Autofill launch error:", err);
    res.status(500).json({ error: "Failed to launch autofill script" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/file-rti/drafts/:id/autofill/stream — SSE stream of script output
// ---------------------------------------------------------------------------
router.get("/file-rti/drafts/:id/autofill/stream", (req, res) => {
  const { id } = req.params;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  res.write(": connected\n\n");

  const state = activeAutofills.get(id);
  if (!state) {
    res.write(`data: ${JSON.stringify({ type: "error", text: "No active autofill session" })}\n\n`);
    res.end();
    return;
  }

  state.sseClients.push(res);
  req.on("close", () => {
    if (activeAutofills.has(id)) {
      const s = activeAutofills.get(id);
      s.sseClients = s.sseClients.filter(c => c !== res);
    }
  });
});

// ---------------------------------------------------------------------------
// POST /api/file-rti/drafts/:id/autofill/continue — Send Enter to unblock input()
// ---------------------------------------------------------------------------
router.post("/file-rti/drafts/:id/autofill/continue", (req, res) => {
  const state = activeAutofills.get(req.params.id);
  if (!state) return res.status(404).json({ error: "No active autofill session" });
  try {
    state.process.stdin.write("\n");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Could not signal process" });
  }
});

// Active autofetch processes keyed by draft ID
const activeFetches = new Map();

// ---------------------------------------------------------------------------
// POST /api/file-rti/drafts/:id/autofetch — Launch autofetch.py
// ---------------------------------------------------------------------------
router.post("/file-rti/drafts/:id/autofetch", async (req, res) => {
  try {
    const { id } = req.params;
    const { use_captcha_ai = true, user_email = "" } = req.body;

    // Email allowlist check (same as autofill)
    const allowedEmails = (process.env.AUTOFILL_ALLOWED_EMAILS || "")
      .split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
    if (allowedEmails.length > 0) {
      if (!user_email || !allowedEmails.includes(user_email.trim().toLowerCase())) {
        return res.status(403).json({ error: "Auto-fetch is not available for your account." });
      }
    }

    const autofillDir = path.resolve(__dirname, "../python/autofill");
    const scriptPath  = path.join(autofillDir, "autofetch.py");
    const backendUrl  = `http://localhost:${process.env.PORT || 3001}`;

    const venvCandidates = [".venv", "rti-automation", "venv"];
    const pythonBin = venvCandidates
      .map(v => path.join(autofillDir, v, "bin/python"))
      .find(p => existsSync(p));

    if (!pythonBin) {
      return res.status(500).json({ error: "Python venv not found." });
    }

    // Kill any existing fetch process for this draft
    if (activeFetches.has(id)) {
      try { activeFetches.get(id).process.kill(); } catch {}
      activeFetches.delete(id);
    }

    const args = ["-u", scriptPath, "--draft-id", id, "--backend", backendUrl];
    if (!use_captcha_ai) args.push("--no-captcha-ai");

    const proc = spawn(pythonBin, args, {
      cwd: autofillDir,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      stdio: ["pipe", "pipe", "pipe"],
    });

    const state = { process: proc, sseClients: [] };
    activeFetches.set(id, state);

    function broadcast(data) {
      const msg = `data: ${JSON.stringify(data)}\n\n`;
      state.sseClients.forEach(c => { try { c.write(msg); } catch {} });
    }

    let outBuf = "";
    proc.stdout.on("data", chunk => {
      outBuf += chunk.toString();
      const lines = outBuf.split("\n");
      outBuf = lines.pop();
      for (const line of lines) {
        const clean = line.replace(/\r.*/, "");
        if (!clean.trim()) continue;
        if (clean.startsWith("__PAUSE__:")) {
          broadcast({ type: "pause", prompt: clean.slice("__PAUSE__:".length).trim() });
        } else {
          broadcast({ type: "log", text: clean });
        }
      }
    });

    let errBuf = "";
    proc.stderr.on("data", chunk => {
      errBuf += chunk.toString();
      const lines = errBuf.split("\n");
      errBuf = lines.pop();
      for (const line of lines) {
        if (line.trim()) broadcast({ type: "log", text: line });
      }
    });

    proc.on("close", code => {
      broadcast({ type: "done", code });
      activeFetches.delete(id);
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Autofetch launch error:", err);
    res.status(500).json({ error: "Failed to launch autofetch script" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/file-rti/drafts/:id/autofetch/stream — SSE stream
// ---------------------------------------------------------------------------
router.get("/file-rti/drafts/:id/autofetch/stream", (req, res) => {
  const { id } = req.params;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  res.write(": connected\n\n");

  const state = activeFetches.get(id);
  if (!state) {
    res.write(`data: ${JSON.stringify({ type: "error", text: "No active autofetch session" })}\n\n`);
    res.end();
    return;
  }

  state.sseClients.push(res);
  req.on("close", () => {
    if (activeFetches.has(id)) {
      const s = activeFetches.get(id);
      s.sseClients = s.sseClients.filter(c => c !== res);
    }
  });
});

// ---------------------------------------------------------------------------
// POST /api/file-rti/drafts/:id/autofetch/continue — Unblock pause()
// ---------------------------------------------------------------------------
router.post("/file-rti/drafts/:id/autofetch/continue", (req, res) => {
  const state = activeFetches.get(req.params.id);
  if (!state) return res.status(404).json({ error: "No active autofetch session" });
  try {
    state.process.stdin.write("\n");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Could not signal process" });
  }
});

export default router;
