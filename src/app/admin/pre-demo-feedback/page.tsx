import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MessageSquare, Copy } from "lucide-react";

type Row = {
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
  venture?: { name: string } | null;
};

const TOPICS: {
  ratingKey: keyof Row;
  commentKey: keyof Row;
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

const ROLE_LABELS: Record<string, string> = {
  mentor: "מנטור",
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

export default async function AdminPreDemoFeedbackPage() {
  const supabase = await createClient();

  const [{ data: rowsRaw }, { data: ventures }] = await Promise.all([
    supabase
      .from("pre_demo_feedback")
      .select("*, venture:ventures(name)")
      .order("created_at", { ascending: false }),
    supabase.from("ventures").select("id, name").order("name"),
  ]);

  const rows = (rowsRaw ?? []) as Row[];

  const byVenture = new Map<string, Row[]>();
  for (const r of rows) {
    const arr = byVenture.get(r.venture_id) ?? [];
    arr.push(r);
    byVenture.set(r.venture_id, arr);
  }

  const ventureList = (ventures ?? []).sort((a, b) => {
    const ca = byVenture.get(a.id)?.length ?? 0;
    const cb = byVenture.get(b.id)?.length ?? 0;
    return cb - ca;
  });

  const publicUrl = "/pre-demo";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2744]">משוב טרום־הדגמה</h1>
          <p className="text-sm text-gray-600 mt-1">
            משובים שנאספו דרך הקישור הפתוח ({rows.length} סה"כ)
          </p>
        </div>
        <Card className="min-w-0">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <span className="text-xs text-gray-500 whitespace-nowrap">
              קישור פתוח:
            </span>
            <code className="text-xs bg-gray-100 rounded px-2 py-1 truncate">
              {publicUrl}
            </code>
            <Copy className="size-4 text-gray-400" />
          </CardContent>
        </Card>
      </div>

      {ventureList.length === 0 ? (
        <p className="text-gray-500 text-sm">אין וונצ'רים.</p>
      ) : (
        <div className="space-y-6">
          {ventureList.map((v) => {
            const items = byVenture.get(v.id) ?? [];
            const averages = TOPICS.map((t) => ({
              label: t.label,
              value: avg(
                items.map((r) => r[t.ratingKey] as number).filter(Boolean)
              ),
            }));
            return (
              <Card key={v.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <CardTitle className="text-lg text-[#1a2744]">
                      {v.name}
                    </CardTitle>
                    <Badge variant="secondary">
                      {items.length} משובים
                    </Badge>
                  </div>
                  {items.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                      {averages.map((a) => (
                        <div
                          key={a.label}
                          className="rounded-md bg-gray-50 px-3 py-2"
                        >
                          <div className="text-[11px] text-gray-500">
                            {a.label}
                          </div>
                          <div className="text-sm font-semibold text-[#1a2744]">
                            {a.value == null ? "—" : a.value.toFixed(1)}
                            <span className="text-xs font-normal text-gray-400">
                              {" "}
                              / 5
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {items.length === 0 ? (
                    <p className="text-xs text-gray-400">אין משובים.</p>
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
                                {ROLE_LABELS[r.reviewer_role] ?? r.reviewer_role}
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
                              <div
                                key={t.label}
                                className="rounded-md bg-gray-50 p-3"
                              >
                                <div className="text-xs text-gray-600 mb-1">
                                  {t.label}
                                </div>
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
          })}
        </div>
      )}
    </div>
  );
}
