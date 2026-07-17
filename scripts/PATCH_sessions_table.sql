-- ================================================================
-- PATCH: Create missing 'sessions' table
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ================================================================

CREATE TABLE IF NOT EXISTS sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id        UUID REFERENCES groups(id) ON DELETE CASCADE,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  duration_min    INT DEFAULT 90,
  status          TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'done', 'cancelled')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON sessions;
DROP POLICY IF EXISTS "Service role manages sessions" ON sessions;
CREATE POLICY "Service role manages sessions" ON sessions FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Verify all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
