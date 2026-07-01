import { createAdminClient, createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const TOPIC_KEYS = [
  "problem_clarity",
  "solution_conviction",
  "market_opportunity",
  "presentation_quality",
] as const;

type TopicKey = (typeof TOPIC_KEYS)[number];

const ALLOWED_ROLES = new Set([
  "mentor",
  "investor",
  "peer",
  "staff",
  "other",
]);

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
    ratings?: Partial<Record<TopicKey, number>>;
    comments?: Partial<Record<TopicKey, string>>;
    biggest_strength?: string | null;
    top_improvement?: string | null;
  };

  const ventureId = body.venture_id?.trim();
  const reviewerName = body.reviewer_name?.trim();

  if (!ventureId) return bad("חסר וונצ'ר");
  if (!reviewerName) return bad("חסר שם");

  const ratings = body.ratings ?? {};
  for (const k of TOPIC_KEYS) {
    const v = ratings[k];
    if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > 5) {
      return bad(`דירוג לא תקין: ${k}`);
    }
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

  const comments = body.comments ?? {};
  const insertRow = {
    venture_id: ventureId,
    reviewer_name: reviewerName.slice(0, 200),
    reviewer_role: reviewerRole,
    problem_clarity_rating: ratings.problem_clarity,
    problem_clarity_comment: comments.problem_clarity?.trim() || null,
    solution_conviction_rating: ratings.solution_conviction,
    solution_conviction_comment: comments.solution_conviction?.trim() || null,
    market_opportunity_rating: ratings.market_opportunity,
    market_opportunity_comment: comments.market_opportunity?.trim() || null,
    presentation_quality_rating: ratings.presentation_quality,
    presentation_quality_comment: comments.presentation_quality?.trim() || null,
    biggest_strength: body.biggest_strength?.trim() || null,
    top_improvement: body.top_improvement?.trim() || null,
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
