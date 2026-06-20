import type { Job } from "bullmq";
import { logger } from "../lib/logger";
import { sendEmail } from "../lib/email";

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
    "Processing email job"
  );

  const html = buildTemplateHtml(template, variables ?? {});
  await sendEmail({ to, subject, html });
}

function buildTemplateHtml(template: string, vars: Record<string, string>): string {
  const replace = (s: string) =>
    s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? "");

  switch (template) {
    case "welcome":
      return replace(`
        <div style="font-family: Inter, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
          <h1 style="color: #08111F;">Welcome to FUTRSEC, {{name}}!</h1>
          <p>You're on your way to becoming India's next cybersecurity professional.</p>
          <p>Complete your profile and choose your learning track to get started.</p>
        </div>`);

    case "onboarding_complete":
      return replace(`
        <div style="font-family: Inter, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
          <h1 style="color: #08111F;">You're all set, {{name}}!</h1>
          <p>Your <strong>{{trackName}}</strong> learning journey has begun.</p>
          <p>Head to your dashboard to start your first module.</p>
        </div>`);

    case "data_export_ready":
      return replace(`
        <div style="font-family: Inter, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
          <h1 style="color: #08111F;">Your data export is ready</h1>
          <p>As requested under DPDP Act 2023, your personal data export is available for download.</p>
          <p>The export link will expire in 24 hours.</p>
        </div>`);

    case "data_deletion_confirmed":
      return replace(`
        <div style="font-family: Inter, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
          <h1 style="color: #08111F;">Account deletion confirmed</h1>
          <p>Your FUTRSEC account and personal data have been permanently deleted as requested.</p>
          <p>This action cannot be undone. Thank you for using FUTRSEC.</p>
        </div>`);

    default:
      return `<p>${vars["message"] ?? `Email: ${template}`}</p>`;
  }
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
