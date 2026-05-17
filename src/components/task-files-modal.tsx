"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { WorkbookTaskFile } from "@/lib/types";
import {
  X,
  Upload,
  Trash2,
  Loader2,
  File as FileIcon,
  Image as ImageIcon,
  Film,
  Music,
  FileText,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BUCKET = "workbook-task-files";
export const MAX_FILES_PER_TASK = 5;
export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

interface Props {
  entryId: string;
  ventureId: string;
  open: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
  readOnly?: boolean;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function iconForFile(mime: string | null) {
  const m = (mime || "").toLowerCase();
  if (m.startsWith("image/")) return ImageIcon;
  if (m.startsWith("video/")) return Film;
  if (m.startsWith("audio/")) return Music;
  if (m.includes("pdf") || m.includes("text")) return FileText;
  return FileIcon;
}

export function TaskFilesModal({
  entryId,
  ventureId,
  open,
  onClose,
  onCountChange,
  readOnly = false,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [files, setFiles] = useState<WorkbookTaskFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("workbook_task_files")
      .select("*")
      .eq("entry_id", entryId)
      .order("created_at", { ascending: true });
    const list = (data as WorkbookTaskFile[]) || [];
    setFiles(list);
    setLoading(false);
    onCountChange?.(list.length);
  }, [supabase, entryId, onCountChange]);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  async function handleDownload(f: WorkbookTaskFile) {
    const { data, error: e } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(f.storage_path, 3600, { download: f.file_name });
    if (e || !data?.signedUrl) {
      setError(e?.message || "שגיאה בהורדה");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  async function handleUpload(selected: FileList | null) {
    if (!selected || selected.length === 0) return;
    setError("");

    const candidates = Array.from(selected);
    if (files.length + candidates.length > MAX_FILES_PER_TASK) {
      setError(`מותר עד ${MAX_FILES_PER_TASK} קבצים למשימה`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const tooBig = candidates.find((f) => f.size > MAX_FILE_BYTES);
    if (tooBig) {
      setError(`הקובץ "${tooBig.name}" גדול מ-10MB`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setBusy(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("נדרשת התחברות");
      setBusy(false);
      return;
    }

    for (const file of candidates) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `venture/${ventureId}/${entryId}/${crypto.randomUUID()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });
      if (upErr) {
        setError(upErr.message);
        setBusy(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      const { error: insErr } = await supabase
        .from("workbook_task_files")
        .insert({
          entry_id: entryId,
          bulk_task_id: null,
          file_name: file.name,
          storage_path: path,
          mime_type: file.type || null,
          size_bytes: file.size,
          uploaded_by: user.id,
        });
      if (insErr) {
        // Roll back the uploaded object so we don't leak it
        await supabase.storage.from(BUCKET).remove([path]);
        setError(insErr.message);
        setBusy(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    await refresh();
    setBusy(false);
  }

  async function handleDelete(f: WorkbookTaskFile) {
    if (!confirm(`למחוק את הקובץ "${f.file_name}"?`)) return;
    setBusy(true);
    setError("");

    const { error: delErr } = await supabase
      .from("workbook_task_files")
      .delete()
      .eq("id", f.id);
    if (delErr) {
      setError(delErr.message);
      setBusy(false);
      return;
    }

    // Storage cleanup: only remove the object when we know this row was the
    // sole reference. Per-venture uploads (bulk_task_id null) use a
    // UUID-unique path, so removing the row makes the object orphaned and
    // safe to delete. Admin-broadcast files share one path across many
    // venture rows that RLS hides from this client — leave that cleanup to
    // the admin bulk-delete route (which runs with admin RLS).
    if (f.bulk_task_id === null) {
      await supabase.storage.from(BUCKET).remove([f.storage_path]);
    }

    await refresh();
    setBusy(false);
  }

  if (!open) return null;

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
          <h3 className="text-lg font-semibold text-[#1a2744]">
            קבצים מצורפים
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

        <div className="p-5">
          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-6 text-center text-gray-400">
              <Loader2 className="mx-auto size-5 animate-spin" />
            </div>
          ) : files.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              אין קבצים מצורפים עדיין
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {files.map((f) => {
                const Icon = iconForFile(f.mime_type);
                return (
                  <li
                    key={f.id}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <Icon className="size-5 shrink-0 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-[#1a2744]">
                        {f.file_name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatSize(f.size_bytes)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownload(f)}
                      disabled={busy}
                      className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#1a2744] disabled:opacity-40 disabled:hover:bg-transparent"
                      title="הורדה"
                    >
                      <Download className="size-4" />
                    </button>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleDelete(f)}
                        disabled={busy}
                        className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                        title="מחק"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {!readOnly && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <label
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-[#22c55e] hover:text-[#22c55e]",
                  (busy || files.length >= MAX_FILES_PER_TASK) &&
                    "pointer-events-none opacity-50"
                )}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                <span>הוסף קבצים</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files)}
                  disabled={busy || files.length >= MAX_FILES_PER_TASK}
                />
              </label>
              <p className="mt-2 text-xs text-gray-400">
                עד {MAX_FILES_PER_TASK} קבצים, עד 10MB לקובץ
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
