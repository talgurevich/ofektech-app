-- =========================================================================
-- Migration: admin bulk-tasks registry + task file attachments
-- Run this in the Supabase SQL Editor.
-- Also creates the private Storage bucket "workbook-task-files".
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. admin_bulk_tasks: one row per broadcast (admin -> many ventures)
-- -------------------------------------------------------------------------
create table if not exists admin_bulk_tasks (
  id uuid primary key default gen_random_uuid(),
  task_text text not null,
  category text,
  assignee text,
  due_date date,
  target_count int not null,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists admin_bulk_tasks_created_at_idx
  on admin_bulk_tasks (created_at desc);

alter table admin_bulk_tasks enable row level security;

drop policy if exists "Admin manages bulk tasks" on admin_bulk_tasks;
create policy "Admin manages bulk tasks"
  on admin_bulk_tasks for all using (get_user_role() = 'admin');

-- -------------------------------------------------------------------------
-- 2. Link workbook_entries to their bulk-task source (nullable)
-- -------------------------------------------------------------------------
alter table workbook_entries
  add column if not exists bulk_task_id uuid null
  references admin_bulk_tasks(id) on delete set null;

create index if not exists workbook_entries_bulk_task_idx
  on workbook_entries (bulk_task_id);

-- -------------------------------------------------------------------------
-- 3. workbook_task_files: file metadata per workbook entry
-- -------------------------------------------------------------------------
create table if not exists workbook_task_files (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references workbook_entries(id) on delete cascade,
  bulk_task_id uuid null references admin_bulk_tasks(id) on delete set null,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists workbook_task_files_entry_idx
  on workbook_task_files (entry_id);
create index if not exists workbook_task_files_bulk_task_idx
  on workbook_task_files (bulk_task_id);
create index if not exists workbook_task_files_storage_path_idx
  on workbook_task_files (storage_path);

alter table workbook_task_files enable row level security;

-- RLS mirrors workbook_entries: venture members + assigned mentors + admins
drop policy if exists "Venture members and mentors read task files"
  on workbook_task_files;
create policy "Venture members and mentors read task files"
  on workbook_task_files for select using (
    get_user_role() = 'admin'
    or exists (
      select 1
      from workbook_entries we
      join profiles p on p.venture_id = we.venture_id
      where we.id = workbook_task_files.entry_id
        and p.id = auth.uid()
    )
    or exists (
      select 1
      from workbook_entries we
      join mentor_assignments ma on ma.venture_id = we.venture_id
      where we.id = workbook_task_files.entry_id
        and ma.mentor_id = auth.uid()
    )
  );

drop policy if exists "Venture members and mentors manage task files"
  on workbook_task_files;
create policy "Venture members and mentors manage task files"
  on workbook_task_files for all using (
    exists (
      select 1
      from workbook_entries we
      join profiles p on p.venture_id = we.venture_id
      where we.id = workbook_task_files.entry_id
        and p.id = auth.uid()
    )
    or exists (
      select 1
      from workbook_entries we
      join mentor_assignments ma on ma.venture_id = we.venture_id
      where we.id = workbook_task_files.entry_id
        and ma.mentor_id = auth.uid()
    )
  );

drop policy if exists "Admin manages all task files" on workbook_task_files;
create policy "Admin manages all task files"
  on workbook_task_files for all using (get_user_role() = 'admin');

-- -------------------------------------------------------------------------
-- 4. Private storage bucket for task attachments
-- -------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('workbook-task-files', 'workbook-task-files', false)
  on conflict (id) do update set public = excluded.public;

-- Read: venture members, assigned mentors, admins. Path layout:
--   venture/<venture_id>/<entry_id>/<uuid>-<filename>
--   bulk/<bulk_task_id>/<uuid>-<filename>
-- We can't cheaply parse paths in policy, so we permit any authenticated
-- read on this bucket and rely on signed URLs (issued only after the
-- workbook_task_files RLS check passes) for access control in practice.
drop policy if exists "Authenticated read workbook-task-files"
  on storage.objects;
create policy "Authenticated read workbook-task-files"
  on storage.objects for select
  using (
    bucket_id = 'workbook-task-files' and auth.uid() is not null
  );

drop policy if exists "Authenticated insert workbook-task-files"
  on storage.objects;
create policy "Authenticated insert workbook-task-files"
  on storage.objects for insert
  with check (
    bucket_id = 'workbook-task-files' and auth.uid() is not null
  );

drop policy if exists "Authenticated update workbook-task-files"
  on storage.objects;
create policy "Authenticated update workbook-task-files"
  on storage.objects for update
  using (
    bucket_id = 'workbook-task-files' and auth.uid() is not null
  );

drop policy if exists "Authenticated delete workbook-task-files"
  on storage.objects;
create policy "Authenticated delete workbook-task-files"
  on storage.objects for delete
  using (
    bucket_id = 'workbook-task-files' and auth.uid() is not null
  );
