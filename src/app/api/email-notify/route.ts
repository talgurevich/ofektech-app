import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendNotificationEmail } from "@/lib/email-notify";
import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ofektech-portal.co.il";

// Admins who keep full admin access but have opted out of notification emails.
const ADMIN_EMAIL_DENYLIST = new Set(["sharon@nortech-platform.com"]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, ventureId, sessionId, description } = await request.json();
  if (!type) return NextResponse.json({ error: "Missing type" }, { status: 400 });

  const adminClient = createAdminClient();

  // Get current user profile
  const { data: actor } = await adminClient
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single();

  const actorName = actor?.full_name || actor?.email || "משתמש";
  const actorRole = actor?.role;

  // Get admins
  const { data: admins } = await adminClient
    .from("profiles")
    .select("email")
    .eq("role", "admin");
  const adminEmails = (admins?.map(a => a.email) || []).filter(
    (e): e is string => !!e && !ADMIN_EMAIL_DENYLIST.has(e.toLowerCase())
  );

  // Get venture members and assigned mentor
  let ventureMembers: string[] = [];
  let mentorEmail: string | null = null;
  let ventureName = "מיזם";

  if (ventureId) {
    const { data: venture } = await adminClient
      .from("ventures")
      .select("name")
      .eq("id", ventureId)
      .single();
    ventureName = venture?.name || "מיזם";

    const { data: members } = await adminClient
      .from("profiles")
      .select("email")
      .eq("venture_id", ventureId);
    ventureMembers = members?.map(m => m.email) || [];

    const { data: assignment } = await adminClient
      .from("mentor_assignments")
      .select("mentor_id")
      .eq("venture_id", ventureId)
      .limit(1)
      .single();

    if (assignment) {
      const { data: mentor } = await adminClient
        .from("profiles")
        .select("email")
        .eq("id", assignment.mentor_id)
        .single();
      mentorEmail = mentor?.email || null;
    }
  }

  // Remove the actor's own email from recipients
  const filterSelf = (emails: string[]) => emails.filter(e => e !== actor?.email);

  switch (type) {
    case "mentor_feedback": {
      // Mentor gave feedback → notify venture members + admin
      const recipients = filterSelf([...ventureMembers, ...adminEmails]);
      if (recipients.length > 0) {
        await sendNotificationEmail({
          to: recipients,
          subject: `משוב חדש מהמנטור — ${ventureName}`,
          heading: "משוב חדש על פגישת מנטורינג",
          body: `${actorName} הגיש/ה משוב על פגישה עם מיזם ${ventureName}.`,
          ctaText: "צפייה במשוב",
          ctaUrl: sessionId ? `${BASE_URL}/sessions/${sessionId}/feedback` : BASE_URL,
        });
      }
      break;
    }

    case "mentor_task": {
      // Mentor added task → notify venture members + admin
      const recipients = filterSelf([...ventureMembers, ...adminEmails]);
      if (recipients.length > 0) {
        await sendNotificationEmail({
          to: recipients,
          subject: `משימה חדשה מהמנטור — ${ventureName}`,
          heading: "משימה חדשה מהמנטור",
          body: `${actorName} הוסיף/ה משימה למיזם ${ventureName}${description ? `: "${description}"` : ""}.`,
          ctaText: "צפייה במשימות",
          ctaUrl: `${BASE_URL}/workbook?sheet=tasks`,
        });
      }
      break;
    }

    case "candidate_task": {
      // Candidate added task → notify mentor + admin
      const recipients = filterSelf([
        ...(mentorEmail ? [mentorEmail] : []),
        ...adminEmails,
      ]);
      if (recipients.length > 0) {
        await sendNotificationEmail({
          to: recipients,
          subject: `משימה חדשה — ${ventureName}`,
          heading: "משימה חדשה נוספה",
          body: `${actorName} ממיזם ${ventureName} הוסיף/ה משימה${description ? `: "${description}"` : ""}.`,
          ctaText: "צפייה בפרטי המיזם",
          ctaUrl: ventureId ? `${BASE_URL}/ventures/${ventureId}` : BASE_URL,
        });
      }
      break;
    }

    case "candidate_feedback": {
      // Candidate submitted lecture feedback → notify admin (anonymous)
      if (adminEmails.length > 0) {
        await sendNotificationEmail({
          to: filterSelf(adminEmails),
          subject: "משוב הרצאה חדש",
          heading: "משוב הרצאה חדש",
          body: "התקבל משוב חדש על הרצאה.",
          ctaText: "צפייה במשובים",
          ctaUrl: `${BASE_URL}/admin/feedback`,
        });
      }
      break;
    }

    case "workbook_task_created": {
      // Candidate or mentor wrote a new task in the workbook → notify admins
      const recipients = filterSelf(adminEmails);
      if (recipients.length > 0) {
        const roleLabel =
          actorRole === "mentor" ? "מנטור/ית" : "חניך/ה";
        const ctaUrl = ventureId
          ? `${BASE_URL}/admin/ventures/${ventureId}`
          : `${BASE_URL}/admin/ventures`;
        await sendNotificationEmail({
          to: recipients,
          subject: `משימה חדשה — ${ventureName}`,
          heading: "משימה חדשה נוספה לטבלת העבודה",
          body: `${actorName} (${roleLabel}) הוסיף/ה משימה למיזם ${ventureName}${description ? `: "${description}"` : ""}.`,
          ctaText: "צפייה במיזם",
          ctaUrl,
        });
      }
      break;
    }

    case "workbook_task_completed": {
      // Candidate or mentor marked a task done → notify admins
      const recipients = filterSelf(adminEmails);
      if (recipients.length > 0) {
        const roleLabel =
          actorRole === "mentor" ? "מנטור/ית" : "חניך/ה";
        const ctaUrl = ventureId
          ? `${BASE_URL}/admin/ventures/${ventureId}`
          : `${BASE_URL}/admin/ventures`;
        await sendNotificationEmail({
          to: recipients,
          subject: `משימה הושלמה — ${ventureName}`,
          heading: "משימה סומנה כהושלמה",
          body: `${actorName} (${roleLabel}) סימן/ה משימה כהושלמה במיזם ${ventureName}${description ? `: "${description}"` : ""}.`,
          ctaText: "צפייה במיזם",
          ctaUrl,
        });
      }
      break;
    }

    case "task_review_requested": {
      // Admin flagged a task as needs_correction → notify venture members + mentor
      const recipients = filterSelf([
        ...ventureMembers,
        ...(mentorEmail ? [mentorEmail] : []),
      ]);
      if (recipients.length > 0) {
        const ctaUrl = ventureId
          ? `${BASE_URL}/workbook?venture=${ventureId}&sheet=tasks`
          : `${BASE_URL}/workbook?sheet=tasks`;
        await sendNotificationEmail({
          to: recipients,
          subject: `בקשת תיקון למשימה — ${ventureName}`,
          heading: "האדמין ביקש תיקון למשימה",
          body: `${actorName} סימן/ה משימה בטבלת העבודה של ${ventureName} כדורשת תיקון${description ? `: "${description}"` : ""}. כנסו לטבלה כדי לראות את ההערות ולתקן.`,
          ctaText: "מעבר לטבלת המשימות",
          ctaUrl,
        });
      }
      break;
    }

    case "task_review_corrected": {
      // Venture member edited a flagged task → notify admins for re-review
      const recipients = filterSelf(adminEmails);
      if (recipients.length > 0) {
        await sendNotificationEmail({
          to: recipients,
          subject: `משימה תוקנה — ${ventureName}`,
          heading: "משימה תוקנה — ממתין לאישור",
          body: `${actorName} עדכן/ה משימה שסומנה לתיקון במיזם ${ventureName}${description ? `: "${description}"` : ""}. המשימה ממתינה לאישור חוזר.`,
          ctaText: "מעבר לרשימת הביקורות",
          ctaUrl: `${BASE_URL}/admin/tasks-review`,
        });
      }
      break;
    }
  }

  return NextResponse.json({ success: true });
}
