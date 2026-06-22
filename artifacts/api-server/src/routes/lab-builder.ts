import { Router, type Response, type NextFunction } from "express";
import { eq, and, desc, asc, inArray, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import {
  labsTable,
  labModulesTable,
  labAttemptsTable,
  labModuleCompletionsTable,
  labAssetsTable,
  labHintsTable,
  labVersionsTable,
  labAssignmentsTable,
  tracksTable,
  usersTable,
  type Lab,
} from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";
import { createNotification } from "../lib/notifications";

const router = Router();

const builderGuards = [requireAuth, requireRole("mentor", "admin")];

const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
const ASSET_KINDS = [
  "pdf",
  "video",
  "pcap",
  "script",
  "challenge",
  "image",
  "link",
] as const;
const AUDIENCE_TYPES = ["student", "batch", "track", "cohort"] as const;
const CAREER_TRACKS = ["soc", "vapt", "grc"] as const;

// ── Schemas ──────────────────────────────────────────────────────────────────
const createLabSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase alphanumeric with hyphens"),
  description: z.string().min(1).max(5000),
  trackId: z.number().int().positive().nullable().optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  type: z.string().min(1).max(60).optional(),
  tags: z.array(z.string().min(1).max(60)).max(50).optional(),
  estimatedMinutes: z.number().int().min(0).max(100000).optional(),
  totalPoints: z.number().int().min(0).max(100000).optional(),
  learningObjectives: z.array(z.string().min(1).max(500)).max(50).optional(),
  walkthrough: z.string().max(50000).nullable().optional(),
});

const updateLabSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(5000).optional(),
  trackId: z.number().int().positive().nullable().optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  type: z.string().min(1).max(60).optional(),
  tags: z.array(z.string().min(1).max(60)).max(50).optional(),
  estimatedMinutes: z.number().int().min(0).max(100000).optional(),
  totalPoints: z.number().int().min(0).max(100000).optional(),
  learningObjectives: z.array(z.string().min(1).max(500)).max(50).optional(),
  walkthrough: z.string().max(50000).nullable().optional(),
});

const createModuleSchema = z.object({
  title: z.string().min(1).max(200),
  order: z.number().int().min(0),
  taskDescription: z.string().min(1).max(10000),
  hint: z.string().max(5000).optional(),
  flag: z.string().max(500).optional(),
  flagFormat: z.string().max(200).optional(),
  solutionExplanation: z.string().max(10000).optional(),
  walkthrough: z.string().max(50000).optional(),
  points: z.number().int().min(0).max(100000).optional(),
});

const updateModuleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  order: z.number().int().min(0).optional(),
  taskDescription: z.string().min(1).max(10000).optional(),
  hint: z.string().max(5000).nullable().optional(),
  flag: z.string().max(500).nullable().optional(),
  flagFormat: z.string().max(200).nullable().optional(),
  solutionExplanation: z.string().max(10000).nullable().optional(),
  walkthrough: z.string().max(50000).nullable().optional(),
  points: z.number().int().min(0).max(100000).optional(),
});

const createHintSchema = z.object({
  order: z.number().int().min(0).optional(),
  content: z.string().min(1).max(5000),
  penaltyPoints: z.number().int().min(0).max(100000).optional(),
});

const createAssetSchema = z.object({
  kind: z.enum(ASSET_KINDS),
  title: z.string().min(1).max(200),
  url: z.string().url().max(2000),
  storageKey: z.string().max(500).optional(),
  sizeBytes: z.number().int().min(0).optional(),
});

const createAssignmentSchema = z.object({
  audienceType: z.enum(AUDIENCE_TYPES),
  studentId: z.number().int().positive().optional(),
  batchId: z.number().int().positive().optional(),
  trackId: z.number().int().positive().optional(),
  dueAt: z.string().optional(),
  note: z.string().max(2000).optional(),
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function parseId(raw: unknown): number | null {
  const n = parseInt(String(raw), 10);
  return Number.isNaN(n) ? null : n;
}

function isAdmin(req: AuthRequest): boolean {
  return req.user?.role === "admin";
}

// Load a lab and enforce ownership: mentors only their own, admins anything.
// Returns the lab, or writes the appropriate error response and returns null.
async function loadOwnedLab(
  req: AuthRequest,
  res: Response,
  id: number
): Promise<Lab | null> {
  const lab = await db.query.labsTable.findFirst({
    where: eq(labsTable.id, id),
  });
  if (!lab) {
    res.status(404).json({ error: "Lab not found" });
    return null;
  }
  if (!isAdmin(req) && lab.authorId !== req.user!.userId) {
    res.status(403).json({ error: "This lab does not belong to you" });
    return null;
  }
  return lab;
}

function serializeLab(lab: Lab) {
  return {
    ...lab,
    createdAt: lab.createdAt.toISOString(),
    updatedAt: lab.updatedAt.toISOString(),
  };
}

async function generateUniqueSlug(base: string): Promise<string> {
  const root = base
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "lab";
  let candidate = root;
  let suffix = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await db.query.labsTable.findFirst({
      where: eq(labsTable.slug, candidate),
    });
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${root}-${suffix}`.slice(0, 120);
  }
}

// Resolve the set of student userIds targeted by an assignment audience.
async function resolveTargetStudentIds(opts: {
  audienceType: string;
  studentId?: number | null;
  trackId?: number | null;
}): Promise<number[]> {
  const { audienceType, studentId, trackId } = opts;
  if (audienceType === "student") {
    return studentId ? [studentId] : [];
  }
  if (audienceType === "cohort") {
    const rows = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.role, "student"));
    return rows.map((r) => r.id);
  }
  if (audienceType === "track") {
    if (!trackId) return [];
    const track = await db.query.tracksTable.findFirst({
      where: eq(tracksTable.id, trackId),
    });
    if (!track) return [];
    const domain = track.domain;
    if (!(CAREER_TRACKS as readonly string[]).includes(domain)) return [];
    const rows = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(
        and(
          eq(usersTable.role, "student"),
          eq(usersTable.careerTrack, domain as (typeof CAREER_TRACKS)[number])
        )
      );
    return rows.map((r) => r.id);
  }
  return [];
}

// ── GET /lab-builder/labs — list own (mentor) or all (admin) ──────────────────
router.get(
  "/lab-builder/labs",
  ...builderGuards,
  async (req: AuthRequest, res): Promise<void> => {
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
        authorId: labsTable.authorId,
        authorRole: labsTable.authorRole,
        status: labsTable.status,
        version: labsTable.version,
        createdAt: labsTable.createdAt,
        updatedAt: labsTable.updatedAt,
        trackName: tracksTable.name,
      })
      .from(labsTable)
      .leftJoin(tracksTable, eq(tracksTable.id, labsTable.trackId))
      .where(
        isAdmin(req) ? undefined : eq(labsTable.authorId, req.user!.userId)
      )
      .orderBy(desc(labsTable.updatedAt))
      .limit(500);

    const ids = rows.map((r) => r.id);
    const moduleCounts = new Map<number, number>();
    const assignmentCounts = new Map<number, number>();
    if (ids.length > 0) {
      const [mc, ac] = await Promise.all([
        db
          .select({ labId: labModulesTable.labId, c: sql<number>`count(*)::int` })
          .from(labModulesTable)
          .where(inArray(labModulesTable.labId, ids))
          .groupBy(labModulesTable.labId),
        db
          .select({
            labId: labAssignmentsTable.labId,
            c: sql<number>`count(*)::int`,
          })
          .from(labAssignmentsTable)
          .where(inArray(labAssignmentsTable.labId, ids))
          .groupBy(labAssignmentsTable.labId),
      ]);
      for (const r of mc) moduleCounts.set(r.labId, r.c);
      for (const r of ac) assignmentCounts.set(r.labId, r.c);
    }

    res.json({
      labs: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        moduleCount: moduleCounts.get(r.id) ?? 0,
        assignmentCount: assignmentCounts.get(r.id) ?? 0,
      })),
    });
  }
);

// ── POST /lab-builder/labs — create a draft lab ───────────────────────────────
router.post(
  "/lab-builder/labs",
  ...builderGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const parsed = createLabSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const d = parsed.data;

    if (d.trackId != null) {
      const track = await db.query.tracksTable.findFirst({
        where: eq(tracksTable.id, d.trackId),
      });
      if (!track) {
        res.status(400).json({ error: "trackId must reference a valid track" });
        return;
      }
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
        trackId: d.trackId ?? null,
        title: d.title,
        slug: d.slug,
        description: d.description,
        difficulty: d.difficulty ?? "beginner",
        type: d.type ?? "ctf",
        tags: d.tags ?? [],
        totalPoints: d.totalPoints ?? 100,
        estimatedMinutes: d.estimatedMinutes ?? 60,
        learningObjectives: d.learningObjectives ?? [],
        walkthrough: d.walkthrough ?? null,
        authorId: req.user!.userId,
        authorRole: req.user!.role,
        status: "draft",
        version: 1,
        isActive: false,
      })
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "lab_builder.lab.created",
      entityType: "lab",
      entityId: lab.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { title: d.title, slug: d.slug, trackId: d.trackId ?? null },
    });

    res.status(201).json({
      lab: { ...serializeLab(lab), moduleCount: 0, assignmentCount: 0 },
    });
  }
);

// ── GET /lab-builder/labs/:id — full lab detail ───────────────────────────────
router.get(
  "/lab-builder/labs/:id",
  ...builderGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ error: "Invalid lab id" });
      return;
    }
    const lab = await loadOwnedLab(req, res, id);
    if (!lab) return;

    const modules = await db
      .select()
      .from(labModulesTable)
      .where(eq(labModulesTable.labId, id))
      .orderBy(asc(labModulesTable.order));

    const moduleIds = modules.map((m) => m.id);
    const hints =
      moduleIds.length > 0
        ? await db
            .select()
            .from(labHintsTable)
            .where(inArray(labHintsTable.labModuleId, moduleIds))
            .orderBy(asc(labHintsTable.order))
        : [];
    const hintsByModule = new Map<number, typeof hints>();
    for (const h of hints) {
      const arr = hintsByModule.get(h.labModuleId) ?? [];
      arr.push(h);
      hintsByModule.set(h.labModuleId, arr);
    }

    const [assets, versions] = await Promise.all([
      db
        .select()
        .from(labAssetsTable)
        .where(eq(labAssetsTable.labId, id))
        .orderBy(desc(labAssetsTable.createdAt)),
      db
        .select({
          id: labVersionsTable.id,
          labId: labVersionsTable.labId,
          version: labVersionsTable.version,
          note: labVersionsTable.note,
          createdBy: labVersionsTable.createdBy,
          createdAt: labVersionsTable.createdAt,
        })
        .from(labVersionsTable)
        .where(eq(labVersionsTable.labId, id))
        .orderBy(desc(labVersionsTable.version)),
    ]);

    res.json({
      lab: serializeLab(lab),
      modules: modules.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
        hints: (hintsByModule.get(m.id) ?? []).map((h) => ({
          ...h,
          createdAt: h.createdAt.toISOString(),
        })),
      })),
      assets: assets.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      })),
      versions: versions.map((v) => ({
        ...v,
        createdAt: v.createdAt.toISOString(),
      })),
    });
  }
);

// ── PUT /lab-builder/labs/:id — update fields ─────────────────────────────────
router.put(
  "/lab-builder/labs/:id",
  ...builderGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (id === null) {
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
    const lab = await loadOwnedLab(req, res, id);
    if (!lab) return;
    const d = parsed.data;

    if (d.trackId != null) {
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
        ...(d.title !== undefined ? { title: d.title } : {}),
        ...(d.description !== undefined ? { description: d.description } : {}),
        ...(d.trackId !== undefined ? { trackId: d.trackId } : {}),
        ...(d.difficulty !== undefined ? { difficulty: d.difficulty } : {}),
        ...(d.type !== undefined ? { type: d.type } : {}),
        ...(d.tags !== undefined ? { tags: d.tags } : {}),
        ...(d.estimatedMinutes !== undefined
          ? { estimatedMinutes: d.estimatedMinutes }
          : {}),
        ...(d.totalPoints !== undefined ? { totalPoints: d.totalPoints } : {}),
        ...(d.learningObjectives !== undefined
          ? { learningObjectives: d.learningObjectives }
          : {}),
        ...(d.walkthrough !== undefined ? { walkthrough: d.walkthrough } : {}),
      })
      .where(eq(labsTable.id, id))
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "lab_builder.lab.updated",
      entityType: "lab",
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { ...d },
    });

    res.json({ lab: serializeLab(updated) });
  }
);

// Build a JSON snapshot of the lab + its modules + hints for versioning.
async function buildSnapshot(labId: number): Promise<Record<string, unknown>> {
  const lab = await db.query.labsTable.findFirst({
    where: eq(labsTable.id, labId),
  });
  const modules = await db
    .select()
    .from(labModulesTable)
    .where(eq(labModulesTable.labId, labId))
    .orderBy(asc(labModulesTable.order));
  const moduleIds = modules.map((m) => m.id);
  const hints =
    moduleIds.length > 0
      ? await db
          .select()
          .from(labHintsTable)
          .where(inArray(labHintsTable.labModuleId, moduleIds))
          .orderBy(asc(labHintsTable.order))
      : [];
  return {
    lab,
    modules: modules.map((m) => ({
      ...m,
      hints: hints.filter((h) => h.labModuleId === m.id),
    })),
  };
}

// ── POST /lab-builder/labs/:id/publish ────────────────────────────────────────
router.post(
  "/lab-builder/labs/:id/publish",
  ...builderGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ error: "Invalid lab id" });
      return;
    }
    const lab = await loadOwnedLab(req, res, id);
    if (!lab) return;

    const moduleCount = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(labModulesTable)
      .where(eq(labModulesTable.labId, id));
    if ((moduleCount[0]?.c ?? 0) === 0) {
      res
        .status(400)
        .json({ error: "Add at least one module before publishing" });
      return;
    }

    const newVersion = lab.version + 1;
    const snapshot = await buildSnapshot(id);

    await db.insert(labVersionsTable).values({
      labId: id,
      version: newVersion,
      snapshot,
      note: "Published",
      createdBy: req.user!.userId,
    });

    const [updated] = await db
      .update(labsTable)
      .set({ status: "published", isActive: true, version: newVersion })
      .where(eq(labsTable.id, id))
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "lab_builder.lab.published",
      entityType: "lab",
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { version: newVersion },
    });

    res.json({ lab: serializeLab(updated) });
  }
);

// ── POST /lab-builder/labs/:id/archive ────────────────────────────────────────
router.post(
  "/lab-builder/labs/:id/archive",
  ...builderGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ error: "Invalid lab id" });
      return;
    }
    const lab = await loadOwnedLab(req, res, id);
    if (!lab) return;

    const [updated] = await db
      .update(labsTable)
      .set({ status: "archived", isActive: false })
      .where(eq(labsTable.id, id))
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "lab_builder.lab.archived",
      entityType: "lab",
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: {},
    });

    res.json({ lab: serializeLab(updated) });
  }
);

// ── POST /lab-builder/labs/:id/clone — deep copy as new draft ─────────────────
router.post(
  "/lab-builder/labs/:id/clone",
  ...builderGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ error: "Invalid lab id" });
      return;
    }
    const lab = await loadOwnedLab(req, res, id);
    if (!lab) return;

    const newSlug = await generateUniqueSlug(`${lab.slug}-copy`);

    const [clone] = await db
      .insert(labsTable)
      .values({
        trackId: lab.trackId,
        title: `${lab.title} (Copy)`,
        slug: newSlug,
        description: lab.description,
        difficulty: lab.difficulty,
        type: lab.type,
        tags: lab.tags,
        totalPoints: lab.totalPoints,
        estimatedMinutes: lab.estimatedMinutes,
        dockerImage: lab.dockerImage,
        simulator: lab.simulator,
        learningObjectives: lab.learningObjectives,
        walkthrough: lab.walkthrough,
        authorId: req.user!.userId,
        authorRole: req.user!.role,
        status: "draft",
        version: 1,
        isActive: false,
      })
      .returning();

    const modules = await db
      .select()
      .from(labModulesTable)
      .where(eq(labModulesTable.labId, id))
      .orderBy(asc(labModulesTable.order));

    for (const m of modules) {
      const [newModule] = await db
        .insert(labModulesTable)
        .values({
          labId: clone.id,
          title: m.title,
          order: m.order,
          taskDescription: m.taskDescription,
          hint: m.hint,
          flagFormat: m.flagFormat,
          flag: m.flag,
          solutionExplanation: m.solutionExplanation,
          walkthrough: m.walkthrough,
          points: m.points,
        })
        .returning();

      const moduleHints = await db
        .select()
        .from(labHintsTable)
        .where(eq(labHintsTable.labModuleId, m.id))
        .orderBy(asc(labHintsTable.order));
      if (moduleHints.length > 0) {
        await db.insert(labHintsTable).values(
          moduleHints.map((h) => ({
            labModuleId: newModule.id,
            order: h.order,
            content: h.content,
            penaltyPoints: h.penaltyPoints,
          }))
        );
      }
    }

    const assets = await db
      .select()
      .from(labAssetsTable)
      .where(eq(labAssetsTable.labId, id));
    if (assets.length > 0) {
      await db.insert(labAssetsTable).values(
        assets.map((a) => ({
          labId: clone.id,
          kind: a.kind,
          title: a.title,
          url: a.url,
          storageKey: a.storageKey,
          sizeBytes: a.sizeBytes,
          uploadedBy: req.user!.userId,
        }))
      );
    }

    await createAuditLog({
      userId: req.user!.userId,
      action: "lab_builder.lab.cloned",
      entityType: "lab",
      entityId: clone.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { sourceLabId: id, slug: newSlug },
    });

    res.status(201).json({ lab: serializeLab(clone) });
  }
);

// ── Modules ───────────────────────────────────────────────────────────────────
router.post(
  "/lab-builder/labs/:id/modules",
  ...builderGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ error: "Invalid lab id" });
      return;
    }
    const parsed = createModuleSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const lab = await loadOwnedLab(req, res, id);
    if (!lab) return;
    const d = parsed.data;

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
        solutionExplanation: d.solutionExplanation,
        walkthrough: d.walkthrough,
        points: d.points ?? 10,
      })
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "lab_builder.module.created",
      entityType: "lab_module",
      entityId: module.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { labId: id, title: d.title },
    });

    res
      .status(201)
      .json({ module: { ...module, createdAt: module.createdAt.toISOString() } });
  }
);

// Load a module + its parent lab and enforce ownership.
async function loadOwnedModule(
  req: AuthRequest,
  res: Response,
  moduleId: number
): Promise<{ module: typeof labModulesTable.$inferSelect; lab: Lab } | null> {
  const module = await db.query.labModulesTable.findFirst({
    where: eq(labModulesTable.id, moduleId),
  });
  if (!module) {
    res.status(404).json({ error: "Lab module not found" });
    return null;
  }
  const lab = await loadOwnedLab(req, res, module.labId);
  if (!lab) return null;
  return { module, lab };
}

router.put(
  "/lab-builder/modules/:moduleId",
  ...builderGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const moduleId = parseId(req.params.moduleId);
    if (moduleId === null) {
      res.status(400).json({ error: "Invalid module id" });
      return;
    }
    const parsed = updateModuleSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const loaded = await loadOwnedModule(req, res, moduleId);
    if (!loaded) return;
    const d = parsed.data;

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
        ...(d.solutionExplanation !== undefined
          ? { solutionExplanation: d.solutionExplanation }
          : {}),
        ...(d.walkthrough !== undefined ? { walkthrough: d.walkthrough } : {}),
        ...(d.points !== undefined ? { points: d.points } : {}),
      })
      .where(eq(labModulesTable.id, moduleId))
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "lab_builder.module.updated",
      entityType: "lab_module",
      entityId: moduleId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { ...d },
    });

    res.json({
      module: { ...updated, createdAt: updated.createdAt.toISOString() },
    });
  }
);

router.delete(
  "/lab-builder/modules/:moduleId",
  ...builderGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const moduleId = parseId(req.params.moduleId);
    if (moduleId === null) {
      res.status(400).json({ error: "Invalid module id" });
      return;
    }
    const loaded = await loadOwnedModule(req, res, moduleId);
    if (!loaded) return;

    await db
      .delete(labHintsTable)
      .where(eq(labHintsTable.labModuleId, moduleId));
    await db.delete(labModulesTable).where(eq(labModulesTable.id, moduleId));

    await createAuditLog({
      userId: req.user!.userId,
      action: "lab_builder.module.deleted",
      entityType: "lab_module",
      entityId: moduleId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { labId: loaded.lab.id },
    });

    res.json({ ok: true });
  }
);

// ── Hints ─────────────────────────────────────────────────────────────────────
router.post(
  "/lab-builder/modules/:moduleId/hints",
  ...builderGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const moduleId = parseId(req.params.moduleId);
    if (moduleId === null) {
      res.status(400).json({ error: "Invalid module id" });
      return;
    }
    const parsed = createHintSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const loaded = await loadOwnedModule(req, res, moduleId);
    if (!loaded) return;
    const d = parsed.data;

    let order = d.order;
    if (order === undefined) {
      const existing = await db
        .select({ max: sql<number>`coalesce(max(${labHintsTable.order}), 0)::int` })
        .from(labHintsTable)
        .where(eq(labHintsTable.labModuleId, moduleId));
      order = (existing[0]?.max ?? 0) + 1;
    }

    const [hint] = await db
      .insert(labHintsTable)
      .values({
        labModuleId: moduleId,
        order,
        content: d.content,
        penaltyPoints: d.penaltyPoints ?? 0,
      })
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "lab_builder.hint.created",
      entityType: "lab_hint",
      entityId: hint.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { moduleId },
    });

    res
      .status(201)
      .json({ hint: { ...hint, createdAt: hint.createdAt.toISOString() } });
  }
);

router.delete(
  "/lab-builder/hints/:hintId",
  ...builderGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const hintId = parseId(req.params.hintId);
    if (hintId === null) {
      res.status(400).json({ error: "Invalid hint id" });
      return;
    }
    const hint = await db.query.labHintsTable.findFirst({
      where: eq(labHintsTable.id, hintId),
    });
    if (!hint) {
      res.status(404).json({ error: "Hint not found" });
      return;
    }
    const loaded = await loadOwnedModule(req, res, hint.labModuleId);
    if (!loaded) return;

    await db.delete(labHintsTable).where(eq(labHintsTable.id, hintId));

    await createAuditLog({
      userId: req.user!.userId,
      action: "lab_builder.hint.deleted",
      entityType: "lab_hint",
      entityId: hintId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { moduleId: hint.labModuleId },
    });

    res.json({ ok: true });
  }
);

// ── Assets ────────────────────────────────────────────────────────────────────
router.post(
  "/lab-builder/labs/:id/assets",
  ...builderGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ error: "Invalid lab id" });
      return;
    }
    const parsed = createAssetSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const lab = await loadOwnedLab(req, res, id);
    if (!lab) return;
    const d = parsed.data;

    const [asset] = await db
      .insert(labAssetsTable)
      .values({
        labId: id,
        kind: d.kind,
        title: d.title,
        url: d.url,
        storageKey: d.storageKey,
        sizeBytes: d.sizeBytes,
        uploadedBy: req.user!.userId,
      })
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "lab_builder.asset.created",
      entityType: "lab_asset",
      entityId: asset.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { labId: id, kind: d.kind },
    });

    res
      .status(201)
      .json({ asset: { ...asset, createdAt: asset.createdAt.toISOString() } });
  }
);

router.delete(
  "/lab-builder/assets/:assetId",
  ...builderGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const assetId = parseId(req.params.assetId);
    if (assetId === null) {
      res.status(400).json({ error: "Invalid asset id" });
      return;
    }
    const asset = await db.query.labAssetsTable.findFirst({
      where: eq(labAssetsTable.id, assetId),
    });
    if (!asset) {
      res.status(404).json({ error: "Asset not found" });
      return;
    }
    const lab = await loadOwnedLab(req, res, asset.labId);
    if (!lab) return;

    await db.delete(labAssetsTable).where(eq(labAssetsTable.id, assetId));

    await createAuditLog({
      userId: req.user!.userId,
      action: "lab_builder.asset.deleted",
      entityType: "lab_asset",
      entityId: assetId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { labId: asset.labId },
    });

    res.json({ ok: true });
  }
);

// ── Assignments ───────────────────────────────────────────────────────────────
router.get(
  "/lab-builder/labs/:id/assignments",
  ...builderGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ error: "Invalid lab id" });
      return;
    }
    const lab = await loadOwnedLab(req, res, id);
    if (!lab) return;

    const rows = await db
      .select({
        id: labAssignmentsTable.id,
        labId: labAssignmentsTable.labId,
        assignedBy: labAssignmentsTable.assignedBy,
        audienceType: labAssignmentsTable.audienceType,
        studentId: labAssignmentsTable.studentId,
        batchId: labAssignmentsTable.batchId,
        trackId: labAssignmentsTable.trackId,
        dueAt: labAssignmentsTable.dueAt,
        note: labAssignmentsTable.note,
        createdAt: labAssignmentsTable.createdAt,
        studentName: usersTable.fullName,
        studentEmail: usersTable.email,
        trackName: tracksTable.name,
      })
      .from(labAssignmentsTable)
      .leftJoin(usersTable, eq(usersTable.id, labAssignmentsTable.studentId))
      .leftJoin(tracksTable, eq(tracksTable.id, labAssignmentsTable.trackId))
      .where(eq(labAssignmentsTable.labId, id))
      .orderBy(desc(labAssignmentsTable.createdAt));

    res.json({
      assignments: rows.map((r) => ({
        ...r,
        dueAt: r.dueAt ? r.dueAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  }
);

router.post(
  "/lab-builder/labs/:id/assignments",
  ...builderGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ error: "Invalid lab id" });
      return;
    }
    const parsed = createAssignmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const lab = await loadOwnedLab(req, res, id);
    if (!lab) return;
    const d = parsed.data;

    if (d.audienceType === "batch") {
      res
        .status(400)
        .json({ error: "Batch assignments are not supported yet" });
      return;
    }

    if (d.audienceType === "student") {
      if (!d.studentId) {
        res
          .status(400)
          .json({ error: "studentId is required for student audience" });
        return;
      }
      const student = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, d.studentId),
      });
      if (!student || student.role !== "student") {
        res
          .status(400)
          .json({ error: "studentId must reference a valid student" });
        return;
      }
      const existing = await db.query.labAssignmentsTable.findFirst({
        where: and(
          eq(labAssignmentsTable.labId, id),
          eq(labAssignmentsTable.audienceType, "student"),
          eq(labAssignmentsTable.studentId, d.studentId)
        ),
      });
      if (existing) {
        res
          .status(409)
          .json({ error: "This student is already assigned to this lab" });
        return;
      }
    }

    if (d.audienceType === "track") {
      if (!d.trackId) {
        res
          .status(400)
          .json({ error: "trackId is required for track audience" });
        return;
      }
      const track = await db.query.tracksTable.findFirst({
        where: eq(tracksTable.id, d.trackId),
      });
      if (!track) {
        res.status(400).json({ error: "trackId must reference a valid track" });
        return;
      }
    }

    const dueAt = d.dueAt ? new Date(d.dueAt) : null;
    if (d.dueAt && Number.isNaN(dueAt!.getTime())) {
      res.status(400).json({ error: "dueAt must be a valid date" });
      return;
    }

    const [assignment] = await db
      .insert(labAssignmentsTable)
      .values({
        labId: id,
        assignedBy: req.user!.userId,
        audienceType: d.audienceType,
        studentId: d.audienceType === "student" ? d.studentId : null,
        trackId: d.audienceType === "track" ? d.trackId : null,
        dueAt,
        note: d.note ?? null,
      })
      .returning();

    const targetIds = await resolveTargetStudentIds({
      audienceType: d.audienceType,
      studentId: d.studentId ?? null,
      trackId: d.trackId ?? null,
    });

    for (const studentId of targetIds) {
      await createNotification({
        userId: studentId,
        role: "student",
        title: "New lab assigned",
        message: `You have been assigned the lab "${lab.title}".`,
        type: "system",
        entityType: "lab",
        entityId: id,
        link: `/labs/${lab.slug}`,
        channels: ["in_app"],
      });
    }

    await createAuditLog({
      userId: req.user!.userId,
      action: "lab_builder.assignment.created",
      entityType: "lab_assignment",
      entityId: assignment.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: {
        labId: id,
        audienceType: d.audienceType,
        targeted: targetIds.length,
      },
    });

    res.status(201).json({
      assignment: {
        ...assignment,
        dueAt: assignment.dueAt ? assignment.dueAt.toISOString() : null,
        createdAt: assignment.createdAt.toISOString(),
      },
      notified: targetIds.length,
    });
  }
);

router.delete(
  "/lab-builder/assignments/:assignmentId",
  ...builderGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const assignmentId = parseId(req.params.assignmentId);
    if (assignmentId === null) {
      res.status(400).json({ error: "Invalid assignment id" });
      return;
    }
    const assignment = await db.query.labAssignmentsTable.findFirst({
      where: eq(labAssignmentsTable.id, assignmentId),
    });
    if (!assignment) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }
    const lab = await loadOwnedLab(req, res, assignment.labId);
    if (!lab) return;

    await db
      .delete(labAssignmentsTable)
      .where(eq(labAssignmentsTable.id, assignmentId));

    await createAuditLog({
      userId: req.user!.userId,
      action: "lab_builder.assignment.deleted",
      entityType: "lab_assignment",
      entityId: assignmentId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { labId: assignment.labId },
    });

    res.json({ ok: true });
  }
);

// ── Versions ──────────────────────────────────────────────────────────────────
router.get(
  "/lab-builder/labs/:id/versions",
  ...builderGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ error: "Invalid lab id" });
      return;
    }
    const lab = await loadOwnedLab(req, res, id);
    if (!lab) return;

    const versions = await db
      .select({
        id: labVersionsTable.id,
        labId: labVersionsTable.labId,
        version: labVersionsTable.version,
        note: labVersionsTable.note,
        createdBy: labVersionsTable.createdBy,
        createdAt: labVersionsTable.createdAt,
        createdByName: usersTable.fullName,
      })
      .from(labVersionsTable)
      .leftJoin(usersTable, eq(usersTable.id, labVersionsTable.createdBy))
      .where(eq(labVersionsTable.labId, id))
      .orderBy(desc(labVersionsTable.version));

    res.json({
      versions: versions.map((v) => ({
        ...v,
        createdAt: v.createdAt.toISOString(),
      })),
    });
  }
);

interface SnapshotModule {
  title: string;
  order: number;
  taskDescription: string;
  hint?: string | null;
  flag?: string | null;
  flagFormat?: string | null;
  solutionExplanation?: string | null;
  walkthrough?: string | null;
  points?: number;
  hints?: Array<{ order: number; content: string; penaltyPoints: number }>;
}

router.post(
  "/lab-builder/labs/:id/restore/:version",
  ...builderGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseId(req.params.id);
    const version = parseId(req.params.version);
    if (id === null || version === null) {
      res.status(400).json({ error: "Invalid lab id or version" });
      return;
    }
    const lab = await loadOwnedLab(req, res, id);
    if (!lab) return;

    const snapshotRow = await db.query.labVersionsTable.findFirst({
      where: and(
        eq(labVersionsTable.labId, id),
        eq(labVersionsTable.version, version)
      ),
    });
    if (!snapshotRow) {
      res.status(404).json({ error: "Version not found" });
      return;
    }

    const snapshot = snapshotRow.snapshot as {
      lab?: Partial<Lab>;
      modules?: SnapshotModule[];
    };
    const snapLab = snapshot.lab ?? {};
    const snapModules = snapshot.modules ?? [];

    const newVersion = lab.version + 1;

    // Apply lab fields from snapshot (content only — keep slug/status/author).
    const [updated] = await db
      .update(labsTable)
      .set({
        title: snapLab.title ?? lab.title,
        description: snapLab.description ?? lab.description,
        difficulty: snapLab.difficulty ?? lab.difficulty,
        type: snapLab.type ?? lab.type,
        tags: snapLab.tags ?? lab.tags,
        totalPoints: snapLab.totalPoints ?? lab.totalPoints,
        estimatedMinutes: snapLab.estimatedMinutes ?? lab.estimatedMinutes,
        trackId: snapLab.trackId ?? lab.trackId,
        learningObjectives:
          snapLab.learningObjectives ?? lab.learningObjectives,
        walkthrough:
          snapLab.walkthrough !== undefined
            ? snapLab.walkthrough
            : lab.walkthrough,
        version: newVersion,
      })
      .where(eq(labsTable.id, id))
      .returning();

    // Replace modules + hints with the snapshot content.
    const existingModules = await db
      .select({ id: labModulesTable.id })
      .from(labModulesTable)
      .where(eq(labModulesTable.labId, id));
    const existingModuleIds = existingModules.map((m) => m.id);
    if (existingModuleIds.length > 0) {
      await db
        .delete(labHintsTable)
        .where(inArray(labHintsTable.labModuleId, existingModuleIds));
      await db.delete(labModulesTable).where(eq(labModulesTable.labId, id));
    }

    for (const m of snapModules) {
      const [newModule] = await db
        .insert(labModulesTable)
        .values({
          labId: id,
          title: m.title,
          order: m.order,
          taskDescription: m.taskDescription,
          hint: m.hint ?? null,
          flag: m.flag ?? null,
          flagFormat: m.flagFormat ?? null,
          solutionExplanation: m.solutionExplanation ?? null,
          walkthrough: m.walkthrough ?? null,
          points: m.points ?? 10,
        })
        .returning();
      if (m.hints && m.hints.length > 0) {
        await db.insert(labHintsTable).values(
          m.hints.map((h) => ({
            labModuleId: newModule.id,
            order: h.order,
            content: h.content,
            penaltyPoints: h.penaltyPoints ?? 0,
          }))
        );
      }
    }

    // Snapshot the restored state as the new current version.
    const newSnapshot = await buildSnapshot(id);
    await db.insert(labVersionsTable).values({
      labId: id,
      version: newVersion,
      snapshot: newSnapshot,
      note: `Restored from v${version}`,
      createdBy: req.user!.userId,
    });

    await createAuditLog({
      userId: req.user!.userId,
      action: "lab_builder.lab.restored",
      entityType: "lab",
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { restoredFrom: version, newVersion },
    });

    res.json({ lab: serializeLab(updated) });
  }
);

// ── Analytics ─────────────────────────────────────────────────────────────────
router.get(
  "/lab-builder/labs/:id/analytics",
  ...builderGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ error: "Invalid lab id" });
      return;
    }
    const lab = await loadOwnedLab(req, res, id);
    if (!lab) return;

    const [assignments, attempts, completions, modules] = await Promise.all([
      db
        .select()
        .from(labAssignmentsTable)
        .where(eq(labAssignmentsTable.labId, id)),
      db.select().from(labAttemptsTable).where(eq(labAttemptsTable.labId, id)),
      db
        .select()
        .from(labModuleCompletionsTable)
        .where(eq(labModuleCompletionsTable.labId, id)),
      db
        .select()
        .from(labModulesTable)
        .where(eq(labModulesTable.labId, id))
        .orderBy(asc(labModulesTable.order)),
    ]);

    // Assigned: union of targeted student ids across all assignment rows.
    const assignedSet = new Set<number>();
    for (const a of assignments) {
      const ids = await resolveTargetStudentIds({
        audienceType: a.audienceType,
        studentId: a.studentId,
        trackId: a.trackId,
      });
      for (const sid of ids) assignedSet.add(sid);
    }
    const assigned = assignedSet.size;

    const startedSet = new Set(attempts.map((a) => a.userId));
    const started = startedSet.size;

    const completedAttempts = attempts.filter((a) => a.status === "completed");
    const completedSet = new Set(completedAttempts.map((a) => a.userId));
    const completed = completedSet.size;

    const completionRate =
      assigned > 0 ? Math.round((completed / assigned) * 100) : 0;

    // Average time (minutes) over completed attempts with both timestamps.
    let totalMinutes = 0;
    let timed = 0;
    for (const a of completedAttempts) {
      if (a.startedAt && a.completedAt) {
        const mins =
          (a.completedAt.getTime() - a.startedAt.getTime()) / 60000;
        if (mins >= 0) {
          totalMinutes += mins;
          timed += 1;
        }
      }
    }
    const avgTimeMinutes = timed > 0 ? Math.round(totalMinutes / timed) : 0;

    // Retry/failure counts.
    const totalAttempts = attempts.length;
    const retryCount = Math.max(0, totalAttempts - started);
    const failureCount = attempts.filter(
      (a) => a.status === "failed" || a.status === "abandoned"
    ).length;

    // Top students by best total score.
    const bestScore = new Map<number, number>();
    for (const a of attempts) {
      const prev = bestScore.get(a.userId) ?? 0;
      if (a.totalScore > prev) bestScore.set(a.userId, a.totalScore);
    }
    const topIds = [...bestScore.entries()]
      .sort((x, y) => y[1] - x[1])
      .slice(0, 10)
      .map(([uid]) => uid);
    const topUsers =
      topIds.length > 0
        ? await db
            .select({
              id: usersTable.id,
              fullName: usersTable.fullName,
              email: usersTable.email,
            })
            .from(usersTable)
            .where(inArray(usersTable.id, topIds))
        : [];
    const userMap = new Map(topUsers.map((u) => [u.id, u]));
    const topStudents = topIds.map((uid) => ({
      studentId: uid,
      fullName: userMap.get(uid)?.fullName ?? null,
      email: userMap.get(uid)?.email ?? null,
      score: bestScore.get(uid) ?? 0,
      completed: completedSet.has(uid),
    }));

    // Per-module completion distribution (how many distinct students solved each).
    const completionsByModule = new Map<number, Set<number>>();
    for (const c of completions) {
      const set = completionsByModule.get(c.labModuleId) ?? new Set<number>();
      set.add(c.userId);
      completionsByModule.set(c.labModuleId, set);
    }
    const moduleStats = modules.map((m) => ({
      moduleId: m.id,
      title: m.title,
      order: m.order,
      points: m.points,
      solvedBy: completionsByModule.get(m.id)?.size ?? 0,
    }));

    // Difficulty distribution: bucket completed attempts by score band.
    const difficultyDistribution = [
      { label: "0–25%", count: 0 },
      { label: "25–50%", count: 0 },
      { label: "50–75%", count: 0 },
      { label: "75–100%", count: 0 },
    ];
    const maxPoints = lab.totalPoints > 0 ? lab.totalPoints : 100;
    for (const a of attempts) {
      const pct = Math.min(100, (a.totalScore / maxPoints) * 100);
      const idx = Math.min(3, Math.floor(pct / 25));
      difficultyDistribution[idx].count += 1;
    }

    res.json({
      labId: id,
      title: lab.title,
      assigned,
      started,
      completed,
      completionRate,
      avgTimeMinutes,
      totalAttempts,
      retryCount,
      failureCount,
      topStudents,
      moduleStats,
      difficultyDistribution,
    });
  }
);

router.get(
  "/lab-builder/analytics/overview",
  ...builderGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const ownFilter = isAdmin(req)
      ? undefined
      : eq(labsTable.authorId, req.user!.userId);

    const labs = await db
      .select({
        id: labsTable.id,
        status: labsTable.status,
        difficulty: labsTable.difficulty,
        totalPoints: labsTable.totalPoints,
      })
      .from(labsTable)
      .where(ownFilter);

    const labIds = labs.map((l) => l.id);

    const byStatus: Record<string, number> = {
      draft: 0,
      published: 0,
      archived: 0,
    };
    const byDifficulty: Record<string, number> = {
      beginner: 0,
      intermediate: 0,
      advanced: 0,
    };
    for (const l of labs) {
      byStatus[l.status] = (byStatus[l.status] ?? 0) + 1;
      byDifficulty[l.difficulty] = (byDifficulty[l.difficulty] ?? 0) + 1;
    }

    let totalAssignments = 0;
    let aggregateCompletionRate = 0;
    let assignedTotal = 0;
    let completedTotal = 0;

    if (labIds.length > 0) {
      const [assignments, attempts] = await Promise.all([
        db
          .select()
          .from(labAssignmentsTable)
          .where(inArray(labAssignmentsTable.labId, labIds)),
        db
          .select({
            labId: labAttemptsTable.labId,
            userId: labAttemptsTable.userId,
            status: labAttemptsTable.status,
          })
          .from(labAttemptsTable)
          .where(inArray(labAttemptsTable.labId, labIds)),
      ]);

      totalAssignments = assignments.length;

      const assignedSet = new Set<string>();
      for (const a of assignments) {
        const ids = await resolveTargetStudentIds({
          audienceType: a.audienceType,
          studentId: a.studentId,
          trackId: a.trackId,
        });
        for (const sid of ids) assignedSet.add(`${a.labId}:${sid}`);
      }
      assignedTotal = assignedSet.size;

      const completedSet = new Set<string>();
      for (const a of attempts) {
        if (a.status === "completed") completedSet.add(`${a.labId}:${a.userId}`);
      }
      completedTotal = completedSet.size;

      aggregateCompletionRate =
        assignedTotal > 0
          ? Math.round((completedTotal / assignedTotal) * 100)
          : 0;
    }

    res.json({
      totalLabs: labs.length,
      byStatus,
      byDifficulty,
      totalAssignments,
      assignedStudents: assignedTotal,
      completedStudents: completedTotal,
      aggregateCompletionRate,
    });
  }
);

export default router;
