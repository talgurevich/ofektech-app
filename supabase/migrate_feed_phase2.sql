-- =========================================================================
-- Migration: feed phase 2 — images, reactions, unseen badge, pins, system
-- posts (auto-shared milestones).
-- Run this in the Supabase SQL Editor.
-- =========================================================================

-- ---- posts: images, kind, metadata, pin ----
alter table posts
  add column if not exists image_url text,
  add column if not exists image_path text,
  add column if not exists kind text not null default 'user' check (kind in ('user', 'system')),
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists pinned_at timestamptz;

create index if not exists posts_pinned_idx
  on posts(pinned_at desc nulls last, created_at desc) where deleted_at is null;

-- ---- post_reactions ----
create table if not exists post_reactions (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (length(kind) between 1 and 32),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, kind)
);

create index if not exists post_reactions_post_idx on post_reactions(post_id);

alter table post_reactions enable row level security;

drop policy if exists "Authenticated read reactions" on post_reactions;
create policy "Authenticated read reactions"
  on post_reactions for select using (auth.uid() is not null);

drop policy if exists "Users insert own reactions" on post_reactions;
create policy "Users insert own reactions"
  on post_reactions for insert with check (user_id = auth.uid());

drop policy if exists "Users delete own reactions" on post_reactions;
create policy "Users delete own reactions"
  on post_reactions for delete using (user_id = auth.uid());

-- ---- profiles: per-user feed last-seen ----
alter table profiles
  add column if not exists feed_last_seen_at timestamptz;

-- ---- post-media storage bucket (public read, admin/author write) ----
insert into storage.buckets (id, name, public)
  values ('post-media', 'post-media', true)
  on conflict (id) do update set public = excluded.public;

drop policy if exists "Public read post-media" on storage.objects;
create policy "Public read post-media"
  on storage.objects for select
  using (bucket_id = 'post-media');

drop policy if exists "Authenticated insert post-media" on storage.objects;
create policy "Authenticated insert post-media"
  on storage.objects for insert
  with check (bucket_id = 'post-media' and auth.uid() is not null);

drop policy if exists "Owners and admins update post-media" on storage.objects;
create policy "Owners and admins update post-media"
  on storage.objects for update
  using (
    bucket_id = 'post-media'
    and (owner = auth.uid() or get_user_role() = 'admin')
  );

drop policy if exists "Owners and admins delete post-media" on storage.objects;
create policy "Owners and admins delete post-media"
  on storage.objects for delete
  using (
    bucket_id = 'post-media'
    and (owner = auth.uid() or get_user_role() = 'admin')
  );

-- ---- pinning enforcement: only admins may set/clear pinned_at ----
-- Trigger that prevents non-admins from changing pinned_at on update.
create or replace function enforce_admin_pin()
returns trigger as $$
begin
  if (new.pinned_at is distinct from old.pinned_at)
     and (get_user_role() is distinct from 'admin'::user_role) then
    raise exception 'Only admins can pin or unpin posts';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists posts_enforce_pin on posts;
create trigger posts_enforce_pin
  before update on posts
  for each row execute function enforce_admin_pin();
