import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentWeekStart, formatDate } from "@/lib/utils";
import Link from "next/link";

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

  const weekStart = getCurrentWeekStart();

  if (profile.role === "candidate") {
    return <CandidateDashboard userId={user.id} weekStart={weekStart} />;
  }

  return <MentorDashboard userId={user.id} />;
}

async function CandidateDashboard({
  userId,
  weekStart,
}: {
  userId: string;
  weekStart: string;
}) {
  const supabase = await createClient();

  // Get all lectures that have passed
  const { data: lectures } = await supabase
    .from("lectures")
    .select("*")
    .lte("scheduled_date", new Date().toISOString().split("T")[0])
    .order("scheduled_date", { ascending: false });

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
    .from("weekly_checkins")
    .select("id")
    .eq("candidate_id", userId)
    .eq("week_start", weekStart)
    .single();

  const pendingLectures =
    lectures?.filter((l) => !submittedLectureIds.has(l.id)) || [];
  const pendingSessions =
    sessions?.filter((s) => !submittedSessionIds.has(s.id)) || [];

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">הפורטל שלי</h1>
        <LogoutButton />
      </div>

      {/* Weekly Check-in */}
      <section className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">צ׳ק-אין שבועי</h2>
          {checkin ? (
            <span className="text-sm text-green-600 font-medium">הושלם ✓</span>
          ) : (
            <Link
              href="/checkin"
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              מלא עכשיו
            </Link>
          )}
        </div>
      </section>

      {/* Pending Lecture Feedback */}
      <section className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">משוב על הרצאות</h2>
        {pendingLectures.length === 0 ? (
          <p className="text-gray-500 text-sm">אין משובים ממתינים</p>
        ) : (
          <ul className="space-y-3">
            {pendingLectures.map((lecture) => (
              <li
                key={lecture.id}
                className="flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{lecture.title}</p>
                  <p className="text-sm text-gray-500">
                    {formatDate(lecture.scheduled_date)}
                  </p>
                </div>
                <Link
                  href={`/lectures/${lecture.id}/feedback`}
                  className="text-blue-600 text-sm hover:underline"
                >
                  מלא משוב
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Mentor Sessions */}
      <section className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">פגישות מנטורינג</h2>
          <Link
            href="/sessions/new"
            className="text-blue-600 text-sm hover:underline"
          >
            + פגישה חדשה
          </Link>
        </div>
        {pendingSessions.length === 0 && (!sessions || sessions.length === 0) ? (
          <p className="text-gray-500 text-sm">אין פגישות</p>
        ) : (
          <ul className="space-y-3">
            {sessions?.map((session) => (
              <li
                key={session.id}
                className="flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">
                    פגישה עם{" "}
                    {(session.mentor as { full_name: string })?.full_name ||
                      "מנטור"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDate(session.session_date)}
                  </p>
                </div>
                {submittedSessionIds.has(session.id) ? (
                  <span className="text-sm text-green-600">הושלם ✓</span>
                ) : (
                  <Link
                    href={`/sessions/${session.id}/feedback`}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    מלא משוב
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

async function MentorDashboard({ userId }: { userId: string }) {
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

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">הפורטל שלי</h1>
        <LogoutButton />
      </div>

      <section className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">פגישות מנטורינג</h2>
          <Link
            href="/sessions/new"
            className="text-blue-600 text-sm hover:underline"
          >
            + פגישה חדשה
          </Link>
        </div>
        {!sessions || sessions.length === 0 ? (
          <p className="text-gray-500 text-sm">אין פגישות</p>
        ) : (
          <ul className="space-y-3">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">
                    פגישה עם{" "}
                    {(session.candidate as { full_name: string })?.full_name ||
                      "מועמד/ת"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDate(session.session_date)}
                  </p>
                </div>
                {submittedSessionIds.has(session.id) ? (
                  <span className="text-sm text-green-600">הושלם ✓</span>
                ) : (
                  <Link
                    href={`/sessions/${session.id}/feedback`}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    מלא משוב
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function LogoutButton() {
  return (
    <form action="/auth/logout" method="POST">
      <button
        type="submit"
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        התנתקות
      </button>
    </form>
  );
}
