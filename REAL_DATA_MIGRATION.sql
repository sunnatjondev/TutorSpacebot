-- TutorSpace real-data migration
-- Run this once in Supabase SQL Editor.

create extension if not exists "uuid-ossp";

create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  telegram_id bigint,
  first_name text not null,
  last_name text,
  username text,
  photo_url text,
  role text check (role in ('teacher', 'student')),
  language text default 'uz' check (language in ('uz', 'ru')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.groups (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid references public.users(id) on delete cascade,
  name text not null,
  subject text not null,
  invite_token text not null unique,
  color text default 'purple',
  price_per_month bigint default 0,
  billing_day int default 1,
  telegram_group_link text,
  created_at timestamptz default now()
);

create table if not exists public.group_members (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid references public.groups(id) on delete cascade,
  student_id uuid references public.users(id) on delete cascade,
  joined_at timestamptz default now()
);

create table if not exists public.sessions (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid references public.groups(id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_min int default 90,
  status text default 'upcoming',
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.attendance (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.sessions(id) on delete cascade,
  student_id uuid references public.users(id) on delete cascade,
  present boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.users(id) on delete cascade,
  teacher_id uuid references public.users(id) on delete cascade,
  group_id uuid references public.groups(id) on delete set null,
  amount bigint not null default 0,
  status text default 'unpaid',
  method text,
  period_year int,
  period_month int,
  note text,
  paid_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.homework (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid references public.groups(id) on delete cascade,
  title text not null,
  description text,
  due_date timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.homework_submissions (
  id uuid primary key default uuid_generate_v4(),
  homework_id uuid references public.homework(id) on delete cascade,
  student_id uuid references public.users(id) on delete cascade,
  status text default 'pending',
  grade int,
  submitted_at timestamptz,
  done boolean default false,
  done_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.bot_notification_events (
  id uuid primary key default uuid_generate_v4(),
  event_type text not null,
  entity_id text not null,
  recipient_telegram_id bigint not null,
  sent_at timestamptz not null default now(),
  unique (event_type, entity_id, recipient_telegram_id)
);

alter table public.users
  add column if not exists id uuid default uuid_generate_v4();

alter table public.users
  add column if not exists telegram_id bigint;

alter table public.users
  add column if not exists first_name text;

alter table public.users
  add column if not exists last_name text;

alter table public.users
  add column if not exists username text;

alter table public.users
  add column if not exists photo_url text;

alter table public.users
  add column if not exists role text;

alter table public.users
  add column if not exists language text default 'uz';

alter table public.users
  add column if not exists created_at timestamptz default now();

alter table public.users
  add column if not exists updated_at timestamptz default now();

alter table public.users
  add column if not exists lesson_reminders_enabled boolean default true;

alter table public.users
  add column if not exists payment_alerts_enabled boolean default true;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'telegram_id'
      and data_type <> 'bigint'
  ) then
    if to_regclass('public.subscriptions') is not null then
      drop policy if exists "Teacher can read own subscription" on public.subscriptions;
    end if;

    if to_regclass('public.billing_transactions') is not null then
      drop policy if exists "Teacher can read own transactions" on public.billing_transactions;
      drop policy if exists "Teacher can insert pending transactions" on public.billing_transactions;
    end if;

    alter table public.users
      alter column telegram_id type bigint using telegram_id::bigint;

    if to_regclass('public.subscriptions') is not null then
      create policy "Teacher can read own subscription"
        on public.subscriptions for select to authenticated
        using (teacher_id = (select id from public.users where telegram_id = (auth.jwt() ->> 'telegram_id')::bigint limit 1));
    end if;

    if to_regclass('public.billing_transactions') is not null then
      create policy "Teacher can read own transactions"
        on public.billing_transactions for select to authenticated
        using (teacher_id = (select id from public.users where telegram_id = (auth.jwt() ->> 'telegram_id')::bigint limit 1));

      create policy "Teacher can insert pending transactions"
        on public.billing_transactions for insert to authenticated
        with check (teacher_id = (select id from public.users where telegram_id = (auth.jwt() ->> 'telegram_id')::bigint limit 1) and status = 'pending');
    end if;
  end if;
end $$;

alter table public.users
  alter column telegram_id drop not null;

alter table public.groups
  add column if not exists teacher_id uuid references public.users(id) on delete cascade;

alter table public.groups
  add column if not exists name text;

alter table public.groups
  add column if not exists subject text;

alter table public.groups
  add column if not exists invite_token text;

alter table public.groups
  add column if not exists color text default 'purple';

alter table public.groups
  add column if not exists price_per_month bigint default 0;

alter table public.groups
  add column if not exists billing_day int default 1;

alter table public.groups
  add column if not exists telegram_group_link text;

alter table public.groups
  add column if not exists created_at timestamptz default now();

alter table public.group_members
  add column if not exists id uuid default uuid_generate_v4();

alter table public.group_members
  add column if not exists group_id uuid references public.groups(id) on delete cascade;

alter table public.group_members
  add column if not exists student_id uuid references public.users(id) on delete cascade;

alter table public.group_members
  add column if not exists joined_at timestamptz default now();

alter table public.sessions
  add column if not exists id uuid default uuid_generate_v4();

alter table public.sessions
  add column if not exists group_id uuid references public.groups(id) on delete cascade;

alter table public.sessions
  add column if not exists scheduled_at timestamptz;

alter table public.sessions
  add column if not exists duration_min int default 90;

alter table public.sessions
  add column if not exists status text default 'upcoming';

alter table public.sessions
  add column if not exists notes text;

alter table public.sessions
  add column if not exists created_at timestamptz default now();

alter table public.attendance
  add column if not exists id uuid default uuid_generate_v4();

alter table public.attendance
  add column if not exists session_id uuid references public.sessions(id) on delete cascade;

alter table public.attendance
  add column if not exists student_id uuid references public.users(id) on delete cascade;

alter table public.attendance
  add column if not exists present boolean default false;

alter table public.attendance
  add column if not exists created_at timestamptz default now();

alter table public.payments
  add column if not exists id uuid default uuid_generate_v4();

alter table public.payments
  add column if not exists student_id uuid references public.users(id) on delete cascade;

alter table public.payments
  add column if not exists teacher_id uuid references public.users(id) on delete cascade;

alter table public.payments
  add column if not exists group_id uuid references public.groups(id) on delete set null;

alter table public.payments
  add column if not exists amount bigint default 0;

alter table public.payments
  add column if not exists status text default 'unpaid';

alter table public.payments
  add column if not exists method text;

alter table public.payments
  add column if not exists period_year int;

alter table public.payments
  add column if not exists period_month int;

alter table public.payments
  add column if not exists note text;

alter table public.payments
  add column if not exists paid_at timestamptz;

alter table public.payments
  add column if not exists created_at timestamptz default now();

alter table public.homework
  add column if not exists id uuid default uuid_generate_v4();

alter table public.homework
  add column if not exists group_id uuid references public.groups(id) on delete cascade;

alter table public.homework
  add column if not exists title text;

alter table public.homework
  add column if not exists description text;

alter table public.homework
  add column if not exists due_date timestamptz;

alter table public.homework
  add column if not exists created_at timestamptz default now();

alter table public.homework_submissions
  add column if not exists id uuid default uuid_generate_v4();

alter table public.homework_submissions
  add column if not exists homework_id uuid references public.homework(id) on delete cascade;

alter table public.homework_submissions
  add column if not exists student_id uuid references public.users(id) on delete cascade;

alter table public.homework_submissions
  add column if not exists status text default 'pending';

alter table public.homework_submissions
  add column if not exists grade int;

alter table public.homework_submissions
  add column if not exists submitted_at timestamptz;

alter table public.homework_submissions
  add column if not exists done boolean default false;

alter table public.homework_submissions
  add column if not exists done_at timestamptz;

alter table public.homework_submissions
  add column if not exists created_at timestamptz default now();

alter table public.bot_notification_events
  add column if not exists id uuid default uuid_generate_v4();

alter table public.bot_notification_events
  add column if not exists event_type text;

alter table public.bot_notification_events
  add column if not exists entity_id text;

alter table public.bot_notification_events
  add column if not exists recipient_telegram_id bigint;

alter table public.bot_notification_events
  add column if not exists sent_at timestamptz not null default now();

alter table public.users
  drop constraint if exists users_telegram_id_key;

alter table public.users
  add constraint users_telegram_id_key unique (telegram_id);

alter table public.group_members
  drop constraint if exists group_members_group_id_student_id_key;

alter table public.group_members
  add constraint group_members_group_id_student_id_key unique (group_id, student_id);

update public.groups
set invite_token = substring(replace(uuid_generate_v4()::text, '-', '') from 1 for 12)
where invite_token is null or btrim(invite_token) = '';

alter table public.groups
  alter column invite_token set not null;

alter table public.groups
  drop constraint if exists groups_invite_token_key;

alter table public.groups
  add constraint groups_invite_token_key unique (invite_token);

alter table public.attendance
  drop constraint if exists attendance_session_id_student_id_key;

alter table public.attendance
  add constraint attendance_session_id_student_id_key unique (session_id, student_id);

alter table public.homework_submissions
  drop constraint if exists homework_submissions_homework_id_student_id_key;

alter table public.homework_submissions
  add constraint homework_submissions_homework_id_student_id_key unique (homework_id, student_id);

alter table public.bot_notification_events
  drop constraint if exists bot_notification_events_event_type_entity_id_recipient_telegram_id_key;

alter table public.bot_notification_events
  add constraint bot_notification_events_event_type_entity_id_recipient_telegram_id_key
  unique (event_type, entity_id, recipient_telegram_id);

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
  check (status in ('unpaid', 'partial', 'paid'));

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
create index if not exists idx_payments_teacher_status_period on public.payments(teacher_id, status, period_year, period_month);
create index if not exists idx_payments_student_status on public.payments(student_id, status);
create index if not exists idx_sessions_group_scheduled_status on public.sessions(group_id, scheduled_at, status);
create index if not exists idx_group_members_student_group on public.group_members(student_id, group_id);
create index if not exists idx_bot_notification_events_sent_at on public.bot_notification_events(sent_at);
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
alter table public.bot_notification_events enable row level security;

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
drop policy if exists bot_notification_events_service_role on public.bot_notification_events;

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

create policy bot_notification_events_service_role on public.bot_notification_events
for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');


-- 5. Gamification
CREATE TABLE IF NOT EXISTS public.student_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    badge_type TEXT NOT NULL,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(student_id, badge_type)
);

ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own badges" ON public.student_badges FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view their students badges" ON public.student_badges FOR SELECT USING (EXISTS (SELECT 1 FROM group_members gm JOIN groups g ON gm.group_id = g.id WHERE gm.student_id = student_badges.student_id AND g.teacher_id = auth.uid()));

CREATE POLICY "Service role can insert badges" ON public.student_badges FOR INSERT WITH CHECK (true);


-- 6. Schedule templates
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS schedule_template JSONB DEFAULT '[]'::jsonb;
