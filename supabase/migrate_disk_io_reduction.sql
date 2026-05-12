-- =========================================================================
-- Migration: reduce Supabase Disk IO usage.
-- Run this in the Supabase SQL Editor.
--
-- 1. Adds a composite index on notifications(user_id, created_at desc)
--    to eliminate sequential scans for the per-user notification feed.
-- 2. Drops post_comments from the realtime publication. Comments will be
--    refetched on action instead of streamed via WAL.
-- =========================================================================

-- 1) Notifications index
create index if not exists notifications_user_created_idx
  on notifications (user_id, created_at desc);

-- 2) Remove post_comments from realtime publication (idempotent)
do $$
begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'post_comments'
  ) then
    execute 'alter publication supabase_realtime drop table post_comments';
  end if;
end $$;
