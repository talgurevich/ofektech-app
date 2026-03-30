"use client";

import { createClient } from "@/lib/supabase/client";
import { getCurrentWeekStart } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Check, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  { id: "hours", title: "זמן והשקעה", emoji: "⏱️" },
  { id: "mood", title: "מצב רוח", emoji: "🎯" },
  { id: "progress", title: "התקדמות", emoji: "📈" },
  { id: "goals", title: "יעדים", emoji: "🎯" },
  { id: "engagement", title: "מעורבות", emoji: "💬" },
];

export default function CheckinPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (data?.role === "visitor") router.push("/");
    }
    checkRole();
  }, [supabase, router]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const [formData, setFormData] = useState({
    hours_invested: "",
    hours_mentoring: "",
    mood: "",
    progress_feeling: "",
    key_accomplishment: "",
    biggest_blocker: "",
    hit_last_goal: "",
    goal_next_week: "",
    lecture_usefulness: "",
    mentor_usefulness: "",
  });

  function updateField(name: string, value: string) {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function next() {
    if (step < STEPS.length - 1) setStep(step + 1);
  }

  function prev() {
    if (step > 0) setStep(step - 1);
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");

    const weekStart = getCurrentWeekStart();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: err } = await supabase.from("checkins").upsert(
      {
        candidate_id: user.id,
        type: "weekly" as const,
        period_start: weekStart,
        hours_invested: Number(formData.hours_invested) || null,
        hours_mentoring: Number(formData.hours_mentoring) || null,
        mood: Number(formData.mood) || null,
        progress_feeling: formData.progress_feeling || null,
        key_accomplishment: formData.key_accomplishment || null,
        biggest_blocker: formData.biggest_blocker || null,
        hit_last_goal: formData.hit_last_goal || null,
        goal_next_week: formData.goal_next_week || null,
        lecture_usefulness: Number(formData.lecture_usefulness) || null,
        mentor_usefulness: Number(formData.mentor_usefulness) || null,
      },
      { onConflict: "candidate_id,type,period_start" }
    );

    if (err) {
      setError("שגיאה בשמירה. נסה שוב.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  const isLast = step === STEPS.length - 1;

  return (
    <main className="max-w-xl mx-auto p-4 md:p-8 w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1a2744]">צ׳ק-אין שבועי</h1>
        <p className="text-sm text-gray-500 mt-1">
          {STEPS[step].title} — שלב {step + 1} מתוך {STEPS.length}
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1.5 mb-8">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setStep(i)}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              i <= step ? "bg-[#22c55e]" : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {/* Step content */}
      <form ref={formRef} onSubmit={(e) => e.preventDefault()}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
          >
            {step === 0 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-0 space-y-5">
                  <p className="text-lg font-semibold text-[#1a2744]">
                    כמה זמן השקעת השבוע?
                  </p>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      שעות השקעה בפרויקט
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.hours_invested}
                      onChange={(e) => updateField("hours_invested", e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent"
                      dir="ltr"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      שעות מנטורינג
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.hours_mentoring}
                      onChange={(e) => updateField("hours_mentoring", e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent"
                      dir="ltr"
                      placeholder="0"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 1 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-0 space-y-5">
                  <p className="text-lg font-semibold text-[#1a2744]">
                    איך את/ה מרגיש/ה השבוע?
                  </p>
                  <div>
                    <label className="block text-sm text-gray-600 mb-3">
                      מצב רוח וביטחון כללי
                    </label>
                    <div className="flex justify-between gap-2">
                      {[
                        { v: "1", label: "קשה", bg: "bg-red-100 text-red-700 ring-red-300" },
                        { v: "2", label: "לא קל", bg: "bg-orange-100 text-orange-700 ring-orange-300" },
                        { v: "3", label: "סביר", bg: "bg-yellow-100 text-yellow-700 ring-yellow-300" },
                        { v: "4", label: "טוב", bg: "bg-lime-100 text-lime-700 ring-lime-300" },
                        { v: "5", label: "מעולה", bg: "bg-green-100 text-green-700 ring-green-300" },
                      ].map((opt) => (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => updateField("mood", opt.v)}
                          className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                            formData.mood === opt.v
                              ? `${opt.bg} ring-2`
                              : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      ספר/י עוד על ההתקדמות השבוע
                    </label>
                    <textarea
                      value={formData.progress_feeling}
                      onChange={(e) => updateField("progress_feeling", e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent"
                      placeholder="איך הרגשת לגבי ההתקדמות?"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-0 space-y-5">
                  <p className="text-lg font-semibold text-[#1a2744]">
                    מה קרה השבוע?
                  </p>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      הישג מרכזי
                    </label>
                    <textarea
                      value={formData.key_accomplishment}
                      onChange={(e) => updateField("key_accomplishment", e.target.value)}
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent"
                      placeholder="מה ההישג הכי משמעותי שלך השבוע?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      חסם או אתגר עיקרי
                    </label>
                    <textarea
                      value={formData.biggest_blocker}
                      onChange={(e) => updateField("biggest_blocker", e.target.value)}
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent"
                      placeholder="מה עצר אותך או היה קשה?"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-0 space-y-5">
                  <p className="text-lg font-semibold text-[#1a2744]">
                    יעדים
                  </p>
                  <div>
                    <label className="block text-sm text-gray-600 mb-3">
                      האם השגת את היעד מהשבוע שעבר?
                    </label>
                    <div className="flex gap-3">
                      {[
                        { value: "yes", label: "כן", bg: "bg-green-100 text-green-700 ring-green-300" },
                        { value: "partially", label: "חלקית", bg: "bg-yellow-100 text-yellow-700 ring-yellow-300" },
                        { value: "no", label: "לא", bg: "bg-red-100 text-red-700 ring-red-300" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => updateField("hit_last_goal", opt.value)}
                          className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                            formData.hit_last_goal === opt.value
                              ? `${opt.bg} ring-2`
                              : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      מה היעד לשבוע הבא?
                    </label>
                    <textarea
                      value={formData.goal_next_week}
                      onChange={(e) => updateField("goal_next_week", e.target.value)}
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent"
                      placeholder="מה תרצה/י להשיג עד השבוע הבא?"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 4 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-0 space-y-5">
                  <p className="text-lg font-semibold text-[#1a2744]">
                    כמה שימושיים היו המפגשים?
                  </p>
                  <div>
                    <label className="block text-sm text-gray-600 mb-3">
                      שימושיות ההרצאה השבוע
                    </label>
                    <div className="flex justify-between gap-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => updateField("lecture_usefulness", String(n))}
                          className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                            formData.lecture_usefulness === String(n)
                              ? "bg-[#22c55e]/15 text-[#22c55e] ring-2 ring-[#22c55e]/30"
                              : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-1">
                      <span>לא שימושית</span>
                      <span>מאוד שימושית</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-3">
                      שימושיות פגישות המנטורינג
                    </label>
                    <div className="flex justify-between gap-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => updateField("mentor_usefulness", String(n))}
                          className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                            formData.mentor_usefulness === String(n)
                              ? "bg-[#22c55e]/15 text-[#22c55e] ring-2 ring-[#22c55e]/30"
                              : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-1">
                      <span>לא שימושי</span>
                      <span>מאוד שימושי</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </form>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={prev}
          disabled={step === 0}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            step === 0
              ? "text-gray-300 cursor-not-allowed"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <ArrowRight className="size-4" />
          הקודם
        </button>

        {isLast ? (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? "שומר..." : "שלח צ׳ק-אין"}
            <Send className="size-4" />
          </button>
        ) : (
          <button
            onClick={next}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#1a2744] hover:bg-[#1a2744]/90 transition-colors shadow-sm"
          >
            הבא
            <ArrowLeft className="size-4" />
          </button>
        )}
      </div>
    </main>
  );
}
