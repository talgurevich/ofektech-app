import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function getCurrentWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  const weekStart = new Date(now.setDate(diff));
  return weekStart.toISOString().split("T")[0];
}

export function moodLabel(mood: number): string {
  const labels: Record<number, string> = {
    1: "מאוד נמוך",
    2: "נמוך",
    3: "בינוני",
    4: "טוב",
    5: "מצוין",
  };
  return labels[mood] || "";
}

export function formatRelativeHe(dateStr: string): string {
  const then = new Date(dateStr).getTime();
  const diff = Date.now() - then;
  if (!Number.isFinite(diff) || diff < 0) return formatDate(dateStr);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "עכשיו";
  if (min < 60) return `לפני ${min} דקות`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `לפני ${hr} שעות`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `לפני ${d} ימים`;
  return formatDate(dateStr);
}

export function goalStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    yes: "כן",
    partially: "חלקית",
    no: "לא",
  };
  return labels[status] || status;
}
