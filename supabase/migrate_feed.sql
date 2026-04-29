-- =========================================================================
-- Migration: program-wide community feed (posts + comments).
-- Run this in the Supabase SQL Editor.
-- =========================================================================

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null check (length(body) > 0 and length(body) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists posts_created_idx
  on posts(created_at desc) where deleted_at is null;

alter table posts enable row level security;

drop policy if exists "Authenticated read posts" on posts;
create policy "Authenticated read posts"
  on posts for select using (auth.uid() is not null);

drop policy if exists "Authenticated insert posts" on posts;
create policy "Authenticated insert posts"
  on posts for insert with check (author_id = auth.uid());

drop policy if exists "Authors and admins update posts" on posts;
create policy "Authors and admins update posts"
  on posts for update using (
    author_id = auth.uid() or get_user_role() = 'admin'
  ) with check (
    author_id = auth.uid() or get_user_role() = 'admin'
  );

drop policy if exists "Authors and admins delete posts" on posts;
create policy "Authors and admins delete posts"
  on posts for delete using (
    author_id = auth.uid() or get_user_role() = 'admin'
  );

-- -------------------------------------------------------------------------

create table if not exists post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null check (length(body) > 0 and length(body) <= 2000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists post_comments_post_idx
  on post_comments(post_id, created_at) where deleted_at is null;

alter table post_comments enable row level security;

drop policy if exists "Authenticated read comments" on post_comments;
create policy "Authenticated read comments"
  on post_comments for select using (auth.uid() is not null);

drop policy if exists "Authenticated insert comments" on post_comments;
create policy "Authenticated insert comments"
  on post_comments for insert with check (author_id = auth.uid());

drop policy if exists "Authors and admins update comments" on post_comments;
create policy "Authors and admins update comments"
  on post_comments for update using (
    author_id = auth.uid() or get_user_role() = 'admin'
  ) with check (
    author_id = auth.uid() or get_user_role() = 'admin'
  );

drop policy if exists "Authors and admins delete comments" on post_comments;
create policy "Authors and admins delete comments"
  on post_comments for delete using (
    author_id = auth.uid() or get_user_role() = 'admin'
  );
