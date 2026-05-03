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

type VentureOption = {
  id: string;
  name: string;
};

function NewSessionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<string>("");
  const [ventureId, setVentureId] = useState<string | null>(null);
  const [ventureName, setVentureName] = useState<string>("");
  // Candidate flow: assigned mentor for the venture.
  // Mentor flow: the mentor is the current user.
  const [mentor, setMentor] = useState<{ id: string; name: string } | null>(null);
  // For mentor flow: list of assigned ventures + members for notifications.
  const [mentorVentures, setMentorVentures] = useState<VentureOption[]>([]);
  const [ventureMembers, setVentureMembers] = useState<{ id: string }[]>([]);
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
        .select("role, venture_id, full_name")
        .eq("id", user.id)
        .single();
      if (!profile) {
        router.replace("/login");
        return;
      }
      setUserId(user.id);
      setRole(profile.role);

      if (profile.role === "candidate") {
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
        setReady(true);
        return;
      }

      if (profile.role === "mentor") {
        // Mentor: pick from assigned ventures
        const { data: assignments } = await supabase
          .from("mentor_assignments")
          .select("venture:ventures(id, name)")
          .eq("mentor_id", user.id);

        const ventures: VentureOption[] = (assignments || [])
          .map((a) => a.venture as unknown as VentureOption | null)
          .filter((v): v is VentureOption => !!v && !!v.id);

        if (ventures.length === 0) {
          router.replace("/");
          return;
        }

        setMentorVentures(ventures);
        setMentor({ id: user.id, name: profile.full_name || "מנטור" });

        // Pre-select via ?venture= or if there's only one
        const queryVenture = searchParams.get("venture");
        const initial =
          (queryVenture && ventures.find((v) => v.id === queryVenture)) ||
          (ventures.length === 1 ? ventures[0] : null);
        if (initial) {
          await selectVentureForMentor(initial.id, initial.name);
        }
        setReady(true);
        return;
      }

      // Admins / visitors don't write summaries here.
      router.replace("/");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function selectVentureForMentor(id: string, name: string) {
    setVentureId(id);
    setVentureName(name);
    const { data: members } = await supabase
      .from("profiles")
      .select("id")
      .eq("venture_id", id);
    setVentureMembers(members || []);
  }

  async function handleSubmit() {
    if (!ventureId || !mentor || !summary.trim()) {
      setError("נא לוודא שנבחר מיזם ושהסיכום אינו ריק");
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
      summary:
        role === "mentor"
          ? "הגיש/ה סיכום פגישה (מנטור)"
          : "הגיש/ה סיכום פגישה",
      metadata: { session_id: session.id, session_date: sessionDate },
    });

    if (role === "candidate") {
      // Notify the venture's mentor
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
    } else if (role === "mentor") {
      // Notify all venture members that the mentor wrote a summary
      for (const member of ventureMembers) {
        if (member.id === userId) continue;
        fetch("/api/notifications/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetUserId: member.id,
            type: "feedback",
            title: "סיכום פגישה מהמנטור",
            body: `${mentor.name} הוסיף/ה סיכום פגישה למיזם`,
            link: `/sessions/${session.id}/feedback`,
          }),
        });
      }
    }

    router.push(`/sessions/${session.id}/feedback`);
    router.refresh();
  }

  if (!ready) {
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

  // Mentor with multiple ventures and no selection yet — show picker
  if (role === "mentor" && !ventureId) {
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
            בחרו את המיזם שעבורו תרצו לכתוב סיכום פגישה.
          </p>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {mentorVentures.map((v) => (
                <button
                  key={v.id}
                  onClick={() => selectVentureForMentor(v.id, v.name)}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 text-right transition-colors hover:border-[#22c55e] hover:bg-[#22c55e]/5 hover:text-[#22c55e]"
                >
                  <Briefcase className="size-4 shrink-0" />
                  <span className="truncate flex-1">{v.name}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
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
          {role === "mentor"
            ? "רשמו את סיכום הפגישה מנקודת מבטכם — חברי המיזם יראו את הסיכום."
            : "רשמו את סיכום הפגישה — המנטור/ית יראה/תראה ויגיש/תגיש משוב."}
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
              {role === "mentor" && mentorVentures.length > 1 ? (
                <select
                  value={ventureId || ""}
                  onChange={(e) => {
                    const next = mentorVentures.find((v) => v.id === e.target.value);
                    if (next) selectVentureForMentor(next.id, next.name);
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent text-sm font-medium text-[#1a2744] bg-gray-50"
                >
                  {mentorVentures.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm font-medium text-[#1a2744] bg-gray-50 rounded-lg px-3 py-2.5">
                  {ventureName || "—"}
                </p>
              )}
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

          {role === "candidate" && (
            mentor ? (
              <p className="text-xs text-gray-500">
                ייפתח משוב עבור{" "}
                <span className="font-medium text-[#1a2744]">{mentor.name}</span>
              </p>
            ) : (
              <p className="text-xs text-amber-600">
                המיזם שלכם אינו משויך למנטור עדיין. פנו לצוות התוכנית.
              </p>
            )
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
          disabled={loading || !summary.trim() || !mentor || !ventureId}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 transition-colors shadow-sm"
        >
          {loading ? "שומר..." : "שלח סיכום"}
          <Send className="size-4" />
        </button>
      </div>
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
