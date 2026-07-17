-- ================================================================
-- TutorSpace: Add Parent Role & Relations
-- Run this in Supabase Dashboard ? SQL Editor ? New Query
-- ================================================================

-- 1. Add 'parent' to the real column type before using it. Existing projects
-- may use a PostgreSQL enum (for example public.user_role), where changing a
-- CHECK constraint alone does not add the enum value.
DO $$
DECLARE
  role_type regtype;
BEGIN
  SELECT a.atttypid::regtype INTO role_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'users' AND a.attname = 'role'
    AND a.attnum > 0 AND NOT a.attisdropped;
  IF role_type IS NOT NULL
    AND EXISTS (SELECT 1 FROM pg_type WHERE oid = role_type AND typtype = 'e')
    AND NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = role_type AND enumlabel = 'parent') THEN
    EXECUTE format('ALTER TYPE %s ADD VALUE %L', role_type, 'parent');
  END IF;
END $$;

-- Keep TEXT-based installations compatible too.
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IS NULL OR role::text IN ('teacher', 'student', 'parent'));
-- 2. Create parent_relations table (many-to-many between parent and student)
CREATE TABLE IF NOT EXISTS public.parent_relations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, student_id)
);

-- Private, random, single-use parent invites. UUID-based links can be forwarded
-- indefinitely; these expire after one day and can be redeemed only once.
CREATE TABLE IF NOT EXISTS public.parent_invites (
  token TEXT PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  claimed_at TIMESTAMPTZ,
  claimed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  CHECK (expires_at > created_at)
);
-- 3. Enable RLS on parent_relations
ALTER TABLE public.parent_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_invites ENABLE ROW LEVEL SECURITY;

-- 4. Helper function: check if current user is parent of target student
CREATE OR REPLACE FUNCTION public.is_parent_of(target_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parent_relations pr
    WHERE pr.parent_id = public.current_app_user_id()
      AND pr.student_id = target_student_id
  )
$$;

-- 5. Helper function: check if current user is a parent
CREATE OR REPLACE FUNCTION public.current_user_is_parent()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.current_app_role() = 'parent'
$$;

-- 6. RLS Policies for parent_relations
-- Parents can read their own relations
DROP POLICY IF EXISTS parent_relations_read_own ON public.parent_relations;
CREATE POLICY parent_relations_read_own ON public.parent_relations
FOR SELECT USING (
  parent_id = public.current_app_user_id()
  AND public.current_user_is_parent()
);

-- Service role manages relations (for bot registration)
DROP POLICY IF EXISTS parent_relations_service ON public.parent_relations;
CREATE POLICY parent_relations_service ON public.parent_relations
FOR ALL USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS parent_invites_service ON public.parent_invites;
CREATE POLICY parent_invites_service ON public.parent_invites
FOR ALL USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 7. RLS Policies: USERS table - parents can read their children's profiles
DROP POLICY IF EXISTS users_read_related ON public.users;
CREATE POLICY users_read_related ON public.users
FOR SELECT USING (
  id = public.current_app_user_id()
  OR EXISTS (
    SELECT 1
    FROM public.groups g
    WHERE g.teacher_id = public.current_app_user_id()
      AND (
        users.id = g.teacher_id
        OR EXISTS (
          SELECT 1 FROM public.group_members gm
          WHERE gm.group_id = g.id AND gm.student_id = users.id
        )
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.group_members my_membership
    JOIN public.groups g ON g.id = my_membership.group_id
    WHERE my_membership.student_id = public.current_app_user_id()
      AND (
        users.id = g.teacher_id
        OR EXISTS (
          SELECT 1 FROM public.group_members peer
          WHERE peer.group_id = g.id AND peer.student_id = users.id
        )
      )
  )
  -- Parent access to their children
  OR EXISTS (
    SELECT 1
    FROM public.parent_relations pr
    WHERE pr.parent_id = public.current_app_user_id()
      AND pr.student_id = users.id
  )
);

-- 8. RLS Policies: GROUPS table - parents can read groups their children are in
DROP POLICY IF EXISTS groups_read_owned_or_joined ON public.groups;
CREATE POLICY groups_read_owned_or_joined ON public.groups
FOR SELECT USING (
  teacher_id = public.current_app_user_id()
  OR public.is_group_student(id)
  -- Parent access: groups where their child is a member
  OR EXISTS (
    SELECT 1
    FROM public.group_members gm
    JOIN public.parent_relations pr ON pr.student_id = gm.student_id
    WHERE gm.group_id = groups.id
      AND pr.parent_id = public.current_app_user_id()
  )
);

-- 9. RLS Policies: GROUP_MEMBERS table - parents can read their children's memberships
DROP POLICY IF EXISTS group_members_read_owned_or_self ON public.group_members;
CREATE POLICY group_members_read_owned_or_self ON public.group_members
FOR SELECT USING (
  student_id = public.current_app_user_id()
  OR public.is_group_teacher(group_id)
  -- Parent access
  OR EXISTS (
    SELECT 1
    FROM public.parent_relations pr
    WHERE pr.parent_id = public.current_app_user_id()
      AND pr.student_id = group_members.student_id
  )
);

-- 10. RLS Policies: SESSIONS table - parents can read sessions for their children's groups
DROP POLICY IF EXISTS sessions_read_owned_or_joined ON public.sessions;
CREATE POLICY sessions_read_owned_or_joined ON public.sessions
FOR SELECT USING (
  public.is_group_teacher(group_id)
  OR public.is_group_student(group_id)
  -- Parent access: sessions in groups where their child is a member
  OR EXISTS (
    SELECT 1
    FROM public.group_members gm
    JOIN public.parent_relations pr ON pr.student_id = gm.student_id
    WHERE gm.group_id = sessions.group_id
      AND pr.parent_id = public.current_app_user_id()
  )
);

-- 11. RLS Policies: ATTENDANCE table - parents can read their children's attendance
DROP POLICY IF EXISTS attendance_read_related ON public.attendance;
CREATE POLICY attendance_read_related ON public.attendance
FOR SELECT USING (
  student_id = public.current_app_user_id()
  OR EXISTS (
    SELECT 1
    FROM public.sessions s
    WHERE s.id = attendance.session_id
      AND public.is_group_teacher(s.group_id)
  )
  -- Parent access
  OR EXISTS (
    SELECT 1
    FROM public.parent_relations pr
    WHERE pr.parent_id = public.current_app_user_id()
      AND pr.student_id = attendance.student_id
  )
);

-- 12. RLS Policies: PAYMENTS table - parents can read their children's payments
DROP POLICY IF EXISTS payments_read_related ON public.payments;
CREATE POLICY payments_read_related ON public.payments
FOR SELECT USING (
  student_id = public.current_app_user_id()
  OR teacher_id = public.current_app_user_id()
  -- Parent access
  OR EXISTS (
    SELECT 1
    FROM public.parent_relations pr
    WHERE pr.parent_id = public.current_app_user_id()
      AND pr.student_id = payments.student_id
  )
);

-- 13. RLS Policies: HOMEWORK table - parents can read homework for their children's groups
DROP POLICY IF EXISTS homework_read_owned_or_joined ON public.homework;
CREATE POLICY homework_read_owned_or_joined ON public.homework
FOR SELECT USING (
  public.is_group_teacher(group_id)
  OR public.is_group_student(group_id)
  -- Parent access: homework in groups where their child is a member
  OR EXISTS (
    SELECT 1
    FROM public.group_members gm
    JOIN public.parent_relations pr ON pr.student_id = gm.student_id
    WHERE gm.group_id = homework.group_id
      AND pr.parent_id = public.current_app_user_id()
  )
);

-- 14. RLS Policies: HOMEWORK_SUBMISSIONS table - parents can read their children's submissions
DROP POLICY IF EXISTS homework_submissions_read_related ON public.homework_submissions;
CREATE POLICY homework_submissions_read_related ON public.homework_submissions
FOR SELECT USING (
  student_id = public.current_app_user_id()
  OR EXISTS (
    SELECT 1
    FROM public.homework h
    WHERE h.id = homework_submissions.homework_id
      AND public.is_group_teacher(h.group_id)
  )
  -- Parent access
  OR EXISTS (
    SELECT 1
    FROM public.parent_relations pr
    WHERE pr.parent_id = public.current_app_user_id()
      AND pr.student_id = homework_submissions.student_id
  )
);

-- 15. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_parent_relations_parent ON public.parent_relations(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_relations_student ON public.parent_relations(student_id);
CREATE INDEX IF NOT EXISTS idx_parent_invites_active ON public.parent_invites(student_id, expires_at) WHERE claimed_at IS NULL;