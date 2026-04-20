"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { X, UserCircle, Sparkles, AlertTriangle } from "lucide-react";

const HIDDEN_PATH_PREFIXES = [
  "/login",
  "/auth",
  "/not-registered",
  "/manual",
  "/profile",
  "/checkin",
];

const DISMISS_KEY = "profile-completion-dismissed";

type MissingItem = {
  label: string;
  href: string;
};

export function ProfileCompletionPrompt() {
  const supabase = createClient();
  const pathname = usePathname();
  const [missing, setMissing] = useState<MissingItem[] | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMissing([]);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, avatar_url, phone, bio, linkedin_url, venture_role, expertise")
      .eq("id", user.id)
      .single();

    if (!profile) {
      setMissing([]);
      return;
    }

    // Admins don't get prompted.
    if (profile.role === "admin") {
      setMissing([]);
      return;
    }

    const items: MissingItem[] = [];
    const missingField = (v: unknown) =>
      v == null || (typeof v === "string" && v.trim() === "");

    if (missingField(profile.avatar_url)) items.push({ label: "תמונת פרופיל", href: "/profile" });
    if (missingField(profile.phone)) items.push({ label: "מספר טלפון", href: "/profile" });
    if (missingField(profile.bio)) items.push({ label: "קצת עליך (ביוגרפיה)", href: "/profile" });
    if (missingField(profile.linkedin_url)) items.push({ label: "קישור ל-LinkedIn", href: "/profile" });

    if (profile.role === "candidate") {
      if (missingField(profile.venture_role)) items.push({ label: "התפקיד שלך במיזם", href: "/profile" });
      const { data: checkin } = await supabase
        .from("checkins")
        .select("id")
        .eq("candidate_id", user.id)
        .eq("type", "opening")
        .limit(1)
        .maybeSingle();
      if (!checkin) items.push({ label: "צ׳ק-אין פתיחה", href: "/checkin/opening" });
    }

    if (profile.role === "mentor") {
      if (missingField(profile.expertise)) items.push({ label: "תחום התמחות", href: "/profile" });
    }

    setMissing(items);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load, pathname]);

  const hidden = HIDDEN_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (hidden) return null;
  if (dismissed) return null;
  if (!missing || missing.length === 0) return null;

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-start gap-3 border-b border-gray-100 p-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="size-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-[#1a2744]">הפרופיל שלך עדיין לא מלא</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              כדי להפיק את המרב מהפורטל, נשמח שתשלים/י את הפריטים החסרים.
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

        <div className="p-5 space-y-2">
          <p className="text-xs font-medium text-gray-500 mb-2">פריטים חסרים:</p>
          {missing.map((item) => {
            const isCheckin = item.href.startsWith("/checkin");
            const Icon = isCheckin ? Sparkles : UserCircle;
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                onClick={dismiss}
                className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 transition-colors hover:border-[#22c55e] hover:bg-[#22c55e]/5"
              >
                <Icon className="size-4 shrink-0 text-gray-500" />
                <span className="flex-1 text-sm text-[#1a2744]">{item.label}</span>
                <span className="text-xs text-[#22c55e] font-semibold">השלמה ←</span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 p-4">
          <button
            onClick={dismiss}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
          >
            מאוחר יותר
          </button>
          <Link
            href="/profile"
            onClick={dismiss}
            className="rounded-lg bg-[#1a2744] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a2744]/90 transition-colors"
          >
            לפרופיל שלי
          </Link>
        </div>
      </div>
    </div>
  );
}
