-- Add the enum value before assigning it to users.role.
DO $$
DECLARE role_type regtype;
BEGIN
  SELECT a.atttypid::regtype INTO role_type
  FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'users' AND a.attname = 'role'
    AND a.attnum > 0 AND NOT a.attisdropped;
  IF role_type IS NOT NULL
    AND EXISTS (SELECT 1 FROM pg_type WHERE oid = role_type AND typtype = 'e')
    AND NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = role_type AND enumlabel = 'parent') THEN
    EXECUTE format('ALTER TYPE %s ADD VALUE %L', role_type, 'parent');
  END IF;
END $$;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IS NULL OR role::text IN ('teacher', 'student', 'parent'));
-- 2. Create parent_relations table
CREATE TABLE IF NOT EXISTS public.parent_relations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(parent_id, student_id)
);

-- Private, random, single-use parent invitations. The bot creates and redeems
-- these with service_role; links expire after 24 hours.
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
-- Enable RLS
ALTER TABLE public.parent_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_invites ENABLE ROW LEVEL SECURITY;

-- 3. Policies for parent_relations
DROP POLICY IF EXISTS "Parents can view their own child relations" ON public.parent_relations;
CREATE POLICY "Parents can view their own child relations"
    ON public.parent_relations FOR SELECT
    USING (auth.uid() = parent_id);

DROP POLICY IF EXISTS "Students can view their parent relations" ON public.parent_relations;
CREATE POLICY "Students can view their parent relations"
    ON public.parent_relations FOR SELECT
    USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Teachers can view parent relations of their students" ON public.parent_relations;
CREATE POLICY "Teachers can view parent relations of their students"
    ON public.parent_relations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members gm
            JOIN public.groups g ON gm.group_id = g.id
            WHERE gm.student_id = parent_relations.student_id
            AND g.teacher_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Service role can manage relations" ON public.parent_relations;
CREATE POLICY "Service role can manage relations"
    ON public.parent_relations FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage parent invites" ON public.parent_invites;
CREATE POLICY "Service role can manage parent invites"
    ON public.parent_invites FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
-- 4. Update existing RLS policies to allow SELECT access for parents to view children's data

-- Users
DROP POLICY IF EXISTS "Parents can view children profile" ON public.users;
CREATE POLICY "Parents can view children profile"
    ON public.users FOR SELECT
    USING (id IN (SELECT student_id FROM public.parent_relations WHERE parent_id = auth.uid()));

-- Attendance
DROP POLICY IF EXISTS "Parents can view children attendance" ON public.attendance;
CREATE POLICY "Parents can view children attendance"
    ON public.attendance FOR SELECT
    USING (student_id IN (SELECT student_id FROM public.parent_relations WHERE parent_id = auth.uid()));

-- Payments
DROP POLICY IF EXISTS "Parents can view children payments" ON public.payments;
CREATE POLICY "Parents can view children payments"
    ON public.payments FOR SELECT
    USING (student_id IN (SELECT student_id FROM public.parent_relations WHERE parent_id = auth.uid()));

-- Homework Submissions
DROP POLICY IF EXISTS "Parents can view children homework submissions" ON public.homework_submissions;
CREATE POLICY "Parents can view children homework submissions"
    ON public.homework_submissions FOR SELECT
    USING (student_id IN (SELECT student_id FROM public.parent_relations WHERE parent_id = auth.uid()));

-- Groups
DROP POLICY IF EXISTS "Parents can view children groups" ON public.groups;
CREATE POLICY "Parents can view children groups"
    ON public.groups FOR SELECT
    USING (id IN (
        SELECT group_id FROM public.group_members 
        WHERE student_id IN (SELECT student_id FROM public.parent_relations WHERE parent_id = auth.uid())
    ));

-- Group Members
DROP POLICY IF EXISTS "Parents can view children group members" ON public.group_members;
CREATE POLICY "Parents can view children group members"
    ON public.group_members FOR SELECT
    USING (student_id IN (SELECT student_id FROM public.parent_relations WHERE parent_id = auth.uid()));

-- Sessions
DROP POLICY IF EXISTS "Parents can view children sessions" ON public.sessions;
CREATE POLICY "Parents can view children sessions"
    ON public.sessions FOR SELECT
    USING (group_id IN (
        SELECT group_id FROM public.group_members 
        WHERE student_id IN (SELECT student_id FROM public.parent_relations WHERE parent_id = auth.uid())
    ));

-- Homework
DROP POLICY IF EXISTS "Parents can view children homework" ON public.homework;
CREATE POLICY "Parents can view children homework"
    ON public.homework FOR SELECT
    USING (group_id IN (
        SELECT group_id FROM public.group_members 
        WHERE student_id IN (SELECT student_id FROM public.parent_relations WHERE parent_id = auth.uid())
    ));
CREATE INDEX IF NOT EXISTS idx_parent_invites_active ON public.parent_invites(student_id, expires_at) WHERE claimed_at IS NULL;
