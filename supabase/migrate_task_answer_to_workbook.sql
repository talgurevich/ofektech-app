-- =========================================================================
-- Migration: task answers -> venture workbook (guide chapters)
-- Run this in the Supabase SQL Editor.
--
-- What it does:
--   1. Lets an admin bulk-task optionally target a guide chapter, so every
--      venture's answer can be pushed into the same chapter of its workbook.
--   2. Backfills a "creator" name into existing tasks-sheet rows so the new
--      read-only "נוצר ע״י" column shows a value for historical tasks.
--
-- The task "answer" text and the per-row chapter-push bookkeeping both live
-- inside the existing workbook_entries.data JSONB column, so no new columns
-- are needed on workbook_entries.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. admin_bulk_tasks: optional target guide chapter for the broadcast.
--    Kept for the admin registry/history; the candidate-facing pre-select
--    is carried on each workbook_entries.data.suggestedChapterId (admins
--    can read admin_bulk_tasks, candidates cannot).
-- -------------------------------------------------------------------------
alter table admin_bulk_tasks
  add column if not exists guide_chapter_id uuid null
  references guide_chapters(id) on delete set null;

-- -------------------------------------------------------------------------
-- 2. Backfill "creator" display name onto existing tasks-sheet rows.
--    New rows get it written at creation time by the app.
-- -------------------------------------------------------------------------
update workbook_entries we
set data = jsonb_set(we.data, '{creator}', to_jsonb(p.full_name))
from profiles p
where p.id = we.created_by
  and we.sheet_key = 'tasks'
  and not (we.data ? 'creator')
  and p.full_name is not null
  and btrim(p.full_name) <> '';
