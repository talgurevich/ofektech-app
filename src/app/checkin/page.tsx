"use client";

import { createClient } from "@/lib/supabase/client";
import { getCurrentWeekStart } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CheckinPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const weekStart = getCurrentWeekStart();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: err } = await supabase.from("weekly_checkins").upsert(
      {
        candidate_id: user.id,
        week_start: weekStart,
        hours_invested: Number(form.get("hours_invested")) || null,
        hours_mentoring: Number(form.get("hours_mentoring")) || null,
        mood: Number(form.get("mood")) || null,
        progress_feeling: form.get("progress_feeling") || null,
        key_accomplishment: form.get("key_accomplishment") || null,
        biggest_blocker: form.get("biggest_blocker") || null,
        hit_last_goal: form.get("hit_last_goal") || null,
        goal_next_week: form.get("goal_next_week") || null,
        lecture_usefulness: Number(form.get("lecture_usefulness")) || null,
        mentor_usefulness: Number(form.get("mentor_usefulness")) || null,
      },
      { onConflict: "candidate_id,week_start" }
    );

    if (err) {
      setError("שגיאה בשמירה. נסה שוב.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">צ׳ק-אין שבועי</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Hours */}
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <h2 className="font-semibold">זמן והשקעה</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              שעות השקעה בפרויקט השבוע
            </label>
            <input
              name="hours_invested"
              type="number"
              step="0.5"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              שעות מנטורינג השבוע
            </label>
            <input
              name="hours_mentoring"
              type="number"
              step="0.5"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              dir="ltr"
            />
          </div>
        </div>

        {/* Sentiment */}
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <h2 className="font-semibold">מצב רוח והתקדמות</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              מצב רוח וביטחון כללי (1-5)
            </label>
            <div className="flex gap-3" dir="ltr">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="flex flex-col items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="mood"
                    value={n}
                    className="w-5 h-5 text-blue-600"
                  />
                  <span className="text-xs text-gray-500">{n}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              איך את/ה מרגיש/ה לגבי ההתקדמות השבוע?
            </label>
            <textarea
              name="progress_feeling"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <h2 className="font-semibold">התקדמות ויעדים</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              הישג מרכזי השבוע
            </label>
            <textarea
              name="key_accomplishment"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              חסם או אתגר עיקרי כרגע
            </label>
            <textarea
              name="biggest_blocker"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              האם השגת את היעד מהשבוע שעבר?
            </label>
            <div className="flex gap-4">
              {[
                { value: "yes", label: "כן" },
                { value: "partially", label: "חלקית" },
                { value: "no", label: "לא" },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="hit_last_goal"
                    value={opt.value}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              יעד לשבוע הבא
            </label>
            <textarea
              name="goal_next_week"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Engagement */}
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <h2 className="font-semibold">מעורבות</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              כמה שימושית הייתה ההרצאה השבוע? (1-5)
            </label>
            <div className="flex gap-3" dir="ltr">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="flex flex-col items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="lecture_usefulness"
                    value={n}
                    className="w-5 h-5 text-blue-600"
                  />
                  <span className="text-xs text-gray-500">{n}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              כמה שימושיות היו פגישות המנטורינג? (1-5)
            </label>
            <div className="flex gap-3" dir="ltr">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="flex flex-col items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="mentor_usefulness"
                    value={n}
                    className="w-5 h-5 text-blue-600"
                  />
                  <span className="text-xs text-gray-500">{n}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "שומר..." : "שלח צ׳ק-אין"}
        </button>
      </form>
    </main>
  );
}
