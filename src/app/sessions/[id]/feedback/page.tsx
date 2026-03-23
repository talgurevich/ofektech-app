"use client";

import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";

export default function SessionFeedbackPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [session, setSession] = useState<{
    session_date: string;
    candidate: { full_name: string } | null;
    mentor: { full_name: string } | null;
  } | null>(null);
  const [myRole, setMyRole] = useState<string>("");
  const [content, setContent] = useState("");
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

      const { data: sess } = await supabase
        .from("mentor_sessions")
        .select(
          "*, candidate:profiles!mentor_sessions_candidate_id_fkey(full_name), mentor:profiles!mentor_sessions_mentor_id_fkey(full_name)"
        )
        .eq("id", id)
        .single();
      if (sess) setSession(sess);

      const { data: existing } = await supabase
        .from("session_feedback")
        .select("content")
        .eq("session_id", id)
        .eq("submitted_by", user.id)
        .single();
      if (existing) setContent(existing.content);
    }
    load();
  }, [id, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: err } = await supabase.from("session_feedback").upsert(
      {
        session_id: id,
        submitted_by: user.id,
        role: myRole as "candidate" | "mentor",
        content,
      },
      { onConflict: "session_id,submitted_by" }
    );

    if (err) {
      setError("שגיאה בשמירה");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  if (!session) {
    return (
      <main className="max-w-3xl mx-auto p-4 md:p-8 w-full">
        <p className="text-gray-500">טוען...</p>
      </main>
    );
  }

  const otherPerson =
    myRole === "candidate"
      ? session.mentor?.full_name || "מנטור"
      : session.candidate?.full_name || "מועמד/ת";

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-8 w-full">
      <h1 className="text-2xl font-bold mb-2">משוב על פגישת מנטורינג</h1>
      <p className="text-gray-600 mb-6">
        פגישה עם {otherPerson} — {formatDate(session.session_date)}
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {myRole === "mentor"
              ? "משוב על המועמד/ת"
              : "מה חשבת על הפגישה?"}
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="שתף/י את המחשבות שלך..."
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "שומר..." : "שלח משוב"}
        </button>
      </form>
    </main>
  );
}
