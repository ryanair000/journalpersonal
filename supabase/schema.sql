-- Journal Personal: encrypted cloud sync schema
-- Run in the dedicated Supabase project's SQL editor, then run Security Advisor.

create table if not exists public.encrypted_user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ciphertext text not null,
  iv text not null,
  salt text not null,
  kdf_iterations integer not null default 310000 check (kdf_iterations >= 210000),
  encryption_version smallint not null default 1 check (encryption_version = 1),
  client_updated_at timestamptz not null,
  updated_at timestamptz generated always as (client_updated_at) stored,
  created_at timestamptz not null default now()
);

alter table public.encrypted_user_state enable row level security;

revoke all on table public.encrypted_user_state from anon;
grant select, insert, update, delete on table public.encrypted_user_state to authenticated;

drop policy if exists "Users can read their own encrypted state" on public.encrypted_user_state;
drop policy if exists "Users can insert their own encrypted state" on public.encrypted_user_state;
drop policy if exists "Users can update their own encrypted state" on public.encrypted_user_state;
drop policy if exists "Users can delete their own encrypted state" on public.encrypted_user_state;

create policy "Users can read their own encrypted state"
on public.encrypted_user_state
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own encrypted state"
on public.encrypted_user_state
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own encrypted state"
on public.encrypted_user_state
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own encrypted state"
on public.encrypted_user_state
for delete
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists encrypted_user_state_updated_at_idx
  on public.encrypted_user_state (updated_at desc);

comment on table public.encrypted_user_state is
  'Client-side encrypted dashboard state. Supabase stores ciphertext only; encryption passphrases never leave the browser.';
