import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Mic2,
  CalendarDays,
  CheckCircle2,
  Circle,
  XCircle,
  ChevronLeft,
  ClipboardCheck,
  BookOpen,
  ListTodo,
  Briefcase,
  Star,
  UserCheck,
  Activity,
  Headphones,
  FileText,
} from "lucide-react";
import { VentureActivityFeed } from "@/components/venture-activity-feed";
import type { VentureActivity } from "@/lib/types";

export default async function AdminDashboard() {
  const supabase = await createClient();

  // Counts
  const [
    { count: totalCandidates },
    { count: totalMentors },
    { count: totalVisitors },
    { count: totalLectures },
    { count: totalVentures },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "candidate"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "mentor"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "visitor"),
    supabase.from("lectures").select("*", { count: "exact", head: true }),
    supabase.from("ventures").select("*", { count: "exact", head: true }),
  ]);

  // All candidates with venture info
  const { data: candidates } = await supabase
    .from("profiles")
    .select("id, full_name, email, venture_id")
    .eq("role", "candidate")
    .order("full_name");

  // Onboarding status for all non-admin users
  const { data: allUsers } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, onboarding_completed")
    .neq("role", "admin")
    .order("full_name");

  const onboardedUsers = allUsers?.filter((u) => u.onboarding_completed) || [];
  const notOnboardedUsers = allUsers?.filter((u) => !u.onboarding_completed) || [];

  // Opening check-ins
  const { data: openingCheckins } = await supabase
    .from("checkins")
    .select("candidate_id")
    .eq("type", "opening");

  const openingCheckinIds = new Set(openingCheckins?.map((c) => c.candidate_id) || []);
  const didOpening = candidates?.filter((c) => openingCheckinIds.has(c.id)) || [];
  const didNotOpening = candidates?.filter((c) => !openingCheckinIds.has(c.id)) || [];

  // Guide progress per venture
  const { data: ventures } = await supabase
    .from("ventures")
    .select("id, name")
    .order("name");

  const { count: totalChapters } = await supabase
    .from("guide_chapters")
    .select("*", { count: "exact", head: true });

  const guideTotal = totalChapters || 13;

  const ventureGuideProgress = await Promise.all(
    (ventures || []).map(async (v) => {
      const { count } = await supabase
        .from("venture_chapter_entries")
        .select("*", { count: "exact", head: true })
        .eq("venture_id", v.id)
        .neq("content", "");
      return { id: v.id, name: v.name, filled: count || 0 };
    })
  );

  // Recent mentor sessions with feedback
  const { data: recentSessions } = await supabase
    .from("mentor_sessions")
    .select("*, venture:ventures(name), mentor:profiles!mentor_sessions_mentor_id_fkey(full_name)")
    .order("session_date", { ascending: false })
    .limit(10);

  const sessionIds = recentSessions?.map((s) => s.id) || [];
  const { data: sessionFeedback } = await supabase
    .from("session_feedback")
    .select("session_id, submitted_by")
    .in("session_id", sessionIds.length > 0 ? sessionIds : ["none"]);

  const feedbackBySession = new Map<string, Set<string>>();
  sessionFeedback?.forEach((f) => {
    if (!feedbackBySession.has(f.session_id)) feedbackBySession.set(f.session_id, new Set());
    feedbackBySession.get(f.session_id)!.add(f.submitted_by);
  });

  // Recent workbook tasks across all ventures (open + done)
  const { data: recentTaskRows } = await supabase
    .from("workbook_entries")
    .select("id, data, updated_at, venture_id")
    .eq("sheet_key", "tasks")
    .order("updated_at", { ascending: false })
    .limit(15);

  const taskVentureIds = [...new Set((recentTaskRows || []).map((t) => t.venture_id))];
  const { data: taskVentures } = taskVentureIds.length > 0
    ? await supabase.from("ventures").select("id, name").in("id", taskVentureIds)
    : { data: [] };
  const ventureMap = new Map((taskVentures || []).map((v) => [v.id, v.name]));

  const recentTasks = (recentTaskRows || []).map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    return {
      id: row.id,
      description: typeof data.task === "string" ? data.task : "",
      assignee: typeof data.assignee === "string" ? data.assignee : "",
      due_date: typeof data.due_date === "string" && data.due_date ? data.due_date : null,
      done: data.done === true,
      updated_at: row.updated_at,
      venture_id: row.venture_id,
    };
  });

  // Mentor meeting summaries in the last 14 days
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const twoWeeksAgoIso = twoWeeksAgo.toISOString().slice(0, 10);

  const { data: weekSessions } = await supabase
    .from("mentor_sessions")
    .select("venture_id, session_date, meeting_summary, summary_submitted_at")
    .gte("session_date", twoWeeksAgoIso)
    .order("session_date", { ascending: false });

  const summarizedByVenture = new Map<
    string,
    { session_date: string; summary_submitted_at: string | null }
  >();
  (weekSessions || []).forEach((s) => {
    if ((s.meeting_summary || "").trim() === "") return;
    if (!summarizedByVenture.has(s.venture_id)) {
      summarizedByVenture.set(s.venture_id, {
        session_date: s.session_date,
        summary_submitted_at: s.summary_submitted_at,
      });
    }
  });

  const summarizedVentures = (ventures || []).filter((v) =>
    summarizedByVenture.has(v.id)
  );
  const notSummarizedVentures = (ventures || []).filter(
    (v) => !summarizedByVenture.has(v.id)
  );

  // Member names per venture (for display alongside venture name)
  const membersByVenture = new Map<string, string[]>();
  (candidates || []).forEach((c) => {
    if (!c.venture_id) return;
    const name = (c.full_name || c.email || "").trim();
    if (!name) return;
    const list = membersByVenture.get(c.venture_id) || [];
    list.push(name);
    membersByVenture.set(c.venture_id, list);
  });

  // Cross-venture activity feed
  const { data: activityRows } = await supabase
    .from("venture_activity")
    .select(
      "*, actor:actor_id(id, full_name, avatar_url), venture:venture_id(id, name)"
    )
    .order("created_at", { ascending: false })
    .limit(30);
  const activity = (activityRows as VentureActivity[]) || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1a2744]">סקירה כללית</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="יזמים" value={totalCandidates || 0} icon={<Users className="size-5 text-[#22c55e]" />} href="/admin/candidates" />
        <StatCard label="מנטורים" value={totalMentors || 0} icon={<Users className="size-5 text-[#22c55e]" />} href="/admin/users" />
        <StatCard label="מאזינים" value={totalVisitors || 0} icon={<Headphones className="size-5 text-[#22c55e]" />} href="/admin/users" />
        <StatCard label="מיזמים פעילים" value={totalVentures || 0} icon={<Briefcase className="size-5 text-[#22c55e]" />} href="/admin/ventures" />
        <StatCard label="סה״כ הרצאות" value={totalLectures || 0} icon={<Mic2 className="size-5 text-[#22c55e]" />} href="/admin/lectures" />
      </div>

      {/* Cross-venture activity feed */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle className="flex items-center gap-2 text-[#1a2744] text-base">
              <Activity className="size-5" />
              פעילות אחרונה — כל המיזמים
            </CardTitle>
            <Badge variant="secondary" className="text-[10px]">
              {activity.length} אירועים
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[420px] overflow-y-auto pr-1">
            <VentureActivityFeed items={activity} showVenture audience="admin" />
          </div>
        </CardContent>
      </Card>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left column */}
        <div className="space-y-6">

          {/* Onboarding status */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle className="flex items-center gap-2 text-[#1a2744] text-base">
                  <UserCheck className="size-5" />
                  אונבורדינג
                </CardTitle>
                <Badge variant="secondary" className="text-sm">
                  {onboardedUsers.length} / {allUsers?.length || 0}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#22c55e] transition-all"
                  style={{ width: `${allUsers?.length ? (onboardedUsers.length / allUsers.length) * 100 : 0}%` }}
                />
              </div>

              {notOnboardedUsers.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1.5">טרם השלימו ({notOnboardedUsers.length})</p>
                  <div className="space-y-1">
                    {notOnboardedUsers.map((u) => (
                      <Link
                        key={u.id}
                        href={u.role === "candidate" ? `/admin/candidates/${u.id}` : `/profile/${u.id}`}
                        className="flex items-center justify-between rounded-lg px-3 py-1.5 bg-red-50/50 hover:bg-red-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <XCircle className="size-3.5 text-red-400 shrink-0" />
                          <span className="text-xs text-[#1a2744] truncate">{u.full_name || u.email}</span>
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {u.role === "mentor" ? "מנטור" : u.role === "visitor" ? "מאזין" : "יזם"}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {onboardedUsers.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1.5">השלימו ({onboardedUsers.length})</p>
                  <div className="space-y-1">
                    {onboardedUsers.map((u) => (
                      <Link
                        key={u.id}
                        href={u.role === "candidate" ? `/admin/candidates/${u.id}` : `/profile/${u.id}`}
                        className="flex items-center justify-between rounded-lg px-3 py-1.5 bg-[#22c55e]/5 hover:bg-[#22c55e]/10 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle2 className="size-3.5 text-[#22c55e] shrink-0" />
                          <span className="text-xs text-[#1a2744] truncate">{u.full_name || u.email}</span>
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {u.role === "mentor" ? "מנטור" : u.role === "visitor" ? "מאזין" : "יזם"}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Opening check-in status */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle className="flex items-center gap-2 text-[#1a2744] text-base">
                  <ClipboardCheck className="size-5" />
                  שאלון פתיחה
                </CardTitle>
                <Badge variant="secondary" className="text-sm">
                  {didOpening.length} / {candidates?.length || 0}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#22c55e] transition-all"
                  style={{ width: `${candidates?.length ? (didOpening.length / candidates.length) * 100 : 0}%` }}
                />
              </div>

              {didNotOpening.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1.5">טרם מילאו ({didNotOpening.length})</p>
                  <div className="space-y-1">
                    {didNotOpening.map((c) => (
                      <Link
                        key={c.id}
                        href={`/admin/candidates/${c.id}`}
                        className="flex items-center gap-2 rounded-lg px-3 py-1.5 bg-red-50/50 hover:bg-red-50 transition-colors"
                      >
                        <XCircle className="size-3.5 text-red-400 shrink-0" />
                        <span className="text-xs text-[#1a2744] truncate">{c.full_name || c.email}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {didOpening.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1.5">מילאו ({didOpening.length})</p>
                  <div className="space-y-1">
                    {didOpening.map((c) => (
                      <Link
                        key={c.id}
                        href={`/admin/candidates/${c.id}`}
                        className="flex items-center gap-2 rounded-lg px-3 py-1.5 bg-[#22c55e]/5 hover:bg-[#22c55e]/10 transition-colors"
                      >
                        <CheckCircle2 className="size-3.5 text-[#22c55e] shrink-0" />
                        <span className="text-xs text-[#1a2744] truncate">{c.full_name || c.email}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <Link href="/admin/checkins" className="inline-flex items-center gap-1 text-xs text-[#1a2744] hover:text-[#22c55e] transition-colors">
                צפייה בכל הצ׳ק-אינים
                <ChevronLeft className="size-3.5" />
              </Link>
            </CardContent>
          </Card>

          {/* Guide progress per venture */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#1a2744] text-base">
                <BookOpen className="size-5" />
                התקדמות במדריך
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ventureGuideProgress.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">אין מיזמים עדיין</p>
              ) : (
                ventureGuideProgress.map((v) => {
                  const percent = Math.round((v.filled / guideTotal) * 100);
                  return (
                    <Link
                      key={v.id}
                      href={`/workbook?venture=${v.id}`}
                      className="block rounded-lg px-2 py-1.5 -mx-2 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-[#1a2744]">{v.name}</span>
                        <span className="text-xs text-gray-500">{v.filled}/{guideTotal}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            percent === 100 ? "bg-[#22c55e]" : percent > 50 ? "bg-[#22c55e]/70" : percent > 0 ? "bg-[#1a2744]/40" : "bg-gray-200"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* Mentor meeting summaries — last 14 days */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle className="flex items-center gap-2 text-[#1a2744] text-base">
                  <FileText className="size-5" />
                  סיכומי פגישת מנטור — שבועיים אחרונים
                </CardTitle>
                <Badge variant="secondary" className="text-sm">
                  {summarizedVentures.length} / {ventures?.length || 0}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#22c55e] transition-all"
                  style={{
                    width: `${
                      ventures?.length
                        ? (summarizedVentures.length / ventures.length) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>

              {notSummarizedVentures.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1.5">
                    לא סיכמו ({notSummarizedVentures.length})
                  </p>
                  <div className="space-y-1">
                    {notSummarizedVentures.map((v) => {
                      const members = membersByVenture.get(v.id) || [];
                      return (
                        <Link
                          key={v.id}
                          href={`/ventures/${v.id}`}
                          className="flex items-center gap-2 rounded-lg px-3 py-1.5 bg-red-50/50 hover:bg-red-50 transition-colors"
                        >
                          <XCircle className="size-3.5 text-red-400 shrink-0" />
                          <span className="text-xs text-[#1a2744] truncate">
                            {v.name}
                            {members.length > 0 && (
                              <span className="text-gray-400 font-normal">
                                {" · "}
                                {members.join(", ")}
                              </span>
                            )}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {summarizedVentures.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1.5">
                    סיכמו ({summarizedVentures.length})
                  </p>
                  <div className="space-y-1">
                    {summarizedVentures.map((v) => {
                      const info = summarizedByVenture.get(v.id)!;
                      const members = membersByVenture.get(v.id) || [];
                      return (
                        <Link
                          key={v.id}
                          href={`/ventures/${v.id}`}
                          className="flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 bg-[#22c55e]/5 hover:bg-[#22c55e]/10 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <CheckCircle2 className="size-3.5 text-[#22c55e] shrink-0" />
                            <span className="text-xs text-[#1a2744] truncate">
                              {v.name}
                              {members.length > 0 && (
                                <span className="text-gray-400 font-normal">
                                  {" · "}
                                  {members.join(", ")}
                                </span>
                              )}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400 shrink-0">
                            {formatDate(info.session_date)}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent mentor sessions */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle className="flex items-center gap-2 text-[#1a2744] text-base">
                  <Star className="size-5" />
                  משובי מנטורים
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {!recentSessions || recentSessions.length === 0 ? (
                <p className="text-gray-400 text-sm py-4 text-center">אין פגישות עדיין</p>
              ) : (
                <div className="space-y-2">
                  {recentSessions.map((session) => {
                    const venture = session.venture as { name: string } | null;
                    const mentor = session.mentor as { full_name: string } | null;
                    const hasFeedback = feedbackBySession.has(session.id);

                    return (
                      <Link
                        key={session.id}
                        href={`/sessions/${session.id}/feedback`}
                        className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#1a2744] truncate">
                            {venture?.name || "מיזם"} ← {mentor?.full_name || "מנטור"}
                          </p>
                          <p className="text-xs text-gray-500">{formatDate(session.session_date)}</p>
                        </div>
                        <Badge className={`text-[10px] border-0 shrink-0 ${hasFeedback ? "bg-[#22c55e]/10 text-[#22c55e]" : "bg-gray-100 text-gray-400"}`}>
                          {hasFeedback ? "✓ משוב" : "ממתין"}
                        </Badge>
                      </Link>
                    );
                  })}
                </div>
              )}
              <Link href="/admin/feedback" className="inline-flex items-center gap-1 text-xs text-[#1a2744] hover:text-[#22c55e] transition-colors mt-3">
                צפייה בכל המשובים
                <ChevronLeft className="size-3.5" />
              </Link>
            </CardContent>
          </Card>

          {/* Recent workbook tasks (open + done) */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle className="flex items-center gap-2 text-[#1a2744] text-base">
                  <ListTodo className="size-5" />
                  משימות מטבלת העבודה
                </CardTitle>
                <Badge variant="secondary" className="text-[10px]">
                  {recentTasks.length} אחרונות
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {!recentTasks || recentTasks.length === 0 ? (
                <p className="text-gray-400 text-sm py-4 text-center">
                  אין משימות בטבלת העבודה
                </p>
              ) : (
                <div className="space-y-2">
                  {recentTasks.map((task) => {
                    const ventureName = ventureMap.get(task.venture_id) || "מיזם";

                    return (
                      <Link
                        key={task.id}
                        href={`/workbook?venture=${task.venture_id}&sheet=tasks`}
                        className={`flex items-start gap-2 rounded-lg px-3 py-2 transition-colors ${
                          task.done ? "bg-[#22c55e]/5 hover:bg-[#22c55e]/10" : "bg-gray-50/60 hover:bg-gray-100/70"
                        }`}
                      >
                        {task.done ? (
                          <CheckCircle2 className="size-3.5 text-[#22c55e] shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="size-3.5 text-gray-400 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-xs line-clamp-1 ${
                              task.done ? "text-gray-500 line-through" : "text-[#1a2744]"
                            }`}
                          >
                            {task.description || "—"}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#1a2744]/5 px-1.5 py-0.5 text-[10px] text-[#1a2744]">
                              <Briefcase className="size-2.5" />
                              {ventureName}
                            </span>
                            {task.assignee && (
                              <span className="text-[10px] text-gray-500">
                                {task.assignee}
                              </span>
                            )}
                            {task.due_date && (
                              <span className="text-[10px] text-gray-400">
                                יעד: {formatDate(task.due_date)}
                              </span>
                            )}
                            <span className="text-[10px] text-gray-300">
                              · עודכן {formatDate(task.updated_at)}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  href?: string;
}) {
  const inner = (
    <Card className={`border-0 shadow-sm h-full ${href ? "transition-shadow hover:shadow-md" : ""}`}>
      <CardContent className="flex items-center gap-4 pt-0">
        <div className="flex size-10 items-center justify-center rounded-lg bg-[#22c55e]/10">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-[#1a2744]">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}
