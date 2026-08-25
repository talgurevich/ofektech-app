"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Trophy, ChevronDown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEMO_DAY_AXES,
  DEMO_DAY_TOPICS,
  DEMO_DAY_TOPIC_KEYS,
  ratingColumn,
  type DemoDayTopicKey,
} from "@/lib/demo-day-topics";

export type ResultVenture = {
  id: string;
  name: string;
  members: string[];
};

export type ScoreRow = {
  id: string;
  venture_id: string;
  judge_name: string;
  judge_name_key: string;
  created_at: string;
  updated_at: string;
} & Record<`${DemoDayTopicKey}_rating`, number>;

type Mode = "raw" | "normalized";

// Two ventures within this many points (on the 1–5 scale) are close enough that
// judge-to-judge calibration, not the ventures, may be deciding the order.
const CLOSE_CALL_THRESHOLD = 0.15;

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdev(values: number[]) {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

function overallOf(row: ScoreRow) {
  return mean(DEMO_DAY_TOPIC_KEYS.map((k) => row[ratingColumn(k)]));
}

export function DemoDayResults({
  ventures,
  rows,
}: {
  ventures: ResultVenture[];
  rows: ScoreRow[];
}) {
  const [mode, setMode] = useState<Mode>("raw");
  const [openVentureId, setOpenVentureId] = useState<string | null>(null);

  const judges = useMemo(() => {
    const map = new Map<string, string>();
    // rows arrive newest-first, so the first spelling seen is the most recent one
    for (const r of rows) {
      if (!map.has(r.judge_name_key)) map.set(r.judge_name_key, r.judge_name);
    }
    return [...map.entries()]
      .map(([key, name]) => ({ key, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "he"));
  }, [rows]);

  const rowsByVenture = useMemo(() => {
    const map = new Map<string, ScoreRow[]>();
    for (const r of rows) {
      const arr = map.get(r.venture_id) ?? [];
      arr.push(r);
      map.set(r.venture_id, arr);
    }
    return map;
  }, [rows]);

  // Per-judge z-scores: a judge who rates everything 4–5 and one who caps at 3
  // otherwise contribute on different scales, which on a tight field can decide
  // first place by itself.
  const zByRowId = useMemo(() => {
    const byJudge = new Map<string, ScoreRow[]>();
    for (const r of rows) {
      const arr = byJudge.get(r.judge_name_key) ?? [];
      arr.push(r);
      byJudge.set(r.judge_name_key, arr);
    }
    const z = new Map<string, number>();
    for (const judgeRows of byJudge.values()) {
      const overalls = judgeRows.map(overallOf);
      const m = mean(overalls);
      const sd = stdev(overalls);
      judgeRows.forEach((r, i) => {
        z.set(r.id, sd === 0 ? 0 : (overalls[i] - m) / sd);
      });
    }
    return z;
  }, [rows]);

  const leaderboard = useMemo(() => {
    const entries = ventures.map((v) => {
      const vRows = rowsByVenture.get(v.id) ?? [];
      const overalls = vRows.map(overallOf);
      const axisScores = DEMO_DAY_AXES.map((axis) => ({
        key: axis.key,
        title: axis.title,
        score: mean(
          vRows.flatMap((r) => axis.topics.map((t) => r[ratingColumn(t.key)]))
        ),
      }));
      return {
        venture: v,
        judgeCount: vRows.length,
        raw: mean(overalls),
        normalized: mean(vRows.map((r) => zByRowId.get(r.id) ?? 0)),
        spread:
          overalls.length > 1 ? Math.max(...overalls) - Math.min(...overalls) : 0,
        axisScores,
      };
    });

    const scored = entries.filter((e) => e.judgeCount > 0);
    const unscored = entries.filter((e) => e.judgeCount === 0);

    scored.sort((a, b) =>
      mode === "raw" ? b.raw - a.raw : b.normalized - a.normalized
    );

    return { scored, unscored };
  }, [ventures, rowsByVenture, zByRowId, mode]);

  const closeCall =
    mode === "raw" &&
    leaderboard.scored.length > 1 &&
    leaderboard.scored[0].raw - leaderboard.scored[1].raw <
      CLOSE_CALL_THRESHOLD;

  const missing = useMemo(() => {
    const scoredPairs = new Set(rows.map((r) => `${r.judge_name_key}|${r.venture_id}`));
    let count = 0;
    for (const j of judges) {
      for (const v of ventures) {
        if (!scoredPairs.has(`${j.key}|${v.id}`)) count++;
      }
    }
    return count;
  }, [rows, judges, ventures]);

  function exportCsv() {
    const header = [
      "מיזם",
      "שופט",
      ...DEMO_DAY_TOPICS.map((t) => t.label),
      "ממוצע",
      "עודכן",
    ];
    const ventureName = new Map(ventures.map((v) => [v.id, v.name]));
    const lines = rows.map((r) =>
      [
        ventureName.get(r.venture_id) ?? r.venture_id,
        r.judge_name,
        ...DEMO_DAY_TOPIC_KEYS.map((k) => String(r[ratingColumn(k)])),
        overallOf(r).toFixed(2),
        r.updated_at,
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = "﻿" + [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "demo-day-scores.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-gray-500">
          עדיין לא התקבלו דירוגים מהשופטים.
          <br />
          הקישור לשופטים:{" "}
          <code className="bg-gray-100 rounded px-2 py-1">
            /demo-day-judges
          </code>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
          <button
            type="button"
            onClick={() => setMode("raw")}
            className={cn(
              "px-3 py-1.5 text-sm transition-colors",
              mode === "raw"
                ? "bg-[#1a2744] text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            )}
          >
            ממוצע גולמי
          </button>
          <button
            type="button"
            onClick={() => setMode("normalized")}
            className={cn(
              "px-3 py-1.5 text-sm transition-colors",
              mode === "normalized"
                ? "bg-[#1a2744] text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            )}
          >
            מנורמל לפי שופט
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            {judges.length} שופטים · {ventures.length} מיזמים
          </span>
          <Button type="button" variant="outline" onClick={exportCsv}>
            <Download className="size-4" />
            ייצוא CSV
          </Button>
        </div>
      </div>

      {mode === "normalized" ? (
        <p className="text-xs text-gray-500 -mt-3">
          ציון מנורמל (z-score): כל שופט מוצמד לממוצע ולפיזור שלו עצמו, כדי
          שנדיבות או קמצנות של שופט בודד לא תכריע. 0 = ממוצע אותו שופט.
        </p>
      ) : null}

      {closeCall ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900">
            המקום הראשון והשני צמודים (פער של{" "}
            {(leaderboard.scored[0].raw - leaderboard.scored[1].raw).toFixed(2)}{" "}
            נקודות). כדאי להשוות מול התצוגה המנורמלת לפני שמכריזים.
          </p>
        </div>
      ) : null}

      {missing > 0 ? (
        <p className="text-xs text-gray-500">
          חסרים {missing} כרטיסי ניקוד להשלמה מלאה (כל שופט × כל מיזם) — ראו
          טבלת ההשלמה למטה.
        </p>
      ) : null}

      {/* Leaderboard */}
      <div className="space-y-3">
        {leaderboard.scored.map((entry, index) => {
          const isOpen = openVentureId === entry.venture.id;
          const vRows = rowsByVenture.get(entry.venture.id) ?? [];
          const next = leaderboard.scored[index + 1];
          const gap = next
            ? mode === "raw"
              ? entry.raw - next.raw
              : entry.normalized - next.normalized
            : null;

          return (
            <Card
              key={entry.venture.id}
              className={cn(index === 0 && "border-yellow-300 bg-yellow-50/40")}
            >
              <CardContent className="py-4">
                <button
                  type="button"
                  onClick={() =>
                    setOpenVentureId(isOpen ? null : entry.venture.id)
                  }
                  className="w-full flex items-center gap-4 text-start"
                >
                  <div
                    className={cn(
                      "size-9 shrink-0 rounded-full flex items-center justify-center font-bold text-sm",
                      index === 0
                        ? "bg-yellow-400 text-[#1a2744]"
                        : index === 1
                          ? "bg-gray-300 text-[#1a2744]"
                          : index === 2
                            ? "bg-amber-600/70 text-white"
                            : "bg-gray-100 text-gray-600"
                    )}
                  >
                    {index === 0 ? (
                      <Trophy className="size-4" />
                    ) : (
                      index + 1
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-[#1a2744] truncate">
                      {entry.venture.name}
                    </h3>
                    {entry.venture.members.length > 0 ? (
                      <p className="text-xs text-gray-500 truncate">
                        {entry.venture.members.join(", ")}
                      </p>
                    ) : null}
                  </div>

                  <div className="text-end shrink-0">
                    <div className="text-lg font-bold text-[#1a2744]">
                      {mode === "raw"
                        ? entry.raw.toFixed(2)
                        : (entry.normalized >= 0 ? "+" : "") +
                          entry.normalized.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {entry.judgeCount} שופטים
                      {gap !== null ? ` · פער ${gap.toFixed(2)}` : ""}
                    </div>
                  </div>

                  <ChevronDown
                    className={cn(
                      "size-4 text-gray-400 shrink-0 transition-transform",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>

                {/* Axis summary */}
                <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 ps-13 text-xs text-gray-600">
                  {entry.axisScores.map((a) => (
                    <span key={a.key}>
                      {a.title}:{" "}
                      <span className="font-semibold text-[#1a2744]">
                        {a.score.toFixed(2)}
                      </span>
                    </span>
                  ))}
                  {entry.spread >= 1.5 ? (
                    <span className="text-amber-700">
                      פיזור בין שופטים: {entry.spread.toFixed(2)}
                    </span>
                  ) : null}
                </div>

                {isOpen ? (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-start py-2 pe-3 font-medium text-gray-600 whitespace-nowrap">
                            שופט
                          </th>
                          {DEMO_DAY_TOPICS.map((t) => (
                            <th
                              key={t.key}
                              className="py-2 px-2 font-medium text-gray-600 text-center min-w-24"
                            >
                              {t.label}
                            </th>
                          ))}
                          <th className="py-2 ps-3 font-medium text-gray-600 text-center whitespace-nowrap">
                            ממוצע
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {vRows.map((r) => (
                          <tr
                            key={r.id}
                            className="border-b border-gray-100 last:border-0"
                          >
                            <td className="py-2 pe-3 whitespace-nowrap font-medium text-[#1a2744]">
                              {r.judge_name}
                            </td>
                            {DEMO_DAY_TOPIC_KEYS.map((k) => (
                              <td key={k} className="py-2 px-2 text-center">
                                {r[ratingColumn(k)]}
                              </td>
                            ))}
                            <td className="py-2 ps-3 text-center font-semibold">
                              {overallOf(r).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50">
                          <td className="py-2 pe-3 font-semibold text-gray-600">
                            ממוצע
                          </td>
                          {DEMO_DAY_TOPIC_KEYS.map((k) => (
                            <td
                              key={k}
                              className="py-2 px-2 text-center font-semibold"
                            >
                              {mean(
                                vRows.map((r) => r[ratingColumn(k)])
                              ).toFixed(2)}
                            </td>
                          ))}
                          <td className="py-2 ps-3 text-center font-bold text-[#1a2744]">
                            {entry.raw.toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}

        {leaderboard.unscored.length > 0 ? (
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">טרם דורגו:</span>{" "}
                {leaderboard.unscored.map((e) => e.venture.name).join(", ")}
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Completeness grid */}
      <Card>
        <CardContent className="py-4">
          <h2 className="font-semibold text-[#1a2744] mb-3">
            השלמת שיפוט (שופט × מיזם)
          </h2>
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-start py-2 pe-3 font-medium text-gray-600 whitespace-nowrap sticky start-0 bg-white">
                    מיזם
                  </th>
                  {judges.map((j) => (
                    <th
                      key={j.key}
                      className="py-2 px-2 font-medium text-gray-600 text-center whitespace-nowrap"
                    >
                      {j.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ventures.map((v) => {
                  const vRows = rowsByVenture.get(v.id) ?? [];
                  const byJudge = new Set(vRows.map((r) => r.judge_name_key));
                  return (
                    <tr
                      key={v.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="py-2 pe-3 whitespace-nowrap text-[#1a2744] sticky start-0 bg-white">
                        {v.name}
                      </td>
                      {judges.map((j) => (
                        <td key={j.key} className="py-2 px-2 text-center">
                          {byJudge.has(j.key) ? (
                            <span className="text-green-600 font-bold">✓</span>
                          ) : (
                            <span className="text-gray-300">–</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
