import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { targetUserId, type, title, body, link } = await request.json();
  if (!targetUserId || !type || !title) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  await adminClient.from("notifications").insert({
    user_id: targetUserId,
    type,
    title,
    body: body || null,
    link: link || null,
  });

  return NextResponse.json({ success: true });
}
