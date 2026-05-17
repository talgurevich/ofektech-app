"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, ListTodo, Plus, Send, Loader2, Paperclip, Trash2 } from "lucide-react";

type VentureRow = {
  id: string;
  name: string;
};

const CATEGORY_OPTIONS = ["מוצר", "עיסקי"] as const;

export default function AdminBulkTasksPage() {
  const supabase = useMemo(() => createClient(), []);
  const [ventures, setVentures] = useState<VentureRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [taskText, setTaskText] = useState("");
  const [category, setCategory] = useState<string>("מוצר");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const MAX_FILES = 5;
  const MAX_FILE_BYTES = 10 * 1024 * 1024;

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("ventures")
        .select("id, name")
        .order("name");
      setVentures((data || []) as VentureRow[]);
      setLoading(false);
    })();
  }, [supabase]);

  const allSelected = ventures.length > 0 && selected.size === ventures.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(ventures.map((v) => v.id)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!taskText.trim() || selected.size === 0) return;
    setSubmitting(true);
    setMessage("");

    const fd = new FormData();
    fd.append("task_text", taskText.trim());
    fd.append("category", category);
    if (assignee.trim()) fd.append("assignee", assignee.trim());
    if (dueDate) fd.append("due_date", dueDate);
    fd.append("venture_ids", Array.from(selected).join(","));
    for (const f of stagedFiles) fd.append("files", f, f.name);

    const res = await fetch("/api/admin/bulk-tasks", {
      method: "POST",
      body: fd,
    });
    const body = (await res.json()) as
      | { bulk_task_id: string; target_count: number; file_count: number }
      | { error: string };

    if (!res.ok || "error" in body) {
      const errMsg = "error" in body ? body.error : `HTTP ${res.status}`;
      setMessage(`שגיאה: ${errMsg}`);
      setSubmitting(false);
      return;
    }

    setMessage(
      `המשימה נוספה ל־${body.target_count} מיזמים${
        body.file_count > 0 ? ` (כולל ${body.file_count} קבצים)` : ""
      }`
    );

    const preview = taskText.trim().slice(0, 120);
    const ventureNames = ventures
      .filter((v) => selected.has(v.id))
      .map((v) => v.name)
      .slice(0, 4)
      .join(", ");
    const more =
      body.target_count > 4 ? ` ועוד ${body.target_count - 4}` : "";
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "bulk_task",
        description: `משימה נוספה ל־${body.target_count} מיזמים (${ventureNames}${more}): "${preview}"${
          body.file_count > 0 ? ` [${body.file_count} קבצים]` : ""
        }`,
      }),
    });

    setTaskText("");
    setAssignee("");
    setDueDate("");
    setSelected(new Set());
    setStagedFiles([]);
    setSubmitting(false);
    // Bump a refresh signal for the history list (added in Task 8)
    setHistoryRefreshKey((k) => k + 1);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1a2744] flex items-center gap-2">
          <ListTodo className="size-6" />
          משימות למיזמים
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          הוספת משימה חדשה לטבלת העבודה של מיזם או של כל המיזמים בבת אחת
        </p>
      </div>

      {message && (
        <div
          className={`px-4 py-3 rounded-lg text-sm ${
            message.includes("שגיאה")
              ? "bg-red-50 border border-red-200 text-red-700"
              : "bg-green-50 border border-green-200 text-green-700"
          }`}
        >
          {message}
        </div>
      )}

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-[#1a2744] flex items-center gap-2">
            <Plus className="size-4" />
            פרטי המשימה
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                תיאור המשימה
              </label>
              <textarea
                value={taskText}
                onChange={(e) => setTaskText(e.target.value)}
                required
                rows={4}
                placeholder="מה צריך לעשות?"
                className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  קטגוריה
                </label>
                <input
                  list="admin-bulk-task-categories"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="בחר או הוסף קטגוריה..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                />
                <datalist id="admin-bulk-task-categories">
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  אחראי ביצוע (אופציונלי)
                </label>
                <input
                  type="text"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  placeholder="שם או צוות"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  תאריך לביצוע (אופציונלי)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Paperclip className="size-4" />
                קבצים מצורפים (אופציונלי)
              </label>
              {fileError && (
                <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {fileError}
                </div>
              )}
              <label
                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-2 text-sm text-gray-600 hover:border-[#22c55e] hover:text-[#22c55e] ${
                  stagedFiles.length >= MAX_FILES
                    ? "pointer-events-none opacity-50"
                    : ""
                }`}
              >
                <Plus className="size-4" />
                <span>הוסף קבצים</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    setFileError("");
                    const picked = Array.from(e.target.files || []);
                    if (stagedFiles.length + picked.length > MAX_FILES) {
                      setFileError(`מותר עד ${MAX_FILES} קבצים`);
                      e.target.value = "";
                      return;
                    }
                    const tooBig = picked.find((f) => f.size > MAX_FILE_BYTES);
                    if (tooBig) {
                      setFileError(`הקובץ "${tooBig.name}" גדול מ-10MB`);
                      e.target.value = "";
                      return;
                    }
                    setStagedFiles((prev) => [...prev, ...picked]);
                    e.target.value = "";
                  }}
                />
              </label>
              {stagedFiles.length > 0 && (
                <ul className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-200">
                  {stagedFiles.map((f, idx) => (
                    <li
                      key={`${f.name}-${idx}`}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700"
                    >
                      <Paperclip className="size-3.5 text-gray-400" />
                      <span className="flex-1 min-w-0 truncate">{f.name}</span>
                      <span className="text-xs text-gray-400">
                        {f.size < 1024 * 1024
                          ? `${(f.size / 1024).toFixed(0)} KB`
                          : `${(f.size / 1024 / 1024).toFixed(1)} MB`}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setStagedFiles((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="הסר"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-1 text-xs text-gray-400">
                עד {MAX_FILES} קבצים, עד 10MB לקובץ
              </p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  בחירת מיזמים
                </label>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs text-[#22c55e] hover:underline"
                  disabled={ventures.length === 0}
                >
                  {allSelected ? "ביטול בחירה" : "בחר הכל"}
                </button>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white max-h-72 overflow-y-auto divide-y divide-gray-100">
                {loading ? (
                  <div className="p-4 text-center text-sm text-gray-400">
                    <Loader2 className="mx-auto size-4 animate-spin" />
                  </div>
                ) : ventures.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-400">
                    אין מיזמים עדיין
                  </div>
                ) : (
                  ventures.map((v) => {
                    const checked = selected.has(v.id);
                    return (
                      <label
                        key={v.id}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(v.id)}
                          className="size-4 accent-[#22c55e] cursor-pointer"
                        />
                        <Briefcase className="size-4 text-gray-400 shrink-0" />
                        <span className="text-sm text-[#1a2744] flex-1 min-w-0 truncate">
                          {v.name}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              {selected.size > 0 && (
                <Badge variant="secondary" className="mt-2 text-xs">
                  {selected.size} נבחרו
                </Badge>
              )}
            </div>

            <button
              type="submit"
              disabled={
                submitting || !taskText.trim() || selected.size === 0
              }
              className="inline-flex items-center gap-2 bg-[#22c55e] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#16a34a] disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {submitting ? "שולח..." : "צור משימה"}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
