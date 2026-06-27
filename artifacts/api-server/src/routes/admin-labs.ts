import { Router, type Response } from "express";
import { eq, desc, asc, sql, count } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { labsTable, labModulesTable, tracksTable } from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";
import { CommandSpecSchema, validateSpecRegexes, type CommandSpec } from "../lib/command-validator";

const router = Router();

const adminGuards = [requireAuth, requireRole("admin")];

const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;

const createLabSchema = z.object({
  trackId: z.number().int().positive(),
  title: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase alphanumeric with hyphens"),
  description: z.string().min(1).max(5000),
  difficulty: z.enum(DIFFICULTIES).optional(),
  type: z.string().min(1).max(60).optional(),
  tags: z.array(z.string().min(1).max(60)).max(50).optional(),
  totalPoints: z.number().int().min(0).max(100000).optional(),
  estimatedMinutes: z.number().int().min(0).max(100000).optional(),
  dockerImage: z.string().max(200).optional(),
});

const updateLabSchema = z.object({
  trackId: z.number().int().positive().optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(5000).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  type: z.string().min(1).max(60).optional(),
  tags: z.array(z.string().min(1).max(60)).max(50).optional(),
  totalPoints: z.number().int().min(0).max(100000).optional(),
  estimatedMinutes: z.number().int().min(0).max(100000).optional(),
  dockerImage: z.string().max(200).nullable().optional(),
});

const VALIDATION_TYPES = ["flag", "command"] as const;

const createLabModuleSchema = z.object({
  title: z.string().min(1).max(200),
  order: z.number().int().min(0),
  taskDescription: z.string().min(1).max(10000),
  hint: z.string().max(5000).optional(),
  flag: z.string().max(500).optional(),
  flagFormat: z.string().max(200).optional(),
  validationType: z.enum(VALIDATION_TYPES).optional(),
  commandSpec: CommandSpecSchema.nullable().optional(),
  solutionExplanation: z.string().max(10000).optional(),
  points: z.number().int().min(0).max(100000).optional(),
});

const updateLabModuleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  order: z.number().int().min(0).optional(),
  taskDescription: z.string().min(1).max(10000).optional(),
  hint: z.string().max(5000).nullable().optional(),
  flag: z.string().max(500).nullable().optional(),
  flagFormat: z.string().max(200).nullable().optional(),
  validationType: z.enum(VALIDATION_TYPES).optional(),
  commandSpec: CommandSpecSchema.nullable().optional(),
  solutionExplanation: z.string().max(10000).nullable().optional(),
  points: z.number().int().min(0).max(100000).optional(),
});

function ip(req: AuthRequest): string | undefined {
  return req.ip;
}

// GET /admin/labs?track= — list labs (optionally filtered by track slug)
router.get(
  "/admin/labs",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const trackSlug =
      typeof req.query.track === "string" ? req.query.track.trim() : "";

    let trackId: number | null = null;
    if (trackSlug) {
      const track = await db.query.tracksTable.findFirst({
        where: eq(tracksTable.slug, trackSlug),
      });
      if (!track) {
        res.json({ labs: [] });
        return;
      }
      trackId = track.id;
    }

    const rows = await db
      .select({
        id: labsTable.id,
        trackId: labsTable.trackId,
        title: labsTable.title,
        slug: labsTable.slug,
        description: labsTable.description,
        difficulty: labsTable.difficulty,
        type: labsTable.type,
        tags: labsTable.tags,
        totalPoints: labsTable.totalPoints,
        estimatedMinutes: labsTable.estimatedMinutes,
        isActive: labsTable.isActive,
        createdAt: labsTable.createdAt,
        updatedAt: labsTable.updatedAt,
        trackName: tracksTable.name,
        trackSlug: tracksTable.slug,
      })
      .from(labsTable)
      .leftJoin(tracksTable, eq(tracksTable.id, labsTable.trackId))
      .where(trackId !== null ? eq(labsTable.trackId, trackId) : undefined)
      .orderBy(desc(labsTable.createdAt))
      .limit(500);

    const ids = rows.map((r) => r.id);
    const moduleCounts = new Map<number, number>();
    if (ids.length > 0) {
      const mc = await db
        .select({
          labId: labModulesTable.labId,
          count: count(),
        })
        .from(labModulesTable)
        .where(
          sql`${labModulesTable.labId} in (${sql.join(
            ids.map((i) => sql`${i}`),
            sql`, `
          )})`
        )
        .groupBy(labModulesTable.labId);
      for (const r of mc) moduleCounts.set(r.labId, r.count);
    }

    res.json({
      labs: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        moduleCount: moduleCounts.get(r.id) ?? 0,
      })),
    });
  }
);

// POST /admin/labs — create a lab (track required, slug unique)
router.post(
  "/admin/labs",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const parsed = createLabSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const d = parsed.data;

    const track = await db.query.tracksTable.findFirst({
      where: eq(tracksTable.id, d.trackId),
    });
    if (!track) {
      res.status(400).json({ error: "trackId must reference a valid track" });
      return;
    }

    const existing = await db.query.labsTable.findFirst({
      where: eq(labsTable.slug, d.slug),
    });
    if (existing) {
      res.status(409).json({ error: "A lab with that slug already exists" });
      return;
    }

    const [lab] = await db
      .insert(labsTable)
      .values({
        trackId: d.trackId,
        title: d.title,
        slug: d.slug,
        description: d.description,
        difficulty: d.difficulty ?? "beginner",
        type: d.type ?? "ctf",
        tags: d.tags ?? [],
        totalPoints: d.totalPoints ?? 100,
        estimatedMinutes: d.estimatedMinutes ?? 60,
        dockerImage: d.dockerImage,
        isActive: true,
      })
      .returning();

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.lab.created",
      entityType: "lab",
      entityId: lab.id,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { title: d.title, slug: d.slug, trackId: d.trackId },
    });

    res.status(201).json({
      lab: {
        ...lab,
        createdAt: lab.createdAt.toISOString(),
        updatedAt: lab.updatedAt.toISOString(),
        moduleCount: 0,
      },
    });
  }
);

// GET /admin/labs/:id — lab with its modules
router.get(
  "/admin/labs/:id",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid lab id" });
      return;
    }
    const lab = await db.query.labsTable.findFirst({
      where: eq(labsTable.id, id),
    });
    if (!lab) {
      res.status(404).json({ error: "Lab not found" });
      return;
    }
    const modules = await db
      .select()
      .from(labModulesTable)
      .where(eq(labModulesTable.labId, id))
      .orderBy(asc(labModulesTable.order));

    res.json({
      lab: {
        ...lab,
        createdAt: lab.createdAt.toISOString(),
        updatedAt: lab.updatedAt.toISOString(),
      },
      modules: modules.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  }
);

// PATCH /admin/labs/:id — edit lab fields
router.patch(
  "/admin/labs/:id",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid lab id" });
      return;
    }
    const parsed = updateLabSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const lab = await db.query.labsTable.findFirst({
      where: eq(labsTable.id, id),
    });
    if (!lab) {
      res.status(404).json({ error: "Lab not found" });
      return;
    }
    const d = parsed.data;
    if (d.trackId !== undefined) {
      const track = await db.query.tracksTable.findFirst({
        where: eq(tracksTable.id, d.trackId),
      });
      if (!track) {
        res.status(400).json({ error: "trackId must reference a valid track" });
        return;
      }
    }

    const [updated] = await db
      .update(labsTable)
      .set({
        ...(d.trackId !== undefined ? { trackId: d.trackId } : {}),
        ...(d.title !== undefined ? { title: d.title } : {}),
        ...(d.description !== undefined ? { description: d.description } : {}),
        ...(d.difficulty !== undefined ? { difficulty: d.difficulty } : {}),
        ...(d.type !== undefined ? { type: d.type } : {}),
        ...(d.tags !== undefined ? { tags: d.tags } : {}),
        ...(d.totalPoints !== undefined ? { totalPoints: d.totalPoints } : {}),
        ...(d.estimatedMinutes !== undefined
          ? { estimatedMinutes: d.estimatedMinutes }
          : {}),
        ...(d.dockerImage !== undefined ? { dockerImage: d.dockerImage } : {}),
      })
      .where(eq(labsTable.id, id))
      .returning();

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.lab.updated",
      entityType: "lab",
      entityId: id,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { ...d },
    });

    res.json({
      lab: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  }
);

// POST /admin/labs/:id/publish — set isActive=true
router.post(
  "/admin/labs/:id/publish",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    await setLabActive(req, res, true, "admin.lab.published");
  }
);

// POST /admin/labs/:id/archive — set isActive=false
router.post(
  "/admin/labs/:id/archive",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    await setLabActive(req, res, false, "admin.lab.archived");
  }
);

async function setLabActive(
  req: AuthRequest,
  res: Response,
  isActive: boolean,
  action: string
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid lab id" });
    return;
  }
  const lab = await db.query.labsTable.findFirst({
    where: eq(labsTable.id, id),
  });
  if (!lab) {
    res.status(404).json({ error: "Lab not found" });
    return;
  }
  const [updated] = await db
    .update(labsTable)
    .set({ isActive })
    .where(eq(labsTable.id, id))
    .returning();

  await createAuditLog({
    userId: req.user.userId,
    action,
    entityType: "lab",
    entityId: id,
    ipAddress: ip(req),
    userAgent: req.headers["user-agent"],
    metadata: { isActive },
  });

  res.json({
    lab: {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}

// POST /admin/labs/:id/modules — create a lab module (flag/scoring)
router.post(
  "/admin/labs/:id/modules",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid lab id" });
      return;
    }
    const parsed = createLabModuleSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const lab = await db.query.labsTable.findFirst({
      where: eq(labsTable.id, id),
    });
    if (!lab) {
      res.status(404).json({ error: "Lab not found" });
      return;
    }
    const d = parsed.data;
    const effectiveType = d.validationType ?? "flag";
    if (effectiveType === "command") {
      if (!d.commandSpec) {
        res.status(400).json({ error: "A command-validated module requires a commandSpec." });
        return;
      }
      const regexErr = validateSpecRegexes(d.commandSpec);
      if (regexErr) { res.status(400).json({ error: regexErr }); return; }
    }
    const [module] = await db
      .insert(labModulesTable)
      .values({
        labId: id,
        title: d.title,
        order: d.order,
        taskDescription: d.taskDescription,
        hint: d.hint,
        flag: d.flag,
        flagFormat: d.flagFormat,
        validationType: effectiveType,
        commandSpec: effectiveType === "command" ? (d.commandSpec ?? null) : null,
        solutionExplanation: d.solutionExplanation,
        points: d.points ?? 10,
      })
      .returning();

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.lab_module.created",
      entityType: "lab_module",
      entityId: module.id,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { labId: id, title: d.title },
    });

    res.status(201).json({
      module: {
        ...module,
        createdAt: module.createdAt.toISOString(),
      },
    });
  }
);

// PATCH /admin/lab-modules/:moduleId — edit a lab module
router.patch(
  "/admin/lab-modules/:moduleId",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const moduleId = parseInt(String(req.params.moduleId), 10);
    if (isNaN(moduleId)) {
      res.status(400).json({ error: "Invalid module id" });
      return;
    }
    const parsed = updateLabModuleSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const existing = await db.query.labModulesTable.findFirst({
      where: eq(labModulesTable.id, moduleId),
    });
    if (!existing) {
      res.status(404).json({ error: "Lab module not found" });
      return;
    }
    const d = parsed.data;

    // Resolve the validation strategy after this patch; keep (type, spec) coherent.
    // specToPersist === undefined means "leave the commandSpec column untouched".
    const effectiveType = (d.validationType ?? existing.validationType) as "flag" | "command";
    let specToPersist: CommandSpec | null | undefined = undefined;
    if (effectiveType === "command") {
      const rawSpec = d.commandSpec !== undefined ? d.commandSpec : existing.commandSpec;
      const specParsed = CommandSpecSchema.safeParse(rawSpec);
      if (!specParsed.success) {
        res.status(400).json({ error: "A command-validated module requires a valid commandSpec." });
        return;
      }
      const regexErr = validateSpecRegexes(specParsed.data);
      if (regexErr) { res.status(400).json({ error: regexErr }); return; }
      if (d.commandSpec !== undefined || d.validationType === "command") {
        specToPersist = specParsed.data;
      }
    } else if (d.validationType === "flag") {
      specToPersist = null;
    }

    const [updated] = await db
      .update(labModulesTable)
      .set({
        ...(d.title !== undefined ? { title: d.title } : {}),
        ...(d.order !== undefined ? { order: d.order } : {}),
        ...(d.taskDescription !== undefined
          ? { taskDescription: d.taskDescription }
          : {}),
        ...(d.hint !== undefined ? { hint: d.hint } : {}),
        ...(d.flag !== undefined ? { flag: d.flag } : {}),
        ...(d.flagFormat !== undefined ? { flagFormat: d.flagFormat } : {}),
        ...(d.validationType !== undefined ? { validationType: d.validationType } : {}),
        ...(specToPersist !== undefined ? { commandSpec: specToPersist } : {}),
        ...(d.solutionExplanation !== undefined
          ? { solutionExplanation: d.solutionExplanation }
          : {}),
        ...(d.points !== undefined ? { points: d.points } : {}),
      })
      .where(eq(labModulesTable.id, moduleId))
      .returning();

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.lab_module.updated",
      entityType: "lab_module",
      entityId: moduleId,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { ...d },
    });

    res.json({
      module: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  }
);

// DELETE /admin/lab-modules/:moduleId — delete a lab module
router.delete(
  "/admin/lab-modules/:moduleId",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const moduleId = parseInt(String(req.params.moduleId), 10);
    if (isNaN(moduleId)) {
      res.status(400).json({ error: "Invalid module id" });
      return;
    }
    const [deleted] = await db
      .delete(labModulesTable)
      .where(eq(labModulesTable.id, moduleId))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Lab module not found" });
      return;
    }

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.lab_module.deleted",
      entityType: "lab_module",
      entityId: moduleId,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { labId: deleted.labId },
    });

    res.json({ ok: true });
  }
);

export default router;
