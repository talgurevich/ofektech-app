-- Run this in the Supabase SQL Editor to allow file attachments on
-- bibliography entries. Adds nullable file_* columns to the table and
-- creates a public 'bibliography-files' storage bucket with admin-only
-- writes (matching the lecture-resources pattern).

alter table bibliography_entries
  add column if not exists file_url text,
  add column if not exists file_path text,
  add column if not exists file_name text,
  add column if not exists file_size bigint,
  add column if not exists file_mime text;

insert into storage.buckets (id, name, public)
  values ('bibliography-files', 'bibliography-files', true)
  on conflict (id) do update set public = excluded.public;

drop policy if exists "Public read bibliography-files" on storage.objects;
create policy "Public read bibliography-files"
  on storage.objects for select
  using (bucket_id = 'bibliography-files');

drop policy if exists "Admin insert bibliography-files" on storage.objects;
create policy "Admin insert bibliography-files"
  on storage.objects for insert
  with check (
    bucket_id = 'bibliography-files' and get_user_role() = 'admin'
  );

drop policy if exists "Admin update bibliography-files" on storage.objects;
create policy "Admin update bibliography-files"
  on storage.objects for update
  using (
    bucket_id = 'bibliography-files' and get_user_role() = 'admin'
  );

drop policy if exists "Admin delete bibliography-files" on storage.objects;
create policy "Admin delete bibliography-files"
  on storage.objects for delete
  using (
    bucket_id = 'bibliography-files' and get_user_role() = 'admin'
  );
