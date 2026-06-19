import { Router } from "express";
import { eq, and } from "drizzle-orm";
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
} from "@workspace/db";
import { SubmitPreAssessmentBody } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { eventBus } from "../lib/events";

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
          optionText: assessmentOptionsTable.optionText,
        })
        .from(assessmentOptionsTable)
        .where(eq(assessmentOptionsTable.questionId, q.id))
        .orderBy(assessmentOptionsTable.order);

      return {
        id: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
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
    const selectedIds = answer.selectedOptionIds.sort();
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

  res.json({
    attemptId: attempt.id,
    score: totalScore,
    totalMarks,
    percentage,
    passed,
    feedback,
    suggestedTrackLevel,
  });
});

export default router;
