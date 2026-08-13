"use client";

import { useMemo, useState } from "react";
import { Star, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  PRE_DEMO_AXES,
  PRE_DEMO_ROLE_OPTIONS,
  PRE_DEMO_TOPIC_KEYS,
  type PreDemoTopicKey,
} from "@/lib/pre-demo-topics";
import type { VentureWithMembers } from "./page";

type Ratings = Record<PreDemoTopicKey, number>;

const EMPTY_RATINGS = Object.fromEntries(
  PRE_DEMO_TOPIC_KEYS.map((k) => [k, 0])
) as Ratings;

export function PreDemoFeedbackForm({
  ventures,
}: {
  ventures: VentureWithMembers[];
}) {
  const [ventureId, setVentureId] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerRole, setReviewerRole] = useState("");
  const [ratings, setRatings] = useState<Ratings>(EMPTY_RATINGS);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = useMemo(() => {
    if (!ventureId) return false;
    if (!reviewerName.trim()) return false;
    if (PRE_DEMO_TOPIC_KEYS.some((k) => ratings[k] < 1)) return false;
    return true;
  }, [ventureId, reviewerName, ratings]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/pre-demo-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venture_id: ventureId,
          reviewer_name: reviewerName.trim(),
          reviewer_role: reviewerRole || null,
          ratings,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "שליחת המשוב נכשלה");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForAnother() {
    setSubmitted(false);
    setVentureId("");
    setRatings(EMPTY_RATINGS);
    // keep reviewerName + role so back-to-back submissions are faster
  }

  if (submitted) {
    return (
      <Card>
        <CardContent className="py-10 flex flex-col items-center text-center gap-4">
          <div className="size-12 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="size-6 text-green-700" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#1a2744]">
              המשוב נשלח בהצלחה
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              תודה! המשוב שלך יופיע לצוות OfekTech.
            </p>
          </div>
          <Button type="button" onClick={resetForAnother}>
            שליחת משוב למיזם נוסף
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="venture">
              מיזם <span className="text-red-500">*</span>
            </Label>
            <select
              id="venture"
              value={ventureId}
              onChange={(e) => setVentureId(e.target.value)}
              className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2744]/30"
              required
            >
              <option value="">— בחר מיזם —</option>
              {ventures.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.members.length > 0 ? ` — ${v.members.join(", ")}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reviewer_name">
                שמך <span className="text-red-500">*</span>
              </Label>
              <Input
                id="reviewer_name"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="שם מלא"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reviewer_role">תפקיד</Label>
              <select
                id="reviewer_role"
                value={reviewerRole}
                onChange={(e) => setReviewerRole(e.target.value)}
                className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2744]/30"
              >
                <option value="">— בחר תפקיד (אופציונלי) —</option>
                {PRE_DEMO_ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {PRE_DEMO_AXES.map((axis) => (
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
          ) : (
            "שלח משוב"
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
