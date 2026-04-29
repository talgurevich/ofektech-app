import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityKind } from "@/lib/types";

// Activity kinds that should also surface as a system post in the community
// feed (no content shown, just "X did Y"). De-duped per user+kind in a 30-min
// window so an editing burst becomes a single feed entry.
const FEED_BROADCAST_KINDS: Partial<Record<ActivityKind, string>> = {
  guide_updated: "עדכן/ה את חוברת המיזם",
  workbook_added: "הוסיף/ה משימה לטבלת העבודה",
  workbook_task_done: "סימן/ה משימה כבוצעה",
  meeting_summary_submitted: "הגיש/ה סיכום פגישה",
};

const FEED_DEDUPE_WINDOW_MS = 30 * 60 * 1000;

export async function logActivity(
  supabase: SupabaseClient,
  args: {
    ventureId: string;
    kind: ActivityKind;
    summary: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("venture_activity").insert({
    venture_id: args.ventureId,
    actor_id: user.id,
    kind: args.kind,
    summary: args.summary,
    metadata: args.metadata ?? {},
  });

  // Workbook adds: only broadcast tasks-sheet adds. Other sheets are too noisy.
  if (
    args.kind === "workbook_added" &&
    args.metadata?.sheet_key !== "tasks"
  ) {
    return;
  }

  const broadcastBody = FEED_BROADCAST_KINDS[args.kind];
  if (!broadcastBody) return;

  const since = new Date(Date.now() - FEED_DEDUPE_WINDOW_MS).toISOString();
  const { data: recent } = await supabase
    .from("posts")
    .select("id")
    .eq("author_id", user.id)
    .eq("kind", "system")
    .eq("body", broadcastBody)
    .gte("created_at", since)
    .is("deleted_at", null)
    .limit(1);
  if (recent && recent.length > 0) return;

  const { data: inserted } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      body: broadcastBody,
      kind: "system",
      metadata: { activity_kind: args.kind, venture_id: args.ventureId },
    })
    .select("id")
    .single();

  if (inserted?.id) {
    fetch("/api/feed/slack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "system_post",
        postId: inserted.id,
        text: broadcastBody,
      }),
    });
  }
}
