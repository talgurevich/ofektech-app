export type UserRole = "admin" | "candidate" | "mentor" | "visitor";
export type GoalStatus = "yes" | "partially" | "no";
export type FeedbackRole = "candidate" | "mentor";

export interface Cohort {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  cohort_id: string | null;
  onboarding_completed: boolean;
  created_at: string;
  cohort?: Cohort | null;
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
  candidate_id: string;
  mentor_id: string;
  session_date: string;
  created_by: string;
  created_at: string;
  // joined fields
  candidate?: Profile;
  mentor?: Profile;
}

export interface LectureFeedback {
  id: string;
  lecture_id: string;
  candidate_id: string;
  content: string;
  submitted_at: string;
  // joined
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
  // joined
  session?: MentorSession;
}

export interface GuideChapter {
  id: string;
  chapter_number: number;
  title: string;
  content: string;
  created_at: string;
}

export interface CandidateChapterEntry {
  id: string;
  candidate_id: string;
  chapter_id: string;
  content: string;
  updated_at: string;
}

export interface Task {
  id: string;
  candidate_id: string;
  description: string;
  owner: string;
  deadline: string | null;
  completed: boolean;
  created_at: string;
  created_by: string;
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
  // joined
  candidate?: Profile;
}
