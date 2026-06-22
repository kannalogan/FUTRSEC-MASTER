import type { Job } from "bullmq";
import { eq } from "drizzle-orm";
import { db, certificateGenerationJobsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { getRedisClient, isRedisAvailable } from "../lib/redis";
import { addCertDlqJob } from "../lib/queues";
import { generatePdfForId } from "../lib/certificates/generate";

// How many certificates within a single bulk job are processed in parallel.
// Per-cert cost is dominated by network I/O (object-storage upload + ACL + DB),
// so overlapping them is the main throughput lever; tune via env if needed.
const INNER_CONCURRENCY = Number(process.env.CERT_BULK_CONCURRENCY ?? 40);
// Per-certificate render attempts before it is counted as failed.
const PER_CERT_ATTEMPTS = 3;

function cancelKey(dbJobId: number) {
  return `cert:job:${dbJobId}:cancel`;
}
function pauseKey(dbJobId: number) {
  return `cert:job:${dbJobId}:pause`;
}
function progressChannel(dbJobId: number) {
  return `cert:job:${dbJobId}:progress`;
}

async function flagSet(key: string): Promise<boolean> {
  if (!isRedisAvailable()) return false;
  try {
    const v = await getRedisClient().get(key);
    return v === "1";
  } catch {
    return false;
  }
}

interface ProgressSnapshot {
  dbJobId: number;
  status: string;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  avgMsPerCert: number | null;
}

async function publishProgress(snap: ProgressSnapshot): Promise<void> {
  if (!isRedisAvailable()) return;
  try {
    await getRedisClient().publish(
      progressChannel(snap.dbJobId),
      JSON.stringify(snap),
    );
  } catch {
    // Pub/sub is best-effort; DB row remains the source of truth.
  }
}

async function renderWithRetry(certId: number): Promise<boolean> {
  for (let attempt = 1; attempt <= PER_CERT_ATTEMPTS; attempt++) {
    try {
      await generatePdfForId(certId);
      return true;
    } catch (err) {
      if (attempt === PER_CERT_ATTEMPTS) {
        logger.error(
          { err: (err as Error).message, certId, attempt },
          "certificate render failed after retries",
        );
        return false;
      }
      await new Promise((r) => setTimeout(r, 250 * attempt));
    }
  }
  return false;
}

async function processBulk(job: Job): Promise<void> {
  const { dbJobId, certificateIds } = job.data as {
    dbJobId: number;
    certificateIds: number[];
  };
  const total = certificateIds.length;
  const startedAt = Date.now();

  await db
    .update(certificateGenerationJobsTable)
    .set({ status: "running", startedAt: new Date(), total, bullJobId: job.id })
    .where(eq(certificateGenerationJobsTable.id, dbJobId));

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  const failedIds: number[] = [];
  const succeededIds: number[] = [];

  const finalizeCancelled = async () => {
    await db
      .update(certificateGenerationJobsTable)
      .set({
        status: "cancelled",
        processed,
        succeeded,
        failed,
        failedIds,
        certificateIds: succeededIds,
        completedAt: new Date(),
        durationMs: Date.now() - startedAt,
      })
      .where(eq(certificateGenerationJobsTable.id, dbJobId));
    await publishProgress({
      dbJobId,
      status: "cancelled",
      total,
      processed,
      succeeded,
      failed,
      avgMsPerCert: processed
        ? Math.round((Date.now() - startedAt) / processed)
        : null,
    });
  };

  for (let i = 0; i < certificateIds.length; i += INNER_CONCURRENCY) {
    // Cancellation: stop immediately and mark cancelled.
    if (await flagSet(cancelKey(dbJobId))) {
      await finalizeCancelled();
      return;
    }

    // Pause: wait until unpaused or cancelled.
    while (await flagSet(pauseKey(dbJobId))) {
      if (await flagSet(cancelKey(dbJobId))) break;
      await db
        .update(certificateGenerationJobsTable)
        .set({ status: "paused", processed, succeeded, failed })
        .where(eq(certificateGenerationJobsTable.id, dbJobId));
      await publishProgress({
        dbJobId,
        status: "paused",
        total,
        processed,
        succeeded,
        failed,
        avgMsPerCert: processed ? Math.round((Date.now() - startedAt) / processed) : null,
      });
      await new Promise((r) => setTimeout(r, 1000));
    }
    // Re-check cancel after a pause so a cancel issued while paused stops work
    // immediately instead of processing one more chunk.
    if (await flagSet(cancelKey(dbJobId))) {
      await finalizeCancelled();
      return;
    }

    const chunk = certificateIds.slice(i, i + INNER_CONCURRENCY);
    const results = await Promise.all(
      chunk.map(async (certId) => ({
        certId,
        ok: await renderWithRetry(certId),
      })),
    );

    for (const r of results) {
      processed++;
      if (r.ok) {
        succeeded++;
        succeededIds.push(r.certId);
      } else {
        failed++;
        failedIds.push(r.certId);
      }
    }

    const avgMsPerCert = Math.round((Date.now() - startedAt) / processed);
    await db
      .update(certificateGenerationJobsTable)
      .set({ status: "running", processed, succeeded, failed, avgMsPerCert })
      .where(eq(certificateGenerationJobsTable.id, dbJobId));
    await job.updateProgress(Math.round((processed / total) * 100));
    await publishProgress({
      dbJobId,
      status: "running",
      total,
      processed,
      succeeded,
      failed,
      avgMsPerCert,
    });
  }

  const durationMs = Date.now() - startedAt;
  const finalStatus = failed > 0 && succeeded === 0 ? "failed" : "completed";
  await db
    .update(certificateGenerationJobsTable)
    .set({
      status: finalStatus,
      processed,
      succeeded,
      failed,
      failedIds,
      certificateIds: succeededIds,
      avgMsPerCert: processed ? Math.round(durationMs / processed) : 0,
      durationMs,
      completedAt: new Date(),
      error: failed > 0 ? `${failed} certificate(s) failed to render` : null,
    })
    .where(eq(certificateGenerationJobsTable.id, dbJobId));

  await publishProgress({
    dbJobId,
    status: finalStatus,
    total,
    processed,
    succeeded,
    failed,
    avgMsPerCert: processed ? Math.round(durationMs / processed) : 0,
  });

  // Park failures in the dead-letter queue for later inspection / re-drive.
  if (failedIds.length > 0) {
    await addCertDlqJob({
      dbJobId,
      certificateIds: failedIds,
      reason: `${failedIds.length} certificate(s) failed after ${PER_CERT_ATTEMPTS} attempts`,
    });
  }
}

export async function processCertificateGenerationJob(job: Job): Promise<void> {
  if (job.name === "single") {
    const { certificateId } = job.data as { certificateId: number };
    await generatePdfForId(certificateId);
    return;
  }
  if (job.name === "bulk") {
    await processBulk(job);
    return;
  }
  logger.warn({ name: job.name }, "unknown certificate generation job name");
}

// Dead-letter consumer: only records the parked batch. No re-processing here —
// re-drive is an explicit admin action (POST jobs/:id/retry).
export async function processCertificateDlqJob(job: Job): Promise<void> {
  const data = job.data as {
    dbJobId?: number;
    certificateIds: number[];
    reason: string;
  };
  logger.warn(
    { dbJobId: data.dbJobId, count: data.certificateIds.length, reason: data.reason },
    "certificate batch entered dead-letter queue",
  );
}
