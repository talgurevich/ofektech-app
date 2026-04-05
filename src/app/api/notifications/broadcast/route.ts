import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // Verify caller is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roles, type, title, body, link } = await request.json();
  if (!roles || !type || !title) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Get all users with the specified roles
  const { data: users } = await adminClient
    .from("profiles")
    .select("id")
    .in("role", roles);

  if (users && users.length > 0) {
    const notifications = users.map((u) => ({
      user_id: u.id,
      type,
      title,
      body: body || null,
      link: link || null,
    }));

    await adminClient.from("notifications").insert(notifications);
  }

  return NextResponse.json({ success: true });
}
