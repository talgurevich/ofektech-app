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

export function goalStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    yes: "כן",
    partially: "חלקית",
    no: "לא",
  };
  return labels[status] || status;
}
