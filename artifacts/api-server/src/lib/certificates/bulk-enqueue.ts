import { eq } from "drizzle-orm";
import { db, certificateGenerationJobsTable } from "@workspace/db";
import {
  addCertShardJob,
  getCertQueuePartitions,
} from "../queues";
import { logger } from "../logger";

// Certificates per shard. A bulk run is split into ceil(total / SHARD_SIZE)
// shards, each an independent BullMQ job distributed across partitions/workers.
const SHARD_SIZE = Math.max(1, Number(process.env.CERT_SHARD_SIZE ?? 1000));

export function getCertShardSize(): number {
  return SHARD_SIZE;
}

export interface ShardPlan {
  shardCount: number;
  enqueued: number;
  partitions: number;
  shardSize: number;
}

/**
 * Split a parent job's certificate ids into shard rows and enqueue each onto a
 * partition queue (round-robined by shard index). The parent row is updated with
 * the final shard_count. Returns how many shards were created and successfully
 * enqueued so the caller can fail the parent if the queue is unavailable.
 */
export async function shardAndEnqueue(
  parentJobId: number,
  certificateIds: number[],
  createdBy: number,
): Promise<ShardPlan> {
  const partitions = getCertQueuePartitions();
  const shardCount = Math.ceil(certificateIds.length / SHARD_SIZE);
  let enqueued = 0;

  for (let idx = 0; idx < shardCount; idx++) {
    const slice = certificateIds.slice(idx * SHARD_SIZE, (idx + 1) * SHARD_SIZE);
    const partition = idx % partitions;
    const [shard] = await db
      .insert(certificateGenerationJobsTable)
      .values({
        status: "queued",
        total: slice.length,
        certificateIds: slice,
        createdBy,
        isShard: true,
        parentJobId,
        shardIndex: idx,
        shardCount,
        partition,
      })
      .returning();

    const job = await addCertShardJob({
      dbJobId: shard.id,
      parentJobId,
      shardIndex: idx,
      certificateIds: slice,
      partition,
    });
    if (job) {
      enqueued++;
    } else {
      // Record the whole slice as failed work (not a silent gap) so the parent
      // aggregate accounts for every certificate and a retry re-drives this
      // slice via its failedIds. Without this the slice would be lost while the
      // parent could still report "completed".
      await db
        .update(certificateGenerationJobsTable)
        .set({
          status: "failed",
          processed: slice.length,
          succeeded: 0,
          failed: slice.length,
          failedIds: slice,
          error: "Failed to enqueue shard (Redis unavailable)",
        })
        .where(eq(certificateGenerationJobsTable.id, shard.id));
      logger.warn({ parentJobId, shardIndex: idx }, "cert shard enqueue failed");
    }
  }

  await db
    .update(certificateGenerationJobsTable)
    .set({ shardCount, total: certificateIds.length })
    .where(eq(certificateGenerationJobsTable.id, parentJobId));

  return { shardCount, enqueued, partitions, shardSize: SHARD_SIZE };
}
