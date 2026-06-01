"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Cohort, TaskReviewStatus, WorkbookEntry } from "@/lib/types";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  Briefcase,
  ChevronLeft,
  Loader2,
  MessageSquare,
} from "lucide-react";
import {
  REVIEW_STATUS_BADGE,
  REVIEW_STATUS_LABEL,
} from "@/lib/task-review";
import { formatRelativeHe } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Row = WorkbookEntry & {
  venture: { id: string; name: string; cohort_id: string | null } | null;
  comment_count: number;
};

const UNASSIGNED_KEY = "__unassigned__";

export default function AdminTasksReviewPage() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Row[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [filterCohort, setFilterCohort] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<TaskReviewStatus | "">("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: entries }, { data: cohortData }] = await Promise.all([
      supabase
        .from("workbook_entries")
        .select("*, venture:ventures(id, name, cohort_id)")
        .eq("sheet_key", "tasks")
        .not("data->>review_status", "is", null)
        .order("updated_at", { ascending: false }),
      supabase
        .from("cohorts")
        .select("*")
        .order("created_at", { ascending: true }),
    ]);

    const baseRows = ((entries as unknown as Row[]) || []).filter((r) => {
      const status = r.data?.review_status;
      return status === "needs_correction" || status === "corrected";
    });

    if (baseRows.length > 0) {
      const ids = baseRows.map((r) => r.id);
      const { data: commentRows } = await supabase
        .from("task_comments")
        .select("entry_id")
        .in("entry_id", ids);
      const counts: Record<string, number> = {};
      for (const c of (commentRows || []) as { entry_id: string }[]) {
        counts[c.entry_id] = (counts[c.entry_id] || 0) + 1;
      }
      for (const r of baseRows) r.comment_count = counts[r.id] || 0;
    }

    setRows(baseRows);
    if (cohortData) setCohorts(cohortData);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleRows = rows.filter((r) => {
    if (filterStatus && r.data?.review_status !== filterStatus) return false;
    if (filterCohort) {
      const cohortId = r.venture?.cohort_id || UNASSIGNED_KEY;
      if (cohortId !== filterCohort) return false;
    }
    return true;
  });

  const correctedCount = rows.filter(
    (r) => r.data?.review_status === "corrected"
  ).length;
  const needsCount = rows.filter(
    (r) => r.data?.review_status === "needs_correction"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="size-6 text-[#1a2744]" />
          <h1 className="text-2xl font-bold text-[#1a2744]">ביקורות משימות</h1>
          <Badge variant="secondary">{rows.length}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === "corrected" ? "" : "corrected")}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filterStatus === "corrected"
                ? "bg-sky-500 text-white"
                : "bg-white ring-1 ring-sky-300 text-sky-700 hover:bg-sky-50"
            )}
          >
            <CheckCircle2 className="size-3" />
            ממתין לאישור ({correctedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === "needs_correction" ? "" : "needs_correction")}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filterStatus === "needs_correction"
                ? "bg-amber-500 text-white"
                : "bg-white ring-1 ring-amber-300 text-amber-700 hover:bg-amber-50"
            )}
          >
            <AlertTriangle className="size-3" />
            דורש תיקון ({needsCount})
          </button>
          <select
            value={filterCohort}
            onChange={(e) => setFilterCohort(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
          >
            <option value="">כל המחזורים</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.is_active ? " · פעיל" : ""}
              </option>
            ))}
            <option value={UNASSIGNED_KEY}>ללא מחזור</option>
          </select>
        </div>
      </div>

      <p className="text-sm text-gray-500">
        משימות במצב <span className="font-medium text-sky-700">"תוקן — ממתין לאישור"</span> דורשות סקירה חוזרת מצידכם. משימות במצב <span className="font-medium text-amber-700">"דורש תיקון"</span> ממתינות לטיפול של חברי המיזם.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : visibleRows.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="text-center py-12 text-sm text-gray-400 pt-0">
            אין משימות תחת ביקורת
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {visibleRows.map((row) => {
            const status = row.data?.review_status as TaskReviewStatus;
            const taskText =
              typeof row.data?.task === "string" ? row.data.task : "—";
            const assignee =
              typeof row.data?.assignee === "string" ? row.data.assignee : "";
            const ventureName = row.venture?.name || "מיזם";
            return (
              <Link
                key={row.id}
                href={`/workbook?venture=${row.venture_id}&sheet=tasks&openTask=${row.id}`}
                className="block"
              >
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="pt-0 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]",
                          REVIEW_STATUS_BADGE[status]
                        )}
                      >
                        {status === "needs_correction" ? (
                          <AlertTriangle className="size-3" />
                        ) : (
                          <CheckCircle2 className="size-3" />
                        )}
                        {REVIEW_STATUS_LABEL[status]}
                      </span>
                      <ChevronLeft className="size-4 text-gray-300" />
                    </div>
                    <p className="text-sm font-medium text-[#1a2744] line-clamp-3 whitespace-pre-wrap leading-relaxed">
                      {taskText}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Briefcase className="size-3" />
                        {ventureName}
                      </span>
                      {assignee && (
                        <span className="text-gray-400">· אחראי: {assignee}</span>
                      )}
                      {row.comment_count > 0 && (
                        <span className="inline-flex items-center gap-1 text-[#1a2744]">
                          <MessageSquare className="size-3" />
                          {row.comment_count}
                        </span>
                      )}
                      <span className="text-gray-400 mr-auto">
                        {formatRelativeHe(row.updated_at)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
