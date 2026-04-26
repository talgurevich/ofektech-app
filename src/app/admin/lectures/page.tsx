"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Lecture, Cohort } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LectureResourcesSection } from "@/components/lecture-resources-section";
import {
  Mic2,
  Pencil,
  Trash2,
  X,
  Check,
  MapPin,
  Video as VideoIcon,
  FileText,
  ExternalLink,
} from "lucide-react";

export default function AdminLecturesPage() {
  const supabase = createClient();
  const [lectures, setLectures] = useState<(Lecture & { cohort?: { name: string } | null })[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [filterCohortId, setFilterCohortId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Lecture>>({});
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState<Partial<Lecture>>({ location: "זום" });

  useEffect(() => {
    loadCohorts();
    loadLectures();
  }, []);

  async function loadCohorts() {
    const { data } = await supabase
      .from("cohorts")
      .select("*")
      .order("created_at", { ascending: true });
    if (data) {
      setCohorts(data);
      // Default new-lecture form to the active cohort.
      const active = data.find((c) => c.is_active);
      if (active) {
        setNewForm((prev) => ({ ...prev, cohort_id: prev.cohort_id ?? active.id }));
      }
    }
  }

  async function loadLectures() {
    const { data } = await supabase
      .from("lectures")
      .select("*, cohort:cohorts(name)")
      .order("lecture_number", { ascending: true });
    if (data) setLectures(data as (Lecture & { cohort?: { name: string } | null })[]);
  }

  const visibleLectures = filterCohortId
    ? lectures.filter((l) => l.cohort_id === filterCohortId)
    : lectures;

  async function handleDelete(id: string, title: string) {
    if (!confirm(`למחוק את "${title}"?`)) return;
    await supabase.from("lectures").delete().eq("id", id);
    loadLectures();
  }

  function startEdit(lecture: Lecture) {
    setEditingId(lecture.id);
    setEditForm({
      lecture_number: lecture.lecture_number,
      title: lecture.title,
      description: lecture.description,
      scheduled_date: lecture.scheduled_date,
      start_time: lecture.start_time?.slice(0, 5) || "",
      end_time: lecture.end_time?.slice(0, 5) || "",
      location: lecture.location,
      lecturer: lecture.lecturer,
      recording_url: lecture.recording_url || "",
      presentation_url: lecture.presentation_url || "",
      cohort_id: lecture.cohort_id,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
    setError("");
  }

  async function saveEdit(id: string) {
    setLoading(true);
    setError("");

    const { error: err } = await supabase
      .from("lectures")
      .update({
        lecture_number: editForm.lecture_number || null,
        title: editForm.title,
        description: editForm.description || null,
        scheduled_date: editForm.scheduled_date,
        start_time: editForm.start_time || null,
        end_time: editForm.end_time || null,
        location: editForm.location || "zoom",
        lecturer: editForm.lecturer || null,
        recording_url: editForm.recording_url || null,
        presentation_url: editForm.presentation_url || null,
        cohort_id: editForm.cohort_id,
      })
      .eq("id", id);

    if (err) {
      setError("שגיאה בעדכון");
      setLoading(false);
      return;
    }

    setEditingId(null);
    setEditForm({});
    setLoading(false);
    loadLectures();

    // Notify candidates + visitors about the lecture update
    await fetch("/api/notifications/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roles: ["candidate", "visitor"],
        type: "lecture",
        title: "הרצאה עודכנה",
        body: editForm.title,
        link: "/",
      }),
    });

    fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "lecture", description: `הרצאה עודכנה: ${editForm.title}` }) });

    // If recording or presentation was added, send additional notification
    if (editForm.recording_url || editForm.presentation_url) {
      await fetch("/api/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roles: ["candidate", "visitor"],
          type: "lecture",
          title: "תוכן חדש זמין",
          body: `הקלטה או מצגת נוספו להרצאה: ${editForm.title}`,
          link: "/",
        }),
      });
    }
  }

  async function handleCreate() {
    if (!newForm.title || !newForm.scheduled_date) {
      setError("שם ותאריך הם שדות חובה");
      return;
    }
    if (!newForm.cohort_id) {
      setError("יש לבחור מחזור");
      return;
    }
    setLoading(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: err } = await supabase.from("lectures").insert({
      lecture_number: newForm.lecture_number || null,
      title: newForm.title,
      description: newForm.description || null,
      scheduled_date: newForm.scheduled_date,
      start_time: newForm.start_time || null,
      end_time: newForm.end_time || null,
      location: newForm.location || "זום",
      lecturer: newForm.lecturer || null,
      recording_url: newForm.recording_url || null,
      presentation_url: newForm.presentation_url || null,
      cohort_id: newForm.cohort_id,
      created_by: user.id,
    });

    if (err) {
      setError("שגיאה ביצירת הרצאה");
      setLoading(false);
      return;
    }

    const activeCohortId = cohorts.find((c) => c.is_active)?.id;
    setNewForm({ location: "זום", cohort_id: activeCohortId });
    setShowNew(false);
    setLoading(false);
    loadLectures();

    // Notify candidates + visitors about the new lecture
    await fetch("/api/notifications/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roles: ["candidate", "visitor"],
        type: "lecture",
        title: "הרצאה חדשה נוספה",
        body: newForm.title,
        link: "/",
      }),
    });

    fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "lecture", description: `הרצאה חדשה: ${newForm.title}` }) });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#1a2744]">ניהול הרצאות</h1>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">מחזור:</label>
          <select
            value={filterCohortId}
            onChange={(e) => setFilterCohortId(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
          >
            <option value="">כל המחזורים</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.is_active ? " · פעיל" : ""}
              </option>
            ))}
          </select>
          {!showNew && (
            <button
              onClick={() => setShowNew(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-[#22c55e] px-4 py-2 text-sm font-medium text-white hover:bg-[#16a34a] transition-colors"
            >
              + הרצאה חדשה
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {showNew && (
        <Card className="border-0 shadow-sm ring-2 ring-[#22c55e]/30">
          <CardHeader>
            <CardTitle className="text-base text-[#1a2744]">הרצאה חדשה</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">מחזור *</label>
                <select
                  value={newForm.cohort_id ?? ""}
                  onChange={(e) => setNewForm({ ...newForm, cohort_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                >
                  <option value="">בחרו מחזור</option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.is_active ? " · פעיל" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">מספר</label>
                <input
                  type="number"
                  value={newForm.lecture_number ?? ""}
                  onChange={(e) => setNewForm({ ...newForm, lecture_number: Number(e.target.value) || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">שם ההרצאה *</label>
                <input
                  type="text"
                  value={newForm.title ?? ""}
                  onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">תאריך *</label>
                <input
                  type="date"
                  value={newForm.scheduled_date ?? ""}
                  onChange={(e) => setNewForm({ ...newForm, scheduled_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">שעת התחלה</label>
                <input
                  type="time"
                  value={newForm.start_time ?? ""}
                  onChange={(e) => setNewForm({ ...newForm, start_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">שעת סיום</label>
                <input
                  type="time"
                  value={newForm.end_time ?? ""}
                  onChange={(e) => setNewForm({ ...newForm, end_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">מיקום</label>
                <select
                  value={newForm.location ?? "זום"}
                  onChange={(e) => setNewForm({ ...newForm, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                >
                  <option value="זום">זום</option>
                  <option value="פרונטלי">פרונטלי</option>
                  <option value="PWC">PWC</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">מרצה</label>
                <input
                  type="text"
                  value={newForm.lecturer ?? ""}
                  onChange={(e) => setNewForm({ ...newForm, lecturer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">תיאור</label>
                <textarea
                  value={newForm.description ?? ""}
                  onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">קישור להקלטה</label>
                <input
                  type="url"
                  value={newForm.recording_url ?? ""}
                  onChange={(e) => setNewForm({ ...newForm, recording_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                  dir="ltr"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">קישור למצגת</label>
                <input
                  type="url"
                  value={newForm.presentation_url ?? ""}
                  onChange={(e) => setNewForm({ ...newForm, presentation_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                  dir="ltr"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => { setShowNew(false); setNewForm({ location: "זום" }); setError(""); }}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                <X className="size-4" />
                ביטול
              </button>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="inline-flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-white bg-[#22c55e] rounded-lg hover:bg-[#16a34a] disabled:opacity-50 transition-colors"
              >
                <Check className="size-4" />
                צור הרצאה
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {visibleLectures.length === 0 && lectures.length > 0 && (
          <p className="text-center text-sm text-gray-400 py-6">
            אין הרצאות במחזור שנבחר
          </p>
        )}
        {visibleLectures.map((l) =>
          editingId === l.id ? (
            <Card key={l.id} className="border-0 shadow-sm ring-2 ring-[#22c55e]/30">
              <CardContent className="pt-0 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      מחזור
                    </label>
                    <select
                      value={editForm.cohort_id ?? ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, cohort_id: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                    >
                      <option value="">בחרו מחזור</option>
                      {cohorts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                          {c.is_active ? " · פעיל" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      מספר
                    </label>
                    <input
                      type="number"
                      value={editForm.lecture_number ?? ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, lecture_number: Number(e.target.value) || null })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      שם ההרצאה
                    </label>
                    <input
                      type="text"
                      value={editForm.title ?? ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, title: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      תאריך
                    </label>
                    <input
                      type="date"
                      value={editForm.scheduled_date ?? ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, scheduled_date: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      שעת התחלה
                    </label>
                    <input
                      type="time"
                      value={editForm.start_time ?? ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, start_time: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      שעת סיום
                    </label>
                    <input
                      type="time"
                      value={editForm.end_time ?? ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, end_time: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      מיקום
                    </label>
                    <select
                      value={editForm.location ?? "zoom"}
                      onChange={(e) =>
                        setEditForm({ ...editForm, location: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                    >
                      <option value="זום">זום</option>
                      <option value="פרונטלי">פרונטלי</option>
                      <option value="PWC">PWC</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      מרצה
                    </label>
                    <input
                      type="text"
                      value={editForm.lecturer ?? ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, lecturer: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      תיאור
                    </label>
                    <textarea
                      value={editForm.description ?? ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, description: e.target.value })
                      }
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      קישור להקלטה
                    </label>
                    <input
                      type="url"
                      value={editForm.recording_url ?? ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, recording_url: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                      dir="ltr"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      קישור למצגת
                    </label>
                    <input
                      type="url"
                      value={editForm.presentation_url ?? ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, presentation_url: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                      dir="ltr"
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">
                    חומרים נוספים (קבצים וקישורים)
                  </label>
                  <LectureResourcesSection lectureId={l.id} editable />
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={cancelEdit}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <X className="size-4" />
                    ביטול
                  </button>
                  <button
                    onClick={() => saveEdit(l.id)}
                    disabled={loading}
                    className="inline-flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-white bg-[#22c55e] rounded-lg hover:bg-[#16a34a] disabled:opacity-50 transition-colors"
                  >
                    <Check className="size-4" />
                    שמור
                  </button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card key={l.id} className="border-0 shadow-sm">
              <CardContent className="flex items-start gap-4 pt-0">
                {/* Number badge */}
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#1a2744] text-white text-sm font-bold">
                  {l.lecture_number || "#"}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-[#1a2744]">{l.title}</p>
                    {l.cohort?.name && (
                      <Badge variant="secondary" className="text-[10px]">
                        {l.cohort.name}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">
                      {formatDate(l.scheduled_date)}
                    </span>
                    {l.start_time && l.end_time && (
                      <span className="text-xs text-gray-400" dir="ltr">
                        {l.start_time.slice(0, 5)} - {l.end_time.slice(0, 5)}
                      </span>
                    )}
                    {l.lecturer && (
                      <span className="text-xs text-gray-400">
                        {l.lecturer}
                      </span>
                    )}
                    {l.location && (
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        {l.location === "זום" ? (
                          <VideoIcon className="size-3" />
                        ) : (
                          <MapPin className="size-3" />
                        )}
                        {l.location}
                      </Badge>
                    )}
                  </div>
                  {l.description && (
                    <p className="text-xs text-gray-400 mt-1 whitespace-pre-line line-clamp-2">
                      {l.description}
                    </p>
                  )}
                  {(l.recording_url || l.presentation_url) && (
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {l.recording_url && (
                        <a
                          href={l.recording_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#22c55e] hover:underline"
                        >
                          <VideoIcon className="size-3" />
                          הקלטה
                          <ExternalLink className="size-3" />
                        </a>
                      )}
                      {l.presentation_url && (
                        <a
                          href={l.presentation_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#22c55e] hover:underline"
                        >
                          <FileText className="size-3" />
                          מצגת
                          <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => startEdit(l)}
                    className="p-2 text-gray-400 hover:text-[#1a2744] transition-colors rounded-lg hover:bg-gray-100"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(l.id, l.title)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );
}
