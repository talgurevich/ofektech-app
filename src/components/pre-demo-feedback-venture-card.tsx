import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MessageSquare } from "lucide-react";
import { formatDate } from "@/lib/utils";

export type PreDemoFeedbackRow = {
  id: string;
  venture_id: string;
  reviewer_name: string;
  reviewer_role: string | null;
  problem_clarity_rating: number;
  problem_clarity_comment: string | null;
  solution_conviction_rating: number;
  solution_conviction_comment: string | null;
  market_opportunity_rating: number;
  market_opportunity_comment: string | null;
  presentation_quality_rating: number;
  presentation_quality_comment: string | null;
  biggest_strength: string | null;
  top_improvement: string | null;
  created_at: string;
};

const TOPICS: {
  ratingKey: keyof PreDemoFeedbackRow;
  commentKey: keyof PreDemoFeedbackRow;
  label: string;
}[] = [
  {
    ratingKey: "problem_clarity_rating",
    commentKey: "problem_clarity_comment",
    label: "בהירות הבעיה",
  },
  {
    ratingKey: "solution_conviction_rating",
    commentKey: "solution_conviction_comment",
    label: "עוצמת הפתרון",
  },
  {
    ratingKey: "market_opportunity_rating",
    commentKey: "market_opportunity_comment",
    label: "שוק/הזדמנות",
  },
  {
    ratingKey: "presentation_quality_rating",
    commentKey: "presentation_quality_comment",
    label: "איכות המצגת",
  },
];

export const PRE_DEMO_ROLE_LABELS: Record<string, string> = {
  mentor: "מנטור",
  professional_mentor: "מנטור מקצועי",
  investor: "משקיע",
  peer: "יזם עמית",
  staff: "צוות OfekTech",
  other: "אחר",
};

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
              ? "size-4 fill-yellow-400 text-yellow-400"
              : "size-4 fill-transparent text-gray-300"
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
  const averages = TOPICS.map((t) => ({
    label: t.label,
    value: avg(items.map((r) => r[t.ratingKey] as number).filter(Boolean)),
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-lg text-[#1a2744]">{ventureName}</CardTitle>
          <Badge variant="secondary">{items.length} משובים</Badge>
        </div>
        {items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
            {averages.map((a) => (
              <div key={a.label} className="rounded-md bg-gray-50 px-3 py-2">
                <div className="text-[11px] text-gray-500">{a.label}</div>
                <div className="text-sm font-semibold text-[#1a2744]">
                  {a.value == null ? "—" : a.value.toFixed(1)}
                  <span className="text-xs font-normal text-gray-400"> / 5</span>
                </div>
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

              <div className="grid sm:grid-cols-2 gap-3">
                {TOPICS.map((t) => {
                  const rating = r[t.ratingKey] as number;
                  const comment = r[t.commentKey] as string | null;
                  return (
                    <div key={t.label} className="rounded-md bg-gray-50 p-3">
                      <div className="text-xs text-gray-600 mb-1">{t.label}</div>
                      <Stars value={rating} />
                      {comment ? (
                        <p className="text-xs text-gray-700 mt-2 whitespace-pre-wrap">
                          {comment}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {(r.biggest_strength || r.top_improvement) && (
                <div className="grid sm:grid-cols-2 gap-3 pt-1">
                  {r.biggest_strength ? (
                    <div className="rounded-md border border-green-100 bg-green-50/50 p-3">
                      <div className="flex items-center gap-1 text-xs font-medium text-green-800 mb-1">
                        <MessageSquare className="size-3" />
                        חוזק גדול
                      </div>
                      <p className="text-xs text-gray-700 whitespace-pre-wrap">
                        {r.biggest_strength}
                      </p>
                    </div>
                  ) : null}
                  {r.top_improvement ? (
                    <div className="rounded-md border border-amber-100 bg-amber-50/50 p-3">
                      <div className="flex items-center gap-1 text-xs font-medium text-amber-800 mb-1">
                        <MessageSquare className="size-3" />
                        לשפר לפני יום ההדגמה
                      </div>
                      <p className="text-xs text-gray-700 whitespace-pre-wrap">
                        {r.top_improvement}
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
