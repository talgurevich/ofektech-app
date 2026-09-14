// Shared Demo Day score math. Used by the admin leaderboard and the candidate
// dashboard card, so both show the same numbers for the same rows.

import {
  DEMO_DAY_AXES,
  DEMO_DAY_TOPIC_KEYS,
  ratingColumn,
  type DemoDayTopicKey,
} from "@/lib/demo-day-topics";

export type ScoreRow = {
  id: string;
  venture_id: string;
  judge_name: string;
  judge_name_key: string;
  created_at: string;
  updated_at: string;
} & Record<`${DemoDayTopicKey}_rating`, number>;

export function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function stdev(values: number[]) {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

/** One judge's overall for one venture: mean of the 8 criteria, on 1–5. */
export function overallOf(row: ScoreRow) {
  return mean(DEMO_DAY_TOPIC_KEYS.map((k) => row[ratingColumn(k)]));
}

export type VentureSummary = {
  ventureId: string;
  judgeCount: number;
  /** Mean of judges' overalls, 1–5. */
  overall: number;
  axes: { key: string; title: string; score: number }[];
  topics: { key: DemoDayTopicKey; score: number }[];
};

/** Aggregate a venture's score rows into overall / per-axis / per-criterion means. */
export function summarizeVenture(
  ventureId: string,
  rows: ScoreRow[]
): VentureSummary {
  return {
    ventureId,
    judgeCount: rows.length,
    overall: mean(rows.map(overallOf)),
    axes: DEMO_DAY_AXES.map((axis) => ({
      key: axis.key,
      title: axis.title,
      score: mean(
        rows.flatMap((r) => axis.topics.map((t) => r[ratingColumn(t.key)]))
      ),
    })),
    topics: DEMO_DAY_TOPIC_KEYS.map((k) => ({
      key: k,
      score: mean(rows.map((r) => r[ratingColumn(k)])),
    })),
  };
}

/**
 * Rank ventures by raw overall, highest first. Only ventures with at least one
 * score are ranked. Returns a map venture_id → { rank, of }.
 */
export function rankVentures(rows: ScoreRow[]) {
  const byVenture = new Map<string, ScoreRow[]>();
  for (const r of rows) {
    const arr = byVenture.get(r.venture_id) ?? [];
    arr.push(r);
    byVenture.set(r.venture_id, arr);
  }
  const ordered = [...byVenture.entries()]
    .map(([id, vRows]) => ({ id, overall: mean(vRows.map(overallOf)) }))
    .sort((a, b) => b.overall - a.overall);
  const ranks = new Map<string, { rank: number; of: number }>();
  ordered.forEach((e, i) => ranks.set(e.id, { rank: i + 1, of: ordered.length }));
  return ranks;
}
