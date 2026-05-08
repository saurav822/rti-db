-- ============================================================
-- OpenRTI — Migration 004: Normalize state names
-- Converts Hindi / aliased state names to canonical English form
-- so that (department, state) PK in departments table is unique.
-- Run this once in your Supabase SQL editor.
-- ============================================================

-- Helper: map every known Hindi / alias → canonical English name
CREATE OR REPLACE FUNCTION normalize_state(raw text)
RETURNS text
LANGUAGE sql IMMUTABLE STRICT
AS $$
  SELECT CASE lower(trim(raw))
    -- Central Government
    WHEN 'केंद्र सरकार / central' THEN 'Central Government'
    WHEN 'केंद्र सरकार'           THEN 'Central Government'
    WHEN 'केंद्र'                 THEN 'Central Government'
    WHEN 'central'                THEN 'Central Government'
    WHEN 'central government'     THEN 'Central Government'
    WHEN 'govt of india'          THEN 'Central Government'
    WHEN 'government of india'    THEN 'Central Government'

    -- Andhra Pradesh
    WHEN 'आंध्र प्रदेश' THEN 'Andhra Pradesh'
    WHEN 'andhra'       THEN 'Andhra Pradesh'

    -- Arunachal Pradesh
    WHEN 'अरुणाचल प्रदेश' THEN 'Arunachal Pradesh'

    -- Assam
    WHEN 'असम' THEN 'Assam'

    -- Bihar
    WHEN 'बिहार' THEN 'Bihar'

    -- Chhattisgarh
    WHEN 'छत्तीसगढ़' THEN 'Chhattisgarh'
    WHEN 'छत्तीसगढ'  THEN 'Chhattisgarh'

    -- Goa
    WHEN 'गोवा' THEN 'Goa'

    -- Gujarat
    WHEN 'गुजरात' THEN 'Gujarat'

    -- Haryana
    WHEN 'हरियाणा' THEN 'Haryana'

    -- Himachal Pradesh
    WHEN 'हिमाचल प्रदेश' THEN 'Himachal Pradesh'
    WHEN 'himachal'      THEN 'Himachal Pradesh'

    -- Jharkhand
    WHEN 'झारखंड'  THEN 'Jharkhand'
    WHEN 'झारखण्ड' THEN 'Jharkhand'

    -- Karnataka
    WHEN 'कर्नाटक' THEN 'Karnataka'

    -- Kerala
    WHEN 'केरल' THEN 'Kerala'

    -- Madhya Pradesh
    WHEN 'मध्य प्रदेश' THEN 'Madhya Pradesh'

    -- Maharashtra
    WHEN 'महाराष्ट्र' THEN 'Maharashtra'

    -- Manipur
    WHEN 'मणिपुर' THEN 'Manipur'

    -- Meghalaya
    WHEN 'मेघालय' THEN 'Meghalaya'

    -- Mizoram
    WHEN 'मिजोरम'  THEN 'Mizoram'
    WHEN 'मिज़ोरम' THEN 'Mizoram'

    -- Nagaland
    WHEN 'नागालैंड' THEN 'Nagaland'
    WHEN 'नागालंड'  THEN 'Nagaland'

    -- Odisha
    WHEN 'ओडिशा'  THEN 'Odisha'
    WHEN 'ओड़िशा' THEN 'Odisha'
    WHEN 'उड़ीसा'  THEN 'Odisha'
    WHEN 'orissa'  THEN 'Odisha'

    -- Punjab
    WHEN 'पंजाब' THEN 'Punjab'

    -- Rajasthan
    WHEN 'राजस्थान' THEN 'Rajasthan'

    -- Sikkim
    WHEN 'सिक्किम' THEN 'Sikkim'

    -- Tamil Nadu
    WHEN 'तमिल नाडु' THEN 'Tamil Nadu'
    WHEN 'तमिलनाडु'  THEN 'Tamil Nadu'
    WHEN 'tamilnadu'  THEN 'Tamil Nadu'
    WHEN 'tamil nadu' THEN 'Tamil Nadu'

    -- Telangana
    WHEN 'तेलंगाना' THEN 'Telangana'
    WHEN 'तेलंगाण'  THEN 'Telangana'

    -- Tripura
    WHEN 'त्रिपुरा' THEN 'Tripura'

    -- Uttar Pradesh
    WHEN 'उत्तर प्रदेश' THEN 'Uttar Pradesh'

    -- Uttarakhand
    WHEN 'उत्तराखंड'  THEN 'Uttarakhand'
    WHEN 'उत्तरांचल'  THEN 'Uttarakhand'
    WHEN 'uttaranchal' THEN 'Uttarakhand'

    -- West Bengal
    WHEN 'पश्चिम बंगाल' THEN 'West Bengal'

    -- Andaman and Nicobar Islands
    WHEN 'अंडमान और निकोबार द्वीप समूह' THEN 'Andaman and Nicobar Islands'
    WHEN 'अंडमान निकोबार'               THEN 'Andaman and Nicobar Islands'
    WHEN 'andaman'                       THEN 'Andaman and Nicobar Islands'
    WHEN 'andaman & nicobar'             THEN 'Andaman and Nicobar Islands'
    WHEN 'andaman and nicobar'           THEN 'Andaman and Nicobar Islands'

    -- Chandigarh
    WHEN 'चंडीगढ़' THEN 'Chandigarh'
    WHEN 'चंडीगढ'  THEN 'Chandigarh'

    -- Dadra and Nagar Haveli and Daman and Diu
    WHEN 'दादरा और नागर हवेली और दमन और दीव' THEN 'Dadra and Nagar Haveli and Daman and Diu'
    WHEN 'दादरा नागर हवेली'                  THEN 'Dadra and Nagar Haveli and Daman and Diu'
    WHEN 'dadra'                              THEN 'Dadra and Nagar Haveli and Daman and Diu'
    WHEN 'daman and diu'                      THEN 'Dadra and Nagar Haveli and Daman and Diu'
    WHEN 'dadra and nagar haveli'             THEN 'Dadra and Nagar Haveli and Daman and Diu'

    -- Delhi
    WHEN 'दिल्ली'                     THEN 'Delhi'
    WHEN 'नई दिल्ली'                  THEN 'Delhi'
    WHEN 'new delhi'                  THEN 'Delhi'
    WHEN 'ncr'                        THEN 'Delhi'
    WHEN 'ncr delhi'                  THEN 'Delhi'
    WHEN 'राष्ट्रीय राजधानी क्षेत्र' THEN 'Delhi'

    -- Jammu and Kashmir
    WHEN 'जम्मू और कश्मीर' THEN 'Jammu and Kashmir'
    WHEN 'जम्मू कश्मीर'    THEN 'Jammu and Kashmir'
    WHEN 'j&k'             THEN 'Jammu and Kashmir'
    WHEN 'j & k'           THEN 'Jammu and Kashmir'
    WHEN 'jammu & kashmir' THEN 'Jammu and Kashmir'

    -- Ladakh
    WHEN 'लद्दाख' THEN 'Ladakh'

    -- Lakshadweep
    WHEN 'लक्षद्वीप' THEN 'Lakshadweep'

    -- Puducherry
    WHEN 'पुदुचेरी'   THEN 'Puducherry'
    WHEN 'पांडिचेरी'  THEN 'Puducherry'
    WHEN 'pondicherry' THEN 'Puducherry'
    WHEN 'pondy'       THEN 'Puducherry'

    ELSE trim(raw)  -- already canonical or unknown — leave as-is
  END;
$$;

-- ── 1. Backfill rti_entries ────────────────────────────────────────────────
UPDATE rti_entries
SET state = normalize_state(state)
WHERE state IS NOT NULL
  AND normalize_state(state) <> state;

-- ── 2. Backfill departments ───────────────────────────────────────────────
-- First normalize in-place where there is no collision
UPDATE departments
SET state = normalize_state(state)
WHERE state IS NOT NULL
  AND normalize_state(state) <> state
  -- skip rows whose normalized (name, state) already exists
  AND NOT EXISTS (
    SELECT 1 FROM departments d2
    WHERE d2.name  = departments.name
      AND d2.state = normalize_state(departments.state)
      AND d2.id   <> departments.id
  );

-- Merge any remaining duplicate (name, canonical_state) rows by summing
-- rti_count, keeping the oldest row per group.
WITH ranked AS (
  SELECT
    id,
    name,
    normalize_state(state)                             AS canonical_state,
    ROW_NUMBER() OVER (
      PARTITION BY name, normalize_state(state)
      ORDER BY created_at ASC
    )                                                  AS rn,
    SUM(rti_count) OVER (
      PARTITION BY name, normalize_state(state)
    )                                                  AS total_count
  FROM departments
)
UPDATE departments d
SET
  state     = r.canonical_state,
  rti_count = r.total_count
FROM ranked r
WHERE d.id = r.id
  AND r.rn  = 1;

-- Delete the now-redundant duplicate rows (every row that is not the oldest
-- in its (name, canonical_state) group)
DELETE FROM departments d
WHERE EXISTS (
  SELECT 1 FROM departments d2
  WHERE d2.name       = d.name
    AND normalize_state(d2.state) = normalize_state(d.state)
    AND d2.created_at < d.created_at
);

-- ── 3. Clean up — drop the helper function (not needed at runtime) ─────────
DROP FUNCTION normalize_state(text);
