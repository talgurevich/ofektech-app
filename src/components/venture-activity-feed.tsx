import {
  Activity,
  Briefcase,
  CheckCircle2,
  Circle,
  FileText,
  MessageSquare,
  Mic2,
  Table2,
  Trash2,
  UserCircle,
  type LucideIcon,
} from "lucide-react";
import type { ActivityKind, VentureActivity } from "@/lib/types";
import { formatRelativeHe } from "@/lib/utils";

const KIND_ICON: Record<ActivityKind, LucideIcon> = {
  workbook_added: Table2,
  workbook_updated: Table2,
  workbook_deleted: Trash2,
  workbook_task_done: CheckCircle2,
  workbook_task_reopened: Circle,
  profile_updated: UserCircle,
  guide_updated: FileText,
  lecture_feedback: Mic2,
  session_feedback: MessageSquare,
  meeting_summary_submitted: FileText,
};

const KIND_TINT: Record<ActivityKind, string> = {
  workbook_added: "text-[#22c55e]",
  workbook_updated: "text-[#1a2744]",
  workbook_deleted: "text-red-500",
  workbook_task_done: "text-[#22c55e]",
  workbook_task_reopened: "text-amber-500",
  profile_updated: "text-[#1a2744]",
  guide_updated: "text-indigo-500",
  lecture_feedback: "text-sky-500",
  session_feedback: "text-[#22c55e]",
  meeting_summary_submitted: "text-emerald-500",
};

// Collapse consecutive activities from the same actor with the same kind on
// the same venture (e.g. a burst of profile edits) into a single row showing
// the most recent timestamp and a "×N" badge.
function dedupe(items: VentureActivity[]): (VentureActivity & { repeats?: number })[] {
  const out: (VentureActivity & { repeats?: number })[] = [];
  for (const item of items) {
    const last = out[out.length - 1];
    if (
      last &&
      last.kind === item.kind &&
      last.actor_id === item.actor_id &&
      last.venture_id === item.venture_id &&
      last.summary === item.summary
    ) {
      last.repeats = (last.repeats ?? 1) + 1;
      continue;
    }
    out.push({ ...item });
  }
  return out;
}

export function VentureActivityFeed({
  items,
  emptyLabel = "אין פעילות אחרונה",
  showVenture = false,
}: {
  items: VentureActivity[];
  emptyLabel?: string;
  showVenture?: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Activity className="size-4" />
        <span>{emptyLabel}</span>
      </div>
    );
  }

  const collapsed = dedupe(items);

  return (
    <ul className="space-y-2">
      {collapsed.map((item) => {
        const Icon = KIND_ICON[item.kind] || Activity;
        const tint = KIND_TINT[item.kind] || "text-gray-500";
        const actorName = item.actor?.full_name || "חבר מיזם";
        const rowLabel =
          typeof item.metadata?.row_label === "string"
            ? (item.metadata.row_label as string)
            : null;
        const ventureName = showVenture ? item.venture?.name : null;
        return (
          <li key={item.id} className="flex items-start gap-2.5 text-xs">
            <Icon className={`size-4 shrink-0 mt-0.5 ${tint}`} />
            <div className="flex-1 min-w-0">
              <p className="text-[#1a2744] leading-snug">
                <span className="font-medium">{actorName}</span>{" "}
                <span className="text-gray-600">{item.summary}</span>
                {rowLabel && (
                  <span className="text-gray-400">{` — ${rowLabel}`}</span>
                )}
                {item.repeats && item.repeats > 1 && (
                  <span className="text-gray-400">{` × ${item.repeats}`}</span>
                )}
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <p className="text-[10px] text-gray-400">
                  {formatRelativeHe(item.created_at)}
                </p>
                {ventureName && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#1a2744]/5 px-1.5 py-0.5 text-[10px] text-[#1a2744]">
                    <Briefcase className="size-2.5" />
                    {ventureName}
                  </span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
