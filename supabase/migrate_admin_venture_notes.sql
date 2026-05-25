-- =========================================================================
-- Migration: admin-only notes per venture
-- Run this in the Supabase SQL Editor.
--
-- Adds an append-only log of admin notes scoped to a venture, with severity
-- and resolved state for triage. Only admins can read or write.
-- =========================================================================

create type admin_note_severity as enum ('info', 'watch', 'blocker');

create table if not exists admin_venture_notes (
  id uuid primary key default gen_random_uuid(),
  venture_id uuid not null references ventures(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete set null,
  content text not null,
  severity admin_note_severity not null default 'info',
  resolved_at timestamptz,
  resolved_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_venture_notes_venture_idx
  on admin_venture_notes (venture_id, created_at desc);

create index if not exists admin_venture_notes_open_idx
  on admin_venture_notes (resolved_at)
  where resolved_at is null;

alter table admin_venture_notes enable row level security;

drop policy if exists "Admin manages venture notes" on admin_venture_notes;
create policy "Admin manages venture notes"
  on admin_venture_notes for all using (get_user_role() = 'admin');
