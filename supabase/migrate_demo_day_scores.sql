-- Demo Day judges scorecard.
--
-- The form lives at /demo-day-judges behind a general link: judges type their own
-- name, there is no login. Scores are therefore written ONLY by the service-role
-- client in /api/demo-day-judges, which validates the payload first.
--
-- PRIVACY: results must not be visible anywhere in the portal — not to the venture
-- teams, not to their mentors, not even to other admins. Unlike pre_demo_feedback
-- (see migrate_pre_demo_feedback_venture_read.sql, which opened reads to candidates
-- and mentors), this table has RLS enabled and DELIBERATELY NO POLICIES AT ALL.
-- With RLS on and zero policies, every anon/authenticated request is denied, so a
-- team member holding their own JWT gets an empty set from PostgREST. The service
-- role bypasses RLS, so the owner-gated admin page still reads everything.
-- Do not add a select policy here.

create table if not exists demo_day_scores (
  id uuid primary key default gen_random_uuid(),
  venture_id uuid not null references ventures(id) on delete cascade,

  -- judge_name is what they typed; judge_name_key is the normalized form
  -- (lowercased, trimmed, inner whitespace collapsed) used for identity, so
  -- "דני כהן" / "דני  כהן " / "Dani Cohen " don't become three judges.
  judge_name text not null,
  judge_name_key text not null,

  -- ציר עסקי
  business_potential_rating int not null
    check (business_potential_rating between 1 and 5),
  customer_validation_rating int not null
    check (customer_validation_rating between 1 and 5),
  strategic_partnerships_rating int not null
    check (strategic_partnerships_rating between 1 and 5),
  -- ציר מוצרי
  mvp_progress_rating int not null
    check (mvp_progress_rating between 1 and 5),
  target_customer_fit_rating int not null
    check (target_customer_fit_rating between 1 and 5),
  -- ציר יזמי (נראות מוצר is intentionally excluded from the judges' scorecard)
  presentation_look_rating int not null
    check (presentation_look_rating between 1 and 5),
  story_rating int not null
    check (story_rating between 1 and 5),
  team_rating int not null
    check (team_rating between 1 and 5),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One scorecard per judge per venture. A re-submit updates it instead of
  -- double-counting that judge in the leaderboard.
  unique (judge_name_key, venture_id)
);

create index if not exists demo_day_scores_venture_idx
  on demo_day_scores (venture_id);

alter table demo_day_scores enable row level security;
