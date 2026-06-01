import { createClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/events";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, description } = await request.json();
  if (!type || !description) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Lecture feedback is anonymous — do not attach an actor.
  let actor: string | undefined;
  if (type !== "lecture_feedback") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();
    actor = profile?.full_name || profile?.email || user.email || "unknown";
  }

  await trackEvent({ type, actor, description });

  return NextResponse.json({ success: true });
}
