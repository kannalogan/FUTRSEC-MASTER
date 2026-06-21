import { Router } from "express";
import { eq, and, desc, sql, count, inArray } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import {
  assessmentsTable,
  assessmentQuestionsTable,
  assessmentOptionsTable,
  tracksTable,
} from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";

const router = Router();

const adminGuards = [requireAuth, requireRole("admin")];

const ASSESSMENT_TYPES = [
  "pre_assessment",
  "module_quiz",
  "final_exam",
  "practice",
] as const;

const QUESTION_TYPES = ["mcq", "multi_select", "true_false", "code"] as const;

// Human-friendly assessment "kinds" mapped to the underlying enum. CP1-CP5 and
// mock interviews do not have dedicated enum values, so they map to final_exam /
// module_quiz while the human label is preserved in the assessment title.
const ASSESSMENT_KIND_MAP: Record<string, (typeof ASSESSMENT_TYPES)[number]> = {
  pre_assessment: "pre_assessment",
  module_quiz: "module_quiz",
  final_exam: "final_exam",
  practice: "practice",
  cp1: "module_quiz",
  cp2: "module_quiz",
  cp3: "module_quiz",
  cp4: "module_quiz",
  cp5: "final_exam",
  mock: "final_exam",
};

const createAssessmentSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(ASSESSMENT_TYPES).optional(),
  assessmentKind: z.string().min(1).max(40).optional(),
  trackId: z.number().int().positive().nullable().optional(),
  passingScore: z.number().int().min(0).max(100).optional(),
  durationMinutes: z.number().int().min(1).max(600).optional(),
  totalQuestions: z.number().int().min(0).optional(),
});

const updateAssessmentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  type: z.enum(ASSESSMENT_TYPES).optional(),
  assessmentKind: z.string().min(1).max(40).optional(),
  trackId: z.number().int().positive().nullable().optional(),
  passingScore: z.number().int().min(0).max(100).optional(),
  durationMinutes: z.number().int().min(1).max(600).optional(),
  isActive: z.boolean().optional(),
});

const optionSchema = z.object({
  optionText: z.string().min(1).max(2000),
  isCorrect: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

const createQuestionSchema = z.object({
  questionText: z.string().min(1).max(4000),
  questionType: z.enum(QUESTION_TYPES).optional(),
  explanation: z.string().max(4000).nullable().optional(),
  points: z.number().int().min(0).max(100).optional(),
  order: z.number().int().min(0).optional(),
  options: z.array(optionSchema).max(20).optional(),
});

const updateQuestionSchema = z.object({
  questionText: z.string().min(1).max(4000).optional(),
  questionType: z.enum(QUESTION_TYPES).optional(),
  explanation: z.string().max(4000).nullable().optional(),
  points: z.number().int().min(0).max(100).optional(),
  order: z.number().int().min(0).optional(),
  options: z.array(optionSchema).max(20).optional(),
});

function parseId(raw: string | string[]): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return parseInt(value, 10);
}

function ip(req: AuthRequest): string | undefined {
  return req.ip;
}

async function resolveTrackId(
  track: string,
): Promise<number | undefined> {
  // Accepts a numeric id or a track slug; returns the trackId or undefined if
  // no track matches the provided value.
  const asNumber = parseInt(track, 10);
  if (!isNaN(asNumber)) {
    const row = await db.query.tracksTable.findFirst({
      where: eq(tracksTable.id, asNumber),
    });
    return row ? row.id : undefined;
  }
  const row = await db.query.tracksTable.findFirst({
    where: eq(tracksTable.slug, track),
  });
  return row ? row.id : undefined;
}

async function validateTrackId(trackId: number): Promise<boolean> {
  const row = await db.query.tracksTable.findFirst({
    where: eq(tracksTable.id, trackId),
  });
  return !!row;
}

async function refreshTotalQuestions(assessmentId: number): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(assessmentQuestionsTable)
    .where(eq(assessmentQuestionsTable.assessmentId, assessmentId));
  const total = row?.value ?? 0;
  await db
    .update(assessmentsTable)
    .set({ totalQuestions: total })
    .where(eq(assessmentsTable.id, assessmentId));
  return total;
}

// GET /admin/assessments?track=&type= — list assessments
router.get(
  "/admin/assessments",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const conditions = [];

    if (typeof req.query.track === "string" && req.query.track.trim()) {
      const trackId = await resolveTrackId(req.query.track.trim());
      if (trackId === undefined) {
        res.json({ assessments: [] });
        return;
      }
      conditions.push(eq(assessmentsTable.trackId, trackId));
    }

    if (typeof req.query.type === "string" && req.query.type.trim()) {
      const mapped = ASSESSMENT_KIND_MAP[req.query.type.trim()];
      if (!mapped) {
        res.status(400).json({ error: "Invalid type filter" });
        return;
      }
      conditions.push(eq(assessmentsTable.type, mapped));
    }

    const where =
      conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: assessmentsTable.id,
        title: assessmentsTable.title,
        type: assessmentsTable.type,
        trackId: assessmentsTable.trackId,
        totalQuestions: assessmentsTable.totalQuestions,
        durationMinutes: assessmentsTable.durationMinutes,
        passingScore: assessmentsTable.passingScore,
        isActive: assessmentsTable.isActive,
        createdAt: assessmentsTable.createdAt,
        updatedAt: assessmentsTable.updatedAt,
        trackName: tracksTable.name,
        trackSlug: tracksTable.slug,
      })
      .from(assessmentsTable)
      .leftJoin(tracksTable, eq(tracksTable.id, assessmentsTable.trackId))
      .where(where)
      .orderBy(desc(assessmentsTable.createdAt))
      .limit(500);

    res.json({
      assessments: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  },
);

// POST /admin/assessments — create an assessment
router.post(
  "/admin/assessments",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const parsed = createAssessmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const d = parsed.data;

    let type: (typeof ASSESSMENT_TYPES)[number] | undefined = d.type;
    if (!type && d.assessmentKind) {
      type = ASSESSMENT_KIND_MAP[d.assessmentKind];
      if (!type) {
        res.status(400).json({ error: "Invalid assessmentKind" });
        return;
      }
    }
    if (!type) {
      res
        .status(400)
        .json({ error: "Either type or assessmentKind is required" });
      return;
    }

    if (d.trackId != null) {
      const ok = await validateTrackId(d.trackId);
      if (!ok) {
        res.status(400).json({ error: "trackId does not reference a track" });
        return;
      }
    }

    const [assessment] = await db
      .insert(assessmentsTable)
      .values({
        title: d.title,
        type,
        trackId: d.trackId ?? null,
        passingScore: d.passingScore ?? 70,
        durationMinutes: d.durationMinutes ?? 30,
        totalQuestions: d.totalQuestions ?? 0,
        isActive: true,
      })
      .returning();

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.assessment.created",
      entityType: "assessment",
      entityId: assessment.id,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { title: d.title, type, trackId: d.trackId ?? null },
    });

    res.status(201).json({
      assessment: {
        ...assessment,
        createdAt: assessment.createdAt.toISOString(),
        updatedAt: assessment.updatedAt.toISOString(),
      },
    });
  },
);

// GET /admin/assessments/:id — assessment + questions (with options)
router.get(
  "/admin/assessments/:id",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid assessment id" });
      return;
    }
    const assessment = await db.query.assessmentsTable.findFirst({
      where: eq(assessmentsTable.id, id),
    });
    if (!assessment) {
      res.status(404).json({ error: "Assessment not found" });
      return;
    }

    const questions = await db
      .select()
      .from(assessmentQuestionsTable)
      .where(eq(assessmentQuestionsTable.assessmentId, id))
      .orderBy(assessmentQuestionsTable.order);

    const questionIds = questions.map((q) => q.id);
    const optionsByQuestion = new Map<
      number,
      (typeof assessmentOptionsTable.$inferSelect)[]
    >();
    if (questionIds.length > 0) {
      const options = await db
        .select()
        .from(assessmentOptionsTable)
        .where(inArray(assessmentOptionsTable.questionId, questionIds))
        .orderBy(assessmentOptionsTable.order);
      for (const o of options) {
        const list = optionsByQuestion.get(o.questionId) ?? [];
        list.push(o);
        optionsByQuestion.set(o.questionId, list);
      }
    }

    res.json({
      assessment: {
        ...assessment,
        createdAt: assessment.createdAt.toISOString(),
        updatedAt: assessment.updatedAt.toISOString(),
      },
      questions: questions.map((q) => ({
        ...q,
        createdAt: q.createdAt.toISOString(),
        options: (optionsByQuestion.get(q.id) ?? []).map((o) => ({
          ...o,
          createdAt: o.createdAt.toISOString(),
        })),
      })),
    });
  },
);

// PATCH /admin/assessments/:id — edit assessment fields
router.patch(
  "/admin/assessments/:id",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const id = parseId(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid assessment id" });
      return;
    }
    const parsed = updateAssessmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const existing = await db.query.assessmentsTable.findFirst({
      where: eq(assessmentsTable.id, id),
    });
    if (!existing) {
      res.status(404).json({ error: "Assessment not found" });
      return;
    }
    const d = parsed.data;

    let type: (typeof ASSESSMENT_TYPES)[number] | undefined = d.type;
    if (!type && d.assessmentKind) {
      type = ASSESSMENT_KIND_MAP[d.assessmentKind];
      if (!type) {
        res.status(400).json({ error: "Invalid assessmentKind" });
        return;
      }
    }

    if (d.trackId != null) {
      const ok = await validateTrackId(d.trackId);
      if (!ok) {
        res.status(400).json({ error: "trackId does not reference a track" });
        return;
      }
    }

    const [updated] = await db
      .update(assessmentsTable)
      .set({
        ...(d.title !== undefined ? { title: d.title } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(d.trackId !== undefined ? { trackId: d.trackId } : {}),
        ...(d.passingScore !== undefined
          ? { passingScore: d.passingScore }
          : {}),
        ...(d.durationMinutes !== undefined
          ? { durationMinutes: d.durationMinutes }
          : {}),
        ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
      })
      .where(eq(assessmentsTable.id, id))
      .returning();

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.assessment.updated",
      entityType: "assessment",
      entityId: id,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { ...d },
    });

    res.json({
      assessment: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  },
);

// POST /admin/assessments/:id/activate — set isActive=true
router.post(
  "/admin/assessments/:id/activate",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const id = parseId(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid assessment id" });
      return;
    }
    const [updated] = await db
      .update(assessmentsTable)
      .set({ isActive: true })
      .where(eq(assessmentsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Assessment not found" });
      return;
    }
    await createAuditLog({
      userId: req.user.userId,
      action: "admin.assessment.activated",
      entityType: "assessment",
      entityId: id,
      ipAddress: ip(req),
    });
    res.json({
      assessment: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  },
);

// POST /admin/assessments/:id/deactivate — set isActive=false
router.post(
  "/admin/assessments/:id/deactivate",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const id = parseId(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid assessment id" });
      return;
    }
    const [updated] = await db
      .update(assessmentsTable)
      .set({ isActive: false })
      .where(eq(assessmentsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Assessment not found" });
      return;
    }
    await createAuditLog({
      userId: req.user.userId,
      action: "admin.assessment.deactivated",
      entityType: "assessment",
      entityId: id,
      ipAddress: ip(req),
    });
    res.json({
      assessment: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  },
);

// POST /admin/assessments/:id/questions — add a question (+ options) in a tx
router.post(
  "/admin/assessments/:id/questions",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const id = parseId(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid assessment id" });
      return;
    }
    const parsed = createQuestionSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const assessment = await db.query.assessmentsTable.findFirst({
      where: eq(assessmentsTable.id, id),
    });
    if (!assessment) {
      res.status(404).json({ error: "Assessment not found" });
      return;
    }
    const d = parsed.data;

    let order = d.order;
    if (order === undefined) {
      const [row] = await db
        .select({
          value: sql<number>`coalesce(max(${assessmentQuestionsTable.order}), -1)`,
        })
        .from(assessmentQuestionsTable)
        .where(eq(assessmentQuestionsTable.assessmentId, id));
      order = (row?.value ?? -1) + 1;
    }

    const result = await db.transaction(async (tx) => {
      const [question] = await tx
        .insert(assessmentQuestionsTable)
        .values({
          assessmentId: id,
          questionText: d.questionText,
          questionType: d.questionType ?? "mcq",
          explanation: d.explanation ?? null,
          points: d.points ?? 1,
          order: order!,
        })
        .returning();

      let insertedOptions: (typeof assessmentOptionsTable.$inferSelect)[] = [];
      if (d.options && d.options.length > 0) {
        insertedOptions = await tx
          .insert(assessmentOptionsTable)
          .values(
            d.options.map((o, idx) => ({
              questionId: question.id,
              optionText: o.optionText,
              isCorrect: o.isCorrect ?? false,
              order: o.order ?? idx,
            })),
          )
          .returning();
      }
      return { question, options: insertedOptions };
    });

    const totalQuestions = await refreshTotalQuestions(id);

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.assessment.question_added",
      entityType: "assessment",
      entityId: id,
      ipAddress: ip(req),
      metadata: { questionId: result.question.id },
    });

    res.status(201).json({
      question: {
        ...result.question,
        createdAt: result.question.createdAt.toISOString(),
        options: result.options.map((o) => ({
          ...o,
          createdAt: o.createdAt.toISOString(),
        })),
      },
      totalQuestions,
    });
  },
);

// PATCH /admin/assessment-questions/:qid — edit a question (+ replace options)
router.patch(
  "/admin/assessment-questions/:qid",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const qid = parseId(req.params.qid);
    if (isNaN(qid)) {
      res.status(400).json({ error: "Invalid question id" });
      return;
    }
    const parsed = updateQuestionSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const existing = await db.query.assessmentQuestionsTable.findFirst({
      where: eq(assessmentQuestionsTable.id, qid),
    });
    if (!existing) {
      res.status(404).json({ error: "Question not found" });
      return;
    }
    const d = parsed.data;

    const result = await db.transaction(async (tx) => {
      const [question] = await tx
        .update(assessmentQuestionsTable)
        .set({
          ...(d.questionText !== undefined
            ? { questionText: d.questionText }
            : {}),
          ...(d.questionType !== undefined
            ? { questionType: d.questionType }
            : {}),
          ...(d.explanation !== undefined
            ? { explanation: d.explanation }
            : {}),
          ...(d.points !== undefined ? { points: d.points } : {}),
          ...(d.order !== undefined ? { order: d.order } : {}),
        })
        .where(eq(assessmentQuestionsTable.id, qid))
        .returning();

      let options: (typeof assessmentOptionsTable.$inferSelect)[] | undefined;
      if (d.options !== undefined) {
        await tx
          .delete(assessmentOptionsTable)
          .where(eq(assessmentOptionsTable.questionId, qid));
        if (d.options.length > 0) {
          options = await tx
            .insert(assessmentOptionsTable)
            .values(
              d.options.map((o, idx) => ({
                questionId: qid,
                optionText: o.optionText,
                isCorrect: o.isCorrect ?? false,
                order: o.order ?? idx,
              })),
            )
            .returning();
        } else {
          options = [];
        }
      }
      return { question, options };
    });

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.assessment.question_updated",
      entityType: "assessment",
      entityId: existing.assessmentId,
      ipAddress: ip(req),
      metadata: { questionId: qid },
    });

    res.json({
      question: {
        ...result.question,
        createdAt: result.question.createdAt.toISOString(),
        ...(result.options !== undefined
          ? {
              options: result.options.map((o) => ({
                ...o,
                createdAt: o.createdAt.toISOString(),
              })),
            }
          : {}),
      },
    });
  },
);

// DELETE /admin/assessment-questions/:qid — delete a question (+ its options)
router.delete(
  "/admin/assessment-questions/:qid",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const qid = parseId(req.params.qid);
    if (isNaN(qid)) {
      res.status(400).json({ error: "Invalid question id" });
      return;
    }
    const existing = await db.query.assessmentQuestionsTable.findFirst({
      where: eq(assessmentQuestionsTable.id, qid),
    });
    if (!existing) {
      res.status(404).json({ error: "Question not found" });
      return;
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(assessmentOptionsTable)
        .where(eq(assessmentOptionsTable.questionId, qid));
      await tx
        .delete(assessmentQuestionsTable)
        .where(eq(assessmentQuestionsTable.id, qid));
    });

    const totalQuestions = await refreshTotalQuestions(existing.assessmentId);

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.assessment.question_deleted",
      entityType: "assessment",
      entityId: existing.assessmentId,
      ipAddress: ip(req),
      metadata: { questionId: qid },
    });

    res.json({ ok: true, totalQuestions });
  },
);

export default router;
