-- Run this in the Supabase SQL Editor.
-- Adds cover_path to bibliography_entries so admins can upload cover images
-- directly (instead of pasting an external URL) and the app can clean up
-- the storage object when the entry is deleted or its cover is replaced.
-- The uploaded cover lives in the existing 'bibliography-files' bucket;
-- no new bucket or policy is needed.

alter table bibliography_entries
  add column if not exists cover_path text;
