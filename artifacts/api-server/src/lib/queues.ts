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

export function createWorker(
  queueName: QueueName,
  processor: (job: Job) => Promise<void>
): Worker {
  const worker = new Worker(queueName, processor, {
    connection: redisConnectionOptions,
    concurrency: 5,
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
