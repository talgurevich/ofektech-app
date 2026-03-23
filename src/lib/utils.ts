/** Get the Monday of the current week */
export function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0];
}

/** Format a date string to Hebrew-friendly format */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("he-IL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Mood number to emoji */
export function moodLabel(mood: number): string {
  const labels = ["", "נמוך מאוד", "נמוך", "בסדר", "טוב", "מצוין"];
  return labels[mood] || "";
}

/** Goal status to Hebrew */
export function goalStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    yes: "כן",
    partially: "חלקית",
    no: "לא",
  };
  return labels[status] || status;
}
