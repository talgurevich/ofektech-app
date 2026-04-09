import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/events";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Check if user has a profile (was invited by admin)
        const adminClient = createAdminClient();
        const { data: profile } = await adminClient
          .from("profiles")
          .select("id, full_name, email, role")
          .eq("id", user.id)
          .single();

        if (!profile) {
          // Not invited — clean up auth user and sign out
          await trackEvent({
            type: "error",
            actor: user.email || "unknown",
            description: `ניסיון כניסה לא מורשה (${user.app_metadata?.provider || "unknown"})`,
          });
          await adminClient.auth.admin.deleteUser(user.id);
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/not-registered`);
        }

        // Legitimate user — track login
        const name = profile.full_name || profile.email || user.email || "unknown";
        const roleLabel = profile.role === "mentor" ? "מנטור" : profile.role === "admin" ? "מנהל" : profile.role === "visitor" ? "מאזין" : "יזם";
        await trackEvent({ type: "login", actor: name, description: `התחבר/ה לפורטל (${roleLabel})` });
      }
      return NextResponse.redirect(origin);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
