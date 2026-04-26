import { createAdminClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/events";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000)
    .toISOString()
    .split("T")[0];
  const fiveDaysAgo = new Date(Date.now() - 5 * 86400000)
    .toISOString()
    .split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)
    .toISOString()
    .split("T")[0];

  const notifications: Array<{
    user_id: string;
    type: string;
    title: string;
    body: string | null;
    link: string | null;
  }> = [];

  // 1. Lecture passed yesterday -> notify candidates to fill feedback
  const { data: passedLectures } = await supabase
    .from("lectures")
    .select("id, title")
    .eq("scheduled_date", yesterday);

  if (passedLectures && passedLectures.length > 0) {
    const { data: candidates } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "candidate");

    if (candidates) {
      for (const lecture of passedLectures) {
        const { data: existingFeedback } = await supabase
          .from("lecture_feedback")
          .select("candidate_id")
          .eq("lecture_id", lecture.id);

        const submittedIds = new Set(
          existingFeedback?.map((f) => f.candidate_id) || []
        );

        for (const candidate of candidates) {
          if (!submittedIds.has(candidate.id)) {
            notifications.push({
              user_id: candidate.id,
              type: "lecture",
              title: "משוב על הרצאה ממתין",
              body: `ההרצאה "${lecture.title}" הסתיימה — נשמח למשוב שלך`,
              link: `/lectures/${lecture.id}/feedback`,
            });
          }
        }
      }
    }
  }

  // 2. Opening check-in not completed (candidates created > 3 days ago)
  const { data: newCandidates } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "candidate")
    .lte("created_at", threeDaysAgo);

  if (newCandidates) {
    for (const candidate of newCandidates) {
      const { data: openingCheckin } = await supabase
        .from("checkins")
        .select("id")
        .eq("candidate_id", candidate.id)
        .eq("type", "opening")
        .limit(1)
        .single();

      if (!openingCheckin) {
        const { data: existingNotif } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", candidate.id)
          .eq("type", "checkin")
          .eq("title", "שאלון הפתיחה מחכה לך")
          .gte("created_at", today)
          .limit(1)
          .single();

        if (!existingNotif) {
          notifications.push({
            user_id: candidate.id,
            type: "checkin",
            title: "שאלון הפתיחה מחכה לך",
            body: "ספרו לנו על המיזם, הציפיות והיעדים שלכם",
            link: "/checkin/opening",
          });
        }
      }
    }
  }

  // 3. No tasks yet (candidates with a venture, created > 5 days ago)
  const { data: olderCandidates } = await supabase
    .from("profiles")
    .select("id, venture_id")
    .eq("role", "candidate")
    .lte("created_at", fiveDaysAgo);

  if (olderCandidates) {
    for (const candidate of olderCandidates) {
      if (!candidate.venture_id) continue;

      const { count } = await supabase
        .from("workbook_entries")
        .select("*", { count: "exact", head: true })
        .eq("venture_id", candidate.venture_id)
        .eq("sheet_key", "tasks");

      if ((count || 0) === 0) {
        const { data: existingNotif } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", candidate.id)
          .eq("type", "task")
          .eq("title", "הוסיפו את המשימה הראשונה שלכם")
          .gte("created_at", today)
          .limit(1)
          .single();

        if (!existingNotif) {
          notifications.push({
            user_id: candidate.id,
            type: "task",
            title: "הוסיפו את המשימה הראשונה שלכם",
            body: "ניהול משימות עוזר לעקוב אחרי ההתקדמות",
            link: "/workbook?sheet=tasks",
          });
        }
      }
    }
  }

  // 4. Guide not started (ventures with candidates created > 7 days ago, 0 entries)
  const { data: weekOldCandidates } = await supabase
    .from("profiles")
    .select("id, venture_id")
    .eq("role", "candidate")
    .lte("created_at", sevenDaysAgo);

  if (weekOldCandidates) {
    // Track which ventures we already checked
    const checkedVentures = new Set<string>();

    for (const candidate of weekOldCandidates) {
      if (!candidate.venture_id) continue;
      if (checkedVentures.has(candidate.venture_id)) continue;
      checkedVentures.add(candidate.venture_id);

      const { count } = await supabase
        .from("venture_chapter_entries")
        .select("*", { count: "exact", head: true })
        .eq("venture_id", candidate.venture_id)
        .neq("content", "");

      if (count === 0) {
        // Notify all members of this venture
        const { data: ventureMembers } = await supabase
          .from("profiles")
          .select("id")
          .eq("venture_id", candidate.venture_id);

        for (const member of ventureMembers || []) {
          const { data: existingNotif } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", member.id)
            .eq("type", "guide")
            .eq("title", "התחילו למלא את חוברת המיזם")
            .gte("created_at", today)
            .limit(1)
            .single();

          if (!existingNotif) {
            notifications.push({
              user_id: member.id,
              type: "guide",
              title: "התחילו למלא את חוברת המיזם",
              body: "13 פרקים שיעזרו לכם לבנות מצגת משקיעים",
              link: "/guide",
            });
          }
        }
      }
    }
  }

  // 5. Overdue workbook tasks — notify venture members
  const { data: overdueTasks } = await supabase
    .from("workbook_entries")
    .select("id, venture_id, data")
    .eq("sheet_key", "tasks")
    .lt("data->>due_date", today)
    .neq("data->>due_date", "");

  if (overdueTasks) {
    const notifiedVentures = new Set<string>();

    for (const row of overdueTasks) {
      const data = (row.data || {}) as Record<string, unknown>;
      if (data.done === true) continue;
      if (notifiedVentures.has(row.venture_id)) continue;
      notifiedVentures.add(row.venture_id);

      const description = typeof data.task === "string" ? data.task : "";

      const { data: ventureMembers } = await supabase
        .from("profiles")
        .select("id")
        .eq("venture_id", row.venture_id);

      for (const member of ventureMembers || []) {
        const { data: existingNotif } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", member.id)
          .eq("type", "task")
          .eq("link", "/workbook?sheet=tasks")
          .gte("created_at", today)
          .limit(1)
          .single();

        if (!existingNotif) {
          notifications.push({
            user_id: member.id,
            type: "task",
            title: "משימת מיזם באיחור",
            body: description.slice(0, 100),
            link: "/workbook?sheet=tasks",
          });
        }
      }
    }
  }

  // Insert all notifications
  if (notifications.length > 0) {
    await supabase.from("notifications").insert(notifications);
    await trackEvent({ type: "system", description: `סיכום יומי: ${notifications.length} התראות נשלחו` });
  }

  return NextResponse.json({
    success: true,
    count: notifications.length,
  });
}
