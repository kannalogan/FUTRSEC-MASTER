import type { Job } from "bullmq";
import {
  and,
  eq,
  lt,
  sql,
  type SQL,
  type AnyColumn,
} from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import {
  db,
  retentionPoliciesTable,
  retentionPurgeRunsTable,
  auditLogsTable,
  consentHistoryTable,
  dataDownloadRequestsTable,
  notificationsTable,
  refreshTokensTable,
  usersTable,
} from "@workspace/db";
import { logger } from "../lib/logger";
import { createAuditLog } from "../lib/audit";

// ── Registry ──────────────────────────────────────────────────────────────
// Maps each known retention entityType to its real table + timestamp column,
// plus an optional extra predicate and a "previewOnly" flag for entities we
// must never hard-delete (e.g. dormant accounts — counted for reporting only).
interface RegistryEntry {
  table: PgTable;
  timestampColumn: AnyColumn;
  extra?: SQL | undefined;
  previewOnly?: boolean;
  label: string;
}

const RETENTION_REGISTRY: Record<string, RegistryEntry> = {
  audit_logs: {
    table: auditLogsTable,
    timestampColumn: auditLogsTable.createdAt,
    label: "Audit logs",
  },
  consent_history: {
    table: consentHistoryTable,
    timestampColumn: consentHistoryTable.createdAt,
    label: "Consent history",
  },
  data_download_requests: {
    table: dataDownloadRequestsTable,
    timestampColumn: dataDownloadRequestsTable.createdAt,
    extra: eq(dataDownloadRequestsTable.status, "completed"),
    label: "Fulfilled data-download requests",
  },
  notifications: {
    table: notificationsTable,
    timestampColumn: notificationsTable.createdAt,
    extra: eq(notificationsTable.isRead, true),
    label: "Read notifications",
  },
  refresh_tokens: {
    // Expired session tokens: prune rows whose expiry is already in the past.
    table: refreshTokensTable,
    timestampColumn: refreshTokensTable.expiresAt,
    label: "Expired refresh tokens",
  },
  inactive_accounts: {
    // Dormant accounts: COUNT only, never hard-delete (DPDP review is manual).
    table: usersTable,
    timestampColumn: usersTable.lastLoginAt,
    previewOnly: true,
    label: "Dormant accounts (preview only)",
  },
};

export interface RetentionJobData {
  runId?: number;
  dryRun: boolean;
  trigger: "scheduler" | "manual";
  triggeredBy?: number;
}

export interface RetentionRunResult {
  runId: number | null;
  dryRun: boolean;
  trigger: "scheduler" | "manual";
  status: "completed" | "failed";
  summary: Record<string, number>;
  totalDeleted: number;
  error?: string;
}

// ── Core reusable logic ─────────────────────────────────────────────────────
// Callable from both the BullMQ worker and the routes (inline degraded mode).
export async function runRetention(opts: {
  runId?: number;
  dryRun: boolean;
  trigger: "scheduler" | "manual";
  triggeredBy?: number;
}): Promise<RetentionRunResult> {
  const { dryRun, trigger } = opts;
  let { runId } = opts;

  // Ensure we have a run row to update (scheduler jobs arrive without one).
  if (!runId) {
    const [row] = await db
      .insert(retentionPurgeRunsTable)
      .values({
        trigger,
        triggeredBy: opts.triggeredBy ?? null,
        dryRun,
        status: "running",
      })
      .returning({ id: retentionPurgeRunsTable.id });
    runId = row?.id;
  }

  const policies = await db.select().from(retentionPoliciesTable);
  const now = Date.now();
  const summary: Record<string, number> = {};
  let totalDeleted = 0;

  try {
    for (const policy of policies) {
      const entry = RETENTION_REGISTRY[policy.entityType];
      if (!entry) {
        logger.warn(
          { entityType: policy.entityType },
          "Retention policy has no registry mapping — skipping"
        );
        continue;
      }

      const cutoff = new Date(now - policy.retentionDays * 24 * 60 * 60 * 1000);
      const predicate: SQL = entry.extra
        ? (and(lt(entry.timestampColumn, cutoff), entry.extra) as SQL)
        : lt(entry.timestampColumn, cutoff);

      // Always COUNT first (this is the dry-run number for the entity).
      const [{ value: matchCount }] = await db
        .select({ value: sql<number>`cast(count(*) as int)` })
        .from(entry.table)
        .where(predicate);

      if (dryRun || entry.previewOnly) {
        summary[policy.entityType] = matchCount;
        if (entry.previewOnly && !dryRun) {
          logger.info(
            { entityType: policy.entityType, count: matchCount },
            "Retention preview-only entity — counted, not deleted"
          );
        }
        continue;
      }

      // Real delete inside a transaction.
      let deleted = 0;
      await db.transaction(async (tx) => {
        const result = await tx.delete(entry.table).where(predicate);
        deleted = result.rowCount ?? matchCount;
      });

      summary[policy.entityType] = deleted;
      totalDeleted += deleted;

      logger.info(
        {
          entityType: policy.entityType,
          deleted,
          retentionDays: policy.retentionDays,
        },
        "Retention purge applied"
      );
    }

    if (runId) {
      await db
        .update(retentionPurgeRunsTable)
        .set({
          status: "completed",
          summary,
          totalDeleted,
          completedAt: new Date(),
        })
        .where(eq(retentionPurgeRunsTable.id, runId));
    }

    await createAuditLog({
      userId: opts.triggeredBy,
      action: dryRun ? "dpdp.retention_preview" : "dpdp.retention_purge",
      entityType: "retention_purge_run",
      entityId: runId,
      metadata: { trigger, dryRun, totalDeleted, summary },
    });

    logger.info(
      { runId, trigger, dryRun, totalDeleted },
      "Retention run completed"
    );

    return {
      runId: runId ?? null,
      dryRun,
      trigger,
      status: "completed",
      summary,
      totalDeleted,
    };
  } catch (err) {
    const message = (err as Error).message;
    logger.error({ err: message, runId, trigger }, "Retention run failed");

    if (runId) {
      await db
        .update(retentionPurgeRunsTable)
        .set({
          status: "failed",
          summary,
          totalDeleted,
          error: message,
          completedAt: new Date(),
        })
        .where(eq(retentionPurgeRunsTable.id, runId))
        .catch(() => undefined);
    }

    await createAuditLog({
      userId: opts.triggeredBy,
      action: "dpdp.retention_failed",
      entityType: "retention_purge_run",
      entityId: runId,
      metadata: { trigger, dryRun, error: message },
    }).catch(() => undefined);

    return {
      runId: runId ?? null,
      dryRun,
      trigger,
      status: "failed",
      summary,
      totalDeleted,
      error: message,
    };
  }
}

export async function processRetentionJob(
  job: Job<RetentionJobData>
): Promise<void> {
  const { runId, dryRun, trigger, triggeredBy } = job.data;
  await runRetention({ runId, dryRun, trigger, triggeredBy });
}

// ── Idempotent default DPDP policy seeding ──────────────────────────────────
// Legitimate platform configuration (NOT mock data). Inserts standard DPDP
// retention policies only if missing — relies on the unique entityType index.
const DEFAULT_RETENTION_POLICIES: Array<{
  entityType: string;
  retentionDays: number;
  legalBasis: string;
  description: string;
}> = [
  {
    entityType: "audit_logs",
    retentionDays: 1095,
    legalBasis: "DPDP Act 2023 — accountability",
    description: "Security & compliance audit trail (DPDP Act 2023 accountability)",
  },
  {
    entityType: "consent_history",
    retentionDays: 2555,
    legalBasis: "DPDP Act 2023 §6 — proof of consent",
    description: "Consent records retention (DPDP Act 2023 §6 proof of consent)",
  },
  {
    entityType: "data_download_requests",
    retentionDays: 90,
    legalBasis: "DPDP Act 2023 — data minimisation",
    description: "Fulfilled data-access request cleanup",
  },
  {
    entityType: "notifications",
    retentionDays: 180,
    legalBasis: "DPDP Act 2023 — data minimisation",
    description: "Operational notification cleanup",
  },
  {
    entityType: "refresh_tokens",
    retentionDays: 30,
    legalBasis: "DPDP Act 2023 — storage limitation",
    description: "Expired session token cleanup",
  },
  {
    entityType: "inactive_accounts",
    retentionDays: 1095,
    legalBasis: "DPDP Act 2023 §8(7) — storage limitation",
    description: "Account dormancy review (preview only)",
  },
];

export async function seedDefaultRetentionPolicies(): Promise<void> {
  try {
    await db
      .insert(retentionPoliciesTable)
      .values(DEFAULT_RETENTION_POLICIES)
      .onConflictDoNothing({ target: retentionPoliciesTable.entityType });
    logger.info("Default DPDP retention policies ensured");
  } catch (err) {
    logger.warn(
      { err: (err as Error).message },
      "Failed to seed default retention policies"
    );
  }
}
