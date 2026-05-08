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
