"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef, useState } from "react";
import type {
  BibliographyEntry,
  BibliographyKind,
  Cohort,
} from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Library,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  ExternalLink,
  BookOpen,
  FileText,
  Video as VideoIcon,
  Headphones,
  Link2,
  Paperclip,
  Upload,
  Download,
} from "lucide-react";

const FILE_BUCKET = "bibliography-files";
const MAX_FILE_BYTES = 25 * 1024 * 1024;

type FileMeta = {
  file_url: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  file_mime: string | null;
};

const EMPTY_FILE: FileMeta = {
  file_url: null,
  file_path: null,
  file_name: null,
  file_size: null,
  file_mime: null,
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const KIND_OPTIONS: { value: BibliographyKind; label: string }[] = [
  { value: "book", label: "ספר" },
  { value: "article", label: "מאמר" },
  { value: "video", label: "וידאו" },
  { value: "podcast", label: "פודקאסט" },
  { value: "other", label: "אחר" },
];

const KIND_LABELS: Record<BibliographyKind, string> = {
  book: "ספר",
  article: "מאמר",
  video: "וידאו",
  podcast: "פודקאסט",
  other: "אחר",
};

function KindIcon({ kind, className }: { kind: BibliographyKind; className?: string }) {
  switch (kind) {
    case "book":
      return <BookOpen className={className} />;
    case "article":
      return <FileText className={className} />;
    case "video":
      return <VideoIcon className={className} />;
    case "podcast":
      return <Headphones className={className} />;
    default:
      return <Link2 className={className} />;
  }
}

type EntryWithCohort = BibliographyEntry & { cohort?: Cohort | null };

type FormState = {
  cohort_id: string;
  title: string;
  author: string;
  kind: BibliographyKind;
  url: string;
  description: string;
  cover_url: string;
  file: FileMeta;
};

const EMPTY_FORM: FormState = {
  cohort_id: "",
  title: "",
  author: "",
  kind: "book",
  url: "",
  description: "",
  cover_url: "",
  file: EMPTY_FILE,
};

export default function AdminBibliographyPage() {
  const supabase = createClient();
  const [entries, setEntries] = useState<EntryWithCohort[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [filterCohortId, setFilterCohortId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState(EMPTY_FORM);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  useEffect(() => {
    loadCohorts();
    loadEntries();
  }, []);

  async function loadCohorts() {
    const { data } = await supabase
      .from("cohorts")
      .select("*")
      .order("created_at", { ascending: true });
    if (data) {
      setCohorts(data);
      const active = data.find((c) => c.is_active);
      if (active) {
        setNewForm((prev) => ({
          ...prev,
          cohort_id: prev.cohort_id || active.id,
        }));
      }
    }
  }

  async function loadEntries() {
    const { data } = await supabase
      .from("bibliography_entries")
      .select("*, cohort:cohorts(id, name, is_active, created_at)")
      .order("created_at", { ascending: false });
    if (data) setEntries(data as EntryWithCohort[]);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newForm.cohort_id || !newForm.title.trim()) return;
    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("bibliography_entries").insert({
      cohort_id: newForm.cohort_id,
      title: newForm.title.trim(),
      author: newForm.author.trim() || null,
      kind: newForm.kind,
      url: newForm.url.trim() || null,
      description: newForm.description.trim() || null,
      cover_url: newForm.cover_url.trim() || null,
      file_url: newForm.file.file_url,
      file_path: newForm.file.file_path,
      file_name: newForm.file.file_name,
      file_size: newForm.file.file_size,
      file_mime: newForm.file.file_mime,
    });

    if (error) {
      // Roll back any uploaded file so we don't leak storage.
      if (newForm.file.file_path) {
        await supabase.storage.from(FILE_BUCKET).remove([newForm.file.file_path]);
      }
      setMessage(`שגיאה: ${error.message}`);
    } else {
      setMessage("הפריט נוסף");
      const activeId = cohorts.find((c) => c.is_active)?.id || "";
      setNewForm({ ...EMPTY_FORM, cohort_id: activeId });
      setShowNew(false);
    }

    setLoading(false);
    loadEntries();
  }

  function startEdit(entry: EntryWithCohort) {
    setEditingId(entry.id);
    setEditForm({
      cohort_id: entry.cohort_id,
      title: entry.title,
      author: entry.author || "",
      kind: entry.kind,
      url: entry.url || "",
      description: entry.description || "",
      cover_url: entry.cover_url || "",
      file: {
        file_url: entry.file_url,
        file_path: entry.file_path,
        file_name: entry.file_name,
        file_size: entry.file_size,
        file_mime: entry.file_mime,
      },
    });
  }

  async function saveEdit(id: string) {
    if (!editForm.cohort_id || !editForm.title.trim()) return;
    setLoading(true);

    // If the edit replaced or removed the file, capture the OLD storage path
    // so we can remove it after the DB update succeeds.
    const original = entries.find((e) => e.id === id);
    const oldPath = original?.file_path || null;
    const newPath = editForm.file.file_path;
    const oldFileNeedsRemoval = oldPath && oldPath !== newPath;

    const { error } = await supabase
      .from("bibliography_entries")
      .update({
        cohort_id: editForm.cohort_id,
        title: editForm.title.trim(),
        author: editForm.author.trim() || null,
        kind: editForm.kind,
        url: editForm.url.trim() || null,
        description: editForm.description.trim() || null,
        cover_url: editForm.cover_url.trim() || null,
        file_url: editForm.file.file_url,
        file_path: editForm.file.file_path,
        file_name: editForm.file.file_name,
        file_size: editForm.file.file_size,
        file_mime: editForm.file.file_mime,
      })
      .eq("id", id);

    if (error) {
      // If we'd already uploaded a NEW file, roll it back so we don't leak.
      if (newPath && newPath !== oldPath) {
        await supabase.storage.from(FILE_BUCKET).remove([newPath]);
      }
      setMessage(`שגיאה: ${error.message}`);
    } else {
      if (oldFileNeedsRemoval) {
        await supabase.storage.from(FILE_BUCKET).remove([oldPath as string]);
      }
      setEditingId(null);
    }

    setLoading(false);
    loadEntries();
  }

  async function handleDelete(id: string) {
    if (!confirm("למחוק פריט זה? פעולה זו לא ניתנת לביטול.")) return;

    const original = entries.find((e) => e.id === id);

    const { error } = await supabase
      .from("bibliography_entries")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage(`שגיאה: ${error.message}`);
      loadEntries();
      return;
    }

    if (original?.file_path) {
      await supabase.storage
        .from(FILE_BUCKET)
        .remove([original.file_path]);
    }

    setMessage("הפריט נמחק");
    loadEntries();
  }

  const visibleEntries = filterCohortId
    ? entries.filter((e) => e.cohort_id === filterCohortId)
    : entries;

  type Group = {
    key: string;
    title: string;
    isActive: boolean;
    createdAt: string;
    items: EntryWithCohort[];
  };
  const groups: Group[] = (() => {
    if (filterCohortId) {
      const c = cohorts.find((x) => x.id === filterCohortId);
      return [
        {
          key: filterCohortId,
          title: c?.name || "",
          isActive: !!c?.is_active,
          createdAt: c?.created_at || "",
          items: visibleEntries,
        },
      ];
    }
    const map = new Map<string, Group>();
    for (const e of visibleEntries) {
      const cohort = cohorts.find((c) => c.id === e.cohort_id);
      const key = e.cohort_id || "__unassigned__";
      if (!map.has(key)) {
        map.set(key, {
          key,
          title: cohort?.name || e.cohort?.name || "ללא מחזור",
          isActive: !!cohort?.is_active,
          createdAt: cohort?.created_at || "",
          items: [],
        });
      }
      map.get(key)!.items.push(e);
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });
  })();

  const showCohortHeaders = !filterCohortId && groups.length > 1;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1a2744] flex items-center gap-2">
          <Library className="size-6" />
          ניהול ביבליוגרפיה
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          חומרי קריאה, צפייה והאזנה למחזורים
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

      {/* Filter + add */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterCohortId}
          onChange={(e) => setFilterCohortId(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e] bg-white"
        >
          <option value="">כל המחזורים</option>
          {cohorts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <button
          onClick={() => setShowNew((v) => !v)}
          className="inline-flex items-center gap-1.5 bg-[#22c55e] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#16a34a] transition-colors"
        >
          <Plus className="size-4" />
          פריט חדש
        </button>
      </div>

      {/* New entry form */}
      {showNew && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-[#1a2744] flex items-center gap-2">
              <Plus className="size-4" />
              פריט חדש
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EntryForm
              form={newForm}
              setForm={setNewForm}
              cohorts={cohorts}
              onSubmit={handleCreate}
              onCancel={() => setShowNew(false)}
              submitting={loading}
              submitLabel="הוסף"
            />
          </CardContent>
        </Card>
      )}

      {/* List */}
      <section className="space-y-6">
        {groups.length === 0 && (
          <p className="text-sm text-gray-400">אין פריטים</p>
        )}

        {groups.map((group) => (
          <div key={group.key} className="space-y-3">
            {showCohortHeaders && (
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[#1a2744]">
                  {group.title}
                </h2>
                {group.isActive && (
                  <Badge className="bg-[#22c55e]/10 text-[#22c55e] border-0 text-[10px]">
                    פעיל
                  </Badge>
                )}
                <Badge variant="secondary" className="text-[10px]">
                  {group.items.length}
                </Badge>
              </div>
            )}

            <div className="space-y-3">
              {group.items.map((entry) => (
                <Card key={entry.id} className="border-0 shadow-sm">
                  <CardContent className="pt-0">
                    {editingId === entry.id ? (
                      <EntryForm
                        form={editForm}
                        setForm={setEditForm}
                        cohorts={cohorts}
                        onSubmit={(e) => {
                          e.preventDefault();
                          saveEdit(entry.id);
                        }}
                        onCancel={() => setEditingId(null)}
                        submitting={loading}
                        submitLabel="שמור"
                      />
                    ) : (
                      <div className="flex items-start gap-3">
                        {entry.cover_url ? (
                          <img
                            src={entry.cover_url}
                            alt=""
                            className="size-16 rounded-lg object-cover shrink-0 bg-gray-50"
                          />
                        ) : (
                          <div className="flex size-16 items-center justify-center rounded-lg bg-[#22c55e]/10 shrink-0">
                            <KindIcon
                              kind={entry.kind}
                              className="size-7 text-[#22c55e]"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="bg-[#1a2744]/10 text-[#1a2744] border-0 text-[10px] gap-1">
                              <KindIcon kind={entry.kind} className="size-3" />
                              {KIND_LABELS[entry.kind] || entry.kind}
                            </Badge>
                            {!filterCohortId && entry.cohort && (
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                {entry.cohort.name}
                              </Badge>
                            )}
                          </div>
                          <p className="font-semibold text-[#1a2744]">
                            {entry.title}
                          </p>
                          {entry.author && (
                            <p className="text-xs text-gray-500">
                              {entry.author}
                            </p>
                          )}
                          {entry.description && (
                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                              {entry.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 flex-wrap">
                            {entry.url && (
                              <a
                                href={entry.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-[#22c55e] hover:underline"
                              >
                                <ExternalLink className="size-3.5" />
                                קישור
                              </a>
                            )}
                            {entry.file_url && (
                              <a
                                href={entry.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-[#22c55e] hover:underline"
                              >
                                <Paperclip className="size-3.5" />
                                {entry.file_name || "קובץ מצורף"}
                                {entry.file_size && (
                                  <span className="text-gray-400">
                                    ({formatBytes(entry.file_size)})
                                  </span>
                                )}
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => startEdit(entry)}
                            className="p-2 text-gray-400 hover:text-[#1a2744] transition-colors rounded-lg hover:bg-gray-100"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function EntryForm({
  form,
  setForm,
  cohorts,
  onSubmit,
  onCancel,
  submitting,
  submitLabel,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  cohorts: Cohort[];
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitting: boolean;
  submitLabel: string;
}) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");

    if (file.size === 0) {
      setUploadError("הקובץ ריק");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setUploadError(
        `הקובץ גדול מ-${Math.round(MAX_FILE_BYTES / (1024 * 1024))} MB`
      );
      e.target.value = "";
      return;
    }

    setUploading(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${Date.now()}-${safeName}`;

    const { error: uploadErr } = await supabase.storage
      .from(FILE_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });

    if (uploadErr) {
      setUploadError(uploadErr.message);
      setUploading(false);
      e.target.value = "";
      return;
    }

    // If a previous staged-but-unsaved upload exists on this form, drop it
    // from storage now to avoid leaking a file the user replaced.
    if (form.file.file_path) {
      await supabase.storage.from(FILE_BUCKET).remove([form.file.file_path]);
    }

    const { data: pub } = supabase.storage.from(FILE_BUCKET).getPublicUrl(path);
    setForm({
      ...form,
      file: {
        file_url: pub.publicUrl,
        file_path: path,
        file_name: file.name,
        file_size: file.size,
        file_mime: file.type || null,
      },
    });
    setUploading(false);
    e.target.value = "";
  }

  function clearFile() {
    // Don't actually remove from storage here — the file may already belong
    // to a saved entry, and the user might cancel the edit. Real cleanup
    // happens in saveEdit when the DB row no longer references the path.
    setForm({ ...form, file: EMPTY_FILE });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            מחזור *
          </label>
          <select
            value={form.cohort_id}
            onChange={(e) => setForm({ ...form, cohort_id: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e] bg-white"
          >
            <option value="">בחר מחזור</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.is_active ? " (פעיל)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            סוג
          </label>
          <select
            value={form.kind}
            onChange={(e) =>
              setForm({ ...form, kind: e.target.value as BibliographyKind })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e] bg-white"
          >
            {KIND_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          כותרת *
        </label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          placeholder="כותרת הפריט"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            מחבר/מקור
          </label>
          <input
            type="text"
            value={form.author}
            onChange={(e) => setForm({ ...form, author: e.target.value })}
            placeholder="שם המחבר או מקור"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            קישור
          </label>
          <input
            type="url"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
            dir="ltr"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          קישור לתמונת כריכה
        </label>
        <input
          type="url"
          value={form.cover_url}
          onChange={(e) => setForm({ ...form, cover_url: e.target.value })}
          placeholder="https://"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
          dir="ltr"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          קובץ מצורף
        </label>
        {form.file.file_url && form.file.file_name ? (
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <Paperclip className="size-4 text-[#22c55e] shrink-0" />
            <a
              href={form.file.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-w-0 truncate text-sm text-[#1a2744] hover:underline"
              dir="ltr"
            >
              {form.file.file_name}
            </a>
            {form.file.file_size && (
              <span className="text-xs text-gray-500 shrink-0">
                {formatBytes(form.file.file_size)}
              </span>
            )}
            <button
              type="button"
              onClick={clearFile}
              className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors shrink-0"
              title="הסר קובץ"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              disabled={uploading}
              className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#22c55e]/10 file:text-[#22c55e] hover:file:bg-[#22c55e]/20 file:cursor-pointer disabled:opacity-50"
            />
            {uploading && (
              <Upload className="size-4 text-[#22c55e] animate-pulse shrink-0" />
            )}
          </div>
        )}
        {uploadError && (
          <p className="text-xs text-red-600 mt-1">{uploadError}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          עד {Math.round(MAX_FILE_BYTES / (1024 * 1024))} MB. כל פורמט.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          תיאור
        </label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="תיאור קצר (אופציונלי)"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting || uploading}
          className="inline-flex items-center gap-1.5 bg-[#22c55e] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#16a34a] disabled:opacity-50 transition-colors"
        >
          <Check className="size-4" />
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          <X className="size-4" />
          בטל
        </button>
      </div>
    </form>
  );
}
