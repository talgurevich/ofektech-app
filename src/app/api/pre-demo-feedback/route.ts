import { createAdminClient, createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  PRE_DEMO_ROLE_OPTIONS,
  PRE_DEMO_TOPIC_KEYS,
  ratingColumn,
  type PreDemoTopicKey,
} from "@/lib/pre-demo-topics";

const ALLOWED_ROLES = new Set(PRE_DEMO_ROLE_OPTIONS.map((r) => r.value));

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
    reviewer_name?: string;
    reviewer_role?: string | null;
    ratings?: Partial<Record<PreDemoTopicKey, number>>;
  };

  const ventureId = body.venture_id?.trim();
  const reviewerName = body.reviewer_name?.trim();

  if (!ventureId) return bad("חסר מיזם");
  if (!reviewerName) return bad("חסר שם");

  const ratings = body.ratings ?? {};
  const ratingColumns: Record<string, number> = {};
  for (const k of PRE_DEMO_TOPIC_KEYS) {
    const v = ratings[k];
    if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > 5) {
      return bad(`דירוג לא תקין: ${k}`);
    }
    ratingColumns[ratingColumn(k)] = v;
  }

  const reviewerRole =
    body.reviewer_role && ALLOWED_ROLES.has(body.reviewer_role)
      ? body.reviewer_role
      : null;

  // Best-effort attach submitter id if the user happens to be logged in
  let submitterId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    submitterId = user?.id ?? null;
  } catch {
    submitterId = null;
  }

  const insertRow = {
    venture_id: ventureId,
    reviewer_name: reviewerName.slice(0, 200),
    reviewer_role: reviewerRole,
    ...ratingColumns,
    submitter_user_id: submitterId,
  };

  // Use admin client to bypass RLS ambiguities and to guarantee insert works
  // for anonymous submissions.
  const admin = createAdminClient();
  const { error } = await admin.from("pre_demo_feedback").insert(insertRow);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
