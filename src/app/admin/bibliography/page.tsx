"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
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
} from "lucide-react";

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

const EMPTY_FORM: {
  cohort_id: string;
  title: string;
  author: string;
  kind: BibliographyKind;
  url: string;
  description: string;
  cover_url: string;
} = {
  cohort_id: "",
  title: "",
  author: "",
  kind: "book",
  url: "",
  description: "",
  cover_url: "",
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
    });

    if (error) {
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
    });
  }

  async function saveEdit(id: string) {
    if (!editForm.cohort_id || !editForm.title.trim()) return;
    setLoading(true);

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
      })
      .eq("id", id);

    if (error) {
      setMessage(`שגיאה: ${error.message}`);
    } else {
      setEditingId(null);
    }

    setLoading(false);
    loadEntries();
  }

  async function handleDelete(id: string) {
    if (!confirm("למחוק פריט זה? פעולה זו לא ניתנת לביטול.")) return;

    const { error } = await supabase
      .from("bibliography_entries")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage(`שגיאה: ${error.message}`);
    } else {
      setMessage("הפריט נמחק");
    }

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
  form: typeof EMPTY_FORM;
  setForm: (f: typeof EMPTY_FORM) => void;
  cohorts: Cohort[];
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitting: boolean;
  submitLabel: string;
}) {
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
          disabled={submitting}
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
