import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendNotificationEmail({
  to,
  subject,
  heading,
  body,
  ctaText,
  ctaUrl,
}: {
  to: string | string[];
  subject: string;
  heading: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const recipients = Array.isArray(to) ? to : [to];
  if (recipients.length === 0) return;

  const ctaHtml = ctaText && ctaUrl ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td align="center">
          <a href="${ctaUrl}" style="display:inline-block;background-color:#22c55e;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;padding:12px 32px;border-radius:8px;">
            ${ctaText}
          </a>
        </td>
      </tr>
    </table>` : "";

  try {
    await resend.emails.send({
      from: "OfekTech <send@ofektech-portal.co.il>",
      to: recipients,
      subject,
      html: `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
          <tr>
            <td style="background-color:#1a2744;padding:20px 32px;text-align:center;">
              <span style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:1px;">OFEK</span><span style="color:#22c55e;font-size:20px;font-weight:bold;">TECH</span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <h2 style="margin:0 0 12px;font-size:18px;color:#1a2744;">${heading}</h2>
              <p style="margin:0;font-size:14px;color:#555;line-height:1.7;">${body}</p>
              ${ctaHtml}
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f9fb;padding:14px 32px;text-align:center;border-top:1px solid #eee;">
              <p style="margin:0;font-size:11px;color:#aaa;">OfekTech — יזמות, חדשנות וטכנולוגיה</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    });
  } catch {
    // Silently fail
  }
}
