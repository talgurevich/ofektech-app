-- Allow candidates to read pre-demo feedback for their own venture,
-- and mentors to read pre-demo feedback for ventures they are assigned to.

create policy "Candidates read own venture pre-demo feedback"
  on pre_demo_feedback for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role = 'candidate'
        and p.venture_id = pre_demo_feedback.venture_id
    )
  );

create policy "Mentors read assigned venture pre-demo feedback"
  on pre_demo_feedback for select
  using (
    exists (
      select 1 from mentor_assignments ma
      where ma.mentor_id = auth.uid()
        and ma.venture_id = pre_demo_feedback.venture_id
    )
  );
