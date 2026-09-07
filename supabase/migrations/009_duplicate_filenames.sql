-- Returns every original_filename that appears more than once in rti_entries.
-- Used by GET /api/admin/entries to tag duplicate uploads (exact filename match).
CREATE OR REPLACE FUNCTION admin_duplicate_filenames()
RETURNS TABLE(original_filename text)
LANGUAGE sql STABLE
AS $$
  SELECT original_filename
  FROM rti_entries
  WHERE original_filename IS NOT NULL
  GROUP BY original_filename
  HAVING count(*) > 1;
$$;
