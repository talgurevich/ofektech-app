"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  TaskComment,
  TaskReviewStatus,
  UserRole,
  WorkbookEntry,
} from "@/lib/types";
import {
  REVIEW_STATUS_BADGE,
  REVIEW_STATUS_LABEL,
  getReviewStatus,
} from "@/lib/task-review";
import { formatRelativeHe } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Send,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  entry: WorkbookEntry;
  ventureId: string;
  ventureName?: string;
  open: boolean;
  onClose: () => void;
  userRole?: UserRole;
  onStatusChange?: (next: TaskReviewStatus | null) => void;
}

export function TaskReviewPanel({
  entry,
  ventureId,
  ventureName,
  open,
  onClose,
  userRole,
  onStatusChange,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = userRole === "admin";
  const status = getReviewStatus(entry);
  const taskText =
    typeof entry.data?.task === "string" ? entry.data.task : "";

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("task_comments")
      .select("*, author:author_id(id, full_name, avatar_url, role)")
      .eq("entry_id", entry.id)
      .order("created_at", { ascending: true });
    setComments((data as TaskComment[]) || []);
    setLoading(false);
  }, [supabase, entry.id]);

  useEffect(() => {
    if (open) {
      setError("");
      setDraft("");
      refresh();
    }
  }, [open, refresh]);

  async function handlePost() {
    if (!draft.trim() || posting) return;
    setPosting(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("יש להתחבר מחדש");
      setPosting(false);
      return;
    }
    const { error: insErr } = await supabase.from("task_comments").insert({
      entry_id: entry.id,
      author_id: user.id,
      content: draft.trim(),
    });
    if (insErr) {
      setError("שגיאה בשמירת התגובה");
      setPosting(false);
      return;
    }
    setDraft("");
    setPosting(false);
    await refresh();
  }

  async function setStatus(next: TaskReviewStatus | null) {
    if (updatingStatus) return;
    setUpdatingStatus(true);
    setError("");
    const nextData = { ...(entry.data || {}) } as Record<string, unknown>;
    if (next) {
      nextData.review_status = next;
    } else {
      delete nextData.review_status;
    }
    const { error: upErr } = await supabase
      .from("workbook_entries")
      .update({ data: nextData })
      .eq("id", entry.id);
    if (upErr) {
      setError("שגיאה בעדכון הסטטוס");
      setUpdatingStatus(false);
      return;
    }
    onStatusChange?.(next);
    if (next === "needs_correction") {
      fetch("/api/email-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "task_review_requested",
          ventureId,
          description: taskText.slice(0, 200),
        }),
      });
    }
    setUpdatingStatus(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40"
      onClick={onClose}
    >
      <div
        className="fixed inset-y-0 left-0 flex w-full max-w-lg flex-col bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-400">
              ביקורת משימה{ventureName ? ` · ${ventureName}` : ""}
            </p>
            <h3 className="mt-1 text-base font-semibold text-[#1a2744] line-clamp-3 whitespace-pre-wrap">
              {taskText.trim() || "—"}
            </h3>
            {status && (
              <span
                className={cn(
                  "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]",
                  REVIEW_STATUS_BADGE[status]
                )}
              >
                {status === "needs_correction" ? (
                  <AlertTriangle className="size-3" />
                ) : (
                  <CheckCircle2 className="size-3" />
                )}
                {REVIEW_STATUS_LABEL[status]}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="סגור"
          >
            <X className="size-5" />
          </button>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-5 py-3 bg-gray-50/60">
            <span className="text-xs text-gray-500 ml-1">סטטוס ביקורת:</span>
            <button
              type="button"
              onClick={() => setStatus(status === "needs_correction" ? null : "needs_correction")}
              disabled={updatingStatus}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50",
                status === "needs_correction"
                  ? "bg-amber-500 text-white hover:bg-amber-600"
                  : "bg-white text-amber-700 ring-1 ring-amber-300 hover:bg-amber-50"
              )}
            >
              <AlertTriangle className="size-3" />
              {status === "needs_correction" ? "ביטול בקשת תיקון" : "סמן כדורש תיקון"}
            </button>
            {status === "corrected" && (
              <button
                type="button"
                onClick={() => setStatus(null)}
                disabled={updatingStatus}
                className="inline-flex items-center gap-1 rounded-full bg-[#22c55e] px-3 py-1 text-xs font-medium text-white hover:bg-[#16a34a] disabled:opacity-50"
              >
                <CheckCircle2 className="size-3" />
                סגירת ביקורת
              </button>
            )}
            {updatingStatus && (
              <Loader2 className="size-3 animate-spin text-gray-400" />
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">
              {isAdmin
                ? "אין תגובות עדיין. הוסיפו הערה או בקשת תיקון."
                : "אין תגובות עדיין."}
            </p>
          ) : (
            <ul className="space-y-3">
              {comments.map((c) => {
                const isAdminAuthor = c.author?.role === "admin";
                return (
                  <li
                    key={c.id}
                    className={cn(
                      "rounded-2xl px-3 py-2.5",
                      isAdminAuthor
                        ? "bg-amber-50/70 border border-amber-200/60"
                        : "bg-gray-50 border border-gray-200/60"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-xs font-medium text-[#1a2744]">
                        {c.author?.full_name || "משתמש"}
                        {isAdminAuthor && (
                          <span className="mr-1 inline-block text-[10px] text-amber-700">
                            (אדמין)
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {formatRelativeHe(c.created_at)}
                      </p>
                    </div>
                    <p className="text-sm text-[#1a2744] whitespace-pre-wrap leading-relaxed">
                      {c.content}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-gray-100 px-5 py-3">
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              placeholder="כתבו הערה או תגובה…"
              className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handlePost();
                }
              }}
            />
            <button
              type="button"
              onClick={handlePost}
              disabled={!draft.trim() || posting}
              className="inline-flex items-center gap-1 rounded-lg bg-[#1a2744] px-3 py-2 text-sm font-medium text-white hover:bg-[#1a2744]/90 disabled:opacity-50"
            >
              {posting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              שליחה
            </button>
          </div>
          <p className="mt-1 text-[10px] text-gray-400">
            Ctrl/⌘+Enter לשליחה מהירה
          </p>
        </div>
      </div>
    </div>
  );
}
