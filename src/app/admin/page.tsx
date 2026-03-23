import { createClient } from "@/lib/supabase/server";
import { getCurrentWeekStart, formatDate } from "@/lib/utils";
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
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  ChevronLeft,
} from "lucide-react";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const weekStart = getCurrentWeekStart();

  // Counts
  const { count: totalCandidates } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "candidate");

  const { count: totalMentors } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "mentor");

  const { count: totalLectures } = await supabase
    .from("lectures")
    .select("*", { count: "exact", head: true });

  const { count: totalSessions } = await supabase
    .from("mentor_sessions")
    .select("*", { count: "exact", head: true });

  // All candidates
  const { data: candidates } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "candidate")
    .order("full_name");

  // Check-ins this week
  const { data: weeklyCheckins } = await supabase
    .from("checkins")
    .select("candidate_id")
    .eq("type", "weekly")
    .eq("period_start", weekStart);

  const checkedInIds = new Set(weeklyCheckins?.map((c) => c.candidate_id) || []);

  const didCheckin = candidates?.filter((c) => checkedInIds.has(c.id)) || [];
  const didNotCheckin = candidates?.filter((c) => !checkedInIds.has(c.id)) || [];

  // Recent mentor sessions
  const { data: recentSessions } = await supabase
    .from("mentor_sessions")
    .select(
      "*, candidate:profiles!mentor_sessions_candidate_id_fkey(full_name, email), mentor:profiles!mentor_sessions_mentor_id_fkey(full_name, email)"
    )
    .order("session_date", { ascending: false })
    .limit(10);

  // Session feedback
  const sessionIds = recentSessions?.map((s) => s.id) || [];
  const { data: sessionFeedback } = await supabase
    .from("session_feedback")
    .select("session_id, submitted_by, role")
    .in("session_id", sessionIds.length > 0 ? sessionIds : ["none"]);

  const feedbackBySession = new Map<string, Set<string>>();
  sessionFeedback?.forEach((f) => {
    if (!feedbackBySession.has(f.session_id))
      feedbackBySession.set(f.session_id, new Set());
    feedbackBySession.get(f.session_id)!.add(f.submitted_by);
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1a2744]">סקירה כללית</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="מועמדים"
          value={totalCandidates || 0}
          icon={<Users className="size-5 text-[#22c55e]" />}
        />
        <StatCard
          label="מנטורים"
          value={totalMentors || 0}
          icon={<Users className="size-5 text-[#22c55e]" />}
        />
        <StatCard
          label="הרצאות"
          value={totalLectures || 0}
          icon={<Mic2 className="size-5 text-[#22c55e]" />}
        />
        <StatCard
          label="פגישות מנטורינג"
          value={totalSessions || 0}
          icon={<CalendarDays className="size-5 text-[#22c55e]" />}
        />
      </div>

      {/* Weekly Check-in Status */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle className="flex items-center gap-2 text-[#1a2744]">
              <ClipboardCheck className="size-5" />
              צ׳ק-אין שבועי
            </CardTitle>
            <Badge variant="secondary" className="text-sm">
              {didCheckin.length} / {candidates?.length || 0}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress bar */}
          <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#22c55e] transition-all"
              style={{
                width: `${candidates?.length ? (didCheckin.length / candidates.length) * 100 : 0}%`,
              }}
            />
          </div>

          {/* Not completed */}
          {didNotCheckin.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">
                טרם מילאו ({didNotCheckin.length})
              </p>
              <div className="space-y-1">
                {didNotCheckin.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 bg-red-50/50"
                  >
                    <XCircle className="size-4 text-red-400 shrink-0" />
                    <span className="text-sm text-[#1a2744] font-medium">
                      {c.full_name || c.email}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {didCheckin.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">
                מילאו ({didCheckin.length})
              </p>
              <div className="space-y-1">
                {didCheckin.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 bg-[#22c55e]/5"
                  >
                    <CheckCircle2 className="size-4 text-[#22c55e] shrink-0" />
                    <span className="text-sm text-[#1a2744] font-medium">
                      {c.full_name || c.email}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Link
            href="/admin/checkins"
            className="inline-flex items-center gap-1 text-sm text-[#1a2744] hover:text-[#22c55e] transition-colors"
          >
            צפייה בכל הצ׳ק-אינים
            <ChevronLeft className="size-4" />
          </Link>
        </CardContent>
      </Card>

      {/* Recent Mentor Sessions */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle className="flex items-center gap-2 text-[#1a2744]">
              <CalendarDays className="size-5" />
              פגישות מנטורינג אחרונות
            </CardTitle>
            <Badge variant="secondary" className="text-sm">
              {totalSessions || 0} סה״כ
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!recentSessions || recentSessions.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">
              אין פגישות עדיין
            </p>
          ) : (
            <div className="space-y-2">
              {recentSessions.map((session) => {
                const candidate = session.candidate as {
                  full_name: string;
                  email: string;
                } | null;
                const mentor = session.mentor as {
                  full_name: string;
                  email: string;
                } | null;
                const feedbackSubmitters = feedbackBySession.get(session.id);
                const candidateFeedback = feedbackSubmitters?.has(
                  session.candidate_id
                );
                const mentorFeedback = feedbackSubmitters?.has(
                  session.mentor_id
                );

                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between rounded-lg px-3 py-3 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-9 items-center justify-center rounded-full bg-[#1a2744]/10 shrink-0">
                        <Users className="size-4 text-[#1a2744]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#1a2744] truncate">
                          {candidate?.full_name || candidate?.email || "מועמד/ת"}{" "}
                          ←{" "}
                          {mentor?.full_name || mentor?.email || "מנטור/ית"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(session.session_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${
                          candidateFeedback
                            ? "bg-[#22c55e]/10 text-[#22c55e]"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        יזם {candidateFeedback ? "✓" : "✗"}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${
                          mentorFeedback
                            ? "bg-[#22c55e]/10 text-[#22c55e]"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        מנטור {mentorFeedback ? "✓" : "✗"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Link
            href="/admin/feedback"
            className="inline-flex items-center gap-1 text-sm text-[#1a2744] hover:text-[#22c55e] transition-colors mt-4"
          >
            צפייה בכל המשובים
            <ChevronLeft className="size-4" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card className="border-0 shadow-sm">
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
}
