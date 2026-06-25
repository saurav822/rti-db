-- Migration 003 — Add acknowledgment number + share_card_url to rti_drafts

ALTER TABLE rti_drafts
  ADD COLUMN IF NOT EXISTS ack_number     text,
  ADD COLUMN IF NOT EXISTS share_card_url text;
