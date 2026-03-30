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
  CheckCircle2,
  Clock,
  MessageSquare,
  Mic2,
  CalendarDays,
  ArrowLeft,
  MapPin,
  Video,
  Users,
  Phone,
  Mail,
  FileText,
  ExternalLink,
  Sparkles,
  ListTodo,
  BookOpen,
} from "lucide-react";
import {
  AnimatedContainer,
  AnimatedItem,
} from "@/components/dashboard-shell";

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Admin redirect
  if (profile.role === "admin") {
    redirect("/admin");
  }

  // Onboarding for new users
  if (!profile.onboarding_completed) {
    redirect("/onboarding");
  }

  if (profile.role === "visitor") {
    return (
      <VisitorDashboard userId={user.id} fullName={profile.full_name} />
    );
  }

  if (profile.role === "candidate") {
    return (
      <CandidateDashboard
        userId={user.id}
        fullName={profile.full_name}
      />
    );
  }

  return <MentorDashboard userId={user.id} fullName={profile.full_name} />;
}

async function VisitorDashboard({
  userId,
  fullName,
}: {
  userId: string;
  fullName?: string;
}) {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  // Get all lectures
  const { data: lectures } = await supabase
    .from("lectures")
    .select("*")
    .order("scheduled_date", { ascending: true });

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-8">
      <AnimatedContainer>
        {/* Greeting */}
        <AnimatedItem>
          <div className="mb-2">
            <h1 className="text-2xl font-bold text-[#1a2744]">
              שלום{fullName ? `, ${fullName}` : ""}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              ברוכים הבאים לפורטל OfekTech
            </p>
          </div>
        </AnimatedItem>

        {/* Lectures */}
        <AnimatedItem>
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#1a2744]">
                <Mic2 className="size-5" />
                הרצאות
              </CardTitle>
              <CardDescription>לוח הרצאות התוכנית</CardDescription>
            </CardHeader>
            <CardContent>
              {!lectures || lectures.length === 0 ? (
                <p className="text-gray-400 text-sm py-4 text-center">
                  אין הרצאות כרגע
                </p>
              ) : (
                <div className="space-y-3">
                  {lectures.map((lecture) => {
                    const isPast = lecture.scheduled_date <= today;

                    return (
                      <div
                        key={lecture.id}
                        className={`flex items-start gap-4 rounded-lg p-3 transition-colors ${
                          !isPast
                            ? "bg-gray-50/50"
                            : "bg-white hover:bg-gray-50/50"
                        }`}
                      >
                        <div
                          className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                            isPast
                              ? "bg-[#1a2744] text-white"
                              : "bg-gray-200 text-gray-500"
                          }`}
                        >
                          {lecture.lecture_number || "#"}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#1a2744]">
                            {lecture.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">
                              {formatDate(lecture.scheduled_date)}
                            </span>
                            {lecture.lecturer && (
                              <span className="text-xs text-gray-400">
                                {lecture.lecturer}
                              </span>
                            )}
                            {lecture.location && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] gap-1"
                              >
                                {lecture.location === "זום" ? (
                                  <Video className="size-3" />
                                ) : (
                                  <MapPin className="size-3" />
                                )}
                                {lecture.location}
                              </Badge>
                            )}
                            {isPast && lecture.recording_url && (
                              <a
                                href={lecture.recording_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-[#22c55e] hover:underline"
                              >
                                <Video className="size-3" />
                                הקלטה
                                <ExternalLink className="size-2.5" />
                              </a>
                            )}
                            {isPast && lecture.presentation_url && (
                              <a
                                href={lecture.presentation_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-[#22c55e] hover:underline"
                              >
                                <FileText className="size-3" />
                                מצגת
                                <ExternalLink className="size-2.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0">
                          {!isPast && (
                            <Badge
                              variant="secondary"
                              className="text-gray-400"
                            >
                              <Clock className="size-3 ml-1" />
                              בקרוב
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedItem>

        {/* Contact */}
        <AnimatedItem>
          <TeamContactCard />
        </AnimatedItem>
      </AnimatedContainer>
    </main>
  );
}

async function CandidateDashboard({
  userId,
  fullName,
}: {
  userId: string;
  fullName?: string;
}) {
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];

  // Get all lectures
  const { data: lectures } = await supabase
    .from("lectures")
    .select("*")
    .order("scheduled_date", { ascending: true });

  // Get user's lecture feedback
  const { data: lectureFeedback } = await supabase
    .from("lecture_feedback")
    .select("lecture_id")
    .eq("candidate_id", userId);

  const submittedLectureIds = new Set(
    lectureFeedback?.map((f) => f.lecture_id) || []
  );

  // Check opening check-in
  const { data: openingCheckin } = await supabase
    .from("checkins")
    .select("id")
    .eq("candidate_id", userId)
    .eq("type", "opening")
    .limit(1)
    .single();

  // Get open tasks
  const { data: openTasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("candidate_id", userId)
    .eq("completed", false)
    .order("deadline", { ascending: true, nullsFirst: false })
    .limit(5);

  // Count all open tasks
  const { count: openTaskCount } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("candidate_id", userId)
    .eq("completed", false);

  // Guide progress
  const { count: guideChapterCount } = await supabase
    .from("guide_chapters")
    .select("*", { count: "exact", head: true });

  const { count: guideFilledCount } = await supabase
    .from("candidate_chapter_entries")
    .select("*", { count: "exact", head: true })
    .eq("candidate_id", userId)
    .neq("content", "");

  const pastLectureIds = new Set(
    lectures?.filter((l) => l.scheduled_date <= today).map((l) => l.id) || []
  );

  // Stats
  const feedbackCount = submittedLectureIds.size;
  const upcomingLectures =
    lectures?.filter((l) => l.scheduled_date > today).length || 0;

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-8">
      <AnimatedContainer>
        {/* Greeting */}
        <AnimatedItem>
          <div className="mb-2">
            <h1 className="text-2xl font-bold text-[#1a2744]">
              שלום{fullName ? `, ${fullName}` : ""}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              ברוכים הבאים לפורטל OfekTech
            </p>
          </div>
        </AnimatedItem>

        {/* Stats row */}
        <AnimatedItem>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-4 pt-0">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#22c55e]/10">
                  <ListTodo className="size-5 text-[#22c55e]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1a2744]">
                    {openTaskCount || 0}
                  </p>
                  <p className="text-xs text-gray-500">משימות פתוחות</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-4 pt-0">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#22c55e]/10">
                  <MessageSquare className="size-5 text-[#22c55e]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1a2744]">
                    {feedbackCount}
                  </p>
                  <p className="text-xs text-gray-500">משובים שהוגשו</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-4 pt-0">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#22c55e]/10">
                  <Mic2 className="size-5 text-[#22c55e]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1a2744]">
                    {upcomingLectures}
                  </p>
                  <p className="text-xs text-gray-500">הרצאות קרובות</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </AnimatedItem>

        {/* Two-column layout on desktop */}
        <AnimatedItem>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Right column — Lectures (wider) */}
            <div className="lg:col-span-3 space-y-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[#1a2744]">
                    <Mic2 className="size-5" />
                    הרצאות
                  </CardTitle>
                  <CardDescription>לוח הרצאות התוכנית</CardDescription>
                </CardHeader>
                <CardContent>
                  {!lectures || lectures.length === 0 ? (
                    <p className="text-gray-400 text-sm py-4 text-center">
                      אין הרצאות כרגע
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {lectures.map((lecture) => {
                        const isPast = pastLectureIds.has(lecture.id);
                        const hasSubmitted = submittedLectureIds.has(lecture.id);
                        const isUpcoming = !isPast;

                        return (
                          <div
                            key={lecture.id}
                            className={`flex items-start gap-4 rounded-lg p-3 transition-colors ${
                              isUpcoming
                                ? "bg-gray-50/50"
                                : "bg-white hover:bg-gray-50/50"
                            }`}
                          >
                            <div
                              className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                                hasSubmitted
                                  ? "bg-[#22c55e] text-white"
                                  : isPast
                                    ? "bg-[#1a2744] text-white"
                                    : "bg-gray-200 text-gray-500"
                              }`}
                            >
                              {lecture.lecture_number || "#"}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-[#1a2744]">
                                {lecture.title}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500">
                                  {formatDate(lecture.scheduled_date)}
                                </span>
                                {lecture.lecturer && (
                                  <span className="text-xs text-gray-400">
                                    {lecture.lecturer}
                                  </span>
                                )}
                                {lecture.location && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] gap-1"
                                  >
                                    {lecture.location === "זום" ? (
                                      <Video className="size-3" />
                                    ) : (
                                      <MapPin className="size-3" />
                                    )}
                                    {lecture.location}
                                  </Badge>
                                )}
                                {isPast && lecture.recording_url && (
                                  <a
                                    href={lecture.recording_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-[#22c55e] hover:underline"
                                  >
                                    <Video className="size-3" />
                                    הקלטה
                                    <ExternalLink className="size-2.5" />
                                  </a>
                                )}
                                {isPast && lecture.presentation_url && (
                                  <a
                                    href={lecture.presentation_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-[#22c55e] hover:underline"
                                  >
                                    <FileText className="size-3" />
                                    מצגת
                                    <ExternalLink className="size-2.5" />
                                  </a>
                                )}
                              </div>
                            </div>

                            <div className="shrink-0">
                              {hasSubmitted ? (
                                <Badge className="bg-[#22c55e]/10 text-[#22c55e] border-0 hover:bg-[#22c55e]/10">
                                  <CheckCircle2 className="size-3 ml-1" />
                                  הושלם
                                </Badge>
                              ) : isPast ? (
                                <Link
                                  href={`/lectures/${lecture.id}/feedback`}
                                  className="inline-flex items-center gap-1 rounded-md bg-[#1a2744] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1a2744]/90 transition-colors"
                                >
                                  מלא משוב
                                </Link>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="text-gray-400"
                                >
                                  <Clock className="size-3 ml-1" />
                                  בקרוב
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Left column — Check-in, Tasks, Sessions, Contact */}
            <div className="lg:col-span-2 space-y-6">
              {/* Opening check-in CTA */}
              {!openingCheckin && (
                <Card className="border-0 shadow-sm bg-gradient-to-l from-[#1a2744]/5 to-[#1a2744]/15 ring-1 ring-[#1a2744]/20">
                  <CardContent className="flex flex-col items-start gap-3 pt-0">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-[#1a2744]/20">
                        <Sparkles className="size-5 text-[#1a2744]" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#1a2744]">
                          צ׳ק-אין פתיחה
                        </p>
                        <p className="text-sm text-gray-500">
                          ספרו לנו על המיזם, הציפיות והיעדים שלכם
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/checkin/opening"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1a2744] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1a2744]/90 transition-colors"
                    >
                      מלא עכשיו
                      <ArrowLeft className="size-4" />
                    </Link>
                  </CardContent>
                </Card>
              )}

              {/* Tasks summary */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between w-full">
                    <CardTitle className="flex items-center gap-2 text-[#1a2744] text-base">
                      <ListTodo className="size-5" />
                      משימות
                    </CardTitle>
                    <Link
                      href="/tasks"
                      className="inline-flex items-center gap-1 rounded-md bg-[#22c55e] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#16a34a] transition-colors"
                    >
                      + משימה חדשה
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {!openTasks || openTasks.length === 0 ? (
                    <p className="text-gray-400 text-sm py-4 text-center">
                      אין משימות פתוחות
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {openTasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-start gap-3 rounded-lg p-3 bg-gray-50/50"
                        >
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#1a2744]/10 mt-0.5">
                            <ListTodo className="size-3.5 text-[#1a2744]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#1a2744] line-clamp-2">
                              {task.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {task.deadline && (
                                <span className="text-xs text-gray-500">
                                  {formatDate(task.deadline)}
                                </span>
                              )}
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                {task.owner === "self"
                                  ? "אני"
                                  : task.owner === "mentor"
                                    ? "מנטור"
                                    : "צוות"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <Link
                    href="/tasks"
                    className="inline-flex items-center gap-1 text-sm text-[#22c55e] hover:underline mt-4"
                  >
                    צפייה בכל המשימות
                    <ArrowLeft className="size-3.5" />
                  </Link>
                </CardContent>
              </Card>

              {/* Guide progress */}
              {(guideChapterCount ?? 0) > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-[#22c55e]/10">
                        <BookOpen className="size-5 text-[#22c55e]" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#1a2744] text-sm">
                          מדריך התוכנית
                        </p>
                        <p className="text-xs text-gray-500">
                          {guideFilledCount || 0} מתוך {guideChapterCount} פרקים הושלמו
                        </p>
                      </div>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden mb-3">
                      <div
                        className="h-full rounded-full bg-[#22c55e] transition-all duration-500"
                        style={{
                          width: `${guideChapterCount ? ((guideFilledCount || 0) / guideChapterCount) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <Link
                      href="/guide"
                      className="inline-flex items-center gap-1 text-sm text-[#22c55e] hover:underline"
                    >
                      המשך למדריך
                      <ArrowLeft className="size-3.5" />
                    </Link>
                  </CardContent>
                </Card>
              )}

              {/* Contact */}
              <TeamContactCard />
            </div>
          </div>
        </AnimatedItem>
      </AnimatedContainer>
    </main>
  );
}

async function MentorDashboard({
  userId,
  fullName,
}: {
  userId: string;
  fullName?: string;
}) {
  const supabase = await createClient();

  // Get assigned mentees
  const { data: assignments } = await supabase
    .from("mentor_assignments")
    .select(
      "*, candidate:profiles!mentor_assignments_candidate_id_fkey(id, full_name, email)"
    )
    .eq("mentor_id", userId);

  const menteeIds = assignments?.map((a) => (a.candidate as { id: string }).id) || [];

  // Get total sessions count
  const { count: totalSessions } = await supabase
    .from("mentor_sessions")
    .select("*", { count: "exact", head: true })
    .eq("mentor_id", userId);

  // Get total feedback given count
  const { count: totalFeedback } = await supabase
    .from("session_feedback")
    .select("*", { count: "exact", head: true })
    .eq("submitted_by", userId);

  // For each mentee, get their stats
  const menteeStats = await Promise.all(
    (assignments || []).map(async (assignment) => {
      const candidate = assignment.candidate as {
        id: string;
        full_name: string;
        email: string;
      };

      const [
        { count: openTasks },
        { count: completedTasks },
        { count: filledChapters },
        { data: latestSession },
      ] = await Promise.all([
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("candidate_id", candidate.id)
          .eq("completed", false),
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("candidate_id", candidate.id)
          .eq("completed", true),
        supabase
          .from("candidate_chapter_entries")
          .select("*", { count: "exact", head: true })
          .eq("candidate_id", candidate.id)
          .neq("content", ""),
        supabase
          .from("mentor_sessions")
          .select("session_date")
          .eq("candidate_id", candidate.id)
          .eq("mentor_id", userId)
          .order("session_date", { ascending: false })
          .limit(1),
      ]);

      return {
        id: candidate.id,
        name: candidate.full_name || candidate.email,
        openTasks: openTasks || 0,
        completedTasks: completedTasks || 0,
        filledChapters: filledChapters || 0,
        lastSessionDate: latestSession?.[0]?.session_date || null,
      };
    })
  );

  // Get total guide chapters
  const { count: totalChapters } = await supabase
    .from("guide_chapters")
    .select("*", { count: "exact", head: true });

  const guideTotal = totalChapters || 13;

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-8">
      <AnimatedContainer>
        {/* Greeting */}
        <AnimatedItem>
          <div className="mb-2">
            <h1 className="text-2xl font-bold text-[#1a2744]">
              שלום{fullName ? `, ${fullName}` : ""}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              ברוכים הבאים לפורטל המנטורים של OfekTech
            </p>
          </div>
        </AnimatedItem>

        {/* Stats row */}
        <AnimatedItem>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-4 pt-0">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#22c55e]/10">
                  <Users className="size-5 text-[#22c55e]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1a2744]">
                    {menteeIds.length}
                  </p>
                  <p className="text-xs text-gray-500">חניכים</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-4 pt-0">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#22c55e]/10">
                  <CalendarDays className="size-5 text-[#22c55e]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1a2744]">
                    {totalSessions || 0}
                  </p>
                  <p className="text-xs text-gray-500">סה״כ פגישות</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-4 pt-0">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#22c55e]/10">
                  <MessageSquare className="size-5 text-[#22c55e]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1a2744]">
                    {totalFeedback || 0}
                  </p>
                  <p className="text-xs text-gray-500">משובים שניתנו</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </AnimatedItem>

        {/* Mentee cards */}
        {menteeStats.length > 0 ? (
          <AnimatedItem>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {menteeStats.map((mentee) => {
                const guidePercent = guideTotal
                  ? Math.round((mentee.filledChapters / guideTotal) * 100)
                  : 0;

                return (
                  <Card key={mentee.id} className="border-0 shadow-sm">
                    <CardContent className="pt-0 space-y-4">
                      {/* Name */}
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-full bg-[#1a2744]/10">
                          <Users className="size-4 text-[#1a2744]" />
                        </div>
                        <p className="text-lg font-semibold text-[#1a2744]">
                          {mentee.name}
                        </p>
                      </div>

                      {/* Tasks */}
                      <div className="flex items-center gap-2 text-sm">
                        <ListTodo className="size-4 text-gray-400" />
                        <span className="text-gray-600">
                          {mentee.openTasks} פתוחות, {mentee.completedTasks}{" "}
                          הושלמו
                        </span>
                      </div>

                      {/* Guide progress */}
                      <div>
                        <div className="flex items-center gap-2 text-sm mb-1.5">
                          <BookOpen className="size-4 text-gray-400" />
                          <span className="text-gray-600">
                            {mentee.filledChapters}/{guideTotal} פרקים
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#22c55e] transition-all duration-500"
                            style={{ width: `${guidePercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Last session */}
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarDays className="size-4 text-gray-400" />
                        <span className="text-gray-600">
                          {mentee.lastSessionDate
                            ? `פגישה אחרונה: ${formatDate(mentee.lastSessionDate)}`
                            : "אין פגישות"}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        <Link
                          href={`/mentees/${mentee.id}`}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1a2744] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a2744]/90 transition-colors"
                        >
                          צפייה בפרטים
                        </Link>
                        <Link
                          href={`/sessions/new?candidate=${mentee.id}`}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#22c55e] px-4 py-2 text-sm font-medium text-white hover:bg-[#16a34a] transition-colors"
                        >
                          הוסף משוב
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </AnimatedItem>
        ) : (
          <AnimatedItem>
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <Users className="size-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm">אין חניכים משובצים</p>
              </CardContent>
            </Card>
          </AnimatedItem>
        )}

        {/* Contact */}
        <AnimatedItem>
          <TeamContactCard />
        </AnimatedItem>
      </AnimatedContainer>
    </main>
  );
}

function TeamContactCard() {
  const contacts = [
    { name: "טל גורביץ׳", phone: "050-442-5322" },
    { name: "אתי אילן", phone: "050-735-4911" },
    { name: "רותם שרון", phone: "050-405-1122" },
  ];

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#1a2744] text-base">
          <Phone className="size-4" />
          צוות OfekTech
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {contacts.map((c) => (
          <div key={c.phone} className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#1a2744]">{c.name}</span>
            <a
              href={`tel:${c.phone.replace(/-/g, "")}`}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#22c55e] transition-colors"
              dir="ltr"
            >
              <Phone className="size-3.5" />
              {c.phone}
            </a>
          </div>
        ))}
        <div className="border-t pt-3 mt-3">
          <a
            href="mailto:ofektech.innovation@gmail.com"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#22c55e] transition-colors"
            dir="ltr"
          >
            <Mail className="size-3.5" />
            ofektech.innovation@gmail.com
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
