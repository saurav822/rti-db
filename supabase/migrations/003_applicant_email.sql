-- ============================================================
-- Migration 003 — Applicant email on RTI Drafts
-- ============================================================

ALTER TABLE rti_drafts ADD COLUMN IF NOT EXISTS applicant_email text;
