import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

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
      "*, session:mentor_sessions(session_date, candidate:profiles!mentor_sessions_candidate_id_fkey(full_name), mentor:profiles!mentor_sessions_mentor_id_fkey(full_name)), submitter:profiles!session_feedback_submitted_by_fkey(full_name, email)"
    )
    .order("submitted_at", { ascending: false });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">כל המשובים</h1>

      {/* Lecture Feedback */}
      <section>
        <h2 className="text-lg font-semibold mb-4">משובי הרצאות</h2>
        {!lectureFeedback || lectureFeedback.length === 0 ? (
          <p className="text-gray-500 text-sm">אין משובים עדיין</p>
        ) : (
          <div className="space-y-3">
            {lectureFeedback.map((fb) => {
              const lecture = fb.lecture as { title: string; scheduled_date: string } | null;
              const candidate = fb.candidate as { full_name: string; email: string } | null;
              return (
                <div
                  key={fb.id}
                  className="bg-white rounded-xl shadow-sm border p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">
                      {lecture?.title || "הרצאה"}
                    </span>
                    <span className="text-sm text-gray-500">
                      {candidate?.full_name || candidate?.email || "—"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {fb.content}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    {formatDate(fb.submitted_at)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Session Feedback */}
      <section>
        <h2 className="text-lg font-semibold mb-4">משובי פגישות מנטורינג</h2>
        {!sessionFeedback || sessionFeedback.length === 0 ? (
          <p className="text-gray-500 text-sm">אין משובים עדיין</p>
        ) : (
          <div className="space-y-3">
            {sessionFeedback.map((fb) => {
              const session = fb.session as {
                session_date: string;
                candidate: { full_name: string } | null;
                mentor: { full_name: string } | null;
              } | null;
              const submitter = fb.submitter as { full_name: string; email: string } | null;
              return (
                <div
                  key={fb.id}
                  className="bg-white rounded-xl shadow-sm border p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">
                      {session?.candidate?.full_name || "מועמד/ת"} ↔{" "}
                      {session?.mentor?.full_name || "מנטור"}
                    </span>
                    <span className="text-sm text-gray-500">
                      {submitter?.full_name || submitter?.email} ({fb.role === "mentor" ? "מנטור" : "מועמד/ת"})
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {fb.content}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    {formatDate(fb.submitted_at)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
