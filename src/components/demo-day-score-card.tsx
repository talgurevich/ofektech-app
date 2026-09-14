import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Star, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMO_DAY_TOPIC_LABELS } from "@/lib/demo-day-topics";
import type { VentureSummary } from "@/lib/demo-day-scoring";

// The venture's own Demo Day result. Averages only: per-judge rows and judge
// names stay on the owner-only admin page.

function Stars({ value }: { value: number }) {
  const rounded = Math.round(value);
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value.toFixed(2)} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={
            n <= rounded
              ? "size-4 fill-yellow-400 text-yellow-400"
              : "size-4 fill-transparent text-gray-300"
          }
        />
      ))}
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const pct = Math.max(0, Math.min(100, ((score - 1) / 4) * 100));
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{label}</span>
      <div className="w-28 sm:w-40 h-2 rounded-full bg-[#1a2744]/10 overflow-hidden shrink-0">
        <div
          className="h-full rounded-full bg-[#22c55e]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 text-end text-sm font-semibold text-[#1a2744] tabular-nums shrink-0">
        {score.toFixed(2)}
      </span>
    </div>
  );
}

export function DemoDayScoreCard({
  summary,
  rank,
}: {
  summary: VentureSummary;
  rank: { rank: number; of: number } | null;
}) {
  const isWinner = rank?.rank === 1;

  return (
    <Card
      className={cn(
        "border-0 shadow-md ring-1",
        isWinner
          ? "bg-gradient-to-br from-yellow-50 via-white to-yellow-50 ring-yellow-300"
          : "bg-gradient-to-br from-[#1a2744]/5 via-white to-[#22c55e]/5 ring-[#1a2744]/10"
      )}
    >
      <CardContent className="pt-0 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-[#1a2744]/10">
          <div
            className={cn(
              "flex size-12 items-center justify-center rounded-full shrink-0",
              isWinner ? "bg-yellow-400 text-[#1a2744]" : "bg-[#1a2744]/15 text-[#1a2744]"
            )}
          >
            <Trophy className="size-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-gray-500 tracking-wide">
              Demo Day
            </p>
            <p className="text-base font-semibold text-[#1a2744] leading-tight">
              ציון פאנל השופטים
            </p>
          </div>
        </div>

        {/* Headline */}
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-[#1a2744] tabular-nums">
                {summary.overall.toFixed(2)}
              </span>
              <span className="text-sm text-gray-500">/ 5</span>
            </div>
            <Stars value={summary.overall} />
          </div>
          {rank ? (
            <div>
              <p className="text-[11px] font-medium text-gray-500 tracking-wide">
                דירוג
              </p>
              <p className="text-2xl font-bold text-[#1a2744] leading-tight">
                מקום {rank.rank}
                <span className="text-sm font-normal text-gray-500">
                  {" "}
                  מתוך {rank.of}
                </span>
              </p>
            </div>
          ) : null}
          <p className="text-xs text-gray-500 ms-auto self-center">
            ממוצע של {summary.judgeCount} שופטים
          </p>
        </div>

        {/* Axes */}
        <div className="space-y-2">
          {summary.axes.map((a) => (
            <ScoreBar key={a.key} label={a.title} score={a.score} />
          ))}
        </div>

        {/* Per-criterion detail */}
        <details className="group">
          <summary className="flex items-center gap-1 cursor-pointer select-none text-sm text-[#22c55e] hover:underline list-none [&::-webkit-details-marker]:hidden">
            פירוט לפי קריטריון
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 space-y-2">
            {summary.topics.map((t) => (
              <ScoreBar
                key={t.key}
                label={DEMO_DAY_TOPIC_LABELS[t.key]}
                score={t.score}
              />
            ))}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
