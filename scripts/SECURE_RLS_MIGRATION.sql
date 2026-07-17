-- ================================================================
-- TutorSpace production RLS migration
-- ================================================================
-- Use this only after the WebApp authenticates through a trusted backend
-- or Edge Function that verifies Telegram initData and issues Supabase JWTs
-- with these claims:
--   telegram_id: Telegram numeric user id
--   role: authenticated
--   app_role: teacher | student | parent
--
-- Do not run this while the app still uses only the public anon key and
-- window.Telegram.WebApp.initDataUnsafe directly, otherwise client data access
-- will be blocked by design.

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.users
  where telegram_id = nullif(auth.jwt() ->> 'telegram_id', '')::bigint
  limit 1
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select coalesce(nullif(auth.jwt() ->> 'app_role', ''), '')
$$;

create or replace function public.is_group_teacher(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.groups g
    where g.id = target_group_id
      and g.teacher_id = public.current_app_user_id()
  )
$$;

create or replace function public.is_group_student(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.student_id = public.current_app_user_id()
  )
$$;

create or replace function public.block_client_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' and new.role is distinct from old.role then
    raise exception 'Role changes must be performed by the trusted backend';
  end if;

  return new;
end;
$$;

drop trigger if exists users_block_client_role_change on public.users;
create trigger users_block_client_role_change
before update on public.users
for each row
execute function public.block_client_role_change();

alter table public.users enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.sessions enable row level security;
alter table public.attendance enable row level security;
alter table public.payments enable row level security;
alter table public.homework enable row level security;
alter table public.homework_submissions enable row level security;
-- bot_notification_events: uncomment when the table is created
-- alter table public.bot_notification_events enable row level security;

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

drop policy if exists users_read_related on public.users;
create policy users_read_related on public.users
for select using (
  id = public.current_app_user_id()
  or exists (
    select 1
    from public.groups g
    where g.teacher_id = public.current_app_user_id()
      and (
        users.id = g.teacher_id
        or exists (
          select 1 from public.group_members gm
          where gm.group_id = g.id and gm.student_id = users.id
        )
      )
  )
  or exists (
    select 1
    from public.group_members my_membership
    join public.groups g on g.id = my_membership.group_id
    where my_membership.student_id = public.current_app_user_id()
      and (
        users.id = g.teacher_id
        or exists (
          select 1 from public.group_members peer
          where peer.group_id = g.id and peer.student_id = users.id
        )
      )
  )
);

drop policy if exists users_insert_self on public.users;
create policy users_insert_self on public.users
for insert with check (
  telegram_id = nullif(auth.jwt() ->> 'telegram_id', '')::bigint
);

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
for update using (id = public.current_app_user_id())
with check (id = public.current_app_user_id());

drop policy if exists groups_read_owned_or_joined on public.groups;
create policy groups_read_owned_or_joined on public.groups
for select using (
  teacher_id = public.current_app_user_id()
  or public.is_group_student(id)
);

drop policy if exists groups_teacher_insert on public.groups;
create policy groups_teacher_insert on public.groups
for insert with check (
  teacher_id = public.current_app_user_id()
  and public.current_app_role() = 'teacher'
);

drop policy if exists groups_teacher_update on public.groups;
create policy groups_teacher_update on public.groups
for update using (teacher_id = public.current_app_user_id())
with check (teacher_id = public.current_app_user_id());

drop policy if exists groups_teacher_delete on public.groups;
create policy groups_teacher_delete on public.groups
for delete using (teacher_id = public.current_app_user_id());

drop policy if exists group_members_read_owned_or_self on public.group_members;
create policy group_members_read_owned_or_self on public.group_members
for select using (
  student_id = public.current_app_user_id()
  or public.is_group_teacher(group_id)
);

drop policy if exists group_members_teacher_manage on public.group_members;
create policy group_members_teacher_manage on public.group_members
for all using (public.is_group_teacher(group_id))
with check (public.is_group_teacher(group_id));

drop policy if exists sessions_read_owned_or_joined on public.sessions;
create policy sessions_read_owned_or_joined on public.sessions
for select using (
  public.is_group_teacher(group_id)
  or public.is_group_student(group_id)
);

drop policy if exists sessions_teacher_manage on public.sessions;
create policy sessions_teacher_manage on public.sessions
for all using (public.is_group_teacher(group_id))
with check (public.is_group_teacher(group_id));

drop policy if exists attendance_read_related on public.attendance;
create policy attendance_read_related on public.attendance
for select using (
  student_id = public.current_app_user_id()
  or exists (
    select 1
    from public.sessions s
    where s.id = attendance.session_id
      and public.is_group_teacher(s.group_id)
  )
);

drop policy if exists attendance_teacher_manage on public.attendance;
create policy attendance_teacher_manage on public.attendance
for all using (
  exists (
    select 1
    from public.sessions s
    where s.id = attendance.session_id
      and public.is_group_teacher(s.group_id)
  )
)
with check (
  exists (
    select 1
    from public.sessions s
    where s.id = attendance.session_id
      and public.is_group_teacher(s.group_id)
  )
);

drop policy if exists payments_read_related on public.payments;
create policy payments_read_related on public.payments
for select using (
  student_id = public.current_app_user_id()
  or teacher_id = public.current_app_user_id()
);

drop policy if exists payments_teacher_manage on public.payments;
create policy payments_teacher_manage on public.payments
for all using (teacher_id = public.current_app_user_id())
with check (teacher_id = public.current_app_user_id());

drop policy if exists homework_read_owned_or_joined on public.homework;
create policy homework_read_owned_or_joined on public.homework
for select using (
  public.is_group_teacher(group_id)
  or public.is_group_student(group_id)
);

drop policy if exists homework_teacher_manage on public.homework;
create policy homework_teacher_manage on public.homework
for all using (public.is_group_teacher(group_id))
with check (public.is_group_teacher(group_id));

drop policy if exists homework_submissions_read_related on public.homework_submissions;
create policy homework_submissions_read_related on public.homework_submissions
for select using (
  student_id = public.current_app_user_id()
  or exists (
    select 1
    from public.homework h
    where h.id = homework_submissions.homework_id
      and public.is_group_teacher(h.group_id)
  )
);

drop policy if exists homework_submissions_student_update on public.homework_submissions;
create policy homework_submissions_student_update on public.homework_submissions
for update using (student_id = public.current_app_user_id())
with check (student_id = public.current_app_user_id());

drop policy if exists homework_submissions_teacher_manage on public.homework_submissions;
create policy homework_submissions_teacher_manage on public.homework_submissions
for all using (
  exists (
    select 1
    from public.homework h
    where h.id = homework_submissions.homework_id
      and public.is_group_teacher(h.group_id)
  )
)
with check (
  exists (
    select 1
    from public.homework h
    where h.id = homework_submissions.homework_id
      and public.is_group_teacher(h.group_id)
  )
);

-- bot_notification_events: uncomment when the table is created
-- drop policy if exists bot_notification_events_service_role on public.bot_notification_events;
-- create policy bot_notification_events_service_role on public.bot_notification_events
-- for all using (auth.role() = 'service_role')
-- with check (auth.role() = 'service_role');
