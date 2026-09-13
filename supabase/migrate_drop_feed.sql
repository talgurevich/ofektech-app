-- =========================================================================
-- Deprecate the community feed. Drops the feed tables, the pin trigger,
-- the per-user "last seen" column and the post-media storage policies.
-- Run this in the Supabase SQL Editor.
--
-- NOTE: Supabase does not allow deleting storage objects/buckets via SQL.
-- The `post-media` bucket is removed by `scripts/delete-post-media-bucket.ts`
-- (Storage API, service role key).
-- =========================================================================

-- Realtime (may already have been removed)
do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename in ('posts', 'post_comments')
  ) then
    execute 'alter publication supabase_realtime drop table posts';
  end if;
exception when others then null;
end $$;

drop trigger if exists posts_enforce_pin on posts;
drop function if exists enforce_admin_pin();

drop table if exists post_reactions;
drop table if exists post_comments;
drop table if exists posts;

alter table profiles drop column if exists feed_last_seen_at;

-- Storage
drop policy if exists "Public read post-media" on storage.objects;
drop policy if exists "Authenticated insert post-media" on storage.objects;
drop policy if exists "Owners and admins update post-media" on storage.objects;
drop policy if exists "Owners and admins delete post-media" on storage.objects;
