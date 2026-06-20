import { logger } from "./logger";

const RESEND_API_KEY = process.env["RESEND_API_KEY"];
const FROM_EMAIL = "FUTRSEC <noreply@futrsec.com>";
const IS_DEV = process.env["NODE_ENV"] === "development";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  if (!RESEND_API_KEY) {
    if (IS_DEV) {
      logger.warn(
        { to: opts.to, subject: opts.subject },
        "Email skipped — RESEND_API_KEY not set (dev mode)"
      );
    } else {
      logger.error(
        { to: opts.to, subject: opts.subject },
        "Email not sent — RESEND_API_KEY missing in production"
      );
    }
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      ...(opts.text ? { text: opts.text } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "(no body)");
    logger.error(
      { to: opts.to, subject: opts.subject, status: response.status, body },
      "Resend API error"
    );
    throw new Error(`Resend API error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as { id?: string };
  logger.info(
    { to: opts.to, subject: opts.subject, messageId: data.id },
    "Email sent successfully"
  );
}

export function buildOtpEmail(otp: string): { html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Inter, Arial, sans-serif; background: #F8F8F6; margin: 0; padding: 40px 0;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e5e5;">
          <tr>
            <td style="background: #08111F; padding: 28px 40px;">
              <span style="color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">FUTRSEC</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 12px; font-size: 24px; color: #08111F;">Your sign-in code</h1>
              <p style="margin: 0 0 32px; color: #666; font-size: 15px; line-height: 1.5;">
                Use this code to sign in to FUTRSEC. It expires in <strong>5 minutes</strong>.
              </p>
              <div style="background: #F8F8F6; border: 1px solid #e5e5e5; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 32px;">
                <span style="font-size: 40px; font-weight: 700; letter-spacing: 10px; color: #08111F; font-family: monospace;">${otp}</span>
              </div>
              <p style="margin: 0; color: #999; font-size: 13px; line-height: 1.5;">
                If you didn't request this code, you can safely ignore this email. Someone may have typed your email address by mistake.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; border-top: 1px solid #e5e5e5; background: #fafafa;">
              <p style="margin: 0; color: #bbb; font-size: 12px;">© 2025 FUTRSEC · India's cybersecurity learning platform</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Your FUTRSEC sign-in code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you didn't request this, ignore this email.`;

  return { html, text };
}
