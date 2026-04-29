import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FeedClient } from "./feed-client";

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/not-registered");

  return (
    <main className="mx-auto max-w-2xl p-4 md:p-8">
      <FeedClient
        currentUser={{
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          avatar_url: profile.avatar_url,
          role: profile.role,
        }}
      />
    </main>
  );
}
