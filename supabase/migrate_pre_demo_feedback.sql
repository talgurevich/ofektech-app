-- Pre-demo day feedback (open portal, anyone with the link can submit)
create table if not exists pre_demo_feedback (
  id uuid primary key default gen_random_uuid(),
  venture_id uuid not null references ventures(id) on delete cascade,
  reviewer_name text not null,
  reviewer_role text,
  problem_clarity_rating int not null check (problem_clarity_rating between 1 and 5),
  problem_clarity_comment text,
  solution_conviction_rating int not null check (solution_conviction_rating between 1 and 5),
  solution_conviction_comment text,
  market_opportunity_rating int not null check (market_opportunity_rating between 1 and 5),
  market_opportunity_comment text,
  presentation_quality_rating int not null check (presentation_quality_rating between 1 and 5),
  presentation_quality_comment text,
  biggest_strength text,
  top_improvement text,
  submitter_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists pre_demo_feedback_venture_idx
  on pre_demo_feedback (venture_id, created_at desc);

alter table pre_demo_feedback enable row level security;

-- Anyone (including anonymous users) can submit feedback
create policy "Anyone can submit pre-demo feedback"
  on pre_demo_feedback for insert
  with check (true);

-- Only admins can read (venture-side visibility can be opened later)
create policy "Admins can read pre-demo feedback"
  on pre_demo_feedback for select
  using (get_user_role() = 'admin');

create policy "Admins can manage pre-demo feedback"
  on pre_demo_feedback for all
  using (get_user_role() = 'admin');
