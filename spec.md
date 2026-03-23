# OfekTech Portal — Implementation Plan

## Context
A Hebrew-only (RTL) portal for OfekTech accelerator members. Three roles: admin, candidate, mentor. Candidates submit free-text feedback after weekly lectures (auto-scheduled) and mentor sessions (manually created). Mentors can submit feedback on any candidate. Admin invites users and oversees all feedback.

## Tech Stack
- **Next.js 14** (App Router) — deployed on **Vercel**
- **Supabase** — Auth (Google OAuth + email/password with automatic identity linking), PostgreSQL database, Row Level Security
- **Tailwind CSS** — styling with RTL support
- **Resend** — Transactional emails (reminders, notifications)
- **Hebrew only** — `dir="rtl"`, `lang="he"` throughout

## Data Model (Supabase/PostgreSQL)

### `profiles`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK, FK → auth.users) | |
| email | text | |
| full_name | text | |
| role | enum: admin, candidate, mentor | |
| created_at | timestamp | |

### `lectures`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| title | text | e.g. "הרצאה 3 - שיווק" |
| scheduled_date | date | |
| created_by | uuid (FK → profiles) | admin |
| created_at | timestamp | |

### `mentor_sessions`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| candidate_id | uuid (FK → profiles) | |
| mentor_id | uuid (FK → profiles) | |
| session_date | date | |
| created_by | uuid (FK → profiles) | candidate or mentor |
| created_at | timestamp | |

### `lecture_feedback`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| lecture_id | uuid (FK → lectures) | |
| candidate_id | uuid (FK → profiles) | |
| content | text | free text |
| submitted_at | timestamp | |

### `session_feedback`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| session_id | uuid (FK → mentor_sessions) | |
| submitted_by | uuid (FK → profiles) | candidate OR mentor |
| role | enum: candidate, mentor | who submitted |
| content | text | free text |
| submitted_at | timestamp | |

### `weekly_checkins`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| candidate_id | uuid (FK → profiles) | |
| week_start | date | Monday of the relevant week |
| hours_invested | numeric | Hours on venture/project |
| hours_mentoring | numeric | Hours in mentor sessions |
| mood | int (1-5) | Confidence/mood scale |
| progress_feeling | text | "How do you feel about your progress?" |
| key_accomplishment | text | Main achievement this week |
| biggest_blocker | text | Current challenge |
| hit_last_goal | enum: yes, partially, no | Did they hit last week's goal? |
| goal_next_week | text | Goal for next week |
| lecture_usefulness | int (1-5) | How useful was this week's lecture? |
| mentor_usefulness | int (1-5) | How useful were mentor sessions? |
| submitted_at | timestamp | |

## Pages & Routes

### Public
- `/login` — Login page with Google sign-in button + email/password form

### Candidate (protected)
- `/` — Dashboard: list of pending & completed feedback forms + weekly check-in status
- `/checkin` — Weekly check-in form (one per week)
- `/lectures/[id]/feedback` — Fill in lecture feedback
- `/sessions/new` — Log a new mentor session
- `/sessions/[id]/feedback` — Fill in session feedback

### Mentor (protected)
- `/` — Dashboard: list of sessions & pending feedback
- `/sessions/new` — Log a new mentor session with a candidate
- `/sessions/[id]/feedback` — Fill in feedback on a candidate

### Admin (protected)
- `/admin` — Overview dashboard (submission stats, who's missing)
- `/admin/users` — Invite users (send email), manage roles
- `/admin/lectures` — Create/manage lecture schedule
- `/admin/feedback` — View all feedback (filterable by candidate, lecture, mentor)
- `/admin/checkins` — View weekly check-in data across all candidates (trends, who's missing)

## Key Behaviors

1. **Admin invites users** — Admin enters email + role → Supabase creates account with that email. User can then:
   - Click invite link → set a password (email/password login)
   - Or go directly to login page → sign in with Google (if their email matches, Supabase auto-links via "Automatic Identity Linking")
   - Users can use either method interchangeably after first login
   - **Supabase config required:** Enable Google OAuth provider + enable "Automatic Linking" in Auth settings
2. **Lecture feedback auto-appears** — When admin creates a lecture with a date, all candidates see it on their dashboard after that date as a pending form
3. **Mentor sessions created by mentor or candidate** — Either the mentor or candidate creates a session record (candidate + mentor + date) → both sides get a feedback form for it
4. **Weekly check-in** — Candidates fill in a weekly check-in form (one per week, resets every Monday). Dashboard shows if this week's check-in is pending
5. **Dashboard shows pending/completed** — Each user sees what they still need to fill in
5. **RLS** — Candidates see only their own feedback; mentors see sessions they're part of; admin sees everything

## Implementation Phases

### Phase 1: Project Setup
- Initialize Next.js 14 with App Router, TypeScript, Tailwind
- Configure RTL + Hebrew (layout with `dir="rtl"` and `lang="he"`)
- Set up Supabase project, env vars
- Install `@supabase/supabase-js` and `@supabase/ssr`

### Phase 2: Auth & Profiles
- Supabase Auth with email/password
- Login page (Hebrew)
- Auth middleware (protect routes)
- `profiles` table with trigger on `auth.users` insert
- Admin invite flow (Supabase `inviteUserByEmail`)

### Phase 3: Admin Pages
- `/admin/users` — list users, invite new ones
- `/admin/lectures` — CRUD for lecture schedule
- `/admin/feedback` — view all submitted feedback

### Phase 4: Candidate Flow
- Dashboard showing pending lecture feedback + session feedback + weekly check-in
- Weekly check-in form
- Lecture feedback form
- Create mentor session
- Session feedback form

### Phase 5: Mentor Flow
- Dashboard showing sessions they're involved in
- Session feedback form (mentor perspective)

### Phase 6: Polish
- Loading states, error handling
- Mobile responsive (RTL)
- Empty states in Hebrew

## Verification
- Create admin account, invite a test candidate and mentor
- Admin creates lectures → candidate sees pending feedback
- Candidate logs a mentor session → both candidate and mentor see feedback forms
- Admin views all feedback in admin panel
- Verify RTL layout works correctly throughout
