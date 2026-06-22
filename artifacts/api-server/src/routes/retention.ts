import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import {
  retentionPoliciesTable,
  retentionPurgeRunsTable,
} from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";
import { isRedisAvailable } from "../lib/redis";
import { addRetentionJob } from "../lib/queues";
import { runRetention } from "../workers/retention.worker";

const router = Router();

const adminGuards = [requireAuth, requireRole("admin")];

// Entity types the purge engine knows how to act on. Policies may only target
// these (validated so admins can't create no-op / typo'd policies).
const KNOWN_ENTITY_TYPES = [
  "audit_logs",
  "consent_history",
  "data_download_requests",
  "notifications",
  "refresh_tokens",
  "inactive_accounts",
] as const;

const createPolicySchema = z.object({
  entityType: z.enum(KNOWN_ENTITY_TYPES),
  retentionDays: z.number().int().min(1).max(36500),
  legalBasis: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
});

const updatePolicySchema = z.object({
  retentionDays: z.number().int().min(1).max(36500).optional(),
  legalBasis: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).nullable().optional(),
});

const purgeSchema = z.object({
  dryRun: z.boolean().optional(),
});

// ── Policies CRUD ───────────────────────────────────────────────────────────

router.get(
  "/policies",
  ...adminGuards,
  async (_req: AuthRequest, res): Promise<void> => {
    const policies = await db
      .select()
      .from(retentionPoliciesTable)
      .orderBy(desc(retentionPoliciesTable.createdAt));
    res.json({ policies, knownEntityTypes: KNOWN_ENTITY_TYPES });
  }
);

router.post(
  "/policies",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const parsed = createPolicySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const { entityType, retentionDays, legalBasis, description } = parsed.data;

    const existing = await db.query.retentionPoliciesTable.findFirst({
      where: eq(retentionPoliciesTable.entityType, entityType),
    });
    if (existing) {
      res.status(409).json({ error: "A policy for this entity type already exists" });
      return;
    }

    const [policy] = await db
      .insert(retentionPoliciesTable)
      .values({ entityType, retentionDays, legalBasis, description: description ?? null })
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "dpdp.retention_policy_created",
      entityType: "retention_policy",
      entityId: policy.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { entityType, retentionDays, legalBasis },
    });

    res.status(201).json({ policy });
  }
);

router.put(
  "/policies/:id",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid policy id" });
      return;
    }
    const parsed = updatePolicySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }

    const existing = await db.query.retentionPoliciesTable.findFirst({
      where: eq(retentionPoliciesTable.id, id),
    });
    if (!existing) {
      res.status(404).json({ error: "Policy not found" });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.retentionDays !== undefined) updates.retentionDays = parsed.data.retentionDays;
    if (parsed.data.legalBasis !== undefined) updates.legalBasis = parsed.data.legalBasis;
    if (parsed.data.description !== undefined) updates.description = parsed.data.description;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const [policy] = await db
      .update(retentionPoliciesTable)
      .set(updates)
      .where(eq(retentionPoliciesTable.id, id))
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "dpdp.retention_policy_updated",
      entityType: "retention_policy",
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { changes: updates },
    });

    res.json({ policy });
  }
);

router.delete(
  "/policies/:id",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid policy id" });
      return;
    }

    const existing = await db.query.retentionPoliciesTable.findFirst({
      where: eq(retentionPoliciesTable.id, id),
    });
    if (!existing) {
      res.status(404).json({ error: "Policy not found" });
      return;
    }

    await db.delete(retentionPoliciesTable).where(eq(retentionPoliciesTable.id, id));

    await createAuditLog({
      userId: req.user!.userId,
      action: "dpdp.retention_policy_deleted",
      entityType: "retention_policy",
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { entityType: existing.entityType },
    });

    res.json({ success: true });
  }
);

// ── Purge runs history ──────────────────────────────────────────────────────

router.get(
  "/runs",
  ...adminGuards,
  async (_req: AuthRequest, res): Promise<void> => {
    const runs = await db
      .select()
      .from(retentionPurgeRunsTable)
      .orderBy(desc(retentionPurgeRunsTable.startedAt))
      .limit(200);
    res.json({ runs });
  }
);

router.get(
  "/runs/:id",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid run id" });
      return;
    }
    const run = await db.query.retentionPurgeRunsTable.findFirst({
      where: eq(retentionPurgeRunsTable.id, id),
    });
    if (!run) {
      res.status(404).json({ error: "Run not found" });
      return;
    }
    res.json({ run });
  }
);

// ── Preview (dry-run, inline, no deletion) ──────────────────────────────────

router.get(
  "/preview",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const result = await runRetention({
      dryRun: true,
      trigger: "manual",
      triggeredBy: req.user!.userId,
    });
    res.json({ result });
  }
);

// ── Manual purge ────────────────────────────────────────────────────────────

router.post(
  "/purge",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const parsed = purgeSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const dryRun = parsed.data.dryRun ?? false;

    const [run] = await db
      .insert(retentionPurgeRunsTable)
      .values({
        trigger: "manual",
        triggeredBy: req.user!.userId,
        dryRun,
        status: "running",
      })
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "dpdp.retention_purge_triggered",
      entityType: "retention_purge_run",
      entityId: run.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { dryRun },
    });

    // Prefer the queue when Redis is up; otherwise run inline so the feature
    // works in degraded mode.
    if (isRedisAvailable()) {
      const job = await addRetentionJob({
        runId: run.id,
        dryRun,
        trigger: "manual",
        triggeredBy: req.user!.userId,
      });
      if (job) {
        res.status(202).json({ run, mode: "queued" });
        return;
      }
    }

    const result = await runRetention({
      runId: run.id,
      dryRun,
      trigger: "manual",
      triggeredBy: req.user!.userId,
    });
    res.json({ run, result, mode: "inline" });
  }
);

export default router;
