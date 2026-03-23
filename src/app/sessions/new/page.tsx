"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Profile } from "@/lib/types";

export default function NewSessionPage() {
  const router = useRouter();
  const supabase = createClient();
  const [candidates, setCandidates] = useState<Profile[]>([]);
  const [mentors, setMentors] = useState<Profile[]>([]);
  const [myRole, setMyRole] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile) setMyRole(profile.role);

      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("*")
        .in("role", ["candidate", "mentor"]);

      if (allProfiles) {
        setCandidates(allProfiles.filter((p) => p.role === "candidate"));
        setMentors(allProfiles.filter((p) => p.role === "mentor"));
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
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">פגישת מנטורינג חדשה</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {myRole === "candidate" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              מנטור
            </label>
            <select
              name="mentor_id"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              מועמד/ת
            </label>
            <select
              name="candidate_id"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">בחר מועמד/ת</option>
              {candidates.map((c) => (
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            dir="ltr"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "יוצר..." : "צור פגישה"}
        </button>
      </form>
    </main>
  );
}
