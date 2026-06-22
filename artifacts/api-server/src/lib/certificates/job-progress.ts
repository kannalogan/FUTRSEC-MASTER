import { and, eq, notInArray } from "drizzle-orm";
import { db, certificateGenerationJobsTable } from "@workspace/db";
import { getRedisClient, isRedisAvailable } from "../redis";

export type JobStatus =
  | "queued"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

const TERMINAL: JobStatus[] = ["completed", "failed", "cancelled"];

export interface ProgressSnapshot {
  kind: "parent" | "shard";
  dbJobId: number;
  parentJobId: number | null;
  shardIndex: number | null;
  shardCount: number;
  status: string;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  avgMsPerCert: number | null;
  throughputPerSec: number | null;
  etaSeconds: number | null;
  completedShards?: number;
  failedShards?: number;
  runningShards?: number;
}

export function progressChannel(dbJobId: number): string {
  return `cert:job:${dbJobId}:progress`;
}

export async function publishProgress(snap: ProgressSnapshot): Promise<void> {
  if (!isRedisAvailable()) return;
  try {
    await getRedisClient().publish(
      progressChannel(snap.parentJobId ?? snap.dbJobId),
      JSON.stringify(snap),
    );
  } catch {
    // Pub/sub is best-effort; the DB row remains the source of truth.
  }
}

/** Throughput (certs/sec) and ETA (seconds) given progress + elapsed window. */
export function computeRates(
  processed: number,
  total: number,
  startedAt: Date | null,
  endedAt: Date | null,
): { throughputPerSec: number | null; etaSeconds: number | null } {
  if (!startedAt || processed <= 0) {
    return { throughputPerSec: null, etaSeconds: null };
  }
  const elapsedMs = (endedAt ?? new Date()).getTime() - startedAt.getTime();
  if (elapsedMs <= 0) return { throughputPerSec: null, etaSeconds: null };
  const throughputPerSec = processed / (elapsedMs / 1000);
  const remaining = Math.max(0, total - processed);
  const etaSeconds =
    throughputPerSec > 0 ? Math.round(remaining / throughputPerSec) : null;
  return {
    throughputPerSec: Math.round(throughputPerSec * 100) / 100,
    etaSeconds: endedAt ? 0 : etaSeconds,
  };
}

export interface ParentAggregate {
  status: JobStatus;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  shardCount: number;
  completedShards: number;
  failedShards: number;
  runningShards: number;
  cancelledShards: number;
  startedAt: Date | null;
  completedAt: Date | null;
  durationMs: number | null;
  avgMsPerCert: number | null;
  throughputPerSec: number | null;
  etaSeconds: number | null;
  failedIds: number[];
}

function deriveStatus(
  shards: { status: string }[],
): JobStatus {
  const anyRunning = shards.some((s) => s.status === "running");
  const anyPaused = shards.some((s) => s.status === "paused");
  const anyQueued = shards.some((s) => s.status === "queued");
  const someTerminal = shards.some((s) =>
    TERMINAL.includes(s.status as JobStatus),
  );
  const allTerminal = shards.every((s) =>
    TERMINAL.includes(s.status as JobStatus),
  );
  if (allTerminal) {
    if (shards.some((s) => s.status === "cancelled")) return "cancelled";
    if (shards.every((s) => s.status === "failed")) return "failed";
    return "completed";
  }
  if (anyRunning) return "running";
  if (anyPaused) return "paused";
  if (someTerminal && anyQueued) return "running";
  return "queued";
}

/**
 * Recompute a parent job's aggregate from its shard rows and persist it. Safe to
 * call concurrently from multiple shard workers: each call reads the current
 * shard rows fresh, so the last writer (after all shards reach a terminal state)
 * persists the authoritative final result. Returns the aggregate, or null when
 * the parent has no shards.
 */
export async function recomputeParent(
  parentJobId: number,
): Promise<ParentAggregate | null> {
  const shards = await db
    .select()
    .from(certificateGenerationJobsTable)
    .where(eq(certificateGenerationJobsTable.parentJobId, parentJobId));
  if (shards.length === 0) return null;

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let total = 0;
  let completedShards = 0;
  let failedShards = 0;
  let runningShards = 0;
  let cancelledShards = 0;
  let startedAt: Date | null = null;
  const failedIds: number[] = [];

  for (const s of shards) {
    processed += s.processed;
    succeeded += s.succeeded;
    failed += s.failed;
    total += s.total;
    if (s.status === "completed") completedShards++;
    else if (s.status === "failed") failedShards++;
    else if (s.status === "running") runningShards++;
    else if (s.status === "cancelled") cancelledShards++;
    if (s.startedAt && (!startedAt || s.startedAt < startedAt)) {
      startedAt = s.startedAt;
    }
    if (Array.isArray(s.failedIds)) {
      for (const id of s.failedIds as number[]) failedIds.push(id);
    }
  }

  const status = deriveStatus(shards);
  const isTerminal = TERMINAL.includes(status);
  const completedAt = isTerminal ? new Date() : null;
  const durationMs =
    startedAt && completedAt
      ? completedAt.getTime() - startedAt.getTime()
      : startedAt
        ? Date.now() - startedAt.getTime()
        : null;
  const avgMsPerCert =
    processed > 0 && durationMs != null ? Math.round(durationMs / processed) : null;
  const { throughputPerSec, etaSeconds } = computeRates(
    processed,
    total,
    startedAt,
    completedAt,
  );

  await db
    .update(certificateGenerationJobsTable)
    .set({
      status,
      total,
      processed,
      succeeded,
      failed,
      failedIds: isTerminal ? failedIds : undefined,
      avgMsPerCert: avgMsPerCert ?? undefined,
      durationMs: durationMs ?? undefined,
      startedAt: startedAt ?? undefined,
      completedAt: completedAt ?? undefined,
      error:
        isTerminal && failed > 0
          ? `${failed} certificate(s) failed across ${failedShards} shard(s)`
          : undefined,
    })
    // Monotonic guard: a non-terminal recompute (e.g. a slow worker writing a
    // stale "running" snapshot) must never revert a parent that has already
    // reached a terminal state. Terminal writes always win.
    .where(
      isTerminal
        ? eq(certificateGenerationJobsTable.id, parentJobId)
        : and(
            eq(certificateGenerationJobsTable.id, parentJobId),
            notInArray(certificateGenerationJobsTable.status, TERMINAL),
          ),
    );

  const agg: ParentAggregate = {
    status,
    total,
    processed,
    succeeded,
    failed,
    shardCount: shards.length,
    completedShards,
    failedShards,
    runningShards,
    cancelledShards,
    startedAt,
    completedAt,
    durationMs,
    avgMsPerCert,
    throughputPerSec,
    etaSeconds,
    failedIds,
  };

  await publishProgress({
    kind: "parent",
    dbJobId: parentJobId,
    parentJobId,
    shardIndex: null,
    shardCount: shards.length,
    status,
    total,
    processed,
    succeeded,
    failed,
    avgMsPerCert,
    throughputPerSec,
    etaSeconds,
    completedShards,
    failedShards,
    runningShards,
  });

  return agg;
}
