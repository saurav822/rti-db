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
      "ministry": "मंत्रालय (parent ministry, if mentioned)",
      "state": "राज्य (state name, or 'केंद्र सरकार' for central govt)",
      "district": "जिला (district, if mentioned, else null)",
      "area": "क्षेत्र (specific locality/area, if mentioned, else null)",
      "subject": "RTI का विषय — one sentence in the document's language",
      "questions": ["प्रश्न 1", "प्रश्न 2"],
      "response_summary": "उत्तर का सारांश if response is present, else null",
      "response_status": "pending|responded|partial|rejected|appealed",
      "date_filed": "YYYY-MM-DD or null",
      "date_of_response": "YYYY-MM-DD or null",
      "rti_act_sections": ["धारा numbers mentioned, e.g. धारा 6, धारा 7"],
      "tags": ["3-6 topic tags in Hindi or English, e.g. सड़क, भ्रष्टाचार, शिक्षा"],
      "language": "hindi|english|mixed"
    }

    Rules:
    - Preserve all Hindi text in Devanagari Unicode exactly as written
    - If a field is not found, return null for that field
    - questions must be an array even if there is only one question
    - tags should reflect the real-world topic (roads, water, education, etc.)
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
