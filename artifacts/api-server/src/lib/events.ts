import { EventEmitter } from "events";
import { logger } from "./logger";

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
    logger.info({ event, payload }, "Event emitted");
    return super.emit(event, payload);
  }

  on(event: string, listener: (payload: AppEvent) => void): this {
    return super.on(event, listener);
  }
}

export const eventBus = new AppEventBus();

export function setupEventHandlers() {
  eventBus.on("assessment.submitted", (payload) => {
    if (payload.type !== "assessment.submitted") return;
    logger.info({ userId: payload.userId, score: payload.score }, "Assessment submitted — triggering FTS update");
    eventBus.emit("fts.update", {
      type: "assessment.submitted",
      userId: payload.userId,
      assessmentId: payload.assessmentId,
      attemptId: payload.attemptId,
      score: payload.score,
    });
  });

  eventBus.on("consent.updated", (payload) => {
    if (payload.type !== "consent.updated") return;
    logger.info({ userId: payload.userId, consentType: payload.consentType }, "Consent updated — audit log pending");
  });

  eventBus.on("consent.withdrawn", (payload) => {
    if (payload.type !== "consent.withdrawn") return;
    logger.info({ userId: payload.userId, consentType: payload.consentType }, "Consent withdrawn");
  });

  eventBus.on("data_request.created", (payload) => {
    if (payload.type !== "data_request.created") return;
    logger.info({ userId: payload.userId, requestType: payload.requestType }, "DPDP data request queued");
  });

  eventBus.on("user.created", (payload) => {
    if (payload.type !== "user.created") return;
    logger.info({ userId: payload.userId, role: payload.role }, "New user created");
  });
}
