"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { WORKBOOK_SHEETS, type WorkbookColumn, type WorkbookSheet } from "@/lib/workbook";
import type { WorkbookEntry } from "@/lib/types";
import { Plus, Trash2, Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  ventureId: string;
  ventureName: string;
}

export function WorkbookClient({ ventureId, ventureName }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [activeSheetKey, setActiveSheetKey] = useState<string>(WORKBOOK_SHEETS[0].key);
  const [entries, setEntries] = useState<WorkbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const activeSheet = useMemo<WorkbookSheet>(
    () => WORKBOOK_SHEETS.find((s) => s.key === activeSheetKey)!,
    [activeSheetKey]
  );

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

  async function addRow() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const maxPos = entries.reduce((m, e) => Math.max(m, e.position), -1);
    const { data, error } = await supabase
      .from("workbook_entries")
      .insert({
        venture_id: ventureId,
        sheet_key: activeSheetKey,
        data: {},
        position: maxPos + 1,
        created_by: user.id,
      })
      .select()
      .single();
    if (error) return;
    setEntries((prev) => [...prev, data as WorkbookEntry]);
  }

  async function deleteRow(id: string) {
    if (!confirm("למחוק את השורה הזו?")) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await supabase.from("workbook_entries").delete().eq("id", id);
  }

  async function updateCell(id: string, key: string, value: unknown) {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, data: { ...e.data, [key]: value } } : e))
    );
    setSavingIds((s) => new Set(s).add(id));
    const entry = entries.find((e) => e.id === id);
    const nextData = { ...(entry?.data || {}), [key]: value };
    await supabase
      .from("workbook_entries")
      .update({ data: nextData, updated_at: new Date().toISOString() })
      .eq("id", id);
    setSavingIds((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
  }

  return (
    <div className="mx-auto max-w-[1400px] p-4 md:p-6">
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1a2744]">חוברת עבודה</h1>
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
            </button>
          );
        })}
      </div>

      {/* Description */}
      {activeSheet.description && (
        <p className="mb-3 text-sm text-gray-500">{activeSheet.description}</p>
      )}

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
              entries.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                  {activeSheet.columns.map((col) => (
                    <td key={col.key} className="align-top p-1.5">
                      <CellEditor
                        column={col}
                        value={entry.data[col.key]}
                        onChange={(v) => updateCell(entry.id, col.key, v)}
                      />
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
              ))
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
    </div>
  );
}

function CellEditor({
  column,
  value,
  onChange,
}: {
  column: WorkbookColumn;
  value: unknown;
  onChange: (v: unknown) => void;
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

  if (column.type === "number") {
    return (
      <input
        type="number"
        defaultValue={strVal}
        onBlur={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className={base}
      />
    );
  }

  if (column.type === "longtext") {
    return (
      <textarea
        defaultValue={strVal}
        onBlur={(e) => onChange(e.target.value)}
        rows={2}
        className={cn(base, "resize-y min-h-[38px]")}
        placeholder={column.placeholder}
      />
    );
  }

  if (column.type === "url" && strVal) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="url"
          defaultValue={strVal}
          onBlur={(e) => onChange(e.target.value)}
          className={base}
          dir="ltr"
          placeholder={column.placeholder}
        />
        <a
          href={strVal.startsWith("http") ? strVal : `https://${strVal}`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded p-1 text-gray-400 hover:text-[#22c55e]"
          title="פתח בלשונית חדשה"
        >
          <ExternalLink className="size-3.5" />
        </a>
      </div>
    );
  }

  const inputType =
    column.type === "email" ? "email" : column.type === "phone" ? "tel" : column.type === "url" ? "url" : "text";
  const ltr = column.type === "email" || column.type === "phone" || column.type === "url";

  return (
    <input
      type={inputType}
      defaultValue={strVal}
      onBlur={(e) => onChange(e.target.value)}
      className={base}
      dir={ltr ? "ltr" : undefined}
      placeholder={column.placeholder}
    />
  );
}
