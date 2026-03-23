"use client";

import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Lecture } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function LectureFeedbackPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("lectures")
        .select("*")
        .eq("id", id)
        .single();
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
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  if (!lecture) {
    return (
      <main className="max-w-2xl mx-auto p-6">
        <p className="text-gray-500">טוען...</p>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto p-6">
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
