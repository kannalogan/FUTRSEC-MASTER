import { Router } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { jobsTable, jobSkillsTable } from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";

const router = Router();

const adminGuards = [requireAuth, requireRole("admin")];

const CAREER_TRACKS = ["soc", "vapt", "grc"] as const;
const JOB_TYPES = ["full_time", "internship"] as const;
const JOB_STATUSES = ["active", "draft", "closed"] as const;

const skillSchema = z.object({
  skill: z.string().min(1).max(120),
  level: z.string().max(40).optional(),
});

const createJobPostingSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  type: z.enum(JOB_TYPES),
  location: z.string().max(200).optional().nullable(),
  isRemote: z.boolean().optional(),
  minSalary: z.number().int().min(0).optional().nullable(),
  maxSalary: z.number().int().min(0).optional().nullable(),
  experience: z.string().max(120).optional().nullable(),
  requiredTracks: z.array(z.enum(CAREER_TRACKS)).min(1),
  applicationDeadline: z.string().datetime().optional().nullable(),
  status: z.enum(JOB_STATUSES).optional(),
  skills: z.array(skillSchema).optional(),
});

const updateJobPostingSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  type: z.enum(JOB_TYPES).optional(),
  location: z.string().max(200).optional().nullable(),
  isRemote: z.boolean().optional(),
  minSalary: z.number().int().min(0).optional().nullable(),
  maxSalary: z.number().int().min(0).optional().nullable(),
  experience: z.string().max(120).optional().nullable(),
  requiredTracks: z.array(z.enum(CAREER_TRACKS)).min(1).optional(),
  applicationDeadline: z.string().datetime().optional().nullable(),
  status: z.enum(JOB_STATUSES).optional(),
});

function parseId(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return parseInt(String(value), 10);
}

// POST /admin/job-postings — create a platform job/internship
router.post(
  "/admin/job-postings",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const parsed = createJobPostingSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid request body", details: parsed.error.issues });
      return;
    }

    const data = parsed.data;
    const { skills, applicationDeadline, ...jobFields } = data;

    const [job] = await db
      .insert(jobsTable)
      .values({
        ...jobFields,
        location: jobFields.location ?? null,
        minSalary: jobFields.minSalary ?? null,
        maxSalary: jobFields.maxSalary ?? null,
        experience: jobFields.experience ?? null,
        status: jobFields.status ?? "active",
        applicationDeadline: applicationDeadline
          ? new Date(applicationDeadline)
          : null,
        employerId: null,
        createdByAdminId: req.user.userId,
      })
      .returning();

    if (skills && skills.length > 0) {
      await db.insert(jobSkillsTable).values(
        skills.map((s) => ({
          jobId: job.id,
          skill: s.skill,
          level: s.level ?? "required",
        })),
      );
    }

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.job_posting.created",
      entityType: "job",
      entityId: job.id,
      ipAddress: req.ip,
      metadata: { type: job.type, requiredTracks: job.requiredTracks },
    });

    req.log.info({ jobId: job.id }, "Admin created job posting");
    res.status(201).json({ job });
    return;
  },
);

// GET /admin/job-postings — list admin-created jobs
router.get(
  "/admin/job-postings",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const typeFilter =
      typeof req.query.type === "string" &&
      (JOB_TYPES as readonly string[]).includes(req.query.type)
        ? (req.query.type as (typeof JOB_TYPES)[number])
        : undefined;

    const trackFilter =
      typeof req.query.track === "string" &&
      (CAREER_TRACKS as readonly string[]).includes(req.query.track)
        ? (req.query.track as (typeof CAREER_TRACKS)[number])
        : undefined;

    const conditions = [sql`${jobsTable.createdByAdminId} is not null`];
    if (typeFilter) conditions.push(eq(jobsTable.type, typeFilter));
    if (trackFilter) {
      conditions.push(sql`${trackFilter} = ANY(${jobsTable.requiredTracks})`);
    }

    const jobs = await db
      .select()
      .from(jobsTable)
      .where(and(...conditions))
      .orderBy(desc(jobsTable.createdAt));

    res.json({ jobs });
    return;
  },
);

// GET /admin/internships — convenience: admin-created internships
router.get(
  "/admin/internships",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const trackFilter =
      typeof req.query.track === "string" &&
      (CAREER_TRACKS as readonly string[]).includes(req.query.track)
        ? (req.query.track as (typeof CAREER_TRACKS)[number])
        : undefined;

    const conditions = [
      sql`${jobsTable.createdByAdminId} is not null`,
      eq(jobsTable.type, "internship"),
    ];
    if (trackFilter) {
      conditions.push(sql`${trackFilter} = ANY(${jobsTable.requiredTracks})`);
    }

    const jobs = await db
      .select()
      .from(jobsTable)
      .where(and(...conditions))
      .orderBy(desc(jobsTable.createdAt));

    res.json({ jobs });
    return;
  },
);

// PATCH /admin/job-postings/:id — edit an admin-created job posting
router.patch(
  "/admin/job-postings/:id",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const id = parseId(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid job id" });
      return;
    }

    const parsed = updateJobPostingSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid request body", details: parsed.error.issues });
      return;
    }

    const existing = await db.query.jobsTable.findFirst({
      where: and(
        eq(jobsTable.id, id),
        sql`${jobsTable.createdByAdminId} is not null`,
      ),
    });
    if (!existing) {
      res.status(404).json({ error: "Job posting not found" });
      return;
    }

    const { applicationDeadline, ...rest } = parsed.data;
    const updateValues: Record<string, unknown> = { ...rest };
    if (applicationDeadline !== undefined) {
      updateValues.applicationDeadline = applicationDeadline
        ? new Date(applicationDeadline)
        : null;
    }

    const [job] = await db
      .update(jobsTable)
      .set(updateValues)
      .where(eq(jobsTable.id, id))
      .returning();

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.job_posting.updated",
      entityType: "job",
      entityId: id,
      ipAddress: req.ip,
    });

    res.json({ job });
    return;
  },
);

// POST /admin/job-postings/:id/publish — set status active
router.post(
  "/admin/job-postings/:id/publish",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const id = parseId(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid job id" });
      return;
    }

    const existing = await db.query.jobsTable.findFirst({
      where: and(
        eq(jobsTable.id, id),
        sql`${jobsTable.createdByAdminId} is not null`,
      ),
    });
    if (!existing) {
      res.status(404).json({ error: "Job posting not found" });
      return;
    }

    const [job] = await db
      .update(jobsTable)
      .set({ status: "active" })
      .where(eq(jobsTable.id, id))
      .returning();

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.job_posting.published",
      entityType: "job",
      entityId: id,
      ipAddress: req.ip,
    });

    res.json({ job });
    return;
  },
);

// POST /admin/job-postings/:id/archive — set status closed
router.post(
  "/admin/job-postings/:id/archive",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const id = parseId(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid job id" });
      return;
    }

    const existing = await db.query.jobsTable.findFirst({
      where: and(
        eq(jobsTable.id, id),
        sql`${jobsTable.createdByAdminId} is not null`,
      ),
    });
    if (!existing) {
      res.status(404).json({ error: "Job posting not found" });
      return;
    }

    const [job] = await db
      .update(jobsTable)
      .set({ status: "closed" })
      .where(eq(jobsTable.id, id))
      .returning();

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.job_posting.archived",
      entityType: "job",
      entityId: id,
      ipAddress: req.ip,
    });

    res.json({ job });
    return;
  },
);

export default router;
