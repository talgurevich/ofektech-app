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

const SUBJECT = "חדש בפורטל: פיד הקהילה — מקום לכם לדבר איתנו ובינכם";
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
              הוספנו לפורטל פיצ'ר חדש — <strong>פיד הקהילה</strong>. זה מקום לכם לדבר איתנו, להעלות פידבק על הפורטל, לפרסם משהו מעניין שראיתם, לשאול שאלה או פשוט לעדכן את שאר הקהילה במה שאתם עושים.
            </p>

            <div style="background:#f8f9fb;border-right:4px solid #22c55e;border-radius:8px;padding:16px 18px;margin:0 0 24px;">
              <p style="margin:0;font-size:14px;color:#1a2744;line-height:1.7;">
                <strong>איך משתמשים?</strong>
                <br>תיכנסו לפורטל ולחצו על <strong>פיד הקהילה</strong> בתפריט הצד.
                שם תוכלו לפרסם פוסט (כולל תמונה אם בא לכם), להגיב לאחרים, ולהגיב עם 👍 ❤️ 👏 🎉.
                אפשר גם לאזכר חבר קהילה דרך @ והם יקבלו התראה.
              </p>
            </div>

            <h3 style="margin:0 0 12px;font-size:17px;color:#1a2744;">למה הוספנו את זה?</h3>
            <ul style="margin:0 0 24px;padding:0 20px 0 0;font-size:15px;color:#555;line-height:1.9;">
              <li><strong>פידבק על הפורטל</strong> — מה עובד? מה לא? מה חסר? אנחנו כאן בשבילכם, כל הצעה תיענה.</li>
              <li><strong>היכרות בין חברי הקהילה</strong> — תוכלו להציג את עצמכם, לשתף את המיזם שלכם, ולמצוא חיבורים.</li>
              <li><strong>שאלות והצלחות</strong> — שתפו אתגרים, רעיונות, ניצחונות. מישהו אחר בטח יתחבר.</li>
            </ul>

            <h3 style="margin:0 0 12px;font-size:17px;color:#1a2744;">תזכורת — מה כדאי להספיק לפני שהתוכנית מתחילה</h3>
            <ul style="margin:0 0 28px;padding:0 20px 0 0;font-size:15px;color:#555;line-height:1.9;">
              <li>🧑 <strong>להשלים את הפרופיל</strong> — תמונה, ביוגרפיה קצרה, קישור ל-LinkedIn ותפקיד במיזם. הפרופיל שלכם נראה לשאר חברי הקהילה כשאתם מפרסמים.</li>
              <li>📋 <strong>למלא את שאלון הפתיחה</strong> אם עוד לא — זה עוזר לנו להכיר אתכם לפני שמתחילים.</li>
              <li>🎤 <strong>להציץ בסילבוס</strong> ולראות מה מחכה לכם בשבועות הקרובים.</li>
            </ul>

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${PORTAL_URL}/feed" style="display:inline-block;background-color:#22c55e;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;padding:14px 40px;border-radius:10px;">
                    כניסה לפיד הקהילה
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
