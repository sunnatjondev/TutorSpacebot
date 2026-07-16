-- ================================================================
-- FIX: "relation supabase_migrations.schema_migrations does not exist"
-- Run this FIRST in Supabase Dashboard → SQL Editor → New Query
-- ================================================================

-- Create the missing migration tracking schema
CREATE SCHEMA IF NOT EXISTS supabase_migrations;

CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version   text NOT NULL PRIMARY KEY,
  statements text[],
  name      text
);

-- ================================================================
-- Then create the missing sessions table
-- ================================================================

CREATE TABLE IF NOT EXISTS sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID REFERENCES groups(id) ON DELETE CASCADE,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  duration_min    INT DEFAULT 90,
  status          TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'done', 'cancelled')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for anon" ON sessions;
CREATE POLICY "Allow all for anon" ON sessions FOR ALL USING (true) WITH CHECK (true);

-- ================================================================
-- Verify everything looks good
-- ================================================================
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) AS columns
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;
