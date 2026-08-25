"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Star, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  DEMO_DAY_AXES,
  DEMO_DAY_TOPIC_KEYS,
  judgeNameKey,
  type DemoDayTopicKey,
} from "@/lib/demo-day-topics";
import type { JudgeVenture } from "./page";

type Ratings = Record<DemoDayTopicKey, number>;

const EMPTY_RATINGS = Object.fromEntries(
  DEMO_DAY_TOPIC_KEYS.map((k) => [k, 0])
) as Ratings;

const NAME_STORAGE_KEY = "ofektech.demoDayJudge.name";
const SCORES_STORAGE_PREFIX = "ofektech.demoDayJudge.scores.";

// A judge scores ~20 ventures in one evening from one phone, so their own
// submissions are remembered locally. Deliberately NOT fetched from the server:
// a public "what did judge X submit" endpoint would leak the results to anyone
// who can guess a judge's name, which is exactly what this feature must not do.
type SubmittedMap = Record<string, Ratings>;

function readSubmitted(nameKey: string): SubmittedMap {
  if (!nameKey) return {};
  try {
    const raw = localStorage.getItem(SCORES_STORAGE_PREFIX + nameKey);
    return raw ? (JSON.parse(raw) as SubmittedMap) : {};
  } catch {
    return {};
  }
}

function writeSubmitted(nameKey: string, map: SubmittedMap) {
  if (!nameKey) return;
  try {
    localStorage.setItem(SCORES_STORAGE_PREFIX + nameKey, JSON.stringify(map));
  } catch {
    // storage full or blocked — the score is already saved server-side
  }
}

export function DemoDayJudgeForm({ ventures }: { ventures: JudgeVenture[] }) {
  const [ventureId, setVentureId] = useState("");
  const [judgeName, setJudgeName] = useState("");
  const [ratings, setRatings] = useState<Ratings>(EMPTY_RATINGS);
  const [submitted, setSubmitted] = useState<SubmittedMap>({});

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [justSaved, setJustSaved] = useState<string | null>(null);

  const nameKey = useMemo(() => judgeNameKey(judgeName), [judgeName]);

  // Restore the judge's name on load (they type it once per device).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(NAME_STORAGE_KEY);
      if (saved) setJudgeName(saved);
    } catch {
      // ignore
    }
  }, []);

  // Whenever the name changes, load that judge's previously submitted scores.
  useEffect(() => {
    setSubmitted(readSubmitted(nameKey));
  }, [nameKey]);

  const handleNameChange = useCallback((value: string) => {
    setJudgeName(value);
    try {
      localStorage.setItem(NAME_STORAGE_KEY, value);
    } catch {
      // ignore
    }
  }, []);

  // Selecting an already-scored venture loads that scorecard for editing.
  const handleVentureChange = useCallback(
    (id: string) => {
      setVentureId(id);
      setJustSaved(null);
      setError("");
      const existing = id ? submitted[id] : undefined;
      setRatings(existing ? { ...EMPTY_RATINGS, ...existing } : EMPTY_RATINGS);
    },
    [submitted]
  );

  const isEditing = Boolean(ventureId && submitted[ventureId]);

  const canSubmit = useMemo(() => {
    if (!ventureId) return false;
    if (judgeName.trim().length < 2) return false;
    if (DEMO_DAY_TOPIC_KEYS.some((k) => ratings[k] < 1)) return false;
    return true;
  }, [ventureId, judgeName, ratings]);

  const doneCount = Object.keys(submitted).length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError("");
    setJustSaved(null);

    const name = judgeName.trim().replace(/\s+/g, " ");
    const savedVentureId = ventureId;

    try {
      const res = await fetch("/api/demo-day-judges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venture_id: savedVentureId,
          judge_name: name,
          ratings,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "שליחת הדירוג נכשלה");
      }

      const next = { ...submitted, [savedVentureId]: { ...ratings } };
      setSubmitted(next);
      writeSubmitted(judgeNameKey(name), next);

      const ventureName =
        ventures.find((v) => v.id === savedVentureId)?.name ?? "";
      setJustSaved(ventureName);

      // Ready for the next pitch: keep the name, clear the venture and stars.
      setVentureId("");
      setRatings(EMPTY_RATINGS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {justSaved ? (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <div className="size-8 shrink-0 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="size-4 text-green-700" />
          </div>
          <p className="text-sm text-green-900">
            הדירוג ל<span className="font-semibold">{justSaved}</span> נשמר.
            בחרו את המיזם הבא.
          </p>
        </div>
      ) : null}

      <Card>
        <CardContent className="pt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="judge_name">
              שמך <span className="text-red-500">*</span>
            </Label>
            <Input
              id="judge_name"
              value={judgeName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="שם מלא"
              autoComplete="name"
              required
            />
            <p className="text-xs text-gray-500">
              הזינו את אותו שם בדיוק בכל המיזמים שתדרגו.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="venture">
                מיזם <span className="text-red-500">*</span>
              </Label>
              {doneCount > 0 ? (
                <span className="text-xs text-gray-500">
                  דירגתם {doneCount} מתוך {ventures.length}
                </span>
              ) : null}
            </div>
            <select
              id="venture"
              value={ventureId}
              onChange={(e) => handleVentureChange(e.target.value)}
              className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2744]/30"
              required
            >
              <option value="">— בחר מיזם —</option>
              {ventures.map((v) => (
                <option key={v.id} value={v.id}>
                  {submitted[v.id] ? "✓ " : ""}
                  {v.name}
                  {v.members.length > 0 ? ` — ${v.members.join(", ")}` : ""}
                </option>
              ))}
            </select>
            {isEditing ? (
              <p className="text-xs text-amber-700">
                כבר דירגתם את המיזם הזה. שליחה תעדכן את הדירוג הקיים.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {DEMO_DAY_AXES.map((axis) => (
        <Card key={axis.key}>
          <CardContent className="pt-6 space-y-5">
            <h2 className="text-lg font-bold text-[#1a2744]">{axis.title}</h2>

            <div className="space-y-5">
              {axis.topics.map((topic) => (
                <div
                  key={topic.key}
                  className="space-y-2 border-t border-gray-100 pt-4 first:border-0 first:pt-0"
                >
                  <div>
                    <h3 className="text-sm font-medium text-[#1a2744]">
                      {topic.label} <span className="text-red-500">*</span>
                    </h3>
                    {topic.hint ? (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {topic.hint}
                      </p>
                    ) : null}
                  </div>
                  <StarRow
                    label={topic.label}
                    value={ratings[topic.key]}
                    onChange={(v) =>
                      setRatings((prev) => ({ ...prev, [topic.key]: v }))
                    }
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {error ? (
        <p className="text-sm text-red-600 text-center">{error}</p>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={!canSubmit || submitting}
          className="min-w-32"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              שולח...
            </>
          ) : isEditing ? (
            "עדכן דירוג"
          ) : (
            "שלח דירוג"
          )}
        </Button>
      </div>
    </form>
  );
}

function StarRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div
      className="flex items-center gap-1"
      onMouseLeave={() => setHover(0)}
      role="radiogroup"
      aria-label={label}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const active = (hover || value) >= n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            className="p-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#1a2744]/30"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} כוכבים`}
          >
            <Star
              className={cn(
                "size-7 transition-colors",
                active
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-transparent text-gray-300"
              )}
            />
          </button>
        );
      })}
      {value > 0 ? (
        <span className="ms-2 text-xs text-gray-500">{value} / 5</span>
      ) : null}
    </div>
  );
}
