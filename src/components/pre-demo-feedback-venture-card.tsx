import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  PRE_DEMO_AXES,
  PRE_DEMO_ROLE_LABELS,
  PRE_DEMO_TOPIC_KEYS,
  ratingColumn,
  type PreDemoTopicKey,
} from "@/lib/pre-demo-topics";

export { PRE_DEMO_ROLE_LABELS };

export type PreDemoFeedbackRow = {
  id: string;
  venture_id: string;
  reviewer_name: string;
  reviewer_role: string | null;
  created_at: string;
} & Partial<Record<string, number | string | null>>;

function ratingOf(
  row: PreDemoFeedbackRow,
  topicKey: PreDemoTopicKey
): number | null {
  const v = row[ratingColumn(topicKey)];
  return typeof v === "number" ? v : null;
}

/** v1 rows predate the three-axis survey and carry none of the new ratings. */
function isLegacy(row: PreDemoFeedbackRow) {
  return PRE_DEMO_TOPIC_KEYS.every((k) => ratingOf(row, k) == null);
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={
            n <= value
              ? "size-3.5 fill-yellow-400 text-yellow-400"
              : "size-3.5 fill-transparent text-gray-300"
          }
        />
      ))}
      <span className="text-xs text-gray-500 ms-1">{value}/5</span>
    </div>
  );
}

export function PreDemoFeedbackVentureCard({
  ventureName,
  items,
}: {
  ventureName: string;
  items: PreDemoFeedbackRow[];
}) {
  const axisAverages = PRE_DEMO_AXES.map((axis) => ({
    key: axis.key,
    title: axis.title,
    value: avg(
      items.flatMap((r) =>
        axis.topics
          .map((t) => ratingOf(r, t.key))
          .filter((v): v is number => v != null)
      )
    ),
    topics: axis.topics.map((t) => ({
      label: t.label,
      value: avg(
        items
          .map((r) => ratingOf(r, t.key))
          .filter((v): v is number => v != null)
      ),
    })),
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-lg text-[#1a2744]">{ventureName}</CardTitle>
          <Badge variant="secondary">{items.length} משובים</Badge>
        </div>
        {items.length > 0 ? (
          <div className="grid sm:grid-cols-3 gap-3 mt-3">
            {axisAverages.map((axis) => (
              <div
                key={axis.key}
                className="rounded-md bg-gray-50 px-3 py-2 space-y-1.5"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-[#1a2744]">
                    {axis.title}
                  </span>
                  <span className="text-sm font-semibold text-[#1a2744]">
                    {axis.value == null ? "—" : axis.value.toFixed(1)}
                    <span className="text-xs font-normal text-gray-400">
                      {" "}
                      / 5
                    </span>
                  </span>
                </div>
                {axis.topics.map((t) => (
                  <div
                    key={t.label}
                    className="flex items-baseline justify-between gap-2 text-[11px] text-gray-500"
                  >
                    <span className="truncate">{t.label}</span>
                    <span className="tabular-nums text-gray-700">
                      {t.value == null ? "—" : t.value.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {items.length === 0 ? (
          <p className="text-xs text-gray-400">אין משובים עדיין.</p>
        ) : (
          items.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border border-gray-200 p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-[#1a2744]">
                    {r.reviewer_name}
                  </span>
                  {r.reviewer_role ? (
                    <Badge variant="outline" className="text-[11px]">
                      {PRE_DEMO_ROLE_LABELS[r.reviewer_role] ?? r.reviewer_role}
                    </Badge>
                  ) : null}
                </div>
                <span className="text-xs text-gray-500">
                  {formatDate(r.created_at)}
                </span>
              </div>

              {isLegacy(r) ? (
                <p className="text-xs text-gray-400">
                  משוב בפורמט הישן — ללא דירוגי הצירים.
                </p>
              ) : (
                <div className="grid sm:grid-cols-3 gap-3">
                  {PRE_DEMO_AXES.map((axis) => (
                    <div
                      key={axis.key}
                      className="rounded-md bg-gray-50 p-3 space-y-2"
                    >
                      <div className="text-xs font-semibold text-[#1a2744]">
                        {axis.title}
                      </div>
                      {axis.topics.map((t) => {
                        const rating = ratingOf(r, t.key);
                        return (
                          <div key={t.key}>
                            <div className="text-[11px] text-gray-600 mb-0.5">
                              {t.label}
                            </div>
                            {rating == null ? (
                              <span className="text-xs text-gray-400">—</span>
                            ) : (
                              <Stars value={rating} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
