import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SEVERITIES = ["info", "watch", "blocker"] as const;
const MAX_CONTENT = 4000;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { supabase, userId: user.id };
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const ventureId = String(body.venture_id || "").trim();
  const content = String(body.content || "").trim();
  const severity = String(body.severity || "info");

  if (!UUID_RE.test(ventureId)) {
    return NextResponse.json({ error: "invalid venture_id" }, { status: 400 });
  }
  if (!content) {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }
  if (content.length > MAX_CONTENT) {
    return NextResponse.json(
      { error: `content exceeds ${MAX_CONTENT} characters` },
      { status: 400 }
    );
  }
  if (!SEVERITIES.includes(severity as (typeof SEVERITIES)[number])) {
    return NextResponse.json({ error: "invalid severity" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("admin_venture_notes")
    .insert({
      venture_id: ventureId,
      author_id: auth.userId,
      content,
      severity,
    })
    .select("*, author:author_id(id, full_name, avatar_url)")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "failed to insert note" },
      { status: 500 }
    );
  }

  return NextResponse.json({ note: data });
}
