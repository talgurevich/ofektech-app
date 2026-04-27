#!/usr/bin/env tsx
/**
 * Sends the OfekTech "what's new" announcement email.
 *
 * Usage:
 *   tsx scripts/send-announcement.ts --to=tal.gurevich2@gmail.com    # test send
 *   tsx scripts/send-announcement.ts --all                            # send to every profile email
 *   tsx scripts/send-announcement.ts --dry                            # list recipients only
 */

import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local manually so we don't depend on any framework runtime.
const envPath = resolve(process.cwd(), ".env.local");
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) {
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!RESEND_API_KEY) {
  console.error("RESEND_API_KEY missing in .env.local");
  process.exit(1);
}

const args = process.argv.slice(2);
const argMap = new Map<string, string | true>();
for (const a of args) {
  if (a.startsWith("--")) {
    const [k, v] = a.slice(2).split("=");
    argMap.set(k, v ?? true);
  }
}

const resend = new Resend(RESEND_API_KEY);

const SUBJECT = "מה חדש בפורטל OfekTech — התעדכנו לפני תחילת התוכנית";
const FROM = "OfekTech <send@ofektech-portal.co.il>";
const PORTAL_URL = "https://ofektech-portal.co.il";

function emailHtml(fullName: string | null) {
  const greetingName = fullName?.trim() ? ` ${fullName.trim()}` : "";
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 0;">
    <tr><td align="center">
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
            <h2 style="margin:0 0 8px;font-size:22px;color:#1a2744;">שלום${greetingName} 👋</h2>
            <p style="margin:0 0 20px;font-size:16px;color:#555;line-height:1.7;">
              אנחנו עובדים בקצב מטורף על הפורטל לקראת תחילת התוכנית — והכנו עבורכם עדכון קצר על מה חדש ועל מה אפשר לעשות עוד היום.
            </p>

            <div style="background:#f8f9fb;border-right:4px solid #22c55e;border-radius:8px;padding:16px 18px;margin:0 0 24px;">
              <p style="margin:0;font-size:14px;color:#1a2744;line-height:1.6;">
                <strong>חשוב לדעת:</strong> כשהתוכנית תיפתח רשמית — תקבלו <strong>הדרכה מסודרת</strong> על איך להשתמש בכל הפיצ'רים. אין צורך להבין הכול עכשיו 🙂
              </p>
            </div>

            <h3 style="margin:0 0 12px;font-size:17px;color:#1a2744;">מה התווסף לאחרונה</h3>
            <ul style="margin:0 0 28px;padding:0 20px 0 0;font-size:15px;color:#555;line-height:1.9;">
              <li><strong>טבלת עבודה</strong> — ניהול משימות לכל מיזם, עם קטגוריות (מוצר/עיסקי), אחראי ביצוע, ותאריכי יעד.</li>
              <li><strong>חוברת מיזם</strong> — 13 פרקים מובנים לבניית מצגת משקיעים שתמלאו לאורך התוכנית.</li>
              <li><strong>סיכומי פגישות מנטורינג</strong> — אתם כותבים סיכום אחרי כל פגישה, והמנטור/ית מגיב/ה עם משוב מובנה.</li>
              <li><strong>חומרים נוספים בכל הרצאה</strong> — מצגות, קישורים וקבצים שאפשר להוריד.</li>
              <li><strong>הערות אישיות לכל הרצאה</strong> — מקום פרטי משלכם לרשום הערות תוך כדי הרצאה.</li>
              <li><strong>פיד פעילות פיתוח</strong> בעמוד הבית — שקוף לחלוטין על מה אנחנו עובדים בכל רגע נתון.</li>
            </ul>

            <h3 style="margin:0 0 12px;font-size:17px;color:#1a2744;">מה אפשר לעשות בינתיים</h3>
            <ul style="margin:0 0 28px;padding:0 20px 0 0;font-size:15px;color:#555;line-height:1.9;">
              <li>🧑 <strong>להשלים את הפרופיל</strong> — תמונה, ביוגרפיה קצרה, קישור ל-LinkedIn ותפקיד במיזם.</li>
              <li>📋 <strong>למלא את שאלון הפתיחה</strong> אם עוד לא — זה עוזר לנו להכיר אתכם לפני התוכנית.</li>
              <li>🎤 <strong>להציץ בסילבוס ההרצאות</strong> ולראות מה צפוי לכם בשבועות הקרובים.</li>
              <li>💬 <strong>להתחבר עם הצוות</strong> דרך פרטי הקשר בעמוד הבית של הפורטל.</li>
            </ul>

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${PORTAL_URL}/login" style="display:inline-block;background-color:#22c55e;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;padding:14px 40px;border-radius:10px;">
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
    </td></tr>
  </table>
</body>
</html>`;
}

async function fetchAllRecipients(): Promise<{ email: string; full_name: string | null }[]> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for --all/--dry"
    );
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data, error } = await supabase
    .from("profiles")
    .select("email, full_name")
    .order("full_name");
  if (error) throw error;
  return (data || []).filter(
    (r): r is { email: string; full_name: string | null } =>
      typeof r.email === "string" && r.email.includes("@")
  );
}

async function send(to: string, fullName: string | null) {
  const { error, data } = await resend.emails.send({
    from: FROM,
    to,
    subject: SUBJECT,
    html: emailHtml(fullName),
  });
  if (error) {
    console.error(`✗ ${to}: ${error.message}`);
    return false;
  }
  console.log(`✓ ${to} (id ${data?.id})`);
  return true;
}

async function main() {
  if (argMap.has("to")) {
    const to = String(argMap.get("to"));
    console.log(`Sending test → ${to}`);
    await send(to, null);
    return;
  }

  if (argMap.has("dry")) {
    const recipients = await fetchAllRecipients();
    console.log(`${recipients.length} recipients:`);
    for (const r of recipients) console.log(`  - ${r.email} (${r.full_name ?? "—"})`);
    return;
  }

  if (argMap.has("all")) {
    const recipients = await fetchAllRecipients();
    console.log(`Sending to ${recipients.length} recipients...`);
    let ok = 0,
      fail = 0;
    for (const r of recipients) {
      const success = await send(r.email, r.full_name);
      if (success) ok++;
      else fail++;
      // Resend free tier rate-limits to ~2/sec — slow down to be safe.
      await new Promise((res) => setTimeout(res, 600));
    }
    console.log(`Done. sent=${ok} failed=${fail}`);
    return;
  }

  console.error(
    "Usage: tsx scripts/send-announcement.ts --to=<email> | --all | --dry"
  );
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
