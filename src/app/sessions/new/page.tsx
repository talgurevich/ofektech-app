"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import type { Venture } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, Send, CalendarDays, Briefcase } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const RATING_QUESTIONS = [
  { key: "rating_focus", label: "מיקוד", question: "האם היזם/ית מרוכז/ת ומכוון/ת למטרה?" },
  { key: "rating_progress", label: "התקדמות", question: "כמה התקדם/ה היזם/ית מאז הפגישה האחרונה?" },
  { key: "rating_preparedness", label: "מוכנות", question: "האם היזם/ית הגיע/ה מוכן/ה לפגישה?" },
  { key: "rating_initiative", label: "יוזמה", question: "כמה יוזמה מגלה היזם/ית?" },
  { key: "rating_followthrough", label: "יישום", question: "כמה מהמשימות מהפגישה הקודמת יושמו?" },
];

const RATING_LABELS = [
  { v: "1", label: "נמוך", bg: "bg-red-100 text-red-700 ring-red-300" },
  { v: "2", label: "מתחת", bg: "bg-orange-100 text-orange-700 ring-orange-300" },
  { v: "3", label: "סביר", bg: "bg-yellow-100 text-yellow-700 ring-yellow-300" },
  { v: "4", label: "טוב", bg: "bg-lime-100 text-lime-700 ring-lime-300" },
  { v: "5", label: "מצוין", bg: "bg-green-100 text-green-700 ring-green-300" },
];

const STEPS = [
  { id: "details", title: "פרטי הפגישה" },
  { id: "ratings", title: "דירוג" },
  { id: "content", title: "משוב כתוב" },
];

function NewSessionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedVenture = searchParams.get("venture") || "";
  const supabase = createClient();
  const [assignedVentures, setAssignedVentures] = useState<Venture[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);

  // Form data
  const [ventureId, setVentureId] = useState(preselectedVenture);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [ratings, setRatings] = useState<Record<string, string>>({});
  const [content, setContent] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: assignments } = await supabase
        .from("mentor_assignments")
        .select("venture:ventures(id, name, description)")
        .eq("mentor_id", user.id);

      if (assignments) {
        const ventures = assignments
          .map((a) => a.venture as unknown as Venture)
          .filter(Boolean);
        setAssignedVentures(ventures);
      }
    }
    load();
  }, [supabase]);

  async function handleSubmit() {
    if (!ventureId || !sessionDate) return;
    setLoading(true);
    setError("");

    // Create session
    const { data: session, error: sessionErr } = await supabase
      .from("mentor_sessions")
      .insert({
        venture_id: ventureId,
        mentor_id: userId,
        session_date: sessionDate,
        created_by: userId,
      })
      .select("id")
      .single();

    if (sessionErr || !session) {
      setError("שגיאה ביצירת הפגישה");
      fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "error", description: "שגיאה ביצירת פגישת מנטורינג" }) });
      setLoading(false);
      return;
    }

    // Create feedback
    const feedbackPayload: Record<string, unknown> = {
      session_id: session.id,
      submitted_by: userId,
      role: "mentor",
      content: content || "",
    };
    for (const q of RATING_QUESTIONS) {
      if (ratings[q.key]) {
        feedbackPayload[q.key] = Number(ratings[q.key]);
      }
    }

    await supabase.from("session_feedback").insert(feedbackPayload);

    // Track event
    fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "mentor_feedback", description: "משוב חדש על פגישת מנטורינג" }) });

    // Notify venture members
    const { data: members } = await supabase
      .from("profiles")
      .select("id")
      .eq("venture_id", ventureId);

    if (members) {
      for (const member of members) {
        fetch("/api/notifications/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetUserId: member.id,
            type: "feedback",
            title: "משוב חדש מהמנטור שלך",
            body: "המנטור הגיש משוב על הפגישה",
            link: `/sessions/${session.id}/feedback`,
          }),
        });
      }
    }

    router.push("/");
    router.refresh();
  }

  const isLast = step === STEPS.length - 1;

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
        <h1 className="text-2xl font-bold text-[#1a2744]">משוב פגישת מנטורינג</h1>
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

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
        >
          {/* Step 0: Session details */}
          {step === 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-0 space-y-5">
                <p className="text-lg font-semibold text-[#1a2744]">פרטי הפגישה</p>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    <Briefcase className="size-4 inline ml-1" />
                    מיזם
                  </label>
                  <select
                    value={ventureId}
                    onChange={(e) => setVentureId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent"
                  >
                    <option value="">בחר מיזם</option>
                    {assignedVentures.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent"
                    dir="ltr"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 1: Ratings */}
          {step === 1 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-0 space-y-6">
                <p className="text-lg font-semibold text-[#1a2744]">דרג/י את היזם/ית</p>
                {RATING_QUESTIONS.map((q) => (
                  <div key={q.key}>
                    <label className="block text-sm text-gray-600 mb-3">{q.question}</label>
                    <div className="flex justify-between gap-2">
                      {RATING_LABELS.map((opt) => (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => setRatings({ ...ratings, [q.key]: opt.v })}
                          className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                            ratings[q.key] === opt.v
                              ? `${opt.bg} ring-2`
                              : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Written feedback */}
          {step === 2 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-0 space-y-5">
                <p className="text-lg font-semibold text-[#1a2744]">משוב כתוב</p>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent"
                  placeholder="שתף/י תובנות על הפגישה, המלצות, נקודות לשיפור..."
                />
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => step > 0 ? setStep(step - 1) : router.push("/")}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all"
        >
          <ArrowRight className="size-4" />
          {step === 0 ? "ביטול" : "הקודם"}
        </button>

        {isLast ? (
          <button
            onClick={handleSubmit}
            disabled={loading || !ventureId || !sessionDate}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? "שומר..." : "שלח משוב"}
            <Send className="size-4" />
          </button>
        ) : (
          <button
            onClick={() => setStep(step + 1)}
            disabled={step === 0 && (!ventureId || !sessionDate)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#1a2744] hover:bg-[#1a2744]/90 disabled:opacity-50 transition-colors shadow-sm"
          >
            הבא
            <ArrowLeft className="size-4" />
          </button>
        )}
      </div>
    </main>
  );
}

export default function NewSessionPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[60vh] items-center justify-center">
          <img src="/logo-icon.png" alt="טוען..." className="size-20 object-contain animate-spin" style={{ animationDuration: "2s" }} />
        </main>
      }
    >
      <NewSessionForm />
    </Suspense>
  );
}
