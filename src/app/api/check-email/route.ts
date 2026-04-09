import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ exists: false });
    }

    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .ilike("email", email.trim());

    if (error) {
      // If we can't check, let them through (don't block on error)
      return NextResponse.json({ exists: true });
    }

    return NextResponse.json({ exists: (count || 0) > 0 });
  } catch {
    return NextResponse.json({ exists: true });
  }
}
