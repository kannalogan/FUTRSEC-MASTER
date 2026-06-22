import { Queue, Worker, type Job } from "bullmq";
import { logger } from "./logger";
import { redisConnectionOptions } from "./redis";

export const QUEUE_NAMES = {
  EMAIL: "email",
  WHATSAPP: "whatsapp",
  NOTIFICATION: "notification",
  BROADCAST: "broadcast_delivery",
  TRIAL_EXPIRY: "trial_expiry",
  SUBSCRIPTION_EXPIRY: "subscription_expiry",
  AI_JOB: "ai_job",
  REPORT_GENERATION: "report_generation",
  DATA_EXPORT: "data_export",
  DATA_DELETION: "data_deletion",
  RETENTION: "retention",
  CERTIFICATE_GENERATION: "certificate_generation",
  CERTIFICATE_DLQ: "certificate_dlq",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

let queues: Partial<Record<QueueName, Queue>> = {};

export function getQueue(name: QueueName): Queue {
  if (!queues[name]) {
    queues[name] = new Queue(name, {
      connection: redisConnectionOptions,
      defaultJobOptions: {
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
      },
    });
    logger.info({ queue: name }, "BullMQ queue initialized");
  }
  return queues[name]!;
}

async function safeAddJob<T>(
  queueName: QueueName,
  jobName: string,
  data: T,
  opts?: Parameters<Queue["add"]>[2]
): Promise<Job<T> | null> {
  try {
    const queue = getQueue(queueName);
    return (await queue.add(jobName, data, opts)) as Job<T>;
  } catch (err) {
    logger.warn(
      { err: (err as Error).message, queue: queueName, job: jobName },
      "Job not queued — Redis may be unavailable"
    );
    return null;
  }
}

export async function addEmailJob(data: {
  to: string;
  subject: string;
  template: string;
  variables?: Record<string, string>;
  userId?: number;
}) {
  return safeAddJob(QUEUE_NAMES.EMAIL, "send_email", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  });
}

export async function addNotificationJob(data: {
  userId: number;
  type: string;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}) {
  return safeAddJob(QUEUE_NAMES.NOTIFICATION, "send_notification", data, {
    attempts: 2,
  });
}

export async function addDataExportJob(data: {
  userId: number;
  requestId: number;
}) {
  return safeAddJob(QUEUE_NAMES.DATA_EXPORT, "export_user_data", data, {
    attempts: 2,
    delay: 1000,
  });
}

export async function addDataDeletionJob(data: {
  userId: number;
  requestId: number;
  reason: string;
}) {
  return safeAddJob(QUEUE_NAMES.DATA_DELETION, "delete_user_data", data, {
    attempts: 1,
    delay: 24 * 60 * 60 * 1000,
  });
}

export async function addRetentionJob(data: {
  runId?: number;
  dryRun: boolean;
  trigger?: "scheduler" | "manual";
  triggeredBy?: number;
}) {
  return safeAddJob(
    QUEUE_NAMES.RETENTION,
    "run_retention",
    { ...data, trigger: data.trigger ?? "manual" },
    { attempts: 1 }
  );
}

// Registers (or refreshes) the daily DPDP auto-purge job. The stable jobId
// dedupes repeatable schedules so restarts don't pile up duplicate crons.
export async function scheduleRetentionDailyJob(): Promise<void> {
  try {
    const queue = getQueue(QUEUE_NAMES.RETENTION);
    await queue.add(
      "run_retention",
      { dryRun: false, trigger: "scheduler" as const },
      {
        jobId: "retention-daily",
        repeat: { pattern: "0 2 * * *" },
        attempts: 1,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
      }
    );
    logger.info("Daily DPDP retention purge scheduled (0 2 * * *)");
  } catch (err) {
    logger.warn(
      { err: (err as Error).message },
      "Failed to schedule daily retention job — Redis may be unavailable"
    );
  }
}

export async function addAiJob(data: {
  userId: number;
  jobType: string;
  input: Record<string, unknown>;
}) {
  return safeAddJob(QUEUE_NAMES.AI_JOB, "ai_process", data, { attempts: 2 });
}

export async function addBroadcastJob(data: {
  broadcastId: number;
  recipientIds: number[];
}) {
  return safeAddJob(QUEUE_NAMES.BROADCAST, "deliver_broadcast", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
  });
}

// Enqueue a single-certificate PDF generation (used by auto-issuance). Falls
// back gracefully when Redis is down — the PDF is then generated lazily on the
// first download via getOrGeneratePdf.
export async function addCertPdfJob(data: { certificateId: number }) {
  return safeAddJob(QUEUE_NAMES.CERTIFICATE_GENERATION, "single", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 1500 },
  });
}

// Enqueue a tracked bulk generation batch. dbJobId links to
// certificate_generation_jobs for progress/stats.
export async function addCertBulkJob(data: {
  dbJobId: number;
  certificateIds: number[];
}) {
  return safeAddJob(QUEUE_NAMES.CERTIFICATE_GENERATION, "bulk", data, {
    attempts: 2,
    backoff: { type: "exponential", delay: 5000 },
  });
}

// Park an exhausted job + its failed certificate ids in the dead-letter queue.
export async function addCertDlqJob(data: {
  dbJobId?: number;
  certificateIds: number[];
  reason: string;
}) {
  return safeAddJob(QUEUE_NAMES.CERTIFICATE_DLQ, "dead_letter", data, {
    attempts: 1,
  });
}

export function createWorker(
  queueName: QueueName,
  processor: (job: Job) => Promise<void>,
  opts: { concurrency?: number } = {}
): Worker {
  const worker = new Worker(queueName, processor, {
    connection: redisConnectionOptions,
    concurrency: opts.concurrency ?? 5,
  });

  worker.on("completed", (job) => {
    logger.info({ queue: queueName, jobId: job.id }, "Job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error(
      { queue: queueName, jobId: job?.id, err: err.message },
      "Job failed"
    );
  });

  worker.on("error", (err) => {
    logger.error({ queue: queueName, err: err.message }, "Worker error");
  });

  return worker;
}
