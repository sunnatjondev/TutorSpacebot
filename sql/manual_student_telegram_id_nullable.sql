create extension if not exists "uuid-ossp";

alter table public.users
  add column if not exists telegram_id bigint;

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

alter table public.users
  drop constraint if exists users_telegram_id_key;

alter table public.users
  add constraint users_telegram_id_key unique (telegram_id);

create index if not exists idx_users_telegram_id on public.users(telegram_id);
