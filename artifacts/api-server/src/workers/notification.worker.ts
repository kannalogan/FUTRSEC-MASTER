import type { Job } from "bullmq";
import { logger } from "../lib/logger";

export interface NotificationJobData {
  userId: number;
  type: string;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export async function processNotificationJob(
  job: Job<NotificationJobData>
): Promise<void> {
  const { userId, type, title, message } = job.data;

  logger.info(
    { jobId: job.id, userId, type, title },
    "Notification job processed"
  );

  // TODO: Insert into notifications table (Part 2)
  // await db.insert(notificationsTable).values({
  //   userId,
  //   type,
  //   title,
  //   message,
  //   link: job.data.link,
  //   metadata: JSON.stringify(job.data.metadata ?? {}),
  // });

  // TODO: Push via WebSocket / FCM / APNs in Part 2
}

export const NOTIFICATION_TYPES = {
  ONBOARDING_COMPLETE: "onboarding_complete",
  ASSESSMENT_GRADED: "assessment_graded",
  LAB_UNLOCKED: "lab_unlocked",
  JOB_MATCH: "job_match",
  APPLICATION_STATUS_CHANGE: "application_status_change",
  MENTOR_SESSION_BOOKED: "mentor_session_booked",
  BROADCAST_RECEIVED: "broadcast_received",
  DATA_EXPORT_READY: "data_export_ready",
} as const;
