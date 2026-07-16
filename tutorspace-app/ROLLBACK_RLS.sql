-- ================================================================
-- ROLLBACK: Restore anon access while backend is not yet deployed
-- ================================================================
-- Run this in Supabase SQL Editor to restore app functionality
-- until the trusted backend (VITE_BACKEND_URL) is deployed.

-- Re-create permissive anon policies for each table
-- (these allow the anon key full access — same as before the RLS migration)

-- USERS
drop policy if exists users_read_related on public.users;
drop policy if exists users_insert_self on public.users;
drop policy if exists users_update_self on public.users;
create policy "Allow all for anon" on public.users
  for all using (true) with check (true);

-- GROUPS
drop policy if exists groups_read_owned_or_joined on public.groups;
drop policy if exists groups_teacher_insert on public.groups;
drop policy if exists groups_teacher_update on public.groups;
drop policy if exists groups_teacher_delete on public.groups;
create policy "Allow all for anon" on public.groups
  for all using (true) with check (true);

-- GROUP_MEMBERS
drop policy if exists group_members_read_owned_or_self on public.group_members;
drop policy if exists group_members_teacher_manage on public.group_members;
create policy "Allow all for anon" on public.group_members
  for all using (true) with check (true);

-- SESSIONS
drop policy if exists sessions_read_owned_or_joined on public.sessions;
drop policy if exists sessions_teacher_manage on public.sessions;
create policy "Allow all for anon" on public.sessions
  for all using (true) with check (true);

-- ATTENDANCE
drop policy if exists attendance_read_related on public.attendance;
drop policy if exists attendance_teacher_manage on public.attendance;
create policy "Allow all for anon" on public.attendance
  for all using (true) with check (true);

-- PAYMENTS
drop policy if exists payments_read_related on public.payments;
drop policy if exists payments_teacher_manage on public.payments;
create policy "Allow all for anon" on public.payments
  for all using (true) with check (true);

-- HOMEWORK
drop policy if exists homework_read_owned_or_joined on public.homework;
drop policy if exists homework_teacher_manage on public.homework;
create policy "Allow all for anon" on public.homework
  for all using (true) with check (true);

-- HOMEWORK_SUBMISSIONS
drop policy if exists homework_submissions_read_related on public.homework_submissions;
drop policy if exists homework_submissions_student_update on public.homework_submissions;
drop policy if exists homework_submissions_teacher_manage on public.homework_submissions;
create policy "Allow all for anon" on public.homework_submissions
  for all using (true) with check (true);

-- Also remove the trigger that blocks client role changes
-- (since without backend, the client needs to set roles directly)
drop trigger if exists users_block_client_role_change on public.users;
