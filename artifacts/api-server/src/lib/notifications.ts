import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  notificationsTable,
  emailLogsTable,
  usersTable,
  type Notification,
} from "@workspace/db";
import { logger } from "./logger";
import { sendEmail } from "./email";

// Canonical notification types used across Part 5 modules.
export const NOTIFICATION_TYPES = {
  SYSTEM: "system",
  ANNOUNCEMENT: "announcement",
  JOB_MATCH: "job_match",
  APPLICATION_UPDATE: "application_update",
  PLACEMENT: "placement",
  CAMPUS_DRIVE: "campus_drive",
  SUBSCRIPTION: "subscription",
  PAYMENT: "payment",
  SIGNUP: "signup",
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

// Delivery channels. Only in_app + email are active; the rest are accepted
// (so callers/event payloads stay forward-compatible) but no-op for now —
// real WhatsApp/SMS/Push delivery is Phase 5B (out of scope).
export type NotificationChannel =
  | "in_app"
  | "email"
  | "whatsapp"
  | "sms"
  | "push";

const ACTIVE_CHANNELS: ReadonlySet<NotificationChannel> = new Set([
  "in_app",
  "email",
]);

export interface CreateNotificationInput {
  userId: number;
  role?: string | null;
  title: string;
  message: string;
  type?: string;
  entityType?: string | null;
  entityId?: number | null;
  link?: string | null;
  channels?: NotificationChannel[];
}

/**
 * Create a notification across the requested channels.
 *
 * - `in_app`: inserts a row into notificationsTable.
 * - `email`: if the user has an email on file, sends via SMTP and records the
 *   attempt in emailLogsTable (status sent/failed).
 * - `whatsapp` / `sms` / `push`: accepted but skipped (logged), reserved for 5B.
 *
 * Returns the in_app notification row when the in_app channel is used.
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<Notification | null> {
  const {
    userId,
    role = null,
    title,
    message,
    type = NOTIFICATION_TYPES.SYSTEM,
    entityType = null,
    entityId = null,
    link = null,
    channels = ["in_app"],
  } = input;

  let inAppRow: Notification | null = null;

  for (const channel of channels) {
    if (!ACTIVE_CHANNELS.has(channel)) {
      logger.info(
        { userId, channel, type },
        "Notification channel skipped — not active until Phase 5B"
      );
      continue;
    }

    if (channel === "in_app") {
      const [row] = await db
        .insert(notificationsTable)
        .values({
          userId,
          role,
          title,
          message,
          type,
          channel: "in_app",
          entityType,
          entityId,
          link,
        })
        .returning();
      inAppRow = row ?? null;
    }

    if (channel === "email") {
      await sendEmailNotification({ userId, title, message });
    }
  }

  return inAppRow;
}

async function sendEmailNotification(opts: {
  userId: number;
  title: string;
  message: string;
}): Promise<void> {
  const { userId, title, message } = opts;
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId),
  });

  if (!user?.email) {
    logger.info(
      { userId },
      "Email notification skipped — user has no email on file"
    );
    return;
  }

  const html = buildNotificationEmail(title, message);

  try {
    await sendEmail({ to: user.email, subject: title, html, text: message });
    await db.insert(emailLogsTable).values({
      userId,
      email: user.email,
      subject: title,
      body: message,
      status: "sent",
      provider: "smtp",
      sentAt: new Date(),
    });
  } catch (err) {
    const errorMessage = (err as Error).message;
    logger.error(
      { userId, err: errorMessage },
      "Failed to send notification email"
    );
    await db.insert(emailLogsTable).values({
      userId,
      email: user.email,
      subject: title,
      body: message,
      status: "failed",
      provider: "smtp",
      error: errorMessage,
    });
  }
}

function buildNotificationEmail(title: string, message: string): string {
  return `
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
              <h1 style="margin: 0 0 12px; font-size: 22px; color: #08111F;">${title}</h1>
              <p style="margin: 0; color: #444; font-size: 15px; line-height: 1.6;">${message}</p>
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
}
