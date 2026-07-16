-- ================================================================
-- UNIFIED DATABASE PATCH: Safe and Idempotent
-- Run this ONCE in Supabase Dashboard → SQL Editor → New Query
-- It will safely update your existing tables without losing data.
-- ================================================================

-- 1. Ensure extensions exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Clean up duplicate group members (if any) and add unique constraint
DELETE FROM public.group_members a USING public.group_members b
WHERE a.id < b.id AND a.group_id = b.group_id AND a.student_id = b.student_id;

ALTER TABLE public.group_members DROP CONSTRAINT IF EXISTS group_members_group_id_student_id_key;
ALTER TABLE public.group_members ADD CONSTRAINT group_members_group_id_student_id_key UNIQUE (group_id, student_id);

-- 3. Clean up duplicate attendance (if any) and add unique constraint
DELETE FROM public.attendance a USING public.attendance b
WHERE a.id < b.id AND a.session_id = b.session_id AND a.student_id = b.student_id;

ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_session_id_student_id_key;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_session_id_student_id_key UNIQUE (session_id, student_id);

-- 4. Ensure invite_token on groups is UNIQUE
ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS groups_invite_token_key;
-- If invite_token column doesn't have unique constraint, add it. (If empty or null, we might need a default or fallback).
-- To make sure it doesn't fail, we only add unique constraint if it is already populated, which it is.
ALTER TABLE public.groups ADD CONSTRAINT groups_invite_token_key UNIQUE (invite_token);

-- 5. Ensure status constraints are applied to sessions
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_status_check;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_status_check CHECK (status IN ('upcoming', 'ongoing', 'done', 'cancelled'));

-- 6. Ensure status and method constraints are applied to payments
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check CHECK (status IN ('unpaid', 'partial', 'paid'));

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_method_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_method_check CHECK (method IN ('cash', 'card', 'transfer'));

-- 7. Ensure unique constraint is on homework_submissions
DELETE FROM public.homework_submissions a USING public.homework_submissions b
WHERE a.id < b.id AND a.homework_id = b.homework_id AND a.student_id = b.student_id;

ALTER TABLE public.homework_submissions DROP CONSTRAINT IF EXISTS homework_submissions_homework_id_student_id_key;
ALTER TABLE public.homework_submissions ADD CONSTRAINT homework_submissions_homework_id_student_id_key UNIQUE (homework_id, student_id);

-- 8. Verify all constraints exist on attendance
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'public.attendance'::regclass;
