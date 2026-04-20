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
  Briefcase,
} from "lucide-react";
import {
  AnimatedContainer,
  AnimatedItem,
} from "@/components/dashboard-shell";
import { MentorTaskAdder } from "@/components/mentor-task-adder";
import { VentureKpiCard } from "@/components/venture-kpi-card";
import { DashboardActions } from "@/components/dashboard-actions";

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

  if (!profile) redirect("/not-registered");

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
        ventureId={profile.venture_id}
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

  const { data: lectures } = await supabase
    .from("lectures")
    .select("*")
    .order("scheduled_date", { ascending: true });

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-8">
      <AnimatedContainer>
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
                              <Badge variant="secondary" className="text-[10px] gap-1">
                                {lecture.location === "זום" ? <Video className="size-3" /> : <MapPin className="size-3" />}
                                {lecture.location}
                              </Badge>
                            )}
                            {isPast && lecture.recording_url && (
                              <a href={lecture.recording_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[#22c55e] hover:underline">
                                <Video className="size-3" /> הקלטה <ExternalLink className="size-2.5" />
                              </a>
                            )}
                            {isPast && lecture.presentation_url && (
                              <a href={lecture.presentation_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[#22c55e] hover:underline">
                                <FileText className="size-3" /> מצגת <ExternalLink className="size-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0">
                          {!isPast && (
                            <Badge variant="secondary" className="text-gray-400">
                              <Clock className="size-3 ml-1" /> בקרוב
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
  ventureId,
}: {
  userId: string;
  fullName?: string;
  ventureId?: string | null;
}) {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  // Get venture info + members
  let ventureName: string | null = null;
  let ventureMembers: { id: string; full_name: string }[] = [];
  if (ventureId) {
    const { data: venture } = await supabase
      .from("ventures")
      .select("name")
      .eq("id", ventureId)
      .single();
    ventureName = venture?.name || null;

    const { data: members } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("venture_id", ventureId)
      .neq("id", userId)
      .order("full_name");
    ventureMembers = members || [];
  }

  // Get assigned mentor (via venture)
  let mentorName: string | null = null;
  let mentorAvatar: string | null = null;
  let mentorPhone: string | null = null;
  let mentorExpertise: string | null = null;
  if (ventureId) {
    const { data: mentorAssignment } = await supabase
      .from("mentor_assignments")
      .select("mentor_id")
      .eq("venture_id", ventureId)
      .limit(1)
      .maybeSingle();

    if (mentorAssignment?.mentor_id) {
      const { data: mentorProfile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, phone, expertise")
        .eq("id", mentorAssignment.mentor_id)
        .single();
      mentorName = mentorProfile?.full_name || null;
      mentorAvatar = mentorProfile?.avatar_url || null;
      mentorPhone = mentorProfile?.phone || null;
      mentorExpertise = mentorProfile?.expertise || null;
    }
  }

  // Get lecture counts for KPIs (feedback submitted + upcoming)
  const { data: lectures } = await supabase
    .from("lectures")
    .select("id, scheduled_date");

  const { count: feedbackCount } = await supabase
    .from("lecture_feedback")
    .select("*", { count: "exact", head: true })
    .eq("candidate_id", userId);

  const upcomingLectures =
    lectures?.filter((l) => l.scheduled_date > today).length || 0;

  // Check opening check-in
  const { data: openingCheckin } = await supabase
    .from("checkins")
    .select("id")
    .eq("candidate_id", userId)
    .eq("type", "opening")
    .limit(1)
    .single();

  // Count all open tasks for KPI
  let countQuery = supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("completed", false);

  if (ventureId) {
    countQuery = countQuery.or(`candidate_id.eq.${userId},venture_id.eq.${ventureId}`);
  } else {
    countQuery = countQuery.eq("candidate_id", userId);
  }

  const { count: openTaskCount } = await countQuery;

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

        {/* Venture info card */}
        <AnimatedItem>
          {ventureId && ventureName ? (
            <Card className="border-0 shadow-sm bg-gradient-to-l from-[#1a2744]/5 to-[#1a2744]/10">
              <CardContent className="pt-0">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-[#1a2744]/15">
                    <Briefcase className="size-5 text-[#1a2744]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#1a2744]">{ventureName}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {ventureMembers.length > 0 && (
                        <span className="text-xs text-gray-500">
                          שותפים: {ventureMembers.map((m) => m.full_name).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                  {mentorName && (
                    <div className="text-left">
                      <p className="text-[10px] text-gray-500">מנטור/ית</p>
                      <p className="text-sm font-medium text-[#1a2744]">{mentorName}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm bg-amber-50/50">
              <CardContent className="pt-0">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-amber-100">
                    <Briefcase className="size-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-[#1a2744]">אינך משויך/ת למיזם עדיין</p>
                    <p className="text-xs text-gray-500">פנה לצוות OfekTech להצטרפות למיזם</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
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

        {/* Quick-action buttons */}
        <AnimatedItem>
          <DashboardActions />
        </AnimatedItem>

        {/* Opening check-in CTA */}
        {!openingCheckin && (
          <AnimatedItem>
            <Card className="border-0 shadow-sm bg-gradient-to-l from-[#1a2744]/5 to-[#1a2744]/15 ring-1 ring-[#1a2744]/20">
              <CardContent className="flex flex-col items-start gap-3 pt-0">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-[#1a2744]/20">
                    <Sparkles className="size-5 text-[#1a2744]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1a2744]">צ׳ק-אין פתיחה</p>
                    <p className="text-sm text-gray-500">ספרו לנו על המיזם, הציפיות והיעדים שלכם</p>
                  </div>
                </div>
                <Link
                  href="/checkin/opening"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1a2744] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1a2744]/90 transition-colors"
                >
                  מלא עכשיו <ArrowLeft className="size-4" />
                </Link>
              </CardContent>
            </Card>
          </AnimatedItem>
        )}

        {/* Contact — always last */}
        <AnimatedItem>
          <TeamContactCard
            mentorName={mentorName}
            mentorAvatar={mentorAvatar}
            mentorPhone={mentorPhone}
            mentorExpertise={mentorExpertise}
          />
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

  // Get assigned ventures
  const { data: assignments } = await supabase
    .from("mentor_assignments")
    .select("*, venture:ventures(id, name, description)")
    .eq("mentor_id", userId);

  // Filter out assignments with null ventures (from migration)
  const validAssignments = (assignments || []).filter(
    (a) => a.venture && (a.venture as { id: string }).id
  );
  const ventureIds = validAssignments.map((a) => (a.venture as { id: string }).id);

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

  // For each venture, get stats
  const ventureStats = await Promise.all(
    validAssignments.map(async (assignment) => {
      const venture = assignment.venture as {
        id: string;
        name: string;
        description: string | null;
      };

      // Get members
      const { data: members } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, venture_role")
        .eq("venture_id", venture.id);

      // Get venture tasks
      const [
        { count: openTasks },
        { count: completedTasks },
        { count: filledChapters },
        { data: latestSession },
      ] = await Promise.all([
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("venture_id", venture.id)
          .eq("completed", false),
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("venture_id", venture.id)
          .eq("completed", true),
        supabase
          .from("venture_chapter_entries")
          .select("*", { count: "exact", head: true })
          .eq("venture_id", venture.id)
          .neq("content", ""),
        supabase
          .from("mentor_sessions")
          .select("session_date")
          .eq("venture_id", venture.id)
          .eq("mentor_id", userId)
          .order("session_date", { ascending: false })
          .limit(1),
      ]);

      return {
        id: venture.id,
        name: venture.name,
        description: venture.description,
        members: members || [],
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
            <VentureKpiCard ventures={ventureStats.map(v => ({ id: v.id, name: v.name }))} />

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

        {/* Venture cards */}
        {ventureStats.length > 0 ? (
          <AnimatedItem>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ventureStats.map((venture) => {
                const guidePercent = guideTotal
                  ? Math.round((venture.filledChapters / guideTotal) * 100)
                  : 0;

                return (
                  <Card key={venture.id} className="border-0 shadow-sm">
                    <CardContent className="pt-0 space-y-4">
                      {/* Name + members */}
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-full bg-[#1a2744]/10">
                          <Briefcase className="size-4 text-[#1a2744]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-lg font-semibold text-[#1a2744]">
                            {venture.name}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {venture.members.map((m) => (
                              <Badge
                                key={m.id}
                                variant="secondary"
                                className="text-[10px] gap-1"
                              >
                                {m.avatar_url ? (
                                  <img
                                    src={m.avatar_url}
                                    alt={m.full_name || ""}
                                    className="size-5 rounded-full object-cover"
                                  />
                                ) : (
                                  <span className="flex size-5 items-center justify-center rounded-full bg-[#22c55e]/20 text-[8px] font-bold text-[#22c55e]">
                                    {(m.full_name || m.email || "?").charAt(0)}
                                  </span>
                                )}
                                {m.full_name || m.email}
                                {m.venture_role && ` — ${m.venture_role}`}
                              </Badge>
                            ))}
                            {venture.members.length === 0 && (
                              <span className="text-xs text-gray-400">אין חברים</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Tasks */}
                      <div className="flex items-center gap-2 text-sm">
                        <ListTodo className="size-4 text-gray-400" />
                        <span className="text-gray-600">
                          {venture.openTasks} פתוחות, {venture.completedTasks} הושלמו
                        </span>
                      </div>

                      {/* Guide progress */}
                      <div>
                        <div className="flex items-center gap-2 text-sm mb-1.5">
                          <BookOpen className="size-4 text-gray-400" />
                          <span className="text-gray-600">
                            {venture.filledChapters}/{guideTotal} פרקים
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
                          {venture.lastSessionDate
                            ? `פגישה אחרונה: ${formatDate(venture.lastSessionDate)}`
                            : "אין פגישות"}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Link
                          href={`/ventures/${venture.id}`}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1a2744] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a2744]/90 transition-colors"
                        >
                          צפייה בפרטים
                        </Link>
                        <Link
                          href={`/sessions/new?venture=${venture.id}`}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#22c55e] px-4 py-2 text-sm font-medium text-white hover:bg-[#16a34a] transition-colors"
                        >
                          הוסף משוב
                        </Link>
                      </div>
                      <MentorTaskAdder ventureId={venture.id} mentorId={userId} />
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
                <Briefcase className="size-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm">אין מיזמים משובצים</p>
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

function TeamContactCard({
  mentorName,
  mentorAvatar,
  mentorPhone,
  mentorExpertise,
}: {
  mentorName?: string | null;
  mentorAvatar?: string | null;
  mentorPhone?: string | null;
  mentorExpertise?: string | null;
}) {
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
        {mentorName && (
          <div className="flex items-center gap-3 bg-[#22c55e]/5 rounded-lg px-3 py-2 mb-1">
            {mentorAvatar ? (
              <img
                src={mentorAvatar}
                alt={mentorName}
                className="size-8 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="flex size-8 items-center justify-center rounded-full bg-[#22c55e]/20 shrink-0">
                <span className="text-sm font-bold text-[#22c55e]">
                  {mentorName.charAt(0)}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-500">המנטור/ית שלך</p>
              <p className="text-sm font-semibold text-[#1a2744]">{mentorName}</p>
              {mentorExpertise && (
                <p className="text-xs text-gray-500">{mentorExpertise}</p>
              )}
            </div>
            {mentorPhone && (
              <a
                href={`tel:${mentorPhone.replace(/-/g, "")}`}
                className="inline-flex items-center gap-1 text-xs text-[#22c55e] hover:underline shrink-0"
                dir="ltr"
              >
                <Phone className="size-3" />
                {mentorPhone}
              </a>
            )}
          </div>
        )}
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
