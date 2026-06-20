import nodemailer from "nodemailer";
import { logger } from "./logger";

const SMTP_HOST = process.env["SMTP_HOST"];
const SMTP_PORT = parseInt(process.env["SMTP_PORT"] ?? "587", 10);
const SMTP_USER = process.env["SMTP_USER"];
const SMTP_PASS = process.env["SMTP_PASS"];
const SMTP_FROM = process.env["SMTP_FROM"] ?? "FUTRSEC <noreply@futrsec.com>";
const IS_DEV = process.env["NODE_ENV"] === "development";

function createTransport() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const transport = createTransport();

  if (!transport) {
    if (IS_DEV) {
      logger.warn(
        { to: opts.to, subject: opts.subject },
        "Email skipped — SMTP not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS)"
      );
    } else {
      logger.error(
        { to: opts.to, subject: opts.subject },
        "Email not sent — SMTP credentials missing in production"
      );
    }
    return;
  }

  try {
    const info = await transport.sendMail({
      from: SMTP_FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      ...(opts.text ? { text: opts.text } : {}),
    });

    logger.info(
      { to: opts.to, subject: opts.subject, messageId: info.messageId },
      "Email sent successfully"
    );
  } catch (err) {
    logger.error(
      { to: opts.to, subject: opts.subject, err: (err as Error).message },
      "Failed to send email via SMTP"
    );
    throw err;
  }
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
                If you didn't request this code, you can safely ignore this email.
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
