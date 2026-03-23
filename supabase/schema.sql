-- OfekTech Portal Database Schema
-- Run this in Supabase SQL Editor

-- Create role enum
create type user_role as enum ('admin', 'candidate', 'mentor');
create type goal_status as enum ('yes', 'partially', 'no');
create type feedback_role as enum ('candidate', 'mentor');

-- Profiles table (extends auth.users)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  full_name text not null default '',
  role user_role not null default 'candidate',
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
  title text not null,
  scheduled_date date not null,
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
  submitted_at timestamptz not null default now(),
  unique (session_id, submitted_by)
);

-- Weekly check-ins table
create table weekly_checkins (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references profiles(id),
  week_start date not null,
  hours_invested numeric,
  hours_mentoring numeric,
  mood int check (mood between 1 and 5),
  progress_feeling text,
  key_accomplishment text,
  biggest_blocker text,
  hit_last_goal goal_status,
  goal_next_week text,
  lecture_usefulness int check (lecture_usefulness between 1 and 5),
  mentor_usefulness int check (mentor_usefulness between 1 and 5),
  submitted_at timestamptz not null default now(),
  unique (candidate_id, week_start)
);

-- ============================================
-- Row Level Security
-- ============================================

alter table profiles enable row level security;
alter table lectures enable row level security;
alter table mentor_sessions enable row level security;
alter table lecture_feedback enable row level security;
alter table session_feedback enable row level security;
alter table weekly_checkins enable row level security;

-- Helper: get current user's role
create or replace function get_user_role()
returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer stable;

-- Profiles: everyone can read, only admin can update role
create policy "Anyone can read profiles"
  on profiles for select using (true);

create policy "Users can update own profile"
  on profiles for update using (id = auth.uid());

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

-- Weekly check-ins: own + admin
create policy "Candidates see own checkins"
  on weekly_checkins for select using (
    candidate_id = auth.uid()
    or get_user_role() = 'admin'
  );

create policy "Candidates submit own checkins"
  on weekly_checkins for insert with check (
    candidate_id = auth.uid()
    and get_user_role() = 'candidate'
  );

create policy "Candidates update own checkins"
  on weekly_checkins for update using (
    candidate_id = auth.uid()
  );
