-- Move every lecture currently in one cohort into another.
-- Use this to undo a wrong-cohort seed or a wrong-cohort backfill.
--
-- Edit the two names below to match your cohorts exactly (check them with
--   select id, name from cohorts;
-- first). The script errors clearly if a name isn't found.

do $$
declare
  from_name text := 'מחזור ב';  -- EDIT: the cohort currently holding the lectures
  to_name   text := 'מחזור א';  -- EDIT: the cohort where they should live
  from_id   uuid;
  to_id     uuid;
  moved     int;
begin
  select id into from_id from cohorts where name = from_name;
  if from_id is null then
    raise exception 'Cohort "%" not found.', from_name;
  end if;

  select id into to_id from cohorts where name = to_name;
  if to_id is null then
    raise exception 'Cohort "%" not found.', to_name;
  end if;

  update lectures set cohort_id = to_id where cohort_id = from_id;
  get diagnostics moved = row_count;
  raise notice '% lectures moved from "%" to "%".', moved, from_name, to_name;
end $$;
