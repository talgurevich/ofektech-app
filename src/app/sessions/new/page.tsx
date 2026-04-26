"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { logActivity } from "@/lib/activity";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Send, CalendarDays, Briefcase, MessageSquare } from "lucide-react";
import Link from "next/link";

type AssignedMentor = {
  mentor_id: string;
  mentor: { id: string; full_name: string | null } | null;
};

function NewSessionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<string>("");
  const [ventureId, setVentureId] = useState<string | null>(null);
  const [ventureName, setVentureName] = useState<string>("");
  const [mentor, setMentor] = useState<{ id: string; name: string } | null>(null);
  const [sessionDate, setSessionDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [summary, setSummary] = useState("");

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, venture_id")
        .eq("id", user.id)
        .single();
      if (!profile) {
        router.replace("/login");
        return;
      }
      setUserId(user.id);
      setRole(profile.role);

      // Only members of a venture (candidates) write summaries here.
      // Mentors and admins land here only by mistake — bounce them home.
      if (profile.role !== "candidate") {
        router.replace("/");
        return;
      }
      if (!profile.venture_id) {
        router.replace("/");
        return;
      }

      setVentureId(profile.venture_id);

      const { data: venture } = await supabase
        .from("ventures")
        .select("name")
        .eq("id", profile.venture_id)
        .single();
      if (venture) setVentureName(venture.name);

      // Find the venture's assigned mentor
      const { data: assignment } = await supabase
        .from("mentor_assignments")
        .select(
          "mentor_id, mentor:profiles!mentor_assignments_mentor_id_fkey(id, full_name)"
        )
        .eq("venture_id", profile.venture_id)
        .limit(1)
        .maybeSingle<AssignedMentor>();
      if (assignment?.mentor) {
        setMentor({
          id: assignment.mentor.id,
          name: assignment.mentor.full_name || "מנטור",
        });
      }
    })();
  }, [supabase, router]);

  async function handleSubmit() {
    if (!ventureId || !mentor || !summary.trim()) {
      setError("נא לוודא שהמיזם משויך למנטור ושהסיכום אינו ריק");
      return;
    }
    setLoading(true);
    setError("");

    const nowIso = new Date().toISOString();
    const { data: session, error: sessionErr } = await supabase
      .from("mentor_sessions")
      .insert({
        venture_id: ventureId,
        mentor_id: mentor.id,
        session_date: sessionDate,
        created_by: userId,
        meeting_summary: summary.trim(),
        summary_submitted_at: nowIso,
        summary_submitted_by: userId,
      })
      .select("id")
      .single();

    if (sessionErr || !session) {
      setError(sessionErr?.message || "שגיאה ביצירת סיכום הפגישה");
      setLoading(false);
      return;
    }

    logActivity(supabase, {
      ventureId,
      kind: "meeting_summary_submitted",
      summary: "הגיש/ה סיכום פגישה",
      metadata: { session_id: session.id, session_date: sessionDate },
    });

    // Notify the mentor
    fetch("/api/notifications/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetUserId: mentor.id,
        type: "feedback",
        title: "סיכום פגישה חדש",
        body: `סיכום פגישה חדש ממיזם ${ventureName} ממתין למשוב שלך`,
        link: `/sessions/${session.id}/feedback`,
      }),
    });

    router.push(`/sessions/${session.id}/feedback`);
    router.refresh();
  }

  if (!ventureId) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <img
          src="/logo-icon.png"
          alt="טוען..."
          className="size-20 object-contain animate-spin"
          style={{ animationDuration: "2s" }}
        />
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto p-4 md:p-8 w-full">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1a2744] transition-colors mb-3"
        >
          <ArrowRight className="size-4" />
          חזרה
        </Link>
        <h1 className="text-2xl font-bold text-[#1a2744]">סיכום פגישת מנטורינג</h1>
        <p className="text-sm text-gray-500 mt-1">
          רשמו את סיכום הפגישה — המנטור/ית יראה/תראה ויגיש/תגיש משוב.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      <Card className="border-0 shadow-sm">
        <CardContent className="pt-0 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                <Briefcase className="size-4 inline ml-1" />
                מיזם
              </label>
              <p className="text-sm font-medium text-[#1a2744] bg-gray-50 rounded-lg px-3 py-2.5">
                {ventureName || "—"}
              </p>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                <CalendarDays className="size-4 inline ml-1" />
                תאריך הפגישה
              </label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent"
                dir="ltr"
              />
            </div>
          </div>

          {mentor ? (
            <p className="text-xs text-gray-500">
              ייפתח משוב עבור{" "}
              <span className="font-medium text-[#1a2744]">{mentor.name}</span>
            </p>
          ) : (
            <p className="text-xs text-amber-600">
              המיזם שלכם אינו משויך למנטור עדיין. פנו לצוות התוכנית.
            </p>
          )}

          <div>
            <label className="block text-sm text-gray-600 mb-2">
              <MessageSquare className="size-4 inline ml-1" />
              סיכום הפגישה
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={10}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent"
              placeholder="על מה דיברתם? אילו החלטות התקבלו? מה המשימות להמשך?"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all"
        >
          <ArrowRight className="size-4" />
          ביטול
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || !summary.trim() || !mentor}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 transition-colors shadow-sm"
        >
          {loading ? "שומר..." : "שלח סיכום"}
          <Send className="size-4" />
        </button>
      </div>

      {/* role/searchParams currently unused — kept for future routing logic */}
      <span className="hidden">{role}{searchParams.get("venture")}</span>
    </main>
  );
}

export default function NewSessionPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[60vh] items-center justify-center">
          <img
            src="/logo-icon.png"
            alt="טוען..."
            className="size-20 object-contain animate-spin"
            style={{ animationDuration: "2s" }}
          />
        </main>
      }
    >
      <NewSessionForm />
    </Suspense>
  );
}
