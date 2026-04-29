-- =========================================================================
-- Enable realtime on the feed tables so the client receives INSERT events.
-- Run this in the Supabase SQL Editor.
-- =========================================================================

alter publication supabase_realtime add table posts;
alter publication supabase_realtime add table post_comments;
