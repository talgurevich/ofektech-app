-- Run this in the Supabase SQL Editor to create the venture activity feed.
-- This table records meaningful actions inside a venture (workbook edits,
-- profile updates, guide saves, session/lecture feedback) so mentors can
-- see a timeline of what their ventures have been doing.

create table if not exists venture_activity (
  id uuid primary key default gen_random_uuid(),
  venture_id uuid not null references ventures(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  kind text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists venture_activity_venture_idx
  on venture_activity (venture_id, created_at desc);

alter table venture_activity enable row level security;

drop policy if exists "Venture members and assigned mentors read activity" on venture_activity;
create policy "Venture members and assigned mentors read activity"
  on venture_activity for select using (
    get_user_role() = 'admin'
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.venture_id = venture_activity.venture_id
    )
    or exists (
      select 1 from mentor_assignments
      where mentor_assignments.mentor_id = auth.uid()
      and mentor_assignments.venture_id = venture_activity.venture_id
    )
  );

drop policy if exists "Authenticated users insert own activity" on venture_activity;
create policy "Authenticated users insert own activity"
  on venture_activity for insert with check (
    actor_id = auth.uid()
    and (
      get_user_role() = 'admin'
      or exists (
        select 1 from profiles
        where profiles.id = auth.uid()
        and profiles.venture_id = venture_activity.venture_id
      )
      or exists (
        select 1 from mentor_assignments
        where mentor_assignments.mentor_id = auth.uid()
        and mentor_assignments.venture_id = venture_activity.venture_id
      )
    )
  );

drop policy if exists "Admin manages all activity" on venture_activity;
create policy "Admin manages all activity"
  on venture_activity for all using (get_user_role() = 'admin');
