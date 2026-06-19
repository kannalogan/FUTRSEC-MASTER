import { EventEmitter } from "events";
import { logger } from "./logger";
import { createAuditLog } from "./audit";
import { addEmailJob, addNotificationJob } from "./queues";
import { EMAIL_TEMPLATES } from "../workers/email.worker";
import { NOTIFICATION_TYPES } from "../workers/notification.worker";

export type AppEvent =
  | { type: "assessment.submitted"; userId: number; assessmentId: number; attemptId: number; score: number }
  | { type: "user.created"; userId: number; role: string }
  | { type: "user.onboarding_complete"; userId: number }
  | { type: "consent.updated"; userId: number; consentType: string; action: string; ipAddress: string }
  | { type: "consent.withdrawn"; userId: number; consentType: string; ipAddress: string }
  | { type: "data_request.created"; userId: number; requestType: string; requestId: number }
  | { type: "track.selected"; userId: number; trackId: number }
  | { type: "lab.completed"; userId: number; labId: number; score: number }
  | { type: "assignment.submitted"; userId: number; assignmentId: number }
  | { type: "subscription.created"; userId: number; plan: string }
  | { type: "subscription.expired"; userId: number; plan: string };

class AppEventBus extends EventEmitter {
  emit(event: string, payload: AppEvent): boolean {
    logger.debug({ event, userId: (payload as Record<string, unknown>).userId }, "Event emitted");
    return super.emit(event, payload);
  }

  on(event: string, listener: (payload: AppEvent) => void): this {
    return super.on(event, listener);
  }
}

export const eventBus = new AppEventBus();

function safeAsync(
  name: string,
  fn: () => Promise<void>
): void {
  fn().catch((err) =>
    logger.error({ err, handler: name }, "Event handler error")
  );
}

export function setupEventHandlers(): void {

  // ── user.created ──────────────────────────────────────────────────────────
  eventBus.on("user.created", (payload) => {
    if (payload.type !== "user.created") return;
    const { userId, role } = payload;

    safeAsync("user.created:audit", async () => {
      await createAuditLog({
        userId,
        action: "user.registered",
        entityType: "user",
        entityId: userId,
        metadata: { role },
      });
    });

    safeAsync("user.created:welcome_email", async () => {
      await addEmailJob({
        to: `pending_${userId}`,
        subject: "Welcome to FUTRSEC",
        template: EMAIL_TEMPLATES.WELCOME,
        variables: { role },
        userId,
      });
    });
  });

  // ── user.onboarding_complete ───────────────────────────────────────────────
  eventBus.on("user.onboarding_complete", (payload) => {
    if (payload.type !== "user.onboarding_complete") return;
    const { userId } = payload;

    safeAsync("user.onboarding_complete:audit", async () => {
      await createAuditLog({
        userId,
        action: "onboarding.completed",
        entityType: "user",
        entityId: userId,
      });
    });

    safeAsync("user.onboarding_complete:notification", async () => {
      await addNotificationJob({
        userId,
        type: NOTIFICATION_TYPES.ONBOARDING_COMPLETE,
        title: "You're all set!",
        message: "Your profile is complete. Start your cybersecurity journey now.",
      });
    });
  });

  // ── consent.updated ───────────────────────────────────────────────────────
  eventBus.on("consent.updated", (payload) => {
    if (payload.type !== "consent.updated") return;
    const { userId, consentType, action, ipAddress } = payload;

    safeAsync("consent.updated:audit", async () => {
      await createAuditLog({
        userId,
        action: "consent.granted",
        entityType: "consent",
        entityId: consentType,
        ipAddress,
        metadata: { consentType, action },
      });
    });
  });

  // ── consent.withdrawn ─────────────────────────────────────────────────────
  eventBus.on("consent.withdrawn", (payload) => {
    if (payload.type !== "consent.withdrawn") return;
    const { userId, consentType, ipAddress } = payload;

    safeAsync("consent.withdrawn:audit", async () => {
      await createAuditLog({
        userId,
        action: "consent.withdrawn",
        entityType: "consent",
        entityId: consentType,
        ipAddress,
        metadata: { consentType },
      });
    });
  });

  // ── data_request.created ──────────────────────────────────────────────────
  eventBus.on("data_request.created", (payload) => {
    if (payload.type !== "data_request.created") return;
    const { userId, requestType, requestId } = payload;

    safeAsync("data_request.created:audit", async () => {
      await createAuditLog({
        userId,
        action: `dpdp.${requestType}_requested`,
        entityType: "data_request",
        entityId: requestId,
        metadata: { requestType },
      });
    });
  });

  // ── assessment.submitted ──────────────────────────────────────────────────
  eventBus.on("assessment.submitted", (payload) => {
    if (payload.type !== "assessment.submitted") return;
    const { userId, assessmentId, attemptId, score } = payload;

    safeAsync("assessment.submitted:audit", async () => {
      await createAuditLog({
        userId,
        action: "assessment.submitted",
        entityType: "assessment_attempt",
        entityId: attemptId,
        metadata: { assessmentId, score },
      });
    });
  });

  // ── track.selected ────────────────────────────────────────────────────────
  eventBus.on("track.selected", (payload) => {
    if (payload.type !== "track.selected") return;
    const { userId, trackId } = payload;

    safeAsync("track.selected:audit", async () => {
      await createAuditLog({
        userId,
        action: "track.selected",
        entityType: "track",
        entityId: trackId,
      });
    });
  });

  // ── lab.completed ─────────────────────────────────────────────────────────
  eventBus.on("lab.completed", (payload) => {
    if (payload.type !== "lab.completed") return;
    const { userId, labId, score } = payload;

    safeAsync("lab.completed:audit", async () => {
      await createAuditLog({
        userId,
        action: "lab.completed",
        entityType: "lab",
        entityId: labId,
        metadata: { score },
      });
    });

    safeAsync("lab.completed:notification", async () => {
      await addNotificationJob({
        userId,
        type: NOTIFICATION_TYPES.LAB_UNLOCKED,
        title: "Lab Completed!",
        message: `You scored ${score} points. Keep up the great work!`,
        metadata: { labId, score },
      });
    });
  });

  // ── subscription.created ──────────────────────────────────────────────────
  eventBus.on("subscription.created", (payload) => {
    if (payload.type !== "subscription.created") return;
    const { userId, plan } = payload;

    safeAsync("subscription.created:audit", async () => {
      await createAuditLog({
        userId,
        action: "subscription.created",
        entityType: "subscription",
        metadata: { plan },
      });
    });
  });

  // ── subscription.expired ──────────────────────────────────────────────────
  eventBus.on("subscription.expired", (payload) => {
    if (payload.type !== "subscription.expired") return;
    const { userId, plan } = payload;

    safeAsync("subscription.expired:audit", async () => {
      await createAuditLog({
        userId,
        action: "subscription.expired",
        entityType: "subscription",
        metadata: { plan },
      });
    });
  });
}
