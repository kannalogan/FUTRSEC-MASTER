import {
  createWorker,
  QUEUE_NAMES,
  certGenQueueName,
  getCertQueuePartitions,
  scheduleRetentionDailyJob,
} from "../lib/queues";
import { processEmailJob } from "./email.worker";
import { processNotificationJob } from "./notification.worker";
import { processDataExportJob } from "./data-export.worker";
import { processDataDeletionJob } from "./data-deletion.worker";
import { processAiJob } from "./ai.worker";
import {
  processRetentionJob,
  seedDefaultRetentionPolicies,
} from "./retention.worker";
import {
  createCertGenerationProcessor,
  processCertificateDlqJob,
} from "./certificate-generation.worker";
import {
  recordHeartbeat,
  removeWorker,
  type WorkerHeartbeat,
} from "../lib/certificates/worker-registry";
import { logger } from "../lib/logger";
import { hostname } from "node:os";

// Per-worker concurrency: how many shards a single worker instance processes in
// parallel. Number of worker INSTANCES is CERT_WORKER_REPLICAS (per partition).
const CERT_WORKER_CONCURRENCY = Number(
  process.env.CERT_WORKER_CONCURRENCY ?? 2,
);
const CERT_WORKER_REPLICAS = Math.max(
  1,
  Number(process.env.CERT_WORKER_REPLICAS ?? 4),
);

let started = false;
const workerStates: WorkerHeartbeat[] = [];
let heartbeatTimer: NodeJS.Timeout | null = null;

export function startWorkers(): void {
  if (started) return;
  started = true;

  try {
    createWorker(QUEUE_NAMES.EMAIL, processEmailJob);
    createWorker(QUEUE_NAMES.NOTIFICATION, processNotificationJob);
    createWorker(QUEUE_NAMES.DATA_EXPORT, processDataExportJob);
    createWorker(QUEUE_NAMES.DATA_DELETION, processDataDeletionJob);
    createWorker(QUEUE_NAMES.AI_JOB, processAiJob);
    createWorker(QUEUE_NAMES.RETENTION, processRetentionJob);

    // Horizontally-scaled certificate workers: CERT_QUEUE_PARTITIONS partition
    // queues × CERT_WORKER_REPLICAS worker instances each, every instance
    // processing CERT_WORKER_CONCURRENCY shards in parallel. In a multi-machine
    // deployment, run each partition's replicas on a separate host (same env).
    const partitions = getCertQueuePartitions();
    let certWorkerCount = 0;
    for (let p = 0; p < partitions; p++) {
      const queueName = certGenQueueName(p);
      for (let r = 0; r < CERT_WORKER_REPLICAS; r++) {
        // Include host identity so replicas on different machines (same env)
        // never collide on a shared cert:workers hash via PID reuse.
        const workerId = `${hostname()}:${process.pid}:p${p}:r${r}`;
        const state: WorkerHeartbeat = {
          workerId,
          partition: p,
          replica: r,
          pid: process.pid,
          status: "idle",
          activeJobs: 0,
          currentJobId: null,
          processed: 0,
          startedAt: Date.now(),
          updatedAt: Date.now(),
        };
        workerStates.push(state);
        void recordHeartbeat(state);

        const processor = createCertGenerationProcessor({
          workerId,
          partition: p,
          replica: r,
          onProgress: (delta, currentJobId) => {
            state.processed += delta;
            if (currentJobId != null) state.currentJobId = currentJobId;
            void recordHeartbeat(state);
          },
        });

        const worker = createWorker(queueName, processor, {
          concurrency: CERT_WORKER_CONCURRENCY,
          stalledInterval: 15000,
          maxStalledCount: 3,
        });
        // Track concurrent shard count so a worker is reported "idle" only when
        // ALL of its concurrent jobs have finished (CERT_WORKER_CONCURRENCY > 1).
        const onJobEnd = () => {
          state.activeJobs = Math.max(0, state.activeJobs - 1);
          if (state.activeJobs === 0) {
            state.status = "idle";
            state.currentJobId = null;
          }
          void recordHeartbeat(state);
        };
        worker.on("active", () => {
          state.activeJobs++;
          state.status = "busy";
          void recordHeartbeat(state);
        });
        worker.on("completed", onJobEnd);
        worker.on("failed", onJobEnd);
        certWorkerCount++;
      }
    }
    createWorker(QUEUE_NAMES.CERTIFICATE_DLQ, processCertificateDlqJob);

    // Keep heartbeats fresh even while idle so the dashboard can distinguish a
    // live-but-idle worker from a dead one (stale heartbeat).
    heartbeatTimer = setInterval(() => {
      for (const s of workerStates) void recordHeartbeat(s);
    }, 8000);
    if (heartbeatTimer.unref) heartbeatTimer.unref();

    // Register the daily DPDP auto-purge cron (stable jobId dedupes on restart).
    void scheduleRetentionDailyJob();

    logger.info(
      {
        certPartitions: partitions,
        certReplicasPerPartition: CERT_WORKER_REPLICAS,
        certWorkerInstances: certWorkerCount,
        certWorkerConcurrency: CERT_WORKER_CONCURRENCY,
      },
      "BullMQ workers started",
    );
  } catch (err) {
    logger.warn(
      { err: (err as Error).message },
      "BullMQ workers failed to start — Redis may be unavailable. Jobs will queue but not process until Redis is available."
    );
  }

  // Seed default DPDP retention policies regardless of Redis availability
  // (legitimate config — the manual purge / preview run inline without Redis).
  void seedDefaultRetentionPolicies();
}

export function stopWorkers(): void {
  started = false;
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  for (const s of workerStates) void removeWorker(s.workerId);
  workerStates.length = 0;
}
