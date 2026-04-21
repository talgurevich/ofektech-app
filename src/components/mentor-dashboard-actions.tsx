"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Eye,
  ChevronDown,
  ArrowRight,
  Briefcase,
  Mic2,
  BookOpen,
  Table2,
  MessageSquare,
  Users,
  type LucideIcon,
} from "lucide-react";
import { WORKBOOK_SHEETS } from "@/lib/workbook";
import { cn } from "@/lib/utils";

type VentureSummary = { id: string; name: string };
type Option = { href: string; label: string; icon: LucideIcon };

function createOptionsFor(ventureId: string): Option[] {
  return [
    {
      href: `/workbook?venture=${ventureId}&sheet=tasks`,
      label: "משימה חדשה",
      icon: WORKBOOK_SHEETS.find((s) => s.key === "tasks")!.icon,
    },
    {
      href: `/sessions/new?venture=${ventureId}`,
      label: "משוב אחרי פגישה",
      icon: MessageSquare,
    },
    ...WORKBOOK_SHEETS.filter((s) => s.key !== "tasks").map((s) => ({
      href: `/workbook?venture=${ventureId}&sheet=${s.key}`,
      label: s.label,
      icon: s.icon,
    })),
  ];
}

function seeOptionsFor(ventureId: string): Option[] {
  return [
    { href: `/workbook?venture=${ventureId}`, label: "חוברת עבודה של המיזם", icon: Table2 },
    { href: `/guide?venture=${ventureId}`, label: "מדריך המיזם", icon: BookOpen },
    { href: `/ventures/${ventureId}`, label: "פרטי המיזם", icon: Briefcase },
  ];
}

const globalSeeOptions: Option[] = [
  { href: "/lectures", label: "סילבוס", icon: Mic2 },
];

type Mode = "create" | "see";

export function MentorDashboardActions({ ventures }: { ventures: VentureSummary[] }) {
  const [open, setOpen] = useState<Mode | null>(null);
  const [selectedVentureId, setSelectedVentureId] = useState<string | null>(
    ventures.length === 1 ? ventures[0].id : null
  );

  function toggle(mode: Mode) {
    if (open === mode) {
      setOpen(null);
      if (ventures.length > 1) setSelectedVentureId(null);
    } else {
      setOpen(mode);
      if (ventures.length > 1) setSelectedVentureId(null);
    }
  }

  const hasVentures = ventures.length > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
      <div className="space-y-3">
        <ActionButton
          label="יצירה"
          sublabel={hasVentures ? "הוספת משימה או משוב" : "אין מיזמים משובצים"}
          icon={Plus}
          color="green"
          active={open === "create"}
          disabled={!hasVentures}
          onClick={() => toggle("create")}
        />
        {open === "create" && hasVentures && (
          <ActionPanel
            ventures={ventures}
            selectedVentureId={selectedVentureId}
            onSelectVenture={setSelectedVentureId}
            buildOptions={createOptionsFor}
            ventureTitle="לאיזה מיזם?"
            actionTitle="מה ליצור?"
          />
        )}
      </div>
      <div className="space-y-3">
        <ActionButton
          label="תצוגה"
          sublabel="מעבר לסעיף בתפריט"
          icon={Eye}
          color="navy"
          active={open === "see"}
          onClick={() => toggle("see")}
        />
        {open === "see" && (
          <SeePanel
            ventures={ventures}
            selectedVentureId={selectedVentureId}
            onSelectVenture={setSelectedVentureId}
          />
        )}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  sublabel,
  icon: Icon,
  color,
  active,
  disabled,
  onClick,
}: {
  label: string;
  sublabel: string;
  icon: LucideIcon;
  color: "green" | "navy";
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const base =
    "group flex w-full items-center gap-4 rounded-2xl p-5 md:p-6 text-right shadow-sm transition-all hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-sm";
  const palette =
    color === "green"
      ? "bg-gradient-to-l from-[#22c55e] to-[#16a34a] text-white"
      : "bg-gradient-to-l from-[#1a2744] to-[#2a3a5c] text-white";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        base,
        palette,
        active && "ring-2 ring-offset-2",
        active && (color === "green" ? "ring-[#22c55e]" : "ring-[#1a2744]")
      )}
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

function ActionPanel({
  ventures,
  selectedVentureId,
  onSelectVenture,
  buildOptions,
  ventureTitle,
  actionTitle,
}: {
  ventures: VentureSummary[];
  selectedVentureId: string | null;
  onSelectVenture: (id: string) => void;
  buildOptions: (ventureId: string) => Option[];
  ventureTitle: string;
  actionTitle: string;
}) {
  if (!selectedVentureId) {
    return (
      <VenturePicker
        ventures={ventures}
        title={ventureTitle}
        onSelect={onSelectVenture}
      />
    );
  }
  const venture = ventures.find((v) => v.id === selectedVentureId);
  return (
    <OptionsGrid
      title={`${actionTitle}${venture ? ` — ${venture.name}` : ""}`}
      options={buildOptions(selectedVentureId)}
      onBack={ventures.length > 1 ? () => onSelectVenture("") : undefined}
    />
  );
}

function SeePanel({
  ventures,
  selectedVentureId,
  onSelectVenture,
}: {
  ventures: VentureSummary[];
  selectedVentureId: string | null;
  onSelectVenture: (id: string) => void;
}) {
  const hasVentures = ventures.length > 0;

  if (hasVentures && !selectedVentureId) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
        <VenturePickerInline
          ventures={ventures}
          title="בחרו מיזם לתצוגה"
          onSelect={onSelectVenture}
        />
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-medium text-gray-500 mb-3">או פעולות כלליות</p>
          <div className="grid grid-cols-2 gap-2">
            {globalSeeOptions.map((opt) => (
              <OptionLink key={opt.href} option={opt} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const venture = hasVentures && selectedVentureId
    ? ventures.find((v) => v.id === selectedVentureId)
    : null;

  const ventureOptions = venture ? seeOptionsFor(venture.id) : [];
  const options = [...ventureOptions, ...globalSeeOptions];

  return (
    <OptionsGrid
      title={venture ? `לאן ללכת? — ${venture.name}` : "לאן ללכת?"}
      options={options}
      onBack={hasVentures && ventures.length > 1 ? () => onSelectVenture("") : undefined}
    />
  );
}

function VenturePicker({
  ventures,
  title,
  onSelect,
}: {
  ventures: VentureSummary[];
  title: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <VenturePickerInline ventures={ventures} title={title} onSelect={onSelect} />
    </div>
  );
}

function VenturePickerInline({
  ventures,
  title,
  onSelect,
}: {
  ventures: VentureSummary[];
  title: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-3">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ventures.map((v) => (
          <button
            key={v.id}
            onClick={() => onSelect(v.id)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 text-right transition-colors hover:border-[#22c55e] hover:bg-[#22c55e]/5 hover:text-[#22c55e]"
          >
            <Briefcase className="size-4 shrink-0" />
            <span className="truncate flex-1">{v.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function OptionsGrid({
  title,
  options,
  onBack,
}: {
  title: string;
  options: Option[];
  onBack?: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500">{title}</p>
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-[#22c55e] transition-colors"
          >
            <ArrowRight className="size-3" />
            החלפת מיזם
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => (
          <OptionLink key={opt.href} option={opt} />
        ))}
      </div>
    </div>
  );
}

function OptionLink({ option }: { option: Option }) {
  const Icon = option.icon;
  return (
    <Link
      href={option.href}
      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-[#22c55e] hover:bg-[#22c55e]/5 hover:text-[#22c55e]"
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{option.label}</span>
    </Link>
  );
}
