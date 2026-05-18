import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
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
  Briefcase,
  Users,
  UserCheck,
  Table2,
  BookOpen,
  Activity as ActivityIcon,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { VentureActivityFeed } from "@/components/venture-activity-feed";
import type {
  Profile,
  Venture,
  Cohort,
  VentureActivity,
} from "@/lib/types";

const ACTIVITY_PAGE_SIZE = 30;

type MentorAssignmentRow = {
  mentor: Pick<Profile, "id" | "full_name" | "email" | "avatar_url"> | null;
};

export default async function AdminVentureDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id: ventureId } = await params;
  const { page: pageParam } = await searchParams;

  const pageNum = Math.max(1, Number.parseInt(pageParam || "1", 10) || 1);
  const from = (pageNum - 1) * ACTIVITY_PAGE_SIZE;
  const to = from + ACTIVITY_PAGE_SIZE - 1;

  const supabase = await createClient();

  const { data: venture } = await supabase
    .from("ventures")
    .select("*, cohort:cohorts(*)")
    .eq("id", ventureId)
    .maybeSingle();

  if (!venture) notFound();

  const ventureRow = venture as Venture & { cohort: Cohort | null };

  const [
    { data: members },
    { data: mentorRows },
    { data: workbookRows },
    { data: chapters },
    { data: chapterEntries },
    { count: sessionCount },
    { data: activityRows, count: activityCount },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, venture_role")
      .eq("venture_id", ventureId)
      .order("full_name"),
    supabase
      .from("mentor_assignments")
      .select("mentor:mentor_id(id, full_name, email, avatar_url)")
      .eq("venture_id", ventureId),
    supabase
      .from("workbook_entries")
      .select("id, sheet_key, data")
      .eq("venture_id", ventureId),
    supabase.from("guide_chapters").select("id"),
    supabase
      .from("venture_chapter_entries")
      .select("chapter_id, content")
      .eq("venture_id", ventureId),
    supabase
      .from("mentor_sessions")
      .select("id", { count: "exact", head: true })
      .eq("venture_id", ventureId),
    supabase
      .from("venture_activity")
      .select(
        "*, actor:actor_id(id, full_name, avatar_url), venture:venture_id(id, name)",
        { count: "exact" }
      )
      .eq("venture_id", ventureId)
      .order("created_at", { ascending: false })
      .range(from, to),
  ]);

  const memberList = (members || []) as Array<
    Pick<Profile, "id" | "full_name" | "email" | "avatar_url" | "venture_role">
  >;

  const mentors = ((mentorRows || []) as unknown as MentorAssignmentRow[])
    .map((row) => row.mentor)
    .filter((m): m is NonNullable<MentorAssignmentRow["mentor"]> => !!m);

  const taskRows = (workbookRows || []).filter((r) => r.sheet_key === "tasks");
  const totalTasks = taskRows.length;
  const completedTasks = taskRows.filter((r) => {
    const d = (r.data || {}) as Record<string, unknown>;
    return d.done === true;
  }).length;

  const totalChapters = (chapters || []).length;
  const filledChapters = (chapterEntries || []).filter(
    (e) => (e.content || "").trim() !== ""
  ).length;

  const activity = ((activityRows || []) as VentureActivity[]) || [];
  const totalActivity = activityCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalActivity / ACTIVITY_PAGE_SIZE));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/ventures"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1a2744] transition-colors mb-3"
        >
          <ArrowRight className="size-4" />
          חזרה למיזמים
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-full bg-[#1a2744]/10">
            <Briefcase className="size-5 text-[#1a2744]" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-[#1a2744]">
              {ventureRow.name}
            </h1>
            {ventureRow.description && (
              <p className="text-sm text-gray-500">{ventureRow.description}</p>
            )}
          </div>
          {ventureRow.cohort && (
            <Badge className="bg-[#22c55e]/10 text-[#22c55e] border-0 text-xs">
              {ventureRow.cohort.name}
            </Badge>
          )}
        </div>
      </div>

      {/* Members */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-[#1a2744]">
            <Users className="size-5" />
            חברי המיזם ({memberList.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {memberList.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {memberList.map((m) => (
                <Badge
                  key={m.id}
                  className="bg-[#22c55e]/10 text-[#22c55e] border-0 text-sm gap-1.5 py-1.5 pr-1.5"
                >
                  {m.avatar_url ? (
                    <img
                      src={m.avatar_url}
                      alt={m.full_name || ""}
                      className="size-5 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex size-5 items-center justify-center rounded-full bg-[#22c55e]/20 text-[9px] font-bold text-[#22c55e]">
                      {(m.full_name || m.email || "?").charAt(0)}
                    </span>
                  )}
                  {m.full_name || m.email}
                  {m.venture_role && (
                    <span className="text-xs opacity-70">— {m.venture_role}</span>
                  )}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">אין חברים משויכים למיזם</p>
          )}
        </CardContent>
      </Card>

      {/* Mentors */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-[#1a2744]">
            <UserCheck className="size-5" />
            מנטורים ({mentors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mentors.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {mentors.map((mentor) => (
                <Badge
                  key={mentor.id}
                  className="bg-[#1a2744]/10 text-[#1a2744] border-0 text-sm gap-1.5 py-1.5 pr-1.5"
                >
                  {mentor.avatar_url ? (
                    <img
                      src={mentor.avatar_url}
                      alt={mentor.full_name || ""}
                      className="size-5 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex size-5 items-center justify-center rounded-full bg-[#1a2744]/20 text-[9px] font-bold text-[#1a2744]">
                      {(mentor.full_name || mentor.email || "?").charAt(0)}
                    </span>
                  )}
                  {mentor.full_name || mentor.email}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">לא הוקצו מנטורים למיזם</p>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href={`/workbook?venture=${ventureId}`}
          className="flex items-center gap-3 rounded-2xl bg-gradient-to-l from-[#22c55e] to-[#16a34a] p-4 text-white shadow-sm transition-all hover:shadow-md"
        >
          <div className="flex size-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm shrink-0">
            <Table2 className="size-5" />
          </div>
          <div className="flex-1 min-w-0 text-right">
            <p className="text-sm font-bold">טבלת עבודה</p>
            <p className="text-xs text-white/80 mt-0.5">
              {completedTasks}/{totalTasks} משימות הושלמו
            </p>
          </div>
        </Link>

        <Link
          href={`/guide?venture=${ventureId}`}
          className="flex items-center gap-3 rounded-2xl bg-gradient-to-l from-[#1a2744] to-[#2c3e64] p-4 text-white shadow-sm transition-all hover:shadow-md"
        >
          <div className="flex size-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm shrink-0">
            <BookOpen className="size-5" />
          </div>
          <div className="flex-1 min-w-0 text-right">
            <p className="text-sm font-bold">חוברת מיזם</p>
            <p className="text-xs text-white/80 mt-0.5">
              {filledChapters}/{totalChapters} פרקים מולאו
            </p>
          </div>
        </Link>
      </div>

      {/* Sessions summary */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-[#1a2744]">
            <MessageSquare className="size-5" />
            פגישות מנטור
          </CardTitle>
          <CardDescription>
            {sessionCount || 0} סיכומי פגישות נרשמו עד כה
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Activity feed */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle className="flex items-center gap-2 text-base text-[#1a2744]">
              <ActivityIcon className="size-5" />
              פעילות
            </CardTitle>
            <Badge variant="secondary" className="text-[10px]">
              {totalActivity} אירועים
            </Badge>
          </div>
          <CardDescription>
            כל הפעילות שנרשמה במיזם זה
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activity.length > 0 ? (
            <>
              <VentureActivityFeed items={activity} audience="admin" />

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                  <PageLink
                    disabled={pageNum <= 1}
                    href={`/admin/ventures/${ventureId}?page=${pageNum - 1}`}
                    direction="prev"
                  />
                  <span className="text-xs text-gray-500">
                    עמוד {pageNum} מתוך {totalPages}
                  </span>
                  <PageLink
                    disabled={pageNum >= totalPages}
                    href={`/admin/ventures/${ventureId}?page=${pageNum + 1}`}
                    direction="next"
                  />
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">
              אין פעילות עדיין
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PageLink({
  disabled,
  href,
  direction,
}: {
  disabled: boolean;
  href: string;
  direction: "prev" | "next";
}) {
  // RTL: "next" page (higher number) goes right-to-left visually with ChevronLeft.
  const Icon = direction === "next" ? ChevronLeft : ChevronRight;
  const label = direction === "next" ? "הבא" : "הקודם";

  if (disabled) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-300 px-3 py-1.5">
        {direction === "prev" && <Icon className="size-4" />}
        {label}
        {direction === "next" && <Icon className="size-4" />}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs text-[#1a2744] hover:text-[#22c55e] px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
    >
      {direction === "prev" && <Icon className="size-4" />}
      {label}
      {direction === "next" && <Icon className="size-4" />}
    </Link>
  );
}
