import "dotenv/config";
import express from "express";
import cors from "cors";
import { apiLimiter } from "./middleware/rateLimiter.js";

import uploadRouter from "./routes/upload.js";
import searchRouter from "./routes/search.js";
import entriesRouter from "./routes/entries.js";
import statsRouter from "./routes/stats.js";
import departmentsRouter from "./routes/departments.js";
import filertIRouter from "./routes/filerti.js";
import supabase from "./lib/supabase.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Trust Vercel's reverse proxy so X-Forwarded-For is used for rate limiting
app.set("trust proxy", 1);

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3001",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin requests (no Origin header) and whitelisted origins.
      // On Vercel, frontend and backend share the same domain so origin will
      // match FRONTEND_URL. Also allow *.vercel.app preview deployments.
      if (
        !origin ||
        allowedOrigins.some((o) => origin.startsWith(o)) ||
        /^https:\/\/[^.]+\.vercel\.app$/.test(origin)
      ) {
        cb(null, true);
      } else {
        cb(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/api", apiLimiter);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use("/api", uploadRouter);
app.use("/api", searchRouter);
app.use("/api", entriesRouter);
app.use("/api", statsRouter);
app.use("/api", departmentsRouter);
app.use("/api", filertIRouter);

// Short-link redirect: /r/:draftId → filed_pdf_url
app.get("/r/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("rti_drafts")
    .select("filed_pdf_url")
    .eq("id", req.params.id)
    .single();

  if (error || !data?.filed_pdf_url) {
    return res.status(404).send("Not found");
  }
  res.redirect(301, data.filed_pdf_url);
});

// Short-link redirect: /s/:draftId → share_card_url
app.get("/s/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("rti_drafts")
    .select("share_card_url")
    .eq("id", req.params.id)
    .single();

  if (error || !data?.share_card_url) {
    return res.status(404).send("Not found");
  }
  res.redirect(301, data.share_card_url);
});

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// 404 handler
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error", detail: err.message });
});

// In serverless environments (Vercel) we export the app instead of listening
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`RTI Knowledge Base API running on http://localhost:${PORT}`);
  });
}

export default app;
