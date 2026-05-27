import type { LucideIcon } from "lucide-react";
import {
  ListTodo,
  Users,
  Activity,
  Swords,
  Wallet,
  LineChart,
} from "lucide-react";

export type WorkbookColumnType =
  | "text"
  | "longtext"
  | "number"
  | "date"
  | "boolean"
  | "url"
  | "email"
  | "phone"
  | "select"
  | "select_creatable"
  | "member"
  | "files";

export interface WorkbookColumn {
  key: string;
  label: string;
  type: WorkbookColumnType;
  options?: string[];
  placeholder?: string;
  width?: string;
  /** Read-only columns are rendered as static text (no editor). */
  readOnly?: boolean;
}

export interface WorkbookSheet {
  key: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  columns: WorkbookColumn[];
  tbd?: boolean;
}

export const WORKBOOK_SHEETS: WorkbookSheet[] = [
  {
    key: "tasks",
    label: "משימות צוות לביצוע",
    icon: ListTodo,
    description: "משימות לביצוע של הצוות, עם אחריות ותאריכי יעד",
    columns: [
      { key: "task", label: "משימה", type: "longtext", width: "minmax(200px,2fr)" },
      {
        key: "answer",
        label: "תשובה / מענה",
        type: "longtext",
        width: "minmax(200px,2fr)",
        placeholder: "כתבו כאן את התשובה למשימה...",
      },
      {
        key: "category",
        label: "קטגוריה",
        type: "select_creatable",
        options: ["מוצר", "עיסקי"],
        placeholder: "בחר או הוסף קטגוריה...",
      },
      { key: "assignee", label: "אחראי ביצוע", type: "member" },
      { key: "creator", label: "נוצר ע״י", type: "member", width: "120px", readOnly: true },
      { key: "date", label: "תאריך פתיחה", type: "date" },
      { key: "due_date", label: "תאריך לביצוע", type: "date" },
      { key: "attachments", label: "קבצים", type: "files", width: "100px" },
      { key: "done", label: "בוצע", type: "boolean", width: "90px" },
    ],
  },
  {
    key: "customers",
    label: "לקוחות",
    icon: Users,
    description: "לקוחות פוטנציאליים ופעילים",
    columns: [
      { key: "name", label: "שם חברה / לקוח", type: "text" },
      { key: "contact", label: "איש קשר", type: "text" },
      { key: "role", label: "תפקיד", type: "text" },
      { key: "email", label: "אימייל", type: "email" },
      { key: "phone", label: "טלפון / ווטסאפ", type: "phone" },
      { key: "segment", label: "סוג לקוח / סגמנט", type: "select_creatable" },
      {
        key: "pain",
        label: "צורך / כאב מרכזי עליהם נותנים מענה",
        type: "longtext",
        width: "minmax(240px,2fr)",
      },
      { key: "created_at", label: "נוצר ב", type: "text", readOnly: true, width: "140px" },
    ],
  },
  {
    key: "activity",
    label: "תיעוד פעילות",
    icon: Activity,
    description: "תיעוד פגישות, חיבורים ופעילות עסקית",
    tbd: true,
    columns: [
      { key: "date", label: "תאריך", type: "date" },
      {
        key: "type",
        label: "סוג פעילות",
        type: "select_creatable",
        options: ["פיתוח עיסקי", "מוצר", "כללי"],
      },
      { key: "summary", label: "סיכום פגישה / חיבור / פעילות", type: "longtext", width: "minmax(300px,3fr)" },
    ],
  },
  {
    key: "competitors",
    label: "מתחרים",
    icon: Swords,
    description: "מחקר מתחרים בשוק",
    columns: [
      { key: "name", label: "שם חברה", type: "text" },
      {
        key: "competitor_type",
        label: "סוג מתחרה",
        type: "select",
        options: [
          "פתרון ידני",
          "מתחרה עקיף",
          "מתחרה ישיר",
          "לא לעשות כלום",
          "ספק חיצוני",
          "כלים נפוצים",
        ],
      },
      { key: "description", label: "מה החברה עושה", type: "longtext", width: "minmax(200px,2fr)" },
      { key: "pricing", label: "מודל עסקי", type: "text" },
      { key: "website", label: "אתר החברה", type: "url" },
      { key: "notes", label: "הערות", type: "longtext", width: "minmax(200px,2fr)" },
      { key: "created_at", label: "נוצר ב", type: "text", readOnly: true, width: "140px" },
    ],
  },
  {
    key: "investors",
    label: "משקיעים",
    icon: Wallet,
    description: "רשימת משקיעים פוטנציאליים",
    tbd: true,
    columns: [
      { key: "name", label: "שם משקיע", type: "text" },
      { key: "website", label: "אתר", type: "url" },
      { key: "stage", label: "סוג / שלב", type: "text" },
      { key: "check_size", label: "גודל צ'ק", type: "text" },
      { key: "focus", label: "תחום התמחות", type: "text" },
      { key: "invested_during_crisis", label: "השקיע בתקופת משבר?", type: "boolean", width: "120px" },
      {
        key: "portfolio_vs_new",
        label: "השקעה חדשה או בפורטפוליו?",
        type: "select",
        options: ["השקעה חדשה", "פורטפוליו"],
      },
    ],
  },
  {
    key: "market",
    label: "מחקר גודל שוק",
    icon: LineChart,
    description: "מחקר גודל השוק: TAM / SAM / SOM",
    tbd: true,
    columns: [
      { key: "source", label: "שם מקור מידע", type: "text" },
      { key: "segment_name", label: "שם פלח השוק", type: "text" },
      { key: "segment_value", label: "שווי פלח השוק", type: "text" },
      { key: "som", label: "SOM", type: "text" },
      { key: "sam", label: "SAM", type: "text" },
      { key: "tam", label: "TAM", type: "text" },
      { key: "source_url", label: "כתובת מקור", type: "url" },
    ],
  },
];

export function getSheet(key: string): WorkbookSheet | undefined {
  return WORKBOOK_SHEETS.find((s) => s.key === key);
}
