import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic2, Users, MessageSquare } from "lucide-react";

const RATING_LABELS: Record<number, { label: string; bg: string }> = {
  1: { label: "נמוך", bg: "bg-red-100 text-red-700" },
  2: { label: "מתחת", bg: "bg-orange-100 text-orange-700" },
  3: { label: "סביר", bg: "bg-yellow-100 text-yellow-700" },
  4: { label: "טוב", bg: "bg-lime-100 text-lime-700" },
  5: { label: "מצוין", bg: "bg-green-100 text-green-700" },
};

const RATING_KEYS = [
  { key: "rating_focus", label: "מיקוד" },
  { key: "rating_progress", label: "התקדמות" },
  { key: "rating_preparedness", label: "מוכנות" },
  { key: "rating_initiative", label: "יוזמה" },
  { key: "rating_followthrough", label: "יישום" },
];

export default async function AdminFeedbackPage() {
  const supabase = await createClient();

  const { data: lectureFeedback } = await supabase
    .from("lecture_feedback")
    .select(
      "*, lecture:lectures(title, scheduled_date), candidate:profiles!lecture_feedback_candidate_id_fkey(full_name, email)"
    )
    .order("submitted_at", { ascending: false });

  const { data: sessionFeedback } = await supabase
    .from("session_feedback")
    .select(
      "*, session:mentor_sessions(session_date, venture:ventures(name), mentor:profiles!mentor_sessions_mentor_id_fkey(full_name)), submitter:profiles!session_feedback_submitted_by_fkey(full_name, email)"
    )
    .order("submitted_at", { ascending: false });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-[#1a2744]">כל המשובים</h1>

      {/* Session Feedback */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Users className="size-5 text-[#1a2744]" />
          <h2 className="text-lg font-semibold text-[#1a2744]">משובי פגישות מנטורינג</h2>
          <Badge variant="secondary">{sessionFeedback?.length || 0}</Badge>
        </div>
        {!sessionFeedback || sessionFeedback.length === 0 ? (
          <p className="text-gray-500 text-sm">אין משובים עדיין</p>
        ) : (
          <div className="space-y-3">
            {sessionFeedback.map((fb) => {
              const session = fb.session as {
                session_date: string;
                venture: { name: string } | null;
                mentor: { full_name: string } | null;
              } | null;
              const submitter = fb.submitter as { full_name: string; email: string } | null;
              const isMentor = fb.role === "mentor";

              return (
                <Card key={fb.id} className="border-0 shadow-sm">
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-full bg-[#1a2744]/10">
                          <Users className="size-3.5 text-[#1a2744]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#1a2744]">
                            {session?.venture?.name || "מיזם"} ↔ {session?.mentor?.full_name || "מנטור"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {session?.session_date ? formatDate(session.session_date) : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {submitter?.full_name || submitter?.email}
                        </Badge>
                        <Badge
                          className={`text-xs border-0 ${
                            isMentor
                              ? "bg-[#1a2744]/10 text-[#1a2744]"
                              : "bg-[#22c55e]/10 text-[#22c55e]"
                          }`}
                        >
                          {isMentor ? "מנטור" : "יזם/ית"}
                        </Badge>
                      </div>
                    </div>

                    {/* Ratings */}
                    {isMentor && (
                      <div className="flex flex-wrap gap-3">
                        {RATING_KEYS.map((r) => {
                          const val = fb[r.key] as number | null;
                          if (!val) return null;
                          const style = RATING_LABELS[val];
                          return (
                            <div key={r.key} className="text-center">
                              <p className="text-[10px] text-gray-500 mb-0.5">{r.label}</p>
                              <Badge className={`${style.bg} border-0 text-xs`}>
                                {val}/5
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {fb.content && (
                      <div className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {fb.content}
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-gray-400">{formatDate(fb.submitted_at)}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Lecture Feedback */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Mic2 className="size-5 text-[#1a2744]" />
          <h2 className="text-lg font-semibold text-[#1a2744]">משובי הרצאות</h2>
          <Badge variant="secondary">{lectureFeedback?.length || 0}</Badge>
        </div>
        {!lectureFeedback || lectureFeedback.length === 0 ? (
          <p className="text-gray-500 text-sm">אין משובים עדיין</p>
        ) : (
          <div className="space-y-3">
            {lectureFeedback.map((fb) => {
              const lecture = fb.lecture as { title: string; scheduled_date: string } | null;
              const candidate = fb.candidate as { full_name: string; email: string } | null;
              return (
                <Card key={fb.id} className="border-0 shadow-sm">
                  <CardContent className="pt-0 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-full bg-[#22c55e]/10">
                          <Mic2 className="size-3.5 text-[#22c55e]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#1a2744]">
                            {lecture?.title || "הרצאה"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {lecture?.scheduled_date ? formatDate(lecture.scheduled_date) : ""}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {candidate?.full_name || candidate?.email || "—"}
                      </Badge>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {fb.content}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400">{formatDate(fb.submitted_at)}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
