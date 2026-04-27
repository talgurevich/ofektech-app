"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { WORKBOOK_SHEETS, type WorkbookColumn, type WorkbookSheet } from "@/lib/workbook";
import type { WorkbookEntry } from "@/lib/types";
import { logActivity } from "@/lib/activity";
import { Plus, Trash2, Loader2, ExternalLink, Maximize2, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  ventureId: string;
  ventureName: string;
  initialSheetKey?: string;
  members?: { id: string; name: string }[];
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

export function WorkbookClient({ ventureId, ventureName, initialSheetKey, members = [] }: Props) {
  const supabase = useMemo(() => createClient(), []);
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

  async function addRow() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const maxPos = entries.reduce((m, e) => Math.max(m, e.position), -1);
    const initialData: Record<string, unknown> =
      activeSheetKey === "tasks"
        ? { date: new Date().toISOString().slice(0, 10) }
        : {};
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
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await supabase.from("workbook_entries").delete().eq("id", id);
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

  async function updateCell(id: string, key: string, value: unknown) {
    const before = entries.find((e) => e.id === id);
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, data: { ...e.data, [key]: value } } : e))
    );
    setSavingIds((s) => new Set(s).add(id));
    const nextData = { ...(before?.data || {}), [key]: value };
    await supabase
      .from("workbook_entries")
      .update({ data: nextData, updated_at: new Date().toISOString() })
      .eq("id", id);
    setSavingIds((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });

    // Activity logging: tasks.done gets its own events; other edits are
    // debounced per row so a burst of cell edits becomes one event.
    const prevValue = before?.data?.[key];
    if (activeSheetKey === "tasks" && key === "done" && prevValue !== value) {
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
      return;
    }

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
                return (
                <tr
                  key={entry.id}
                  className={cn(
                    "border-b border-gray-100 hover:bg-gray-50/50",
                    isUnseen && "bg-red-50/30"
                  )}
                >
                  {activeSheet.columns.map((col, idx) => (
                    <td key={col.key} className="align-top p-1.5">
                      <div className="relative">
                        {idx === 0 && isUnseen && (
                          <span
                            className="absolute -right-1 top-1 size-2 rounded-full bg-red-500 ring-2 ring-white"
                            title="חדש — טרם נצפה"
                          />
                        )}
                        <CellEditor
                          column={col}
                          value={entry.data[col.key]}
                          onChange={(v) => updateCell(entry.id, col.key, v)}
                          suggestions={columnSuggestions[col.key]}
                          members={members}
                        />
                      </div>
                    </td>
                  ))}
                  <td className="p-1.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {savingIds.has(entry.id) && (
                        <Loader2 className="size-3 animate-spin text-gray-400" />
                      )}
                      <button
                        onClick={() => deleteRow(entry.id)}
                        className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        title="מחק שורה"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
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
  suggestions,
  members = [],
}: {
  column: WorkbookColumn;
  value: unknown;
  onChange: (v: unknown) => void;
  suggestions?: string[];
  members?: { id: string; name: string }[];
}) {
  const base =
    "w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-gray-800 outline-none transition-colors focus:border-[#22c55e] focus:bg-white hover:bg-white";

  const strVal = value == null ? "" : String(value);

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
    return <LongTextCell column={column} value={strVal} onChange={onChange} />;
  }

  // text-style inputs (text/email/phone/url/number/select_creatable):
  // explicit save via V button, Enter to save, Escape to revert.
  return (
    <EditableInput
      column={column}
      value={strVal}
      onChange={onChange}
      suggestions={suggestions}
    />
  );
}

function EditableInput({
  column,
  value,
  onChange,
  suggestions,
}: {
  column: WorkbookColumn;
  value: string;
  onChange: (v: unknown) => void;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState(value);

  // Sync external value back into the input if it changes from outside
  // (e.g. row reload), but only when the user isn't mid-edit.
  useEffect(() => {
    setDraft(value);
  }, [value]);

  const dirty = draft !== value;

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
    if (column.type === "number") {
      onChange(draft === "" ? null : Number(draft));
    } else {
      onChange(draft);
    }
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
      {dirty && (
        <button
          type="button"
          onClick={commit}
          title="שמור"
          className="shrink-0 rounded-md bg-[#22c55e] p-1 text-white transition-colors hover:bg-[#16a34a]"
        >
          <Check className="size-3.5" />
        </button>
      )}
    </div>
  );
}

function LongTextCell({
  column,
  value,
  onChange,
}: {
  column: WorkbookColumn;
  value: string;
  onChange: (v: unknown) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

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
        <Maximize2 className="size-3.5 shrink-0 text-gray-300 transition-colors group-hover:text-gray-500" />
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
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3">
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
      )}
    </>
  );
}
