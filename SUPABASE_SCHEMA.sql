-- ================================================================
-- TutorSpace — Supabase Database Schema
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------
-- USERS
-- Synced from Telegram on first login
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_id   BIGINT UNIQUE,
  first_name    TEXT NOT NULL,
  last_name     TEXT,
  username      TEXT,
  photo_url     TEXT,
  role          TEXT CHECK (role IN ('teacher', 'student')),
  language      TEXT DEFAULT 'uz' CHECK (language IN ('uz', 'ru')),
  lesson_reminders_enabled BOOLEAN DEFAULT TRUE,
  payment_alerts_enabled   BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- GROUPS
-- Created by teachers
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS groups (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id          UUID REFERENCES users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  subject             TEXT NOT NULL,
  invite_token        TEXT NOT NULL UNIQUE,
  color               TEXT DEFAULT 'purple',
  price_per_month     BIGINT DEFAULT 0,       -- in UZS (tiyin)
  billing_day         INT DEFAULT 1 CHECK (billing_day BETWEEN 1 AND 31),
  telegram_group_link TEXT,
  schedule_template   JSONB DEFAULT '[]'::jsonb,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- GROUP MEMBERS (enrollment)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id    UUID REFERENCES groups(id) ON DELETE CASCADE,
  student_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, student_id)
);

-- ----------------------------------------------------------------
-- SESSIONS (lessons)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id        UUID REFERENCES groups(id) ON DELETE CASCADE,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  duration_min    INT DEFAULT 90,
  status          TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'done', 'cancelled')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- ATTENDANCE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  UUID REFERENCES sessions(id) ON DELETE CASCADE,
  student_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  present     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);

-- ----------------------------------------------------------------
-- PAYMENTS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  teacher_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  group_id    UUID REFERENCES groups(id) ON DELETE SET NULL,
  amount      BIGINT NOT NULL,               -- in UZS
  status      TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid')),
  method      TEXT CHECK (method IN ('cash', 'card', 'transfer')),
  period_year INT,
  period_month INT,
  note        TEXT,
  paid_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- HOMEWORK
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS homework (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id    UUID REFERENCES groups(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  due_date    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- HOMEWORK SUBMISSIONS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS homework_submissions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  homework_id  UUID REFERENCES homework(id) ON DELETE CASCADE,
  student_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'graded')),
  grade        INT,
  submitted_at TIMESTAMPTZ,
  UNIQUE(homework_id, student_id)
);

-- ----------------------------------------------------------------
-- BOT NOTIFICATION EVENTS
-- Prevents cron reminders from being sent more than once.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bot_notification_events (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type            TEXT NOT NULL,
  entity_id             TEXT NOT NULL,
  recipient_telegram_id BIGINT NOT NULL,
  sent_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_type, entity_id, recipient_telegram_id)
);

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_notification_events ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (you can restrict later when auth is set up):
CREATE POLICY "Allow all for anon" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON group_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON homework FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON homework_submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages notification events" ON bot_notification_events
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_payments_teacher_status_period ON payments(teacher_id, status, period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_payments_student_status ON payments(student_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_group_scheduled_status ON sessions(group_id, scheduled_at, status);
CREATE INDEX IF NOT EXISTS idx_group_members_student_group ON group_members(student_id, group_id);
CREATE INDEX IF NOT EXISTS idx_bot_notification_events_sent_at ON bot_notification_events(sent_at);

-- ================================================================
-- HELPER VIEWS
-- ================================================================

-- Group payment summary (% paid this month)
CREATE OR REPLACE VIEW group_payment_summary AS
SELECT
  g.id AS group_id,
  g.name,
  g.teacher_id,
  COUNT(DISTINCT gm.student_id) AS total_students,
  COUNT(DISTINCT p.student_id) FILTER (WHERE p.status = 'paid' AND p.period_month = EXTRACT(MONTH FROM NOW())) AS paid_students,
  ROUND(
    100.0 * COUNT(DISTINCT p.student_id) FILTER (WHERE p.status = 'paid' AND p.period_month = EXTRACT(MONTH FROM NOW())) /
    NULLIF(COUNT(DISTINCT gm.student_id), 0)
  ) AS paid_percent
FROM groups g
LEFT JOIN group_members gm ON gm.group_id = g.id
LEFT JOIN payments p ON p.group_id = g.id
GROUP BY g.id;

-- ================================================================
-- SEED DATA (optional — for testing)
-- Uncomment and run to populate with sample data
-- ================================================================

/*
INSERT INTO users (telegram_id, first_name, last_name, username, role) VALUES
  (111111111, 'Sarah', 'Chen', 'sarahchen', 'teacher'),
  (222222222, 'Alex', 'Mercer', 'alexmercer', 'student'),
  (333333333, 'Maria', 'Jones', 'mariaj', 'student');
*/
