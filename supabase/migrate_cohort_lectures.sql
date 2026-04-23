-- Scope lectures to cohorts so we can run multiple cohorts side by side.
-- Run this in the Supabase SQL editor AFTER setting is_active = true on
-- the cohort you want to become the owner of the existing data.

-- 1. Add a cohort_id column to lectures (nullable so we can backfill).
alter table lectures add column if not exists cohort_id uuid references cohorts(id);

-- 2. Enforce at most one active cohort at any time.
create unique index if not exists cohorts_only_one_active_idx
  on cohorts (is_active) where is_active = true;

-- 3. Backfill existing data to the single active cohort.
do $$
declare active_id uuid;
begin
  select id into active_id from cohorts where is_active = true;
  if active_id is null then
    raise exception 'No active cohort found — set exactly one cohort is_active = true before running.';
  end if;

  update lectures
    set cohort_id = active_id
    where cohort_id is null;

  update profiles
    set cohort_id = active_id
    where cohort_id is null
      and role in ('candidate', 'mentor', 'visitor');

  update ventures
    set cohort_id = active_id
    where cohort_id is null;
end $$;

-- 4. Now that every lecture has a cohort, require it going forward.
alter table lectures alter column cohort_id set not null;

-- 5. Replace the "Anyone can read lectures" policy with a cohort-scoped one.
--    Admins and visitors still see everything; candidates see only their
--    cohort; mentors see lectures from cohorts of any venture they're
--    assigned to.
drop policy if exists "Anyone can read lectures" on lectures;
drop policy if exists "Cohort-scoped lecture reads" on lectures;

create policy "Cohort-scoped lecture reads"
  on lectures for select using (
    get_user_role() in ('admin', 'visitor')
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'candidate'
      and profiles.cohort_id = lectures.cohort_id
    )
    or exists (
      select 1 from mentor_assignments ma
      join ventures v on v.id = ma.venture_id
      where ma.mentor_id = auth.uid()
      and v.cohort_id = lectures.cohort_id
    )
  );
