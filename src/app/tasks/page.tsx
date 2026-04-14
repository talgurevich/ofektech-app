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
  List,
  GitCommitHorizontal,
  Briefcase,
  User,
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
  const [ventureId, setVentureId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState<"list" | "timeline">("list");

  // Form state
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [owner, setOwner] = useState("self");
  const [taskScope, setTaskScope] = useState<"personal" | "venture">("personal");

  const fetchTasks = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    // Get user's venture_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("venture_id")
      .eq("id", user.id)
      .single();

    const userVentureId = profile?.venture_id || null;
    setVentureId(userVentureId);

    // Fetch personal tasks + venture tasks
    let query = supabase.from("tasks").select("*");

    if (userVentureId) {
      query = query.or(`candidate_id.eq.${user.id},venture_id.eq.${userVentureId}`);
    } else {
      query = query.eq("candidate_id", user.id);
    }

    const { data } = await query
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

    const insertData: Record<string, unknown> = {
      description: description.trim(),
      owner,
      deadline: deadline || null,
      created_by: userId,
    };

    if (taskScope === "venture" && ventureId) {
      insertData.venture_id = ventureId;
      insertData.candidate_id = null;
    } else {
      insertData.candidate_id = userId;
      insertData.venture_id = null;
    }

    await supabase.from("tasks").insert(insertData);

    fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "task_created", description: `משימה חדשה: ${description.trim().slice(0, 50)}` }) });

    // Email notification to mentor + admin
    if (ventureId) {
      fetch("/api/email-notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "candidate_task", ventureId, description: description.trim().slice(0, 100) }) });
    }

    setDescription("");
    setDeadline("");
    setOwner("self");
    setTaskScope("personal");
    setShowForm(false);
    setSubmitting(false);
    fetchTasks();
  }

  async function toggleComplete(task: Task) {
    await supabase
      .from("tasks")
      .update({ completed: !task.completed })
      .eq("id", task.id);
    if (!task.completed) {
      fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "task_completed", description: `משימה הושלמה: ${task.description.slice(0, 50)}` }) });
    }
    fetchTasks();
  }

  async function deleteTask(taskId: string) {
    await supabase.from("tasks").delete().eq("id", taskId);
    fetchTasks();
  }

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <img src="/logo-icon.png" alt="טוען..." className="size-20 object-contain animate-spin" style={{ animationDuration: "2s" }} />
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

      {/* View toggle */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setView("list")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            view === "list"
              ? "bg-white text-[#1a2744] shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <List className="size-4" />
          רשימה
        </button>
        <button
          onClick={() => setView("timeline")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            view === "timeline"
              ? "bg-white text-[#1a2744] shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <GitCommitHorizontal className="size-4" />
          ציר זמן
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

              {/* Scope toggle */}
              {ventureId && (
                <div>
                  <label className="block text-sm font-medium text-[#1a2744] mb-2">
                    סוג משימה
                  </label>
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
                    <button
                      type="button"
                      onClick={() => setTaskScope("personal")}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        taskScope === "personal"
                          ? "bg-white text-[#1a2744] shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <User className="size-3.5" />
                      משימה אישית
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskScope("venture")}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        taskScope === "venture"
                          ? "bg-white text-[#1a2744] shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <Briefcase className="size-3.5" />
                      משימה למיזם
                    </button>
                  </div>
                </div>
              )}

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

      {view === "list" ? (
        <>
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
        </>
      ) : (
        <TaskTimeline
          tasks={tasks}
          onToggle={toggleComplete}
          onDelete={deleteTask}
        />
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
  const isVentureTask = !!task.venture_id;

  return (
    <div
      className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${
        task.completed ? "bg-gray-50/50 opacity-60" : "bg-gray-50/50"
      }`}
    >
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
          <Badge
            className={`text-[10px] border-0 ${
              isVentureTask
                ? "bg-[#1a2744]/10 text-[#1a2744]"
                : "bg-[#22c55e]/10 text-[#22c55e]"
            }`}
          >
            {isVentureTask ? (
              <><Briefcase className="size-2.5 ml-0.5" /> מיזם</>
            ) : (
              <><User className="size-2.5 ml-0.5" /> אישי</>
            )}
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

function TaskTimeline({
  tasks,
  onToggle,
  onDelete,
}: {
  tasks: Task[];
  onToggle: (task: Task) => void;
  onDelete: (id: string) => void;
}) {
  const today = new Date().toISOString().split("T")[0];

  const sorted = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const aDate = a.deadline || "9999-12-31";
    const bDate = b.deadline || "9999-12-31";
    return aDate.localeCompare(bDate);
  });

  const groups = new Map<string, Task[]>();
  sorted.forEach((task) => {
    const key = task.deadline || "no-date";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(task);
  });

  if (tasks.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-0">
          <p className="text-gray-400 text-sm py-8 text-center">
            אין משימות עדיין
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative">
      <div className="absolute right-[19px] top-0 bottom-0 w-0.5 bg-gray-200" />

      <div className="space-y-6">
        {Array.from(groups.entries()).map(([dateKey, groupTasks]) => {
          const isOverdue = dateKey !== "no-date" && dateKey < today && groupTasks.some((t) => !t.completed);
          const isPast = dateKey !== "no-date" && dateKey <= today;
          const noDate = dateKey === "no-date";

          return (
            <div key={dateKey} className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isOverdue
                      ? "bg-red-500 text-white"
                      : noDate
                        ? "bg-gray-300 text-white"
                        : isPast
                          ? "bg-[#1a2744] text-white"
                          : "bg-[#22c55e] text-white"
                  }`}
                >
                  {noDate ? (
                    <CalendarDays className="size-4" />
                  ) : (
                    new Date(dateKey).getDate()
                  )}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${isOverdue ? "text-red-600" : "text-[#1a2744]"}`}>
                    {noDate
                      ? "ללא תאריך יעד"
                      : formatDate(dateKey)}
                  </p>
                  {isOverdue && (
                    <p className="text-xs text-red-500">באיחור</p>
                  )}
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {groupTasks.length}
                </Badge>
              </div>

              <div className="mr-[19px] pr-8 space-y-2">
                {groupTasks.map((task) => {
                  const isVentureTask = !!task.venture_id;
                  return (
                    <div
                      key={task.id}
                      className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${
                        task.completed ? "bg-gray-50/50 opacity-60" : "bg-white shadow-sm border border-gray-100"
                      }`}
                    >
                      <button
                        onClick={() => onToggle(task)}
                        className="mt-0.5 shrink-0 focus:outline-none"
                      >
                        {task.completed ? (
                          <CheckCircle2 className="size-5 text-[#22c55e]" />
                        ) : (
                          <Circle className="size-5 text-gray-300 hover:text-[#22c55e] transition-colors" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            task.completed ? "text-gray-400 line-through" : "text-[#1a2744]"
                          }`}
                        >
                          {task.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[10px]">
                            {ownerLabel(task.owner)}
                          </Badge>
                          <Badge
                            className={`text-[10px] border-0 ${
                              isVentureTask
                                ? "bg-[#1a2744]/10 text-[#1a2744]"
                                : "bg-[#22c55e]/10 text-[#22c55e]"
                            }`}
                          >
                            {isVentureTask ? "מיזם" : "אישי"}
                          </Badge>
                        </div>
                      </div>
                      <button
                        onClick={() => onDelete(task.id)}
                        className="shrink-0 mt-0.5 p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors focus:outline-none"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
