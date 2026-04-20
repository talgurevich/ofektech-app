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

-- Ventures table
create table ventures (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  cohort_id uuid references cohorts(id),
  created_at timestamptz not null default now()
);

-- Profiles table (extends auth.users)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  full_name text not null default '',
  role user_role not null default 'candidate',
  cohort_id uuid references cohorts(id),
  venture_id uuid references ventures(id),
  onboarding_completed boolean not null default false,
  avatar_url text,
  phone text,
  motto text,
  linkedin_url text,
  bio text,
  venture_role text,
  company text,
  expertise text,
  created_at timestamptz not null default now()
);

-- NOTE: No auto-create trigger. Profiles are created ONLY by the admin
-- invite API (/api/invite). This prevents unauthorized users from
-- getting access by self-registering via Google OAuth or magic link.

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

-- Mentor sessions table (per venture)
create table mentor_sessions (
  id uuid primary key default gen_random_uuid(),
  venture_id uuid not null references ventures(id),
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

-- Venture chapter entries (shared guide content per venture)
create table venture_chapter_entries (
  id uuid primary key default gen_random_uuid(),
  venture_id uuid not null references ventures(id),
  chapter_id uuid not null references guide_chapters(id),
  content text not null default '',
  updated_at timestamptz not null default now(),
  unique (venture_id, chapter_id)
);

-- Notifications table
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Tasks table (personal or venture-level)
create table tasks (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references profiles(id),
  venture_id uuid references ventures(id),
  description text not null,
  owner text not null default 'self',
  deadline date,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid not null references profiles(id)
);

-- Mentor assignments table (per venture)
create table mentor_assignments (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references profiles(id),
  venture_id uuid not null references ventures(id),
  assigned_at timestamptz not null default now(),
  unique (mentor_id, venture_id)
);

-- Workbook entries (per-venture structured "spreadsheet" rows)
create table workbook_entries (
  id uuid primary key default gen_random_uuid(),
  venture_id uuid not null references ventures(id) on delete cascade,
  sheet_key text not null,
  data jsonb not null default '{}'::jsonb,
  position int not null default 0,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workbook_entries_venture_sheet_idx on workbook_entries (venture_id, sheet_key, position);

-- Check-ins table (stays personal)
create table checkins (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references profiles(id),
  type checkin_type not null,
  period_start date not null,
  mood int check (mood between 1 and 5),
  hours_invested numeric,
  hours_mentoring numeric,
  progress_feeling text,
  key_accomplishment text,
  biggest_blocker text,
  hit_last_goal goal_status,
  goal_next_week text,
  lecture_usefulness int check (lecture_usefulness between 1 and 5),
  mentor_usefulness int check (mentor_usefulness between 1 and 5),
  overall_satisfaction int check (overall_satisfaction between 1 and 5),
  monthly_highlights text,
  areas_for_improvement text,
  venture_name text,
  venture_stage text,
  expectations text,
  most_important_outcome text,
  main_goal_3m text,
  concerns text,
  team_notes text,
  program_goals text,
  background text,
  overall_experience int check (overall_experience between 1 and 5),
  key_takeaways text,
  recommendations text,
  would_recommend int check (would_recommend between 1 and 10),
  submitted_at timestamptz not null default now(),
  unique (candidate_id, type, period_start)
);

-- ============================================
-- Row Level Security
-- ============================================

alter table cohorts enable row level security;
alter table ventures enable row level security;
alter table profiles enable row level security;
alter table lectures enable row level security;
alter table mentor_sessions enable row level security;
alter table lecture_feedback enable row level security;
alter table session_feedback enable row level security;
alter table guide_chapters enable row level security;
alter table venture_chapter_entries enable row level security;
alter table mentor_assignments enable row level security;
alter table tasks enable row level security;
alter table notifications enable row level security;
alter table checkins enable row level security;
alter table workbook_entries enable row level security;

-- Helper: get current user's role
create or replace function get_user_role()
returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer stable;

-- Cohorts
create policy "Anyone can read cohorts"
  on cohorts for select using (true);
create policy "Admin can manage cohorts"
  on cohorts for all using (get_user_role() = 'admin');

-- Ventures
create policy "Anyone can read ventures"
  on ventures for select using (true);
create policy "Admin can manage ventures"
  on ventures for all using (get_user_role() = 'admin');

-- Profiles
create policy "Anyone can read profiles"
  on profiles for select using (true);
create policy "Users can update own profile"
  on profiles for update using (id = auth.uid());
create policy "Admin can update any profile"
  on profiles for update using (get_user_role() = 'admin');

-- Lectures
create policy "Anyone can read lectures"
  on lectures for select using (true);
create policy "Admin can manage lectures"
  on lectures for all using (get_user_role() = 'admin');

-- Mentor sessions (venture-based)
create policy "Venture members and mentor can read sessions"
  on mentor_sessions for select using (
    mentor_id = auth.uid()
    or get_user_role() = 'admin'
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.venture_id = mentor_sessions.venture_id
    )
  );
create policy "Mentors can create sessions"
  on mentor_sessions for insert with check (
    created_by = auth.uid()
    and get_user_role() = 'mentor'
  );
create policy "Admin can manage sessions"
  on mentor_sessions for all using (get_user_role() = 'admin');

-- Lecture feedback
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
  on lecture_feedback for update using (candidate_id = auth.uid());

-- Session feedback (venture-based sessions)
create policy "Participants and admin see session feedback"
  on session_feedback for select using (
    submitted_by = auth.uid()
    or get_user_role() = 'admin'
    or exists (
      select 1 from mentor_sessions ms
      where ms.id = session_id
      and (
        ms.mentor_id = auth.uid()
        or exists (
          select 1 from profiles
          where profiles.id = auth.uid()
          and profiles.venture_id = ms.venture_id
        )
      )
    )
  );
create policy "Participants submit session feedback"
  on session_feedback for insert with check (submitted_by = auth.uid());
create policy "Participants update own session feedback"
  on session_feedback for update using (submitted_by = auth.uid());

-- Guide chapters
create policy "Anyone can read guide chapters"
  on guide_chapters for select using (true);
create policy "Admin can manage guide chapters"
  on guide_chapters for all using (get_user_role() = 'admin');

-- Venture chapter entries (shared per venture)
create policy "Venture members and assigned mentors see entries"
  on venture_chapter_entries for select using (
    get_user_role() = 'admin'
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.venture_id = venture_chapter_entries.venture_id
    )
    or exists (
      select 1 from mentor_assignments
      where mentor_assignments.mentor_id = auth.uid()
      and mentor_assignments.venture_id = venture_chapter_entries.venture_id
    )
  );
create policy "Venture members manage own entries"
  on venture_chapter_entries for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.venture_id = venture_chapter_entries.venture_id
    )
  );
create policy "Admin can manage all entries"
  on venture_chapter_entries for all using (get_user_role() = 'admin');

-- Mentor assignments (venture-based)
create policy "Mentors and venture members see assignments"
  on mentor_assignments for select using (
    mentor_id = auth.uid()
    or get_user_role() = 'admin'
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.venture_id = mentor_assignments.venture_id
    )
  );
create policy "Admin can manage assignments"
  on mentor_assignments for all using (get_user_role() = 'admin');

-- Tasks (personal + venture)
create policy "Users see own and venture tasks"
  on tasks for select using (
    candidate_id = auth.uid()
    or get_user_role() = 'admin'
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.venture_id = tasks.venture_id
      and tasks.venture_id is not null
    )
    or exists (
      select 1 from mentor_assignments
      where mentor_assignments.mentor_id = auth.uid()
      and (
        mentor_assignments.venture_id = tasks.venture_id
        or exists (
          select 1 from profiles p2
          where p2.id = tasks.candidate_id
          and p2.venture_id = mentor_assignments.venture_id
        )
      )
    )
  );
create policy "Candidates manage own tasks"
  on tasks for all using (candidate_id = auth.uid());
create policy "Venture members manage venture tasks"
  on tasks for all using (
    tasks.venture_id is not null
    and exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.venture_id = tasks.venture_id
    )
  );
create policy "Admin can manage all tasks"
  on tasks for all using (get_user_role() = 'admin');
create policy "Mentors can add tasks to assigned ventures"
  on tasks for insert with check (
    exists (
      select 1 from mentor_assignments
      where mentor_assignments.mentor_id = auth.uid()
      and (
        mentor_assignments.venture_id = tasks.venture_id
        or exists (
          select 1 from profiles p2
          where p2.id = tasks.candidate_id
          and p2.venture_id = mentor_assignments.venture_id
        )
      )
    )
  );

-- Notifications
create policy "Users see own notifications"
  on notifications for select using (user_id = auth.uid());
create policy "Users update own notifications"
  on notifications for update using (user_id = auth.uid());
create policy "Authenticated users can insert notifications"
  on notifications for insert with check (true);
create policy "Admin can manage all notifications"
  on notifications for all using (get_user_role() = 'admin');

-- Workbook entries (per-venture)
create policy "Venture members and assigned mentors read workbook"
  on workbook_entries for select using (
    get_user_role() = 'admin'
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.venture_id = workbook_entries.venture_id
    )
    or exists (
      select 1 from mentor_assignments
      where mentor_assignments.mentor_id = auth.uid()
      and mentor_assignments.venture_id = workbook_entries.venture_id
    )
  );
create policy "Venture members manage workbook"
  on workbook_entries for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.venture_id = workbook_entries.venture_id
    )
  );
create policy "Admin manages all workbook entries"
  on workbook_entries for all using (get_user_role() = 'admin');

-- Check-ins (personal)
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
  on checkins for update using (candidate_id = auth.uid());
