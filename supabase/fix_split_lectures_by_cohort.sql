-- Two-step split: first put every lecture back in Cohort B, then move the
-- 19 rows that came from the Cohort A syllabus (migrate_cohort_syllabus.sql)
-- into Cohort A. Identified by (scheduled_date, title) so it survives edits
-- to cohort_id.

do $$
declare
  a_id uuid;
  b_id uuid;
  to_b int;
  to_a int;
begin
  select id into a_id from cohorts where name = 'מחזור א';
  select id into b_id from cohorts where name = 'מחזור ב';
  if a_id is null or b_id is null then
    raise exception 'Cohort names not found.';
  end if;

  update lectures set cohort_id = b_id where cohort_id = a_id;
  get diagnostics to_b = row_count;

  update lectures set cohort_id = a_id
  where (scheduled_date, title) in (
    ('2025-09-17'::date, 'הכשרה למנטורים'),
    ('2025-10-22'::date, 'מפגש פתיחה והשקת התוכנית'),
    ('2025-10-29'::date, 'צעדים ראשונים בהקמת מיזם'),
    ('2025-11-05'::date, 'הרעיון: סדנת רעיונאות ואימות הרעיון'),
    ('2025-11-12'::date, 'חקר שוק'),
    ('2025-11-19'::date, 'כלי AI'),
    ('2025-11-26'::date, 'בניית מודל עסקי — Lean Canvas'),
    ('2025-12-03'::date, 'גיוס הון'),
    ('2025-12-10'::date, 'גיוס הון — אלרון ונצ''רס'),
    ('2025-12-17'::date, 'Go-To-Market'),
    ('2025-12-24'::date, 'פיננסים'),
    ('2025-12-31'::date, 'פיננסים — פתיחת חברה ותמריצים'),
    ('2026-01-07'::date, 'Storytelling ועמידה מול קהל'),
    ('2026-01-14'::date, 'מצגת משקיעים'),
    ('2026-01-21'::date, 'גיוס הון בחברה פרטית'),
    ('2026-01-28'::date, 'Pre Demo Day + משובים'),
    ('2026-02-04'::date, 'Demo Day'),
    ('2026-02-11'::date, 'סיכום ומשוב'),
    ('2026-02-15'::date, 'סיכום ומשוב — מנטורים')
  );
  get diagnostics to_a = row_count;

  raise notice '% lectures moved A→B, % lectures moved back to A.', to_b, to_a;
end $$;
