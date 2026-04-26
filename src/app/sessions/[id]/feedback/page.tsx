"use client";

import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  MessageSquare,
  Send,
  ArrowRight,
  ArrowLeft,
  Pencil,
  FileText,
} from "lucide-react";
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

interface Session {
  session_date: string;
  venture_id: string;
  mentor_id: string;
  meeting_summary: string;
  summary_submitted_at: string | null;
  summary_submitted_by: string | null;
  venture: { name: string } | null;
  mentor: { full_name: string } | null;
  summary_author: { full_name: string } | null;
}

const RATING_QUESTIONS = [
  { key: "rating_focus", label: "מיקוד", question: "האם היזמים מרוכזים ומכוונים למטרה?" },
  { key: "rating_progress", label: "התקדמות", question: "כמה התקדם המיזם מאז הפגישה האחרונה?" },
  { key: "rating_preparedness", label: "מוכנות", question: "האם הצוות הגיע מוכן לפגישה?" },
  { key: "rating_initiative", label: "יוזמה", question: "כמה יוזמה מגלה הצוות?" },
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
  { id: "ratings", title: "דירוג" },
  { id: "content", title: "משוב כתוב" },
];

export default function SessionFeedbackPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [session, setSession] = useState<Session | null>(null);
  const [ventureMembers, setVentureMembers] = useState<{ id: string; full_name: string }[]>([]);
  const [userId, setUserId] = useState("");
  const [myRole, setMyRole] = useState("");
  const [mentorFeedback, setMentorFeedback] = useState<Feedback | null>(null);
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
      if (profile?.role === "visitor") {
        router.replace("/");
        return;
      }
      if (profile) setMyRole(profile.role);

      const { data: sess } = await supabase
        .from("mentor_sessions")
        .select(
          "session_date, venture_id, mentor_id, meeting_summary, summary_submitted_at, summary_submitted_by, venture:ventures(name), mentor:profiles!mentor_sessions_mentor_id_fkey(full_name), summary_author:profiles!mentor_sessions_summary_submitted_by_fkey(full_name)"
        )
        .eq("id", id)
        .single<Session>();
      if (sess) {
        setSession(sess);

        if (sess.venture_id) {
          const { data: members } = await supabase
            .from("profiles")
            .select("id, full_name")
            .eq("venture_id", sess.venture_id);
          if (members) setVentureMembers(members);
        }
      }

      const { data: mentorFb } = await supabase
        .from("session_feedback")
        .select("*")
        .eq("session_id", id)
        .eq("role", "mentor")
        .maybeSingle();

      if (mentorFb) {
        setMentorFeedback(mentorFb as Feedback);
        if (mentorFb.submitted_by === user.id) {
          setFormData({
            content: mentorFb.content || "",
            rating_focus: mentorFb.rating_focus ? String(mentorFb.rating_focus) : "",
            rating_progress: mentorFb.rating_progress ? String(mentorFb.rating_progress) : "",
            rating_preparedness: mentorFb.rating_preparedness ? String(mentorFb.rating_preparedness) : "",
            rating_initiative: mentorFb.rating_initiative ? String(mentorFb.rating_initiative) : "",
            rating_followthrough: mentorFb.rating_followthrough ? String(mentorFb.rating_followthrough) : "",
          });
        }
      }
    }
    load();
  }, [id, supabase, router]);

  async function handleSubmit() {
    setLoading(true);
    setError("");

    const payload: Record<string, unknown> = {
      session_id: id,
      submitted_by: userId,
      role: "mentor",
      content: formData.content,
      rating_focus: Number(formData.rating_focus) || null,
      rating_progress: Number(formData.rating_progress) || null,
      rating_preparedness: Number(formData.rating_preparedness) || null,
      rating_initiative: Number(formData.rating_initiative) || null,
      rating_followthrough: Number(formData.rating_followthrough) || null,
    };

    const { error: err } = await supabase
      .from("session_feedback")
      .upsert(payload, { onConflict: "session_id,submitted_by" });

    if (err) {
      setError("שגיאה בשמירה");
      setLoading(false);
      return;
    }

    if (session) {
      for (const member of ventureMembers) {
        await fetch("/api/notifications/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetUserId: member.id,
            type: "feedback",
            title: "משוב חדש מהמנטור שלך",
            body: `${session.mentor?.full_name || "המנטור"} הגיב/ה לסיכום הפגישה`,
            link: `/sessions/${id}/feedback`,
          }),
        });
      }
    }

    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "mentor_feedback",
        description: "משוב חדש על סיכום פגישה",
      }),
    });

    router.push("/");
    router.refresh();
  }

  if (!session) {
    return (
      <main className="max-w-xl mx-auto p-4 md:p-8 w-full">
        <img
          src="/logo-icon.png"
          alt="טוען..."
          className="size-20 object-contain animate-spin"
          style={{ animationDuration: "2s" }}
        />
      </main>
    );
  }

  const ventureName = session.venture?.name || "מיזם";
  const mentorName = session.mentor?.full_name || "מנטור";
  const summaryAuthor = session.summary_author?.full_name || "המיזם";
  const isMentor = myRole === "mentor" || (myRole === "admin" && session.mentor_id === userId);
  const canMentorRespond = myRole === "mentor" || myRole === "admin";
  const hasMentorFeedback = !!mentorFeedback;
  const showMentorEditor =
    canMentorRespond && (!hasMentorFeedback || isEditing) && (myRole === "mentor" ? true : true);
  const isLast = step === STEPS.length - 1;

  return (
    <main className="max-w-2xl mx-auto p-4 md:p-8 w-full space-y-6">
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
          <Briefcase className="size-4 text-gray-400" />
          <span className="text-gray-600">
            {ventureName} — {formatDate(session.session_date)}
          </span>
        </div>
      </div>

      {/* Meeting summary — always shown at top */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1a2744] text-base">
            <FileText className="size-4" />
            סיכום הפגישה
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {session.meeting_summary ? (
            <>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {session.meeting_summary}
              </p>
              <p className="text-xs text-gray-400">
                נכתב על ידי {summaryAuthor}
                {session.summary_submitted_at &&
                  ` — ${formatDate(session.summary_submitted_at)}`}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400">אין סיכום עדיין</p>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Mentor feedback — viewer or editor */}
      {hasMentorFeedback && !isEditing && mentorFeedback && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2 text-[#1a2744] text-base">
                <MessageSquare className="size-4" />
                משוב המנטור — {mentorName}
              </CardTitle>
              {canMentorRespond && mentorFeedback.submitted_by === userId && (
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setStep(0);
                  }}
                  className="inline-flex items-center gap-1 text-sm text-[#22c55e] hover:underline"
                >
                  <Pencil className="size-3.5" />
                  עריכה
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {RATING_QUESTIONS.map((q) => {
                const val = mentorFeedback[q.key as keyof Feedback] as number | null;
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
                      {val ? `${val}/5` : "---"}
                    </Badge>
                  </div>
                );
              })}
            </div>
            {mentorFeedback.content && (
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {mentorFeedback.content}
              </p>
            )}
            <p className="text-xs text-gray-400">
              {formatDate(mentorFeedback.submitted_at)}
            </p>
          </CardContent>
        </Card>
      )}

      {showMentorEditor && (
        <>
          <p className="text-sm text-gray-500">
            {STEPS[step].title} — שלב {step + 1} מתוך {STEPS.length}
          </p>
          <div className="flex gap-1.5">
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
                  <CardContent className="pt-0 space-y-6">
                    <p className="text-lg font-semibold text-[#1a2744]">
                      דרג/י את המיזם
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

              {step === 1 && (
                <Card className="border-0 shadow-sm">
                  <CardContent className="pt-0 space-y-5">
                    <p className="text-lg font-semibold text-[#1a2744]">
                      משוב כתוב
                    </p>
                    <textarea
                      value={formData.content}
                      onChange={(e) => updateField("content", e.target.value)}
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent"
                      placeholder="התייחסות לסיכום, המלצות, נקודות לשיפור..."
                    />
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                if (step === 0) {
                  if (isEditing) setIsEditing(false);
                  else router.push("/");
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
        </>
      )}

      {!hasMentorFeedback && !canMentorRespond && (
        <Card className="border-0 shadow-sm bg-gray-50/50">
          <CardContent className="pt-0 py-3">
            <p className="text-sm text-gray-400 text-center">
              ממתין למשוב מ{mentorName}
            </p>
          </CardContent>
        </Card>
      )}

      {/* keep isMentor reference for future use without breaking lint */}
      <span className="hidden">{isMentor ? "" : ""}</span>
    </main>
  );
}
