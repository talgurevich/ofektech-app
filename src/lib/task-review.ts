import type { TaskReviewStatus, WorkbookEntry } from "@/lib/types";

export function getReviewStatus(
  entry: Pick<WorkbookEntry, "data">
): TaskReviewStatus | null {
  const raw = entry.data?.review_status;
  if (raw === "needs_correction" || raw === "corrected") return raw;
  return null;
}

export const REVIEW_STATUS_LABEL: Record<TaskReviewStatus, string> = {
  needs_correction: "דורש תיקון",
  corrected: "תוקן — ממתין לאישור",
};

export const REVIEW_STATUS_BADGE: Record<TaskReviewStatus, string> = {
  needs_correction: "bg-amber-100 text-amber-700",
  corrected: "bg-sky-100 text-sky-700",
};

export const REVIEW_STATUS_ROW_TINT: Record<TaskReviewStatus, string> = {
  needs_correction: "bg-amber-50/40",
  corrected: "bg-sky-50/40",
};
