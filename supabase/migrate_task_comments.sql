-- =========================================================================
-- Migration: per-task review comments
-- Run this in the Supabase SQL Editor.
--
-- Adds a comment thread keyed to a workbook_entries row (intended for the
-- "tasks" sheet). The "needs_correction" / "corrected" review state itself
-- lives inside workbook_entries.data as data.review_status, so no schema
-- change is needed for it — but we still index it so the cross-venture
-- admin review queue can stay cheap.
-- =========================================================================

create table if not exists task_comments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references workbook_entries(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists task_comments_entry_idx
  on task_comments (entry_id, created_at);

-- Surface tasks whose data.review_status is "needs_correction" or "corrected"
-- across all ventures without a full table scan.
create index if not exists workbook_entries_review_status_idx
  on workbook_entries ((data->>'review_status'))
  where sheet_key = 'tasks' and (data->>'review_status') is not null;

alter table task_comments enable row level security;

-- Admins can do anything; venture members and their assigned mentor can read
-- and write comments on their venture's task rows. Mirrors the workbook RLS.
drop policy if exists "Admin manages task comments" on task_comments;
create policy "Admin manages task comments"
  on task_comments for all using (get_user_role() = 'admin');

drop policy if exists "Members read task comments" on task_comments;
create policy "Members read task comments"
  on task_comments for select using (
    exists (
      select 1
      from workbook_entries we
      where we.id = task_comments.entry_id
      and (
        exists (
          select 1 from profiles
          where profiles.id = auth.uid()
          and profiles.venture_id = we.venture_id
        )
        or exists (
          select 1 from mentor_assignments
          where mentor_assignments.mentor_id = auth.uid()
          and mentor_assignments.venture_id = we.venture_id
        )
      )
    )
  );

drop policy if exists "Members write task comments" on task_comments;
create policy "Members write task comments"
  on task_comments for insert with check (
    author_id = auth.uid()
    and exists (
      select 1
      from workbook_entries we
      where we.id = task_comments.entry_id
      and (
        exists (
          select 1 from profiles
          where profiles.id = auth.uid()
          and profiles.venture_id = we.venture_id
        )
        or exists (
          select 1 from mentor_assignments
          where mentor_assignments.mentor_id = auth.uid()
          and mentor_assignments.venture_id = we.venture_id
        )
      )
    )
  );
