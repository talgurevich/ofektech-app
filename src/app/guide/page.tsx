"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Check, ChevronDown, Save, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { GuideChapter, VentureChapterEntry } from "@/lib/types";
import { logActivity } from "@/lib/activity";

export default function GuidePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <GuidePageInner />
    </Suspense>
  );
}

function LoadingState() {
  return (
    <main className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#22c55e] border-t-transparent" />
      </div>
    </main>
  );
}

function GuidePageInner() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const ventureParam = searchParams.get("venture");
  const [chapters, setChapters] = useState<GuideChapter[]>([]);
  const [entries, setEntries] = useState<Record<string, VentureChapterEntry>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [ventureId, setVentureId] = useState<string | null>(null);
  const [ventureName, setVentureName] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [noVenture, setNoVenture] = useState(false);
  const [notAuthorized, setNotAuthorized] = useState(false);
  // Per-chapter local draft text. Persists only when the user clicks the V
  // button (or hits Cmd/Ctrl+Enter); not on keystroke or blur.
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, venture_id")
        .eq("id", user.id)
        .single();

      // Visitors don't get the guide.
      if (profile?.role === "visitor") {
        router.replace("/");
        return;
      }

      let targetVentureId: string | null = null;
      let isReadOnly = false;

      if (profile?.role === "mentor") {
        if (!ventureParam) {
          setNotAuthorized(true);
          setLoading(false);
          return;
        }
        const { data: assignment } = await supabase
          .from("mentor_assignments")
          .select("id")
          .eq("mentor_id", user.id)
          .eq("venture_id", ventureParam)
          .maybeSingle();
        if (!assignment) {
          setNotAuthorized(true);
          setLoading(false);
          return;
        }
        targetVentureId = ventureParam;
        isReadOnly = true;
      } else if (profile?.role === "admin" && ventureParam) {
        targetVentureId = ventureParam;
      } else {
        targetVentureId = profile?.venture_id || null;
      }

      if (!targetVentureId) {
        setNoVenture(true);
        setLoading(false);
        return;
      }

      setVentureId(targetVentureId);
      setReadOnly(isReadOnly);

      const [{ data: chaptersData }, { data: entriesData }, { data: ventureData }] =
        await Promise.all([
          supabase
            .from("guide_chapters")
            .select("*")
            .order("chapter_number", { ascending: true }),
          supabase
            .from("venture_chapter_entries")
            .select("*")
            .eq("venture_id", targetVentureId),
          supabase
            .from("ventures")
            .select("name")
            .eq("id", targetVentureId)
            .maybeSingle(),
        ]);

      setChapters(chaptersData || []);
      setVentureName(ventureData?.name || null);

      const entriesMap: Record<string, VentureChapterEntry> = {};
      const draftsMap: Record<string, string> = {};
      (entriesData || []).forEach((e: VentureChapterEntry) => {
        entriesMap[e.chapter_id] = e;
        draftsMap[e.chapter_id] = e.content || "";
      });
      setEntries(entriesMap);
      setDrafts(draftsMap);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ventureParam]);

  const filledCount = chapters.filter(
    (ch) => entries[ch.id] && entries[ch.id].content.trim().length > 0
  ).length;

  const saveEntry = useCallback(
    async (chapterId: string, content: string) => {
      if (!ventureId) return;
      setSaving((prev) => ({ ...prev, [chapterId]: true }));

      const { data, error } = await supabase
        .from("venture_chapter_entries")
        .upsert(
          {
            venture_id: ventureId,
            chapter_id: chapterId,
            content,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "venture_id,chapter_id" }
        )
        .select()
        .single();

      setSaving((prev) => ({ ...prev, [chapterId]: false }));

      if (!error && data) {
        const chapterTitle = chapters.find((c) => c.id === chapterId)?.title || "";

        // Fire-and-forget event tracking for chapter save
        fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "guide", description: `פרק "${chapterTitle}" עודכן` }) });

        logActivity(supabase, {
          ventureId,
          kind: "guide_updated",
          summary: chapterTitle
            ? `עדכן את הפרק "${chapterTitle}" במדריך`
            : "עדכן פרק במדריך",
          metadata: { chapter_id: chapterId, chapter_title: chapterTitle },
        });

        setEntries((prev) => {
          const updated = { ...prev, [chapterId]: data };

          // Check if all chapters are now filled
          const filledNow = chapters.filter(
            (ch) => updated[ch.id] && updated[ch.id].content.trim().length > 0
          ).length;

          if (filledNow === chapters.length && chapters.length > 0) {
            // All chapters completed — notify admins and venture members
            fetch("/api/notifications/broadcast", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                roles: ["admin"],
                type: "guide",
                title: "מיזם השלים את חוברת המיזם!",
                body: "",
                link: "/admin/candidates",
              }),
            });

            // Fire-and-forget event tracking for guide completion
            fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "guide_complete", description: "כל 13 פרקי המדריך הושלמו!" }) });

            // Notify all venture members
            if (ventureId) {
              supabase
                .from("profiles")
                .select("id")
                .eq("venture_id", ventureId)
                .then(({ data: members }) => {
                  if (members) {
                    members.forEach((member) => {
                      fetch("/api/notifications/create", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          targetUserId: member.id,
                          type: "guide",
                          title: "המדריך הושלם!",
                          body: "כל פרקי החוברת הושלמו",
                          link: "/guide",
                        }),
                      });
                    });
                  }
                });

              // Notify assigned mentor
              supabase
                .from("mentor_assignments")
                .select("mentor_id")
                .eq("venture_id", ventureId)
                .then(({ data: mentorAssignments }) => {
                  if (mentorAssignments) {
                    mentorAssignments.forEach((ma) => {
                      fetch("/api/notifications/create", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          targetUserId: ma.mentor_id,
                          type: "guide",
                          title: "מיזם השלים את חוברת המיזם!",
                          body: "",
                          link: "/",
                        }),
                      });
                    });
                  }
                });
            }
          }

          return updated;
        });
        setSaved((prev) => ({ ...prev, [chapterId]: true }));
        setTimeout(() => {
          setSaved((prev) => ({ ...prev, [chapterId]: false }));
        }, 2000);
      }
    },
    [ventureId, supabase, chapters]
  );

  const handleDraftChange = useCallback(
    (chapterId: string, content: string) => {
      setDrafts((prev) => ({ ...prev, [chapterId]: content }));
    },
    []
  );

  const handleSaveClick = useCallback(
    (chapterId: string) => {
      saveEntry(chapterId, drafts[chapterId] ?? "");
    },
    [drafts, saveEntry]
  );

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#22c55e] border-t-transparent" />
        </div>
      </main>
    );
  }

  if (noVenture) {
    return (
      <main className="max-w-4xl mx-auto p-4 md:p-8">
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <AlertCircle className="size-10 mx-auto text-amber-400 mb-3" />
            <p className="text-lg font-semibold text-[#1a2744] mb-2">
              אינך משויך/ת למיזם
            </p>
            <p className="text-sm text-gray-500">
              פנה לצוות OfekTech כדי להצטרף למיזם
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (notAuthorized) {
    return (
      <main className="max-w-4xl mx-auto p-4 md:p-8">
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <AlertCircle className="size-10 mx-auto text-amber-400 mb-3" />
            <p className="text-lg font-semibold text-[#1a2744] mb-2">
              יש לבחור מיזם
            </p>
            <p className="text-sm text-gray-500">
              גשו לפורטל המנטורים ובחרו מיזם כדי לצפות במדריך שלו
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const progressPercent =
    chapters.length > 0 ? (filledCount / chapters.length) * 100 : 0;

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="space-y-6"
      >
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#1a2744] flex items-center gap-2">
            <BookOpen className="size-6" />
            חוברת מיזם
          </h1>
          {readOnly ? (
            <>
              <p className="text-sm text-gray-500 mt-1">
                {ventureName ? `חוברת המיזם — ${ventureName}` : "חוברת המיזם"}
              </p>
              <Badge className="mt-2 bg-[#1a2744]/10 text-[#1a2744] border-0 text-xs">
                תצוגה בלבד
              </Badge>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500 mt-1">
                מדריך משותף למיזם -- כתבו את תוכן המיזם שלכם בכל פרק
              </p>
              <Badge className="mt-2 bg-[#1a2744]/10 text-[#1a2744] border-0 text-xs">
                כל חברי המיזם רואים ועורכים את אותו התוכן
              </Badge>
            </>
          )}
        </div>

        {/* Progress bar */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[#1a2744]">
                התקדמות
              </span>
              <span className="text-sm text-gray-500">
                {filledCount} מתוך {chapters.length} פרקים הושלמו
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-[#22c55e]"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Chapters accordion */}
        <div className="space-y-3">
          {chapters.map((chapter) => {
            const entry = entries[chapter.id];
            const isFilled = entry && entry.content.trim().length > 0;
            const isExpanded = expandedId === chapter.id;

            return (
              <Card
                key={chapter.id}
                className="border-0 shadow-sm overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : chapter.id)
                  }
                  className="w-full flex items-center gap-3 p-4 text-right hover:bg-gray-50/50 transition-colors"
                >
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                      isFilled
                        ? "bg-[#22c55e] text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {chapter.chapter_number}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#1a2744]">
                      {chapter.title}
                    </p>
                  </div>

                  {isFilled && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#22c55e]/10 px-2.5 py-0.5 text-xs font-medium text-[#22c55e]">
                      <Check className="size-3" />
                      הושלם
                    </span>
                  )}

                  <ChevronDown
                    className={`size-5 text-gray-400 shrink-0 transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-4">
                        <div className="rounded-lg bg-gray-50 p-4">
                          <p className="text-sm text-gray-600 italic leading-relaxed">
                            {chapter.content}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-[#1a2744]">
                              התוכן של המיזם
                            </label>
                            <div className="flex items-center gap-2 h-5">
                              {saving[chapter.id] && (
                                <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                                  <Save className="size-3 animate-pulse" />
                                  שומר...
                                </span>
                              )}
                              {saved[chapter.id] && !saving[chapter.id] && (
                                <motion.span
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="inline-flex items-center gap-1 text-xs text-[#22c55e]"
                                >
                                  <Check className="size-3" />
                                  נשמר
                                </motion.span>
                              )}
                            </div>
                          </div>
                          {readOnly ? (
                            <div className="min-h-[60px] rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-[#1a2744] whitespace-pre-wrap leading-relaxed">
                              {entry?.content?.trim() ? (
                                entry.content
                              ) : (
                                <span className="text-gray-400 italic">
                                  טרם מולא על ידי המיזם
                                </span>
                              )}
                            </div>
                          ) : (() => {
                            const draftValue = drafts[chapter.id] ?? entry?.content ?? "";
                            const savedValue = entry?.content ?? "";
                            const dirty = draftValue !== savedValue;
                            return (
                              <div className="space-y-2">
                                <textarea
                                  className="w-full min-h-[140px] rounded-lg border border-gray-200 bg-white p-3 text-sm text-[#1a2744] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/30 focus:border-[#22c55e] transition-colors resize-y"
                                  placeholder="כתבו כאן את התוכן של המיזם עבור פרק זה..."
                                  value={draftValue}
                                  onChange={(e) =>
                                    handleDraftChange(chapter.id, e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (
                                      (e.metaKey || e.ctrlKey) &&
                                      e.key === "Enter" &&
                                      dirty
                                    ) {
                                      e.preventDefault();
                                      handleSaveClick(chapter.id);
                                    }
                                  }}
                                />
                                <div className="flex items-center justify-end gap-2">
                                  {dirty && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDraftChange(chapter.id, savedValue)
                                      }
                                      className="text-xs text-gray-500 hover:text-[#1a2744] transition-colors"
                                    >
                                      בטל שינויים
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleSaveClick(chapter.id)}
                                    disabled={!dirty || !!saving[chapter.id]}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#22c55e] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {saving[chapter.id] ? (
                                      <>
                                        <span className="size-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                        שומר...
                                      </>
                                    ) : (
                                      <>
                                        <Check className="size-3.5" />
                                        שמור פרק
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })}
        </div>

        {chapters.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <BookOpen className="size-10 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400 text-sm">
                פרקי המדריך עדיין לא נוספו למערכת
              </p>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </main>
  );
}
