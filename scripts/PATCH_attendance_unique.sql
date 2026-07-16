-- ================================================================
-- BRUTE FORCE PATCH: Fix 'lesson_id' not-null errors in BOTH tables
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ================================================================

-- ── ATTENDANCE TABLE ───────────────────────────────────────────────

-- 1. Ensure correct session_id column exists
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE;

-- 2. Drop NOT NULL from lesson_id so inserts don't crash
ALTER TABLE public.attendance ALTER COLUMN lesson_id DROP NOT NULL;

-- 3. Remove the old column completely
ALTER TABLE public.attendance DROP COLUMN IF EXISTS lesson_id CASCADE;

-- 4. Clean up duplicate rows
DELETE FROM public.attendance a USING public.attendance b
WHERE a.id < b.id 
  AND a.session_id = b.session_id 
  AND a.student_id = b.student_id;

-- 5. Ensure correct UNIQUE constraint
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_session_id_student_id_key;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_session_id_student_id_key UNIQUE (session_id, student_id);

-- ── HOMEWORK TABLE ─────────────────────────────────────────────────

-- 6. Drop NOT NULL from lesson_id in homework so inserts don't crash
ALTER TABLE public.homework ALTER COLUMN lesson_id DROP NOT NULL;

-- 7. Remove lesson_id from homework completely
ALTER TABLE public.homework DROP COLUMN IF EXISTS lesson_id CASCADE;

-- ── RELOAD SUPABASE API SCHEMA CACHE ──────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ── VERIFY ────────────────────────────────────────────────────────
SELECT table_name, column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('attendance', 'homework')
ORDER BY table_name, column_name;



