import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  ListTodo,
  BookOpen,
  MessageSquare,
  CheckCircle2,
  Circle,
  CalendarDays,
  Users,
  Mic2,
  ClipboardCheck,
  BarChart3,
  Briefcase,
  User,
  Phone,
  ExternalLink,
} from "lucide-react";

export default async function AdminCandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: candidateId } = await params;
  const supabase = await createClient();

  // Get candidate profile with cohort
  const { data: candidate } = await supabase
    .from("profiles")
    .select("*, cohort:cohorts(name), venture:ventures(id, name)")
    .eq("id", candidateId)
    .single();

  if (!candidate) redirect("/admin/users");

  const ventureId = candidate.venture_id;
  const ventureName = (candidate.venture as { id: string; name: string } | null)?.name;

  // Get assigned mentor (via venture)
  let mentorProfile: { full_name: string; email: string } | null = null;
  if (ventureId) {
    const { data: mentorAssignment } = await supabase
      .from("mentor_assignments")
      .select("*, mentor:profiles!mentor_assignments_mentor_id_fkey(full_name, email)")
      .eq("venture_id", ventureId)
      .limit(1)
      .maybeSingle();
    mentorProfile = mentorAssignment?.mentor as { full_name: string; email: string } | null;
  }

  // Get venture members
  let ventureMembers: { id: string; full_name: string }[] = [];
  if (ventureId) {
    const { data: members } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("venture_id", ventureId)
      .neq("id", candidateId);
    ventureMembers = members || [];
  }

  // Get opening check-in
  const { data: openingCheckin } = await supabase
    .from("checkins")
    .select("*")
    .eq("candidate_id", candidateId)
    .eq("type", "opening")
    .limit(1)
    .maybeSingle();

  // Get venture tasks (from the workbook)
  type AdminTask = {
    id: string;
    description: string;
    owner: string;
    deadline: string;
    completed: boolean;
  };
  let workbookTasks: AdminTask[] = [];
  if (ventureId) {
    const { data } = await supabase
      .from("workbook_entries")
      .select("id, data, position, created_at")
      .eq("venture_id", ventureId)
      .eq("sheet_key", "tasks")
      .order("position", { ascending: true });
    workbookTasks = (data || []).map((row) => {
      const d = (row.data || {}) as Record<string, unknown>;
      return {
        id: row.id,
        description: typeof d.task === "string" ? d.task : "",
        owner: typeof d.assignee === "string" ? d.assignee : "",
        deadline: typeof d.due_date === "string" ? d.due_date : "",
        completed: d.done === true,
      };
    });
  }

  const allTasks = workbookTasks;
  const openTasks = allTasks.filter((t) => !t.completed);
  const completedTasks = allTasks.filter((t) => t.completed);

  // Get guide chapters + venture entries
  const { data: chapters } = await supabase
    .from("guide_chapters")
    .select("*")
    .order("chapter_number", { ascending: true });

  let entries: { chapter_id: string; content: string }[] = [];
  if (ventureId) {
    const { data } = await supabase
      .from("venture_chapter_entries")
      .select("*")
      .eq("venture_id", ventureId);
    entries = data || [];
  }

  const entriesByChapter = new Map(
    entries.map((e) => [e.chapter_id, e.content])
  );

  const filledChapters = entries.filter(
    (e) => e.content && e.content.trim() !== ""
  ).length;

  // Get lecture feedback by this candidate
  const { data: lectureFeedback } = await supabase
    .from("lecture_feedback")
    .select("*, lecture:lectures(title, scheduled_date, lecture_number)")
    .eq("candidate_id", candidateId)
    .order("submitted_at", { ascending: false });

  // Get session feedback for sessions with this candidate's venture
  let sessionFeedback: Array<{
    id: string;
    content: string;
    rating_focus: number | null;
    rating_progress: number | null;
    rating_preparedness: number | null;
    rating_initiative: number | null;
    rating_followthrough: number | null;
    session: { session_date: string; mentor_id: string } | null;
  }> = [];

  if (ventureId) {
    const { data: ventureSessions } = await supabase
      .from("mentor_sessions")
      .select("id")
      .eq("venture_id", ventureId);

    const sessionIds = ventureSessions?.map((s) => s.id) || [];

    if (sessionIds.length > 0) {
      const { data } = await supabase
        .from("session_feedback")
        .select("*, session:mentor_sessions(session_date, mentor_id)")
        .in("session_id", sessionIds)
        .eq("role", "mentor")
        .order("submitted_at", { ascending: false });
      sessionFeedback = (data || []) as typeof sessionFeedback;
    }
  }

  // Get mentor names for session feedback
  const mentorIds = [
    ...new Set(
      sessionFeedback.map((fb) => fb.session?.mentor_id).filter(Boolean) as string[]
    ),
  ];

  const { data: mentorProfiles } = mentorIds.length > 0
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", mentorIds)
    : { data: [] as never[] };

  const mentorNameMap = new Map(
    (mentorProfiles || []).map((p) => [p.id, p.full_name])
  );

  const cohortName = (candidate.cohort as { name: string } | null)?.name;

  const ownerLabel = (owner: string) => owner || "—";

  return (
    <div className="space-y-6">
      {/* Back link + header */}
      <div>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1a2744] transition-colors mb-3"
        >
          <ArrowRight className="size-4" />
          חזרה לניהול משתמשים
        </Link>
        <div className="flex items-center gap-3">
          {candidate.avatar_url ? (
            <img
              src={candidate.avatar_url}
              alt={candidate.full_name || ""}
              className="size-14 rounded-full object-cover ring-2 ring-gray-100 shrink-0"
            />
          ) : (
            <div className="flex size-14 items-center justify-center rounded-full bg-[#22c55e]/20 ring-2 ring-gray-100 shrink-0">
              <span className="text-xl font-bold text-[#22c55e]">
                {(candidate.full_name || "?").charAt(0)}
              </span>
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-[#1a2744]">
              {candidate.full_name || "---"}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-gray-500" dir="ltr">
                {candidate.email}
              </p>
              {cohortName && (
                <Badge className="text-[10px] bg-[#22c55e]/10 text-[#22c55e] border-0">
                  {cohortName}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1.5">
              {candidate.phone && (
                <a
                  href={`tel:${candidate.phone.replace(/-/g, "")}`}
                  className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#22c55e] transition-colors"
                  dir="ltr"
                >
                  <Phone className="size-3.5" />
                  {candidate.phone}
                </a>
              )}
              {candidate.linkedin_url && (
                <a
                  href={candidate.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#22c55e] transition-colors"
                  dir="ltr"
                >
                  LinkedIn
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          </div>
        </div>
        {candidate.bio && (
          <p className="mt-3 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
            {candidate.bio}
          </p>
        )}

        {/* Venture + Mentor info */}
        <div className="mt-3 space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Briefcase className="size-4 text-gray-400" />
            <span className="font-medium">מיזם: </span>
            {ventureName ? (
              <span>
                {ventureName}
                {ventureMembers.length > 0 && (
                  <span className="text-gray-400">
                    {" "}(עם {ventureMembers.map((m) => m.full_name).join(", ")})
                  </span>
                )}
              </span>
            ) : (
              <span className="text-gray-400">לא משובץ למיזם</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="size-4 text-gray-400" />
            <span className="font-medium">מנטור/ית: </span>
            {mentorProfile ? (
              <span>{mentorProfile.full_name}</span>
            ) : (
              <span className="text-gray-400">לא משובץ</span>
            )}
          </div>
        </div>
      </div>

      {/* Section 1: Overview */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1a2744]">
            <BarChart3 className="size-5" />
            סקירה
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <p className="text-2xl font-bold text-[#1a2744]">
                {openTasks.length}
              </p>
              <p className="text-xs text-gray-500">משימות פתוחות</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <p className="text-2xl font-bold text-[#22c55e]">
                {completedTasks.length}
              </p>
              <p className="text-xs text-gray-500">משימות שהושלמו</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <p className="text-2xl font-bold text-[#1a2744]">
                {filledChapters}/{chapters?.length || 0}
              </p>
              <p className="text-xs text-gray-500">פרקי מדריך</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <p className="text-2xl font-bold text-[#1a2744]">
                {lectureFeedback?.length || 0}
              </p>
              <p className="text-xs text-gray-500">משובים שהוגשו</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Opening Check-in */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1a2744]">
            <ClipboardCheck className="size-5" />
            שאלון פתיחה
          </CardTitle>
        </CardHeader>
        <CardContent>
          {openingCheckin ? (
            <div className="space-y-3">
              {[
                { label: "שם המיזם", value: openingCheckin.venture_name },
                { label: "שלב המיזם", value: openingCheckin.venture_stage },
                { label: "ציפיות", value: openingCheckin.expectations },
                { label: "התוצאה החשובה ביותר", value: openingCheckin.most_important_outcome },
                { label: "מטרה ל-3 חודשים", value: openingCheckin.main_goal_3m },
                { label: "מצב רוח", value: openingCheckin.mood ? `${openingCheckin.mood}/5` : null },
                { label: "חששות", value: openingCheckin.concerns },
                { label: "הערות צוות", value: openingCheckin.team_notes },
              ].map((field) => (
                <div key={field.label}>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">
                    {field.label}
                  </p>
                  <p className="text-sm text-[#1a2744] whitespace-pre-wrap">
                    {field.value || "---"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">
              לא מילא/ה
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Tasks */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1a2744]">
            <ListTodo className="size-5" />
            משימות
          </CardTitle>
          <CardDescription>
            {openTasks.length} פתוחות, {completedTasks.length} הושלמו
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {openTasks.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">פתוחות</p>
              {openTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 rounded-lg p-3 bg-gray-50/50"
                >
                  <Circle className="size-4 text-gray-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#1a2744]">{task.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {task.owner && (
                        <Badge variant="secondary" className="text-[10px]">
                          {ownerLabel(task.owner)}
                        </Badge>
                      )}
                      {task.deadline && (
                        <span className="text-xs text-gray-500">
                          {formatDate(task.deadline)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {completedTasks.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">הושלמו</p>
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 rounded-lg p-3 bg-green-50/30"
                >
                  <CheckCircle2 className="size-4 text-[#22c55e] mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500 line-through">
                      {task.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {task.owner && (
                        <Badge variant="secondary" className="text-[10px]">
                          {ownerLabel(task.owner)}
                        </Badge>
                      )}
                      {task.deadline && (
                        <span className="text-xs text-gray-400">
                          {formatDate(task.deadline)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {allTasks.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              אין משימות
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Guide */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1a2744]">
            <BookOpen className="size-5" />
            מדריך התוכנית
            {ventureName && (
              <Badge className="text-[10px] bg-[#1a2744]/10 text-[#1a2744] border-0 mr-2">
                משותף למיזם
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {filledChapters} מתוך {chapters?.length || 0} פרקים מולאו
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(chapters || []).map((chapter) => {
            const content = entriesByChapter.get(chapter.id);
            const isFilled = !!content && content.trim() !== "";

            return (
              <div
                key={chapter.id}
                className={`rounded-lg p-3 ${
                  isFilled ? "bg-green-50/30" : "bg-gray-50/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {isFilled ? (
                    <Badge className="text-[10px] bg-[#22c55e]/10 text-[#22c55e] border-0">
                      מולא
                    </Badge>
                  ) : (
                    <Badge className="text-[10px] bg-gray-100 text-gray-400 border-0">
                      ריק
                    </Badge>
                  )}
                  <p className="text-sm font-medium text-[#1a2744]">
                    פרק {chapter.chapter_number}: {chapter.title}
                  </p>
                </div>
                {isFilled ? (
                  <div className="mt-2 rounded-md bg-gray-100 p-3">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {content}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mr-2">טרם מולא</p>
                )}
              </div>
            );
          })}

          {(!chapters || chapters.length === 0) && (
            <p className="text-sm text-gray-400 text-center py-4">
              אין פרקים במדריך
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Lecture Feedback */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1a2744]">
            <Mic2 className="size-5" />
            משובי הרצאות
          </CardTitle>
          <CardDescription>
            {lectureFeedback?.length || 0} משובים
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(lectureFeedback || []).map((fb) => {
            const lecture = fb.lecture as {
              title: string;
              scheduled_date: string;
              lecture_number: number | null;
            } | null;

            return (
              <div key={fb.id} className="rounded-lg p-3 bg-gray-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <Mic2 className="size-4 text-gray-400" />
                  <span className="text-sm font-medium text-[#1a2744]">
                    {lecture?.title || "---"}
                  </span>
                  {lecture?.scheduled_date && (
                    <span className="text-xs text-gray-500">
                      {formatDate(lecture.scheduled_date)}
                    </span>
                  )}
                </div>
                {fb.content && (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                    {fb.content}
                  </p>
                )}
              </div>
            );
          })}

          {(!lectureFeedback || lectureFeedback.length === 0) && (
            <p className="text-sm text-gray-400 text-center py-4">
              אין משובי הרצאות
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section 6: Session Feedback */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1a2744]">
            <MessageSquare className="size-5" />
            משובי מנטורינג
          </CardTitle>
          <CardDescription>
            {sessionFeedback.length} משובים
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessionFeedback.map((fb) => {
            const session = fb.session;
            const mentorName = session?.mentor_id
              ? mentorNameMap.get(session.mentor_id) || "---"
              : "---";

            return (
              <div key={fb.id} className="rounded-lg p-3 bg-gray-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="size-4 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {session?.session_date
                      ? formatDate(session.session_date)
                      : "---"}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {mentorName}
                  </Badge>
                  {fb.rating_focus && (
                    <div className="flex gap-1 mr-auto">
                      {[
                        { key: "rating_focus", label: "מיקוד" },
                        { key: "rating_progress", label: "התקדמות" },
                        { key: "rating_preparedness", label: "מוכנות" },
                        { key: "rating_initiative", label: "יוזמה" },
                        { key: "rating_followthrough", label: "יישום" },
                      ].map((r) => {
                        const val = fb[r.key as keyof typeof fb] as number | null;
                        if (!val) return null;
                        return (
                          <Badge
                            key={r.key}
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {r.label}: {val}/5
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
                {fb.content && (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                    {fb.content}
                  </p>
                )}
              </div>
            );
          })}

          {sessionFeedback.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              אין משובי מנטורינג
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
