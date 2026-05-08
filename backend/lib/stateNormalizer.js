// Canonical state names (must match frontend STATES list exactly)
const CANONICAL = new Set([
  "Central Government",
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
]);

// Map every Hindi name / alias / abbreviation → canonical English name
// Keys are lowercase-trimmed for case-insensitive matching
const ALIAS_MAP = {
  // Central Government
  "केंद्र सरकार / central": "Central Government",
  "केंद्र सरकार / Central": "Central Government",
  "केंद्र सरकार":           "Central Government",
  "केंद्र":                 "Central Government",
  "central":                "Central Government",
  "central government":     "Central Government",
  "govt of india":          "Central Government",
  "government of india":    "Central Government",

  // Andhra Pradesh
  "आंध्र प्रदेश": "Andhra Pradesh",
  "andhra":       "Andhra Pradesh",
  "ap":           "Andhra Pradesh",

  // Arunachal Pradesh
  "अरुणाचल प्रदेश": "Arunachal Pradesh",

  // Assam
  "असम": "Assam",

  // Bihar
  "बिहार": "Bihar",

  // Chhattisgarh
  "छत्तीसगढ़": "Chhattisgarh",
  "छत्तीसगढ":  "Chhattisgarh",

  // Goa
  "गोवा": "Goa",

  // Gujarat
  "गुजरात": "Gujarat",

  // Haryana
  "हरियाणा": "Haryana",

  // Himachal Pradesh
  "हिमाचल प्रदेश": "Himachal Pradesh",
  "himachal":      "Himachal Pradesh",
  "hp":            "Himachal Pradesh",

  // Jharkhand
  "झारखंड": "Jharkhand",
  "झारखण्ड": "Jharkhand",

  // Karnataka
  "कर्नाटक": "Karnataka",

  // Kerala
  "केरल": "Kerala",

  // Madhya Pradesh
  "मध्य प्रदेश": "Madhya Pradesh",
  "mp":          "Madhya Pradesh",

  // Maharashtra
  "महाराष्ट्र": "Maharashtra",

  // Manipur
  "मणिपुर": "Manipur",

  // Meghalaya
  "मेघालय": "Meghalaya",

  // Mizoram
  "मिजोरम":  "Mizoram",
  "मिज़ोरम": "Mizoram",

  // Nagaland
  "नागालैंड": "Nagaland",
  "नागालंड":  "Nagaland",

  // Odisha
  "ओडिशा":  "Odisha",
  "ओड़िशा": "Odisha",
  "उड़ीसा":  "Odisha",
  "orissa":  "Odisha",

  // Punjab
  "पंजाब": "Punjab",

  // Rajasthan
  "राजस्थान": "Rajasthan",

  // Sikkim
  "सिक्किम": "Sikkim",

  // Tamil Nadu
  "तमिल नाडु":  "Tamil Nadu",
  "तमिलनाडु":   "Tamil Nadu",
  "tamil nadu":  "Tamil Nadu",
  "tamilnadu":   "Tamil Nadu",
  "tn":          "Tamil Nadu",

  // Telangana
  "तेलंगाना": "Telangana",
  "तेलंगाण":  "Telangana",

  // Tripura
  "त्रिपुरा": "Tripura",

  // Uttar Pradesh
  "उत्तर प्रदेश": "Uttar Pradesh",
  "up":           "Uttar Pradesh",

  // Uttarakhand
  "उत्तराखंड":  "Uttarakhand",
  "उत्तरांचल":  "Uttarakhand",
  "uttaranchal": "Uttarakhand",

  // West Bengal
  "पश्चिम बंगाल": "West Bengal",
  "wb":           "West Bengal",

  // Andaman and Nicobar Islands
  "अंडमान और निकोबार द्वीप समूह": "Andaman and Nicobar Islands",
  "अंडमान निकोबार":               "Andaman and Nicobar Islands",
  "andaman":                      "Andaman and Nicobar Islands",
  "andaman & nicobar":            "Andaman and Nicobar Islands",
  "andaman and nicobar":          "Andaman and Nicobar Islands",

  // Chandigarh
  "चंडीगढ़": "Chandigarh",
  "चंडीगढ":  "Chandigarh",

  // Dadra and Nagar Haveli and Daman and Diu
  "दादरा और नागर हवेली और दमन और दीव": "Dadra and Nagar Haveli and Daman and Diu",
  "दादरा नागर हवेली":                  "Dadra and Nagar Haveli and Daman and Diu",
  "dadra":                              "Dadra and Nagar Haveli and Daman and Diu",
  "daman and diu":                      "Dadra and Nagar Haveli and Daman and Diu",
  "dadra and nagar haveli":             "Dadra and Nagar Haveli and Daman and Diu",

  // Delhi
  "दिल्ली":                       "Delhi",
  "नई दिल्ली":                    "Delhi",
  "new delhi":                    "Delhi",
  "ncr":                          "Delhi",
  "ncr delhi":                    "Delhi",
  "राष्ट्रीय राजधानी क्षेत्र":   "Delhi",

  // Jammu and Kashmir
  "जम्मू और कश्मीर":  "Jammu and Kashmir",
  "जम्मू कश्मीर":     "Jammu and Kashmir",
  "j&k":              "Jammu and Kashmir",
  "j & k":            "Jammu and Kashmir",
  "jammu & kashmir":  "Jammu and Kashmir",

  // Ladakh
  "लद्दाख": "Ladakh",

  // Lakshadweep
  "लक्षद्वीप": "Lakshadweep",

  // Puducherry
  "पुदुचेरी":  "Puducherry",
  "पांडिचेरी": "Puducherry",
  "pondicherry": "Puducherry",
  "pondy":       "Puducherry",
};

/**
 * Normalize an extracted state string to a canonical name.
 * Returns the canonical form, or the original trimmed string if no match.
 * Handles Gemini's bilingual "Hindi / English" format (e.g. "बिहार / Bihar").
 */
export function normalizeState(state) {
  if (!state) return state;
  const trimmed = state.trim();
  if (CANONICAL.has(trimmed)) return trimmed;
  const lower = trimmed.toLowerCase();
  const direct = ALIAS_MAP[trimmed] || ALIAS_MAP[lower];
  if (direct) return direct;

  // Gemini sometimes returns "हिंदी नाम / English Name" — try each part
  if (trimmed.includes(" / ")) {
    for (const part of trimmed.split(" / ")) {
      const p = part.trim();
      if (CANONICAL.has(p)) return p;
      const mapped = ALIAS_MAP[p] || ALIAS_MAP[p.toLowerCase()];
      if (mapped) return mapped;
    }
  }

  return trimmed;
}
