import { Router, type Response } from "express";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import {
  learningModulesTable,
  lessonsTable,
  tracksTable,
} from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";

const router = Router();

const adminGuards = [requireAuth, requireRole("admin")];

const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
const LESSON_TYPES = ["video", "quiz", "article"] as const;

const createCourseSchema = z.object({
  trackId: z.number().int().positive(),
  title: z.string().min(1).max(200),
  category: z.enum(DIFFICULTIES).optional(),
  description: z.string().max(5000).optional(),
  thumbnailUrl: z.string().max(1000).optional(),
  estimatedMinutes: z.number().int().min(1).max(100000).optional(),
  order: z.number().int().min(0).optional(),
  xpReward: z.number().int().min(0).max(100000).optional(),
});

const updateCourseSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  category: z.enum(DIFFICULTIES).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  description: z.string().max(5000).nullable().optional(),
  thumbnailUrl: z.string().max(1000).nullable().optional(),
  estimatedMinutes: z.number().int().min(1).max(100000).optional(),
  order: z.number().int().min(0).optional(),
  xpReward: z.number().int().min(0).max(100000).optional(),
});

const createLessonSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  order: z.number().int().min(0),
  type: z.enum(LESSON_TYPES).optional(),
  durationMinutes: z.number().int().min(0).max(100000).optional(),
  isFree: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});

const updateLessonSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).optional(),
  order: z.number().int().min(0).optional(),
  type: z.enum(LESSON_TYPES).optional(),
  durationMinutes: z.number().int().min(0).max(100000).nullable().optional(),
  isFree: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});

function ip(req: AuthRequest): string | undefined {
  return req.ip;
}

async function countLessons(moduleId: number): Promise<number> {
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(lessonsTable)
    .where(eq(lessonsTable.moduleId, moduleId));
  return row?.value ?? 0;
}

// GET /admin/courses?track=&status= — list learning modules
router.get(
  "/admin/courses",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const trackSlug =
      typeof req.query.track === "string" ? req.query.track.trim() : "";
    const status =
      typeof req.query.status === "string" ? req.query.status.trim() : "";

    const conditions = [];
    if (trackSlug) {
      const track = await db.query.tracksTable.findFirst({
        where: eq(tracksTable.slug, trackSlug),
      });
      if (!track) {
        res.json({ courses: [] });
        return;
      }
      conditions.push(eq(learningModulesTable.trackId, track.id));
    }
    if (status === "published") {
      conditions.push(eq(learningModulesTable.isPublished, true));
    } else if (status === "draft" || status === "archived") {
      conditions.push(eq(learningModulesTable.isPublished, false));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: learningModulesTable.id,
        trackId: learningModulesTable.trackId,
        title: learningModulesTable.title,
        description: learningModulesTable.description,
        category: learningModulesTable.category,
        difficulty: learningModulesTable.difficulty,
        thumbnailUrl: learningModulesTable.thumbnailUrl,
        xpReward: learningModulesTable.xpReward,
        estimatedMinutes: learningModulesTable.estimatedMinutes,
        order: learningModulesTable.order,
        lessonCount: learningModulesTable.lessonCount,
        isPublished: learningModulesTable.isPublished,
        createdAt: learningModulesTable.createdAt,
        updatedAt: learningModulesTable.updatedAt,
        trackName: tracksTable.name,
        trackSlug: tracksTable.slug,
      })
      .from(learningModulesTable)
      .leftJoin(tracksTable, eq(tracksTable.id, learningModulesTable.trackId))
      .where(where)
      .orderBy(asc(learningModulesTable.order), desc(learningModulesTable.createdAt));

    res.json({
      courses: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  }
);

// POST /admin/courses — create a learning module
router.post(
  "/admin/courses",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const parsed = createCourseSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const data = parsed.data;

    const track = await db.query.tracksTable.findFirst({
      where: eq(tracksTable.id, data.trackId),
    });
    if (!track) {
      res.status(400).json({ error: "trackId must reference an existing track" });
      return;
    }

    const [course] = await db
      .insert(learningModulesTable)
      .values({
        trackId: data.trackId,
        title: data.title,
        description: data.description ?? null,
        category: data.category ?? null,
        difficulty: data.category ?? "beginner",
        thumbnailUrl: data.thumbnailUrl ?? null,
        estimatedMinutes: data.estimatedMinutes ?? 60,
        order: data.order ?? 0,
        ...(data.xpReward !== undefined ? { xpReward: data.xpReward } : {}),
        isPublished: false,
      })
      .returning();

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.course.created",
      entityType: "learning_module",
      entityId: course.id,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { title: data.title, trackId: data.trackId },
    });

    res.status(201).json({
      course: {
        ...course,
        createdAt: course.createdAt.toISOString(),
        updatedAt: course.updatedAt.toISOString(),
      },
    });
  }
);

// GET /admin/courses/:id — module + its lessons
router.get(
  "/admin/courses/:id",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid course id" });
      return;
    }
    const course = await db.query.learningModulesTable.findFirst({
      where: eq(learningModulesTable.id, id),
    });
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }
    const lessons = await db
      .select()
      .from(lessonsTable)
      .where(eq(lessonsTable.moduleId, id))
      .orderBy(asc(lessonsTable.order));

    res.json({
      course: {
        ...course,
        createdAt: course.createdAt.toISOString(),
        updatedAt: course.updatedAt.toISOString(),
      },
      lessons: lessons.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
        updatedAt: l.updatedAt.toISOString(),
      })),
    });
  }
);

// PATCH /admin/courses/:id — edit fields
router.patch(
  "/admin/courses/:id",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid course id" });
      return;
    }
    const parsed = updateCourseSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const course = await db.query.learningModulesTable.findFirst({
      where: eq(learningModulesTable.id, id),
    });
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }
    const d = parsed.data;
    const [updated] = await db
      .update(learningModulesTable)
      .set({
        ...(d.title !== undefined ? { title: d.title } : {}),
        ...(d.category !== undefined ? { category: d.category } : {}),
        ...(d.difficulty !== undefined
          ? { difficulty: d.difficulty }
          : d.category !== undefined
          ? { difficulty: d.category }
          : {}),
        ...(d.description !== undefined ? { description: d.description } : {}),
        ...(d.thumbnailUrl !== undefined ? { thumbnailUrl: d.thumbnailUrl } : {}),
        ...(d.estimatedMinutes !== undefined
          ? { estimatedMinutes: d.estimatedMinutes }
          : {}),
        ...(d.order !== undefined ? { order: d.order } : {}),
        ...(d.xpReward !== undefined ? { xpReward: d.xpReward } : {}),
      })
      .where(eq(learningModulesTable.id, id))
      .returning();

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.course.updated",
      entityType: "learning_module",
      entityId: id,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { ...d },
    });

    res.json({
      course: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  }
);

// POST /admin/courses/:id/publish — set isPublished true
router.post(
  "/admin/courses/:id/publish",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    await setPublished(req, res, true);
  }
);

// POST /admin/courses/:id/archive — set isPublished false
router.post(
  "/admin/courses/:id/archive",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    await setPublished(req, res, false);
  }
);

async function setPublished(
  req: AuthRequest,
  res: Response,
  isPublished: boolean
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid course id" });
    return;
  }
  const course = await db.query.learningModulesTable.findFirst({
    where: eq(learningModulesTable.id, id),
  });
  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }
  const [updated] = await db
    .update(learningModulesTable)
    .set({ isPublished })
    .where(eq(learningModulesTable.id, id))
    .returning();

  await createAuditLog({
    userId: req.user.userId,
    action: isPublished ? "admin.course.published" : "admin.course.archived",
    entityType: "learning_module",
    entityId: id,
    ipAddress: ip(req),
    userAgent: req.headers["user-agent"],
  });

  res.json({
    course: {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}

// POST /admin/courses/:id/lessons — create a lesson
router.post(
  "/admin/courses/:id/lessons",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid course id" });
      return;
    }
    const parsed = createLessonSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const course = await db.query.learningModulesTable.findFirst({
      where: eq(learningModulesTable.id, id),
    });
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }
    const d = parsed.data;
    const [lesson] = await db
      .insert(lessonsTable)
      .values({
        moduleId: id,
        title: d.title,
        slug: d.slug,
        order: d.order,
        type: d.type ?? "video",
        durationMinutes: d.durationMinutes ?? null,
        isFree: d.isFree ?? false,
        isPublished: d.isPublished ?? false,
      })
      .returning();

    await db
      .update(learningModulesTable)
      .set({ lessonCount: await countLessons(id) })
      .where(eq(learningModulesTable.id, id));

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.lesson.created",
      entityType: "lesson",
      entityId: lesson.id,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { moduleId: id, title: d.title },
    });

    res.status(201).json({
      lesson: {
        ...lesson,
        createdAt: lesson.createdAt.toISOString(),
        updatedAt: lesson.updatedAt.toISOString(),
      },
    });
  }
);

// PATCH /admin/lessons/:lessonId — edit lesson
router.patch(
  "/admin/lessons/:lessonId",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const lessonId = parseInt(String(req.params.lessonId), 10);
    if (isNaN(lessonId)) {
      res.status(400).json({ error: "Invalid lesson id" });
      return;
    }
    const parsed = updateLessonSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const lesson = await db.query.lessonsTable.findFirst({
      where: eq(lessonsTable.id, lessonId),
    });
    if (!lesson) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }
    const d = parsed.data;
    const [updated] = await db
      .update(lessonsTable)
      .set({
        ...(d.title !== undefined ? { title: d.title } : {}),
        ...(d.slug !== undefined ? { slug: d.slug } : {}),
        ...(d.order !== undefined ? { order: d.order } : {}),
        ...(d.type !== undefined ? { type: d.type } : {}),
        ...(d.durationMinutes !== undefined
          ? { durationMinutes: d.durationMinutes }
          : {}),
        ...(d.isFree !== undefined ? { isFree: d.isFree } : {}),
        ...(d.isPublished !== undefined ? { isPublished: d.isPublished } : {}),
      })
      .where(eq(lessonsTable.id, lessonId))
      .returning();

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.lesson.updated",
      entityType: "lesson",
      entityId: lessonId,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { ...d },
    });

    res.json({
      lesson: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  }
);

// DELETE /admin/lessons/:lessonId — delete lesson
router.delete(
  "/admin/lessons/:lessonId",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const lessonId = parseInt(String(req.params.lessonId), 10);
    if (isNaN(lessonId)) {
      res.status(400).json({ error: "Invalid lesson id" });
      return;
    }
    const lesson = await db.query.lessonsTable.findFirst({
      where: eq(lessonsTable.id, lessonId),
    });
    if (!lesson) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }
    const moduleId = lesson.moduleId;
    await db.delete(lessonsTable).where(eq(lessonsTable.id, lessonId));

    await db
      .update(learningModulesTable)
      .set({ lessonCount: await countLessons(moduleId) })
      .where(eq(learningModulesTable.id, moduleId));

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.lesson.deleted",
      entityType: "lesson",
      entityId: lessonId,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { moduleId },
    });

    res.json({ ok: true });
  }
);

export default router;
