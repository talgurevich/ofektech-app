"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LectureResource } from "@/lib/types";
import {
  ExternalLink,
  FileText,
  Upload,
  Link as LinkIcon,
  Trash2,
  Loader2,
  File as FileIcon,
  Image as ImageIcon,
  Film,
  Music,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  lectureId: string;
  editable?: boolean;
  className?: string;
}

const BUCKET = "lecture-resources";

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function iconForResource(r: LectureResource) {
  if (r.kind === "link") return LinkIcon;
  const m = (r.mime_type || "").toLowerCase();
  if (m.startsWith("image/")) return ImageIcon;
  if (m.startsWith("video/")) return Film;
  if (m.startsWith("audio/")) return Music;
  if (m.includes("pdf") || m.includes("text")) return FileText;
  return FileIcon;
}

export function LectureResourcesSection({
  lectureId,
  editable = false,
  className,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [resources, setResources] = useState<LectureResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [fileTitle, setFileTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("lecture_resources")
        .select("*")
        .eq("lecture_id", lectureId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (!cancelled) {
        setResources((data as LectureResource[]) || []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, lectureId]);

  async function refresh() {
    const { data } = await supabase
      .from("lecture_resources")
      .select("*")
      .eq("lecture_id", lectureId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    setResources((data as LectureResource[]) || []);
  }

  function nextPosition(): number {
    return resources.reduce((m, r) => Math.max(m, r.position), -1) + 1;
  }

  async function addLink() {
    if (!linkTitle.trim() || !linkUrl.trim()) return;
    setBusy(true);
    setError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("נדרשת התחברות");
      setBusy(false);
      return;
    }
    const url = linkUrl.trim().startsWith("http")
      ? linkUrl.trim()
      : `https://${linkUrl.trim()}`;
    const { error: insertErr } = await supabase
      .from("lecture_resources")
      .insert({
        lecture_id: lectureId,
        kind: "link",
        title: linkTitle.trim(),
        url,
        position: nextPosition(),
        created_by: user.id,
      });
    if (insertErr) setError(insertErr.message);
    else {
      setLinkTitle("");
      setLinkUrl("");
      await refresh();
    }
    setBusy(false);
  }

  async function uploadFile(file: File) {
    setBusy(true);
    setError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("נדרשת התחברות");
      setBusy(false);
      return;
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `lectures/${lectureId}/${Date.now()}-${safeName}`;

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });

    if (uploadErr) {
      setError(uploadErr.message);
      setBusy(false);
      return;
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

    const { error: insertErr } = await supabase
      .from("lecture_resources")
      .insert({
        lecture_id: lectureId,
        kind: "file",
        title: fileTitle.trim() || file.name,
        url: pub.publicUrl,
        storage_path: path,
        mime_type: file.type || null,
        size_bytes: file.size,
        position: nextPosition(),
        created_by: user.id,
      });

    if (insertErr) {
      // Roll back the storage object so we don't leak it.
      await supabase.storage.from(BUCKET).remove([path]);
      setError(insertErr.message);
      setBusy(false);
      return;
    }

    setFileTitle("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    await refresh();
    setBusy(false);
  }

  async function remove(r: LectureResource) {
    if (!confirm(`למחוק "${r.title}"?`)) return;
    setBusy(true);
    setError("");
    if (r.kind === "file" && r.storage_path) {
      await supabase.storage.from(BUCKET).remove([r.storage_path]);
    }
    const { error: delErr } = await supabase
      .from("lecture_resources")
      .delete()
      .eq("id", r.id);
    if (delErr) setError(delErr.message);
    else await refresh();
    setBusy(false);
  }

  return (
    <div className={cn("space-y-3", className)}>
      {loading ? (
        <div className="flex items-center justify-center py-3">
          <Loader2 className="size-4 animate-spin text-gray-400" />
        </div>
      ) : resources.length === 0 ? (
        <p className="text-xs text-gray-400">אין חומרים מצורפים</p>
      ) : (
        <ul className="space-y-1.5">
          {resources.map((r) => {
            const Icon = iconForResource(r);
            return (
              <li
                key={r.id}
                className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2 hover:bg-gray-50 transition-colors"
              >
                <Icon className="size-4 text-gray-500 shrink-0" />
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-0 text-sm text-[#1a2744] hover:text-[#22c55e] truncate"
                >
                  {r.title}
                </a>
                {r.kind === "file" && r.size_bytes ? (
                  <span className="text-[10px] text-gray-400 tabular-nums shrink-0">
                    {formatSize(r.size_bytes)}
                  </span>
                ) : null}
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-[#22c55e] shrink-0"
                  title="פתח בלשונית חדשה"
                >
                  <ExternalLink className="size-3.5" />
                </a>
                {editable && (
                  <button
                    type="button"
                    onClick={() => remove(r)}
                    disabled={busy}
                    className="text-gray-400 hover:text-red-600 shrink-0"
                    title="מחק"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {editable && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/40 p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
            <input
              type="text"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              placeholder="שם הקישור"
              className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
            />
            <input
              type="url"
              dir="ltr"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
            />
            <button
              type="button"
              onClick={addLink}
              disabled={busy || !linkTitle.trim() || !linkUrl.trim()}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#1a2744] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2a3a5c] disabled:opacity-50 transition-colors"
            >
              <LinkIcon className="size-3.5" />
              הוסף קישור
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-center">
            <input
              type="text"
              value={fileTitle}
              onChange={(e) => setFileTitle(e.target.value)}
              placeholder="שם תצוגה לקובץ (לא חובה — ברירת מחדל: שם הקובץ)"
              className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
            />
            <label
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-md bg-[#22c55e] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#16a34a] transition-colors cursor-pointer",
                busy && "opacity-50 pointer-events-none"
              )}
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
              העלאת קובץ
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadFile(f);
                }}
              />
            </label>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
