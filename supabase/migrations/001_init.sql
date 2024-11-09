-- ============================================================
-- RTI Knowledge Base — Initial Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- Main RTI entries table
-- ============================================================
CREATE TABLE IF NOT EXISTS rti_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),

  -- Core fields (Hindi/English)
  title text,
  department text,
  ministry text,
  state text,
  district text,
  area text,
  subject text,
  questions jsonb,                    -- array of question strings in Hindi/English
  response_summary text,
  response_status text DEFAULT 'pending'
    CHECK (response_status IN
      ('pending','responded','partial','rejected','appealed')),
  date_filed date,
  date_of_response date,
  rti_act_sections text[],
  tags text[],
  language text DEFAULT 'hindi'
    CHECK (language IN ('hindi','english','mixed')),

  -- Filer identity
  filer_name text,                    -- null if anonymous
  filer_email text,                   -- null if anonymous
  is_anonymous boolean DEFAULT true,

  -- Engagement
  upvotes integer DEFAULT 0,
  view_count integer DEFAULT 0,

  -- File
  file_url text,                      -- Supabase Storage URL
  file_type text DEFAULT 'pdf',
  extracted_text text,                -- full raw text from Gemini

  -- AI fields
  embedding vector(768),              -- text-embedding-004 (768-dim)
  verified boolean DEFAULT false,

  -- Auth
  uploaded_by uuid REFERENCES auth.users(id)
);

-- ============================================================
-- Response attachments
-- ============================================================
CREATE TABLE IF NOT EXISTS rti_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rti_id uuid REFERENCES rti_entries(id) ON DELETE CASCADE,
  response_text text,
  response_date date,
  is_official boolean DEFAULT false,
  uploaded_by uuid REFERENCES auth.users(id),
  file_url text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- Upvotes (one per user per RTI)
-- ============================================================
CREATE TABLE IF NOT EXISTS rti_upvotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rti_id uuid REFERENCES rti_entries(id) ON DELETE CASCADE,
  user_id uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE(rti_id, user_id)
);

-- ============================================================
-- Gemini API usage tracking (daily quota guard)
-- ============================================================
CREATE TABLE IF NOT EXISTS gemini_usage (
  date date PRIMARY KEY,
  call_count integer DEFAULT 0
);

-- ============================================================
-- Indexes
-- ============================================================

-- Full-text search index using 'simple' (Hindi-safe — no bad stemming)
-- We use a generated column approach via a separate index expression
CREATE INDEX IF NOT EXISTS rti_fts_idx ON rti_entries
  USING gin(
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' ||
      coalesce(subject, '') || ' ' ||
      coalesce(department, '') || ' ' ||
      coalesce(state, '') || ' ' ||
      coalesce(extracted_text, '')
    )
  );

-- Semantic search index (ivfflat with cosine distance)
-- NOTE: Requires at least 100 rows to build effectively
-- CREATE INDEX IF NOT EXISTS rti_embedding_idx ON rti_entries
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- Uncomment the above after seeding enough data

-- Department, state, status indexes for filter queries
CREATE INDEX IF NOT EXISTS rti_department_idx ON rti_entries (department);
CREATE INDEX IF NOT EXISTS rti_state_idx ON rti_entries (state);
CREATE INDEX IF NOT EXISTS rti_status_idx ON rti_entries (response_status);
CREATE INDEX IF NOT EXISTS rti_created_at_idx ON rti_entries (created_at DESC);
CREATE INDEX IF NOT EXISTS rti_language_idx ON rti_entries (language);

-- ============================================================
-- Full-text search helper (used by search API)
-- Add a generated column alias so PostgREST textSearch works
-- ============================================================
ALTER TABLE rti_entries
  ADD COLUMN IF NOT EXISTS fts_document tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' ||
      coalesce(subject, '') || ' ' ||
      coalesce(department, '') || ' ' ||
      coalesce(state, '') || ' ' ||
      coalesce(extracted_text, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS rti_fts_gen_idx ON rti_entries USING gin(fts_document);

-- ============================================================
-- Semantic search RPC function
-- ============================================================
CREATE OR REPLACE FUNCTION match_rti_entries(
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  title text,
  department text,
  state text,
  subject text,
  response_status text,
  tags text[],
  date_filed date,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    title,
    department,
    state,
    subject,
    response_status,
    tags,
    date_filed,
    1 - (embedding <=> query_embedding) AS similarity
  FROM rti_entries
  WHERE embedding IS NOT NULL
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ============================================================
-- Upvote helper RPCs
-- ============================================================
CREATE OR REPLACE FUNCTION increment_upvotes(entry_id uuid)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE rti_entries SET upvotes = upvotes + 1 WHERE id = entry_id;
$$;

CREATE OR REPLACE FUNCTION decrement_upvotes(entry_id uuid)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE rti_entries SET upvotes = GREATEST(0, upvotes - 1) WHERE id = entry_id;
$$;

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE rti_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE rti_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE rti_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE gemini_usage ENABLE ROW LEVEL SECURITY;

-- Public can read all RTI entries
CREATE POLICY "Public read" ON rti_entries
  FOR SELECT USING (true);

-- Anyone can insert (anonymous uploads allowed)
CREATE POLICY "Auth insert" ON rti_entries
  FOR INSERT WITH CHECK (true);

-- Only owner can update their own entry
CREATE POLICY "Owner update" ON rti_entries
  FOR UPDATE USING (auth.uid() = uploaded_by OR uploaded_by IS NULL);

-- Responses: public read, anyone can insert
CREATE POLICY "Public read responses" ON rti_responses
  FOR SELECT USING (true);
CREATE POLICY "Anyone insert response" ON rti_responses
  FOR INSERT WITH CHECK (true);

-- Upvotes: public read, anyone can insert/delete
CREATE POLICY "Public read upvotes" ON rti_upvotes
  FOR SELECT USING (true);
CREATE POLICY "Anyone upvote" ON rti_upvotes
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone remove upvote" ON rti_upvotes
  FOR DELETE USING (true);

-- Gemini usage: service role only (backend uses service role key)
CREATE POLICY "Service role only gemini" ON gemini_usage
  FOR ALL USING (true);  -- Restrict further if needed

-- ============================================================
-- Supabase Storage bucket policy (run separately in dashboard)
-- ============================================================
-- Create bucket: rti-documents (public)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('rti-documents', 'rti-documents', true);
