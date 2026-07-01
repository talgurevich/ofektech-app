-- Ventures now confirm their own name on first login.
-- Admin-created ventures start unconfirmed; a popup on the candidate
-- dashboard prompts the venture members to input the real name.

alter table ventures
  add column if not exists name_confirmed boolean not null default false;

-- Any pre-existing venture that already has a real name (i.e., not created
-- by this new flow) should be considered confirmed so we don't prompt
-- existing users.
update ventures set name_confirmed = true where name_confirmed = false;

-- Allow candidates to update the name of their own venture (only).
-- This is used by the "name your venture" popup.
create policy "Candidates can update own venture name"
  on ventures for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.venture_id = ventures.id
        and profiles.role = 'candidate'
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.venture_id = ventures.id
        and profiles.role = 'candidate'
    )
  );
