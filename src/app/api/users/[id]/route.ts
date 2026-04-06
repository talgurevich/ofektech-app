import { createAdminClient, createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  // Prevent self-deletion
  if (id === user.id) {
    return NextResponse.json(
      { error: "Cannot delete yourself" },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  // Get the user's profile to check venture membership
  const { data: targetProfile } = await adminClient
    .from("profiles")
    .select("venture_id")
    .eq("id", id)
    .single();

  const userVentureId = targetProfile?.venture_id;

  // Check if this is the last member of their venture
  let isLastVentureMember = false;
  if (userVentureId) {
    const { count } = await adminClient
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("venture_id", userVentureId)
      .neq("id", id);
    isLastVentureMember = (count || 0) === 0;
  }

  // Clean up related data before deleting user
  await adminClient.from("session_feedback").delete().eq("submitted_by", id);

  // Clean up mentor assignments where user is a mentor
  await adminClient.from("mentor_assignments").delete().eq("mentor_id", id);

  // If last venture member, clean up venture-related data
  if (isLastVentureMember && userVentureId) {
    // Clean up mentor assignments for the venture
    await adminClient.from("mentor_assignments").delete().eq("venture_id", userVentureId);

    // Clean up venture chapter entries
    await adminClient.from("venture_chapter_entries").delete().eq("venture_id", userVentureId);

    // Clean up venture tasks (venture tasks stay if other members exist)
    await adminClient.from("tasks").delete().eq("venture_id", userVentureId);
  }

  // Delete personal tasks
  await adminClient.from("tasks").delete().eq("candidate_id", id);

  await adminClient.from("checkins").delete().eq("candidate_id", id);
  await adminClient.from("lecture_feedback").delete().eq("candidate_id", id);

  // Delete sessions where user is mentor
  const { data: sessions } = await adminClient
    .from("mentor_sessions")
    .select("id")
    .eq("mentor_id", id);
  if (sessions && sessions.length > 0) {
    const sessionIds = sessions.map((s) => s.id);
    await adminClient.from("session_feedback").delete().in("session_id", sessionIds);
    await adminClient.from("mentor_sessions").delete().eq("mentor_id", id);
  }

  // Delete lectures created by this user
  const { data: lectures } = await adminClient
    .from("lectures")
    .select("id")
    .eq("created_by", id);
  if (lectures && lectures.length > 0) {
    const lectureIds = lectures.map((l) => l.id);
    await adminClient.from("lecture_feedback").delete().in("lecture_id", lectureIds);
    await adminClient.from("lectures").delete().eq("created_by", id);
  }

  // Delete from auth (cascade will remove profile)
  const { error } = await adminClient.auth.admin.deleteUser(id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
