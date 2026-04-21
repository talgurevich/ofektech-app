import {
  Activity,
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
};

export function VentureActivityFeed({
  items,
  emptyLabel = "אין פעילות אחרונה",
}: {
  items: VentureActivity[];
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Activity className="size-4" />
        <span>{emptyLabel}</span>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const Icon = KIND_ICON[item.kind] || Activity;
        const tint = KIND_TINT[item.kind] || "text-gray-500";
        const actorName = item.actor?.full_name || "חבר מיזם";
        const rowLabel = typeof item.metadata?.row_label === "string"
          ? (item.metadata.row_label as string)
          : null;
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
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {formatRelativeHe(item.created_at)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
