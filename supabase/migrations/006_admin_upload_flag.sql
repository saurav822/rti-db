-- Marks entries created via the admin bulk-upload feature (backend/routes/admin.js).
-- Only surfaced in the admin UI (RTIDetail badge) — not shown to public visitors.
ALTER TABLE rti_entries ADD COLUMN IF NOT EXISTS is_admin_upload boolean NOT NULL DEFAULT false;

UPDATE rti_entries
SET is_admin_upload = true
WHERE uploaded_by = (SELECT id FROM auth.users WHERE email = 'nba.saurav@gmail.com')
  AND file_url IS NULL;
