import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendNotificationEmail } from "@/lib/email-notify";
import { NextResponse } from "next/server";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://ofektech-portal.co.il";

type Body = {
  postId: string;
  commentId?: string;
  body?: string;
  mentionedNames?: string[];
  mentionAll?: boolean;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as Body;
  const { postId, commentId, body, mentionedNames, mentionAll } = payload;
  if (!postId) {
    return NextResponse.json({ error: "Missing postId" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Actor name (used in email body)
  const { data: actor } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();
  const actorName = actor?.full_name?.trim() || actor?.email || "משתמש";

  // Resolve recipient IDs
  const recipientIds = new Set<string>();

  if (mentionAll) {
    const { data: everyone } = await admin
      .from("profiles")
      .select("id")
      .neq("id", user.id);
    for (const p of everyone || []) recipientIds.add(p.id);
  }

  if (mentionedNames && mentionedNames.length > 0) {
    const { data: byName } = await admin
      .from("profiles")
      .select("id, full_name")
      .in("full_name", mentionedNames);
    for (const p of byName || []) {
      if (p.id !== user.id) recipientIds.add(p.id);
    }
  }

  if (recipientIds.size === 0) {
    return NextResponse.json({ success: true, recipients: 0 });
  }

  const ids = Array.from(recipientIds);
  const { data: recipients } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .in("id", ids);

  const link = `${BASE_URL}/feed#post-${postId}`;
  const isComment = !!commentId;
  const title = mentionAll
    ? "פוסט חדש בקהילה — מיועד לכולם"
    : isComment
      ? "אוזכרת בתגובה בפיד הקהילה"
      : "אוזכרת בפיד הקהילה";

  const snippetSource = (body || "").trim().replace(/\s+/g, " ");
  const snippet =
    snippetSource.length > 200
      ? snippetSource.slice(0, 200) + "…"
      : snippetSource;

  // 1) Create in-app notifications
  const notifRows = (recipients || []).map((r) => ({
    user_id: r.id,
    type: "feedback",
    title,
    body: snippet || (mentionAll ? `${actorName} פרסם/ה עדכון לכל הקהילה` : actorName),
    link,
  }));
  if (notifRows.length > 0) {
    await admin.from("notifications").insert(notifRows);
  }

  // 2) Send batched email
  const emails = (recipients || [])
    .map((r) => r.email)
    .filter((e): e is string => typeof e === "string" && e.includes("@"));

  if (emails.length > 0) {
    const heading = mentionAll
      ? `${actorName} פרסם/ה עדכון לכל הקהילה`
      : isComment
        ? `${actorName} הזכיר/ה אותך בתגובה`
        : `${actorName} הזכיר/ה אותך בפוסט`;

    await sendNotificationEmail({
      to: emails,
      subject: title,
      heading,
      body: snippet
        ? `"${snippet}"`
        : "היכנסו לפיד כדי לראות את הפוסט.",
      ctaText: "צפייה בפיד",
      ctaUrl: link,
    });
  }

  return NextResponse.json({ success: true, recipients: recipientIds.size });
}
