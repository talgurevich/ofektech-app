"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  StickyNote,
  Trash2,
  Pencil,
  Check,
  X,
  CheckCircle2,
  RotateCcw,
  Info,
  AlertTriangle,
  Flame,
} from "lucide-react";
import { formatRelativeHe } from "@/lib/utils";
import type { AdminVentureNote, AdminNoteSeverity } from "@/lib/types";

const SEVERITY_META: Record<
  AdminNoteSeverity,
  { label: string; chip: string; icon: typeof Info }
> = {
  info: {
    label: "מידע",
    chip: "bg-gray-100 text-gray-600",
    icon: Info,
  },
  watch: {
    label: "מעקב",
    chip: "bg-amber-100 text-amber-700",
    icon: AlertTriangle,
  },
  blocker: {
    label: "חוסם",
    chip: "bg-red-100 text-red-700",
    icon: Flame,
  },
};

const SEVERITIES: AdminNoteSeverity[] = ["info", "watch", "blocker"];

export function AdminNotesCard({
  ventureId,
  initialNotes,
}: {
  ventureId: string;
  initialNotes: AdminVentureNote[];
}) {
  const router = useRouter();
  const [notes, setNotes] = useState<AdminVentureNote[]>(initialNotes);
  const [content, setContent] = useState("");
  const [severity, setSeverity] = useState<AdminNoteSeverity>("info");
  const [showResolved, setShowResolved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Per-note inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editSeverity, setEditSeverity] = useState<AdminNoteSeverity>("info");

  async function handleCreate(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/venture-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venture_id: ventureId,
          content: trimmed,
          severity,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "שגיאה ביצירת הערה");
      setNotes((prev) => [json.note, ...prev]);
      setContent("");
      setSeverity("info");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function patchNote(id: string, payload: Record<string, unknown>) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/venture-notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "שגיאה");
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...(json.note as AdminVentureNote) } : n))
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("למחוק את ההערה?")) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/venture-notes/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "שגיאה במחיקת הערה");
      }
      setNotes((prev) => prev.filter((n) => n.id !== id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(note: AdminVentureNote) {
    setEditingId(note.id);
    setEditContent(note.content);
    setEditSeverity(note.severity);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditContent("");
    setEditSeverity("info");
  }

  async function saveEdit(id: string) {
    const trimmed = editContent.trim();
    if (!trimmed) return;
    await patchNote(id, { content: trimmed, severity: editSeverity });
    cancelEdit();
  }

  const open = notes.filter((n) => !n.resolved_at);
  const resolved = notes.filter((n) => n.resolved_at);
  const visibleNotes = showResolved ? notes : open;

  return (
    <Card id="admin-notes" className="border-0 shadow-sm ring-1 ring-amber-200/60 bg-amber-50/30">
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <CardTitle className="flex items-center gap-2 text-base text-[#1a2744]">
            <StickyNote className="size-5 text-amber-600" />
            הערות אדמין
          </CardTitle>
          <div className="flex items-center gap-2">
            {open.length > 0 && (
              <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                {open.length} פתוחות
              </Badge>
            )}
            {resolved.length > 0 && (
              <button
                type="button"
                onClick={() => setShowResolved((v) => !v)}
                className="text-xs text-gray-500 hover:text-[#1a2744]"
              >
                {showResolved ? "הסתר טופלו" : `הצג ${resolved.length} שטופלו`}
              </button>
            )}
          </div>
        </div>
        <CardDescription>
          הערות פנימיות לצוות בלבד — לא נראות ליזמים או למנטורים
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New note form */}
        <form onSubmit={handleCreate} className="space-y-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                handleCreate();
              }
            }}
            placeholder="כתבו הערה על המיזם... (⌘+Enter לשליחה)"
            rows={2}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white disabled:opacity-60"
          />
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              {SEVERITIES.map((s) => {
                const meta = SEVERITY_META[s];
                const Icon = meta.icon;
                const active = severity === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSeverity(s)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors ${
                      active
                        ? meta.chip + " ring-1 ring-current/30"
                        : "bg-white text-gray-500 hover:bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <Icon className="size-3" />
                    {meta.label}
                  </button>
                );
              })}
            </div>
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="bg-amber-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "שומר..." : "הוסף הערה"}
            </button>
          </div>
          {error && (
            <p className="text-xs text-red-600 px-1">{error}</p>
          )}
        </form>

        {/* Notes list */}
        <div className="space-y-2">
          {visibleNotes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              {open.length === 0
                ? "אין הערות פתוחות"
                : "אין הערות להצגה"}
            </p>
          ) : (
            visibleNotes.map((note) => {
              const meta = SEVERITY_META[note.severity];
              const Icon = meta.icon;
              const isEditing = editingId === note.id;
              const isResolved = !!note.resolved_at;

              return (
                <div
                  key={note.id}
                  className={`rounded-xl border p-3 transition-colors ${
                    isResolved
                      ? "bg-white/50 border-gray-200 opacity-70"
                      : "bg-white border-gray-200"
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          {SEVERITIES.map((s) => {
                            const m = SEVERITY_META[s];
                            const I = m.icon;
                            const active = editSeverity === s;
                            return (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setEditSeverity(s)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] transition-colors ${
                                  active
                                    ? m.chip + " ring-1 ring-current/30"
                                    : "bg-white text-gray-500 hover:bg-gray-50 border border-gray-200"
                                }`}
                              >
                                <I className="size-2.5" />
                                {m.label}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => saveEdit(note.id)}
                            disabled={loading || !editContent.trim()}
                            className="p-1.5 text-[#22c55e] hover:bg-[#22c55e]/10 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Check className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-start gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] shrink-0 ${meta.chip}`}
                        >
                          <Icon className="size-2.5" />
                          {meta.label}
                        </span>
                        <p
                          className={`text-sm flex-1 whitespace-pre-wrap ${
                            isResolved
                              ? "text-gray-500 line-through"
                              : "text-[#1a2744]"
                          }`}
                        >
                          {note.content}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-[11px] text-gray-400">
                          {note.author?.full_name || "אדמין"} ·{" "}
                          {formatRelativeHe(note.created_at)}
                          {note.updated_at !== note.created_at && " (נערך)"}
                          {isResolved && note.resolved_at && (
                            <>
                              {" · "}
                              טופל {formatRelativeHe(note.resolved_at)}
                            </>
                          )}
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              patchNote(note.id, { resolved: !isResolved })
                            }
                            disabled={loading}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-colors ${
                              isResolved
                                ? "text-gray-500 hover:bg-gray-100"
                                : "text-[#22c55e] hover:bg-[#22c55e]/10"
                            }`}
                          >
                            {isResolved ? (
                              <>
                                <RotateCcw className="size-3" />
                                פתח שוב
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="size-3" />
                                סמן שטופל
                              </>
                            )}
                          </button>
                          {!isResolved && (
                            <button
                              type="button"
                              onClick={() => startEdit(note)}
                              className="p-1 text-gray-400 hover:text-[#1a2744] transition-colors rounded-md hover:bg-gray-100"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(note.id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors rounded-md hover:bg-red-50"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
