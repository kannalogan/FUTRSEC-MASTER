import type { Job } from "bullmq";
import { logger } from "../lib/logger";

export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  variables?: Record<string, string>;
  userId?: number;
}

export async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { to, subject, template, variables, userId } = job.data;

  logger.info(
    { jobId: job.id, to, subject, template, userId },
    "Email job processed"
  );

  // TODO: Integrate with email provider (AWS SES / SendGrid / Resend)
  // Example:
  // await ses.sendTemplatedEmail({
  //   Destination: { ToAddresses: [to] },
  //   Template: template,
  //   TemplateData: JSON.stringify(variables ?? {}),
  //   Source: "noreply@futrsec.com",
  // }).promise();
}

export const EMAIL_TEMPLATES = {
  WELCOME: "welcome",
  OTP: "otp",
  ONBOARDING_COMPLETE: "onboarding_complete",
  ASSESSMENT_RESULT: "assessment_result",
  DATA_EXPORT_READY: "data_export_ready",
  DATA_DELETION_CONFIRMED: "data_deletion_confirmed",
  JOB_APPLICATION_UPDATE: "job_application_update",
  MENTOR_SESSION_REMINDER: "mentor_session_reminder",
} as const;
