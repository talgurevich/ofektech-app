import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentWeekStart, formatDate } from "@/lib/utils";
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
  ClipboardCheck,
  ArrowLeft,
  MapPin,
  Video,
  Users,
  Phone,
  Mail,
  FileText,
  ExternalLink,
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

  const weekStart = getCurrentWeekStart();

  if (profile.role === "candidate") {
    return (
      <CandidateDashboard
        userId={user.id}
        weekStart={weekStart}
        fullName={profile.full_name}
      />
    );
  }

  return <MentorDashboard userId={user.id} fullName={profile.full_name} />;
}

async function CandidateDashboard({
  userId,
  weekStart,
  fullName,
}: {
  userId: string;
  weekStart: string;
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

  // Get mentor sessions for this candidate
  const { data: sessions } = await supabase
    .from("mentor_sessions")
    .select("*, mentor:profiles!mentor_sessions_mentor_id_fkey(full_name)")
    .eq("candidate_id", userId)
    .order("session_date", { ascending: false });

  // Get session feedback by this user
  const { data: sessionFeedback } = await supabase
    .from("session_feedback")
    .select("session_id")
    .eq("submitted_by", userId);

  const submittedSessionIds = new Set(
    sessionFeedback?.map((f) => f.session_id) || []
  );

  // Check weekly check-in
  const { data: checkin } = await supabase
    .from("checkins")
    .select("id")
    .eq("candidate_id", userId)
    .eq("type", "weekly")
    .eq("period_start", weekStart)
    .single();

  const pastLectureIds = new Set(
    lectures?.filter((l) => l.scheduled_date <= today).map((l) => l.id) || []
  );

  // Stats
  const completedCheckins = checkin ? 1 : 0;
  const feedbackCount = submittedLectureIds.size + submittedSessionIds.size;
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
                  <ClipboardCheck className="size-5 text-[#22c55e]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1a2744]">
                    {completedCheckins}
                  </p>
                  <p className="text-xs text-gray-500">צ׳ק-אין השבוע</p>
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

            {/* Left column — Check-in, Sessions, Contact */}
            <div className="lg:col-span-2 space-y-6">
              {/* Check-in CTA */}
              {!checkin ? (
                <Card className="border-0 shadow-sm bg-gradient-to-l from-[#22c55e]/5 to-[#22c55e]/15 ring-1 ring-[#22c55e]/20">
                  <CardContent className="flex flex-col items-start gap-3 pt-0">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-[#22c55e]/20">
                        <ClipboardCheck className="size-5 text-[#22c55e]" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#1a2744]">
                          צ׳ק-אין שבועי
                        </p>
                        <p className="text-sm text-gray-500">
                          עדיין לא מילאת השבוע
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/checkin"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#22c55e] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#16a34a] transition-colors"
                    >
                      מלא עכשיו
                      <ArrowLeft className="size-4" />
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-0 shadow-sm">
                  <CardContent className="flex items-center gap-3 pt-0">
                    <div className="flex size-10 items-center justify-center rounded-full bg-[#22c55e]/10">
                      <CheckCircle2 className="size-5 text-[#22c55e]" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#1a2744]">
                        צ׳ק-אין שבועי
                      </p>
                      <p className="text-sm text-[#22c55e] font-medium">
                        הושלם בהצלחה
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Mentor Sessions */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between w-full">
                    <CardTitle className="flex items-center gap-2 text-[#1a2744] text-base">
                      <CalendarDays className="size-5" />
                      פגישות מנטורינג
                    </CardTitle>
                    <Link
                      href="/sessions/new"
                      className="inline-flex items-center gap-1 rounded-md bg-[#22c55e] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#16a34a] transition-colors"
                    >
                      + חדשה
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {!sessions || sessions.length === 0 ? (
                    <p className="text-gray-400 text-sm py-4 text-center">
                      אין פגישות כרגע
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {sessions.map((session) => {
                        const hasSubmitted = submittedSessionIds.has(session.id);
                        const mentorName =
                          (session.mentor as { full_name: string })?.full_name ||
                          "מנטור";

                        return (
                          <Link
                            key={session.id}
                            href={`/sessions/${session.id}/feedback`}
                            className="flex items-center justify-between rounded-lg p-3 hover:bg-gray-50/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex size-9 items-center justify-center rounded-full bg-[#1a2744]/10">
                                <Users className="size-4 text-[#1a2744]" />
                              </div>
                              <div>
                                <p className="font-medium text-[#1a2744] text-sm">
                                  {mentorName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatDate(session.session_date)}
                                </p>
                              </div>
                            </div>
                            {hasSubmitted ? (
                              <Badge className="bg-[#22c55e]/10 text-[#22c55e] border-0 hover:bg-[#22c55e]/10">
                                <CheckCircle2 className="size-3 ml-1" />
                                הושלם
                              </Badge>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-[#1a2744] px-3 py-1.5 text-xs font-medium text-white">
                                משוב
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

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

  // Get mentor sessions
  const { data: sessions } = await supabase
    .from("mentor_sessions")
    .select(
      "*, candidate:profiles!mentor_sessions_candidate_id_fkey(full_name)"
    )
    .eq("mentor_id", userId)
    .order("session_date", { ascending: false });

  // Get session feedback by this mentor
  const { data: sessionFeedback } = await supabase
    .from("session_feedback")
    .select("session_id")
    .eq("submitted_by", userId);

  const submittedSessionIds = new Set(
    sessionFeedback?.map((f) => f.session_id) || []
  );

  // Stats
  const totalSessions = sessions?.length || 0;
  const completedFeedback = submittedSessionIds.size;
  const pendingFeedback = totalSessions - completedFeedback;

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
                  <CalendarDays className="size-5 text-[#22c55e]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1a2744]">
                    {totalSessions}
                  </p>
                  <p className="text-xs text-gray-500">סה״כ פגישות</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-4 pt-0">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#22c55e]/10">
                  <CheckCircle2 className="size-5 text-[#22c55e]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1a2744]">
                    {completedFeedback}
                  </p>
                  <p className="text-xs text-gray-500">משובים שהוגשו</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-4 pt-0">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#1a2744]/10">
                  <MessageSquare className="size-5 text-[#1a2744]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1a2744]">
                    {pendingFeedback}
                  </p>
                  <p className="text-xs text-gray-500">ממתינים למשוב</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </AnimatedItem>

        {/* Sessions */}
        <AnimatedItem>
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle className="flex items-center gap-2 text-[#1a2744]">
                  <CalendarDays className="size-5" />
                  פגישות מנטורינג
                </CardTitle>
                <Link
                  href="/sessions/new"
                  className="inline-flex items-center gap-1 rounded-md bg-[#22c55e] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#16a34a] transition-colors"
                >
                  + פגישה חדשה
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {!sessions || sessions.length === 0 ? (
                <p className="text-gray-400 text-sm py-4 text-center">
                  אין פגישות כרגע
                </p>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => {
                    const hasSubmitted = submittedSessionIds.has(session.id);
                    const candidateName =
                      (session.candidate as { full_name: string })
                        ?.full_name || "מועמד/ת";

                    return (
                      <Link
                        key={session.id}
                        href={`/sessions/${session.id}/feedback`}
                        className="flex items-center justify-between rounded-lg p-3 hover:bg-gray-50/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-full bg-[#1a2744]/10">
                            <Users className="size-4 text-[#1a2744]" />
                          </div>
                          <div>
                            <p className="font-medium text-[#1a2744]">
                              פגישה עם {candidateName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(session.session_date)}
                            </p>
                          </div>
                        </div>
                        {hasSubmitted ? (
                          <Badge className="bg-[#22c55e]/10 text-[#22c55e] border-0 hover:bg-[#22c55e]/10">
                            <CheckCircle2 className="size-3 ml-1" />
                            הושלם
                          </Badge>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#1a2744] px-3 py-1.5 text-xs font-medium text-white">
                            מלא משוב
                          </span>
                        )}
                      </Link>
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
