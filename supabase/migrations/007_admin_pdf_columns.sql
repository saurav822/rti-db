-- Original uploaded filename (shown as the "ID" in the admin uploads list).
ALTER TABLE rti_entries ADD COLUMN IF NOT EXISTS original_filename text;

-- Public URL of the PDF kept for admin bulk uploads. Kept separate from
-- file_url so bulk-uploaded PDFs are never surfaced on the public RTIDetail
-- page — only the admin uploads list/export reads this column.
ALTER TABLE rti_entries ADD COLUMN IF NOT EXISTS admin_pdf_url text;
