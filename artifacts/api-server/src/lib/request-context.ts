import { AsyncLocalStorage } from "node:async_hooks";
import type { Request, Response, NextFunction } from "express";

/**
 * Per-request audit context propagated via AsyncLocalStorage. Captured once in
 * middleware and read by the audit helper so every audit log written during a
 * request automatically records the client IP and user-agent (who/when/ip/ua)
 * without each call site having to thread `req` through.
 *
 * Code running outside an HTTP request (BullMQ workers, event-bus handlers,
 * startup tasks) has no store, so audit logs from those paths correctly record
 * a null ip/ua — there is no client behind them.
 */
export interface RequestAuditContext {
  ipAddress?: string;
  userAgent?: string;
}

const storage = new AsyncLocalStorage<RequestAuditContext>();

export function getRequestAuditContext(): RequestAuditContext | undefined {
  return storage.getStore();
}

/**
 * Express middleware that binds the request's ip/user-agent into the async
 * context for the lifetime of the request. Mount after `trust proxy` so
 * `req.ip` resolves the real client IP.
 */
export function requestContextMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const ctx: RequestAuditContext = {
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  };
  storage.run(ctx, () => next());
}
