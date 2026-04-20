"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Eye, ChevronDown, type LucideIcon } from "lucide-react";
import { WORKBOOK_SHEETS } from "@/lib/workbook";
import {
  Mic2,
  BookOpen,
  ListTodo,
  Table2,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Option = { href: string; label: string; icon: LucideIcon };

const seeOptions: Option[] = [
  { href: "/lectures", label: "סילבוס", icon: Mic2 },
  { href: "/guide", label: "מדריך התוכנית", icon: BookOpen },
  { href: "/tasks", label: "משימות", icon: ListTodo },
  { href: "/workbook", label: "חוברת עבודה", icon: Table2 },
  { href: "/profile", label: "הפרופיל שלי", icon: UserCircle },
];

const createOptions: Option[] = WORKBOOK_SHEETS.map((s) => ({
  href: `/workbook?sheet=${s.key}`,
  label: s.label,
  icon: s.icon,
}));

export function DashboardActions() {
  const [open, setOpen] = useState<"create" | "see" | null>(null);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ActionButton
          label="יצירה"
          sublabel="הוספת שורה לחוברת העבודה"
          icon={Plus}
          color="green"
          active={open === "create"}
          onClick={() => setOpen(open === "create" ? null : "create")}
        />
        <ActionButton
          label="תצוגה"
          sublabel="מעבר לסעיף בתפריט"
          icon={Eye}
          color="navy"
          active={open === "see"}
          onClick={() => setOpen(open === "see" ? null : "see")}
        />
      </div>

      {open === "create" && (
        <OptionsGrid title="לאיזה גיליון בחוברת העבודה?" options={createOptions} />
      )}
      {open === "see" && (
        <OptionsGrid title="לאן ללכת?" options={seeOptions} />
      )}
    </div>
  );
}

function ActionButton({
  label,
  sublabel,
  icon: Icon,
  color,
  active,
  onClick,
}: {
  label: string;
  sublabel: string;
  icon: LucideIcon;
  color: "green" | "navy";
  active: boolean;
  onClick: () => void;
}) {
  const base = "group flex w-full items-center gap-4 rounded-2xl p-5 md:p-6 text-right shadow-sm transition-all hover:shadow-md";
  const palette =
    color === "green"
      ? "bg-gradient-to-l from-[#22c55e] to-[#16a34a] text-white"
      : "bg-gradient-to-l from-[#1a2744] to-[#2a3a5c] text-white";

  return (
    <button
      onClick={onClick}
      className={cn(base, palette, active && "ring-2 ring-offset-2", active && (color === "green" ? "ring-[#22c55e]" : "ring-[#1a2744]"))}
    >
      <div className="flex size-12 md:size-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm shrink-0">
        <Icon className="size-6 md:size-7" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xl md:text-2xl font-bold">{label}</p>
        <p className="text-xs md:text-sm text-white/80 mt-0.5">{sublabel}</p>
      </div>
      <ChevronDown className={cn("size-5 shrink-0 transition-transform", active && "rotate-180")} />
    </button>
  );
}

function OptionsGrid({ title, options }: { title: string; options: Option[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-500 mb-3">{title}</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {options.map((opt) => {
          const Icon = opt.icon;
          return (
            <Link
              key={opt.href}
              href={opt.href}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-[#22c55e] hover:bg-[#22c55e]/5 hover:text-[#22c55e]"
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{opt.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
