"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import type { Profile } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, CalendarDays } from "lucide-react";
import Link from "next/link";

function NewSessionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCandidate = searchParams.get("candidate") || "";
  const supabase = createClient();
  const [assignedCandidates, setAssignedCandidates] = useState<Profile[]>([]);
  const [myRole, setMyRole] = useState<string>("");
  const [mentors, setMentors] = useState<Profile[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile) return;
      setMyRole(profile.role);

      if (profile.role === "mentor") {
        // Only show assigned mentees
        const { data: assignments } = await supabase
          .from("mentor_assignments")
          .select(
            "candidate:profiles!mentor_assignments_candidate_id_fkey(id, email, full_name, role, cohort_id, onboarding_completed, created_at)"
          )
          .eq("mentor_id", user.id);

        if (assignments) {
          const candidates = assignments
            .map((a) => a.candidate as unknown as Profile)
            .filter(Boolean);
          setAssignedCandidates(candidates);
        }
      } else if (profile.role === "candidate") {
        // Candidate picks mentor
        const { data: allMentors } = await supabase
          .from("profiles")
          .select("*")
          .eq("role", "mentor");
        if (allMentors) setMentors(allMentors);
      }
    }
    load();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const candidateId =
      myRole === "candidate" ? user.id : (form.get("candidate_id") as string);
    const mentorId =
      myRole === "mentor" ? user.id : (form.get("mentor_id") as string);

    const { error: err } = await supabase.from("mentor_sessions").insert({
      candidate_id: candidateId,
      mentor_id: mentorId,
      session_date: form.get("session_date"),
      created_by: user.id,
    });

    if (err) {
      setError("שגיאה ביצירת הפגישה");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
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
        <h1 className="text-2xl font-bold text-[#1a2744] flex items-center gap-2">
          <CalendarDays className="size-6" />
          פגישת מנטורינג חדשה
        </h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      <Card className="border-0 shadow-sm">
        <CardContent className="pt-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            {myRole === "candidate" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  מנטור
                </label>
                <select
                  name="mentor_id"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                >
                  <option value="">בחר מנטור</option>
                  {mentors.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name || m.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {myRole === "mentor" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  חניך/ה
                </label>
                <select
                  name="candidate_id"
                  required
                  defaultValue={preselectedCandidate}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                >
                  <option value="">בחר חניך/ה</option>
                  {assignedCandidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name || c.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                תאריך הפגישה
              </label>
              <input
                name="session_date"
                type="date"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                dir="ltr"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#22c55e] text-white rounded-lg px-4 py-3 font-medium hover:bg-[#16a34a] disabled:opacity-50 transition-colors"
            >
              {loading ? "יוצר..." : "צור פגישה"}
            </button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

export default function NewSessionPage() {
  return (
    <Suspense
      fallback={
        <main className="max-w-xl mx-auto p-4 md:p-8 w-full">
          <p className="text-gray-500">טוען...</p>
        </main>
      }
    >
      <NewSessionForm />
    </Suspense>
  );
}
