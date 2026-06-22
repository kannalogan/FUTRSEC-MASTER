import { Router } from "express";
import { eq, and, inArray, desc, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable,
  tracksTable,
  learningModulesTable,
  lessonsTable,
  lessonProgressTable,
  moduleEnrollmentsTable,
  lessonBookmarksTable,
  lessonVideosTable,
  lessonNotesTable,
  lessonResourcesTable,
  lessonQuizzesTable,
  lessonQuizQuestionsTable,
  quizAttemptsTable,
  lessonVideoProgressTable,
  userLessonNotesTable,
  discussionPostsTable,
  discussionCommentsTable,
  discussionLikesTable,
} from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { checkTrackQueryAccess, checkResourceTrackAccess, type CareerTrack } from "../lib/track-access";
import OpenAI from "openai";

const router = Router();

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

/** Loads a lesson + its module and runs the track guard. Returns the lesson+module on success, or sends an error response and returns null. */
async function loadGuardedLesson(req: AuthRequest, res: import("express").Response, lessonIdRaw: string | string[]) {
  const lessonId = parseInt(String(lessonIdRaw), 10);
  if (isNaN(lessonId)) { res.status(400).json({ error: "Invalid lessonId" }); return null; }
  const lesson = await db.query.lessonsTable.findFirst({ where: eq(lessonsTable.id, lessonId) });
  if (!lesson) { res.status(404).json({ error: "Lesson not found" }); return null; }
  const moduleRow = await db.query.learningModulesTable.findFirst({ where: eq(learningModulesTable.id, lesson.moduleId) });
  if (!moduleRow) { res.status(404).json({ error: "Module not found" }); return null; }
  const denied = await checkResourceTrackAccess(req.user!.role, req.user!.userId, moduleRow.trackId);
  if (denied) { res.status(403).json({ error: denied }); return null; }
  return { lesson, module: moduleRow, lessonId };
}

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

  const denied = await checkTrackQueryAccess(
    req.user.role,
    (user?.careerTrack as CareerTrack | null) ?? null,
    req.query.track as string | undefined,
  );
  if (denied) { res.status(403).json({ error: denied }); return; }

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

  const moduleDenied = await checkResourceTrackAccess(req.user.role, userId, module.trackId);
  if (moduleDenied) { res.status(403).json({ error: moduleDenied }); return; }

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

router.post("/learning/modules/:moduleId/enroll", requireAuth, requireRole("student"), async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;
  const moduleId = parseInt(String(req.params.moduleId), 10);
  if (isNaN(moduleId)) { res.status(400).json({ error: "Invalid moduleId" }); return; }

  const module = await db.query.learningModulesTable.findFirst({ where: eq(learningModulesTable.id, moduleId) });
  if (!module) { res.status(404).json({ error: "Module not found" }); return; }

  const enrollDenied = await checkResourceTrackAccess(req.user.role, userId, module.trackId);
  if (enrollDenied) { res.status(403).json({ error: enrollDenied }); return; }

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

router.post("/learning/lessons/:lessonId/complete", requireAuth, requireRole("student"), async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;
  const lessonId = parseInt(String(req.params.lessonId), 10);
  if (isNaN(lessonId)) { res.status(400).json({ error: "Invalid lessonId" }); return; }

  const lesson = await db.query.lessonsTable.findFirst({ where: eq(lessonsTable.id, lessonId) });
  if (!lesson) { res.status(404).json({ error: "Lesson not found" }); return; }

  const lessonModule = await db.query.learningModulesTable.findFirst({ where: eq(learningModulesTable.id, lesson.moduleId) });
  const completeDenied = await checkResourceTrackAccess(req.user.role, userId, lessonModule?.trackId);
  if (completeDenied) { res.status(403).json({ error: completeDenied }); return; }

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

router.post("/learning/lessons/:lessonId/bookmark", requireAuth, requireRole("student"), async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;
  const lessonId = parseInt(String(req.params.lessonId), 10);
  if (isNaN(lessonId)) { res.status(400).json({ error: "Invalid lessonId" }); return; }

  const bookmarkLesson = await db.query.lessonsTable.findFirst({ where: eq(lessonsTable.id, lessonId) });
  if (!bookmarkLesson) { res.status(404).json({ error: "Lesson not found" }); return; }
  const bookmarkModule = await db.query.learningModulesTable.findFirst({ where: eq(learningModulesTable.id, bookmarkLesson.moduleId) });
  const bookmarkDenied = await checkResourceTrackAccess(req.user.role, userId, bookmarkModule?.trackId);
  if (bookmarkDenied) { res.status(403).json({ error: bookmarkDenied }); return; }

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

// ── Full lesson detail (player) ────────────────────────────────────────────
router.get("/learning/lessons/:lessonId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;
  const loaded = await loadGuardedLesson(req, res, req.params.lessonId);
  if (!loaded) return;
  const { lesson, module: moduleRow, lessonId } = loaded;

  const [video] = await db.select().from(lessonVideosTable).where(eq(lessonVideosTable.lessonId, lessonId)).limit(1);
  const [article] = await db.select().from(lessonNotesTable).where(eq(lessonNotesTable.lessonId, lessonId)).limit(1);
  const resources = await db.select().from(lessonResourcesTable)
    .where(eq(lessonResourcesTable.lessonId, lessonId)).orderBy(lessonResourcesTable.order);

  const [quiz] = await db.select().from(lessonQuizzesTable).where(eq(lessonQuizzesTable.lessonId, lessonId)).limit(1);
  let quizPayload: any = null;
  if (quiz) {
    const questions = await db.select().from(lessonQuizQuestionsTable)
      .where(eq(lessonQuizQuestionsTable.quizId, quiz.id)).orderBy(lessonQuizQuestionsTable.order);
    // Strip correctAnswers/explanation from question payload (revealed only after submit).
    quizPayload = {
      ...quiz,
      questionCount: questions.length,
      totalPoints: questions.reduce((s, q) => s + q.points, 0),
      questions: questions.map((q) => ({
        id: q.id, question: q.question, type: q.type, options: q.options, points: q.points, order: q.order,
      })),
    };
  }

  const [userNote] = await db.select().from(userLessonNotesTable)
    .where(and(eq(userLessonNotesTable.userId, userId), eq(userLessonNotesTable.lessonId, lessonId))).limit(1);
  const [videoProgress] = await db.select().from(lessonVideoProgressTable)
    .where(and(eq(lessonVideoProgressTable.userId, userId), eq(lessonVideoProgressTable.lessonId, lessonId))).limit(1);

  const [completed] = await db.select().from(lessonProgressTable)
    .where(and(eq(lessonProgressTable.userId, userId), eq(lessonProgressTable.lessonId, lessonId))).limit(1);
  const [bookmark] = await db.select().from(lessonBookmarksTable)
    .where(and(eq(lessonBookmarksTable.userId, userId), eq(lessonBookmarksTable.lessonId, lessonId))).limit(1);

  const [latestAttempt] = quiz
    ? await db.select().from(quizAttemptsTable)
        .where(and(eq(quizAttemptsTable.userId, userId), eq(quizAttemptsTable.quizId, quiz.id)))
        .orderBy(desc(quizAttemptsTable.completedAt)).limit(1)
    : [];

  const [discussionCount] = await db.select({ count: sql<number>`count(*)::int` })
    .from(discussionPostsTable).where(eq(discussionPostsTable.lessonId, lessonId));

  // Sibling lessons for prev/next navigation.
  const siblings = await db.select({ id: lessonsTable.id, title: lessonsTable.title, order: lessonsTable.order })
    .from(lessonsTable)
    .where(and(eq(lessonsTable.moduleId, lesson.moduleId), eq(lessonsTable.isPublished, true)))
    .orderBy(lessonsTable.order);
  const idx = siblings.findIndex((s) => s.id === lessonId);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  res.json({
    lesson: { ...lesson, completed: !!completed, bookmarked: !!bookmark },
    module: moduleRow,
    video: video ?? null,
    article: article ?? null,
    resources,
    quiz: quizPayload,
    latestAttempt: latestAttempt ?? null,
    userNote: userNote ?? null,
    videoProgress: videoProgress ?? null,
    discussionCount: discussionCount?.count ?? 0,
    nav: { prev, next, index: idx, total: siblings.length },
  });
});

// ── Video progress (resume) ────────────────────────────────────────────────
router.post("/learning/lessons/:lessonId/video-progress", requireAuth, requireRole("student"), async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;
  const loaded = await loadGuardedLesson(req, res, req.params.lessonId);
  if (!loaded) return;
  const { lessonId } = loaded;

  const positionSeconds = Math.max(0, Math.floor(Number(req.body.positionSeconds ?? 0)));
  const watchedPercent = Math.min(100, Math.max(0, Math.floor(Number(req.body.watchedPercent ?? 0))));

  const [existing] = await db.select().from(lessonVideoProgressTable)
    .where(and(eq(lessonVideoProgressTable.userId, userId), eq(lessonVideoProgressTable.lessonId, lessonId))).limit(1);

  if (existing) {
    const [updated] = await db.update(lessonVideoProgressTable)
      .set({ positionSeconds, watchedPercent: Math.max(existing.watchedPercent, watchedPercent) })
      .where(eq(lessonVideoProgressTable.id, existing.id)).returning();
    res.json({ videoProgress: updated });
  } else {
    const [created] = await db.insert(lessonVideoProgressTable)
      .values({ userId, lessonId, positionSeconds, watchedPercent }).returning();
    res.status(201).json({ videoProgress: created });
  }
});

// ── Personal notes ─────────────────────────────────────────────────────────
router.put("/learning/lessons/:lessonId/notes", requireAuth, requireRole("student"), async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;
  const loaded = await loadGuardedLesson(req, res, req.params.lessonId);
  if (!loaded) return;
  const { lessonId } = loaded;

  const content = String(req.body.content ?? "");
  const [existing] = await db.select().from(userLessonNotesTable)
    .where(and(eq(userLessonNotesTable.userId, userId), eq(userLessonNotesTable.lessonId, lessonId))).limit(1);

  if (existing) {
    const [updated] = await db.update(userLessonNotesTable)
      .set({ content }).where(eq(userLessonNotesTable.id, existing.id)).returning();
    res.json({ note: updated });
  } else {
    const [created] = await db.insert(userLessonNotesTable).values({ userId, lessonId, content }).returning();
    res.status(201).json({ note: created });
  }
});

// ── Quiz submit (grade + store attempt + XP) ───────────────────────────────
router.post("/learning/lessons/:lessonId/quiz/submit", requireAuth, requireRole("student"), async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;
  const loaded = await loadGuardedLesson(req, res, req.params.lessonId);
  if (!loaded) return;
  const { lessonId } = loaded;

  const [quiz] = await db.select().from(lessonQuizzesTable).where(eq(lessonQuizzesTable.lessonId, lessonId)).limit(1);
  if (!quiz) { res.status(404).json({ error: "No quiz for this lesson" }); return; }

  const questions = await db.select().from(lessonQuizQuestionsTable)
    .where(eq(lessonQuizQuestionsTable.quizId, quiz.id)).orderBy(lessonQuizQuestionsTable.order);

  // answers: { [questionId]: number[] }
  const answers: Record<string, number[]> = req.body.answers ?? {};
  const timeSpentSeconds = Math.max(0, Math.floor(Number(req.body.timeSpentSeconds ?? 0)));

  let score = 0;
  const maxScore = questions.reduce((s, q) => s + q.points, 0);
  const results = questions.map((q) => {
    const given = (answers[String(q.id)] ?? []).slice().sort((a, b) => a - b);
    const correct = q.correctAnswers.slice().sort((a, b) => a - b);
    const isCorrect = given.length === correct.length && given.every((v, i) => v === correct[i]);
    if (isCorrect) score += q.points;
    return {
      questionId: q.id,
      correctAnswers: q.correctAnswers,
      explanation: q.explanation,
      isCorrect,
      given,
    };
  });

  const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const passed = percent >= quiz.passingScore;

  const [attempt] = await db.insert(quizAttemptsTable).values({
    userId, quizId: quiz.id, lessonId, score, maxScore, passed, timeSpentSeconds,
  }).returning();

  // Award completion + XP on pass (idempotent on lesson completion).
  let xpAwarded = 0;
  let moduleProgress: number | null = null;
  if (passed) {
    const [already] = await db.select().from(lessonProgressTable)
      .where(and(eq(lessonProgressTable.userId, userId), eq(lessonProgressTable.lessonId, lessonId))).limit(1);
    if (!already) {
      await db.insert(lessonProgressTable).values({ userId, lessonId, moduleId: loaded.lesson.moduleId, timeSpentSeconds });
      const allLessons = await db.select({ id: lessonsTable.id }).from(lessonsTable)
        .where(and(eq(lessonsTable.moduleId, loaded.lesson.moduleId), eq(lessonsTable.isPublished, true)));
      const allProgress = await db.select().from(lessonProgressTable)
        .where(and(eq(lessonProgressTable.userId, userId), eq(lessonProgressTable.moduleId, loaded.lesson.moduleId)));
      moduleProgress = allLessons.length > 0 ? Math.round((allProgress.length / allLessons.length) * 100) : 0;
      const [enr] = await db.select().from(moduleEnrollmentsTable)
        .where(and(eq(moduleEnrollmentsTable.userId, userId), eq(moduleEnrollmentsTable.moduleId, loaded.lesson.moduleId))).limit(1);
      if (!enr) {
        await db.insert(moduleEnrollmentsTable).values({ userId, moduleId: loaded.lesson.moduleId, trackId: loaded.module.trackId, progressPercent: moduleProgress });
      } else {
        await db.update(moduleEnrollmentsTable).set({
          progressPercent: moduleProgress,
          ...(moduleProgress === 100 ? { completedAt: new Date() } : {}),
        }).where(eq(moduleEnrollmentsTable.id, enr.id));
      }
      xpAwarded = loaded.module.xpReward ?? 0;
    }
  }

  res.status(201).json({ attempt, score, maxScore, percent, passed, passingScore: quiz.passingScore, results, xpAwarded, moduleProgress });
});

router.get("/learning/lessons/:lessonId/quiz/attempts", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;
  const loaded = await loadGuardedLesson(req, res, req.params.lessonId);
  if (!loaded) return;
  const attempts = await db.select().from(quizAttemptsTable)
    .where(and(eq(quizAttemptsTable.userId, userId), eq(quizAttemptsTable.lessonId, loaded.lessonId)))
    .orderBy(desc(quizAttemptsTable.completedAt));
  res.json({ attempts });
});

// ── Discussion ─────────────────────────────────────────────────────────────
router.get("/learning/lessons/:lessonId/discussion", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;
  const loaded = await loadGuardedLesson(req, res, req.params.lessonId);
  if (!loaded) return;
  const { lessonId } = loaded;

  const posts = await db.select({
    id: discussionPostsTable.id, body: discussionPostsTable.body, userId: discussionPostsTable.userId,
    isPinned: discussionPostsTable.isPinned, isSolved: discussionPostsTable.isSolved,
    likeCount: discussionPostsTable.likeCount, createdAt: discussionPostsTable.createdAt,
    authorName: usersTable.fullName, authorRole: usersTable.role, authorAvatar: usersTable.avatarUrl,
  }).from(discussionPostsTable)
    .leftJoin(usersTable, eq(usersTable.id, discussionPostsTable.userId))
    .where(eq(discussionPostsTable.lessonId, lessonId))
    .orderBy(desc(discussionPostsTable.isPinned), desc(discussionPostsTable.createdAt));

  const postIds = posts.map((p) => p.id);
  const comments = postIds.length > 0
    ? await db.select({
        id: discussionCommentsTable.id, postId: discussionCommentsTable.postId, body: discussionCommentsTable.body,
        userId: discussionCommentsTable.userId, isAcceptedAnswer: discussionCommentsTable.isAcceptedAnswer,
        likeCount: discussionCommentsTable.likeCount, createdAt: discussionCommentsTable.createdAt,
        authorName: usersTable.fullName, authorRole: usersTable.role, authorAvatar: usersTable.avatarUrl,
      }).from(discussionCommentsTable)
        .leftJoin(usersTable, eq(usersTable.id, discussionCommentsTable.userId))
        .where(inArray(discussionCommentsTable.postId, postIds))
        .orderBy(discussionCommentsTable.createdAt)
    : [];

  const myLikes = await db.select().from(discussionLikesTable).where(eq(discussionLikesTable.userId, userId));
  const likedPostIds = new Set(myLikes.filter((l) => l.postId != null).map((l) => l.postId));
  const likedCommentIds = new Set(myLikes.filter((l) => l.commentId != null).map((l) => l.commentId));

  const commentsByPost = new Map<number, any[]>();
  for (const c of comments) {
    const arr = commentsByPost.get(c.postId) ?? [];
    arr.push({ ...c, liked: likedCommentIds.has(c.id) });
    commentsByPost.set(c.postId, arr);
  }

  res.json({
    posts: posts.map((p) => ({ ...p, liked: likedPostIds.has(p.id), comments: commentsByPost.get(p.id) ?? [] })),
  });
});

router.post("/learning/lessons/:lessonId/discussion", requireAuth, requireRole("student"), async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;
  const loaded = await loadGuardedLesson(req, res, req.params.lessonId);
  if (!loaded) return;
  const body = String(req.body.body ?? "").trim();
  if (!body) { res.status(400).json({ error: "Post body is required" }); return; }
  const [post] = await db.insert(discussionPostsTable).values({ lessonId: loaded.lessonId, userId, body }).returning();
  res.status(201).json({ post });
});

router.post("/learning/discussion/:postId/comments", requireAuth, requireRole("student"), async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;
  const postId = parseInt(String(req.params.postId), 10);
  if (isNaN(postId)) { res.status(400).json({ error: "Invalid postId" }); return; }
  const post = await db.query.discussionPostsTable.findFirst({ where: eq(discussionPostsTable.id, postId) });
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }
  const guard = await loadGuardedLesson(req, res, String(post.lessonId));
  if (!guard) return;
  const body = String(req.body.body ?? "").trim();
  if (!body) { res.status(400).json({ error: "Comment body is required" }); return; }
  const [comment] = await db.insert(discussionCommentsTable).values({ postId, userId, body }).returning();
  res.status(201).json({ comment });
});

router.post("/learning/discussion/:postId/like", requireAuth, requireRole("student"), async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;
  const postId = parseInt(String(req.params.postId), 10);
  if (isNaN(postId)) { res.status(400).json({ error: "Invalid postId" }); return; }
  const post = await db.query.discussionPostsTable.findFirst({ where: eq(discussionPostsTable.id, postId) });
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }
  const guard = await loadGuardedLesson(req, res, String(post.lessonId));
  if (!guard) return;

  const [existing] = await db.select().from(discussionLikesTable)
    .where(and(eq(discussionLikesTable.userId, userId), eq(discussionLikesTable.postId, postId))).limit(1);
  if (existing) {
    await db.delete(discussionLikesTable).where(eq(discussionLikesTable.id, existing.id));
    const [updated] = await db.update(discussionPostsTable)
      .set({ likeCount: Math.max(0, post.likeCount - 1) }).where(eq(discussionPostsTable.id, postId)).returning();
    res.json({ liked: false, likeCount: updated.likeCount });
  } else {
    await db.insert(discussionLikesTable).values({ userId, postId });
    const [updated] = await db.update(discussionPostsTable)
      .set({ likeCount: post.likeCount + 1 }).where(eq(discussionPostsTable.id, postId)).returning();
    res.json({ liked: true, likeCount: updated.likeCount });
  }
});

router.post("/learning/discussion/comments/:commentId/like", requireAuth, requireRole("student"), async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;
  const commentId = parseInt(String(req.params.commentId), 10);
  if (isNaN(commentId)) { res.status(400).json({ error: "Invalid commentId" }); return; }
  const comment = await db.query.discussionCommentsTable.findFirst({ where: eq(discussionCommentsTable.id, commentId) });
  if (!comment) { res.status(404).json({ error: "Comment not found" }); return; }
  const post = await db.query.discussionPostsTable.findFirst({ where: eq(discussionPostsTable.id, comment.postId) });
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }
  const guard = await loadGuardedLesson(req, res, String(post.lessonId));
  if (!guard) return;

  const [existing] = await db.select().from(discussionLikesTable)
    .where(and(eq(discussionLikesTable.userId, userId), eq(discussionLikesTable.commentId, commentId))).limit(1);
  if (existing) {
    await db.delete(discussionLikesTable).where(eq(discussionLikesTable.id, existing.id));
    const [updated] = await db.update(discussionCommentsTable)
      .set({ likeCount: Math.max(0, comment.likeCount - 1) }).where(eq(discussionCommentsTable.id, commentId)).returning();
    res.json({ liked: false, likeCount: updated.likeCount });
  } else {
    await db.insert(discussionLikesTable).values({ userId, commentId });
    const [updated] = await db.update(discussionCommentsTable)
      .set({ likeCount: comment.likeCount + 1 }).where(eq(discussionCommentsTable.id, commentId)).returning();
    res.json({ liked: true, likeCount: updated.likeCount });
  }
});

// Mentor/admin: pin a post or mark solved.
router.patch("/learning/discussion/:postId/moderate", requireAuth, requireRole("mentor", "admin"), async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const postId = parseInt(String(req.params.postId), 10);
  if (isNaN(postId)) { res.status(400).json({ error: "Invalid postId" }); return; }
  const post = await db.query.discussionPostsTable.findFirst({ where: eq(discussionPostsTable.id, postId) });
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }
  const guard = await loadGuardedLesson(req, res, String(post.lessonId));
  if (!guard) return;

  const patch: { isPinned?: boolean; isSolved?: boolean } = {};
  if (typeof req.body.isPinned === "boolean") patch.isPinned = req.body.isPinned;
  if (typeof req.body.isSolved === "boolean") patch.isSolved = req.body.isSolved;
  if (Object.keys(patch).length === 0) { res.status(400).json({ error: "Nothing to update" }); return; }
  const [updated] = await db.update(discussionPostsTable).set(patch).where(eq(discussionPostsTable.id, postId)).returning();
  res.json({ post: updated });
});

// ── My Courses (ongoing / completed / recommended / saved) ─────────────────
router.get("/learning/my-courses", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
  if (!user?.selectedTrackId) { res.json({ ongoing: [], completed: [], recommended: [], saved: [] }); return; }

  const modules = await db.select().from(learningModulesTable)
    .where(and(eq(learningModulesTable.trackId, user.selectedTrackId), eq(learningModulesTable.isPublished, true)))
    .orderBy(learningModulesTable.order);
  const moduleIds = modules.map((m) => m.id);

  const enrollments = moduleIds.length > 0
    ? await db.select().from(moduleEnrollmentsTable)
        .where(and(eq(moduleEnrollmentsTable.userId, userId), inArray(moduleEnrollmentsTable.moduleId, moduleIds)))
    : [];
  const enrollMap = new Map(enrollments.map((e) => [e.moduleId, e]));

  const decorated = modules.map((m) => {
    const e = enrollMap.get(m.id) ?? null;
    return { ...m, enrollment: e, isEnrolled: !!e, progressPercent: e?.progressPercent ?? 0 };
  });

  const ongoing = decorated.filter((m) => m.isEnrolled && m.progressPercent < 100);
  const completed = decorated.filter((m) => m.isEnrolled && m.progressPercent === 100);
  const recommended = decorated.filter((m) => !m.isEnrolled);

  // Saved = lessons bookmarked, joined with their module for context.
  const bookmarks = await db.select({
    id: lessonBookmarksTable.id, lessonId: lessonBookmarksTable.lessonId, note: lessonBookmarksTable.note,
    createdAt: lessonBookmarksTable.createdAt,
    lessonTitle: lessonsTable.title, lessonType: lessonsTable.type, moduleId: lessonsTable.moduleId,
    moduleTitle: learningModulesTable.title,
  }).from(lessonBookmarksTable)
    .leftJoin(lessonsTable, eq(lessonsTable.id, lessonBookmarksTable.lessonId))
    .leftJoin(learningModulesTable, eq(learningModulesTable.id, lessonsTable.moduleId))
    .where(eq(lessonBookmarksTable.userId, userId))
    .orderBy(desc(lessonBookmarksTable.createdAt));

  res.json({ ongoing, completed, recommended, saved: bookmarks });
});

// ── AI Explain (context-aware tutor) ───────────────────────────────────────
router.post("/learning/lessons/:lessonId/ai-explain", requireAuth, requireRole("student"), async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const loaded = await loadGuardedLesson(req, res, req.params.lessonId);
  if (!loaded) return;
  const { lesson, module: moduleRow, lessonId } = loaded;

  const question = String(req.body.question ?? "").trim();
  if (!question) { res.status(400).json({ error: "A question is required" }); return; }
  if (question.length > 1000) { res.status(400).json({ error: "Question is too long (max 1000 characters)" }); return; }

  const client = getOpenAI();
  if (!client) {
    res.status(503).json({ error: "AI tutor is not configured yet. An OpenAI API key needs to be added to enable AI Explain." });
    return;
  }

  // Build lesson context from its article/notes so answers stay grounded.
  const [article] = await db.select().from(lessonNotesTable).where(eq(lessonNotesTable.lessonId, lessonId)).limit(1);
  const track = await db.query.tracksTable.findFirst({ where: eq(tracksTable.id, moduleRow.trackId) });
  const context = [
    track ? `Career track: ${track.name}` : "",
    `Module: ${moduleRow.title}`,
    `Lesson: ${lesson.title} (${lesson.type})`,
    article?.content ? `Lesson material:\n${String(article.content).slice(0, 4000)}` : "",
  ].filter(Boolean).join("\n");

  const system = `You are an expert cybersecurity tutor for FUTRSEC, an Indian cybersecurity learning platform. ` +
    `Answer the student's question about the lesson below. Be concise, accurate, and practical. ` +
    `Use markdown formatting (headings, bold, code blocks for commands/payloads). ` +
    `Ground your answer in the lesson material when relevant, and relate examples to real-world security work. ` +
    `If the question is unrelated to cybersecurity or this lesson, gently steer back to the topic.\n\n=== LESSON CONTEXT ===\n${context}`;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 1200,
      messages: [
        { role: "system", content: system },
        { role: "user", content: question },
      ],
    });
    const answer = completion.choices[0]?.message?.content?.trim() || "I couldn't generate an answer. Please try rephrasing your question.";
    req.log.info({ lessonId, userId: req.user.userId }, "ai-explain answered");
    res.json({ answer });
  } catch (err) {
    const status = (err as { status?: number })?.status;
    const code = (err as { code?: string })?.code;
    req.log.error({ err, lessonId, status, code }, "ai-explain failed");
    if (status === 429 || code === "insufficient_quota") {
      res.status(503).json({ error: "The AI tutor is out of OpenAI quota. Please add billing credits to your OpenAI account to enable AI Explain." });
      return;
    }
    if (status === 401) {
      res.status(503).json({ error: "The OpenAI API key is invalid. Please update it to enable AI Explain." });
      return;
    }
    res.status(502).json({ error: "The AI tutor is temporarily unavailable. Please try again in a moment." });
  }
});

export default router;
