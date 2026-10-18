-- ============================================================
-- Migration 004 — Update Central Government portal URL
-- ============================================================

UPDATE rti_portals
SET portal_url = 'https://rtionline.gov.in/guidelines.php?request&&pageid=eccbc87e4b5ce2fe28308fd9f2a7baf3',
    updated_at = now()
WHERE state = 'Central Government';
