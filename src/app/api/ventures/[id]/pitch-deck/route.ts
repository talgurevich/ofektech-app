import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePitchDeck } from "@/lib/pitch-deck";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: ventureId } = await params;
  if (!UUID_RE.test(ventureId)) {
    return NextResponse.json({ error: "invalid venture id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, venture_id")
    .eq("id", user.id)
    .single();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Permission: venture members, admins, and assigned mentors.
  let allowed = false;
  if (profile.role === "admin") {
    allowed = true;
  } else if (profile.venture_id === ventureId) {
    allowed = true;
  } else if (profile.role === "mentor") {
    const { data: assignment } = await supabase
      .from("mentor_assignments")
      .select("id")
      .eq("mentor_id", user.id)
      .eq("venture_id", ventureId)
      .maybeSingle();
    if (assignment) allowed = true;
  }
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: venture } = await supabase
    .from("ventures")
    .select("id, name, description")
    .eq("id", ventureId)
    .single();
  if (!venture) {
    return NextResponse.json({ error: "venture not found" }, { status: 404 });
  }

  const [{ data: chapters }, { data: entries }] = await Promise.all([
    supabase
      .from("guide_chapters")
      .select("id, chapter_number, title, content")
      .order("chapter_number", { ascending: true }),
    supabase
      .from("venture_chapter_entries")
      .select("chapter_id, content")
      .eq("venture_id", ventureId),
  ]);

  const buffer = await generatePitchDeck({
    venture: {
      name: venture.name,
      description: venture.description,
    },
    chapters: chapters || [],
    entries: entries || [],
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": 'attachment; filename="pitch-deck.pptx"',
      "Cache-Control": "no-store",
    },
  });
}
