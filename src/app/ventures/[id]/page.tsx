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
  Plus,
  Briefcase,
  Table2,
} from "lucide-react";

export default async function VentureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: ventureId } = await params;
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

  // Check this venture is assigned to this mentor
  const { data: assignment } = await supabase
    .from("mentor_assignments")
    .select("id")
    .eq("mentor_id", user.id)
    .eq("venture_id", ventureId)
    .single();

  if (!assignment) redirect("/");

  // Get venture info
  const { data: venture } = await supabase
    .from("ventures")
    .select("*")
    .eq("id", ventureId)
    .single();

  if (!venture) redirect("/");

  // Get venture members
  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, venture_role")
    .eq("venture_id", ventureId)
    .order("full_name");

  // Venture tasks live in the workbook
  let allTasks: Array<{
    id: string;
    description: string;
    owner: string;
    deadline: string | null;
    completed: boolean;
  }> = [];

  // Venture tasks (from workbook)
  const { data: workbookTaskRows } = await supabase
    .from("workbook_entries")
    .select("id, data, position")
    .eq("venture_id", ventureId)
    .eq("sheet_key", "tasks")
    .order("position", { ascending: true });

  allTasks = (workbookTaskRows || []).map((row) => {
    const d = (row.data || {}) as Record<string, unknown>;
    return {
      id: row.id,
      description: typeof d.task === "string" ? d.task : "",
      owner: typeof d.assignee === "string" ? d.assignee : "",
      deadline: typeof d.due_date === "string" && d.due_date ? (d.due_date as string) : null,
      completed: d.done === true,
    };
  });

  const openTasks = allTasks.filter((t) => !t.completed);
  const completedTasks = allTasks.filter((t) => t.completed);

  // Get guide chapters + venture entries
  const { data: chapters } = await supabase
    .from("guide_chapters")
    .select("*")
    .order("chapter_number", { ascending: true });

  const { data: entries } = await supabase
    .from("venture_chapter_entries")
    .select("*")
    .eq("venture_id", ventureId);

  const entriesByChapter = new Map(
    (entries || []).map((e) => [e.chapter_id, e.content])
  );

  // Get sessions for this venture
  const { data: sessions } = await supabase
    .from("mentor_sessions")
    .select("*")
    .eq("mentor_id", user.id)
    .eq("venture_id", ventureId)
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

  const ownerLabel = (owner: string) => owner || "—";

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1a2744] transition-colors mb-3"
        >
          <ArrowRight className="size-4" />
          חזרה למיזמים שלי
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-full bg-[#1a2744]/10">
            <Briefcase className="size-5 text-[#1a2744]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1a2744]">
              {venture.name}
            </h1>
            {venture.description && (
              <p className="text-sm text-gray-500">{venture.description}</p>
            )}
          </div>
        </div>

        {/* Members */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Users className="size-4 text-gray-400" />
          <span className="text-sm text-gray-500">חברי המיזם:</span>
          {(members || []).map((m) => (
            <Badge
              key={m.id}
              className="bg-[#22c55e]/10 text-[#22c55e] border-0 text-xs gap-1.5"
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
          {(!members || members.length === 0) && (
            <span className="text-sm text-gray-400">אין חברים</span>
          )}
        </div>
      </div>

      {/* Workbook CTA */}
      <Link
        href={`/workbook?venture=${ventureId}`}
        className="flex items-center gap-4 rounded-2xl bg-gradient-to-l from-[#22c55e] to-[#16a34a] p-5 text-white shadow-sm transition-all hover:shadow-md"
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm shrink-0">
          <Table2 className="size-6" />
        </div>
        <div className="flex-1 min-w-0 text-right">
          <p className="text-lg font-bold">פתח חוברת עבודה של המיזם</p>
          <p className="text-xs text-white/80 mt-0.5">
            משימות, לקוחות, מתחרים, משקיעים, שוק ועוד
          </p>
        </div>
      </Link>

      {/* Section 1: Tasks (read-only snapshot) */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1a2744]">
            <ListTodo className="size-5" />
            משימות
          </CardTitle>
          <CardDescription>
            {openTasks.length} פתוחות, {completedTasks.length} הושלמו — לעריכה, פתחו את חוברת העבודה
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
              href={`/sessions/new?venture=${ventureId}`}
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
                    {sessionDate ? formatDate(sessionDate) : "---"}
                  </span>
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
                          <Badge key={r.key} variant="secondary" className="text-[10px]">
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
