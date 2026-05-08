# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**RTI Commons** is an India-focused open-source RTI (Right to Information) knowledge base. Users upload Hindi/English PDF documents; Gemini 2.5 Flash parses them into structured fields, generates 768-dim embeddings, and stores them in Supabase (PostgreSQL + pgvector). The app supports keyword (PostgreSQL FTS) and semantic (pgvector cosine similarity) search.

## Development Commands

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev    # Dev server at http://localhost:5173, proxies /api → :3001
npm run build  # Production build → dist/
```

### Backend (Express)
```bash
cd backend
npm install
npm run dev    # Nodemon hot-reload at http://localhost:3001
npm run seed   # Populate 10 sample Hindi RTI entries
npm start      # Production (plain node)
```

### Docker
```bash
cp .env.example .env   # Fill in required secrets
docker-compose up -d   # Frontend on :5173 (nginx), backend on :3001
```

## Environment Variables

**Root `.env` / Backend `backend/.env`:**
```
GEMINI_API_KEY
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
PORT=3001
FRONTEND_URL=http://localhost:5173
```

**Frontend `frontend/.env.local`:**
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_API_BASE_URL    # e.g. http://localhost:3001/api
```

## Architecture

### Structure
- `frontend/` — React 18 + Vite SPA. Pages: Home, Upload, Browse, Search, RTIDetail, DuplicateChecker. State management via React hooks + URL params (no external state lib). Supabase client used only for anonymous user ID (localStorage).
- `backend/` — Express API. Routes in `routes/`, AI integration in `lib/gemini.js`, Supabase service client in `lib/supabase.js`, rate limiting in `middleware/rateLimiter.js`.
- `supabase/migrations/` — single SQL file defining all tables, indexes, and RPC functions.

### Key Backend Routes
| Route | Description |
|-------|-------------|
| `POST /api/upload` | Parse PDF via Gemini, store file + metadata + embedding, return duplicate candidates |
| `GET /api/search` | Keyword (FTS) or semantic (pgvector) search with metadata filters |
| `POST /api/check-duplicate` | Embedding similarity check against existing entries |
| `GET /api/entries/:id` | Full RTI detail; auto-increments view count |
| `POST /api/entries/:id/upvote` | Toggle upvote (requires `user_id`) |
| `POST /api/entries/:id/response` | Add official or community response |
| `GET /api/stats` | Aggregated counts by state, status, language |

### AI / Gemini Integration (`backend/lib/gemini.js`)
- **PDF Parsing**: `gemini-2.5-flash` — natively handles Devanagari; extracts structured JSON fields (title, department, state, questions, tags, etc.)
- **Embeddings**: `embedding-001` — 768-dim vectors over concatenated `title + department + subject + questions + tags`
- **Retry logic**: exponential backoff (2 → 4 → 8s) on `429 / RESOURCE_EXHAUSTED`
- **Quota guard**: `gemini_usage` table tracks daily requests; blocks at 950/1000 and returns `quota_exceeded: true` with Hindi message (HTTP 200, not 429)
- **Graceful degradation**: if parsing fails, returns empty fields so user can fill manually

### Search Architecture
- **Keyword**: PostgreSQL FTS on `fts_document` generated column using `simple` dictionary (intentionally — prevents bad stemming of Hindi/Devanagari words)
- **Semantic**: Postgres RPC `match_rti_entries(query_embedding, match_threshold, match_count)` using pgvector cosine similarity
  - Search threshold: `0.5`
  - Duplicate detection threshold: `0.6` (soft) / `0.78` (blocking)
- Vector index (`IVFFlat`) is commented out in the migration — requires ≥100 rows to build efficiently; uncomment when needed

### Database Schema (`supabase/migrations/001_init.sql`)
Core table `rti_entries`: uuid PK, all RTI fields, `extracted_text` (raw Devanagari), `embedding vector(768)`, `upvotes`, `view_count`, `is_anonymous`, `uploaded_by` (FK to auth.users).

### Rate Limits (`backend/middleware/rateLimiter.js`)
- `uploadLimiter`: 5 uploads/hr per IP
- `duplicateLimiter`: 20 req/15min per IP
- `apiLimiter`: 100 req/15min per IP (all other routes)

### Frontend API Layer
All backend calls go through `frontend/src/lib/api.js` functions. Direct Supabase calls from the frontend are only for auth/user ID scaffolding in `frontend/src/lib/supabase.js`.

### Hindi-First Design Decisions
- Fonts: Noto Sans Devanagari + IBM Plex Sans (loaded via Google Fonts in `index.html`)
- Tailwind theme: India flag palette — saffron `#FF9933`, navy `#000080`, green `#138808`
- FTS uses `simple` dictionary specifically to avoid broken Hindi stemming
- User-facing error messages for quota/AI failures are bilingual (Hindi + English)
