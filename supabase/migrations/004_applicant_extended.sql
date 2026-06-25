-- Migration 004 — Add gender, state, pincode to rti_drafts applicant details

ALTER TABLE rti_drafts
  ADD COLUMN IF NOT EXISTS applicant_gender  text,
  ADD COLUMN IF NOT EXISTS applicant_state   text,
  ADD COLUMN IF NOT EXISTS applicant_pincode text;
