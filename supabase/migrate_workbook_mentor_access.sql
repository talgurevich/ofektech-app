-- Run this in the Supabase SQL Editor to grant assigned mentors write
-- access to the workbook (so they can add tasks for their ventures).

drop policy if exists "Venture members manage workbook" on workbook_entries;

create policy "Venture members and assigned mentors manage workbook"
  on workbook_entries for all using (
    exists (
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
