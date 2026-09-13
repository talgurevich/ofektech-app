// Ending (summary) questionnaire — option definitions shared by the
// candidate form and the admin views. Stored in `checkins` with
// `type = "ending"`.

export const PROTOTYPE_OPTIONS = [
  { value: "yes_product", label: "כן, יש מוצר עובד" },
  { value: "yes_prototype", label: "כן, יש אב-טיפוס" },
  { value: "no", label: "עדיין לא" },
] as const;

export const PILOT_OPTIONS = [
  { value: "yes_pilot", label: "כן, פיילוט מול משתמשים אמיתיים" },
  { value: "initial_test", label: "בדיקה ראשונית בלבד" },
  { value: "no", label: "עדיין לא" },
] as const;

export const CLARITY_OPTIONS = [
  { v: "1", label: "לא ברור", bg: "bg-red-100 text-red-700 ring-red-300" },
  { v: "2", label: "מעורפל", bg: "bg-orange-100 text-orange-700 ring-orange-300" },
  { v: "3", label: "בינוני", bg: "bg-yellow-100 text-yellow-700 ring-yellow-300" },
  { v: "4", label: "די ברור", bg: "bg-lime-100 text-lime-700 ring-lime-300" },
  { v: "5", label: "ברור מאוד", bg: "bg-green-100 text-green-700 ring-green-300" },
] as const;

export const CLARITY_COLORS: Record<number, string> = {
  1: "bg-red-100 text-red-700",
  2: "bg-orange-100 text-orange-700",
  3: "bg-yellow-100 text-yellow-700",
  4: "bg-lime-100 text-lime-700",
  5: "bg-green-100 text-green-700",
};

export function prototypeLabel(v: string | null | undefined) {
  return PROTOTYPE_OPTIONS.find((o) => o.value === v)?.label ?? v ?? null;
}

export function pilotLabel(v: string | null | undefined) {
  return PILOT_OPTIONS.find((o) => o.value === v)?.label ?? v ?? null;
}

export function clarityLabel(v: number | null | undefined) {
  if (v == null) return null;
  return CLARITY_OPTIONS.find((o) => Number(o.v) === v)?.label ?? String(v);
}

export const ENDING_CHECKIN_SELECT =
  "candidate_id, has_prototype, customers_spoken, pilot_status, value_prop_clarity, team_notes, submitted_at";
