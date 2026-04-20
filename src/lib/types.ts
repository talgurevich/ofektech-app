export type UserRole = "admin" | "candidate" | "mentor" | "visitor";
export type GoalStatus = "yes" | "partially" | "no";
export type FeedbackRole = "candidate" | "mentor";

export interface Cohort {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Venture {
  id: string;
  name: string;
  description: string | null;
  cohort_id: string | null;
  created_at: string;
  cohort?: Cohort | null;
  members?: Profile[];
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  cohort_id: string | null;
  venture_id: string | null;
  onboarding_completed: boolean;
  avatar_url: string | null;
  phone: string | null;
  motto: string | null;
  linkedin_url: string | null;
  bio: string | null;
  venture_role: string | null;
  company: string | null;
  expertise: string | null;
  created_at: string;
  cohort?: Cohort | null;
  venture?: Venture | null;
}

export interface Lecture {
  id: string;
  lecture_number: number | null;
  title: string;
  description: string | null;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string;
  lecturer: string | null;
  recording_url: string | null;
  presentation_url: string | null;
  created_by: string;
  created_at: string;
}

export interface MentorSession {
  id: string;
  venture_id: string;
  mentor_id: string;
  session_date: string;
  created_by: string;
  created_at: string;
  venture?: Venture;
  mentor?: Profile;
}

export interface LectureFeedback {
  id: string;
  lecture_id: string;
  candidate_id: string;
  content: string;
  submitted_at: string;
  lecture?: Lecture;
  candidate?: Profile;
}

export interface SessionFeedback {
  id: string;
  session_id: string;
  submitted_by: string;
  role: FeedbackRole;
  content: string;
  submitted_at: string;
  session?: MentorSession;
}

export interface GuideChapter {
  id: string;
  chapter_number: number;
  title: string;
  content: string;
  created_at: string;
}

export interface VentureChapterEntry {
  id: string;
  venture_id: string;
  chapter_id: string;
  content: string;
  updated_at: string;
}

export interface Task {
  id: string;
  candidate_id: string | null;
  venture_id: string | null;
  description: string;
  owner: string;
  deadline: string | null;
  completed: boolean;
  created_at: string;
  created_by: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface MentorAssignment {
  id: string;
  mentor_id: string;
  venture_id: string;
  assigned_at: string;
  venture?: Venture;
  mentor?: Profile;
}

export interface WorkbookEntry {
  id: string;
  venture_id: string;
  sheet_key: string;
  data: Record<string, unknown>;
  position: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WeeklyCheckin {
  id: string;
  candidate_id: string;
  week_start: string;
  hours_invested: number | null;
  hours_mentoring: number | null;
  mood: number | null;
  progress_feeling: string | null;
  key_accomplishment: string | null;
  biggest_blocker: string | null;
  hit_last_goal: GoalStatus | null;
  goal_next_week: string | null;
  lecture_usefulness: number | null;
  mentor_usefulness: number | null;
  submitted_at: string;
  candidate?: Profile;
}
