-- Ending (summary) questionnaire for cohort members.
-- Stored in `checkins` with type = 'ending'. Run in Supabase SQL Editor.

alter table checkins
  add column if not exists has_prototype text,
  add column if not exists customers_spoken int check (customers_spoken >= 0),
  add column if not exists pilot_status text,
  add column if not exists value_prop_clarity int check (value_prop_clarity between 1 and 5);

comment on column checkins.has_prototype is 'ending: yes_product | yes_prototype | no';
comment on column checkins.customers_spoken is 'ending: total potential customers/users spoken to';
comment on column checkins.pilot_status is 'ending: yes_pilot | initial_test | no';
comment on column checkins.value_prop_clarity is 'ending: 1 (unclear) .. 5 (very clear)';
