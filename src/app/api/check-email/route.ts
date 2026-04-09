import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ exists: false });
    }

    const supabase = createAdminClient();

    // Check profiles table (invited users have profiles)
    const { count, error } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .ilike("email", email.trim());

    if (error) {
      // Fail closed — block if we can't verify
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({ exists: (count || 0) > 0 });
  } catch {
    // Fail closed
    return NextResponse.json({ exists: false });
  }
}
