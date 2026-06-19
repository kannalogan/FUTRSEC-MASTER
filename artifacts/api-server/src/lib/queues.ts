import { Queue, Worker, type Job } from "bullmq";
import { logger } from "./logger";

const REDIS_HOST = process.env["REDIS_HOST"] ?? "localhost";
const REDIS_PORT = parseInt(process.env["REDIS_PORT"] ?? "6379", 10);
const REDIS_PASSWORD = process.env["REDIS_PASSWORD"];

const redisConnection = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  ...(REDIS_PASSWORD ? { password: REDIS_PASSWORD } : {}),
};

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
    queues[name] = new Queue(name, { connection: redisConnection });
    logger.info({ queue: name }, "BullMQ queue initialized");
  }
  return queues[name]!;
}

export async function addEmailJob(data: {
  to: string;
  subject: string;
  template: string;
  variables: Record<string, string>;
  userId?: number;
}) {
  const queue = getQueue(QUEUE_NAMES.EMAIL);
  return queue.add("send_email", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  });
}

export async function addNotificationJob(data: {
  userId: number;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  const queue = getQueue(QUEUE_NAMES.NOTIFICATION);
  return queue.add("send_notification", data, { attempts: 2 });
}

export async function addDataExportJob(data: {
  userId: number;
  requestId: number;
}) {
  const queue = getQueue(QUEUE_NAMES.DATA_EXPORT);
  return queue.add("export_user_data", data, {
    attempts: 2,
    delay: 1000,
  });
}

export async function addDataDeletionJob(data: {
  userId: number;
  requestId: number;
  reason: string;
}) {
  const queue = getQueue(QUEUE_NAMES.DATA_DELETION);
  return queue.add("delete_user_data", data, {
    attempts: 1,
    delay: 24 * 60 * 60 * 1000,
  });
}

export async function addAiJob(data: {
  userId: number;
  jobType: string;
  input: Record<string, unknown>;
}) {
  const queue = getQueue(QUEUE_NAMES.AI_JOB);
  return queue.add("ai_process", data, { attempts: 2 });
}

export function createWorker(
  queueName: QueueName,
  processor: (job: Job) => Promise<void>
): Worker {
  const worker = new Worker(queueName, processor, {
    connection: redisConnection,
    concurrency: 5,
  });

  worker.on("completed", (job) => {
    logger.info({ queue: queueName, jobId: job.id }, "Job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error(
      { queue: queueName, jobId: job?.id, err },
      "Job failed"
    );
  });

  return worker;
}
