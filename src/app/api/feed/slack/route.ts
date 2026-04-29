import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://ofektech-portal.co.il";

type Body = {
  type: "post" | "system_post" | "comment";
  postId: string;
  text: string;
  imageUrl?: string;
};

function snippet(text: string, max = 280): string {
  const cleaned = text.trim().replace(/\s+/g, " ");
  return cleaned.length > max ? cleaned.slice(0, max) + "…" : cleaned;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const webhook = process.env.SLACK_FEED_WEBHOOK_URL;
  if (!webhook) {
    // Slack not configured — succeed silently so the client flow isn't broken.
    return NextResponse.json({ skipped: true });
  }

  const payload = (await request.json()) as Body;
  if (!payload?.type || !payload?.postId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: actor } = await admin
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single();
  const actorName = actor?.full_name?.trim() || actor?.email || "משתמש";

  const link = `${BASE_URL}/feed#post-${payload.postId}`;

  const headline =
    payload.type === "comment"
      ? `💬 *${actorName}* הגיב/ה בפיד הקהילה`
      : payload.type === "system_post"
        ? `✨ *${actorName}* — עדכון פעילות בפיד`
        : `📝 *${actorName}* פרסם/ה פוסט בפיד הקהילה`;

  const lines: string[] = [headline];
  const body = snippet(payload.text || "");
  if (body) lines.push(`> ${body.replace(/\n/g, "\n> ")}`);
  if (payload.imageUrl) lines.push(`🖼️ ${payload.imageUrl}`);
  lines.push(`<${link}|פתחו בפורטל>`);

  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: lines.join("\n") }),
    });
  } catch {
    // Don't surface webhook failures to the user.
  }

  return NextResponse.json({ ok: true });
}
