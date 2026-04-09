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
        // Check if this user was invited (has a profile created by admin)
        // The trigger auto-creates profiles, so we need to check if the profile
        // was created at roughly the same time as the auth user (= not invited)
        const adminClient = createAdminClient();
        const { data: profile } = await adminClient
          .from("profiles")
          .select("id, full_name, email, role, created_at")
          .eq("id", user.id)
          .single();

        if (!profile) {
          // No profile at all — sign out and redirect
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/not-registered`);
        }

        // Check if profile was created within 5 seconds of the auth user
        // If so, it was auto-created by the trigger (not invited by admin)
        const authCreated = new Date(user.created_at).getTime();
        const profileCreated = new Date(profile.created_at).getTime();
        const timeDiff = Math.abs(profileCreated - authCreated);

        if (timeDiff < 10000) {
          // Profile was just auto-created by trigger — this is an uninvited user
          // Check if they were actually invited by looking at user metadata
          // Invited users have their profile created BEFORE they first log in
          // (admin creates user via createUser, which triggers profile creation)
          // But Google OAuth also triggers profile creation on first login
          //
          // Better check: was the auth user created by admin (invited) or by OAuth?
          // Admin-created users have identities with provider = 'email'
          // Google OAuth users have provider = 'google'
          // If this is their first Google login AND the profile is brand new,
          // they weren't invited.

          const isFirstGoogleLogin = user.app_metadata?.provider === 'google'
            && user.last_sign_in_at === user.created_at;

          // Also check: invited users have their user created by admin BEFORE
          // they ever log in. So created_at would be earlier than now by more than
          // a few seconds. If auth user was created just now, they self-registered.
          const userAge = Date.now() - authCreated;

          if (userAge < 30000) {
            // Auth user was created less than 30 seconds ago via Google OAuth
            // This means they self-registered — not invited
            // Delete the auto-created profile and auth user
            await adminClient.from("profiles").delete().eq("id", user.id);
            await adminClient.auth.admin.deleteUser(user.id);
            await supabase.auth.signOut();
            return NextResponse.redirect(`${origin}/not-registered`);
          }
        }

        // User is legitimate — track login
        const name = profile.full_name || profile.email || user.email || "unknown";
        const roleLabel = profile.role === "mentor" ? "מנטור" : profile.role === "admin" ? "מנהל" : profile.role === "visitor" ? "מאזין" : "יזם";
        await trackEvent({ type: "login", actor: name, description: `התחבר/ה לפורטל (${roleLabel})` });
      }
      return NextResponse.redirect(origin);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
