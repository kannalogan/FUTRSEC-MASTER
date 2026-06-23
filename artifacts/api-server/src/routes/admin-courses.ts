import { Router, type Response } from "express";
import { eq, and, desc, asc, sql, inArray } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import {
  learningModulesTable,
  lessonsTable,
  tracksTable,
  lessonVideosTable,
  lessonNotesTable,
  lessonQuizzesTable,
  lessonQuizQuestionsTable,
  lessonResourcesTable,
  assessmentsTable,
  assessmentQuestionsTable,
  assessmentOptionsTable,
  questionBankTable,
  questionBankOptionsTable,
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

// ─── Lesson content authoring (video / article / quiz / resources) ──────────

const VIDEO_PROVIDERS = ["youtube", "vimeo", "bunny", "s3", "url"] as const;

// Best-effort provider inference from a URL host when the author didn't pick one.
function deriveProvider(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("vimeo.com")) return "vimeo";
  if (u.includes("bunny") || u.includes("b-cdn.net")) return "bunny";
  if (u.includes("amazonaws.com") || u.includes("s3.")) return "s3";
  return "url";
}

const RESOURCE_TYPES = ["link", "pdf", "file", "code", "tool"] as const;
// quiz question types we can render/grade in the lesson player (choice-based)
const QUIZ_TYPES = ["mcq", "multi_select", "true_false", "scenario"] as const;
type QuizType = (typeof QUIZ_TYPES)[number];

const videoSchema = z.object({
  title: z.string().max(300).nullable().optional(),
  description: z.string().max(10000).nullable().optional(),
  provider: z.enum(VIDEO_PROVIDERS).optional(),
  videoUrl: z.string().url().max(2000),
  thumbnailUrl: z.string().url().max(2000).nullable().optional(),
  transcript: z.string().max(200000).nullable().optional(),
  durationSeconds: z.number().int().min(0).max(360000).nullable().optional(),
});

const articleSchema = z.object({
  content: z.string().min(1).max(500000),
});

const quizMetaSchema = z.object({
  title: z.string().min(1).max(300),
  passingScore: z.number().int().min(0).max(100).optional(),
});

const quizFromAssessmentSchema = z.object({
  assessmentId: z.number().int().positive(),
  passingScore: z.number().int().min(0).max(100).optional(),
});

const quizFromBankSchema = z.object({
  bankQuestionIds: z.array(z.number().int().positive()).min(1).max(200),
  passingScore: z.number().int().min(0).max(100).optional(),
});

const resourceSchema = z.object({
  title: z.string().min(1).max(300),
  url: z.string().url().max(2000),
  type: z.enum(RESOURCE_TYPES).optional(),
});

async function requireLesson(
  res: Response,
  lessonId: number,
): Promise<typeof lessonsTable.$inferSelect | null> {
  if (isNaN(lessonId)) {
    res.status(400).json({ error: "Invalid lesson id" });
    return null;
  }
  const lesson = await db.query.lessonsTable.findFirst({
    where: eq(lessonsTable.id, lessonId),
  });
  if (!lesson) {
    res.status(404).json({ error: "Lesson not found" });
    return null;
  }
  return lesson;
}

// Maps an "answer set" (option rows with correctness) into the lesson_quiz
// representation: options as a string[] and correctAnswers as 0-based indices.
function toQuizQuestionRow(
  quizId: number,
  order: number,
  question: string,
  rawType: string,
  options: { text: string; isCorrect: boolean }[],
  explanation: string | null,
  points: number,
): typeof lessonQuizQuestionsTable.$inferInsert {
  const type: QuizType = (QUIZ_TYPES as readonly string[]).includes(rawType)
    ? (rawType as QuizType)
    : "mcq";
  return {
    quizId,
    question,
    type,
    options: options.map((o) => o.text),
    correctAnswers: options
      .map((o, idx) => (o.isCorrect ? idx : -1))
      .filter((idx) => idx >= 0),
    explanation,
    points: points > 0 ? points : 1,
    order,
  };
}

// Ensures a single lesson_quizzes row exists for the lesson (creates if absent).
// Tx-scoped so callers can run it inside a transaction.
async function ensureQuizTx(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  lessonId: number,
  defaults: { title: string; passingScore?: number },
): Promise<typeof lessonQuizzesTable.$inferSelect> {
  const [existing] = await tx
    .select()
    .from(lessonQuizzesTable)
    .where(eq(lessonQuizzesTable.lessonId, lessonId))
    .limit(1);
  if (existing) return existing;
  const [created] = await tx
    .insert(lessonQuizzesTable)
    .values({
      lessonId,
      title: defaults.title,
      passingScore: defaults.passingScore ?? 70,
    })
    .returning();
  return created;
}

// GET /admin/lessons/:lessonId/content — full authoring payload for a lesson
router.get(
  "/admin/lessons/:lessonId/content",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const lessonId = parseInt(String(req.params.lessonId), 10);
    const lesson = await requireLesson(res, lessonId);
    if (!lesson) return;

    const [video] = await db
      .select()
      .from(lessonVideosTable)
      .where(eq(lessonVideosTable.lessonId, lessonId))
      .limit(1);
    const [article] = await db
      .select()
      .from(lessonNotesTable)
      .where(eq(lessonNotesTable.lessonId, lessonId))
      .limit(1);
    const resources = await db
      .select()
      .from(lessonResourcesTable)
      .where(eq(lessonResourcesTable.lessonId, lessonId))
      .orderBy(asc(lessonResourcesTable.order));

    const [quiz] = await db
      .select()
      .from(lessonQuizzesTable)
      .where(eq(lessonQuizzesTable.lessonId, lessonId))
      .limit(1);
    let quizPayload: unknown = null;
    if (quiz) {
      const questions = await db
        .select()
        .from(lessonQuizQuestionsTable)
        .where(eq(lessonQuizQuestionsTable.quizId, quiz.id))
        .orderBy(asc(lessonQuizQuestionsTable.order));
      quizPayload = { ...quiz, questions };
    }

    res.json({
      lesson,
      video: video ?? null,
      article: article ?? null,
      quiz: quizPayload,
      resources,
    });
  },
);

// PUT /admin/lessons/:lessonId/video — upsert the video block
router.put(
  "/admin/lessons/:lessonId/video",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const lessonId = parseInt(String(req.params.lessonId), 10);
    const lesson = await requireLesson(res, lessonId);
    if (!lesson) return;
    const parsed = videoSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const d = parsed.data;
    const values = {
      lessonId,
      title: d.title ?? null,
      description: d.description ?? null,
      provider: d.provider ?? deriveProvider(d.videoUrl),
      videoUrl: d.videoUrl,
      thumbnailUrl: d.thumbnailUrl ?? null,
      transcript: d.transcript ?? null,
      durationSeconds: d.durationSeconds ?? null,
    };
    const existing = await db.query.lessonVideosTable.findFirst({
      where: eq(lessonVideosTable.lessonId, lessonId),
    });
    const [row] = existing
      ? await db
          .update(lessonVideosTable)
          .set(values)
          .where(eq(lessonVideosTable.id, existing.id))
          .returning()
      : await db.insert(lessonVideosTable).values(values).returning();

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.lesson.video_saved",
      entityType: "lesson",
      entityId: lessonId,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
    });
    res.json({ video: row });
  },
);

// PUT /admin/lessons/:lessonId/article — upsert the article block
router.put(
  "/admin/lessons/:lessonId/article",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const lessonId = parseInt(String(req.params.lessonId), 10);
    const lesson = await requireLesson(res, lessonId);
    if (!lesson) return;
    const parsed = articleSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const existing = await db.query.lessonNotesTable.findFirst({
      where: eq(lessonNotesTable.lessonId, lessonId),
    });
    const [row] = existing
      ? await db
          .update(lessonNotesTable)
          .set({ content: parsed.data.content })
          .where(eq(lessonNotesTable.id, existing.id))
          .returning()
      : await db
          .insert(lessonNotesTable)
          .values({ lessonId, content: parsed.data.content })
          .returning();

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.lesson.article_saved",
      entityType: "lesson",
      entityId: lessonId,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
    });
    res.json({ article: row });
  },
);

// PUT /admin/lessons/:lessonId/quiz — upsert quiz meta (title, passing score)
router.put(
  "/admin/lessons/:lessonId/quiz",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const lessonId = parseInt(String(req.params.lessonId), 10);
    const lesson = await requireLesson(res, lessonId);
    if (!lesson) return;
    const parsed = quizMetaSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const d = parsed.data;
    const existing = await db.query.lessonQuizzesTable.findFirst({
      where: eq(lessonQuizzesTable.lessonId, lessonId),
    });
    const [row] = existing
      ? await db
          .update(lessonQuizzesTable)
          .set({
            title: d.title,
            ...(d.passingScore !== undefined
              ? { passingScore: d.passingScore }
              : {}),
          })
          .where(eq(lessonQuizzesTable.id, existing.id))
          .returning()
      : await db
          .insert(lessonQuizzesTable)
          .values({
            lessonId,
            title: d.title,
            passingScore: d.passingScore ?? 70,
          })
          .returning();

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.lesson.quiz_saved",
      entityType: "lesson",
      entityId: lessonId,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
    });
    res.json({ quiz: row });
  },
);

// POST /admin/lessons/:lessonId/quiz/from-assessment — copy assessment questions
router.post(
  "/admin/lessons/:lessonId/quiz/from-assessment",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const lessonId = parseInt(String(req.params.lessonId), 10);
    const lesson = await requireLesson(res, lessonId);
    if (!lesson) return;
    const parsed = quizFromAssessmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const assessment = await db.query.assessmentsTable.findFirst({
      where: eq(assessmentsTable.id, parsed.data.assessmentId),
    });
    if (!assessment) {
      res.status(404).json({ error: "Assessment not found" });
      return;
    }

    const questions = await db
      .select()
      .from(assessmentQuestionsTable)
      .where(eq(assessmentQuestionsTable.assessmentId, assessment.id))
      .orderBy(asc(assessmentQuestionsTable.order));
    if (questions.length === 0) {
      res
        .status(400)
        .json({ error: "That assessment has no questions to copy." });
      return;
    }
    const options = await db
      .select()
      .from(assessmentOptionsTable)
      .where(
        inArray(
          assessmentOptionsTable.questionId,
          questions.map((q) => q.id),
        ),
      )
      .orderBy(asc(assessmentOptionsTable.order));
    const optsByQ = new Map<number, typeof options>();
    for (const o of options) {
      const list = optsByQ.get(o.questionId) ?? [];
      list.push(o);
      optsByQ.set(o.questionId, list);
    }

    let copied = 0;
    let skipped = 0;
    await db.transaction(async (tx) => {
      const quiz = await ensureQuizTx(tx, lessonId, {
        title: assessment.title,
        passingScore: parsed.data.passingScore,
      });
      await tx
        .delete(lessonQuizQuestionsTable)
        .where(eq(lessonQuizQuestionsTable.quizId, quiz.id));
      let order = 0;
      const rows: (typeof lessonQuizQuestionsTable.$inferInsert)[] = [];
      for (const q of questions) {
        if (!(QUIZ_TYPES as readonly string[]).includes(q.questionType)) {
          skipped++;
          continue;
        }
        const opts = (optsByQ.get(q.id) ?? []).map((o) => ({
          text: o.optionText,
          isCorrect: o.isCorrect,
        }));
        if (opts.length === 0) {
          skipped++;
          continue;
        }
        rows.push(
          toQuizQuestionRow(
            quiz.id,
            order++,
            q.questionText,
            q.questionType,
            opts,
            q.explanation ?? null,
            q.points,
          ),
        );
      }
      if (rows.length > 0) {
        await tx.insert(lessonQuizQuestionsTable).values(rows);
      }
      copied = rows.length;
      await tx
        .update(lessonQuizzesTable)
        .set({
          sourceType: "assessment",
          sourceAssessmentId: assessment.id,
          ...(parsed.data.passingScore !== undefined
            ? { passingScore: parsed.data.passingScore }
            : {}),
        })
        .where(eq(lessonQuizzesTable.id, quiz.id));
    });

    if (copied === 0) {
      res.status(400).json({
        error:
          "No questions could be copied — the assessment has no choice-based questions with options.",
        skipped,
      });
      return;
    }
    await createAuditLog({
      userId: req.user.userId,
      action: "admin.lesson.quiz_from_assessment",
      entityType: "lesson",
      entityId: lessonId,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { assessmentId: assessment.id, copied, skipped },
    });
    res.status(201).json({ copied, skipped });
  },
);

// POST /admin/lessons/:lessonId/quiz/from-bank — copy approved bank questions
router.post(
  "/admin/lessons/:lessonId/quiz/from-bank",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const lessonId = parseInt(String(req.params.lessonId), 10);
    const lesson = await requireLesson(res, lessonId);
    if (!lesson) return;
    const parsed = quizFromBankSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const ids = [...new Set(parsed.data.bankQuestionIds)];
    const bankRows = await db
      .select()
      .from(questionBankTable)
      .where(inArray(questionBankTable.id, ids));
    const byId = new Map(bankRows.map((r) => [r.id, r]));
    const usable = ids.filter(
      (id) =>
        byId.get(id)?.status === "approved" &&
        (QUIZ_TYPES as readonly string[]).includes(
          byId.get(id)!.questionType,
        ),
    );
    const skipped = ids.filter((id) => !usable.includes(id));
    if (usable.length === 0) {
      res.status(400).json({
        error:
          "No questions could be added — they must be approved and choice-based (mcq/multi-select/true-false/scenario).",
        skipped,
      });
      return;
    }
    const bankOpts = await db
      .select()
      .from(questionBankOptionsTable)
      .where(inArray(questionBankOptionsTable.questionId, usable))
      .orderBy(asc(questionBankOptionsTable.order));
    const optsByQ = new Map<number, typeof bankOpts>();
    for (const o of bankOpts) {
      const list = optsByQ.get(o.questionId) ?? [];
      list.push(o);
      optsByQ.set(o.questionId, list);
    }

    let copied = 0;
    const noOptionIds: number[] = [];
    await db.transaction(async (tx) => {
      const quiz = await ensureQuizTx(tx, lessonId, {
        title: lesson.title,
        passingScore: parsed.data.passingScore,
      });
      const [maxRow] = await tx
        .select({
          value: sql<number>`coalesce(max(${lessonQuizQuestionsTable.order}), -1)`,
        })
        .from(lessonQuizQuestionsTable)
        .where(eq(lessonQuizQuestionsTable.quizId, quiz.id));
      let order = (maxRow?.value ?? -1) + 1;
      const rows: (typeof lessonQuizQuestionsTable.$inferInsert)[] = [];
      // Track only the IDs that actually get inserted so usageCount stays accurate.
      const insertedIds: number[] = [];
      for (const id of usable) {
        const bank = byId.get(id)!;
        const opts = (optsByQ.get(id) ?? []).map((o) => ({
          text: o.optionText,
          isCorrect: o.isCorrect,
        }));
        if (opts.length === 0) {
          noOptionIds.push(id);
          continue;
        }
        rows.push(
          toQuizQuestionRow(
            quiz.id,
            order++,
            bank.questionText,
            bank.questionType,
            opts,
            bank.explanation ?? null,
            bank.marks ?? 1,
          ),
        );
        insertedIds.push(id);
      }
      if (rows.length > 0) {
        await tx.insert(lessonQuizQuestionsTable).values(rows);
        await tx
          .update(questionBankTable)
          .set({ usageCount: sql`${questionBankTable.usageCount} + 1` })
          .where(inArray(questionBankTable.id, insertedIds));
      }
      copied = rows.length;
      await tx
        .update(lessonQuizzesTable)
        .set({
          sourceType: "question_bank",
          // Clear any prior assessment provenance — source is now the bank.
          sourceAssessmentId: null,
          ...(parsed.data.passingScore !== undefined
            ? { passingScore: parsed.data.passingScore }
            : {}),
        })
        .where(eq(lessonQuizzesTable.id, quiz.id));
    });

    // Skipped = validation-rejected (not approved / not choice type) + had no options.
    const allSkipped = [...new Set([...skipped, ...noOptionIds])];
    await createAuditLog({
      userId: req.user.userId,
      action: "admin.lesson.quiz_from_bank",
      entityType: "lesson",
      entityId: lessonId,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { copied, skipped: allSkipped },
    });
    res.status(201).json({ copied, skipped: allSkipped });
  },
);

// DELETE /admin/lessons/:lessonId/quiz/questions/:questionId — remove one
router.delete(
  "/admin/lessons/:lessonId/quiz/questions/:questionId",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const lessonId = parseInt(String(req.params.lessonId), 10);
    const lesson = await requireLesson(res, lessonId);
    if (!lesson) return;
    const questionId = parseInt(String(req.params.questionId), 10);
    if (isNaN(questionId)) {
      res.status(400).json({ error: "Invalid question id" });
      return;
    }
    const quiz = await db.query.lessonQuizzesTable.findFirst({
      where: eq(lessonQuizzesTable.lessonId, lessonId),
    });
    if (!quiz) {
      res.status(404).json({ error: "Quiz not found" });
      return;
    }
    await db
      .delete(lessonQuizQuestionsTable)
      .where(
        and(
          eq(lessonQuizQuestionsTable.id, questionId),
          eq(lessonQuizQuestionsTable.quizId, quiz.id),
        ),
      );
    await createAuditLog({
      userId: req.user.userId,
      action: "admin.lesson.quiz_question_deleted",
      entityType: "lesson",
      entityId: lessonId,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { quizId: quiz.id, questionId },
    });
    res.json({ ok: true });
  },
);

// POST /admin/lessons/:lessonId/resources — add an attachment/resource
router.post(
  "/admin/lessons/:lessonId/resources",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const lessonId = parseInt(String(req.params.lessonId), 10);
    const lesson = await requireLesson(res, lessonId);
    if (!lesson) return;
    const parsed = resourceSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const [maxRow] = await db
      .select({
        value: sql<number>`coalesce(max(${lessonResourcesTable.order}), -1)`,
      })
      .from(lessonResourcesTable)
      .where(eq(lessonResourcesTable.lessonId, lessonId));
    const [row] = await db
      .insert(lessonResourcesTable)
      .values({
        lessonId,
        title: parsed.data.title,
        url: parsed.data.url,
        type: parsed.data.type ?? "link",
        order: (maxRow?.value ?? -1) + 1,
      })
      .returning();
    await createAuditLog({
      userId: req.user.userId,
      action: "admin.lesson.resource_added",
      entityType: "lesson",
      entityId: lessonId,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { resourceId: row.id, type: row.type },
    });
    res.status(201).json({ resource: row });
  },
);

// DELETE /admin/lessons/:lessonId/resources/:resourceId
router.delete(
  "/admin/lessons/:lessonId/resources/:resourceId",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const lessonId = parseInt(String(req.params.lessonId), 10);
    const lesson = await requireLesson(res, lessonId);
    if (!lesson) return;
    const resourceId = parseInt(String(req.params.resourceId), 10);
    if (isNaN(resourceId)) {
      res.status(400).json({ error: "Invalid resource id" });
      return;
    }
    await db
      .delete(lessonResourcesTable)
      .where(
        and(
          eq(lessonResourcesTable.id, resourceId),
          eq(lessonResourcesTable.lessonId, lessonId),
        ),
      );
    await createAuditLog({
      userId: req.user.userId,
      action: "admin.lesson.resource_deleted",
      entityType: "lesson",
      entityId: lessonId,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { resourceId },
    });
    res.json({ ok: true });
  },
);

export default router;
