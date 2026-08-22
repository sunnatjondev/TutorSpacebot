-- ================================================================
-- TutorSpace — Schema Fix Patch
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- Fixes: role CHECK, homework column name, nullable subject, payment unique constraint
-- ================================================================

-- 1. Add 'parent' to users.role CHECK constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('teacher', 'student', 'parent'));

-- 2. Ensure homework due_at column exists
ALTER TABLE public.homework ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;

-- 3. Make groups.subject nullable (app allows null when subject is omitted)
ALTER TABLE public.groups ALTER COLUMN subject DROP NOT NULL;

-- 4. Clean duplicate payment records before applying unique constraint
DELETE FROM public.payments p1
USING public.payments p2
WHERE p1.student_id = p2.student_id
  AND p1.group_id = p2.group_id
  AND p1.period_month = p2.period_month
  AND p1.period_year = p2.period_year
  AND p1.created_at > p2.created_at;

-- 5. Add unique constraint on payments to prevent duplicate billing rows
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_student_group_period_unique;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_student_group_period_unique
  UNIQUE (student_id, group_id, period_month, period_year);

-- 6. Add index for session generation queries
CREATE INDEX IF NOT EXISTS idx_sessions_group_scheduled
  ON public.sessions(group_id, scheduled_at);

-- Done!
SELECT 'SCHEMA_FIX_PATCH applied successfully' AS result;
