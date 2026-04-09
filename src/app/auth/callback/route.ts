import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/events";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Track login event
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email, role")
          .eq("id", user.id)
          .single();
        const name = profile?.full_name || profile?.email || user.email || "unknown";
        const roleLabel = profile?.role === "mentor" ? "מנטור" : profile?.role === "admin" ? "מנהל" : profile?.role === "visitor" ? "מאזין" : "יזם";
        await trackEvent({ type: "login", actor: name, description: `התחבר/ה לפורטל (${roleLabel})` });
      }
      return NextResponse.redirect(origin);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
