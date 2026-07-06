-- Secure RLS Policies for TutorSpace
-- Replace "true" policies with row-level restrictions

-- 1. Users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public users" ON users;
CREATE POLICY "Users can view their own profile and teachers can view their students" 
ON users FOR SELECT 
USING (
  auth.uid() = id OR 
  auth.uid() IN (
    SELECT teacher_id FROM groups WHERE id IN (
      SELECT group_id FROM group_members WHERE student_id = users.id
    )
  )
);
CREATE POLICY "Users can update their own profile" 
ON users FOR UPDATE 
USING (auth.uid() = id);

-- 2. Groups table
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public groups" ON groups;
CREATE POLICY "Teachers can manage their groups" 
ON groups FOR ALL 
USING (auth.uid() = teacher_id);
CREATE POLICY "Students can view their enrolled groups" 
ON groups FOR SELECT 
USING (
  id IN (SELECT group_id FROM group_members WHERE student_id = auth.uid())
);

-- 3. Group Members
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public group members" ON group_members;
CREATE POLICY "Teachers can manage members of their groups" 
ON group_members FOR ALL 
USING (
  group_id IN (SELECT id FROM groups WHERE teacher_id = auth.uid())
);
CREATE POLICY "Students can view their own memberships" 
ON group_members FOR SELECT 
USING (student_id = auth.uid());

-- 4. Sessions
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public sessions" ON sessions;
CREATE POLICY "Teachers manage sessions for their groups" 
ON sessions FOR ALL 
USING (
  group_id IN (SELECT id FROM groups WHERE teacher_id = auth.uid())
);
CREATE POLICY "Students view sessions for their groups" 
ON sessions FOR SELECT 
USING (
  group_id IN (SELECT group_id FROM group_members WHERE student_id = auth.uid())
);

-- 5. Attendance
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public attendance" ON attendance;
CREATE POLICY "Teachers manage attendance for their groups" 
ON attendance FOR ALL 
USING (
  session_id IN (
    SELECT id FROM sessions WHERE group_id IN (
      SELECT id FROM groups WHERE teacher_id = auth.uid()
    )
  )
);
CREATE POLICY "Students view their own attendance" 
ON attendance FOR SELECT 
USING (student_id = auth.uid());

-- 6. Payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public payments" ON payments;
CREATE POLICY "Teachers manage payments" 
ON payments FOR ALL 
USING (teacher_id = auth.uid());
CREATE POLICY "Students view their own payments" 
ON payments FOR SELECT 
USING (student_id = auth.uid());

-- 7. Homework
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public homework" ON homework;
CREATE POLICY "Teachers manage homework" 
ON homework FOR ALL 
USING (
  group_id IN (SELECT id FROM groups WHERE teacher_id = auth.uid())
);
CREATE POLICY "Students view homework for their groups" 
ON homework FOR SELECT 
USING (
  group_id IN (SELECT group_id FROM group_members WHERE student_id = auth.uid())
);

-- 8. Homework Submissions
ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public submissions" ON homework_submissions;
CREATE POLICY "Teachers manage submissions for their groups" 
ON homework_submissions FOR ALL 
USING (
  homework_id IN (
    SELECT id FROM homework WHERE group_id IN (
      SELECT id FROM groups WHERE teacher_id = auth.uid()
    )
  )
);
CREATE POLICY "Students manage their own submissions" 
ON homework_submissions FOR ALL 
USING (student_id = auth.uid());
