"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Renders a small red counter badge next to the "פיד הקהילה" sidebar link
// when there are posts created after the user's profiles.feed_last_seen_at.
export function FeedUnseenBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("feed_last_seen_at")
        .eq("id", user.id)
        .single();
      const since = profile?.feed_last_seen_at;

      let query = supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null)
        .neq("author_id", user.id);
      if (since) query = query.gt("created_at", since);

      const { count } = await query;
      if (!cancelled) setCount(count ?? 0);
    }

    let interval: ReturnType<typeof setInterval> | null = null;
    function start() {
      load();
      if (interval !== null) return;
      interval = setInterval(load, 120_000);
    }
    function stop() {
      if (interval !== null) {
        clearInterval(interval);
        interval = null;
      }
    }
    function onVisibility() {
      if (document.visibilityState === "visible") start();
      else stop();
    }
    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      start();
    } else {
      load();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  if (count <= 0) return null;
  return (
    <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold leading-none text-white tabular-nums">
      {count > 99 ? "99+" : count}
    </span>
  );
}
