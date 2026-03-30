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
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  ListTodo,
  BookOpen,
  MessageSquare,
  CheckCircle2,
  Circle,
  CalendarDays,
  Users,
  Plus,
} from "lucide-react";

export default async function MenteeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: candidateId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check user is a mentor
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "mentor") redirect("/");

  // Check this candidate is assigned to this mentor
  const { data: assignment } = await supabase
    .from("mentor_assignments")
    .select("id")
    .eq("mentor_id", user.id)
    .eq("candidate_id", candidateId)
    .single();

  if (!assignment) redirect("/");

  // Get candidate profile
  const { data: candidate } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", candidateId)
    .single();

  if (!candidate) redirect("/");

  // Get tasks for this candidate
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false });

  const openTasks = tasks?.filter((t) => !t.completed) || [];
  const completedTasks = tasks?.filter((t) => t.completed) || [];

  // Get guide chapters + candidate entries
  const { data: chapters } = await supabase
    .from("guide_chapters")
    .select("*")
    .order("chapter_number", { ascending: true });

  const { data: entries } = await supabase
    .from("candidate_chapter_entries")
    .select("*")
    .eq("candidate_id", candidateId);

  const entriesByChapter = new Map(
    (entries || []).map((e) => [e.chapter_id, e.content])
  );

  // Get sessions between this mentor and candidate
  const { data: sessions } = await supabase
    .from("mentor_sessions")
    .select("*")
    .eq("mentor_id", user.id)
    .eq("candidate_id", candidateId)
    .order("session_date", { ascending: false });

  // Get feedback for those sessions
  const sessionIds = sessions?.map((s) => s.id) || [];
  const { data: feedback } = sessionIds.length > 0
    ? await supabase
        .from("session_feedback")
        .select("*, session:mentor_sessions(session_date)")
        .in("session_id", sessionIds)
        .eq("role", "mentor")
        .order("submitted_at", { ascending: false })
    : { data: [] };

  const ownerLabel = (owner: string) => {
    switch (owner) {
      case "self":
        return "עצמי";
      case "mentor":
        return "מנטור";
      case "team":
        return "צוות";
      default:
        return owner;
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1a2744] transition-colors mb-3"
        >
          <ArrowRight className="size-4" />
          חזרה לחניכים שלי
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-full bg-[#1a2744]/10">
            <Users className="size-5 text-[#1a2744]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1a2744]">
              {candidate.full_name}
            </h1>
            <p className="text-sm text-gray-500" dir="ltr">
              {candidate.email}
            </p>
          </div>
        </div>
      </div>

      {/* Section 1: Tasks */}
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
          {/* Open tasks */}
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
                      <Badge variant="secondary" className="text-[10px]">
                        {ownerLabel(task.owner)}
                      </Badge>
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

          {/* Completed tasks */}
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
                      <Badge variant="secondary" className="text-[10px]">
                        {ownerLabel(task.owner)}
                      </Badge>
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

          {(tasks?.length || 0) === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              אין משימות
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Guide */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1a2744]">
            <BookOpen className="size-5" />
            מדריך התוכנית
          </CardTitle>
          <CardDescription>
            {entries?.filter((e) => e.content).length || 0} מתוך{" "}
            {chapters?.length || 0} פרקים מולאו
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
                    <CheckCircle2 className="size-4 text-[#22c55e] shrink-0" />
                  ) : (
                    <Circle className="size-4 text-gray-300 shrink-0" />
                  )}
                  <p className="text-sm font-medium text-[#1a2744]">
                    פרק {chapter.chapter_number}: {chapter.title}
                  </p>
                </div>
                {isFilled ? (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap mr-6 mt-1 leading-relaxed">
                    {content}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mr-6">טרם מולא</p>
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

      {/* Section 3: Session Feedback */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <CardTitle className="flex items-center gap-2 text-[#1a2744]">
                <MessageSquare className="size-5" />
                משובי מנטורינג
              </CardTitle>
              <CardDescription>
                {feedback?.length || 0} משובים
              </CardDescription>
            </div>
            <Link
              href={`/sessions/new?candidate=${candidateId}`}
              className="inline-flex items-center gap-1 rounded-md bg-[#22c55e] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#16a34a] transition-colors"
            >
              <Plus className="size-3.5" />
              משוב חדש
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {(feedback || []).map((fb) => {
            const sessionDate = (
              fb.session as { session_date: string } | null
            )?.session_date;

            return (
              <div key={fb.id} className="rounded-lg p-3 bg-gray-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="size-4 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {sessionDate ? formatDate(sessionDate) : "—"}
                  </span>
                  {/* Ratings */}
                  {fb.rating_focus && (
                    <div className="flex gap-1 mr-auto">
                      {[
                        { key: "rating_focus", label: "מיקוד" },
                        { key: "rating_progress", label: "התקדמות" },
                        { key: "rating_preparedness", label: "מוכנות" },
                        { key: "rating_initiative", label: "יוזמה" },
                        { key: "rating_followthrough", label: "יישום" },
                      ].map((r) => {
                        const val = fb[r.key as keyof typeof fb] as
                          | number
                          | null;
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

          {(!feedback || feedback.length === 0) && (
            <p className="text-sm text-gray-400 text-center py-4">
              אין משובים עדיין
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
