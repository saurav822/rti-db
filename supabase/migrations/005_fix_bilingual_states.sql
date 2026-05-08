-- ============================================================
-- OpenRTI — Migration 005: Fix bilingual state names
-- Gemini sometimes returns "बिहार / Bihar" (Hindi / English).
-- This migration fixes existing rows and merges any duplicate
-- (name, state) entries in the departments table.
-- Run once in the Supabase SQL editor.
-- ============================================================

-- ── 1. Fix rti_entries (no uniqueness constraint, simple UPDATE) ──────────────
UPDATE rti_entries
SET state = CASE
  WHEN trim(split_part(state, ' / ', 2)) IN (
    'Central Government','Andhra Pradesh','Arunachal Pradesh','Assam','Bihar',
    'Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand',
    'Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya',
    'Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu',
    'Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
    'Andaman and Nicobar Islands','Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'
  ) THEN trim(split_part(state, ' / ', 2))
  WHEN trim(split_part(state, ' / ', 1)) IN (
    'Central Government','Andhra Pradesh','Arunachal Pradesh','Assam','Bihar',
    'Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand',
    'Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya',
    'Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu',
    'Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
    'Andaman and Nicobar Islands','Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'
  ) THEN trim(split_part(state, ' / ', 1))
  ELSE state
END
WHERE state LIKE '% / %';

-- ── 2. Fix departments (must handle unique constraint on (name, state)) ────────

-- Step 2a: Resolve the canonical state for each bilingual row into a helper CTE,
-- then add its rti_count to the existing canonical row (if one exists).
WITH bilingual AS (
  SELECT
    id,
    name,
    rti_count,
    CASE
      WHEN trim(split_part(state, ' / ', 2)) IN (
        'Central Government','Andhra Pradesh','Arunachal Pradesh','Assam','Bihar',
        'Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand',
        'Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya',
        'Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu',
        'Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
        'Andaman and Nicobar Islands','Chandigarh',
        'Dadra and Nagar Haveli and Daman and Diu',
        'Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'
      ) THEN trim(split_part(state, ' / ', 2))
      ELSE trim(split_part(state, ' / ', 1))
    END AS canonical_state
  FROM departments
  WHERE state LIKE '% / %'
)
UPDATE departments d
SET rti_count = d.rti_count + b.rti_count
FROM bilingual b
WHERE d.name          = b.name
  AND d.state         = b.canonical_state
  AND d.id           != b.id;

-- Step 2b: Delete bilingual rows that now have a canonical counterpart.
DELETE FROM departments d
WHERE d.state LIKE '% / %'
  AND EXISTS (
    SELECT 1 FROM departments d2
    WHERE d2.name  = d.name
      AND d2.state = CASE
        WHEN trim(split_part(d.state, ' / ', 2)) IN (
          'Central Government','Andhra Pradesh','Arunachal Pradesh','Assam','Bihar',
          'Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand',
          'Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya',
          'Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu',
          'Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
          'Andaman and Nicobar Islands','Chandigarh',
          'Dadra and Nagar Haveli and Daman and Diu',
          'Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'
        ) THEN trim(split_part(d.state, ' / ', 2))
        ELSE trim(split_part(d.state, ' / ', 1))
      END
      AND d2.id != d.id
  );

-- Step 2c: Any remaining bilingual rows (no canonical counterpart existed) —
-- safe to update now that duplicates are gone.
UPDATE departments
SET state = CASE
  WHEN trim(split_part(state, ' / ', 2)) IN (
    'Central Government','Andhra Pradesh','Arunachal Pradesh','Assam','Bihar',
    'Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand',
    'Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya',
    'Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu',
    'Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
    'Andaman and Nicobar Islands','Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'
  ) THEN trim(split_part(state, ' / ', 2))
  WHEN trim(split_part(state, ' / ', 1)) IN (
    'Central Government','Andhra Pradesh','Arunachal Pradesh','Assam','Bihar',
    'Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand',
    'Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya',
    'Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu',
    'Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
    'Andaman and Nicobar Islands','Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'
  ) THEN trim(split_part(state, ' / ', 1))
  ELSE state
END
WHERE state LIKE '% / %';
