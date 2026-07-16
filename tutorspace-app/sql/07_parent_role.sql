-- 1. Drop existing role constraint if it exists and create new one containing 'parent'
DO $$
DECLARE
    r RECORD;
END $$;
-- Wait, let's write a standard PL/pgSQL block to safely search and drop the constraint:
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.users'::regclass 
          AND contype = 'c' 
          AND (conname LIKE '%role%' OR pg_get_constraintdef(oid) LIKE '%role%')
    LOOP
        EXECUTE 'ALTER TABLE public.users DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('teacher', 'student', 'parent'));

-- 2. Create parent_relations table
CREATE TABLE IF NOT EXISTS public.parent_relations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(parent_id, student_id)
);

-- Enable RLS
ALTER TABLE public.parent_relations ENABLE ROW LEVEL SECURITY;

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
    USING (true)
    WITH CHECK (true);

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
