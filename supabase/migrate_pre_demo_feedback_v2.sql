-- Pre-demo feedback v2: three evaluation axes, ratings only (no free text).
-- Old v1 columns are kept (made nullable) so the two existing rows survive.

alter table pre_demo_feedback
  -- ציר עסקי
  add column if not exists business_potential_rating int
    check (business_potential_rating between 1 and 5),
  add column if not exists customer_validation_rating int
    check (customer_validation_rating between 1 and 5),
  add column if not exists strategic_partnerships_rating int
    check (strategic_partnerships_rating between 1 and 5),
  -- ציר מוצרי
  add column if not exists mvp_progress_rating int
    check (mvp_progress_rating between 1 and 5),
  add column if not exists target_customer_fit_rating int
    check (target_customer_fit_rating between 1 and 5),
  -- ציר יזמי
  add column if not exists presentation_look_rating int
    check (presentation_look_rating between 1 and 5),
  add column if not exists product_look_rating int
    check (product_look_rating between 1 and 5),
  add column if not exists story_rating int
    check (story_rating between 1 and 5),
  add column if not exists team_rating int
    check (team_rating between 1 and 5);

-- v1 ratings are no longer collected; relax them so new rows can omit them.
alter table pre_demo_feedback
  alter column problem_clarity_rating drop not null,
  alter column solution_conviction_rating drop not null,
  alter column market_opportunity_rating drop not null,
  alter column presentation_quality_rating drop not null;
