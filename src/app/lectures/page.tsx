import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
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
  Mic2,
  Video,
  MapPin,
  FileText,
  ExternalLink,
  Paperclip,
} from "lucide-react";
import { LectureResourcesSection } from "@/components/lecture-resources-section";

export default async function LecturesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, cohort_id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/not-registered");

  // Admins manage lectures elsewhere.
  if (profile.role === "admin") redirect("/admin/lectures");

  const today = new Date().toISOString().split("T")[0];

  // Determine which cohort(s) to show:
  //   - visitor: all cohorts (global)
  //   - candidate: own cohort
  //   - mentor: any cohort they have a venture assignment in
  let lecturesQuery = supabase
    .from("lectures")
    .select("*")
    .order("scheduled_date", { ascending: true });

  if (profile.role === "candidate") {
    if (!profile.cohort_id) {
      // No cohort = no lectures (RLS would block anyway).
      lecturesQuery = lecturesQuery.eq("cohort_id", "00000000-0000-0000-0000-000000000000");
    } else {
      lecturesQuery = lecturesQuery.eq("cohort_id", profile.cohort_id);
    }
  } else if (profile.role === "mentor") {
    const { data: assignments } = await supabase
      .from("mentor_assignments")
      .select("venture:ventures(cohort_id)")
      .eq("mentor_id", user.id);
    const cohortIds = Array.from(
      new Set(
        (assignments || [])
          .map((a) => {
            const v = a.venture as
              | { cohort_id: string | null }
              | { cohort_id: string | null }[]
              | null;
            if (!v) return null;
            if (Array.isArray(v)) return v[0]?.cohort_id ?? null;
            return v.cohort_id ?? null;
          })
          .filter((c): c is string => !!c)
      )
    );
    if (cohortIds.length === 0) {
      lecturesQuery = lecturesQuery.eq("cohort_id", "00000000-0000-0000-0000-000000000000");
    } else {
      lecturesQuery = lecturesQuery.in("cohort_id", cohortIds);
    }
  }

  const { data: lectures } = await lecturesQuery;

  const { data: lectureFeedback } = await supabase
    .from("lecture_feedback")
    .select("lecture_id")
    .eq("candidate_id", user.id);

  const submittedLectureIds = new Set(
    lectureFeedback?.map((f) => f.lecture_id) || []
  );

  const isCandidate = profile.role === "candidate";

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="mb-5">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1a2744]">סילבוס</h1>
        <p className="text-sm text-gray-500 mt-1">לוח הרצאות התוכנית</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1a2744]">
            <Mic2 className="size-5" />
            הרצאות
          </CardTitle>
          <CardDescription>כל הרצאות התוכנית, הקלטות ומצגות</CardDescription>
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
                const hasSubmitted = submittedLectureIds.has(lecture.id);

                return (
                  <div
                    key={lecture.id}
                    className={`flex items-start gap-4 rounded-lg p-3 transition-colors ${
                      !isPast ? "bg-gray-50/50" : "bg-white hover:bg-gray-50/50"
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
                      <p className="font-medium text-[#1a2744]">{lecture.title}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {formatDate(lecture.scheduled_date)}
                        </span>
                        {lecture.lecturer && (
                          <span className="text-xs text-gray-400">{lecture.lecturer}</span>
                        )}
                        {lecture.location && (
                          <Badge variant="secondary" className="text-[10px] gap-1">
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
                            <Video className="size-3" /> הקלטה <ExternalLink className="size-2.5" />
                          </a>
                        )}
                        {isPast && lecture.presentation_url && (
                          <a
                            href={lecture.presentation_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-[#22c55e] hover:underline"
                          >
                            <FileText className="size-3" /> מצגת <ExternalLink className="size-2.5" />
                          </a>
                        )}
                      </div>
                      <details className="mt-2 group">
                        <summary className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-[#1a2744] cursor-pointer list-none">
                          <Paperclip className="size-3" />
                          חומרים נוספים
                        </summary>
                        <div className="mt-2">
                          <LectureResourcesSection lectureId={lecture.id} />
                        </div>
                      </details>
                    </div>
                    <div className="shrink-0">
                      {isCandidate && hasSubmitted ? (
                        <Badge className="bg-[#22c55e]/10 text-[#22c55e] border-0 hover:bg-[#22c55e]/10">
                          <CheckCircle2 className="size-3 ml-1" /> הושלם
                        </Badge>
                      ) : isCandidate && isPast ? (
                        <Link
                          href={`/lectures/${lecture.id}/feedback`}
                          className="inline-flex items-center gap-1 rounded-md bg-[#1a2744] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1a2744]/90 transition-colors"
                        >
                          מלא משוב
                        </Link>
                      ) : !isPast ? (
                        <Badge variant="secondary" className="text-gray-400">
                          <Clock className="size-3 ml-1" /> בקרוב
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
