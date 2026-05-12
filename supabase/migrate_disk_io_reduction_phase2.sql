-- =========================================================================
-- Migration: Disk IO reduction, phase 2.
-- Run this in the Supabase SQL Editor.
--
-- Drops `posts` from the realtime publication. The client no longer
-- subscribes to postgres_changes on posts; it refetches on focus instead.
-- Removing the table from supabase_realtime stops Postgres logical
-- decoding from scanning WAL for it, which is a constant background cost
-- even when no rows are written.
-- =========================================================================

do $$
begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'posts'
  ) then
    execute 'alter publication supabase_realtime drop table posts';
  end if;
end $$;
