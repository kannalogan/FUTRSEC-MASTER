import { Router } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable,
  tracksTable,
  learningModulesTable,
  lessonsTable,
  lessonProgressTable,
  moduleEnrollmentsTable,
  lessonBookmarksTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();

async function resolveTrack(user: { selectedTrackId: number | null } | undefined, queryTrackSlug?: string) {
  if (queryTrackSlug) {
    return db.query.tracksTable.findFirst({ where: eq(tracksTable.slug, queryTrackSlug) }) ?? null;
  }
  if (user?.selectedTrackId) {
    return db.query.tracksTable.findFirst({ where: eq(tracksTable.id, user.selectedTrackId) }) ?? null;
  }
  return null;
}

router.get("/learning/modules", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
  const track = await resolveTrack(user, req.query.track as string | undefined);

  let modules: any[] = [];
  if (track) {
    modules = await db.select().from(learningModulesTable)
      .where(and(eq(learningModulesTable.trackId, track.id), eq(learningModulesTable.isPublished, true)))
      .orderBy(learningModulesTable.order);
  }

  const enrollments = modules.length > 0
    ? await db.select().from(moduleEnrollmentsTable)
        .where(and(eq(moduleEnrollmentsTable.userId, userId), inArray(moduleEnrollmentsTable.moduleId, modules.map((m) => m.id))))
    : [];

  const enrollmentMap = new Map(enrollments.map((e) => [e.moduleId, e]));

  res.json({
    track,
    modules: modules.map((m) => ({
      ...m,
      enrollment: enrollmentMap.get(m.id) ?? null,
      isEnrolled: enrollmentMap.has(m.id),
    })),
  });
});

router.get("/learning/modules/:moduleId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;
  const moduleId = parseInt(String(req.params.moduleId), 10);
  if (isNaN(moduleId)) { res.status(400).json({ error: "Invalid moduleId" }); return; }

  const module = await db.query.learningModulesTable.findFirst({ where: eq(learningModulesTable.id, moduleId) });
  if (!module) { res.status(404).json({ error: "Module not found" }); return; }

  const lessons = await db.select().from(lessonsTable)
    .where(and(eq(lessonsTable.moduleId, moduleId), eq(lessonsTable.isPublished, true)))
    .orderBy(lessonsTable.order);

  const progress = await db.select().from(lessonProgressTable)
    .where(and(eq(lessonProgressTable.userId, userId), eq(lessonProgressTable.moduleId, moduleId)));

  const progressSet = new Set(progress.map((p) => p.lessonId));

  const bookmarks = lessons.length > 0
    ? await db.select().from(lessonBookmarksTable)
        .where(and(eq(lessonBookmarksTable.userId, userId), inArray(lessonBookmarksTable.lessonId, lessons.map((l) => l.id))))
    : [];
  const bookmarkSet = new Set(bookmarks.map((b) => b.lessonId));

  const lessonsWithStatus = lessons.map((l) => ({
    ...l,
    completed: progressSet.has(l.id),
    bookmarked: bookmarkSet.has(l.id),
  }));

  const completedCount = lessonsWithStatus.filter((l) => l.completed).length;
  const progressPercent = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  const enrollment = await db.query.moduleEnrollmentsTable.findFirst({
    where: and(eq(moduleEnrollmentsTable.userId, userId), eq(moduleEnrollmentsTable.moduleId, moduleId)),
  });

  res.json({ module, lessons: lessonsWithStatus, progressPercent, completedCount, enrollment: enrollment ?? null });
});

router.post("/learning/modules/:moduleId/enroll", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;
  const moduleId = parseInt(String(req.params.moduleId), 10);
  if (isNaN(moduleId)) { res.status(400).json({ error: "Invalid moduleId" }); return; }

  const module = await db.query.learningModulesTable.findFirst({ where: eq(learningModulesTable.id, moduleId) });
  if (!module) { res.status(404).json({ error: "Module not found" }); return; }

  const existing = await db.query.moduleEnrollmentsTable.findFirst({
    where: and(eq(moduleEnrollmentsTable.userId, userId), eq(moduleEnrollmentsTable.moduleId, moduleId)),
  });
  if (existing) { res.json({ enrollment: existing, alreadyEnrolled: true }); return; }

  const [enrollment] = await db.insert(moduleEnrollmentsTable).values({
    userId,
    moduleId,
    trackId: module.trackId,
    progressPercent: 0,
  }).returning();

  res.status(201).json({ enrollment, alreadyEnrolled: false });
});

router.post("/learning/lessons/:lessonId/complete", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;
  const lessonId = parseInt(String(req.params.lessonId), 10);
  if (isNaN(lessonId)) { res.status(400).json({ error: "Invalid lessonId" }); return; }

  const lesson = await db.query.lessonsTable.findFirst({ where: eq(lessonsTable.id, lessonId) });
  if (!lesson) { res.status(404).json({ error: "Lesson not found" }); return; }

  const existing = await db.query.lessonProgressTable.findFirst({
    where: and(eq(lessonProgressTable.userId, userId), eq(lessonProgressTable.lessonId, lessonId)),
  });
  if (existing) { res.json({ progress: existing, alreadyCompleted: true }); return; }

  const [progress] = await db.insert(lessonProgressTable).values({
    userId,
    lessonId,
    moduleId: lesson.moduleId,
    timeSpentSeconds: req.body.timeSpentSeconds ?? 0,
  }).returning();

  const allLessons = await db.select({ id: lessonsTable.id }).from(lessonsTable)
    .where(and(eq(lessonsTable.moduleId, lesson.moduleId), eq(lessonsTable.isPublished, true)));
  const allProgress = await db.select().from(lessonProgressTable)
    .where(and(eq(lessonProgressTable.userId, userId), eq(lessonProgressTable.moduleId, lesson.moduleId)));
  const pct = allLessons.length > 0 ? Math.round((allProgress.length / allLessons.length) * 100) : 0;

  const existingEnrollment = await db.query.moduleEnrollmentsTable.findFirst({
    where: and(eq(moduleEnrollmentsTable.userId, userId), eq(moduleEnrollmentsTable.moduleId, lesson.moduleId)),
  });

  const module = await db.query.learningModulesTable.findFirst({ where: eq(learningModulesTable.id, lesson.moduleId) });
  if (!existingEnrollment) {
    await db.insert(moduleEnrollmentsTable).values({
      userId,
      moduleId: lesson.moduleId,
      trackId: module?.trackId ?? 0,
      progressPercent: pct,
    });
  } else {
    await db.update(moduleEnrollmentsTable).set({
      progressPercent: pct,
      ...(pct === 100 ? { completedAt: new Date() } : {}),
    }).where(and(eq(moduleEnrollmentsTable.userId, userId), eq(moduleEnrollmentsTable.moduleId, lesson.moduleId)));
  }

  res.status(201).json({ progress, alreadyCompleted: false, moduleProgress: pct });
});

router.post("/learning/lessons/:lessonId/bookmark", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;
  const lessonId = parseInt(String(req.params.lessonId), 10);
  if (isNaN(lessonId)) { res.status(400).json({ error: "Invalid lessonId" }); return; }

  const existing = await db.query.lessonBookmarksTable.findFirst({
    where: and(eq(lessonBookmarksTable.userId, userId), eq(lessonBookmarksTable.lessonId, lessonId)),
  });

  if (existing) {
    await db.delete(lessonBookmarksTable).where(eq(lessonBookmarksTable.id, existing.id));
    res.json({ bookmarked: false });
  } else {
    await db.insert(lessonBookmarksTable).values({ userId, lessonId, note: req.body.note ?? null });
    res.json({ bookmarked: true });
  }
});

export default router;
