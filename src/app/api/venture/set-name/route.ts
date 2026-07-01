import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, venture_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "candidate" || !profile.venture_id) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 403 });
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "גוף לא תקין" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name || name.length < 2) {
    return NextResponse.json(
      { error: "שם המיזם קצר מדי" },
      { status: 400 }
    );
  }
  if (name.length > 120) {
    return NextResponse.json(
      { error: "שם המיזם ארוך מדי" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("ventures")
    .update({ name, name_confirmed: true })
    .eq("id", profile.venture_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
