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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.content !== undefined) {
    const content = String(body.content || "").trim();
    if (!content) {
      return NextResponse.json({ error: "content required" }, { status: 400 });
    }
    if (content.length > MAX_CONTENT) {
      return NextResponse.json(
        { error: `content exceeds ${MAX_CONTENT} characters` },
        { status: 400 }
      );
    }
    update.content = content;
  }

  if (body.severity !== undefined) {
    const severity = String(body.severity);
    if (!SEVERITIES.includes(severity as (typeof SEVERITIES)[number])) {
      return NextResponse.json({ error: "invalid severity" }, { status: 400 });
    }
    update.severity = severity;
  }

  if (body.resolved !== undefined) {
    if (body.resolved) {
      update.resolved_at = new Date().toISOString();
      update.resolved_by = auth.userId;
    } else {
      update.resolved_at = null;
      update.resolved_by = null;
    }
  }

  const { data, error } = await auth.supabase
    .from("admin_venture_notes")
    .update(update)
    .eq("id", id)
    .select("*, author:author_id(id, full_name, avatar_url)")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "failed to update note" },
      { status: 500 }
    );
  }

  return NextResponse.json({ note: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { error } = await auth.supabase
    .from("admin_venture_notes")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
