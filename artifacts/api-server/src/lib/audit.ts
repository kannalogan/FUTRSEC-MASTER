import { db } from "@workspace/db";
import { auditLogsTable } from "@workspace/db";
import { logger } from "./logger";

export interface AuditLogParams {
  userId?: number;
  action: string;
  entityType?: string;
  entityId?: string | number;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId:
        params.entityId !== undefined ? String(params.entityId) : undefined,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
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
      logs.map((params) => ({
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId:
          params.entityId !== undefined ? String(params.entityId) : undefined,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: params.metadata
          ? JSON.stringify(params.metadata)
          : undefined,
      }))
    );
  } catch (err) {
    logger.error({ err, count: logs.length }, "Failed to write bulk audit logs");
  }
}
