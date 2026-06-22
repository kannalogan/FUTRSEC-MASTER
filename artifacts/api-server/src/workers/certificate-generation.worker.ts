import type { Job } from "bullmq";
import { eq } from "drizzle-orm";
import { db, certificateGenerationJobsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { getRedisClient, isRedisAvailable } from "../lib/redis";
import { addCertDlqJob } from "../lib/queues";
import { generatePdfForId } from "../lib/certificates/generate";
import {
  recomputeParent,
  publishProgress,
  computeRates,
} from "../lib/certificates/job-progress";

// How many certificates within a single shard are processed in parallel.
// Per-cert cost is dominated by network I/O (object-storage upload + ACL + DB),
// so overlapping them is the main throughput lever; tune via env if needed.
const INNER_CONCURRENCY = Number(process.env.CERT_BULK_CONCURRENCY ?? 20);
// Per-certificate render attempts before it is counted as failed.
const PER_CERT_ATTEMPTS = 3;

function cancelKey(dbJobId: number) {
  return `cert:job:${dbJobId}:cancel`;
}
function pauseKey(dbJobId: number) {
  return `cert:job:${dbJobId}:pause`;
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

// A shard observes BOTH its own flag and its parent's flag, so an admin can
// pause/cancel the whole run by flagging only the parent id.
async function cancelled(dbJobId: number, parentJobId: number): Promise<boolean> {
  return (await flagSet(cancelKey(parentJobId))) || (await flagSet(cancelKey(dbJobId)));
}
async function paused(dbJobId: number, parentJobId: number): Promise<boolean> {
  return (await flagSet(pauseKey(parentJobId))) || (await flagSet(pauseKey(dbJobId)));
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

export interface WorkerMeta {
  workerId: string;
  partition: number;
  replica: number;
  onProgress?: (delta: number, currentJobId: number | null) => void;
}

async function publishShard(
  dbJobId: number,
  parentJobId: number,
  shardIndex: number,
  status: string,
  total: number,
  processed: number,
  succeeded: number,
  failed: number,
  startedAt: number,
): Promise<void> {
  const { throughputPerSec, etaSeconds } = computeRates(
    processed,
    total,
    new Date(startedAt),
    null,
  );
  await publishProgress({
    kind: "shard",
    dbJobId,
    parentJobId,
    shardIndex,
    shardCount: 0,
    status,
    total,
    processed,
    succeeded,
    failed,
    avgMsPerCert: processed
      ? Math.round((Date.now() - startedAt) / processed)
      : null,
    throughputPerSec,
    etaSeconds,
  });
}

async function processShard(job: Job, meta?: WorkerMeta): Promise<void> {
  const { dbJobId, certificateIds, parentJobId, shardIndex } = job.data as {
    dbJobId: number;
    certificateIds: number[];
    parentJobId: number;
    shardIndex: number;
  };
  // Standalone (legacy) jobs without a parent aggregate onto themselves.
  const parent = parentJobId ?? dbJobId;
  const total = certificateIds.length;
  const startedAt = Date.now();

  await db
    .update(certificateGenerationJobsTable)
    .set({ status: "running", startedAt: new Date(), total, bullJobId: job.id })
    .where(eq(certificateGenerationJobsTable.id, dbJobId));
  meta?.onProgress?.(0, dbJobId);

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
        completedAt: new Date(),
        durationMs: Date.now() - startedAt,
      })
      .where(eq(certificateGenerationJobsTable.id, dbJobId));
    await publishShard(
      dbJobId,
      parent,
      shardIndex ?? 0,
      "cancelled",
      total,
      processed,
      succeeded,
      failed,
      startedAt,
    );
    await recomputeParent(parent);
  };

  for (let i = 0; i < certificateIds.length; i += INNER_CONCURRENCY) {
    if (await cancelled(dbJobId, parent)) {
      await finalizeCancelled();
      return;
    }

    while (await paused(dbJobId, parent)) {
      if (await cancelled(dbJobId, parent)) break;
      await db
        .update(certificateGenerationJobsTable)
        .set({ status: "paused", processed, succeeded, failed })
        .where(eq(certificateGenerationJobsTable.id, dbJobId));
      await publishShard(
        dbJobId,
        parent,
        shardIndex ?? 0,
        "paused",
        total,
        processed,
        succeeded,
        failed,
        startedAt,
      );
      await recomputeParent(parent);
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (await cancelled(dbJobId, parent)) {
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
    meta?.onProgress?.(chunk.length, dbJobId);
    await publishShard(
      dbJobId,
      parent,
      shardIndex ?? 0,
      "running",
      total,
      processed,
      succeeded,
      failed,
      startedAt,
    );
    await recomputeParent(parent);
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

  await publishShard(
    dbJobId,
    parent,
    shardIndex ?? 0,
    finalStatus,
    total,
    processed,
    succeeded,
    failed,
    startedAt,
  );
  await recomputeParent(parent);

  // Park failures in the dead-letter queue for later inspection / re-drive.
  if (failedIds.length > 0) {
    await addCertDlqJob({
      dbJobId,
      certificateIds: failedIds,
      reason: `${failedIds.length} certificate(s) failed after ${PER_CERT_ATTEMPTS} attempts`,
    });
  }
}

/**
 * Build a queue processor bound to a specific worker replica's identity so it
 * can report heartbeats/utilization. Each replica gets its own closure.
 */
export function createCertGenerationProcessor(
  meta?: WorkerMeta,
): (job: Job) => Promise<void> {
  return async (job: Job): Promise<void> => {
    if (job.name === "single") {
      const { certificateId } = job.data as { certificateId: number };
      await generatePdfForId(certificateId);
      return;
    }
    if (job.name === "bulk") {
      await processShard(job, meta);
      return;
    }
    logger.warn({ name: job.name }, "unknown certificate generation job name");
  };
}

// Back-compat default processor (no heartbeat identity).
export const processCertificateGenerationJob = createCertGenerationProcessor();

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
