"use client";

import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare, Send, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Feedback {
  content: string;
  role: string;
  submitted_by: string;
  submitted_at: string;
}

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
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);

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

      // Get all feedback for this session
      const { data: allFeedback } = await supabase
        .from("session_feedback")
        .select("*")
        .eq("session_id", id);

      if (allFeedback) {
        const mine = allFeedback.find((f) => f.submitted_by === user.id);
        const other = allFeedback.find((f) => f.submitted_by !== user.id);
        if (mine) {
          setMyFeedback(mine);
          setContent(mine.content);
        }
        if (other) setOtherFeedback(other);
      }
    }
    load();
  }, [id, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: err } = await supabase.from("session_feedback").upsert(
      {
        session_id: id,
        submitted_by: userId,
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

    if (isEditing) {
      setMyFeedback({ content, role: myRole, submitted_by: userId, submitted_at: new Date().toISOString() });
      setIsEditing(false);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
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

  const otherRoleLabel = myRole === "candidate" ? "מנטור/ית" : "יזם/ית";
  const myRoleLabel = myRole === "candidate" ? "יזם/ית" : "מנטור/ית";
  const hasSubmitted = !!myFeedback && !isEditing;

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-8 w-full space-y-6">
      {/* Header */}
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* My feedback */}
      {hasSubmitted ? (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2 text-[#1a2744] text-base">
                <MessageSquare className="size-4" />
                המשוב שלי ({myRoleLabel})
              </CardTitle>
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm text-[#22c55e] hover:underline"
              >
                עריכה
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {myFeedback.content}
            </p>
            <p className="text-xs text-gray-400 mt-3">
              {formatDate(myFeedback.submitted_at)}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#1a2744] text-base">
              <MessageSquare className="size-4" />
              {myFeedback ? "עריכת משוב" : "כתיבת משוב"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent"
                placeholder={
                  myRole === "mentor"
                    ? "מה חשבת על הפגישה? איך היזם/ית מתקדם/ת?"
                    : "מה חשבת על הפגישה? מה למדת?"
                }
              />
              <div className="flex items-center gap-3 justify-end">
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setContent(myFeedback?.content || "");
                    }}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    ביטול
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 transition-colors"
                >
                  {loading ? "שומר..." : "שלח משוב"}
                  <Send className="size-4" />
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Other party's feedback */}
      {otherFeedback ? (
        <Card className="border-0 shadow-sm bg-gray-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#1a2744] text-base">
              <MessageSquare className="size-4" />
              משוב {otherRoleLabel} — {otherPerson}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {otherFeedback.content}
            </p>
            <p className="text-xs text-gray-400 mt-3">
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
