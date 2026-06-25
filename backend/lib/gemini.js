import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ---------------------------------------------------------------------------
// Retry wrapper — handles 429 / RESOURCE_EXHAUSTED from free-tier limits
// ---------------------------------------------------------------------------
export async function geminiWithRetry(fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const isRateLimit =
        err.message?.includes("429") ||
        err.message?.includes("RESOURCE_EXHAUSTED");
      if (isRateLimit && i < retries - 1) {
        const delay = Math.pow(2, i) * 2000; // 2 s, 4 s, 8 s
        console.warn(`Gemini rate limit hit. Retrying in ${delay}ms…`);
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

  if (currentCount >= 950) {
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

  // Fetch all authorities in one shot (~2,700 rows, ~45K tokens — cheap on Flash)
  const { data: allRows, error } = await supabase
    .from("rti_central_authorities")
    .select("ministry_id, ministry_label, authority_id, authority_label")
    .order("ministry_label");

  if (error || !allRows || allRows.length === 0) {
    console.warn("classifyRTIAuthority: no data in rti_central_authorities");
    return null;
  }

  // Build a grouped text: "ministry_id | Ministry Label > authority_id | Authority Label"
  const authorityList = allRows
    .map((r) => `${r.ministry_id} | ${r.ministry_label} > ${r.authority_id} | ${r.authority_label}`)
    .join("\n");

  const prompt = `You are matching an RTI (Right to Information Act, 2005) application to the exact public authority on rtionline.gov.in.

RTI Query: "${query}"
Department identified from RTI: "${department || "unknown"}"

Below is the complete list of Central Government authorities on rtionline.gov.in in the format:
  ministry_id | Ministry Name > authority_id | Authority Name

${authorityList}

Instructions:
- The "Department identified from RTI" is the strongest signal — match it as closely as possible to an entry in the list above.
- Return the ministry and authority that best match.
- If the RTI targets the ministry head office itself (no specific sub-authority), return the ministry-level authority entry.
- Return ONLY valid JSON, no markdown, no explanation:
{"ministry_id": "ID", "ministry_label": "exact ministry label", "authority_id": "ID", "authority_label": "exact authority label"}`;

  const result = await geminiWithRetry(() => model.generateContent(prompt));
  const text = result.response.text().trim()
    .replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

  let parsed;
  try { parsed = JSON.parse(text); } catch { return null; }
  if (!parsed.ministry_id) return null;

  return {
    ministry_id: parsed.ministry_id,
    ministry_label: parsed.ministry_label,
    authority_id: parsed.authority_id,
    authority_label: parsed.authority_label,
  };

}
