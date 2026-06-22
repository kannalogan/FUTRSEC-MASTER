import {
  createWorker,
  QUEUE_NAMES,
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
import { logger } from "../lib/logger";

let started = false;

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

    // Register the daily DPDP auto-purge cron (stable jobId dedupes on restart).
    void scheduleRetentionDailyJob();

    logger.info("BullMQ workers started (6 queues)");
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
}
