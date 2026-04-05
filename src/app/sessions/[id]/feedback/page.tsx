"use client";

import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare, Send, ArrowRight, ArrowLeft, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface Feedback {
  content: string;
  role: string;
  submitted_by: string;
  submitted_at: string;
  rating_focus: number | null;
  rating_progress: number | null;
  rating_preparedness: number | null;
  rating_initiative: number | null;
  rating_followthrough: number | null;
}

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
  { id: "ratings", title: "דירוג", emoji: "⭐" },
  { id: "content", title: "משוב כתוב", emoji: "✍️" },
];

export default function SessionFeedbackPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [session, setSession] = useState<{
    session_date: string;
    candidate_id: string;
    mentor_id: string;
    candidate: { full_name: string } | null;
    mentor: { full_name: string } | null;
  } | null>(null);
  const [userId, setUserId] = useState("");
  const [myRole, setMyRole] = useState("");
  const [myFeedback, setMyFeedback] = useState<Feedback | null>(null);
  const [otherFeedback, setOtherFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [step, setStep] = useState(0);

  const [formData, setFormData] = useState({
    content: "",
    rating_focus: "",
    rating_progress: "",
    rating_preparedness: "",
    rating_initiative: "",
    rating_followthrough: "",
  });

  function updateField(name: string, value: string) {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

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
      if (profile) setMyRole(profile.role);

      const { data: sess } = await supabase
        .from("mentor_sessions")
        .select(
          "*, candidate:profiles!mentor_sessions_candidate_id_fkey(full_name), mentor:profiles!mentor_sessions_mentor_id_fkey(full_name)"
        )
        .eq("id", id)
        .single();
      if (sess) setSession(sess);

      const { data: allFeedback } = await supabase
        .from("session_feedback")
        .select("*")
        .eq("session_id", id);

      if (allFeedback) {
        const mine = allFeedback.find((f) => f.submitted_by === user.id);
        const other = allFeedback.find((f) => f.submitted_by !== user.id);
        if (mine) {
          setMyFeedback(mine);
          setFormData({
            content: mine.content || "",
            rating_focus: mine.rating_focus ? String(mine.rating_focus) : "",
            rating_progress: mine.rating_progress ? String(mine.rating_progress) : "",
            rating_preparedness: mine.rating_preparedness ? String(mine.rating_preparedness) : "",
            rating_initiative: mine.rating_initiative ? String(mine.rating_initiative) : "",
            rating_followthrough: mine.rating_followthrough ? String(mine.rating_followthrough) : "",
          });
        }
        if (other) setOtherFeedback(other);
      }
    }
    load();
  }, [id, supabase]);

  async function handleSubmit() {
    setLoading(true);
    setError("");

    const payload: Record<string, unknown> = {
      session_id: id,
      submitted_by: userId,
      role: myRole as "candidate" | "mentor",
      content: formData.content,
    };

    // Only include ratings for mentors
    if (myRole === "mentor") {
      payload.rating_focus = Number(formData.rating_focus) || null;
      payload.rating_progress = Number(formData.rating_progress) || null;
      payload.rating_preparedness = Number(formData.rating_preparedness) || null;
      payload.rating_initiative = Number(formData.rating_initiative) || null;
      payload.rating_followthrough = Number(formData.rating_followthrough) || null;
    }

    const { error: err } = await supabase
      .from("session_feedback")
      .upsert(payload, { onConflict: "session_id,submitted_by" });

    if (err) {
      setError("שגיאה בשמירה");
      setLoading(false);
      return;
    }

    // Notify candidate about new feedback
    if (myRole === "mentor" && session) {
      await fetch("/api/notifications/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: session.candidate_id,
          type: "feedback",
          title: "משוב חדש מהמנטור שלך",
          body: `${otherPerson} הגיש/ה משוב על הפגישה`,
          link: `/sessions/${id}/feedback`,
        }),
      });
    }

    router.push("/");
    router.refresh();
  }

  if (!session) {
    return (
      <main className="max-w-xl mx-auto p-4 md:p-8 w-full">
        <p className="text-gray-500">טוען...</p>
      </main>
    );
  }

  const otherPerson =
    myRole === "candidate"
      ? session.mentor?.full_name || "מנטור"
      : session.candidate?.full_name || "מועמד/ת";
  const otherRoleLabel = myRole === "candidate" ? "מנטור/ית" : "יזם/ית";
  const myRoleLabel = myRole === "candidate" ? "יזם/ית" : "מנטור/ית";
  const hasSubmitted = !!myFeedback && !isEditing;
  const isMentor = myRole === "mentor";
  const totalSteps = isMentor ? STEPS.length : 1; // candidates only get the text step
  const isLast = step === totalSteps - 1;

  // View mode — show submitted feedback
  if (hasSubmitted) {
    return (
      <main className="max-w-xl mx-auto p-4 md:p-8 w-full space-y-6">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1a2744] transition-colors mb-3"
          >
            <ArrowRight className="size-4" />
            חזרה לפורטל
          </Link>
          <h1 className="text-2xl font-bold text-[#1a2744]">פגישת מנטורינג</h1>
          <div className="flex items-center gap-2 mt-1">
            <Users className="size-4 text-gray-400" />
            <span className="text-gray-600">
              {otherPerson} — {formatDate(session.session_date)}
            </span>
          </div>
        </div>

        {/* My feedback */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2 text-[#1a2744] text-base">
                <MessageSquare className="size-4" />
                המשוב שלי ({myRoleLabel})
              </CardTitle>
              <button
                onClick={() => { setIsEditing(true); setStep(0); }}
                className="inline-flex items-center gap-1 text-sm text-[#22c55e] hover:underline"
              >
                <Pencil className="size-3.5" />
                עריכה
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Ratings display */}
            {isMentor && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {RATING_QUESTIONS.map((q) => {
                  const val = myFeedback[q.key as keyof Feedback] as number | null;
                  return (
                    <div key={q.key} className="text-center">
                      <p className="text-xs text-gray-500 mb-1">{q.label}</p>
                      <Badge
                        className={`text-sm ${
                          val
                            ? RATING_LABELS[val - 1].bg + " border-0"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {val ? `${val}/5` : "—"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 mb-1">משוב כתוב</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {myFeedback.content}
              </p>
            </div>
            <p className="text-xs text-gray-400">
              {formatDate(myFeedback.submitted_at)}
            </p>
          </CardContent>
        </Card>

        {/* Other party's feedback */}
        {otherFeedback ? (
          <Card className="border-0 shadow-sm bg-gray-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#1a2744] text-base">
                <MessageSquare className="size-4" />
                משוב {otherRoleLabel} — {otherPerson}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {otherFeedback.role === "mentor" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {RATING_QUESTIONS.map((q) => {
                    const val = otherFeedback[q.key as keyof Feedback] as number | null;
                    return (
                      <div key={q.key} className="text-center">
                        <p className="text-xs text-gray-500 mb-1">{q.label}</p>
                        <Badge
                          className={`text-sm ${
                            val
                              ? RATING_LABELS[val - 1].bg + " border-0"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {val ? `${val}/5` : "—"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {otherFeedback.content}
              </p>
              <p className="text-xs text-gray-400">
                {formatDate(otherFeedback.submitted_at)}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-sm bg-gray-50/50">
            <CardContent className="pt-0">
              <p className="text-sm text-gray-400 text-center py-2">
                {otherPerson} טרם הגיש/ה משוב
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    );
  }

  // Edit/create mode — wizard form
  return (
    <main className="max-w-xl mx-auto p-4 md:p-8 w-full">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1a2744] transition-colors mb-3"
        >
          <ArrowRight className="size-4" />
          חזרה לפורטל
        </Link>
        <h1 className="text-2xl font-bold text-[#1a2744]">משוב על פגישת מנטורינג</h1>
        <div className="flex items-center gap-2 mt-1">
          <Users className="size-4 text-gray-400" />
          <span className="text-gray-600">
            {otherPerson} — {formatDate(session.session_date)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {isMentor && (
        <>
          <p className="text-sm text-gray-500 mb-2">
            {STEPS[step].title} — שלב {step + 1} מתוך {totalSteps}
          </p>
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
        </>
      )}

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
          {/* Step 0: Ratings (mentor only) */}
          {step === 0 && isMentor && (
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-0 space-y-6">
                <p className="text-lg font-semibold text-[#1a2744]">
                  דרג/י את היזם/ית
                </p>
                {RATING_QUESTIONS.map((q) => (
                  <div key={q.key}>
                    <label className="block text-sm text-gray-600 mb-3">
                      {q.question}
                    </label>
                    <div className="flex justify-between gap-2">
                      {RATING_LABELS.map((opt) => (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => updateField(q.key, opt.v)}
                          className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                            formData[q.key as keyof typeof formData] === opt.v
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

          {/* Step 1 (mentor) or Step 0 (candidate): Written feedback */}
          {((step === 1 && isMentor) || (step === 0 && !isMentor)) && (
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-0 space-y-5">
                <p className="text-lg font-semibold text-[#1a2744]">
                  {isMentor ? "משוב כתוב" : "מה חשבת על הפגישה?"}
                </p>
                <textarea
                  value={formData.content}
                  onChange={(e) => updateField("content", e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent"
                  placeholder={
                    isMentor
                      ? "שתף/י תובנות על הפגישה, המלצות, נקודות לשיפור..."
                      : "מה למדת? מה היה שימושי? מה היית רוצה לשפר?"
                  }
                />
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => {
            if (step === 0) {
              if (isEditing) {
                setIsEditing(false);
              } else {
                router.push("/");
              }
            } else {
              setStep(step - 1);
            }
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all"
        >
          <ArrowRight className="size-4" />
          {step === 0 ? "ביטול" : "הקודם"}
        </button>

        {isLast ? (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? "שומר..." : "שלח משוב"}
            <Send className="size-4" />
          </button>
        ) : (
          <button
            onClick={() => setStep(step + 1)}
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
