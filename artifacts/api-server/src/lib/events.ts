import { EventEmitter } from "events";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { logger } from "./logger";
import { createAuditLog } from "./audit";
import { addEmailJob, addNotificationJob } from "./queues";
import { EMAIL_TEMPLATES } from "../workers/email.worker";
import { NOTIFICATION_TYPES } from "../workers/notification.worker";
import {
  createNotification,
  NOTIFICATION_TYPES as N_TYPES,
} from "./notifications";

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
  | { type: "subscription.expired"; userId: number; plan: string }
  | { type: "job.matched"; userId: number; jobId: number; matchScore: number }
  | { type: "application.advanced"; userId: number; applicationId: number; status: string }
  | { type: "placement.created"; userId: number; placementId: number; companyName?: string }
  | { type: "campusdrive.registered"; userId: number; driveId: number; driveName?: string }
  | { type: "subscription.trial_started"; userId: number; plan: string }
  | { type: "subscription.changed"; userId: number; plan: string }
  | { type: "payment.recorded"; userId: number; paymentId: number; amount: number }
  | { type: "payment.failed"; userId: number; paymentId: number; reason?: string }
  | { type: "trial.expiring"; userId: number; daysLeft: number };

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

    // Notify admins of a new signup (in-app only). Listener-only — does not
    // touch the emitter.
    safeAsync("user.created:admin_notify", async () => {
      const admins = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.role, "admin"));
      await Promise.all(
        admins.map((admin) =>
          createNotification({
            userId: admin.id,
            role: "admin",
            title: "New signup",
            message: `A new ${role} just registered on FUTRSEC.`,
            type: N_TYPES.SIGNUP,
            entityType: "user",
            entityId: userId,
            link: "/admin/students",
            channels: ["in_app"],
          })
        )
      );
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

  // ── job.matched ───────────────────────────────────────────────────────────
  eventBus.on("job.matched", (payload) => {
    if (payload.type !== "job.matched") return;
    const { userId, jobId, matchScore } = payload;
    safeAsync("job.matched:notify", async () => {
      await createNotification({
        userId,
        title: "New job match",
        message: `A new job matches your profile (${matchScore}% match).`,
        type: "job_match",
        entityType: "job",
        entityId: jobId,
        link: "/job-agent",
        channels: ["in_app"],
      });
    });
  });

  // ── application.advanced ──────────────────────────────────────────────────
  eventBus.on("application.advanced", (payload) => {
    if (payload.type !== "application.advanced") return;
    const { userId, applicationId, status } = payload;
    safeAsync("application.advanced:notify", async () => {
      await createNotification({
        userId,
        title: "Application update",
        message: `Your application status is now "${status}".`,
        type: "application_update",
        entityType: "application",
        entityId: applicationId,
        link: "/placement",
        channels: ["in_app", "email"],
      });
    });
  });

  // ── placement.created ─────────────────────────────────────────────────────
  eventBus.on("placement.created", (payload) => {
    if (payload.type !== "placement.created") return;
    const { userId, placementId, companyName } = payload;
    safeAsync("placement.created:notify", async () => {
      await createNotification({
        userId,
        title: "Congratulations — you're placed!",
        message: companyName
          ? `You have been placed at ${companyName}.`
          : "Your placement has been confirmed.",
        type: "placement",
        entityType: "placement",
        entityId: placementId,
        link: "/placement",
        channels: ["in_app", "email"],
      });
    });
  });

  // ── campusdrive.registered ────────────────────────────────────────────────
  eventBus.on("campusdrive.registered", (payload) => {
    if (payload.type !== "campusdrive.registered") return;
    const { userId, driveId, driveName } = payload;
    safeAsync("campusdrive.registered:notify", async () => {
      await createNotification({
        userId,
        title: "Campus drive registration confirmed",
        message: driveName
          ? `You're registered for "${driveName}".`
          : "Your campus drive registration is confirmed.",
        type: "campus_drive",
        entityType: "campus_drive",
        entityId: driveId,
        link: "/campus",
        channels: ["in_app"],
      });
    });
  });

  // ── subscription.trial_started ────────────────────────────────────────────
  eventBus.on("subscription.trial_started", (payload) => {
    if (payload.type !== "subscription.trial_started") return;
    const { userId, plan } = payload;
    safeAsync("subscription.trial_started:notify", async () => {
      await createNotification({
        userId,
        title: "Free trial activated",
        message: `Your ${plan} free trial is now active. Enjoy full access!`,
        type: "subscription",
        link: "/subscription",
        channels: ["in_app", "email"],
      });
    });
  });

  // ── subscription.changed ──────────────────────────────────────────────────
  eventBus.on("subscription.changed", (payload) => {
    if (payload.type !== "subscription.changed") return;
    const { userId, plan } = payload;
    safeAsync("subscription.changed:notify", async () => {
      await createNotification({
        userId,
        title: "Subscription updated",
        message: `Your subscription is now on the ${plan} plan.`,
        type: "subscription",
        link: "/subscription",
        channels: ["in_app", "email"],
      });
    });
  });

  // ── payment.recorded ──────────────────────────────────────────────────────
  eventBus.on("payment.recorded", (payload) => {
    if (payload.type !== "payment.recorded") return;
    const { userId, paymentId, amount } = payload;
    safeAsync("payment.recorded:notify", async () => {
      await createNotification({
        userId,
        title: "Payment received",
        message: `We received your payment of ₹${(amount / 100).toFixed(2)}.`,
        type: "payment",
        entityType: "payment",
        entityId: paymentId,
        link: "/subscription",
        channels: ["in_app", "email"],
      });
    });
  });

  // ── payment.failed ────────────────────────────────────────────────────────
  eventBus.on("payment.failed", (payload) => {
    if (payload.type !== "payment.failed") return;
    const { userId, paymentId, reason } = payload;
    safeAsync("payment.failed:notify", async () => {
      await createNotification({
        userId,
        title: "Payment failed",
        message: reason
          ? `Your payment could not be processed: ${reason}`
          : "Your payment could not be processed. Please try again.",
        type: "payment",
        entityType: "payment",
        entityId: paymentId,
        link: "/subscription",
        channels: ["in_app", "email"],
      });
    });
  });

  // ── trial.expiring ────────────────────────────────────────────────────────
  eventBus.on("trial.expiring", (payload) => {
    if (payload.type !== "trial.expiring") return;
    const { userId, daysLeft } = payload;
    safeAsync("trial.expiring:notify", async () => {
      await createNotification({
        userId,
        title: "Your trial is expiring soon",
        message: `Your free trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Upgrade to keep full access.`,
        type: "subscription",
        link: "/subscription",
        channels: ["in_app", "email"],
      });
    });
  });
}
