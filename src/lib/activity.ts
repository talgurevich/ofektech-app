import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityKind } from "@/lib/types";

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
}
