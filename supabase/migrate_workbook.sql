-- Run this in the Supabase SQL Editor on an existing DB that already has
-- the base schema. It only adds the workbook feature.

create table if not exists workbook_entries (
  id uuid primary key default gen_random_uuid(),
  venture_id uuid not null references ventures(id) on delete cascade,
  sheet_key text not null,
  data jsonb not null default '{}'::jsonb,
  position int not null default 0,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workbook_entries_venture_sheet_idx
  on workbook_entries (venture_id, sheet_key, position);

alter table workbook_entries enable row level security;

drop policy if exists "Venture members and assigned mentors read workbook" on workbook_entries;
create policy "Venture members and assigned mentors read workbook"
  on workbook_entries for select using (
    get_user_role() = 'admin'
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.venture_id = workbook_entries.venture_id
    )
    or exists (
      select 1 from mentor_assignments
      where mentor_assignments.mentor_id = auth.uid()
      and mentor_assignments.venture_id = workbook_entries.venture_id
    )
  );

drop policy if exists "Venture members manage workbook" on workbook_entries;
create policy "Venture members manage workbook"
  on workbook_entries for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.venture_id = workbook_entries.venture_id
    )
  );

drop policy if exists "Admin manages all workbook entries" on workbook_entries;
create policy "Admin manages all workbook entries"
  on workbook_entries for all using (get_user_role() = 'admin');
