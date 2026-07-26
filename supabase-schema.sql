create table if not exists public.journal_sync (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{"version":1,"values":{},"keyUpdatedAt":{}}'::jsonb,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.journal_sync enable row level security;

revoke all on table public.journal_sync from anon;
grant select, insert, update, delete on table public.journal_sync to authenticated;

drop policy if exists "Users can read their journal sync" on public.journal_sync;
create policy "Users can read their journal sync"
on public.journal_sync
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their journal sync" on public.journal_sync;
create policy "Users can create their journal sync"
on public.journal_sync
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their journal sync" on public.journal_sync;
create policy "Users can update their journal sync"
on public.journal_sync
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their journal sync" on public.journal_sync;
create policy "Users can delete their journal sync"
on public.journal_sync
for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.set_journal_sync_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists set_journal_sync_updated_at on public.journal_sync;
create trigger set_journal_sync_updated_at
before update on public.journal_sync
for each row
execute function public.set_journal_sync_updated_at();

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'journal-documents',
  'journal-documents',
  false,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can view their journal documents" on storage.objects;
create policy "Users can view their journal documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'journal-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can upload their journal documents" on storage.objects;
create policy "Users can upload their journal documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'journal-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can update their journal documents" on storage.objects;
create policy "Users can update their journal documents"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'journal-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'journal-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can delete their journal documents" on storage.objects;
create policy "Users can delete their journal documents"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'journal-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
