-- ============================================================
-- OpenRTI — Schema Update (Migration 003)
-- Run this in your Supabase SQL editor
-- ============================================================

-- Add response_full_text column for full verbatim response text
ALTER TABLE rti_entries
  ADD COLUMN IF NOT EXISTS response_full_text text;
