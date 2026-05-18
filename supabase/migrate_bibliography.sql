-- Run this in the Supabase SQL Editor to create the bibliography feature.
-- A per-cohort reading list (books, articles, videos, podcasts) curated by
-- admins. Visible to candidates of the cohort, mentors with venture
-- assignments in the cohort, and to visitors (who see all cohorts).

create table if not exists bibliography_entries (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references cohorts(id) on delete cascade,
  title text not null,
  author text,
  kind text not null default 'book',
  url text,
  description text,
  cover_url text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists bibliography_entries_cohort_idx
  on bibliography_entries (cohort_id, created_at desc);

alter table bibliography_entries enable row level security;

drop policy if exists "Cohort-scoped bibliography reads" on bibliography_entries;
create policy "Cohort-scoped bibliography reads"
  on bibliography_entries for select using (
    get_user_role() in ('admin', 'visitor')
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'candidate'
      and profiles.cohort_id = bibliography_entries.cohort_id
    )
    or exists (
      select 1 from mentor_assignments ma
      join ventures v on v.id = ma.venture_id
      where ma.mentor_id = auth.uid()
      and v.cohort_id = bibliography_entries.cohort_id
    )
  );

drop policy if exists "Admin manages bibliography" on bibliography_entries;
create policy "Admin manages bibliography"
  on bibliography_entries for all using (get_user_role() = 'admin');
