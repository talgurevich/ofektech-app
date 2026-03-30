"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Check, ChevronDown, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { GuideChapter, CandidateChapterEntry } from "@/lib/types";

export default function GuidePage() {
  const supabase = createClient();
  const [chapters, setChapters] = useState<GuideChapter[]>([]);
  const [entries, setEntries] = useState<Record<string, CandidateChapterEntry>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [{ data: chaptersData }, { data: entriesData }] = await Promise.all([
        supabase
          .from("guide_chapters")
          .select("*")
          .order("chapter_number", { ascending: true }),
        supabase
          .from("candidate_chapter_entries")
          .select("*")
          .eq("candidate_id", user.id),
      ]);

      setChapters(chaptersData || []);

      const entriesMap: Record<string, CandidateChapterEntry> = {};
      (entriesData || []).forEach((e: CandidateChapterEntry) => {
        entriesMap[e.chapter_id] = e;
      });
      setEntries(entriesMap);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filledCount = chapters.filter(
    (ch) => entries[ch.id] && entries[ch.id].content.trim().length > 0
  ).length;

  const saveEntry = useCallback(
    async (chapterId: string, content: string) => {
      if (!userId) return;
      setSaving((prev) => ({ ...prev, [chapterId]: true }));

      const { data, error } = await supabase
        .from("candidate_chapter_entries")
        .upsert(
          {
            candidate_id: userId,
            chapter_id: chapterId,
            content,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "candidate_id,chapter_id" }
        )
        .select()
        .single();

      setSaving((prev) => ({ ...prev, [chapterId]: false }));

      if (!error && data) {
        setEntries((prev) => ({ ...prev, [chapterId]: data }));
        setSaved((prev) => ({ ...prev, [chapterId]: true }));
        setTimeout(() => {
          setSaved((prev) => ({ ...prev, [chapterId]: false }));
        }, 2000);
      }
    },
    [userId, supabase]
  );

  const handleChange = useCallback(
    (chapterId: string, content: string) => {
      // Optimistic update for entries map
      setEntries((prev) => ({
        ...prev,
        [chapterId]: {
          ...(prev[chapterId] || {
            id: "",
            candidate_id: userId || "",
            chapter_id: chapterId,
            updated_at: new Date().toISOString(),
          }),
          content,
        },
      }));

      // Debounce save
      if (debounceTimers.current[chapterId]) {
        clearTimeout(debounceTimers.current[chapterId]);
      }
      debounceTimers.current[chapterId] = setTimeout(() => {
        saveEntry(chapterId, content);
      }, 1000);
    },
    [userId, saveEntry]
  );

  const handleBlur = useCallback(
    (chapterId: string, content: string) => {
      // Clear any pending debounce and save immediately on blur
      if (debounceTimers.current[chapterId]) {
        clearTimeout(debounceTimers.current[chapterId]);
      }
      saveEntry(chapterId, content);
    },
    [saveEntry]
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
            מדריך התוכנית
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            מדריך לבניית מצגת משקיעים — כתבו את תוכן המיזם שלכם בכל פרק
          </p>
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
                {/* Collapsed header */}
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : chapter.id)
                  }
                  className="w-full flex items-center gap-3 p-4 text-right hover:bg-gray-50/50 transition-colors"
                >
                  {/* Chapter number badge */}
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

                {/* Expanded content */}
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
                        {/* Guide content */}
                        <div className="rounded-lg bg-gray-50 p-4">
                          <p className="text-sm text-gray-600 italic leading-relaxed">
                            {chapter.content}
                          </p>
                        </div>

                        {/* Candidate textarea */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-[#1a2744]">
                              התוכן שלך
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
                          <textarea
                            className="w-full min-h-[140px] rounded-lg border border-gray-200 bg-white p-3 text-sm text-[#1a2744] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/30 focus:border-[#22c55e] transition-colors resize-y"
                            placeholder="כתבו כאן את התוכן שלכם עבור פרק זה..."
                            value={entry?.content || ""}
                            onChange={(e) =>
                              handleChange(chapter.id, e.target.value)
                            }
                            onBlur={(e) =>
                              handleBlur(chapter.id, e.target.value)
                            }
                          />
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
