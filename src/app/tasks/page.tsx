"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ListTodo,
  Trash2,
  Plus,
  CalendarDays,
  CheckCircle2,
  Circle,
  Loader2,
} from "lucide-react";
import type { Task } from "@/lib/types";

const ownerOptions = [
  { value: "self", label: "אני" },
  { value: "mentor", label: "מנטור" },
  { value: "team", label: "צוות" },
];

function ownerLabel(owner: string) {
  return ownerOptions.find((o) => o.value === owner)?.label || owner;
}

export default function TasksPage() {
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [owner, setOwner] = useState("self");

  const fetchTasks = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("candidate_id", user.id)
      .order("completed", { ascending: true })
      .order("deadline", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    setTasks((data as Task[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const openTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || !userId) return;
    setSubmitting(true);

    await supabase.from("tasks").insert({
      candidate_id: userId,
      description: description.trim(),
      owner,
      deadline: deadline || null,
      created_by: userId,
    });

    setDescription("");
    setDeadline("");
    setOwner("self");
    setShowForm(false);
    setSubmitting(false);
    fetchTasks();
  }

  async function toggleComplete(task: Task) {
    await supabase
      .from("tasks")
      .update({ completed: !task.completed })
      .eq("id", task.id);
    fetchTasks();
  }

  async function deleteTask(taskId: string) {
    await supabase.from("tasks").delete().eq("id", taskId);
    fetchTasks();
  }

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto p-4 md:p-8 flex justify-center pt-20">
        <Loader2 className="size-6 animate-spin text-[#1a2744]" />
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1a2744] flex items-center gap-2">
          <ListTodo className="size-6" />
          משימות
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#22c55e] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#16a34a] transition-colors"
        >
          <Plus className="size-4" />
          משימה חדשה
        </button>
      </div>

      {/* New task form */}
      {showForm && (
        <Card className="border-0 shadow-sm ring-1 ring-[#22c55e]/20">
          <CardContent className="pt-0">
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div className="grid grid-cols-2 gap-4">
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

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting || !description.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#22c55e] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#16a34a] transition-colors disabled:opacity-50"
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
                  onClick={() => setShowForm(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  ביטול
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Open tasks */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1a2744] text-base">
            <Circle className="size-4" />
            משימות פתוחות
            {openTasks.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {openTasks.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {openTasks.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">
              אין משימות פתוחות
            </p>
          ) : (
            <div className="space-y-2">
              {openTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={toggleComplete}
                  onDelete={deleteTask}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed tasks */}
      {completedTasks.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-400 text-base">
              <CheckCircle2 className="size-4" />
              הושלמו
              <Badge variant="secondary" className="text-xs">
                {completedTasks.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completedTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={toggleComplete}
                  onDelete={deleteTask}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

function TaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: (task: Task) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${
        task.completed ? "bg-gray-50/50 opacity-60" : "bg-gray-50/50"
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task)}
        className="mt-0.5 shrink-0 focus:outline-none"
        aria-label={task.completed ? "סמן כלא הושלם" : "סמן כהושלם"}
      >
        {task.completed ? (
          <CheckCircle2 className="size-5 text-[#22c55e]" />
        ) : (
          <Circle className="size-5 text-gray-300 hover:text-[#22c55e] transition-colors" />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium ${
            task.completed
              ? "text-gray-400 line-through"
              : "text-[#1a2744]"
          }`}
        >
          {task.description}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <Badge
            variant="secondary"
            className="text-[10px]"
          >
            {ownerLabel(task.owner)}
          </Badge>
          {task.deadline && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <CalendarDays className="size-3" />
              {formatDate(task.deadline)}
            </span>
          )}
          <span className="text-xs text-gray-400">
            {formatDate(task.created_at)}
          </span>
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(task.id)}
        className="shrink-0 mt-0.5 p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors focus:outline-none"
        aria-label="מחק משימה"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
