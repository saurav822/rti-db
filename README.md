# RTI Commons — सूचना का अधिकार ज्ञानकोश

India's open RTI (Right to Information) knowledge base. Upload, search, and share RTI documents — primarily in Hindi (Devanagari script) — to reduce duplicate filings and build a public commons.

## Features

- **AI-powered Hindi PDF parsing** — Upload any RTI PDF; Gemini 2.5 Flash extracts all fields automatically, including Devanagari text
- **Semantic search** — Find related RTIs even when worded differently (AI embeddings via `text-embedding-004`)
- **Duplicate detection** — Check before filing to avoid redundant RTIs
- **Full-text search** — Hindi-safe `simple` dictionary (no bad stemming)
- **Anonymous uploads** — Privacy-first by default
- **Mobile-first UI** — Fully functional on 360px width

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + TailwindCSS |
| Backend | Node.js + Express |
| Database | Supabase (PostgreSQL + pgvector) |
| File Storage | Supabase Storage |
| AI | Google Gemini 2.5 Flash (PDF parsing + embeddings) |
| Auth | Supabase Auth |

**All free-tier.** No credit card required for Gemini API.

---

## Quick Start

### Prerequisites
- Node.js 20+
- A free [Supabase](https://supabase.com) account
- A free [Google AI Studio](https://aistudio.google.com/apikey) API key

### 1. Database Setup

Go to your Supabase project → **SQL Editor** → run:
```
supabase/migrations/001_init.sql
```

Then create the storage bucket:
- Go to **Storage** → **New Bucket**
- Name: `rti-documents`
- Public: ✅

### 2. Backend

```bash
cd backend
cp ../.env.example .env
# Fill in your GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

npm install
npm run dev       # starts on http://localhost:3001
```

Seed sample data (optional):
```bash
npm run seed
```

### 3. Frontend

```bash
cd frontend
# Create .env with VITE_* variables from .env.example
cp ../.env.example .env.local

npm install
npm run dev       # starts on http://localhost:5173
```

---

## Environment Variables

Copy `.env.example` to:
- `backend/.env` (backend variables)
- `frontend/.env.local` (VITE_* variables only)

| Variable | Where | Description |
|----------|-------|-------------|
| `GEMINI_API_KEY` | backend | Google AI Studio API key |
| `SUPABASE_URL` | both | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | both | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | backend only | Service role key (never expose to frontend) |
| `VITE_API_BASE_URL` | frontend | Backend API URL |

---

## Docker Deployment

```bash
cp .env.example .env
# Fill in all values

docker-compose up -d
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

---

## API Reference

### Upload RTI
```
POST /api/upload
Content-Type: multipart/form-data

file           PDF file (max 10MB)
is_anonymous   "true" | "false"
filer_name     string (if not anonymous)
filer_email    string (if not anonymous)
```

### Search RTIs
```
GET /api/search?q=सड़क&mode=keyword&state=Bihar&page=1

Params:
  q           search query (Hindi or English)
  mode        "keyword" | "semantic"
  department  filter
  state       filter
  status      pending|responded|partial|rejected|appealed
  language    hindi|english|mixed
  from_date   YYYY-MM-DD
  to_date     YYYY-MM-DD
  page        page number (12 per page)
```

### Get RTI Entry
```
GET /api/entries/:id
```

### Upvote
```
POST /api/entries/:id/upvote
Body: { user_id: string }
```

### Add Response
```
POST /api/entries/:id/response
Content-Type: multipart/form-data

response_text   text
response_date   YYYY-MM-DD
is_official     "true" | "false"
update_status   responded|partial|rejected|appealed
file            PDF (optional)
```

### Check Duplicates
```
POST /api/check-duplicate
Body: { text: string }
```

### Stats
```
GET /api/stats
```

---

## Gemini Free Tier

- **1,000 requests/day** — tracked in `gemini_usage` table
- **15 RPM** — handled by retry with exponential backoff
- **Upload limit:** max 5 uploads per IP per hour (protects quota)
- **Quota exceeded:** UI shows Hindi message to retry next day

---

## Hindi Support

- Devanagari font: [Noto Sans Devanagari](https://fonts.google.com/noto/specimen/Noto+Sans+Devanagari)
- All Hindi content wrapped in `.hindi-text` CSS class
- Full-text search uses `simple` dictionary (no bad stemming of Hindi words)
- Gemini 2.5 Flash reads Hindi PDFs natively — no separate OCR step

---

## File Structure

```
rti-db/
├── frontend/
│   ├── src/
│   │   ├── pages/          Home, Upload, Search, RTIDetail, Browse, DuplicateChecker
│   │   ├── components/     Layout, RTICard, SearchBar, FileDropzone, ParsedFieldForm, ...
│   │   └── lib/            api.js, supabase.js
│   └── index.html
├── backend/
│   ├── routes/             upload.js, search.js, entries.js, stats.js
│   ├── lib/                gemini.js, supabase.js
│   ├── middleware/         rateLimiter.js
│   ├── index.js
│   └── seed.js
├── supabase/
│   └── migrations/
│       └── 001_init.sql
├── .env.example
└── docker-compose.yml
```

---

## License

MIT — Free to use, modify, and deploy. Built for India's citizens.

RTI Act 2005 — सूचना का अधिकार अधिनियम 2005
