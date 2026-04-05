import { createAdminClient } from "@/lib/supabase/server";
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
        // Check who already submitted feedback
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
        // Check if we already notified today (avoid spam)
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

  // 3. No tasks yet (candidates created > 5 days ago)
  const { data: olderCandidates } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "candidate")
    .lte("created_at", fiveDaysAgo);

  if (olderCandidates) {
    for (const candidate of olderCandidates) {
      const { count } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("candidate_id", candidate.id);

      if (count === 0) {
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
            link: "/tasks",
          });
        }
      }
    }
  }

  // 4. Guide not started (candidates created > 7 days ago, 0 entries)
  const { data: weekOldCandidates } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "candidate")
    .lte("created_at", sevenDaysAgo);

  if (weekOldCandidates) {
    for (const candidate of weekOldCandidates) {
      const { count } = await supabase
        .from("candidate_chapter_entries")
        .select("*", { count: "exact", head: true })
        .eq("candidate_id", candidate.id)
        .neq("content", "");

      if (count === 0) {
        const { data: existingNotif } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", candidate.id)
          .eq("type", "guide")
          .eq("title", "התחילו למלא את מדריך התוכנית")
          .gte("created_at", today)
          .limit(1)
          .single();

        if (!existingNotif) {
          notifications.push({
            user_id: candidate.id,
            type: "guide",
            title: "התחילו למלא את מדריך התוכנית",
            body: "13 פרקים שיעזרו לכם לבנות מצגת משקיעים",
            link: "/guide",
          });
        }
      }
    }
  }

  // 5. Task overdue
  const { data: overdueTasks } = await supabase
    .from("tasks")
    .select("id, candidate_id, description, deadline")
    .lt("deadline", today)
    .eq("completed", false);

  if (overdueTasks) {
    for (const task of overdueTasks) {
      const { data: existingNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", task.candidate_id)
        .eq("type", "task")
        .eq("link", "/tasks")
        .gte("created_at", today)
        .limit(1)
        .single();

      if (!existingNotif) {
        notifications.push({
          user_id: task.candidate_id,
          type: "task",
          title: "משימה באיחור",
          body: task.description.slice(0, 100),
          link: "/tasks",
        });
      }
    }
  }

  // Insert all notifications
  if (notifications.length > 0) {
    await supabase.from("notifications").insert(notifications);
  }

  return NextResponse.json({
    success: true,
    count: notifications.length,
  });
}
