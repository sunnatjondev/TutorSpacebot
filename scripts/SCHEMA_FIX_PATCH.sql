-- ================================================================
-- TutorSpace — Schema Fix Patch
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- Fixes: role CHECK, homework column name, submission status, nullable subject
-- ================================================================

-- 1. Add 'parent' to users.role CHECK constraint
-- Drop old constraint, add new one with 'parent'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('teacher', 'student', 'parent'));

-- 2. Rename homework.due_date → due_at (matches all application code)
-- Only runs if the old column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'homework' AND column_name = 'due_date'
  ) THEN
    ALTER TABLE public.homework RENAME COLUMN due_date TO due_at;
  END IF;
END $$;

-- 3. Add 'done' to homework_submissions.status CHECK constraint
ALTER TABLE public.homework_submissions DROP CONSTRAINT IF EXISTS homework_submissions_status_check;
ALTER TABLE public.homework_submissions ADD CONSTRAINT homework_submissions_status_check
  CHECK (status IN ('pending', 'submitted', 'done', 'graded'));

-- 4. Make groups.subject nullable (app sends null when subject is omitted)
ALTER TABLE public.groups ALTER COLUMN subject DROP NOT NULL;

-- 5. Add unique constraint on payments to prevent duplicate billing rows
-- (prevents auto-billing from creating duplicates in race conditions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payments_student_group_period_unique'
  ) THEN
    -- Remove any existing duplicates first (keep the earliest one)
    DELETE FROM public.payments p1
    USING public.payments p2
    WHERE p1.student_id = p2.student_id
      AND p1.group_id = p2.group_id
      AND p1.period_month = p2.period_month
      AND p1.period_year = p2.period_year
      AND p1.created_at > p2.created_at;

    ALTER TABLE public.payments
      ADD CONSTRAINT payments_student_group_period_unique
      UNIQUE (student_id, group_id, period_month, period_year);
  END IF;
END $$;

-- 6. Add index for session generation dedup queries
CREATE INDEX IF NOT EXISTS idx_sessions_group_scheduled
  ON public.sessions(group_id, scheduled_at);

-- Done!
SELECT 'SCHEMA_FIX_PATCH applied successfully' AS result;
