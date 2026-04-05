import { createAdminClient } from "@/lib/supabase/server";

export async function createNotification({
  userId,
  type,
  title,
  body,
  link,
}: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}) {
  const supabase = createAdminClient();
  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body: body || null,
    link: link || null,
  });
}
