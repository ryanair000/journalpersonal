create table if not exists public.journalpersonal_encrypted_sync (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ciphertext text not null,
  iv text not null,
  salt text not null,
  kdf jsonb not null default '{"name":"PBKDF2","hash":"SHA-256","iterations":310000}'::jsonb,
  crypto_version smallint not null default 1 check (crypto_version = 1),
  payload_version smallint not null default 1 check (payload_version >= 1),
  revision bigint not null default 1 check (revision >= 1),
  client_updated_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists journalpersonal_encrypted_sync_updated_at_idx
  on public.journalpersonal_encrypted_sync (updated_at desc);

alter table public.journalpersonal_encrypted_sync enable row level security;

revoke all on table public.journalpersonal_encrypted_sync from anon;
grant select, insert, update, delete on table public.journalpersonal_encrypted_sync to authenticated;

drop policy if exists "journalpersonal_select_own" on public.journalpersonal_encrypted_sync;
create policy "journalpersonal_select_own"
  on public.journalpersonal_encrypted_sync
  for select
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "journalpersonal_insert_own" on public.journalpersonal_encrypted_sync;
create policy "journalpersonal_insert_own"
  on public.journalpersonal_encrypted_sync
  for insert
  to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "journalpersonal_update_own" on public.journalpersonal_encrypted_sync;
create policy "journalpersonal_update_own"
  on public.journalpersonal_encrypted_sync
  for update
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "journalpersonal_delete_own" on public.journalpersonal_encrypted_sync;
create policy "journalpersonal_delete_own"
  on public.journalpersonal_encrypted_sync
  for delete
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
