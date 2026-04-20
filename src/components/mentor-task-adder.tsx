"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Plus, Loader2, X } from "lucide-react";

const ownerOptions = [
  { value: "מנטור", label: "מנטור" },
  { value: "המיזם", label: "המיזם" },
  { value: "צוות", label: "צוות" },
];

export function MentorTaskAdder({
  ventureId,
  mentorId,
}: {
  ventureId: string;
  mentorId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [owner, setOwner] = useState("מנטור");
  const [ventureMembers, setVentureMembers] = useState<{ id: string; full_name: string }[]>([]);

  useEffect(() => {
    async function loadMembers() {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("venture_id", ventureId);
      if (data) setVentureMembers(data);
    }
    loadMembers();
  }, [ventureId, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);

    // Append to the workbook "tasks" sheet (shared with entrepreneurs)
    const { data: maxRow } = await supabase
      .from("workbook_entries")
      .select("position")
      .eq("venture_id", ventureId)
      .eq("sheet_key", "tasks")
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const position = (maxRow?.position ?? -1) + 1;

    const today = new Date().toISOString().split("T")[0];
    await supabase.from("workbook_entries").insert({
      venture_id: ventureId,
      sheet_key: "tasks",
      position,
      created_by: mentorId,
      data: {
        task: description.trim(),
        assignee: owner,
        date: today,
        due_date: deadline || "",
        done: false,
      },
    });

    // Notify all venture members about new task
    for (const member of ventureMembers) {
      await fetch("/api/notifications/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: member.id,
          type: "task",
          title: "משימה חדשה מהמנטור",
          body: description.trim().slice(0, 100),
          link: "/workbook?sheet=tasks",
        }),
      });
    }

    fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "mentor_task", description: `מנטור הוסיף משימה: ${description.trim().slice(0, 50)}` }) });

    // Email notification
    fetch("/api/email-notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "mentor_task", ventureId, description: description.trim().slice(0, 100) }) });

    setDescription("");
    setDeadline("");
    setOwner("מנטור");
    setShowForm(false);
    setSubmitting(false);
    router.refresh();
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#22c55e] px-4 py-2 text-sm font-medium text-white hover:bg-[#16a34a] transition-colors"
      >
        <Plus className="size-4" />
        הוסף משימה למיזם
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-[#22c55e]/20 bg-white p-4 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-[#1a2744] mb-1">
            תיאור המשימה
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="מה צריך לעשות?"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 focus:border-[#22c55e] resize-none"
            rows={3}
            required
            dir="rtl"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-[#1a2744] mb-1">
              דדליין
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 focus:border-[#22c55e]"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1a2744] mb-1">
              אחראי
            </label>
            <select
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 focus:border-[#22c55e]"
              dir="rtl"
            >
              {ownerOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting || !description.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#22c55e] px-4 py-2 text-sm font-medium text-white hover:bg-[#16a34a] transition-colors disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            הוספה
          </button>
          <button
            type="button"
            onClick={() => {
              setShowForm(false);
              setDescription("");
              setDeadline("");
              setOwner("מנטור");
            }}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <X className="size-4" />
            ביטול
          </button>
        </div>
      </form>
    </div>
  );
}
