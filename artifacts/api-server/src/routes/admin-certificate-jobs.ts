import { Router } from "express";
import { ZipArchive } from "archiver";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod/v4";
import {
  db,
  certificatesTable,
  certificateGenerationJobsTable,
  certificateAutoIssueConfigTable,
  usersTable,
} from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";
import { addCertBulkJob } from "../lib/queues";
import { getRedisClient, isRedisAvailable } from "../lib/redis";
import { getOrGeneratePdf } from "../lib/certificates/generate";
import {
  revokeCertificate,
  renewCertificate,
} from "../lib/certificates/issuance";

const router = Router();
const adminGuards = [requireAuth, requireRole("admin")];

function ip(req: AuthRequest): string | undefined {
  return req.ip ?? req.socket.remoteAddress ?? undefined;
}

function cancelKey(id: number) {
  return `cert:job:${id}:cancel`;
}
function pauseKey(id: number) {
  return `cert:job:${id}:pause`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Enqueue a bulk generation job
// ─────────────────────────────────────────────────────────────────────────────

const enqueueSchema = z.object({
  certificateIds: z.array(z.number().int().positive()).min(1).max(10000),
});

router.post(
  "/admin/certificates/jobs",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const parsed = enqueueSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    if (!isRedisAvailable()) {
      res.status(503).json({
        error:
          "Bulk generation requires the queue (Redis) to be available. Try again once Redis is running.",
      });
      return;
    }

    // Validate the certificate ids exist before queuing.
    const ids = parsed.data.certificateIds;
    const existing = await db
      .select({ id: certificatesTable.id })
      .from(certificatesTable)
      .where(inArray(certificatesTable.id, ids));
    const existingIds = existing.map((r) => r.id);
    if (existingIds.length === 0) {
      res.status(404).json({ error: "No matching certificates found" });
      return;
    }

    const [job] = await db
      .insert(certificateGenerationJobsTable)
      .values({
        status: "queued",
        total: existingIds.length,
        certificateIds: existingIds,
        createdBy: req.user!.userId,
      })
      .returning();

    const enqueued = await addCertBulkJob({
      dbJobId: job.id,
      certificateIds: existingIds,
    });
    if (!enqueued) {
      await db
        .update(certificateGenerationJobsTable)
        .set({ status: "failed", error: "Failed to enqueue (Redis unavailable)" })
        .where(eq(certificateGenerationJobsTable.id, job.id));
      res.status(503).json({ error: "Failed to enqueue job" });
      return;
    }

    await createAuditLog({
      userId: req.user!.userId,
      action: "admin.certificate.bulk_enqueue",
      entityType: "certificate_generation_job",
      entityId: job.id,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { total: existingIds.length, requested: ids.length },
    });

    res.status(202).json({ jobId: job.id, total: existingIds.length });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// List jobs + dashboard stats
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/admin/certificates/jobs",
  ...adminGuards,
  async (_req: AuthRequest, res): Promise<void> => {
    const [jobs, statsRows] = await Promise.all([
      db
        .select()
        .from(certificateGenerationJobsTable)
        .orderBy(desc(certificateGenerationJobsTable.createdAt))
        .limit(100),
      db
        .select({
          status: certificateGenerationJobsTable.status,
          count: sql<number>`count(*)::int`,
          totalCerts: sql<number>`coalesce(sum(${certificateGenerationJobsTable.total}),0)::int`,
        })
        .from(certificateGenerationJobsTable)
        .groupBy(certificateGenerationJobsTable.status),
    ]);

    const [avgRow] = await db
      .select({
        avgMs: sql<number>`coalesce(avg(${certificateGenerationJobsTable.avgMsPerCert}),0)::int`,
      })
      .from(certificateGenerationJobsTable)
      .where(eq(certificateGenerationJobsTable.status, "completed"));

    const byStatus: Record<string, number> = {};
    let totalCertificates = 0;
    for (const r of statsRows) {
      byStatus[r.status] = r.count;
      totalCertificates += r.totalCerts;
    }

    res.json({
      jobs,
      stats: {
        total: jobs.length,
        running: byStatus.running ?? 0,
        queued: byStatus.queued ?? 0,
        paused: byStatus.paused ?? 0,
        completed: byStatus.completed ?? 0,
        failed: byStatus.failed ?? 0,
        cancelled: byStatus.cancelled ?? 0,
        totalCertificates,
        avgMsPerCert: avgRow?.avgMs ?? 0,
      },
    });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Single job
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/admin/certificates/jobs/:id",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid job id" });
      return;
    }
    const [job] = await db
      .select()
      .from(certificateGenerationJobsTable)
      .where(eq(certificateGenerationJobsTable.id, id))
      .limit(1);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.json({ job });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Pause / resume / cancel (redis flags read by the worker)
// ─────────────────────────────────────────────────────────────────────────────

async function loadJobOr404(
  req: AuthRequest,
  res: import("express").Response,
): Promise<{ id: number } | null> {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid job id" });
    return null;
  }
  const [job] = await db
    .select({ id: certificateGenerationJobsTable.id })
    .from(certificateGenerationJobsTable)
    .where(eq(certificateGenerationJobsTable.id, id))
    .limit(1);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return null;
  }
  return job;
}

router.post(
  "/admin/certificates/jobs/:id/pause",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const job = await loadJobOr404(req, res);
    if (!job) return;
    if (!isRedisAvailable()) {
      res.status(503).json({ error: "Queue unavailable" });
      return;
    }
    await getRedisClient().set(pauseKey(job.id), "1");
    await createAuditLog({
      userId: req.user!.userId,
      action: "admin.certificate.job_pause",
      entityType: "certificate_generation_job",
      entityId: job.id,
      ipAddress: ip(req),
    });
    res.json({ ok: true, status: "pausing" });
  },
);

router.post(
  "/admin/certificates/jobs/:id/resume",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const job = await loadJobOr404(req, res);
    if (!job) return;
    if (!isRedisAvailable()) {
      res.status(503).json({ error: "Queue unavailable" });
      return;
    }
    await getRedisClient().del(pauseKey(job.id));
    await createAuditLog({
      userId: req.user!.userId,
      action: "admin.certificate.job_resume",
      entityType: "certificate_generation_job",
      entityId: job.id,
      ipAddress: ip(req),
    });
    res.json({ ok: true, status: "resuming" });
  },
);

router.post(
  "/admin/certificates/jobs/:id/cancel",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const job = await loadJobOr404(req, res);
    if (!job) return;
    if (!isRedisAvailable()) {
      res.status(503).json({ error: "Queue unavailable" });
      return;
    }
    await getRedisClient().set(cancelKey(job.id), "1");
    // Clear any pause so the worker can observe the cancel and exit.
    await getRedisClient().del(pauseKey(job.id));
    await createAuditLog({
      userId: req.user!.userId,
      action: "admin.certificate.job_cancel",
      entityType: "certificate_generation_job",
      entityId: job.id,
      ipAddress: ip(req),
    });
    res.json({ ok: true, status: "cancelling" });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Retry — re-enqueue the failed certificates of a job as a new job
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  "/admin/certificates/jobs/:id/retry",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid job id" });
      return;
    }
    const [job] = await db
      .select()
      .from(certificateGenerationJobsTable)
      .where(eq(certificateGenerationJobsTable.id, id))
      .limit(1);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    const failedIds = Array.isArray(job.failedIds)
      ? (job.failedIds as number[])
      : [];
    if (failedIds.length === 0) {
      res.status(400).json({ error: "Job has no failed certificates to retry" });
      return;
    }
    if (!isRedisAvailable()) {
      res.status(503).json({ error: "Queue unavailable" });
      return;
    }

    const [newJob] = await db
      .insert(certificateGenerationJobsTable)
      .values({
        status: "queued",
        total: failedIds.length,
        certificateIds: failedIds,
        createdBy: req.user!.userId,
      })
      .returning();

    const enqueued = await addCertBulkJob({
      dbJobId: newJob.id,
      certificateIds: failedIds,
    });
    if (!enqueued) {
      await db
        .update(certificateGenerationJobsTable)
        .set({ status: "failed", error: "Failed to enqueue retry" })
        .where(eq(certificateGenerationJobsTable.id, newJob.id));
      res.status(503).json({ error: "Failed to enqueue retry" });
      return;
    }

    await createAuditLog({
      userId: req.user!.userId,
      action: "admin.certificate.job_retry",
      entityType: "certificate_generation_job",
      entityId: newJob.id,
      ipAddress: ip(req),
      metadata: { retriedFrom: id, count: failedIds.length },
    });

    res.status(202).json({ jobId: newJob.id, total: failedIds.length });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Download a job's certificates as a ZIP
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/admin/certificates/jobs/:id/download",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid job id" });
      return;
    }
    const [job] = await db
      .select()
      .from(certificateGenerationJobsTable)
      .where(eq(certificateGenerationJobsTable.id, id))
      .limit(1);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    const ids = Array.isArray(job.certificateIds)
      ? (job.certificateIds as number[])
      : [];
    if (ids.length === 0) {
      res.status(404).json({ error: "Job has no generated certificates" });
      return;
    }

    const rows = await db
      .select({ cert: certificatesTable, holderName: usersTable.fullName })
      .from(certificatesTable)
      .leftJoin(usersTable, eq(usersTable.id, certificatesTable.userId))
      .where(inArray(certificatesTable.id, ids));

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="cert-job-${id}.zip"`,
    );

    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.on("error", (err: Error) => {
      req.log?.error({ err }, "cert job zip failed");
      if (!res.headersSent) res.status(500).end();
      else res.end();
    });
    archive.pipe(res);

    for (const row of rows) {
      try {
        const buffer = await getOrGeneratePdf({
          cert: row.cert,
          holderName: row.holderName ?? "FUTRSEC Learner",
        });
        archive.append(buffer, { name: `${row.cert.certificateCode}.pdf` });
      } catch (err) {
        req.log?.warn({ err, certId: row.cert.id }, "skipping cert in job zip");
      }
    }

    await createAuditLog({
      userId: req.user!.userId,
      action: "admin.certificate.job_download",
      entityType: "certificate_generation_job",
      entityId: id,
      ipAddress: ip(req),
      metadata: { count: rows.length },
    });

    await archive.finalize();
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Auto-issue configuration
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/admin/certificates/auto-issue-config",
  ...adminGuards,
  async (_req: AuthRequest, res): Promise<void> => {
    const rows = await db
      .select()
      .from(certificateAutoIssueConfigTable)
      .orderBy(desc(certificateAutoIssueConfigTable.updatedAt));
    res.json({ configs: rows });
  },
);

const upsertConfigSchema = z.object({
  sourceType: z.enum([
    "course",
    "learning_path",
    "lab_series",
    "career_roadmap",
    "internship",
  ]),
  sourceId: z.number().int().positive(),
  enabled: z.boolean(),
  expiryMonths: z.number().int().positive().max(600).nullable().optional(),
  allowReissue: z.boolean().optional(),
  templateId: z.number().int().positive().nullable().optional(),
  certificateType: z.string().max(100).nullable().optional(),
});

router.put(
  "/admin/certificates/auto-issue-config",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const parsed = upsertConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const d = parsed.data;

    // Race-safe upsert keyed on the (source_type, source_id) unique index.
    const [config] = await db
      .insert(certificateAutoIssueConfigTable)
      .values({
        sourceType: d.sourceType,
        sourceId: d.sourceId,
        enabled: d.enabled,
        expiryMonths: d.expiryMonths ?? null,
        allowReissue: d.allowReissue ?? false,
        templateId: d.templateId ?? null,
        certificateType: d.certificateType ?? null,
        createdBy: req.user!.userId,
      })
      .onConflictDoUpdate({
        target: [
          certificateAutoIssueConfigTable.sourceType,
          certificateAutoIssueConfigTable.sourceId,
        ],
        set: {
          enabled: d.enabled,
          expiryMonths: d.expiryMonths ?? null,
          allowReissue: d.allowReissue ?? false,
          templateId: d.templateId ?? null,
          certificateType: d.certificateType ?? null,
        },
      })
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "admin.certificate.auto_issue_config",
      entityType: "certificate_auto_issue_config",
      entityId: config.id,
      ipAddress: ip(req),
      metadata: {
        sourceType: d.sourceType,
        sourceId: d.sourceId,
        enabled: d.enabled,
      },
    });

    res.json({ config });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Revoke / renew a single certificate
// ─────────────────────────────────────────────────────────────────────────────

const revokeSchema = z.object({ reason: z.string().max(500).optional() });

router.post(
  "/admin/certificates/:id/revoke",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid certificate id" });
      return;
    }
    const parsed = revokeSchema.safeParse(req.body ?? {});
    const reason = parsed.success ? parsed.data.reason : undefined;
    const updated = await revokeCertificate({
      certId: id,
      reason,
      revokedBy: req.user!.userId,
    });
    if (!updated) {
      res.status(404).json({ error: "Certificate not found" });
      return;
    }
    res.json({ certificate: updated });
  },
);

const renewSchema = z.object({
  expiryMonths: z.number().int().positive().max(600).nullable().optional(),
});

router.post(
  "/admin/certificates/:id/renew",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid certificate id" });
      return;
    }
    const parsed = renewSchema.safeParse(req.body ?? {});
    const expiryMonths = parsed.success ? parsed.data.expiryMonths : undefined;
    try {
      const updated = await renewCertificate({
        certId: id,
        expiryMonths: expiryMonths ?? null,
        issuedBy: req.user!.userId,
      });
      res.json({ certificate: updated });
    } catch {
      res.status(404).json({ error: "Certificate not found" });
    }
  },
);

export default router;
