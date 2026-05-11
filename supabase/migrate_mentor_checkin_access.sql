-- Run this in the Supabase SQL Editor to grant assigned mentors read access
-- to their venture members' check-ins (opening questionnaire, etc.).

drop policy if exists "Candidates see own checkins" on checkins;

create policy "Candidates and assigned mentors see checkins"
  on checkins for select using (
    candidate_id = auth.uid()
    or get_user_role() = 'admin'
    or exists (
      select 1
      from profiles p
      join mentor_assignments ma on ma.venture_id = p.venture_id
      where p.id = checkins.candidate_id
      and ma.mentor_id = auth.uid()
    )
  );
