import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  DEMO_DAY_TOPIC_KEYS,
  judgeNameKey,
  ratingColumn,
  type DemoDayTopicKey,
} from "@/lib/demo-day-topics";

// Public endpoint: the judges' link has no login, so everything is validated here
// and written with the service-role client (demo_day_scores has RLS on and no
// policies, so nothing else can write to it).

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return bad("גוף הבקשה אינו JSON תקין");
  }

  const body = payload as {
    venture_id?: string;
    judge_name?: string;
    ratings?: Partial<Record<DemoDayTopicKey, number>>;
  };

  const ventureId = body.venture_id?.trim();
  const judgeName = body.judge_name?.trim().replace(/\s+/g, " ");

  if (!ventureId) return bad("חסר מיזם");
  if (!judgeName) return bad("חסר שם");
  if (judgeName.length < 2) return bad("שם קצר מדי");

  const ratings = body.ratings ?? {};
  const ratingColumns: Record<string, number> = {};
  for (const k of DEMO_DAY_TOPIC_KEYS) {
    const v = ratings[k];
    if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > 5) {
      return bad(`דירוג לא תקין: ${k}`);
    }
    ratingColumns[ratingColumn(k)] = v;
  }

  const admin = createAdminClient();

  // The dropdown only offers the active cohort's ventures; re-check server-side so
  // a tampered venture_id can't drop a scorecard onto an old cohort's venture.
  const { data: cohort } = await admin
    .from("cohorts")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();

  if (!cohort) return bad("אין מחזור פעיל", 409);

  const { data: venture } = await admin
    .from("ventures")
    .select("id")
    .eq("id", ventureId)
    .eq("cohort_id", cohort.id)
    .maybeSingle();

  if (!venture) return bad("המיזם אינו שייך למחזור הפעיל");

  const { error } = await admin.from("demo_day_scores").upsert(
    {
      venture_id: ventureId,
      judge_name: judgeName.slice(0, 200),
      judge_name_key: judgeNameKey(judgeName).slice(0, 200),
      ...ratingColumns,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "judge_name_key,venture_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
