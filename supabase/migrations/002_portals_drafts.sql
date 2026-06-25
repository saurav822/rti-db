-- ============================================================
-- Migration 002 — RTI Portals & Drafts
-- ============================================================

-- ── RTI Portals ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rti_portals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state           text NOT NULL UNIQUE,
  portal_name     text NOT NULL,
  portal_url      text,
  submission_type text DEFAULT 'online'
    CHECK (submission_type IN ('online', 'offline', 'hybrid')),
  notes           text,
  is_verified     boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ── RTI Drafts ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rti_drafts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           text,
  original_query    text NOT NULL,
  clarifications    jsonb DEFAULT '[]',  -- [{question, answer}]
  draft_subject          text,
  draft_information_sought text,        -- just the numbered info points (portal main body)
  draft_body             text,          -- complete formal application letter
  draft_applicant        text,          -- applicant block with placeholders
  applicant_name    text,
  applicant_phone   text,
  applicant_address text,
  detected_state    text,
  detected_dept     text,
  portal_url        text,
  language          text DEFAULT 'en',
  status            text DEFAULT 'draft'
    CHECK (status IN ('draft', 'finalized')),
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS rti_drafts_user_idx ON rti_drafts (user_id);
CREATE INDEX IF NOT EXISTS rti_drafts_created_idx ON rti_drafts (created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE rti_portals ENABLE ROW LEVEL SECURITY;
ALTER TABLE rti_drafts  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read portals"  ON rti_portals FOR SELECT USING (true);
CREATE POLICY "Anyone read drafts"   ON rti_drafts  FOR SELECT USING (true);
CREATE POLICY "Anyone insert drafts" ON rti_drafts  FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone update drafts" ON rti_drafts  FOR UPDATE USING (true);

-- ── Portal seed data ─────────────────────────────────────────
-- Central Government is verified. State portals are best-effort from
-- public records; mark is_verified=false until manually confirmed.
INSERT INTO rti_portals (state, portal_name, portal_url, submission_type, is_verified, notes) VALUES

('Central Government',
 'RTI Online Portal',
 'https://rtionline.gov.in',
 'online', true,
 'Official portal for all central government ministries and departments'),

('Andhra Pradesh',
 'AP RTI Online',
 'https://rti.ap.gov.in',
 'online', false,
 NULL),

('Arunachal Pradesh',
 'Arunachal Pradesh RTI',
 NULL,
 'offline', false,
 'No online portal — file physically to SPIO of concerned department'),

('Assam',
 'Assam RTI Portal',
 'https://rti.assam.gov.in',
 'online', false,
 NULL),

('Bihar',
 'Bihar RTI Portal',
 'https://rtionline.bih.nic.in',
 'online', false,
 NULL),

('Chhattisgarh',
 'CG RTI Portal',
 'https://rti.cg.gov.in',
 'online', false,
 NULL),

('Delhi',
 'Delhi RTI Portal',
 'https://rti.delhi.gov.in',
 'online', false,
 NULL),

('Goa',
 'Goa RTI Portal',
 NULL,
 'offline', false,
 'No dedicated online portal — file physically to SPIO; central depts use rtionline.gov.in'),

('Gujarat',
 'Gujarat RTI Portal',
 'https://rti.gujarat.gov.in',
 'online', false,
 NULL),

('Haryana',
 'Haryana RTI Portal',
 'https://rti.haryana.gov.in',
 'online', false,
 NULL),

('Himachal Pradesh',
 'HP RTI Portal',
 'https://rti.hp.gov.in',
 'online', false,
 NULL),

('Jharkhand',
 'Jharkhand RTI Portal',
 'https://rti.jharkhand.gov.in',
 'online', false,
 NULL),

('Karnataka',
 'Karnataka RTI Online',
 'https://rtionline.karnataka.gov.in',
 'online', false,
 NULL),

('Kerala',
 'Kerala RTI Portal',
 'https://rti.kerala.gov.in',
 'online', false,
 NULL),

('Madhya Pradesh',
 'MP RTI Portal',
 'https://rti.mp.gov.in',
 'online', false,
 NULL),

('Maharashtra',
 'Maharashtra RTI Portal',
 'https://rti.maharashtra.gov.in',
 'online', false,
 NULL),

('Manipur',
 'Manipur RTI Portal',
 NULL,
 'offline', false,
 'No dedicated online portal — file physically to SPIO'),

('Meghalaya',
 'Meghalaya RTI Portal',
 NULL,
 'offline', false,
 'No dedicated online portal — file physically to SPIO'),

('Mizoram',
 'Mizoram RTI Portal',
 NULL,
 'offline', false,
 'No dedicated online portal — file physically to SPIO'),

('Nagaland',
 'Nagaland RTI Portal',
 NULL,
 'offline', false,
 'No dedicated online portal — file physically to SPIO'),

('Odisha',
 'Odisha RTI Portal',
 'https://rti.odisha.gov.in',
 'online', false,
 NULL),

('Punjab',
 'Punjab RTI Portal',
 'https://rtionline.punjab.gov.in',
 'online', false,
 NULL),

('Rajasthan',
 'Rajasthan RTI Portal',
 'https://rtiraj.nic.in',
 'online', false,
 NULL),

('Sikkim',
 'Sikkim RTI Portal',
 NULL,
 'offline', false,
 'No dedicated online portal — file physically to SPIO'),

('Tamil Nadu',
 'Tamil Nadu RTI Portal',
 'https://rti.tn.gov.in',
 'online', false,
 NULL),

('Telangana',
 'Telangana RTI Portal',
 'https://rti.telangana.gov.in',
 'online', false,
 NULL),

('Tripura',
 'Tripura RTI Portal',
 NULL,
 'offline', false,
 'No dedicated online portal — file physically to SPIO'),

('Uttar Pradesh',
 'UP RTI Portal',
 'https://rti.up.nic.in',
 'online', false,
 NULL),

('Uttarakhand',
 'Uttarakhand RTI Portal',
 'https://rti.uk.gov.in',
 'online', false,
 NULL),

('West Bengal',
 'West Bengal RTI Portal',
 'https://rti.wb.gov.in',
 'online', false,
 NULL),

('Andaman and Nicobar Islands',
 'Andaman RTI',
 NULL,
 'offline', false,
 'Union Territory — use rtionline.gov.in for central depts; local depts file physically'),

('Chandigarh',
 'Chandigarh RTI',
 NULL,
 'hybrid', false,
 'UT; use rtionline.gov.in for central depts; local departments require physical filing'),

('Dadra and Nagar Haveli and Daman and Diu',
 'DNHDD RTI',
 NULL,
 'offline', false,
 'UT; file via rtionline.gov.in for central or physically to local SPIO'),

('Jammu and Kashmir',
 'J&K RTI Portal',
 'https://rti.jk.gov.in',
 'online', false,
 NULL),

('Ladakh',
 'Ladakh RTI',
 NULL,
 'offline', false,
 'UT; file physically to SPIO of concerned department'),

('Lakshadweep',
 'Lakshadweep RTI',
 NULL,
 'offline', false,
 'Union Territory — file physically to SPIO'),

('Puducherry',
 'Puducherry RTI Portal',
 'https://rti.py.gov.in',
 'online', false,
 NULL)

ON CONFLICT (state) DO NOTHING;
