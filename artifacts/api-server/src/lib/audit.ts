import { db } from "@workspace/db";
import { auditLogsTable } from "@workspace/db";
import { logger } from "./logger";
import { getRequestAuditContext } from "./request-context";

export interface AuditLogParams {
  userId?: number;
  action: string;
  entityType?: string;
  entityId?: string | number;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Resolve ip/ua for an audit row: an explicitly-passed value always wins; when
 * omitted, fall back to the current request's async context (captured by
 * requestContextMiddleware). Outside an HTTP request both resolve to undefined.
 */
function resolveContext(params: AuditLogParams): {
  ipAddress?: string;
  userAgent?: string;
} {
  const ctx = getRequestAuditContext();
  return {
    ipAddress: params.ipAddress ?? ctx?.ipAddress,
    userAgent: params.userAgent ?? ctx?.userAgent,
  };
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    const { ipAddress, userAgent } = resolveContext(params);
    await db.insert(auditLogsTable).values({
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId:
        params.entityId !== undefined ? String(params.entityId) : undefined,
      ipAddress,
      userAgent,
      metadata: params.metadata
        ? JSON.stringify(params.metadata)
        : undefined,
    });
  } catch (err) {
    logger.error({ err, action: params.action }, "Failed to write audit log");
  }
}

export async function createBulkAuditLogs(
  logs: AuditLogParams[]
): Promise<void> {
  if (logs.length === 0) return;
  try {
    await db.insert(auditLogsTable).values(
      logs.map((params) => {
        const { ipAddress, userAgent } = resolveContext(params);
        return {
          userId: params.userId,
          action: params.action,
          entityType: params.entityType,
          entityId:
            params.entityId !== undefined ? String(params.entityId) : undefined,
          ipAddress,
          userAgent,
          metadata: params.metadata
            ? JSON.stringify(params.metadata)
            : undefined,
        };
      })
    );
  } catch (err) {
    logger.error({ err, count: logs.length }, "Failed to write bulk audit logs");
  }
}
