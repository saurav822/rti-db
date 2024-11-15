import "dotenv/config";
import express from "express";
import cors from "cors";
import { apiLimiter } from "./middleware/rateLimiter.js";

import uploadRouter from "./routes/upload.js";
import searchRouter from "./routes/search.js";
import entriesRouter from "./routes/entries.js";
import statsRouter from "./routes/stats.js";

const app = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
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

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// 404 handler
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error", detail: err.message });
});

app.listen(PORT, () => {
  console.log(`RTI Knowledge Base API running on http://localhost:${PORT}`);
});
