import { Router } from "express";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import {
  assessmentsTable,
  assessmentQuestionsTable,
  assessmentOptionsTable,
  assessmentAttemptsTable,
  assessmentResultsTable,
  assessmentAnswersTable,
  usersTable,
  ftsScoresTable,
  ftsHistoryTable,
  mentorTasksTable,
  mentorTaskAssignmentsTable,
} from "@workspace/db";
import { SubmitPreAssessmentBody } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { eventBus } from "../lib/events";
import { createAuditLog } from "../lib/audit";

const router = Router();

router.get("/assessments/pre", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const [assessment] = await db
    .select()
    .from(assessmentsTable)
    .where(
      and(
        eq(assessmentsTable.type, "pre_assessment"),
        eq(assessmentsTable.isActive, true)
      )
    )
    .limit(1);

  if (!assessment) {
    res.status(404).json({ error: "Pre-assessment not available" });
    return;
  }

  const questions = await db
    .select()
    .from(assessmentQuestionsTable)
    .where(eq(assessmentQuestionsTable.assessmentId, assessment.id))
    .orderBy(assessmentQuestionsTable.order);

  const questionsWithOptions = await Promise.all(
    questions.map(async (q) => {
      const options = await db
        .select({
          id: assessmentOptionsTable.id,
          text: assessmentOptionsTable.optionText,
        })
        .from(assessmentOptionsTable)
        .where(eq(assessmentOptionsTable.questionId, q.id))
        .orderBy(assessmentOptionsTable.order);

      return {
        id: q.id,
        text: q.questionText,
        type: q.questionType,
        options,
      };
    })
  );

  res.json({
    id: assessment.id,
    title: assessment.title,
    type: assessment.type,
    totalQuestions: assessment.totalQuestions,
    durationMinutes: assessment.durationMinutes,
    questions: questionsWithOptions,
  });
});

router.post("/assessments/pre/submit", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const parsed = SubmitPreAssessmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { assessmentId, answers } = parsed.data;

  const [assessment] = await db
    .select()
    .from(assessmentsTable)
    .where(eq(assessmentsTable.id, assessmentId));

  if (!assessment) {
    res.status(404).json({ error: "Assessment not found" });
    return;
  }

  const [attempt] = await db
    .insert(assessmentAttemptsTable)
    .values({
      userId: req.user.userId,
      assessmentId,
      status: "submitted",
      submittedAt: new Date(),
    })
    .returning();

  let totalScore = 0;
  let totalMarks = 0;

  for (const answer of answers) {
    const question = await db
      .select()
      .from(assessmentQuestionsTable)
      .where(eq(assessmentQuestionsTable.id, answer.questionId))
      .then((r) => r[0]);

    if (!question) continue;

    totalMarks += question.points;

    const correctOptions = await db
      .select()
      .from(assessmentOptionsTable)
      .where(
        and(
          eq(assessmentOptionsTable.questionId, answer.questionId),
          eq(assessmentOptionsTable.isCorrect, true)
        )
      );

    const correctIds = correctOptions.map((o) => o.id).sort();
    const selectedIds = [...answer.selectedOptionIds].sort();
    const isCorrect =
      correctIds.length === selectedIds.length &&
      correctIds.every((id, i) => id === selectedIds[i]);

    const pointsAwarded = isCorrect ? question.points : 0;
    totalScore += pointsAwarded;

    await db.insert(assessmentAnswersTable).values({
      attemptId: attempt.id,
      questionId: answer.questionId,
      selectedOptionIds: answer.selectedOptionIds,
      isCorrect,
      pointsAwarded,
    });
  }

  const percentage = totalMarks > 0 ? (totalScore / totalMarks) * 100 : 0;
  const passed = percentage >= assessment.passingScore;

  let suggestedTrackLevel: string | null = null;
  if (percentage >= 80) suggestedTrackLevel = "advanced";
  else if (percentage >= 50) suggestedTrackLevel = "intermediate";
  else suggestedTrackLevel = "beginner";

  const feedback = passed
    ? `Great job! You scored ${percentage.toFixed(1)}%. You have a solid foundation for this track.`
    : `You scored ${percentage.toFixed(1)}%. Don't worry — this track will build your skills from the ground up.`;

  const [result] = await db
    .insert(assessmentResultsTable)
    .values({
      attemptId: attempt.id,
      userId: req.user.userId,
      assessmentId,
      score: totalScore,
      totalMarks,
      percentage,
      passed,
      feedback,
      suggestedTrackLevel,
    })
    .returning();

  await db
    .update(usersTable)
    .set({ onboardingStep: "complete" })
    .where(eq(usersTable.id, req.user.userId));

  const existingFts = await db
    .select()
    .from(ftsScoresTable)
    .where(eq(ftsScoresTable.userId, req.user.userId))
    .then((r) => r[0]);

  const assessmentContribution = percentage * 0.3;
  if (existingFts) {
    await db
      .update(ftsScoresTable)
      .set({
        assessmentScore: assessmentContribution,
        totalScore: existingFts.totalScore + assessmentContribution,
      })
      .where(eq(ftsScoresTable.userId, req.user.userId));
  } else {
    await db.insert(ftsScoresTable).values({
      userId: req.user.userId,
      assessmentScore: assessmentContribution,
      totalScore: assessmentContribution,
    });
  }

  await db.insert(ftsHistoryTable).values({
    userId: req.user.userId,
    event: "pre_assessment_submitted",
    scoreDelta: assessmentContribution,
    previousScore: existingFts?.totalScore ?? 0,
    newScore: (existingFts?.totalScore ?? 0) + assessmentContribution,
  });

  eventBus.emit("assessment.submitted", {
    type: "assessment.submitted",
    userId: req.user.userId,
    assessmentId,
    attemptId: attempt.id,
    score: totalScore,
  });

  eventBus.emit("user.onboarding_complete", {
    type: "user.onboarding_complete",
    userId: req.user.userId,
  });

  res.json({
    attemptId: attempt.id,
    score: totalScore,
    totalMarks,
    percentage,
    passed,
    feedback,
    suggestedTrackLevel: result.suggestedTrackLevel ?? null,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Generic assessment taking (any active assessment by id).
// Used by mentor "assessment" tasks and (later) journey items. The onboarding
// pre-assessment keeps its dedicated /assessments/pre endpoints because it has
// onboarding side effects; this generic path intentionally has none.
// ─────────────────────────────────────────────────────────────────────────────

async function loadAssessmentForTaking(assessmentId: number) {
  const [assessment] = await db
    .select()
    .from(assessmentsTable)
    .where(eq(assessmentsTable.id, assessmentId));
  if (!assessment || !assessment.isActive) return null;

  const questions = await db
    .select()
    .from(assessmentQuestionsTable)
    .where(eq(assessmentQuestionsTable.assessmentId, assessmentId))
    .orderBy(assessmentQuestionsTable.order);

  const questionsWithOptions = await Promise.all(
    questions.map(async (q) => {
      const options = await db
        .select({
          id: assessmentOptionsTable.id,
          text: assessmentOptionsTable.optionText,
        })
        .from(assessmentOptionsTable)
        .where(eq(assessmentOptionsTable.questionId, q.id))
        .orderBy(assessmentOptionsTable.order);
      return { id: q.id, text: q.questionText, type: q.questionType, options };
    })
  );

  return { assessment, questions: questionsWithOptions };
}

/** Count this user's finished (submitted or auto-submitted) attempts. */
async function countSubmittedAttempts(
  userId: number,
  assessmentId: number
): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(assessmentAttemptsTable)
    .where(
      and(
        eq(assessmentAttemptsTable.userId, userId),
        eq(assessmentAttemptsTable.assessmentId, assessmentId),
        sql`${assessmentAttemptsTable.status} in ('submitted','auto_submitted')`
      )
    );
  return Number(row?.n ?? 0);
}

/**
 * Resolve the most restrictive retry limit for a student on an assessment,
 * combining the assessment-level cap with every published assessment-task that
 * references it and is assigned to the student. Returns null when unlimited.
 */
async function resolveAttemptLimit(
  userId: number,
  assessment: typeof assessmentsTable.$inferSelect
): Promise<number | null> {
  const limits: number[] = [];
  if (assessment.maxAttempts != null) limits.push(assessment.maxAttempts);
  const limitingTasks = await db
    .select({ maxAttempts: mentorTasksTable.maxAttempts })
    .from(mentorTaskAssignmentsTable)
    .innerJoin(
      mentorTasksTable,
      eq(mentorTaskAssignmentsTable.taskId, mentorTasksTable.id)
    )
    .where(
      and(
        eq(mentorTaskAssignmentsTable.studentId, userId),
        eq(mentorTasksTable.type, "assessment"),
        eq(mentorTasksTable.refId, assessment.id),
        eq(mentorTasksTable.status, "published")
      )
    );
  for (const t of limitingTasks) if (t.maxAttempts != null) limits.push(t.maxAttempts);
  return limits.length ? Math.min(...limits) : null;
}

/**
 * Atomically obtain the attempt to use for a take session, enforcing the
 * single-in-progress invariant and the retry limit. Serialized per
 * (user, assessment) with a transaction-scoped advisory lock so concurrent
 * requests can never over-allocate. Behaviour:
 *   1. If an in-progress attempt already exists → resume it (no new attempt,
 *      warningCount preserved). At most one in-progress attempt ever exists.
 *   2. Else if the finished-attempt count has reached the limit → reject.
 *   3. Else create a fresh in-progress attempt.
 * Because a new attempt is only created when used < limit and a finalize can
 * only consume the single in-progress attempt, finalized attempts can never
 * exceed the configured cap.
 */
async function acquireAttempt(
  userId: number,
  assessment: typeof assessmentsTable.$inferSelect
): Promise<
  | { kind: "ok"; attempt: typeof assessmentAttemptsTable.$inferSelect }
  | { kind: "limit"; used: number; limit: number }
> {
  const assessmentId = assessment.id;
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(${userId}, ${assessmentId})`
    );

    const [existing] = await tx
      .select()
      .from(assessmentAttemptsTable)
      .where(
        and(
          eq(assessmentAttemptsTable.userId, userId),
          eq(assessmentAttemptsTable.assessmentId, assessmentId),
          eq(assessmentAttemptsTable.status, "in_progress")
        )
      )
      .orderBy(desc(assessmentAttemptsTable.startedAt));
    if (existing) return { kind: "ok" as const, attempt: existing };

    const limit = await resolveAttemptLimit(userId, assessment);
    if (limit != null) {
      const [row] = await tx
        .select({ n: count() })
        .from(assessmentAttemptsTable)
        .where(
          and(
            eq(assessmentAttemptsTable.userId, userId),
            eq(assessmentAttemptsTable.assessmentId, assessmentId),
            sql`${assessmentAttemptsTable.status} in ('submitted','auto_submitted')`
          )
        );
      const used = Number(row?.n ?? 0);
      if (used >= limit) return { kind: "limit" as const, used, limit };
    }

    const [created] = await tx
      .insert(assessmentAttemptsTable)
      .values({ userId, assessmentId, status: "in_progress" })
      .returning();
    return { kind: "ok" as const, attempt: created };
  });
}

interface GradedAnswer {
  questionId: number;
  selectedOptionIds: number[];
}

interface FinalizeResult {
  attemptId: number;
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  feedback: string;
  status: string;
  terminationReason: string | null;
}

/**
 * Grade the supplied answers against an assessment and finalize an in-progress
 * attempt — all inside one transaction with a row lock so a manual submit and a
 * security auto-submit can never double-finalize the same attempt. Returns null
 * when the attempt is missing, not owned by the user, or already finalized.
 */
async function gradeAndFinalizeAttempt(opts: {
  userId: number;
  assessment: typeof assessmentsTable.$inferSelect;
  attemptId: number;
  answers: GradedAnswer[];
  status: "submitted" | "auto_submitted";
  terminationReason: string | null;
  taskAssignmentId?: number;
}): Promise<FinalizeResult | null> {
  const { userId, assessment, attemptId, answers, status, terminationReason } =
    opts;
  return db.transaction(async (tx) => {
    const [attempt] = await tx
      .select()
      .from(assessmentAttemptsTable)
      .where(eq(assessmentAttemptsTable.id, attemptId))
      .for("update");
    if (
      !attempt ||
      attempt.userId !== userId ||
      attempt.assessmentId !== assessment.id ||
      attempt.status !== "in_progress"
    ) {
      return null;
    }

    let totalScore = 0;
    let totalMarks = 0;
    for (const answer of answers) {
      const [question] = await tx
        .select()
        .from(assessmentQuestionsTable)
        .where(eq(assessmentQuestionsTable.id, answer.questionId));
      if (!question || question.assessmentId !== assessment.id) continue;
      totalMarks += question.points;

      const correctOptions = await tx
        .select()
        .from(assessmentOptionsTable)
        .where(
          and(
            eq(assessmentOptionsTable.questionId, answer.questionId),
            eq(assessmentOptionsTable.isCorrect, true)
          )
        );
      const correctIds = correctOptions.map((o) => o.id).sort();
      const selectedIds = [...answer.selectedOptionIds].sort();
      const isCorrect =
        correctIds.length === selectedIds.length &&
        correctIds.every((cid, i) => cid === selectedIds[i]);
      const pointsAwarded = isCorrect ? question.points : 0;
      totalScore += pointsAwarded;

      await tx.insert(assessmentAnswersTable).values({
        attemptId,
        questionId: answer.questionId,
        selectedOptionIds: answer.selectedOptionIds,
        isCorrect,
        pointsAwarded,
      });
    }

    const percentage = totalMarks > 0 ? (totalScore / totalMarks) * 100 : 0;
    const passed = percentage >= assessment.passingScore;
    const feedback =
      status === "auto_submitted"
        ? `This attempt was ended automatically (${terminationReason ?? "security"}). You scored ${percentage.toFixed(1)}%.`
        : passed
          ? `You scored ${percentage.toFixed(1)}% and passed.`
          : `You scored ${percentage.toFixed(1)}%. Review the material and try again if attempts remain.`;

    await tx
      .update(assessmentAttemptsTable)
      .set({ status, submittedAt: new Date(), terminationReason })
      .where(eq(assessmentAttemptsTable.id, attemptId));

    await tx.insert(assessmentResultsTable).values({
      attemptId,
      userId,
      assessmentId: assessment.id,
      score: totalScore,
      totalMarks,
      percentage,
      passed,
      feedback,
    });

    if (opts.taskAssignmentId != null) {
      await tx
        .update(mentorTaskAssignmentsTable)
        .set({
          status: "completed",
          completedAt: new Date(),
          assessmentAttemptId: attemptId,
        })
        .where(eq(mentorTaskAssignmentsTable.id, opts.taskAssignmentId));
    }

    return {
      attemptId,
      score: totalScore,
      totalMarks,
      percentage,
      passed,
      feedback,
      status,
      terminationReason,
    };
  });
}

const genericSubmitBody = z.object({
  answers: z.array(
    z.object({
      questionId: z.number().int().positive(),
      selectedOptionIds: z.array(z.number().int().nonnegative()),
    })
  ),
  // optional mentor-task context: when present, retry policy is enforced and the
  // task assignment is completed atomically with the attempt.
  taskId: z.number().int().positive().optional(),
  // optional in-progress attempt to finalize (created by POST /start). When
  // omitted the legacy single-shot path creates and finalizes a fresh attempt.
  attemptId: z.number().int().positive().optional(),
});

router.get(
  "/assessments/:id",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid assessment id" });
      return;
    }
    const loaded = await loadAssessmentForTaking(id);
    if (!loaded) {
      res.status(404).json({ error: "Assessment not found" });
      return;
    }
    const { assessment, questions } = loaded;
    res.json({
      id: assessment.id,
      title: assessment.title,
      type: assessment.type,
      totalQuestions: assessment.totalQuestions,
      durationMinutes: assessment.durationMinutes,
      passingScore: assessment.passingScore,
      questions,
    });
  }
);

router.get(
  "/assessments/:id/attempts",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid assessment id" });
      return;
    }
    const attempts = await db
      .select()
      .from(assessmentAttemptsTable)
      .where(
        and(
          eq(assessmentAttemptsTable.userId, req.user.userId),
          eq(assessmentAttemptsTable.assessmentId, id)
        )
      )
      .orderBy(desc(assessmentAttemptsTable.startedAt));

    const results = await db
      .select()
      .from(assessmentResultsTable)
      .where(
        and(
          eq(assessmentResultsTable.userId, req.user.userId),
          eq(assessmentResultsTable.assessmentId, id)
        )
      );
    const resultByAttempt = new Map(results.map((r) => [r.attemptId, r]));

    res.json({
      attempts: attempts.map((a) => {
        const r = resultByAttempt.get(a.id);
        return {
          id: a.id,
          status: a.status,
          startedAt: a.startedAt.toISOString(),
          submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
          score: r?.score ?? null,
          totalMarks: r?.totalMarks ?? null,
          percentage: r?.percentage ?? null,
          passed: r?.passed ?? null,
        };
      }),
    });
  }
);

/**
 * Validate a mentor-task context for a submit/start request. Returns the
 * resolved task + assignment when taskId is supplied, or an error tuple the
 * caller forwards to the client. When taskId is absent it returns nulls (the
 * caller still enforces the cross-task attempt limit separately).
 */
async function resolveTaskContext(
  userId: number,
  assessmentId: number,
  taskId: number | undefined
): Promise<
  | {
      ok: true;
      task: typeof mentorTasksTable.$inferSelect | null;
      assignment: typeof mentorTaskAssignmentsTable.$inferSelect | null;
    }
  | { ok: false; status: number; body: Record<string, unknown> }
> {
  if (taskId === undefined) return { ok: true, task: null, assignment: null };
  const [task] = await db
    .select()
    .from(mentorTasksTable)
    .where(eq(mentorTasksTable.id, taskId));
  if (!task || task.type !== "assessment" || task.refId !== assessmentId) {
    return {
      ok: false,
      status: 400,
      body: { error: "Task does not reference this assessment" },
    };
  }
  if (task.status !== "published") {
    return {
      ok: false,
      status: 403,
      body: { error: "Task is not currently active" },
    };
  }
  const [assignment] = await db
    .select()
    .from(mentorTaskAssignmentsTable)
    .where(
      and(
        eq(mentorTaskAssignmentsTable.taskId, taskId),
        eq(mentorTaskAssignmentsTable.studentId, userId)
      )
    );
  if (!assignment) {
    return {
      ok: false,
      status: 403,
      body: { error: "This task is not assigned to you" },
    };
  }
  return { ok: true, task, assignment };
}

const startBody = z.object({
  taskId: z.number().int().positive().optional(),
});

/**
 * Begin (or resume) a proctored attempt. Enforces the effective retry limit
 * up front so a fourth attempt can never be opened, and resumes an existing
 * in-progress attempt on reload so the server-tracked warning count survives a
 * page refresh. Returns the security configuration the take page needs.
 */
router.post(
  "/assessments/:id/start",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const userId = req.user.userId;
    const assessmentId = Number(req.params["id"]);
    if (!Number.isInteger(assessmentId) || assessmentId <= 0) {
      res.status(400).json({ error: "Invalid assessment id" });
      return;
    }
    const parsed = startBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }

    const [assessment] = await db
      .select()
      .from(assessmentsTable)
      .where(eq(assessmentsTable.id, assessmentId));
    if (!assessment || !assessment.isActive) {
      res.status(404).json({ error: "Assessment not found" });
      return;
    }

    const ctx = await resolveTaskContext(userId, assessmentId, parsed.data.taskId);
    if (!ctx.ok) {
      res.status(ctx.status).json(ctx.body);
      return;
    }

    const acquired = await acquireAttempt(userId, assessment);
    if (acquired.kind === "limit") {
      res.status(409).json({
        error: "No attempts remaining for this assessment",
        attemptsUsed: acquired.used,
        maxAttempts: acquired.limit,
      });
      return;
    }
    const attempt = acquired.attempt;

    const deadlineAt = new Date(
      attempt.startedAt.getTime() + assessment.durationMinutes * 60_000
    );
    res.json({
      attemptId: attempt.id,
      securityEnabled: assessment.securityEnabled,
      maxWarnings: assessment.maxWarnings,
      warningCount: attempt.warningCount,
      durationMinutes: assessment.durationMinutes,
      startedAt: attempt.startedAt.toISOString(),
      deadlineAt: deadlineAt.toISOString(),
    });
  }
);

const warnBody = z.object({
  reason: z.string().max(120).optional(),
  // current answers snapshot, graded if this violation triggers a lockout so
  // partial progress still counts.
  answers: z
    .array(
      z.object({
        questionId: z.number().int().positive(),
        selectedOptionIds: z.array(z.number().int().nonnegative()),
      })
    )
    .optional(),
});

/**
 * Record a security violation (tab-switch / focus-loss) against an in-progress
 * attempt. The count is server-authoritative; when it reaches the assessment's
 * maxWarnings the attempt is auto-submitted (graded on whatever answers the
 * client last had) and locked.
 */
router.post(
  "/assessments/:id/attempts/:attemptId/warn",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const userId = req.user.userId;
    const assessmentId = Number(req.params["id"]);
    const attemptId = Number(req.params["attemptId"]);
    if (
      !Number.isInteger(assessmentId) ||
      assessmentId <= 0 ||
      !Number.isInteger(attemptId) ||
      attemptId <= 0
    ) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = warnBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }

    const [assessment] = await db
      .select()
      .from(assessmentsTable)
      .where(eq(assessmentsTable.id, assessmentId));
    if (!assessment) {
      res.status(404).json({ error: "Assessment not found" });
      return;
    }

    // Atomically increment the counter and decide on lockout under a row lock.
    const decision = await db.transaction(async (tx) => {
      const [attempt] = await tx
        .select()
        .from(assessmentAttemptsTable)
        .where(eq(assessmentAttemptsTable.id, attemptId))
        .for("update");
      if (
        !attempt ||
        attempt.userId !== userId ||
        attempt.assessmentId !== assessmentId
      ) {
        return { kind: "not_found" as const };
      }
      if (attempt.status !== "in_progress") {
        return {
          kind: "already_finalized" as const,
          warningCount: attempt.warningCount,
        };
      }
      const next = attempt.warningCount + 1;
      await tx
        .update(assessmentAttemptsTable)
        .set({ warningCount: next })
        .where(eq(assessmentAttemptsTable.id, attemptId));
      return {
        kind: "ok" as const,
        warningCount: next,
        locked: next >= assessment.maxWarnings,
      };
    });

    if (decision.kind === "not_found") {
      res.status(404).json({ error: "Attempt not found" });
      return;
    }
    if (decision.kind === "already_finalized") {
      res.status(200).json({
        warningCount: decision.warningCount,
        maxWarnings: assessment.maxWarnings,
        locked: true,
      });
      return;
    }

    if (decision.locked) {
      const result = await gradeAndFinalizeAttempt({
        userId,
        assessment,
        attemptId,
        answers: parsed.data.answers ?? [],
        status: "auto_submitted",
        terminationReason: "security_lockout",
      });
      if (result) {
        eventBus.emit("assessment.submitted", {
          type: "assessment.submitted",
          userId,
          assessmentId,
          attemptId,
          score: result.score,
        });
        await createAuditLog({
          userId,
          action: "assessment.security_lockout",
          entityType: "assessment_attempt",
          entityId: attemptId,
          ipAddress: req.ip,
          userAgent: req.get("user-agent") ?? undefined,
          metadata: {
            assessmentId,
            warningCount: decision.warningCount,
            maxWarnings: assessment.maxWarnings,
            reason: parsed.data.reason,
            percentage: result.percentage,
          },
        });
      }
    }

    res.json({
      warningCount: decision.warningCount,
      maxWarnings: assessment.maxWarnings,
      locked: decision.locked,
    });
  }
);

router.post(
  "/assessments/:id/submit",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const userId = req.user.userId;
    const assessmentId = Number(req.params["id"]);
    if (!Number.isInteger(assessmentId) || assessmentId <= 0) {
      res.status(400).json({ error: "Invalid assessment id" });
      return;
    }
    const parsed = genericSubmitBody.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const { answers, taskId, attemptId } = parsed.data;

    const [assessment] = await db
      .select()
      .from(assessmentsTable)
      .where(eq(assessmentsTable.id, assessmentId));
    if (!assessment || !assessment.isActive) {
      res.status(404).json({ error: "Assessment not found" });
      return;
    }

    const ctx = await resolveTaskContext(userId, assessmentId, taskId);
    if (!ctx.ok) {
      res.status(ctx.status).json(ctx.body);
      return;
    }
    const { task, assignment } = ctx;

    // ── Resolve the attempt to finalize ──
    let finalizeAttemptId: number;
    if (attemptId !== undefined) {
      // Finalize the attempt opened by POST /start. The limit was already
      // enforced there; the helper rejects a non-in-progress / foreign attempt.
      finalizeAttemptId = attemptId;
    } else {
      // Legacy single-shot path: atomically resume the single in-progress
      // attempt (if the student opened one via /start) or create one under the
      // retry limit. Reusing the in-progress attempt — instead of always
      // creating a new one — closes the mixed-flow bypass where an open
      // started attempt plus a legacy submit could exceed maxAttempts.
      const acquired = await acquireAttempt(userId, assessment);
      if (acquired.kind === "limit") {
        res.status(409).json({
          error: "No attempts remaining for this assessment",
          attemptsUsed: acquired.used,
          maxAttempts: acquired.limit,
        });
        return;
      }
      finalizeAttemptId = acquired.attempt.id;
    }

    const result = await gradeAndFinalizeAttempt({
      userId,
      assessment,
      attemptId: finalizeAttemptId,
      answers,
      status: "submitted",
      terminationReason: null,
      taskAssignmentId: assignment?.id,
    });
    if (!result) {
      res.status(409).json({
        error: "This attempt has already been submitted or is not available",
      });
      return;
    }

    eventBus.emit("assessment.submitted", {
      type: "assessment.submitted",
      userId,
      assessmentId,
      attemptId: result.attemptId,
      score: result.score,
    });

    const attemptsUsed = await countSubmittedAttempts(userId, assessmentId);
    res.json({
      attemptId: result.attemptId,
      score: result.score,
      totalMarks: result.totalMarks,
      percentage: result.percentage,
      passed: result.passed,
      feedback: result.feedback,
      attemptsUsed,
      maxAttempts: task?.maxAttempts ?? assessment.maxAttempts ?? null,
    });
  }
);

export default router;
