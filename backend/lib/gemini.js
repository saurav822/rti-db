import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ---------------------------------------------------------------------------
// Retry wrapper — handles 429 / RESOURCE_EXHAUSTED (rate limit) and
// 503 / UNAVAILABLE (Google's servers briefly overloaded) with backoff.
// ---------------------------------------------------------------------------
export async function geminiWithRetry(fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const isRetryable =
        err.message?.includes("429") ||
        err.message?.includes("RESOURCE_EXHAUSTED") ||
        err.message?.includes("503") ||
        err.message?.includes("UNAVAILABLE") ||
        err.status === 503;
      if (isRetryable && i < retries - 1) {
        const delay = Math.pow(2, i) * 2000; // 2 s, 4 s, 8 s
        console.warn(`Gemini request failed (${err.status || "retryable"}). Retrying in ${delay}ms…`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

// ---------------------------------------------------------------------------
// Parse an RTI PDF — sends the buffer directly to Gemini 2.5 Flash
// Returns structured JSON with all Hindi/English fields
// ---------------------------------------------------------------------------
export async function parseRTIDocument(pdfBuffer) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const pdfBase64 = pdfBuffer.toString("base64");

  const prompt = `
    यह एक भारतीय RTI (सूचना का अधिकार) दस्तावेज़ है। इसे ध्यान से पढ़ें।

    This is an Indian RTI (Right to Information Act 2005) document,
    likely written in Hindi (Devanagari script) or a mix of Hindi and English.

    Extract ALL text from this document first, preserving Hindi/Devanagari
    script exactly as written. Then identify and return ONLY this JSON object
    with no explanation, no markdown, no code fences:

    {
      "extracted_text": "full raw text of the document in original Hindi/English",
      "title": "8-10 word summary title in Hindi or English",
      "department": "विभाग का नाम (department name)",
      "state": "राज्य (state name in English, or 'केंद्र सरकार / Central' for central/union government RTIs)",
      "subject": "RTI का विषय — one sentence in the document's language",
      "questions": ["EVERY question asked in the RTI, extracted verbatim — look for numbered lists, bullet points, and sentences ending with '?' throughout the entire document"],
      "response_summary": "2-3 sentence summary of the official response if present, else null",
      "response_full_text": "complete verbatim text of the official response section if present, else null",
      "response_status": "full_response|partial_response|no_response",
      "response_tables": [{"title": "table title or null", "headers": ["column1", "column2"], "rows": [["val1", "val2"]]}],
      "date_filed": "YYYY-MM-DD — look for application date, filing date, dispatch date in various formats (DD/MM/YYYY, DD-MM-YYYY, Hindi dates), else null",
      "date_of_response": "YYYY-MM-DD — look for response date, reply date, order date, else null",
      "tags": ["3-6 topic tags in Hindi or English, e.g. सड़क, भ्रष्टाचार, शिक्षा"],
      "language": "hindi|english|mixed"
    }

    Critical rules:
    - Preserve all Hindi text in Devanagari Unicode exactly as written
    - questions: extract EVERY individual question — if you see a numbered/bulleted list of information requests, each item is a separate question. Do NOT combine questions. Do NOT leave questions blank.
    - dates: search the entire document carefully — dates may appear near "दिनांक", "Date:", "आवेदन तिथि", "प्रेषण तिथि", "Reply dated" etc.
    - state: for central government departments (Ministry, Commission, Board, Authority at national level), always use 'केंद्र सरकार / Central'
    - If a field is not found, return null for that field
    - Return ONLY the JSON object, nothing else

    PRIVACY — this is critical, apply to EVERY field above (extracted_text,
    title, subject, questions, response_summary, response_full_text,
    response_tables):
    - This platform publishes RTI content anonymously. The applicant/citizen
      who filed the RTI must NEVER be identifiable from any field you return.
    - Remove or replace the applicant's personal name, postal address, phone
      number, email address, and any ID number (Aadhaar, PAN, etc.) wherever
      they appear — in letter salutations, addressee blocks, signature
      lines, envelopes, or anywhere else in the document. Replace with
      "[Applicant]" (or omit the line entirely) rather than transcribing it.
    - Do NOT let the applicant's name leak into extracted_text,
      response_full_text, title, subject, response_summary, or tags.
    - This does NOT apply to government officials — the PIO's name/designation,
      department names, and official addresses are public information and
      should be kept as-is.
  `;

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "application/pdf",
        data: pdfBase64,
      },
    },
    { text: prompt },
  ]);

  const responseText = result.response.text();

  // Strip any accidental markdown fences
  const clean = responseText
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  return JSON.parse(clean);
}

// ---------------------------------------------------------------------------
// Generate 768-dim embedding using gemini-embedding-001
// outputDimensionality: 768 keeps it compatible with the vector(768) column
// ---------------------------------------------------------------------------
export async function generateEmbedding(text) {
  const embeddingModel = genAI.getGenerativeModel({
    model: "gemini-embedding-001",
  });

  const result = await embeddingModel.embedContent({
    content: { parts: [{ text }], role: "user" },
    taskType: "RETRIEVAL_DOCUMENT",
    outputDimensionality: 768,
  });
  return result.embedding.values; // float array, 768 dimensions
}

// ---------------------------------------------------------------------------
// Build a dense text for embedding from parsed RTI fields
// ---------------------------------------------------------------------------
export function buildEmbeddingText(parsedRTI) {
  return [
    parsedRTI.title,
    parsedRTI.department,
    parsedRTI.ministry,
    parsedRTI.subject,
    ...(parsedRTI.questions || []),
    ...(parsedRTI.tags || []),
  ]
    .filter(Boolean)
    .join(" | ");
}

// ---------------------------------------------------------------------------
// Duplicate detection — returns top-5 similar entries above threshold
// ---------------------------------------------------------------------------
export async function checkDuplicates(questionText, supabase) {
  const embedding = await generateEmbedding(questionText);

  const { data, error } = await supabase.rpc("match_rti_entries", {
    query_embedding: embedding,
    match_threshold: 0.78,
    match_count: 5,
  });

  if (error) {
    console.error("Duplicate check RPC error:", error.message);
    return [];
  }

  return data || [];
}

// ---------------------------------------------------------------------------
// Generate 2-3 clarifying questions for an RTI query
// Returns { questions: string[], language: "en"|"hi" }
// ---------------------------------------------------------------------------
export async function generateClarifyingQuestions(query) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `You are an expert RTI (Right to Information Act 2005, India) legal assistant.
A citizen wants to file an RTI application. Their query: "${query}"

Generate exactly 2 to 3 focused clarifying questions to make this RTI legally complete.
Focus on identifying: specific department/ministry, time period or date range, geographic scope (state/district/central), specific data points or documents needed.

Detect the query language and respond in the SAME language (Hindi Devanagari if query is in Hindi, English if English or mixed).

Return ONLY this JSON — no markdown, no explanation:
{"questions": ["question 1", "question 2", "question 3"], "language": "en"}

language field: "en" for English, "hi" for Hindi.`;

  const result = await geminiWithRetry(() => model.generateContent(prompt));
  const text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(text);
}

// ---------------------------------------------------------------------------
// Sanitize text for rtionline.gov.in portal submission.
// Allowed by the portal: A-Z a-z 0-9 space and , . - _ ( ) / @ : & ? \ %
// Newlines are preserved (textarea field). Everything else is stripped.
// ---------------------------------------------------------------------------
function sanitizePortalText(text) {
  if (!text) return text;
  return text
    .replace(/[^A-Za-z0-9 \t\n\r,.\-_()\/@:&?\\%]/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------------------------------------------------------------------------
// Generate a complete RTI draft from query + clarification answers
// Returns { subject, information_sought, full_application, applicant_block, detected_state, department, tip }
// ---------------------------------------------------------------------------
export async function generateRTIDraft(query, clarifications, language) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const clarStr = (clarifications || [])
    .filter((c) => c.answer && c.answer.trim())
    .map((c) => `Q: ${c.question}\nA: ${c.answer}`)
    .join("\n\n");

  const fullAppLang =
    language === "hi"
      ? "Write full_application and applicant_block in formal Hindi (Devanagari script)."
      : "Write in formal English throughout.";

  const VALID_STATES = [
    "Central Government","Andhra Pradesh","Arunachal Pradesh","Assam","Bihar",
    "Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand",
    "Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya",
    "Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu",
    "Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
    "Andaman and Nicobar Islands","Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu","Delhi","Jammu and Kashmir",
    "Ladakh","Lakshadweep","Puducherry",
  ].join(", ");

  const prompt = `You are an expert RTI (Right to Information Act 2005, India) filing assistant.
${fullAppLang}

Citizen's RTI query: "${query}"
${clarStr ? `\nAdditional context from citizen:\n${clarStr}` : ""}

CRITICAL — Portal character restriction for rtionline.gov.in:
The fields "subject" and "information_sought" are pasted DIRECTLY into the government portal which enforces this strict rule:
  Allowed characters ONLY: A-Z  a-z  0-9  space  , . - _ ( ) / @ : & ? \\ %
  REJECTED characters include: Devanagari/Hindi script, smart quotes (“”‘’), em-dash (—), en-dash (–), bullet points (•), asterisks (*), semicolons (;), exclamation marks (!), apostrophes ('), and any Unicode outside the allowed set.
Rules for "subject" and "information_sought":
  - ALWAYS write in English regardless of the citizen query language.
  - Use only plain ASCII from the allowed set above.
  - Use numbered lists (1. 2. 3.) not bullet points.
  - Replace apostrophes with nothing (e.g. "don't" -> "do not", "government's" -> "government").
  - Use Rs. not rupee symbol.
  - Use hyphen (-) not em-dash or en-dash.

Generate a complete RTI application. Return ONLY this JSON (no markdown, no extra text):
{
  "department": "Full official name of the department/ministry/body this RTI is addressed to",
  "subject": "Concise English subject stating what information is sought. Do NOT prefix with RTI Application: or RTI: — start directly with the topic. Under 15 words. Use ONLY allowed portal characters. Example: Information on MGNREGA wage payments in Sitapur district for FY 2023-24",
  "information_sought": "Start with the sentence 'I request the following information under the Right to Information Act, 2005:' followed by a blank line, then a numbered list of specific information/documents requested. No salutation, no fee mention. Use \\n between points. Use ONLY allowed portal characters. ALWAYS in English.",
  "full_application": "Complete formal RTI letter. Use \\n for line breaks. Structure: 1. To,\\nThe Public Information Officer,\\n[Department Name],\\n[State/Central] 2. Sub: [same subject as above] 3. Sir/Madam, 4. Under Section 6(1) of the Right to Information Act, 2005, I hereby request the following information: 5. Same numbered points as information_sought 6. I request you to provide the above information within 30 days as per Section 7(1) of the RTI Act, 2005. 7. I am enclosing the application fee of Rs. 10/- by [IPO/DD/online payment]. Do NOT include applicant name or address.",
  "applicant_block": "Yours sincerely,\\n[Your Full Name]\\n[Complete Postal Address]\\n[City - PIN Code]\\nPhone: [Phone Number]\\nDate: [DD/MM/YYYY]",
  "detected_state": "Exactly one of: ${VALID_STATES}. Use Central Government for national ministries, commissions, central boards, PSUs.",
  "tip": "One specific filing tip for this RTI in the citizen query language. Return null if not applicable."
}`;

  const result = await geminiWithRetry(() => model.generateContent(prompt));
  const text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(text);

  // Safety net: strip any characters the portal rejects, even if AI slipped through
  parsed.subject          = sanitizePortalText(parsed.subject);
  parsed.information_sought = sanitizePortalText(parsed.information_sought);

  return parsed;
}

// ---------------------------------------------------------------------------
// Daily usage guard — prevents exceeding Gemini free-tier (1000 req/day)
// ---------------------------------------------------------------------------
export async function checkAndIncrementGeminiUsage(supabase) {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("gemini_usage")
    .select("call_count")
    .eq("date", today)
    .maybeSingle();

  const currentCount = data?.call_count ?? 0;

  if (currentCount >= 1200) {
    return { allowed: false, count: currentCount };
  }

  // Upsert: increment or insert
  await supabase.from("gemini_usage").upsert(
    { date: today, call_count: currentCount + 1 },
    { onConflict: "date" }
  );

  return { allowed: true, count: currentCount + 1 };
}

// ---------------------------------------------------------------------------
// Two-step Central Government authority classification
// Step 1: Pick ministry from all 93 labels
// Step 2: Pick authority from that ministry's list
// Returns { ministry_id, ministry_label, authority_id, authority_label } or null
// ---------------------------------------------------------------------------
export async function classifyRTIAuthority(query, department, supabase) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // PostgREST caps unbounded selects at 1000 rows by default — this table has
  // ~2,700 authorities, so page through it or entries past the cutoff (e.g.
  // anything alphabetically after ~"M") are invisible to the classifier.
  const allRows = [];
  const PAGE = 1000;
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from("rti_central_authorities")
      .select("ministry_id, ministry_label, authority_id, authority_label")
      .order("ministry_label")
      .range(offset, offset + PAGE - 1);

    if (error) {
      console.warn("classifyRTIAuthority: failed to fetch rti_central_authorities", error.message);
      return null;
    }
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < PAGE) break;
  }

  if (allRows.length === 0) {
    console.warn("classifyRTIAuthority: no data in rti_central_authorities");
    return null;
  }

  // ── Step 1: pick the ministry only, from the deduped ministry list ──
  // Keeping this separate from authority selection guarantees the authority
  // picked in step 2 can never belong to a different ministry.
  const ministries = [];
  const seenMinistry = new Set();
  for (const r of allRows) {
    if (seenMinistry.has(r.ministry_id)) continue;
    seenMinistry.add(r.ministry_id);
    ministries.push({ ministry_id: r.ministry_id, ministry_label: r.ministry_label });
  }

  const normaliseLabel = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  // Try a confident local match against `department` first — it was already
  // determined by generateRTIDraft from the full query, so when it names a
  // ministry closely enough, trust it instead of making Gemini re-guess from
  // scratch (which is what produced wrong-ministry picks like landing on
  // "Department of Agriculture" for an MGNREGA/Rural Development query).
  let ministryMatch = null;
  const normDept = normaliseLabel(department);
  if (normDept) {
    const exact = ministries.find((m) => normaliseLabel(m.ministry_label) === normDept);
    if (exact) {
      ministryMatch = exact;
    } else {
      // Substring containment either way, picking the longest (most specific) label.
      let best = null;
      for (const m of ministries) {
        const normLabel = normaliseLabel(m.ministry_label);
        if (normLabel.includes(normDept) || normDept.includes(normLabel)) {
          if (!best || normLabel.length > normaliseLabel(best.ministry_label).length) best = m;
        }
      }
      ministryMatch = best;
    }
  }

  // No confident local match — fall back to asking Gemini to pick from the full list.
  if (!ministryMatch) {
    const ministryList = ministries.map((m) => `${m.ministry_id} | ${m.ministry_label}`).join("\n");

    const ministryPrompt = `You are matching an RTI (Right to Information Act, 2005) application to the correct Central Government ministry/department on rtionline.gov.in.

RTI Query: "${query}"
Department identified from RTI: "${department || "unknown"}"

Below is the complete list of Central Government ministries/departments on rtionline.gov.in:
  ministry_id | Ministry Name

${ministryList}

Return the single best-matching ministry_id. Return ONLY valid JSON, no markdown, no explanation:
{"ministry_id": "ID"}`;

    const ministryResult = await geminiWithRetry(() => model.generateContent(ministryPrompt));
    const ministryText = ministryResult.response.text().trim()
      .replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

    let parsedMinistry;
    try { parsedMinistry = JSON.parse(ministryText); } catch { return null; }
    ministryMatch = ministries.find((m) => String(m.ministry_id) === String(parsedMinistry.ministry_id));
  }

  if (!ministryMatch) return null;

  // ── Step 2: pick the authority, restricted to that ministry's own rows ──
  const authoritiesInMinistry = allRows.filter(
    (r) => String(r.ministry_id) === String(ministryMatch.ministry_id)
  );

  // Only one authority (the ministry itself) — no need to ask Gemini again.
  if (authoritiesInMinistry.length === 1) {
    const only = authoritiesInMinistry[0];
    return {
      ministry_id: String(only.ministry_id),
      ministry_label: only.ministry_label,
      authority_id: String(only.authority_id),
      authority_label: only.authority_label,
    };
  }

  const authorityList = authoritiesInMinistry
    .map((r) => `${r.authority_id} | ${r.authority_label}`)
    .join("\n");

  const authorityPrompt = `You are matching an RTI (Right to Information Act, 2005) application to the exact public authority under "${ministryMatch.ministry_label}" on rtionline.gov.in.

RTI Query: "${query}"
Department identified from RTI: "${department || "unknown"}"

Below are the public authorities under this ministry:
  authority_id | Authority Name

${authorityList}

Instructions:
- Return the authority that best matches the query.
- If the RTI targets the ministry head office itself (no specific sub-authority), return the authority whose name equals the ministry name.
- Return ONLY valid JSON, no markdown, no explanation:
{"authority_id": "ID"}`;

  const authorityResult = await geminiWithRetry(() => model.generateContent(authorityPrompt));
  const authorityText = authorityResult.response.text().trim()
    .replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

  let parsedAuthority;
  try { parsedAuthority = JSON.parse(authorityText); } catch { parsedAuthority = {}; }

  const authorityMatch = authoritiesInMinistry.find(
    (r) => String(r.authority_id) === String(parsedAuthority.authority_id)
  );

  // Fall back to the ministry-level authority entry if Gemini's pick doesn't
  // actually belong to this ministry's list.
  const chosen = authorityMatch
    || authoritiesInMinistry.find((r) => String(r.authority_id) === String(r.ministry_id))
    || authoritiesInMinistry[0];

  return {
    ministry_id: String(chosen.ministry_id),
    ministry_label: chosen.ministry_label,
    authority_id: String(chosen.authority_id),
    authority_label: chosen.authority_label,
  };
}
