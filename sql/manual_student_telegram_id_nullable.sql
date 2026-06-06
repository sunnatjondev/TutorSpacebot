create extension if not exists "uuid-ossp";

alter table public.users
  add column if not exists telegram_id bigint;

alter table public.users
  alter column telegram_id type bigint using telegram_id::bigint;

alter table public.users
  alter column telegram_id drop not null;

alter table public.users
  drop constraint if exists users_telegram_id_key;

alter table public.users
  add constraint users_telegram_id_key unique (telegram_id);

create index if not exists idx_users_telegram_id on public.users(telegram_id);
