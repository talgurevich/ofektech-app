-- =========================================================================
-- Migration: meeting summary on sessions + lecture resources (files & links)
-- Run this in the Supabase SQL Editor.
-- Also: create a Storage bucket named "lecture-resources" (public, see end).
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Meeting-summary support on mentor_sessions
-- -------------------------------------------------------------------------
alter table mentor_sessions
  add column if not exists meeting_summary text not null default '',
  add column if not exists summary_submitted_at timestamptz,
  add column if not exists summary_submitted_by uuid references profiles(id);

-- New flow: the venture member (candidate) creates the session and writes
-- the meeting summary. Mentor responds via session_feedback.
drop policy if exists "Mentors can create sessions" on mentor_sessions;
drop policy if exists "Mentors and members can create sessions" on mentor_sessions;
create policy "Mentors and members can create sessions"
  on mentor_sessions for insert with check (
    created_by = auth.uid()
    and (
      get_user_role() = 'mentor'
      or (
        get_user_role() = 'candidate'
        and exists (
          select 1 from profiles
          where profiles.id = auth.uid()
            and profiles.venture_id = mentor_sessions.venture_id
        )
      )
    )
  );

-- Members can update their own session's meeting summary; mentors can update
-- sessions they own. (Admin policy already covers everything.)
drop policy if exists "Members and mentors update sessions" on mentor_sessions;
create policy "Members and mentors update sessions"
  on mentor_sessions for update using (
    mentor_id = auth.uid()
    or created_by = auth.uid()
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.venture_id = mentor_sessions.venture_id
    )
  );

-- -------------------------------------------------------------------------
-- 2. Lecture resources (extra files & links per lecture)
-- -------------------------------------------------------------------------
create table if not exists lecture_resources (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references lectures(id) on delete cascade,
  kind text not null check (kind in ('file', 'link')),
  title text not null,
  url text not null,
  storage_path text,
  mime_type text,
  size_bytes bigint,
  position int not null default 0,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists lecture_resources_lecture_idx
  on lecture_resources(lecture_id, position);

alter table lecture_resources enable row level security;

drop policy if exists "Authenticated read lecture resources" on lecture_resources;
create policy "Authenticated read lecture resources"
  on lecture_resources for select using (auth.uid() is not null);

drop policy if exists "Admins write lecture resources" on lecture_resources;
create policy "Admins write lecture resources"
  on lecture_resources for all using (get_user_role() = 'admin');

-- -------------------------------------------------------------------------
-- 3. Storage bucket for uploaded lecture files
--    Public bucket so signed URLs are not needed; admin-only writes.
-- -------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('lecture-resources', 'lecture-resources', true)
  on conflict (id) do update set public = excluded.public;

drop policy if exists "Public read lecture-resources" on storage.objects;
create policy "Public read lecture-resources"
  on storage.objects for select
  using (bucket_id = 'lecture-resources');

drop policy if exists "Admin insert lecture-resources" on storage.objects;
create policy "Admin insert lecture-resources"
  on storage.objects for insert
  with check (
    bucket_id = 'lecture-resources' and get_user_role() = 'admin'
  );

drop policy if exists "Admin update lecture-resources" on storage.objects;
create policy "Admin update lecture-resources"
  on storage.objects for update
  using (
    bucket_id = 'lecture-resources' and get_user_role() = 'admin'
  );

drop policy if exists "Admin delete lecture-resources" on storage.objects;
create policy "Admin delete lecture-resources"
  on storage.objects for delete
  using (
    bucket_id = 'lecture-resources' and get_user_role() = 'admin'
  );
