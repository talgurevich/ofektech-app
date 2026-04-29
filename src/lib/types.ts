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
  cohort_id: string;
  created_by: string;
  created_at: string;
  cohort?: Cohort | null;
}

export interface MentorSession {
  id: string;
  venture_id: string;
  mentor_id: string;
  session_date: string;
  meeting_summary: string;
  summary_submitted_at: string | null;
  summary_submitted_by: string | null;
  created_by: string;
  created_at: string;
  venture?: Venture;
  mentor?: Profile;
}

export interface Post {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  author?: Pick<Profile, "id" | "full_name" | "email" | "avatar_url" | "role">;
}

export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  deleted_at: string | null;
  author?: Pick<Profile, "id" | "full_name" | "email" | "avatar_url" | "role">;
}

export type LectureResourceKind = "file" | "link";

export interface LectureResource {
  id: string;
  lecture_id: string;
  kind: LectureResourceKind;
  title: string;
  url: string;
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  position: number;
  created_by: string;
  created_at: string;
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

export type ActivityKind =
  | "workbook_added"
  | "workbook_updated"
  | "workbook_deleted"
  | "workbook_task_done"
  | "workbook_task_reopened"
  | "profile_updated"
  | "guide_updated"
  | "lecture_feedback"
  | "session_feedback"
  | "meeting_summary_submitted";

export interface VentureActivity {
  id: string;
  venture_id: string;
  actor_id: string | null;
  kind: ActivityKind;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
  actor?: Pick<Profile, "id" | "full_name" | "avatar_url"> | null;
  venture?: Pick<Venture, "id" | "name"> | null;
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

// WeeklyCheckin removed — feature deprecated. The opening (entry)
// checkin is still served by Profile + the `checkins` table where
// `type = "opening"`.
