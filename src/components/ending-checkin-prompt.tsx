"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { X, ClipboardCheck, ArrowLeft } from "lucide-react";

const HIDDEN_PATH_PREFIXES = [
  "/login",
  "/auth",
  "/not-registered",
  "/manual",
  "/checkin",
];

export const ENDING_DISMISS_KEY = "ending-checkin-dismissed";

/**
 * Returns whether the ending (summary) questionnaire is still pending for the
 * current user: a candidate in the active cohort with no `ending` checkin.
 */
export async function isEndingCheckinPending(
  supabase: ReturnType<typeof createClient>
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, cohort_id, cohort:cohorts(is_active)")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "candidate") return false;
  const cohort = profile.cohort as { is_active: boolean } | { is_active: boolean }[] | null;
  const isActive = Array.isArray(cohort) ? cohort[0]?.is_active : cohort?.is_active;
  if (!isActive) return false;

  const { data: checkin } = await supabase
    .from("checkins")
    .select("id")
    .eq("candidate_id", user.id)
    .eq("type", "ending")
    .limit(1)
    .maybeSingle();

  return !checkin;
}

export function EndingCheckinPrompt() {
  const supabase = createClient();
  const pathname = usePathname();
  const [pending, setPending] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(ENDING_DISMISS_KEY) === "1") setDismissed(true);
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    setPending(await isEndingCheckinPending(supabase));
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load, pathname]);

  const hidden = HIDDEN_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (hidden) return null;
  if (dismissed) return null;
  if (!pending) return null;

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(ENDING_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 md:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-start gap-3 border-b border-gray-100 p-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#22c55e]/15">
            <ClipboardCheck className="size-5 text-[#22c55e]" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-[#1a2744]">שאלון סיכום התוכנית</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              לקראת סיום המחזור, נשמח לשמוע איפה המיזם שלכם עומד היום.
            </p>
          </div>
          <button
            onClick={dismiss}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="סגירה"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm text-gray-600">
            4 שאלות קצרות — מוצר, לקוחות, פיילוט והצעת הערך. לוקח כדקה.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 p-4">
          <button
            onClick={dismiss}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
          >
            מאוחר יותר
          </button>
          <Link
            href="/checkin/ending"
            onClick={dismiss}
            className="inline-flex items-center gap-2 rounded-lg bg-[#22c55e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#16a34a] transition-colors"
          >
            מלא עכשיו <ArrowLeft className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
