import rateLimit from "express-rate-limit";

// Max 5 PDF uploads per IP per hour — protects Gemini free-tier quota
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      "Too many uploads from this IP. Maximum 5 uploads per hour allowed.",
    message_hindi:
      "इस IP से बहुत अधिक अपलोड। प्रति घंटे अधिकतम 5 अपलोड की अनुमति है।",
  },
});

// General API rate limit — 100 req per 15 min
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin bulk processing — generous, protected by adminAuth email check
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
});

// Duplicate check — 20 req per 15 min per IP
export const duplicateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
