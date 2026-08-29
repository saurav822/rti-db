-- Marks entries created via the admin JSON-import route (backend/routes/admin.js
-- POST /api/admin/import-record), distinct from the AI-parsed bulk-upload route.
-- Used to separate the "New Uploads" admin list from "Old Uploads".
ALTER TABLE rti_entries ADD COLUMN IF NOT EXISTS is_json_import boolean NOT NULL DEFAULT false;
