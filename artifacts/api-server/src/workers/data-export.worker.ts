import type { Job } from "bullmq";
import { eq } from "drizzle-orm";
import {
  db,
  usersTable,
  studentProfilesTable,
  consentLogsTable,
  consentHistoryTable,
  assessmentAttemptsTable,
  assessmentResultsTable,
  ftsScoresTable,
  dataDownloadRequestsTable,
} from "@workspace/db";
import { logger } from "../lib/logger";
import { createAuditLog } from "../lib/audit";
import { addEmailJob } from "../lib/queues";
import { EMAIL_TEMPLATES } from "./email.worker";

export interface DataExportJobData {
  userId: number;
  requestId: number;
}

export async function processDataExportJob(
  job: Job<DataExportJobData>
): Promise<void> {
  const { userId, requestId } = job.data;

  try {
    await db
      .update(dataDownloadRequestsTable)
      .set({ status: "processing" })
      .where(eq(dataDownloadRequestsTable.id, requestId));

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    const [profile] = await db
      .select()
      .from(studentProfilesTable)
      .where(eq(studentProfilesTable.userId, userId));

    const [consent] = await db
      .select()
      .from(consentLogsTable)
      .where(eq(consentLogsTable.userId, userId));

    const consentHistory = await db
      .select({
        consentType: consentHistoryTable.consentType,
        action: consentHistoryTable.action,
        createdAt: consentHistoryTable.createdAt,
      })
      .from(consentHistoryTable)
      .where(eq(consentHistoryTable.userId, userId))
      .orderBy(consentHistoryTable.createdAt);

    const attempts = await db
      .select()
      .from(assessmentAttemptsTable)
      .where(eq(assessmentAttemptsTable.userId, userId));

    const results = await db
      .select()
      .from(assessmentResultsTable)
      .where(eq(assessmentResultsTable.userId, userId));

    const [fts] = await db
      .select()
      .from(ftsScoresTable)
      .where(eq(ftsScoresTable.userId, userId));

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      exportVersion: "1.0",
      platform: "FUTRSEC",
      subject: {
        id: user?.id,
        email: user?.email,
        phone: user?.phone,
        fullName: user?.fullName,
        role: user?.role,
        onboardingStep: user?.onboardingStep,
        createdAt: user?.createdAt,
      },
      profile: profile
        ? {
            college: profile.college,
            graduationYear: profile.graduationYear,
            city: profile.city,
            currentRole: profile.currentRole,
            bio: profile.bio,
          }
        : null,
      consent: consent
        ? {
            marketing: consent.marketing,
            analytics: consent.analytics,
            dataProcessing: consent.dataProcessing,
            thirdParty: consent.thirdParty,
            updatedAt: consent.updatedAt,
          }
        : null,
      consentHistory,
      assessments: {
        attempts: attempts.map((a) => ({
          assessmentId: a.assessmentId,
          status: a.status,
          startedAt: a.startedAt,
          submittedAt: a.submittedAt,
        })),
        results: results.map((r) => ({
          score: r.score,
          totalMarks: r.totalMarks,
          percentage: r.percentage,
          passed: r.passed,
          suggestedTrackLevel: r.suggestedTrackLevel,
          createdAt: r.createdAt,
        })),
      },
      ftsScore: fts
        ? {
            totalScore: fts.totalScore,
            assessmentScore: fts.assessmentScore,
            labScore: fts.labScore,
            assignmentScore: fts.assignmentScore,
            attendanceScore: fts.attendanceScore,
            updatedAt: fts.updatedAt,
          }
        : null,
    };

    const dataJson = JSON.stringify(exportPayload, null, 2);
    const sizeKb = Math.ceil(Buffer.byteLength(dataJson, "utf8") / 1024);

    await db
      .update(dataDownloadRequestsTable)
      .set({
        status: "completed",
        completedAt: new Date(),
        notes: `Export complete. ${sizeKb} KB, ${Object.keys(exportPayload).length} data categories. Download link will be emailed shortly.`,
      })
      .where(eq(dataDownloadRequestsTable.id, requestId));

    await createAuditLog({
      userId,
      action: "dpdp.data_export_completed",
      entityType: "data_download_request",
      entityId: requestId,
      metadata: { sizeKb },
    });

    if (user?.email) {
      await addEmailJob({
        to: user.email,
        subject: "Your FUTRSEC data export is ready",
        template: EMAIL_TEMPLATES.DATA_EXPORT_READY,
        variables: { fullName: user.fullName ?? "there", requestId: String(requestId) },
        userId,
      }).catch((err) => logger.warn({ err }, "Failed to queue data-export email"));
    }

    logger.info(
      { userId, requestId, sizeKb },
      "Data export completed successfully"
    );
  } catch (err) {
    logger.error({ err, userId, requestId }, "Data export job failed");

    await db
      .update(dataDownloadRequestsTable)
      .set({
        status: "rejected",
        notes: "Export failed due to an internal error. Please try again.",
      })
      .where(eq(dataDownloadRequestsTable.id, requestId))
      .catch(() => undefined);

    throw err;
  }
}
