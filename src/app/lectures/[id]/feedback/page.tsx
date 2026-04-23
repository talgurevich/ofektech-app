"use client";

import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Lecture } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { logActivity } from "@/lib/activity";

export default function LectureFeedbackPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("lectures")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!data) {
        setNotFound(true);
        return;
      }
      setLecture(data);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: existing } = await supabase
          .from("lecture_feedback")
          .select("content")
          .eq("lecture_id", id)
          .eq("candidate_id", user.id)
          .single();
        if (existing) setContent(existing.content);
      }
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

    const { error: err } = await supabase.from("lecture_feedback").upsert(
      {
        lecture_id: id,
        candidate_id: user.id,
        content,
      },
      { onConflict: "lecture_id,candidate_id" }
    );

    if (err) {
      setError("שגיאה בשמירה");
      fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "error", description: "שגיאה בשמירת משוב הרצאה" }) });
      setLoading(false);
      return;
    }

    fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "lecture_feedback", description: "משוב הרצאה הוגש" }) });

    // Email admin
    fetch("/api/email-notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "candidate_feedback" }) });

    // Log to the venture's activity feed (only if the candidate belongs to one)
    const { data: profile } = await supabase
      .from("profiles")
      .select("venture_id")
      .eq("id", user.id)
      .single();
    if (profile?.venture_id) {
      logActivity(supabase, {
        ventureId: profile.venture_id,
        kind: "lecture_feedback",
        summary: lecture?.title
          ? `הגיש משוב על ההרצאה "${lecture.title}"`
          : "הגיש משוב על הרצאה",
        metadata: {
          lecture_id: id,
          lecture_title: lecture?.title,
          lecture_number: lecture?.lecture_number,
        },
      });
    }

    router.push("/");
    router.refresh();
  }

  if (notFound) {
    return (
      <main className="max-w-3xl mx-auto p-4 md:p-8 w-full text-center">
        <h1 className="text-xl font-bold text-[#1a2744] mb-2">ההרצאה לא נמצאה</h1>
        <p className="text-sm text-gray-500 mb-4">
          ייתכן שההרצאה שייכת למחזור אחר או שהיא הוסרה.
        </p>
        <a href="/lectures" className="text-[#22c55e] hover:underline text-sm">
          חזרה לסילבוס
        </a>
      </main>
    );
  }

  if (!lecture) {
    return (
      <main className="max-w-3xl mx-auto p-4 md:p-8 w-full">
        <img src="/logo-icon.png" alt="טוען..." className="size-20 object-contain animate-spin" style={{ animationDuration: "2s" }} />
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-8 w-full">
      <h1 className="text-2xl font-bold mb-2">משוב על הרצאה</h1>
      <p className="text-gray-600 mb-6">
        {lecture.title} — {formatDate(lecture.scheduled_date)}
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            מה חשבת על ההרצאה?
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
