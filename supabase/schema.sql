-- OfekTech Portal Database Schema
-- Run this in Supabase SQL Editor

-- Create role enum
create type user_role as enum ('admin', 'candidate', 'mentor', 'visitor');
create type goal_status as enum ('yes', 'partially', 'no');
create type checkin_type as enum ('weekly', 'monthly', 'opening', 'ending');
create type feedback_role as enum ('candidate', 'mentor');

-- Cohorts table
create table cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Profiles table (extends auth.users)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  full_name text not null default '',
  role user_role not null default 'candidate',
  cohort_id uuid references cohorts(id),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Auto-create profile on user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'candidate')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Lectures table
create table lectures (
  id uuid primary key default gen_random_uuid(),
  lecture_number int not null,
  title text not null,
  description text,
  scheduled_date date not null,
  start_time time not null,
  end_time time not null,
  location text not null default 'zoom',
  lecturer text,
  recording_url text,
  presentation_url text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

-- Mentor sessions table
create table mentor_sessions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references profiles(id),
  mentor_id uuid not null references profiles(id),
  session_date date not null,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

-- Lecture feedback table
create table lecture_feedback (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references lectures(id) on delete cascade,
  candidate_id uuid not null references profiles(id),
  content text not null default '',
  submitted_at timestamptz not null default now(),
  unique (lecture_id, candidate_id)
);

-- Session feedback table
create table session_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references mentor_sessions(id) on delete cascade,
  submitted_by uuid not null references profiles(id),
  role feedback_role not null,
  content text not null default '',
  rating_focus int check (rating_focus between 1 and 5),
  rating_progress int check (rating_progress between 1 and 5),
  rating_preparedness int check (rating_preparedness between 1 and 5),
  rating_initiative int check (rating_initiative between 1 and 5),
  rating_followthrough int check (rating_followthrough between 1 and 5),
  submitted_at timestamptz not null default now(),
  unique (session_id, submitted_by)
);

-- Guide chapters table
create table guide_chapters (
  id uuid primary key default gen_random_uuid(),
  chapter_number int not null,
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- Candidate chapter entries (their written content per chapter)
create table candidate_chapter_entries (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references profiles(id),
  chapter_id uuid not null references guide_chapters(id),
  content text not null default '',
  updated_at timestamptz not null default now(),
  unique (candidate_id, chapter_id)
);

-- Tasks table
create table tasks (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references profiles(id),
  description text not null,
  owner text not null default 'self',
  deadline date,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid not null references profiles(id)
);

-- Mentor assignments table
create table mentor_assignments (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references profiles(id),
  candidate_id uuid not null references profiles(id),
  assigned_at timestamptz not null default now(),
  unique (mentor_id, candidate_id)
);

-- Check-ins table (weekly, monthly, opening, ending)
create table checkins (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references profiles(id),
  type checkin_type not null,
  period_start date not null,
  -- shared fields
  mood int check (mood between 1 and 5),
  -- weekly fields
  hours_invested numeric,
  hours_mentoring numeric,
  progress_feeling text,
  key_accomplishment text,
  biggest_blocker text,
  hit_last_goal goal_status,
  goal_next_week text,
  lecture_usefulness int check (lecture_usefulness between 1 and 5),
  mentor_usefulness int check (mentor_usefulness between 1 and 5),
  -- monthly fields
  overall_satisfaction int check (overall_satisfaction between 1 and 5),
  monthly_highlights text,
  areas_for_improvement text,
  -- opening fields
  venture_name text,
  venture_stage text,
  expectations text,
  most_important_outcome text,
  main_goal_3m text,
  concerns text,
  team_notes text,
  program_goals text,
  background text,
  -- ending fields
  overall_experience int check (overall_experience between 1 and 5),
  key_takeaways text,
  recommendations text,
  would_recommend int check (would_recommend between 1 and 10),
  --
  submitted_at timestamptz not null default now(),
  unique (candidate_id, type, period_start)
);

-- ============================================
-- Row Level Security
-- ============================================

alter table cohorts enable row level security;
alter table profiles enable row level security;
alter table lectures enable row level security;
alter table mentor_sessions enable row level security;
alter table lecture_feedback enable row level security;
alter table session_feedback enable row level security;
alter table checkins enable row level security;

-- Helper: get current user's role
create or replace function get_user_role()
returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer stable;

-- Profiles: everyone can read, only admin can update role
-- Cohorts: everyone reads, admin manages
create policy "Anyone can read cohorts"
  on cohorts for select using (true);

create policy "Admin can manage cohorts"
  on cohorts for all using (get_user_role() = 'admin');

create policy "Anyone can read profiles"
  on profiles for select using (true);

create policy "Users can update own profile"
  on profiles for update using (id = auth.uid());

create policy "Admin can update any profile"
  on profiles for update using (get_user_role() = 'admin');

-- Lectures: everyone reads, admin creates/updates/deletes
create policy "Anyone can read lectures"
  on lectures for select using (true);

create policy "Admin can manage lectures"
  on lectures for all using (get_user_role() = 'admin');

-- Mentor sessions: participants + admin can see
create policy "Participants and admin can read sessions"
  on mentor_sessions for select using (
    candidate_id = auth.uid()
    or mentor_id = auth.uid()
    or get_user_role() = 'admin'
  );

create policy "Candidates and mentors can create sessions"
  on mentor_sessions for insert with check (
    created_by = auth.uid()
    and (get_user_role() in ('candidate', 'mentor'))
  );

create policy "Admin can manage sessions"
  on mentor_sessions for all using (get_user_role() = 'admin');

-- Lecture feedback: own + admin
create policy "Candidates see own lecture feedback"
  on lecture_feedback for select using (
    candidate_id = auth.uid()
    or get_user_role() = 'admin'
  );

create policy "Candidates submit own lecture feedback"
  on lecture_feedback for insert with check (
    candidate_id = auth.uid()
    and get_user_role() = 'candidate'
  );

create policy "Candidates update own lecture feedback"
  on lecture_feedback for update using (
    candidate_id = auth.uid()
  );

-- Session feedback: participants + admin
create policy "Participants and admin see session feedback"
  on session_feedback for select using (
    submitted_by = auth.uid()
    or get_user_role() = 'admin'
    or exists (
      select 1 from mentor_sessions ms
      where ms.id = session_id
      and (ms.candidate_id = auth.uid() or ms.mentor_id = auth.uid())
    )
  );

create policy "Participants submit session feedback"
  on session_feedback for insert with check (
    submitted_by = auth.uid()
  );

create policy "Participants update own session feedback"
  on session_feedback for update using (
    submitted_by = auth.uid()
  );

-- Guide chapters: anyone reads, admin manages
alter table guide_chapters enable row level security;
alter table candidate_chapter_entries enable row level security;

create policy "Anyone can read guide chapters"
  on guide_chapters for select using (true);

create policy "Admin can manage guide chapters"
  on guide_chapters for all using (get_user_role() = 'admin');

create policy "Candidates and assigned mentors see entries"
  on candidate_chapter_entries for select using (
    candidate_id = auth.uid()
    or get_user_role() = 'admin'
    or exists (
      select 1 from mentor_assignments
      where mentor_assignments.mentor_id = auth.uid()
      and mentor_assignments.candidate_id = candidate_chapter_entries.candidate_id
    )
  );

create policy "Candidates manage own entries"
  on candidate_chapter_entries for all using (candidate_id = auth.uid());

create policy "Admin can manage all entries"
  on candidate_chapter_entries for all using (get_user_role() = 'admin');

-- Mentor assignments: mentor sees own, admin manages
alter table mentor_assignments enable row level security;

create policy "Mentors see own assignments"
  on mentor_assignments for select using (
    mentor_id = auth.uid()
    or get_user_role() = 'admin'
  );

create policy "Admin can manage assignments"
  on mentor_assignments for all using (get_user_role() = 'admin');

-- Tasks: own + admin + assigned mentor
alter table tasks enable row level security;

create policy "Candidates and assigned mentors see tasks"
  on tasks for select using (
    candidate_id = auth.uid()
    or get_user_role() = 'admin'
    or exists (
      select 1 from mentor_assignments
      where mentor_assignments.mentor_id = auth.uid()
      and mentor_assignments.candidate_id = tasks.candidate_id
    )
  );

create policy "Candidates manage own tasks"
  on tasks for all using (
    candidate_id = auth.uid()
  );

create policy "Admin can manage all tasks"
  on tasks for all using (get_user_role() = 'admin');

-- Weekly check-ins: own + admin
create policy "Candidates see own checkins"
  on checkins for select using (
    candidate_id = auth.uid()
    or get_user_role() = 'admin'
  );

create policy "Candidates submit own checkins"
  on checkins for insert with check (
    candidate_id = auth.uid()
    and get_user_role() = 'candidate'
  );

create policy "Candidates update own checkins"
  on checkins for update using (
    candidate_id = auth.uid()
  );
