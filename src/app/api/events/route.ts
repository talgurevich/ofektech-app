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

  // Get user name for the actor field
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const actor = profile?.full_name || profile?.email || user.email || "unknown";

  await trackEvent({ type, actor, description });

  return NextResponse.json({ success: true });
}
