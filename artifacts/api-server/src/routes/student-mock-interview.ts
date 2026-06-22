import { Router } from "express";
import { eq, and, desc, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  mockInterviewTemplatesTable,
  mockInterviewAssignmentsTable,
  aiInterviewsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";
import { generateJSON, getProviderName } from "../lib/ai";
import { trackName, mockInterviewQuestions } from "../lib/ai/mock-content";

const router = Router();

function ip(req: AuthRequest): string {
  const f = req.headers["x-forwarded-for"];
  if (typeof f === "string") return f.split(",")[0].trim();
  return req.socket.remoteAddress ?? "unknown";
}

interface StoredQuestion {
  index: number;
  question: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// List assigned mock interviews for the current student.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/student/mock-interviews",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    const studentId = req.user!.userId;
    const assignments = await db
      .select()
      .from(mockInterviewAssignmentsTable)
      .where(eq(mockInterviewAssignmentsTable.studentId, studentId))
      .orderBy(desc(mockInterviewAssignmentsTable.createdAt));

    const templateIds = [...new Set(assignments.map((a) => a.templateId))];
    const templates = templateIds.length
      ? await db
          .select()
          .from(mockInterviewTemplatesTable)
          .where(inArray(mockInterviewTemplatesTable.id, templateIds))
      : [];
    const tplMap = new Map(templates.map((t) => [t.id, t]));

    res.json(
      assignments.map((a) => {
        const t = tplMap.get(a.templateId);
        return {
          assignmentId: a.id,
          templateId: a.templateId,
          title: t?.title ?? "Mock Interview",
          description: t?.description ?? null,
          careerTrack: t?.careerTrack ?? null,
          interviewType: t?.interviewType ?? null,
          difficulty: t?.difficulty ?? null,
          totalQuestions: t?.totalQuestions ?? null,
          durationMin: t?.durationMin ?? null,
          allowVoice: t?.allowVoice ?? true,
          instructions: t?.instructions ?? null,
          status: a.status,
          score: a.score ?? null,
          dueAt: a.dueAt?.toISOString() ?? null,
          startedAt: a.startedAt?.toISOString() ?? null,
          completedAt: a.completedAt?.toISOString() ?? null,
          interviewId: a.interviewId ?? null,
        };
      })
    );
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Start an assigned mock interview — materializes questions from the template
// and creates the linked ai_interviews attempt. The existing
// /ai/interview/:id/answer + /finish flow drives the rest.
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/student/mock-interviews/:assignmentId/start",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    const studentId = req.user!.userId;
    const assignmentId = Number(req.params.assignmentId);
    if (!Number.isInteger(assignmentId)) {
      res.status(400).json({ error: "Invalid assignment id" });
      return;
    }

    const assignment = await db.query.mockInterviewAssignmentsTable.findFirst({
      where: eq(mockInterviewAssignmentsTable.id, assignmentId),
    });
    if (!assignment) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }
    if (assignment.studentId !== studentId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    // If already started, return the existing attempt (idempotent resume).
    if (assignment.interviewId) {
      const existing = await db.query.aiInterviewsTable.findFirst({
        where: eq(aiInterviewsTable.id, assignment.interviewId),
      });
      if (existing) {
        const qs = Array.isArray(existing.questions)
          ? (existing.questions as StoredQuestion[])
          : [];
        const answered = Array.isArray(existing.answers)
          ? existing.answers.length
          : 0;
        res.status(200).json({
          interviewId: existing.id,
          resumed: true,
          status: existing.status,
          totalQuestions: existing.totalQuestions,
          index: answered < qs.length ? answered : null,
          question: answered < qs.length ? qs[answered]?.question ?? "" : null,
        });
        return;
      }
    }

    const template = await db.query.mockInterviewTemplatesTable.findFirst({
      where: eq(mockInterviewTemplatesTable.id, assignment.templateId),
    });
    if (!template) {
      res.status(404).json({ error: "Template not found" });
      return;
    }

    // Materialize questions from the template's configured source.
    const total = template.totalQuestions;
    const name = trackName(template.careerTrack);
    let questionTexts: string[] = [];
    let provider = "config";

    if (template.questionSource === "custom") {
      const custom = Array.isArray(template.customQuestions)
        ? (template.customQuestions as StoredQuestion[])
        : [];
      questionTexts = custom
        .slice()
        .sort((a, b) => a.index - b.index)
        .map((q) => q.question);
    } else if (template.questionSource === "bank") {
      const { questionBankTable } = await import("@workspace/db");
      const rows = template.questionBankIds.length
        ? await db
            .select({
              id: questionBankTable.id,
              questionText: questionBankTable.questionText,
            })
            .from(questionBankTable)
            .where(inArray(questionBankTable.id, template.questionBankIds))
        : [];
      const byId = new Map(rows.map((r) => [r.id, r.questionText]));
      questionTexts = template.questionBankIds
        .map((qid) => byId.get(qid))
        .filter((q): q is string => typeof q === "string");
    }

    // AI source, or fallback when configured questions came up short.
    if (questionTexts.length < total) {
      const skills = template.focusSkills.length
        ? ` Focus on: ${template.focusSkills.join(", ")}.`
        : "";
      const need = total - questionTexts.length;
      const { data: generated, provider: aiProvider } = await generateJSON<{
        questions: string[];
      }>({
        system: `You are a senior ${name} interviewer in India conducting a ${template.interviewType} interview. Produce realistic ${template.difficulty} questions, ordered warm-up to hard.${skills}`,
        user: `Generate exactly ${need} ${template.difficulty} ${template.interviewType} interview questions for a ${name} candidate. Return JSON object: {"questions": ["...", "..."]} with exactly ${need} strings.`,
        maxTokens: 1500,
        validate: (v): v is { questions: string[] } => {
          const q = (v as { questions?: unknown })?.questions;
          return Array.isArray(q) && q.length > 0 && q.every((x) => typeof x === "string");
        },
        mock: () => ({ questions: mockInterviewQuestions(template.careerTrack, need) }),
      });
      provider = aiProvider;
      questionTexts = [...questionTexts, ...generated.questions].slice(0, total);
    }

    questionTexts = questionTexts.slice(0, total);
    if (questionTexts.length === 0) {
      res.status(409).json({ error: "Could not assemble interview questions" });
      return;
    }

    const questions: StoredQuestion[] = questionTexts.map((q, i) => ({
      index: i,
      question: q,
    }));

    const [created] = await db
      .insert(aiInterviewsTable)
      .values({
        userId: studentId,
        status: "in_progress",
        interviewType: template.allowVoice ? "voice" : "text",
        difficulty: template.difficulty,
        totalQuestions: questions.length,
        templateId: template.id,
        assignmentId: assignment.id,
        assignedBy: assignment.assignedBy,
        questions,
        answers: [],
        startedAt: new Date(),
      })
      .returning();

    await db
      .update(mockInterviewAssignmentsTable)
      .set({
        status: "in_progress",
        interviewId: created.id,
        startedAt: new Date(),
      })
      .where(eq(mockInterviewAssignmentsTable.id, assignment.id));

    await createAuditLog({
      userId: studentId,
      action: "student.mock_interview.start",
      entityType: "mock_interview_assignment",
      entityId: assignment.id,
      ipAddress: ip(req),
      metadata: {
        templateId: template.id,
        interviewId: created.id,
        provider,
        source: template.questionSource,
      },
    });

    res.status(201).json({
      interviewId: created.id,
      resumed: false,
      status: created.status,
      totalQuestions: questions.length,
      trackName: name,
      index: 0,
      question: questions[0]?.question ?? "",
    });
  }
);

export default router;
