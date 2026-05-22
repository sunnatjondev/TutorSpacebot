-- TutorSpace real-data migration
-- Run this once in Supabase SQL Editor.

create extension if not exists "uuid-ossp";

alter table public.users
  alter column telegram_id type bigint using telegram_id::bigint;

alter table public.users
  alter column telegram_id set not null;

alter table public.users
  drop constraint if exists users_telegram_id_key;

alter table public.users
  add constraint users_telegram_id_key unique (telegram_id);

alter table public.groups
  add column if not exists color text default 'purple';

alter table public.groups
  add column if not exists price_per_month bigint default 0;

alter table public.groups
  add column if not exists billing_day int default 1;

alter table public.groups
  add column if not exists telegram_group_link text;

alter table public.homework_submissions
  add column if not exists done boolean default false;

alter table public.homework_submissions
  add column if not exists done_at timestamptz;

alter table public.homework_submissions
  add column if not exists created_at timestamptz default now();

alter table public.group_members
  drop constraint if exists group_members_group_id_student_id_key;

alter table public.group_members
  add constraint group_members_group_id_student_id_key unique (group_id, student_id);

alter table public.attendance
  drop constraint if exists attendance_session_id_student_id_key;

alter table public.attendance
  add constraint attendance_session_id_student_id_key unique (session_id, student_id);

alter table public.homework_submissions
  drop constraint if exists homework_submissions_homework_id_student_id_key;

alter table public.homework_submissions
  add constraint homework_submissions_homework_id_student_id_key unique (homework_id, student_id);

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'payments_status_check'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments drop constraint payments_status_check;
  end if;
end $$;

alter table public.payments
  add constraint payments_status_check
  check (status in ('unpaid', 'partial', 'paid', 'pending'));

create index if not exists idx_users_telegram_id on public.users(telegram_id);
create index if not exists idx_groups_teacher_id on public.groups(teacher_id);
create index if not exists idx_group_members_group_id on public.group_members(group_id);
create index if not exists idx_group_members_student_id on public.group_members(student_id);
create index if not exists idx_sessions_group_id on public.sessions(group_id);
create index if not exists idx_sessions_scheduled_at on public.sessions(scheduled_at);
create index if not exists idx_attendance_session_id on public.attendance(session_id);
create index if not exists idx_attendance_student_id on public.attendance(student_id);
create index if not exists idx_payments_group_id on public.payments(group_id);
create index if not exists idx_payments_teacher_id on public.payments(teacher_id);
create index if not exists idx_payments_student_id on public.payments(student_id);
create index if not exists idx_homework_submissions_student_id on public.homework_submissions(student_id);
create index if not exists idx_homework_submissions_homework_id on public.homework_submissions(homework_id);

alter table public.users enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.sessions enable row level security;
alter table public.attendance enable row level security;
alter table public.payments enable row level security;
alter table public.homework enable row level security;
alter table public.homework_submissions enable row level security;

drop policy if exists "Allow all for anon" on public.users;
drop policy if exists "Allow all for anon" on public.groups;
drop policy if exists "Allow all for anon" on public.group_members;
drop policy if exists "Allow all for anon" on public.sessions;
drop policy if exists "Allow all for anon" on public.attendance;
drop policy if exists "Allow all for anon" on public.payments;
drop policy if exists "Allow all for anon" on public.homework;
drop policy if exists "Allow all for anon" on public.homework_submissions;

drop policy if exists allow_all_users on public.users;
drop policy if exists allow_all_groups on public.groups;
drop policy if exists allow_all_group_members on public.group_members;
drop policy if exists allow_all_sessions on public.sessions;
drop policy if exists allow_all_attendance on public.attendance;
drop policy if exists allow_all_payments on public.payments;
drop policy if exists allow_all_homework on public.homework;
drop policy if exists allow_all_homework_submissions on public.homework_submissions;

create policy allow_all_users on public.users
for all using (true) with check (true);

create policy allow_all_groups on public.groups
for all using (true) with check (true);

create policy allow_all_group_members on public.group_members
for all using (true) with check (true);

create policy allow_all_sessions on public.sessions
for all using (true) with check (true);

create policy allow_all_attendance on public.attendance
for all using (true) with check (true);

create policy allow_all_payments on public.payments
for all using (true) with check (true);

create policy allow_all_homework on public.homework
for all using (true) with check (true);

create policy allow_all_homework_submissions on public.homework_submissions
for all using (true) with check (true);
