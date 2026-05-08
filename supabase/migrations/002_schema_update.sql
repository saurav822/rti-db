-- ============================================================
-- OpenRTI — Schema Update (Migration 002)
-- Run this in your Supabase SQL editor
-- ============================================================

-- ============================================================
-- 1. Simplify response_status to 3 values
-- ============================================================
ALTER TABLE rti_entries DROP CONSTRAINT IF EXISTS rti_entries_response_status_check;

UPDATE rti_entries SET response_status = 'full_response'    WHERE response_status = 'responded';
UPDATE rti_entries SET response_status = 'partial_response' WHERE response_status = 'partial';
UPDATE rti_entries SET response_status = 'no_response'      WHERE response_status IN ('pending','rejected','appealed');

ALTER TABLE rti_entries
  ADD CONSTRAINT rti_entries_response_status_check
  CHECK (response_status IN ('full_response','partial_response','no_response'));

ALTER TABLE rti_entries
  ALTER COLUMN response_status SET DEFAULT 'no_response';

-- ============================================================
-- 2. Add response_tables column for structured table extraction
-- ============================================================
ALTER TABLE rti_entries
  ADD COLUMN IF NOT EXISTS response_tables jsonb;

-- ============================================================
-- 3. Departments table (auto-discovered from uploaded RTIs)
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  state text NOT NULL,        -- state name or 'Central'
  avg_rating float DEFAULT 0,
  rating_count integer DEFAULT 0,
  rti_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(name, state)
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read departments" ON departments FOR SELECT USING (true);
CREATE POLICY "Service insert departments" ON departments FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update departments" ON departments FOR UPDATE USING (true);

-- ============================================================
-- 4. Department ratings
-- ============================================================
CREATE TABLE IF NOT EXISTS department_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rti_id uuid REFERENCES rti_entries(id),
  rating integer CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz DEFAULT now(),
  UNIQUE(department_id, user_id)
);

ALTER TABLE department_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read ratings" ON department_ratings FOR SELECT USING (true);
CREATE POLICY "Anyone insert rating" ON department_ratings FOR INSERT WITH CHECK (true);
CREATE POLICY "Owner update rating" ON department_ratings FOR UPDATE USING (true);

-- ============================================================
-- 5. "This helped" votes
-- ============================================================
CREATE TABLE IF NOT EXISTS rti_helpful (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rti_id uuid REFERENCES rti_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(rti_id, user_id)
);

ALTER TABLE rti_helpful ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read helpful" ON rti_helpful FOR SELECT USING (true);
CREATE POLICY "Anyone insert helpful" ON rti_helpful FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone delete helpful" ON rti_helpful FOR DELETE USING (true);

-- ============================================================
-- 6. Discussion comments
-- ============================================================
CREATE TABLE IF NOT EXISTS rti_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rti_id uuid REFERENCES rti_entries(id) ON DELETE CASCADE,
  user_id uuid,
  display_name text,
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rti_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read comments" ON rti_comments FOR SELECT USING (true);
CREATE POLICY "Anyone insert comment" ON rti_comments FOR INSERT WITH CHECK (true);

-- ============================================================
-- 7. RPC: update department avg_rating after a new rating
-- ============================================================
CREATE OR REPLACE FUNCTION update_department_avg_rating(dept_id uuid)
RETURNS void LANGUAGE sql AS $$
  UPDATE departments
  SET
    avg_rating = (SELECT AVG(rating) FROM department_ratings WHERE department_id = dept_id),
    rating_count = (SELECT COUNT(*) FROM department_ratings WHERE department_id = dept_id)
  WHERE id = dept_id;
$$;

-- ============================================================
-- 8. RPC: increment department RTI count on new upload
-- ============================================================
CREATE OR REPLACE FUNCTION increment_department_rti_count(dept_name text, dept_state text)
RETURNS void LANGUAGE sql AS $$
  UPDATE departments SET rti_count = rti_count + 1
  WHERE name = dept_name AND state = dept_state;
$$;
