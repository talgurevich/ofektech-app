import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (adminProfile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email, full_name, role } = await request.json();

  if (!email || !role) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const roleHebrew =
    role === "mentor"
      ? "מנטור/ית"
      : role === "visitor"
        ? "מאזין/ת"
        : role === "admin"
          ? "מנהל/ת"
          : "יזם/ית";

  const loginUrl =
    request.headers.get("origin") || "https://ofektech-portal.co.il";

  const mentorBullets = `<li>לצפות בחניכים המשובצים אליך ובהתקדמות שלהם</li>
                <li>לעקוב אחרי המשימות והמדריך של כל חניך/ה</li>
                <li>לתת משוב מובנה אחרי כל פגישה</li>
                <li>לצפות בלוח הזמנים של התוכנית</li>`;

  const candidateBullets = `<li>לנהל משימות ולעקוב אחרי ההתקדמות</li>
                <li>למלא את מדריך התוכנית — 13 פרקים לבניית מצגת משקיעים</li>
                <li>לראות הרצאות, הקלטות ומצגות</li>
                <li>ליצור קשר עם הצוות והמנטור שלך</li>`;

  const visitorBullets = `<li>לצפות בלוח ההרצאות המלא</li>
                <li>לגשת להקלטות הזום של ההרצאות</li>
                <li>לגשת למצגות ולחומרי הלימוד</li>`;

  const bullets =
    role === "mentor"
      ? mentorBullets
      : role === "visitor"
        ? visitorBullets
        : candidateBullets;

  const { error: emailError } = await resend.emails.send({
    from: "OfekTech <send@ofektech-portal.co.il>",
    to: email,
    subject: "תזכורת: הוזמנת להצטרף לפורטל OfekTech!",
    html: `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#1a2744;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;font-size:28px;letter-spacing:1px;">
                <span style="color:#ffffff;">OFEK</span><span style="color:#22c55e;">TECH</span>
              </h1>
              <p style="margin:8px 0 0;font-size:13px;color:#22c55e;letter-spacing:3px;">יזמות · חדשנות · טכנולוגיה</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;font-size:22px;color:#1a2744;">שלום${full_name ? ` ${full_name}` : ""}!</h2>
              <p style="margin:0 0 24px;font-size:16px;color:#555;line-height:1.7;">
                זוהי תזכורת שהוזמנת להצטרף לפורטל המשתתפים של <strong>OfekTech</strong> בתפקיד <strong>${roleHebrew}</strong>.
              </p>
              <p style="margin:0 0 12px;font-size:15px;color:#555;line-height:1.7;">
                בפורטל תוכל/י:
              </p>
              <ul style="margin:0 0 28px;padding:0 20px 0 0;font-size:15px;color:#555;line-height:2;">
                ${bullets}
              </ul>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}/login" style="display:inline-block;background-color:#22c55e;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;padding:14px 40px;border-radius:10px;">
                      כניסה לפורטל
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 0;font-size:13px;color:#999;text-align:center;">
                ההתחברות מתבצעת באמצעות חשבון Google או קישור לאימייל
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f9fb;padding:20px 40px;text-align:center;border-top:1px solid #eee;">
              <p style="margin:0;font-size:12px;color:#aaa;">
                OfekTech — תוכנית יזמות, חדשנות וטכנולוגיה
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });

  if (emailError) {
    return NextResponse.json({ error: emailError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
