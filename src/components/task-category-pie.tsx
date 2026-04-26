import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart } from "lucide-react";

const PALETTE = [
  "#22c55e",
  "#1a2744",
  "#f59e0b",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#ef4444",
  "#84cc16",
];

const UNCATEGORIZED = "ללא קטגוריה";

type TaskRow = {
  data: Record<string, unknown> | null;
};

type Slice = { label: string; count: number; color: string; pct: number };

function buildSlices(tasks: TaskRow[]): { slices: Slice[]; total: number } {
  const counts = new Map<string, number>();
  for (const row of tasks) {
    const data = (row.data || {}) as Record<string, unknown>;
    const raw = typeof data.category === "string" ? data.category.trim() : "";
    const label = raw || UNCATEGORIZED;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

  const slices: Slice[] = sorted.map(([label, count], i) => ({
    label,
    count,
    color: label === UNCATEGORIZED ? "#cbd5e1" : PALETTE[i % PALETTE.length],
    pct: total === 0 ? 0 : (count / total) * 100,
  }));

  return { slices, total };
}

function buildGradient(slices: Slice[]): string {
  if (slices.length === 0) return "#e5e7eb";
  if (slices.length === 1) return slices[0].color;
  let start = 0;
  const stops: string[] = [];
  for (const s of slices) {
    const end = start + s.pct;
    stops.push(`${s.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`);
    start = end;
  }
  return `conic-gradient(${stops.join(", ")})`;
}

export function TaskCategoryPie({
  tasks,
  title = "התפלגות משימות לפי קטגוריה",
}: {
  tasks: TaskRow[];
  title?: string;
}) {
  const { slices, total } = buildSlices(tasks);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#1a2744] text-base">
          <PieChart className="size-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            אין משימות להצגה
          </p>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div
              className="relative size-40 shrink-0 rounded-full"
              style={{ background: buildGradient(slices) }}
              aria-label="תרשים עוגה של משימות לפי קטגוריה"
            >
              <div className="absolute inset-6 rounded-full bg-white flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#1a2744] leading-none">
                    {total}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">משימות</p>
                </div>
              </div>
            </div>

            <ul className="flex-1 min-w-0 w-full space-y-2">
              {slices.map((s) => (
                <li
                  key={s.label}
                  className="flex items-center gap-2 text-sm"
                >
                  <span
                    className="size-3 shrink-0 rounded-sm"
                    style={{ background: s.color }}
                  />
                  <span className="text-[#1a2744] truncate flex-1 min-w-0">
                    {s.label}
                  </span>
                  <span className="text-gray-500 text-xs tabular-nums">
                    {s.count} · {s.pct.toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
