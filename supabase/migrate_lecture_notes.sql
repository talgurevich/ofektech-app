-- =========================================================================
-- Migration: per-user private notes per lecture.
-- Run this in the Supabase SQL Editor.
-- =========================================================================

create table if not exists lecture_notes (
  user_id uuid not null references profiles(id) on delete cascade,
  lecture_id uuid not null references lectures(id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, lecture_id)
);

create index if not exists lecture_notes_user_idx
  on lecture_notes(user_id, updated_at desc);

alter table lecture_notes enable row level security;

drop policy if exists "Users read own lecture notes" on lecture_notes;
create policy "Users read own lecture notes"
  on lecture_notes for select using (user_id = auth.uid());

drop policy if exists "Users write own lecture notes" on lecture_notes;
create policy "Users write own lecture notes"
  on lecture_notes for insert with check (user_id = auth.uid());

drop policy if exists "Users update own lecture notes" on lecture_notes;
create policy "Users update own lecture notes"
  on lecture_notes for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users delete own lecture notes" on lecture_notes;
create policy "Users delete own lecture notes"
  on lecture_notes for delete using (user_id = auth.uid());
