-- ================================================================
-- PERFORMANCE INDEXES for TutorSpace
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ================================================================

-- Payments: Teacher dashboard queries (filter by status, period)
CREATE INDEX IF NOT EXISTS idx_payments_teacher_status_period 
ON payments(teacher_id, status, period_year, period_month);

-- Payments: Student payment history
CREATE INDEX IF NOT EXISTS idx_payments_student_status 
ON payments(student_id, status);

-- Sessions: Teacher schedule queries
CREATE INDEX IF NOT EXISTS idx_sessions_group_scheduled_status 
ON sessions(group_id, scheduled_at, status);

-- Sessions: Find upcoming sessions for a group
CREATE INDEX IF NOT EXISTS idx_sessions_group_upcoming 
ON sessions(group_id, scheduled_at) 
WHERE status IN ('upcoming', 'ongoing');

-- Attendance: Teacher dashboard stats
CREATE INDEX IF NOT EXISTS idx_attendance_session_present 
ON attendance(session_id, present);

-- Group members: Student lookup in group
CREATE INDEX IF NOT EXISTS idx_group_members_student_group 
ON group_members(student_id, group_id);

-- Homework submissions: Student homework list
CREATE INDEX IF NOT EXISTS idx_homework_submissions_student 
ON homework_submissions(student_id, status);

-- Homework: Group homework with due dates
CREATE INDEX IF NOT EXISTS idx_homework_group_due 
ON homework(group_id, due_at) 
WHERE due_at IS NOT NULL;

-- Billing transactions: Teacher billing history
CREATE INDEX IF NOT EXISTS idx_billing_transactions_teacher_status 
ON billing_transactions(teacher_id, status, created_at);

-- Users: Telegram ID lookups (already unique, but good for reference)
-- ALTER TABLE users ADD CONSTRAINT users_telegram_id_key UNIQUE (telegram_id);

-- Groups: Teacher's groups
CREATE INDEX IF NOT EXISTS idx_groups_teacher 
ON groups(teacher_id);

-- Subscriptions: Active subscription lookup
CREATE INDEX IF NOT EXISTS idx_subscriptions_teacher_active 
ON subscriptions(teacher_id, status, expires_at) 
WHERE status IN ('active', 'trial');

-- Bot notification events: Cleanup old entries
CREATE INDEX IF NOT EXISTS idx_bot_notification_events_sent_at 
ON bot_notification_events(sent_at);

-- ================================================================
-- VERIFICATION QUERIES (run after creating indexes)
-- ================================================================
-- Check all indexes exist
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('payments', 'sessions', 'attendance', 'group_members', 
                    'homework_submissions', 'homework', 'billing_transactions',
                    'users', 'groups', 'subscriptions', 'bot_notification_events')
ORDER BY tablename, indexname;

-- Check index sizes
SELECT 
  schemaname,
  relname as tablename,
  indexrelname as indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
