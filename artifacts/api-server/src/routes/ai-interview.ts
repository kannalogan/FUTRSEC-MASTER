import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  aiInterviewsTable,
  aiReportsTable,
  mockInterviewAssignmentsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { getUserCareerTrack } from "../lib/track-access";
import { createAuditLog } from "../lib/audit";
import { generateJSON, generateText, getProviderName } from "../lib/ai";
import {
  trackName,
  mockInterviewQuestions,
  mockInterviewEvaluation,
  type InterviewEvaluation,
} from "../lib/ai/mock-content";

const router = Router();

function getIp(req: AuthRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress ?? "unknown";
}
function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

interface StoredQuestion {
  index: number;
  question: string;
}
interface StoredAnswer {
  index: number;
  question: string;
  answer: string;
}

function asQuestions(v: unknown): StoredQuestion[] {
  return Array.isArray(v) ? (v as StoredQuestion[]) : [];
}
function asAnswers(v: unknown): StoredAnswer[] {
  return Array.isArray(v) ? (v as StoredAnswer[]) : [];
}

/* ----------------------------- Start ----------------------------- */

router.post("/ai/interview/start", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const track = await getUserCareerTrack(req.user.userId);
  const name = trackName(track);
  const interviewType: "text" | "voice" = req.body?.interviewType === "voice" ? "voice" : "text";
  const difficulty: "beginner" | "intermediate" | "advanced" =
    req.body?.difficulty === "advanced" ? "advanced" : req.body?.difficulty === "beginner" ? "beginner" : "intermediate";
  const countRaw = Number(req.body?.totalQuestions);
  const total = Number.isFinite(countRaw) ? Math.max(3, Math.min(8, Math.round(countRaw))) : 6;

  const { data: questionTexts } = await generateJSON<string[]>({
    system: `You are a senior ${name} interviewer in India. Produce realistic ${difficulty} interview questions, ordered from warm-up to hard. Mix conceptual and scenario-based.`,
    user: `Generate exactly ${total} ${difficulty} interview questions for a ${name} candidate. Return JSON: a plain array of ${total} question strings.`,
    maxTokens: 1000,
    validate: (v): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string") && v.length > 0,
    mock: () => mockInterviewQuestions(track, total),
  });

  const questions: StoredQuestion[] = questionTexts.slice(0, total).map((q, i) => ({ index: i, question: q }));

  const [created] = await db
    .insert(aiInterviewsTable)
    .values({
      userId: req.user.userId,
      status: "in_progress",
      interviewType,
      difficulty,
      totalQuestions: questions.length,
      questions,
      answers: [],
      startedAt: new Date(),
    })
    .returning();

  await createAuditLog({
    userId: req.user.userId,
    action: "ai.interview.start",
    entityType: "ai_interview",
    entityId: created.id,
    ipAddress: getIp(req),
    metadata: { interviewType, difficulty, total: questions.length, provider: getProviderName() },
  });

  res.status(201).json({
    interviewId: created.id,
    interviewType,
    difficulty,
    totalQuestions: questions.length,
    trackName: name,
    index: 0,
    question: questions[0]?.question ?? "",
  });
});

/* ----------------------------- Answer ---------------------------- */

router.post("/ai/interview/:id/answer", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid interview id" }); return; }

  const interview = await db.query.aiInterviewsTable.findFirst({ where: eq(aiInterviewsTable.id, id) });
  if (!interview) { res.status(404).json({ error: "Interview not found" }); return; }
  if (interview.userId !== req.user.userId) { res.status(403).json({ error: "Access denied" }); return; }
  if (interview.status !== "in_progress") { res.status(409).json({ error: "Interview is not in progress" }); return; }

  const answer = str(req.body?.answer).trim();
  if (!answer) { res.status(400).json({ error: "answer is required" }); return; }

  const questions = asQuestions(interview.questions);
  const answers = asAnswers(interview.answers);
  const nextIndex = answers.length;
  if (nextIndex >= questions.length) { res.status(409).json({ error: "All questions already answered" }); return; }

  answers.push({ index: nextIndex, question: questions[nextIndex].question, answer });
  await db.update(aiInterviewsTable).set({ answers }).where(eq(aiInterviewsTable.id, id));

  const done = answers.length >= questions.length;
  res.json({
    done,
    answered: answers.length,
    total: questions.length,
    index: done ? null : answers.length,
    question: done ? null : questions[answers.length].question,
  });
});

/* ----------------------------- Finish ---------------------------- */

router.post("/ai/interview/:id/finish", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid interview id" }); return; }

  const interview = await db.query.aiInterviewsTable.findFirst({ where: eq(aiInterviewsTable.id, id) });
  if (!interview) { res.status(404).json({ error: "Interview not found" }); return; }
  if (interview.userId !== req.user.userId) { res.status(403).json({ error: "Access denied" }); return; }

  // Idempotent: if already completed, return the stored evaluation.
  if (interview.status === "completed" && interview.evaluation) {
    res.json({ interviewId: id, overallScore: interview.overallScore, evaluation: interview.evaluation, provider: "stored" });
    return;
  }

  const answers = asAnswers(interview.answers);
  if (answers.length === 0) { res.status(400).json({ error: "Cannot evaluate an interview with no answers" }); return; }

  const track = await getUserCareerTrack(req.user.userId);
  const name = trackName(track);
  const qa = answers.map((a) => ({ question: a.question, answer: a.answer }));

  const { data: evaluation, provider } = await generateJSON<InterviewEvaluation>({
    system: `You are a senior ${name} interviewer evaluating a candidate in India. Score each dimension 0-100: technical, grammar, communication, confidence, thinking, quality. Be fair but rigorous.`,
    user: `Evaluate this interview transcript. Return JSON with keys: scores {technical,grammar,communication,confidence,thinking,quality}, overall (number 0-100), strengths (string[]), weaknesses (string[]), recommendations (string[]), perQuestion [{question,answer,score,feedback}].\n\nTRANSCRIPT:\n${JSON.stringify(qa).slice(0, 6000)}`,
    maxTokens: 2000,
    validate: (v): v is InterviewEvaluation =>
      typeof v === "object" && v !== null && typeof (v as InterviewEvaluation).overall === "number" && !!(v as InterviewEvaluation).scores,
    mock: () => mockInterviewEvaluation(qa),
  });

  const [updated] = await db
    .update(aiInterviewsTable)
    .set({ status: "completed", evaluation, overallScore: Math.round(evaluation.overall), completedAt: new Date() })
    .where(eq(aiInterviewsTable.id, id))
    .returning();

  // If this attempt belongs to a mentor-assigned mock interview, reflect the
  // result back onto the assignment so the mentor dashboard sees completion.
  if (interview.assignmentId) {
    await db
      .update(mockInterviewAssignmentsTable)
      .set({
        status: "completed",
        score: Math.round(evaluation.overall),
        completedAt: new Date(),
      })
      .where(eq(mockInterviewAssignmentsTable.id, interview.assignmentId));
  }

  try {
    await db.insert(aiReportsTable).values({
      userId: req.user.userId,
      entityType: "ai_interview",
      entityId: id,
      reportType: "interview_evaluation",
      content: JSON.stringify(evaluation),
      metadata: JSON.stringify({ provider, track, name }),
    });
  } catch (err) {
    req.log.warn({ err }, "Failed to persist interview report");
  }

  await createAuditLog({
    userId: req.user.userId,
    action: "ai.interview.finish",
    entityType: "ai_interview",
    entityId: id,
    ipAddress: getIp(req),
    metadata: { provider, overall: updated.overallScore },
  });

  res.json({ interviewId: id, overallScore: updated.overallScore, evaluation, provider });
});

/* ------------------------------ Get ------------------------------ */

router.get("/ai/interview/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid interview id" }); return; }

  const interview = await db.query.aiInterviewsTable.findFirst({ where: eq(aiInterviewsTable.id, id) });
  if (!interview) { res.status(404).json({ error: "Interview not found" }); return; }
  if (interview.userId !== req.user.userId && req.user.role !== "admin") {
    res.status(403).json({ error: "Access denied" }); return;
  }

  const questions = asQuestions(interview.questions);
  const answers = asAnswers(interview.answers);
  res.json({
    id: interview.id,
    status: interview.status,
    interviewType: interview.interviewType,
    difficulty: interview.difficulty,
    totalQuestions: interview.totalQuestions,
    answered: answers.length,
    questions,
    answers,
    evaluation: interview.evaluation ?? null,
    overallScore: interview.overallScore ?? null,
    startedAt: interview.startedAt?.toISOString() ?? null,
    completedAt: interview.completedAt?.toISOString() ?? null,
    createdAt: interview.createdAt.toISOString(),
  });
});

/* ------------------------------ List ----------------------------- */

router.get("/ai/interviews", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const rows = await db
    .select()
    .from(aiInterviewsTable)
    .where(eq(aiInterviewsTable.userId, req.user.userId))
    .orderBy(desc(aiInterviewsTable.createdAt))
    .limit(50);

  res.json(
    rows.map((r) => ({
      id: r.id,
      status: r.status,
      interviewType: r.interviewType,
      difficulty: r.difficulty,
      totalQuestions: r.totalQuestions,
      overallScore: r.overallScore ?? null,
      completedAt: r.completedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

export default router;
