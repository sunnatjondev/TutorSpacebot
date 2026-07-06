-- 1. Create student_badges table
CREATE TABLE IF NOT EXISTS public.student_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    badge_type TEXT NOT NULL, -- e.g., 'perfect_attendance', 'hw_master', 'early_bird'
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(student_id, badge_type)
);

-- Enable RLS
ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;

-- 2. Policies for student_badges
-- Students can see their own badges
CREATE POLICY "Students can view their own badges"
    ON public.student_badges FOR SELECT
    USING (auth.uid() = student_id);

-- Teachers can see badges of their students
CREATE POLICY "Teachers can view their students badges"
    ON public.student_badges FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM group_members gm
            JOIN groups g ON gm.group_id = g.id
            WHERE gm.student_id = student_badges.student_id
            AND g.teacher_id = auth.uid()
        )
    );

-- Allow service role to insert (for crons)
CREATE POLICY "Service role can insert badges"
    ON public.student_badges FOR INSERT
    WITH CHECK (true);
