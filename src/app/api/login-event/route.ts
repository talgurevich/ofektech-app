import { trackEvent } from "@/lib/events";
import { NextResponse } from "next/server";

const ALLOWED_TYPES = new Set(["error"]);

export async function POST(request: Request) {
  const { type, description, email } = await request.json();

  if (!type || !description || !ALLOWED_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const actor = email || "unknown";
  await trackEvent({ type, actor, description });

  return NextResponse.json({ success: true });
}
