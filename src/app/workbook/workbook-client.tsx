"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { WORKBOOK_SHEETS, type WorkbookColumn, type WorkbookSheet } from "@/lib/workbook";
import type { WorkbookEntry, GuideChapter, UserRole, TaskReviewStatus } from "@/lib/types";
import { logActivity } from "@/lib/activity";
import { Plus, Trash2, Loader2, ExternalLink, Maximize2, X, Check, Paperclip, BookOpen, ChevronDown, MessageSquare, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskFilesModal } from "@/components/task-files-modal";
import { TaskReviewPanel } from "@/components/task-review-panel";
import { getReviewStatus, REVIEW_STATUS_ROW_TINT } from "@/lib/task-review";

interface Props {
  ventureId: string;
  ventureName: string;
  initialSheetKey?: string;
  initialOpenEntryId?: string | null;
  members?: { id: string; name: string }[];
  currentUserName?: string;
  userRole?: UserRole;
}

function taskWasPushed(entry: WorkbookEntry): boolean {
  const p = entry.data?.pushedChapters;
  return Array.isArray(p) && p.length > 0;
}

function lastSeenKey(ventureId: string, sheetKey: string) {
  return `workbook_last_seen:${ventureId}:${sheetKey}`;
}

function readLastSeen(ventureId: string, sheetKey: string): number {
  if (typeof window === "undefined") return 0;
  const v = window.localStorage.getItem(lastSeenKey(ventureId, sheetKey));
  return v ? Number(v) || 0 : 0;
}

function writeLastSeen(ventureId: string, sheetKey: string, ts: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(lastSeenKey(ventureId, sheetKey), String(ts));
}

export function WorkbookClient({
  ventureId,
  ventureName,
  initialSheetKey,
  initialOpenEntryId = null,
  members = [],
  currentUserName = "",
  userRole,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  // Mentors are read-only on guide chapters (RLS), so they can't push answers.
  const canPushToChapter = userRole !== "mentor";
  const [activeSheetKey, setActiveSheetKey] = useState<string>(
    initialSheetKey && WORKBOOK_SHEETS.some((s) => s.key === initialSheetKey)
      ? initialSheetKey
      : WORKBOOK_SHEETS[0].key
  );
  const [entries, setEntries] = useState<WorkbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const updateLogTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [lastSeen, setLastSeen] = useState<number>(0);
  const [guideChapters, setGuideChapters] = useState<GuideChapter[]>([]);
  const [pushEntry, setPushEntry] = useState<WorkbookEntry | null>(null);
  const [reviewEntry, setReviewEntry] = useState<WorkbookEntry | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});

  const activeSheet = useMemo<WorkbookSheet>(
    () => WORKBOOK_SHEETS.find((s) => s.key === activeSheetKey)!,
    [activeSheetKey]
  );

  // Per-column suggestion lists for creatable dropdowns: built-in options
  // unioned with every distinct non-empty value saved in this venture's rows.
  const columnSuggestions = useMemo<Record<string, string[]>>(() => {
    const result: Record<string, string[]> = {};
    for (const col of activeSheet.columns) {
      if (col.type !== "select_creatable") continue;
      const values = new Set<string>(col.options ?? []);
      for (const e of entries) {
        const v = e.data[col.key];
        if (typeof v === "string" && v.trim()) values.add(v.trim());
      }
      result[col.key] = Array.from(values);
    }
    return result;
  }, [activeSheet, entries]);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("workbook_entries")
      .select("*")
      .eq("venture_id", ventureId)
      .eq("sheet_key", activeSheetKey)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    setEntries((data as WorkbookEntry[]) || []);
    setLoading(false);
  }, [supabase, ventureId, activeSheetKey]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Fetch comment counts for the tasks sheet so we can show a badge on each row.
  const loadCommentCounts = useCallback(async () => {
    if (activeSheetKey !== "tasks" || entries.length === 0) {
      setCommentCounts({});
      return;
    }
    const ids = entries.map((e) => e.id);
    const { data } = await supabase
      .from("task_comments")
      .select("entry_id")
      .in("entry_id", ids);
    const counts: Record<string, number> = {};
    for (const row of (data || []) as { entry_id: string }[]) {
      counts[row.entry_id] = (counts[row.entry_id] || 0) + 1;
    }
    setCommentCounts(counts);
  }, [supabase, activeSheetKey, entries]);

  useEffect(() => {
    loadCommentCounts();
  }, [loadCommentCounts]);

  // Honor the ?openTask=<id> deep-link from the admin review queue exactly once
  // per mount, after entries for the tasks sheet have arrived.
  const deepLinkConsumed = useRef(false);
  useEffect(() => {
    if (deepLinkConsumed.current) return;
    if (!initialOpenEntryId || activeSheetKey !== "tasks") return;
    if (loading) return;
    const target = entries.find((e) => e.id === initialOpenEntryId);
    if (target) {
      setReviewEntry(target);
      deepLinkConsumed.current = true;
    }
  }, [initialOpenEntryId, activeSheetKey, loading, entries]);

  // Snapshot the user's "last seen" timestamp for this sheet at mount,
  // then promote it to "now" after a short read delay so the dot stays
  // visible long enough to notice.
  useEffect(() => {
    setLastSeen(readLastSeen(ventureId, activeSheetKey));
    const timer = setTimeout(() => {
      writeLastSeen(ventureId, activeSheetKey, Date.now());
    }, 4000);
    return () => clearTimeout(timer);
  }, [ventureId, activeSheetKey]);

  // Guide chapters power the "push answer to workbook" picker. Loaded once;
  // they aren't cohort-scoped and every authenticated user may read them.
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("guide_chapters")
        .select("*")
        .order("chapter_number", { ascending: true });
      setGuideChapters((data as GuideChapter[]) || []);
    })();
  }, [supabase]);

  async function addRow() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const maxPos = entries.reduce((m, e) => Math.max(m, e.position), -1);
    const initialData: Record<string, unknown> =
      activeSheetKey === "tasks"
        ? {
            date: new Date().toISOString().slice(0, 10),
            creator: currentUserName,
          }
        : {};
    const nowStamp = new Date().toLocaleString("he-IL", {
      dateStyle: "short",
      timeStyle: "short",
    });
    if (activeSheet.columns.some((c) => c.key === "created_at")) {
      initialData.created_at = nowStamp;
    }
    if (activeSheet.columns.some((c) => c.key === "updated_at")) {
      initialData.updated_at = nowStamp;
    }
    if (activeSheet.columns.some((c) => c.key === "updated_by")) {
      initialData.updated_by = currentUserName;
    }
    const { data, error } = await supabase
      .from("workbook_entries")
      .insert({
        venture_id: ventureId,
        sheet_key: activeSheetKey,
        data: initialData,
        position: maxPos + 1,
        created_by: user.id,
      })
      .select()
      .single();
    if (error) return;
    setEntries((prev) => [...prev, data as WorkbookEntry]);
    logActivity(supabase, {
      ventureId,
      kind: "workbook_added",
      summary: `הוסיף שורה ב"${activeSheet.label}"`,
      metadata: { sheet_key: activeSheetKey, row_id: (data as WorkbookEntry).id },
    });
  }

  async function deleteRow(id: string) {
    if (!confirm("למחוק את השורה הזו?")) return;
    const removed = entries.find((e) => e.id === id);

    // Capture per-venture (non-bulk) file paths BEFORE delete; the cascade
    // will remove the file rows. Admin-broadcast files (bulk_task_id set)
    // share storage_path across many ventures' rows that RLS hides from
    // this client — leave their cleanup to the admin bulk-delete route.
    const { data: fileRows } = await supabase
      .from("workbook_task_files")
      .select("storage_path")
      .eq("entry_id", id)
      .is("bulk_task_id", null);
    const orphanPaths = (fileRows || []).map((r) => r.storage_path as string);

    setEntries((prev) => prev.filter((e) => e.id !== id));
    await supabase.from("workbook_entries").delete().eq("id", id);

    if (orphanPaths.length > 0) {
      await supabase.storage.from("workbook-task-files").remove(orphanPaths);
    }

    logActivity(supabase, {
      ventureId,
      kind: "workbook_deleted",
      summary: `מחק שורה מ"${activeSheet.label}"`,
      metadata: {
        sheet_key: activeSheetKey,
        row_label: rowLabel(removed?.data, activeSheet),
      },
    });
  }

  async function updateCells(id: string, changes: Record<string, unknown>) {
    if (Object.keys(changes).length === 0) return;
    const before = entries.find((e) => e.id === id);
    const nextData: Record<string, unknown> = {
      ...(before?.data || {}),
      ...changes,
    };
    if (activeSheet.columns.some((c) => c.key === "updated_at")) {
      nextData.updated_at = new Date().toLocaleString("he-IL", {
        dateStyle: "short",
        timeStyle: "short",
      });
    }
    if (activeSheet.columns.some((c) => c.key === "updated_by")) {
      nextData.updated_by = currentUserName;
    }

    // Auto-flip the review status to "corrected" when a non-admin edits a task
    // that the admin flagged for correction. Admins editing the row don't
    // change the status — they use the explicit toggle in the review panel.
    let flippedToCorrected = false;
    const editsNonStatusKey = Object.keys(changes).some(
      (k) => k !== "review_status"
    );
    if (
      activeSheetKey === "tasks" &&
      userRole !== "admin" &&
      before?.data?.review_status === "needs_correction" &&
      editsNonStatusKey
    ) {
      nextData.review_status = "corrected";
      flippedToCorrected = true;
    }
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, data: nextData } : e))
    );
    setSavingIds((s) => new Set(s).add(id));
    await supabase
      .from("workbook_entries")
      .update({ data: nextData, updated_at: new Date().toISOString() })
      .eq("id", id);
    setSavingIds((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });

    const isNonEmpty = (v: unknown): boolean =>
      typeof v === "string" && v.trim() !== "";

    // Email admins the first time a task description goes from empty to
    // non-empty — that's the moment the row actually becomes a task. Server
    // route filters out admin actors so admin-side edits don't self-notify.
    if (activeSheetKey === "tasks" && "task" in changes) {
      const prevValue = before?.data?.task;
      const value = changes.task;
      if (!isNonEmpty(prevValue) && isNonEmpty(value)) {
        fetch("/api/email-notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "workbook_task_created",
            ventureId,
            description: String(value).trim(),
          }),
        }).catch(() => {});
      }
    }

    if (flippedToCorrected) {
      fetch("/api/email-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "task_review_corrected",
          ventureId,
          description:
            typeof nextData.task === "string"
              ? (nextData.task as string).slice(0, 200)
              : "",
        }),
      }).catch(() => {});
    }

    let loggedDoneFlip = false;
    if (activeSheetKey === "tasks" && "done" in changes) {
      const prevValue = before?.data?.done;
      const value = changes.done;
      if (prevValue !== value) {
        if (value === true) {
          const taskText =
            typeof nextData?.task === "string" ? nextData.task.trim() : "";
          fetch("/api/email-notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "workbook_task_completed",
              ventureId,
              description: taskText,
            }),
          }).catch(() => {});
        }
        logActivity(supabase, {
          ventureId,
          kind: value ? "workbook_task_done" : "workbook_task_reopened",
          summary: value
            ? `סימן משימה כבוצעה`
            : `החזיר משימה למצב פתוח`,
          metadata: {
            sheet_key: activeSheetKey,
            row_id: id,
            row_label: rowLabel(nextData, activeSheet),
          },
        });
        loggedDoneFlip = true;
      }
    }
    if (loggedDoneFlip) return;

    const existing = updateLogTimers.current[id];
    if (existing) clearTimeout(existing);
    updateLogTimers.current[id] = setTimeout(() => {
      delete updateLogTimers.current[id];
      logActivity(supabase, {
        ventureId,
        kind: "workbook_updated",
        summary: `עדכן שורה ב"${activeSheet.label}"`,
        metadata: {
          sheet_key: activeSheetKey,
          row_id: id,
          row_label: rowLabel(nextData, activeSheet),
        },
      });
    }, 5000);
  }

  async function updateCell(id: string, key: string, value: unknown) {
    return updateCells(id, { [key]: value });
  }

  // Save the answer (if edited) then open the chapter-picker dialog. The
  // answer must be persisted first — the push API reads it from the DB.
  async function handlePushAnswer(entry: WorkbookEntry, draftAnswer: string) {
    const current =
      typeof entry.data.answer === "string" ? entry.data.answer : "";
    if (draftAnswer !== current) {
      await updateCell(entry.id, "answer", draftAnswer);
    }
    setPushEntry({ ...entry, data: { ...entry.data, answer: draftAnswer } });
  }

  return (
    <div className="mx-auto max-w-[1400px] p-4 md:p-6">
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1a2744]">טבלת עבודה</h1>
        {ventureName && (
          <p className="text-sm text-gray-500 mt-1">{ventureName}</p>
        )}
      </div>

      {/* Sheet tabs */}
      <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {WORKBOOK_SHEETS.map((s) => {
          const Icon = s.icon;
          const active = s.key === activeSheetKey;
          return (
            <button
              key={s.key}
              onClick={() => setActiveSheetKey(s.key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              )}
            >
              <Icon className="size-4" />
              <span>{s.label}</span>
              {s.tbd && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                  TBD
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Description */}
      {activeSheet.description && (
        <p className="mb-3 text-sm text-gray-500">{activeSheet.description}</p>
      )}

      {activeSheet.tbd ? (
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
            TBD
          </span>
          <p className="mt-3 text-base font-semibold text-[#1a2744]">
            הסעיף הזה סגור כרגע
          </p>
          <p className="mt-1 text-sm text-gray-600">
            התוכן עבור &quot;{activeSheet.label}&quot; יתווסף בהמשך.
          </p>
        </div>
      ) : (
      <>
      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[700px] text-sm" dir="rtl">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-right">
              {activeSheet.columns.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2.5 text-xs font-semibold text-gray-600"
                  style={{ width: col.width }}
                >
                  {col.label}
                </th>
              ))}
              <th className="w-12 px-2 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={activeSheet.columns.length + 1} className="p-8 text-center text-gray-400">
                  <Loader2 className="mx-auto size-5 animate-spin" />
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={activeSheet.columns.length + 1} className="p-8 text-center text-sm text-gray-400">
                  אין עדיין רשומות. הוסיפו שורה ראשונה למטה.
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const createdAt = entry.created_at
                  ? new Date(entry.created_at).getTime()
                  : 0;
                const isUnseen = lastSeen > 0 && createdAt > lastSeen;
                const isAdminBroadcast = !!entry.bulk_task_id;
                const reviewStatus =
                  activeSheetKey === "tasks" ? getReviewStatus(entry) : null;
                const commentCount =
                  activeSheetKey === "tasks"
                    ? commentCounts[entry.id] || 0
                    : 0;
                return (
                  <WorkbookRow
                    key={entry.id}
                    entry={entry}
                    columns={activeSheet.columns}
                    activeSheetKey={activeSheetKey}
                    ventureId={ventureId}
                    members={members}
                    columnSuggestions={columnSuggestions}
                    canPushToChapter={canPushToChapter}
                    isAdminBroadcast={isAdminBroadcast}
                    isUnseen={isUnseen}
                    reviewStatus={reviewStatus}
                    commentCount={commentCount}
                    saving={savingIds.has(entry.id)}
                    onUpdateCell={updateCell}
                    onUpdateCells={updateCells}
                    onPushAnswer={handlePushAnswer}
                    onDelete={deleteRow}
                    onReview={setReviewEntry}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add row */}
      <button
        onClick={addRow}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-[#22c55e] hover:text-[#22c55e]"
      >
        <Plus className="size-4" />
        הוסף שורה
      </button>
      </>
      )}

      {pushEntry && (
        <PushToChapterDialog
          entry={pushEntry}
          chapters={guideChapters}
          onClose={() => setPushEntry(null)}
          onPushed={(pushedChapters) => {
            setEntries((prev) =>
              prev.map((e) =>
                e.id === pushEntry.id
                  ? { ...e, data: { ...e.data, pushedChapters } }
                  : e
              )
            );
            setPushEntry(null);
          }}
        />
      )}

      {reviewEntry && (
        <TaskReviewPanel
          entry={reviewEntry}
          ventureId={ventureId}
          ventureName={ventureName}
          open={!!reviewEntry}
          onClose={() => {
            setReviewEntry(null);
            loadCommentCounts();
          }}
          userRole={userRole}
          onStatusChange={(next) => {
            setEntries((prev) =>
              prev.map((e) => {
                if (e.id !== reviewEntry.id) return e;
                const nextData: Record<string, unknown> = { ...e.data };
                if (next) nextData.review_status = next;
                else delete nextData.review_status;
                return { ...e, data: nextData };
              })
            );
            setReviewEntry((cur) => {
              if (!cur) return cur;
              const nextData: Record<string, unknown> = { ...cur.data };
              if (next) nextData.review_status = next;
              else delete nextData.review_status;
              return { ...cur, data: nextData };
            });
          }}
        />
      )}
    </div>
  );
}

function WorkbookRow({
  entry,
  columns,
  activeSheetKey,
  ventureId,
  members,
  columnSuggestions,
  canPushToChapter,
  isAdminBroadcast,
  isUnseen,
  reviewStatus,
  commentCount,
  saving,
  onUpdateCell,
  onUpdateCells,
  onPushAnswer,
  onDelete,
  onReview,
}: {
  entry: WorkbookEntry;
  columns: WorkbookColumn[];
  activeSheetKey: string;
  ventureId: string;
  members: { id: string; name: string }[];
  columnSuggestions: Record<string, string[]>;
  canPushToChapter: boolean;
  isAdminBroadcast: boolean;
  isUnseen: boolean;
  reviewStatus: TaskReviewStatus | null;
  commentCount: number;
  saving: boolean;
  onUpdateCell: (id: string, key: string, value: unknown) => void;
  onUpdateCells: (id: string, changes: Record<string, unknown>) => void;
  onPushAnswer: (entry: WorkbookEntry, draft: string) => void;
  onDelete: (id: string) => void;
  onReview: (entry: WorkbookEntry) => void;
}) {
  // Track staged (unsaved) cell values keyed by column. Cells report via
  // `reportDirty`; clicking the row-level V flushes them in one batched save.
  const draftsRef = useRef<Map<string, unknown>>(new Map());
  const [dirtyCount, setDirtyCount] = useState(0);

  const reportDirty = useCallback(
    (colKey: string, isDirty: boolean, value: unknown) => {
      if (isDirty) {
        draftsRef.current.set(colKey, value);
      } else {
        draftsRef.current.delete(colKey);
      }
      setDirtyCount(draftsRef.current.size);
    },
    []
  );

  const commitRow = useCallback(() => {
    if (draftsRef.current.size === 0) return;
    const changes: Record<string, unknown> = {};
    for (const [k, v] of draftsRef.current) changes[k] = v;
    draftsRef.current.clear();
    setDirtyCount(0);
    onUpdateCells(entry.id, changes);
  }, [entry.id, onUpdateCells]);

  return (
    <tr
      title={isAdminBroadcast ? "משימה מההנהלה" : undefined}
      className={cn(
        "border-b border-gray-100 hover:bg-gray-50/50",
        isAdminBroadcast && "bg-green-50/60 hover:bg-green-50/80",
        isUnseen && !isAdminBroadcast && "bg-red-50/30",
        reviewStatus && REVIEW_STATUS_ROW_TINT[reviewStatus]
      )}
    >
      {columns.map((col, idx) => (
        <td key={col.key} className="align-top p-1.5">
          <div className="relative">
            {idx === 0 && isUnseen && (
              <span
                className="absolute -right-1 top-1 size-2 rounded-full bg-red-500 ring-2 ring-white"
                title="חדש — טרם נצפה"
              />
            )}
            {col.type === "files" ? (
              <FilesCell entryId={entry.id} ventureId={ventureId} />
            ) : (
              <CellEditor
                column={col}
                value={entry.data[col.key]}
                onChange={(v) => onUpdateCell(entry.id, col.key, v)}
                onDirtyState={reportDirty}
                suggestions={columnSuggestions[col.key]}
                members={members}
                onPush={
                  activeSheetKey === "tasks" &&
                  col.key === "answer" &&
                  canPushToChapter
                    ? (draft) => onPushAnswer(entry, draft)
                    : undefined
                }
                pushed={col.key === "answer" && taskWasPushed(entry)}
                contextLabel={
                  activeSheetKey === "tasks" && col.key === "answer"
                    ? "המשימה"
                    : undefined
                }
                contextValue={
                  activeSheetKey === "tasks" && col.key === "answer"
                    ? (entry.data["task"] as string | undefined)
                    : undefined
                }
              />
            )}
          </div>
        </td>
      ))}
      <td className="p-1.5 text-center">
        <div className="flex items-center justify-center gap-1">
          {saving && (
            <Loader2 className="size-3 animate-spin text-gray-400" />
          )}
          {dirtyCount > 0 && (
            <button
              type="button"
              onClick={commitRow}
              title="שמור שינויים בשורה"
              className="rounded-md bg-[#22c55e] p-1.5 text-white transition-colors hover:bg-[#16a34a]"
            >
              <Check className="size-4" />
            </button>
          )}
          {activeSheetKey === "tasks" && (
            <button
              onClick={() => onReview(entry)}
              className={cn(
                "relative rounded p-1.5 transition-colors",
                reviewStatus === "needs_correction"
                  ? "text-amber-600 hover:bg-amber-50"
                  : reviewStatus === "corrected"
                  ? "text-sky-600 hover:bg-sky-50"
                  : "text-gray-400 hover:bg-gray-100 hover:text-[#1a2744]"
              )}
              title="ביקורת ותגובות"
            >
              {reviewStatus === "needs_correction" ? (
                <AlertTriangle className="size-4" />
              ) : reviewStatus === "corrected" ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <MessageSquare className="size-4" />
              )}
              {commentCount > 0 && (
                <span className="absolute -top-1 -left-1 min-w-[14px] h-[14px] px-1 rounded-full bg-[#1a2744] text-white text-[9px] leading-[14px] text-center font-medium">
                  {commentCount}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => onDelete(entry.id)}
            className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
            title="מחק שורה"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function PushToChapterDialog({
  entry,
  chapters,
  onClose,
  onPushed,
}: {
  entry: WorkbookEntry;
  chapters: GuideChapter[];
  onClose: () => void;
  onPushed: (pushedChapters: unknown[]) => void;
}) {
  const answer =
    typeof entry.data?.answer === "string" ? entry.data.answer : "";
  const taskText =
    typeof entry.data?.task === "string" ? entry.data.task : "";
  const suggestedId =
    typeof entry.data?.suggestedChapterId === "string"
      ? entry.data.suggestedChapterId
      : "";
  const pushedIds = Array.isArray(entry.data?.pushedChapters)
    ? (entry.data.pushedChapters as { chapterId?: string }[])
        .map((p) => p?.chapterId)
        .filter((v): v is string => typeof v === "string")
    : [];

  const [chapterId, setChapterId] = useState<string>(
    suggestedId && chapters.some((c) => c.id === suggestedId)
      ? suggestedId
      : chapters[0]?.id || ""
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const alreadyHere = pushedIds.includes(chapterId);

  async function submit() {
    if (!chapterId || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/workbook/push-to-chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.id, chapterId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error || `שגיאה ${res.status}`);
        setBusy(false);
        return;
      }
      // Fire-and-forget event tracking, mirroring the guide page.
      fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "guide",
          description: `פרק "${body.chapterTitle}" עודכן מתוך משימה`,
        }),
      }).catch(() => {});
      onPushed(Array.isArray(body.pushedChapters) ? body.pushedChapters : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאת רשת");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-[#1a2744]">
            <BookOpen className="size-5 text-[#22c55e]" />
            הוספה לחוברת העבודה
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="סגור"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {chapters.length === 0 ? (
            <p className="rounded-lg bg-gray-50 px-3 py-3 text-sm text-gray-500">
              אין עדיין פרקים בחוברת העבודה.
            </p>
          ) : (
            <>
              <p className="text-xs text-gray-500">
                הטקסט יועתק לפרק שתבחרו ויתווסף בסופו. עריכת המשימה בהמשך לא
                תעדכן את הפרק.
              </p>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  פרק יעד
                </label>
                <select
                  value={chapterId}
                  onChange={(e) => setChapterId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#22c55e]"
                >
                  {chapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.chapter_number}. {c.title}
                      {pushedIds.includes(c.id) ? " ✓" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  התשובה שתתווסף
                </label>
                {taskText.trim() && (
                  <p className="mb-1 text-xs text-gray-400">
                    משימה: {taskText.trim()}
                  </p>
                )}
                <div className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  {answer.trim() || "—"}
                </div>
              </div>

              {alreadyHere && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  התשובה כבר נוספה לפרק זה בעבר. הוספה חוזרת תוסיף עותק נוסף.
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !chapterId || chapters.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-[#22c55e] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#16a34a] disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <BookOpen className="size-4" />
            )}
            {busy ? "מוסיף..." : "הוסף לפרק"}
          </button>
        </div>
      </div>
    </div>
  );
}

function rowLabel(
  data: Record<string, unknown> | undefined,
  sheet: WorkbookSheet
): string {
  if (!data) return "";
  for (const col of sheet.columns) {
    if (col.type === "boolean" || col.type === "date" || col.type === "number") continue;
    const v = data[col.key];
    if (typeof v === "string" && v.trim()) return v.trim().slice(0, 80);
  }
  return "";
}

function CellEditor({
  column,
  value,
  onChange,
  onDirtyState,
  suggestions,
  members = [],
  onPush,
  pushed,
  contextLabel,
  contextValue,
}: {
  column: WorkbookColumn;
  value: unknown;
  onChange: (v: unknown) => void;
  // Reported by editors with a deferred-save flow (text-style inputs) so the
  // row can render a single V button covering every dirty cell.
  onDirtyState?: (colKey: string, isDirty: boolean, value: unknown) => void;
  suggestions?: string[];
  members?: { id: string; name: string }[];
  onPush?: (draft: string) => void | Promise<void>;
  pushed?: boolean;
  contextLabel?: string;
  contextValue?: string;
}) {
  const base =
    "w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-gray-800 outline-none transition-colors focus:border-[#22c55e] focus:bg-white hover:bg-white";

  const strVal = value == null ? "" : String(value);

  // Read-only columns (e.g. the auto-filled task creator) show static text.
  if (column.readOnly) {
    return (
      <div className="truncate px-2 py-1.5 text-sm text-gray-500" title={strVal}>
        {strVal || "—"}
      </div>
    );
  }

  if (column.type === "files") {
    // Files are stored in their own table, not in entry.data.
    // The cell is rendered separately via FilesCell, which knows the entry id.
    return null;
  }

  if (column.type === "boolean") {
    return (
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="size-4 accent-[#22c55e] cursor-pointer"
        />
      </div>
    );
  }

  if (column.type === "select") {
    return (
      <select
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
        className={cn(base, "cursor-pointer")}
      >
        <option value="">—</option>
        {column.options?.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  if (column.type === "member") {
    const names = members.map((m) => m.name).filter(Boolean);
    const knownValue = names.includes(strVal) ? strVal : "";
    return (
      <select
        value={knownValue}
        onChange={(e) => onChange(e.target.value)}
        className={cn(base, "cursor-pointer")}
      >
        <option value="">—</option>
        {names.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
        {strVal && !knownValue && (
          <option value={strVal}>{strVal} (לא חבר/ת מיזם)</option>
        )}
      </select>
    );
  }

  if (column.type === "date") {
    return (
      <input
        type="date"
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
        className={cn(base, "min-w-[130px]")}
        dir="ltr"
      />
    );
  }

  if (column.type === "longtext") {
    return (
      <LongTextCell
        column={column}
        value={strVal}
        onChange={onChange}
        onPush={onPush}
        pushed={pushed}
        contextLabel={contextLabel}
        contextValue={contextValue}
      />
    );
  }

  // text-style inputs (text/email/phone/url/number/select_creatable):
  // dirty state bubbles up to the row, which renders a single V button.
  // Enter still commits this cell on its own; Escape reverts.
  return (
    <EditableInput
      column={column}
      value={strVal}
      onChange={onChange}
      onDirtyState={onDirtyState}
      suggestions={suggestions}
    />
  );
}

function EditableInput({
  column,
  value,
  onChange,
  onDirtyState,
  suggestions,
}: {
  column: WorkbookColumn;
  value: string;
  onChange: (v: unknown) => void;
  onDirtyState?: (colKey: string, isDirty: boolean, value: unknown) => void;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState(value);

  // Sync external value back into the input if it changes from outside
  // (e.g. row reload), but only when the user isn't mid-edit.
  useEffect(() => {
    setDraft(value);
  }, [value]);

  const dirty = draft !== value;
  const stagedValue =
    column.type === "number" ? (draft === "" ? null : Number(draft)) : draft;

  // Bubble the staged value to the row so the row-level V button can flush
  // every dirty cell at once. Clean up on unmount in case the row is deleted
  // while we still have unsaved changes.
  const colKey = column.key;
  useEffect(() => {
    onDirtyState?.(colKey, dirty, stagedValue);
  }, [colKey, dirty, stagedValue, onDirtyState]);
  useEffect(() => {
    return () => {
      onDirtyState?.(colKey, false, undefined);
    };
  }, [colKey, onDirtyState]);

  const inputType =
    column.type === "email"
      ? "email"
      : column.type === "phone"
        ? "tel"
        : column.type === "url"
          ? "url"
          : column.type === "number"
            ? "number"
            : "text";
  const ltr =
    column.type === "email" || column.type === "phone" || column.type === "url";

  function commit() {
    if (!dirty) return;
    onChange(stagedValue);
  }

  function revert() {
    setDraft(value);
  }

  const listId =
    column.type === "select_creatable" ? `wb-opts-${column.key}` : undefined;
  const opts =
    column.type === "select_creatable" ? (suggestions ?? column.options ?? []) : [];

  const baseInput =
    "w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-gray-800 outline-none transition-colors focus:border-[#22c55e] focus:bg-white hover:bg-white";

  return (
    <div className="flex items-center gap-1">
      <input
        type={inputType}
        list={listId}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            revert();
          }
        }}
        className={baseInput}
        dir={ltr ? "ltr" : undefined}
        placeholder={
          column.placeholder ??
          (column.type === "select_creatable" ? "בחר או הקלד..." : undefined)
        }
      />
      {listId && (
        <datalist id={listId}>
          {opts.map((opt) => (
            <option key={opt} value={opt} />
          ))}
        </datalist>
      )}
      {column.type === "url" && value && !dirty && (
        <a
          href={value.startsWith("http") ? value : `https://${value}`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded p-1 text-gray-400 hover:text-[#22c55e]"
          title="פתח בלשונית חדשה"
        >
          <ExternalLink className="size-3.5" />
        </a>
      )}
    </div>
  );
}

function FilesCell({
  entryId,
  ventureId,
}: {
  entryId: string;
  ventureId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [count, setCount] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const handleCountChange = useCallback((c: number) => setCount(c), []);

  const loadCount = useCallback(async () => {
    const { count: c } = await supabase
      .from("workbook_task_files")
      .select("id", { count: "exact", head: true })
      .eq("entry_id", entryId);
    setCount(c ?? 0);
  }, [supabase, entryId]);

  useEffect(() => {
    loadCount();
  }, [loadCount]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex w-full items-center justify-center gap-1 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-gray-600 transition-colors hover:bg-white hover:border-gray-200",
          count === 0 && "text-gray-400"
        )}
        title="קבצים מצורפים"
      >
        <Paperclip className="size-3.5" />
        <span>{count ?? "…"}</span>
      </button>
      <TaskFilesModal
        entryId={entryId}
        ventureId={ventureId}
        open={open}
        onClose={() => setOpen(false)}
        onCountChange={handleCountChange}
      />
    </>
  );
}

function LongTextCell({
  column,
  value,
  onChange,
  onPush,
  pushed,
  contextLabel,
  contextValue,
}: {
  column: WorkbookColumn;
  value: string;
  onChange: (v: unknown) => void;
  // When set, the editor modal shows an "add to workbook chapter" action.
  onPush?: (draft: string) => void | Promise<void>;
  pushed?: boolean;
  // When set, the editor modal pins this read-only text above the textarea
  // (e.g. the task text shown while writing the answer).
  contextLabel?: string;
  contextValue?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pushing, setPushing] = useState(false);
  const [contextOpen, setContextOpen] = useState(true);

  function openModal() {
    setDraft(value);
    setOpen(true);
  }

  function save() {
    if (draft !== value) onChange(draft);
    setOpen(false);
  }

  function cancel() {
    setDraft(value);
    setOpen(false);
  }

  async function saveAndPush() {
    if (!onPush || !draft.trim()) return;
    setPushing(true);
    try {
      await onPush(draft);
      setOpen(false);
    } finally {
      setPushing(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={cn(
          "group flex w-full items-start justify-between gap-2 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-right text-sm text-gray-800 outline-none transition-colors hover:bg-white hover:border-gray-200 focus:border-[#22c55e] focus:bg-white",
          !value && "text-gray-400"
        )}
      >
        <span className="line-clamp-2 whitespace-pre-wrap break-words flex-1 min-w-0">
          {value || column.placeholder || "לחצו לעריכה..."}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {pushed && (
            <BookOpen
              className="size-3.5 text-[#22c55e]"
              aria-label="נוסף לחוברת"
            />
          )}
          <Maximize2 className="size-3.5 text-gray-300 transition-colors group-hover:text-gray-500" />
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={cancel}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="text-lg font-semibold text-[#1a2744]">{column.label}</h3>
              <button
                type="button"
                onClick={cancel}
                className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                aria-label="סגור"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="p-5">
              {contextValue?.trim() && (
                <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50">
                  <button
                    type="button"
                    onClick={() => setContextOpen((v) => !v)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-right text-xs font-semibold text-gray-500"
                  >
                    <span>{contextLabel ?? "הקשר"}</span>
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 transition-transform",
                        !contextOpen && "rotate-180"
                      )}
                    />
                  </button>
                  {contextOpen && (
                    <p className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words border-t border-gray-200 px-3 py-2 text-sm text-gray-700">
                      {contextValue}
                    </p>
                  )}
                </div>
              )}
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                autoFocus
                rows={12}
                className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-[#22c55e]"
                placeholder={column.placeholder}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    cancel();
                  } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    save();
                  }
                }}
              />
            </div>
            <div className="flex items-center gap-2 border-t border-gray-100 px-5 py-3">
              {onPush && (
                <button
                  type="button"
                  onClick={saveAndPush}
                  disabled={pushing || !draft.trim()}
                  title={
                    !draft.trim()
                      ? "כתבו תשובה כדי להוסיף אותה לחוברת"
                      : undefined
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-[#22c55e] bg-[#22c55e]/10 px-4 py-2 text-sm font-medium text-[#16a34a] transition-colors hover:bg-[#22c55e]/20 disabled:opacity-50"
                >
                  {pushing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <BookOpen className="size-4" />
                  )}
                  {pushed ? "הוסף שוב לחוברת" : "הוסף לחוברת העבודה"}
                </button>
              )}
              <div className="ms-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancel}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  ביטול
                </button>
                <button
                  type="button"
                  onClick={save}
                  className="rounded-lg bg-[#22c55e] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#16a34a]"
                >
                  שמור
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
