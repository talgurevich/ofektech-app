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
  | "select";

export interface WorkbookColumn {
  key: string;
  label: string;
  type: WorkbookColumnType;
  options?: string[];
  placeholder?: string;
  width?: string;
}

export interface WorkbookSheet {
  key: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  columns: WorkbookColumn[];
}

export const WORKBOOK_SHEETS: WorkbookSheet[] = [
  {
    key: "tasks",
    label: "משימות צוות לביצוע",
    icon: ListTodo,
    description: "משימות לביצוע של הצוות, עם אחריות ותאריכי יעד",
    columns: [
      { key: "task", label: "משימה", type: "longtext", width: "minmax(200px,2fr)" },
      { key: "assignee", label: "אחראי ביצוע", type: "text" },
      { key: "date", label: "תאריך פתיחה", type: "date" },
      { key: "due_date", label: "תאריך לביצוע", type: "date" },
      { key: "done", label: "בוצע", type: "boolean", width: "90px" },
    ],
  },
  {
    key: "customers",
    label: "לקוחות",
    icon: Users,
    description: "לקוחות פוטנציאליים ופעילים",
    columns: [
      { key: "name", label: "שם לקוח", type: "text" },
      { key: "website", label: "אתר", type: "url" },
      { key: "description", label: "תיאור", type: "longtext", width: "minmax(200px,2fr)" },
      { key: "email", label: "דוא\"ל", type: "email" },
      { key: "phone", label: "טלפון", type: "phone" },
      { key: "contact", label: "איש קשר", type: "text" },
      { key: "channels", label: "דרכי גישה עדיפות ללקוח", type: "text" },
    ],
  },
  {
    key: "activity",
    label: "תיעוד פעילות",
    icon: Activity,
    description: "תיעוד פגישות, חיבורים ופעילות עסקית",
    columns: [
      { key: "date", label: "תאריך", type: "date" },
      {
        key: "type",
        label: "סוג פעילות",
        type: "select",
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
      { key: "description", label: "מה החברה עושה", type: "longtext", width: "minmax(200px,2fr)" },
      { key: "pricing", label: "תימחור שירות", type: "text" },
      { key: "metrics", label: "ביצועים", type: "text" },
      { key: "website", label: "אתר החברה", type: "url" },
    ],
  },
  {
    key: "investors",
    label: "משקיעים",
    icon: Wallet,
    description: "רשימת משקיעים פוטנציאליים",
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
