import { createAdminClient, createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // Verify caller is admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email, full_name, role } = await request.json();

  if (!email || !role) {
    return NextResponse.json(
      { error: "Email and role are required" },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  // Create user (generates invite link automatically)
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: { full_name: full_name || "", role },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // If trigger didn't create profile, insert manually
  const { error: profileError } = await adminClient
    .from("profiles")
    .upsert({
      id: data.user.id,
      email,
      full_name: full_name || "",
      role,
    }, { onConflict: "id" });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  // Send invite email via Supabase
  await adminClient.auth.admin.inviteUserByEmail(email);

  return NextResponse.json({ user: data.user });
}
