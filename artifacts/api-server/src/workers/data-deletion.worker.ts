import type { Job } from "bullmq";
import { eq } from "drizzle-orm";
import {
  db,
  usersTable,
  studentProfilesTable,
  mentorProfilesTable,
  consentLogsTable,
  refreshTokensTable,
  dataDeleteRequestsTable,
  aiResumeAnalysisTable,
} from "@workspace/db";
import { logger } from "../lib/logger";
import { createAuditLog } from "../lib/audit";
import { addEmailJob } from "../lib/queues";
import { EMAIL_TEMPLATES } from "./email.worker";

export interface DataDeletionJobData {
  userId: number;
  requestId: number;
  reason: string;
}

export async function processDataDeletionJob(
  job: Job<DataDeletionJobData>
): Promise<void> {
  const { userId, requestId, reason } = job.data;

  try {
    await db
      .update(dataDeleteRequestsTable)
      .set({ status: "processing" })
      .where(eq(dataDeleteRequestsTable.id, requestId));

    const [user] = await db
      .select({ email: usersTable.email, fullName: usersTable.fullName })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    const contactEmail = user?.email;

    // ── DPDP §13 Right of Erasure ──────────────────────────────────────────

    // 1. Revoke all refresh tokens (force logout)
    await db
      .update(refreshTokensTable)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokensTable.userId, userId));

    // 2. Delete active consent record (history rows retained for compliance audit)
    await db
      .delete(consentLogsTable)
      .where(eq(consentLogsTable.userId, userId));

    // 3. Anonymize student profile PII
    await db
      .update(studentProfilesTable)
      .set({
        college: null,
        city: null,
        linkedinUrl: null,
        githubUrl: null,
        resumeUrl: null,
        bio: null,
      })
      .where(eq(studentProfilesTable.userId, userId));

    // 4. Anonymize mentor profile PII
    await db
      .update(mentorProfilesTable)
      .set({
        bio: null,
        linkedinUrl: null,
        calendlyUrl: null,
        company: null,
        designation: null,
      })
      .where(eq(mentorProfilesTable.userId, userId));

    // 5. Nullify resume analysis PII
    await db
      .update(aiResumeAnalysisTable)
      .set({ analysisResult: null, suggestions: null })
      .where(eq(aiResumeAnalysisTable.userId, userId));

    // 6. Anonymize the user record itself (soft delete preserves analytics)
    const anonymizedEmail = `deleted_${userId}_${Date.now()}@futrsec.invalid`;
    await db
      .update(usersTable)
      .set({
        email: anonymizedEmail,
        phone: null,
        fullName: `[Deleted User]`,
        avatarUrl: null,
        isActive: false,
      })
      .where(eq(usersTable.id, userId));

    // 7. Mark deletion request completed
    await db
      .update(dataDeleteRequestsTable)
      .set({
        status: "completed",
        completedAt: new Date(),
        notes:
          "All personal data anonymized per DPDP Act 2023 §13. Academic and audit records retained for legal compliance.",
      })
      .where(eq(dataDeleteRequestsTable.id, requestId));

    // 8. Final audit log (before PII is gone)
    await createAuditLog({
      userId,
      action: "dpdp.data_deletion_completed",
      entityType: "user",
      entityId: userId,
      metadata: { requestId, reason },
    });

    // 9. Confirmation email (if we still have the email before anonymization)
    if (contactEmail) {
      await addEmailJob({
        to: contactEmail,
        subject: "FUTRSEC account data deletion confirmation",
        template: EMAIL_TEMPLATES.DATA_DELETION_CONFIRMED,
        variables: { requestId: String(requestId) },
        userId,
      }).catch((err) =>
        logger.warn({ err }, "Failed to queue data-deletion confirmation email")
      );
    }

    logger.info(
      { userId, requestId },
      "Data deletion completed — user PII anonymized"
    );
  } catch (err) {
    logger.error({ err, userId, requestId }, "Data deletion job failed");

    await db
      .update(dataDeleteRequestsTable)
      .set({
        status: "rejected",
        notes: "Deletion failed. Please contact support@futrsec.com.",
      })
      .where(eq(dataDeleteRequestsTable.id, requestId))
      .catch(() => undefined);

    throw err;
  }
}
