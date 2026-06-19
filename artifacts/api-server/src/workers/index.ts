import { createWorker, QUEUE_NAMES } from "../lib/queues";
import { processEmailJob } from "./email.worker";
import { processNotificationJob } from "./notification.worker";
import { processDataExportJob } from "./data-export.worker";
import { processDataDeletionJob } from "./data-deletion.worker";
import { processAiJob } from "./ai.worker";
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

    logger.info("BullMQ workers started (5 queues)");
  } catch (err) {
    logger.warn(
      { err: (err as Error).message },
      "BullMQ workers failed to start — Redis may be unavailable. Jobs will queue but not process until Redis is available."
    );
  }
}

export function stopWorkers(): void {
  started = false;
}
