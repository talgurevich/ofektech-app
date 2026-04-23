-- Seed the syllabus for the currently active cohort.
-- Safe to re-run: each lecture is guarded by (cohort_id, scheduled_date, title).
-- Requires: exactly one cohort flagged is_active = true, and at least one admin
-- profile (used for created_by).

do $$
declare
  v_cohort uuid;
  v_admin uuid;
begin
  select id into v_cohort from cohorts where is_active = true;
  if v_cohort is null then
    raise exception 'No active cohort. Set one cohort is_active = true before running.';
  end if;

  select id into v_admin from profiles where role = 'admin' order by created_at limit 1;
  if v_admin is null then
    raise exception 'No admin profile found — cannot populate created_by.';
  end if;

  insert into lectures (
    lecture_number, title, description, scheduled_date,
    start_time, end_time, location, lecturer,
    cohort_id, created_by
  )
  select n, t, d, dt, st, et, loc, lec, v_cohort, v_admin
  from (values
    (null::int,
      'הכשרה למנטורים'::text,
      'הכרות עם התכנית והתהליך: מטרות התכנית, כלי היזמות שיירכשו המשתתפים, תוצרי התכנית המצופים, ודגשים ועקרונות לליווי בתהליך מנטורינג.'::text,
      '2025-09-17'::date,
      '17:00'::time,
      '19:30'::time,
      'זום'::text,
      'SeedBiz'::text),
    (null,
      'מפגש פתיחה והשקת התוכנית',
      'מינדסט יזמי, חדשנות טכנולוגית, סקירה על עולם החדשנות.',
      '2025-10-22',
      '17:00', '20:00',
      'PWC — מתחם מידטאון',
      'SeedBiz + יזהר שי'),
    (1,
      'צעדים ראשונים בהקמת מיזם',
      'הקמת חברה, הסכמי מייסדים, התקשרויות עם צדדים שלישיים, סודיות וקניין רוחני.',
      '2025-10-29',
      '17:00', '20:00',
      'זום',
      'אורן שרון (SFA & Co.) + SeedBiz'),
    (2,
      'הרעיון: סדנת רעיונאות ואימות הרעיון',
      'סדנה לגיבוש רעיון סביב בעיה קיימת ובדיקת הפוטנציאל שלו להצלחה.',
      '2025-11-05',
      '17:00', '20:00',
      'זום',
      'SeedBiz — יואב קוגלר'),
    (3,
      'חקר שוק',
      'חשיבותו ועקרונותיו של חקר שוק. מטרת המפגש לתת את הכלים לביצוע בדיקות שוק באמצעות כלים בסיסיים ומתקדמים.',
      '2025-11-12',
      '17:00', '20:00',
      'זום',
      'SeedBiz — יואב קוגלר'),
    (4,
      'כלי AI',
      'הכרות עם כלי AI שונים והיכולת שלהם לסייע בשלבי פיתוח המיזם השונים.',
      '2025-11-19',
      '17:00', '20:00',
      'זום',
      'SeedBiz — רם עמדי'),
    (5,
      'בניית מודל עסקי — Lean Canvas',
      'נלמד על Lean Canvas, כלי לתכנון תכנית עסקית עבור סטארטאפים.',
      '2025-11-26',
      '17:00', '20:00',
      'משרדי SeedBiz, ראשון לציון',
      'SeedBiz — דניאל קוגלר'),
    (6,
      'גיוס הון',
      null,
      '2025-12-03',
      '17:00', '20:00',
      'זום',
      'SeedBiz — ניצן פלג'),
    (7,
      'גיוס הון — אלרון ונצ''רס',
      'מפגש עם קרן הון סיכון מובילה — טיפים לגיוס השקעה למיזם.',
      '2025-12-10',
      '17:00', '19:00',
      'זום',
      'אלרון ונצ''רס'),
    (8,
      'Go-To-Market',
      'הכנת תכנית עסקית לפי קהלי היעד, שיווק במיזם בערוצים השונים.',
      '2025-12-17',
      '17:00', '20:00',
      'זום',
      'SeedBiz — דניאל קוגלר'),
    (9,
      'פיננסים',
      'מושגים בסיסיים בהיבט הפיננסי + מודל עסקי מנצח.',
      '2025-12-24',
      '17:00', '20:00',
      'זום',
      'PWC'),
    (10,
      'פיננסים — פתיחת חברה ותמריצים',
      'פתיחת חברה, היכן כדאי? + רשות החדשנות ותמריצים.',
      '2025-12-31',
      '17:00', '20:00',
      'זום',
      'PWC'),
    (11,
      'Storytelling ועמידה מול קהל',
      'סדנה להכשרת המשתתפים לקראת הצגת המיזם העתידי מול לקוחות ומשקיעים.',
      '2026-01-07',
      '17:00', '20:00',
      'מתחם SeedBiz, ראשון לציון',
      'אמיר רווה (HYPE Sports Innovation)'),
    (12,
      'מצגת משקיעים',
      null,
      '2026-01-14',
      '17:00', '20:00',
      'זום',
      'SeedBiz — יואב קוגלר'),
    (13,
      'גיוס הון בחברה פרטית',
      'סקירת אפשרויות גיוס הון בחברה פרטית, יתרונות וחסרונות של כל מודל, טיפים לניהול מו"מ מול משקיעים.',
      '2026-01-21',
      '17:00', '19:00',
      'זום',
      'SFA & Co.'),
    (14,
      'Pre Demo Day + משובים',
      'פיתוח מיזמים — עבודה מואצת על המיזמים בליווי מנטורים מקצועיים למשך 8 שעות.',
      '2026-01-28',
      '16:00', '21:00',
      'PWC — חיפה',
      'SeedBiz — ניצן פלג'),
    (15,
      'Demo Day',
      'הצגה מנצחת — הצגת המיזם בפני פאנל משקיעים. סיום חגיגי של התכנית.',
      '2026-02-04',
      '16:00', '21:00',
      'PWC — מתחם מידטאון',
      'SeedBiz — ניצן פלג'),
    (16,
      'סיכום ומשוב',
      null,
      '2026-02-11',
      '17:00', '19:30',
      'זום',
      'SeedBiz + צוות התוכנית'),
    (17,
      'סיכום ומשוב — מנטורים',
      null,
      '2026-02-15',
      '17:00', '19:00',
      'ימסר בהמשך',
      null)
  ) as src(n, t, d, dt, st, et, loc, lec)
  where not exists (
    select 1 from lectures l
    where l.cohort_id = v_cohort
      and l.scheduled_date = src.dt
      and l.title = src.t
  );
end $$;
