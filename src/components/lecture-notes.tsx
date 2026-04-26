"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Check } from "lucide-react";

interface Props {
  lectureId: string;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function LectureNotes({ lectureId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      const { data } = await supabase
        .from("lecture_notes")
        .select("content")
        .eq("user_id", user.id)
        .eq("lecture_id", lectureId)
        .maybeSingle();
      if (cancelled) return;
      const initial = (data?.content as string) || "";
      setContent(initial);
      lastSavedRef.current = initial;
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, lectureId]);

  function scheduleSave(next: string) {
    if (!userId) return;
    if (next === lastSavedRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveState("saving");
    debounceRef.current = setTimeout(async () => {
      const { error } = await supabase.from("lecture_notes").upsert(
        {
          user_id: userId,
          lecture_id: lectureId,
          content: next,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,lecture_id" }
      );
      if (error) {
        setSaveState("error");
      } else {
        lastSavedRef.current = next;
        setSaveState("saved");
        setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 1200);
      }
    }, 800);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-3">
        <Loader2 className="size-4 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!userId) return null;

  return (
    <div className="space-y-1">
      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          scheduleSave(e.target.value);
        }}
        rows={5}
        placeholder="ההערות הפרטיות שלך מההרצאה..."
        className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition-colors focus:border-[#22c55e]"
      />
      <div className="flex items-center justify-end gap-1 h-4 text-xs">
        {saveState === "saving" && (
          <>
            <Loader2 className="size-3 animate-spin text-gray-400" />
            <span className="text-gray-400">שומר...</span>
          </>
        )}
        {saveState === "saved" && (
          <>
            <Check className="size-3 text-[#22c55e]" />
            <span className="text-[#22c55e]">נשמר</span>
          </>
        )}
        {saveState === "error" && (
          <span className="text-red-500">שגיאה בשמירה</span>
        )}
      </div>
    </div>
  );
}
