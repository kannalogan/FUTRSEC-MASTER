import { Router } from "express";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  mockInterviewTemplatesTable,
  mockInterviewAssignmentsTable,
  aiInterviewsTable,
  questionBankTable,
  mentorStudentsTable,
  batchesTable,
  usersTable,
} from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";
import { generateJSON, getProviderName } from "../lib/ai";
import { trackName, mockInterviewQuestions } from "../lib/ai/mock-content";
import {
  getMentorTracks,
  getMentorBatchIds,
} from "../lib/question-bank";
import { getMentorStudentIds, mentorOwnsStudent } from "../lib/mentor";
import { z } from "zod/v4";

const router = Router();
const guards = [requireAuth, requireRole("mentor")];

const TRACKS = ["soc", "vapt", "grc"] as const;
const INTERVIEW_TYPES = [
  "technical",
  "hr",
  "scenario",
  "practical",
  "viva",
  "mixed",
] as const;
const DIFFICULTIES = ["beginner", "intermediate", "advanced", "expert"] as const;
const SOURCES = ["ai", "bank", "custom"] as const;

function ip(req: AuthRequest): string {
  const f = req.headers["x-forwarded-for"];
  if (typeof f === "string") return f.split(",")[0].trim();
  return req.socket.remoteAddress ?? "unknown";
}

// ─────────────────────────────────────────────────────────────────────────────
// Zod
// ─────────────────────────────────────────────────────────────────────────────
const customQuestionSchema = z.object({
  index: z.number().int().min(0),
  question: z.string().trim().min(3).max(8000),
});

const templateBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional(),
  careerTrack: z.enum(TRACKS),
  interviewType: z.enum(INTERVIEW_TYPES).default("technical"),
  difficulty: z.enum(DIFFICULTIES).default("intermediate"),
  totalQuestions: z.number().int().min(3).max(30).default(10),
  durationMin: z.number().int().min(5).max(240).default(30),
  rounds: z.number().int().min(1).max(5).default(1),
  passingScore: z.number().int().min(0).max(100).default(60),
  allowVoice: z.boolean().default(true),
  questionSource: z.enum(SOURCES).default("ai"),
  questionBankIds: z.array(z.number().int().positive()).max(100).default([]),
  customQuestions: z.array(customQuestionSchema).max(50).optional(),
  focusSkills: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  instructions: z.string().trim().max(8000).optional(),
  scheduledAt: z.string().datetime().optional(),
  deadline: z.string().datetime().optional(),
});

const templateUpdateSchema = templateBodySchema.partial();

const assignSchema = z.object({
  mode: z.enum(["students", "batches", "all", "track"]),
  studentIds: z.array(z.number().int().positive()).max(500).optional(),
  batchIds: z.array(z.number().int().positive()).max(100).optional(),
  dueAt: z.string().datetime().optional(),
});

const aiGenerateSchema = z.object({
  careerTrack: z.enum(TRACKS),
  interviewType: z.enum(INTERVIEW_TYPES).default("technical"),
  difficulty: z.enum(DIFFICULTIES).default("intermediate"),
  count: z.number().int().min(3).max(30).default(10),
  focusSkills: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Serialization
// ─────────────────────────────────────────────────────────────────────────────
type TemplateRow = typeof mockInterviewTemplatesTable.$inferSelect;

function serializeTemplate(t: TemplateRow) {
  return {
    id: t.id,
    createdBy: t.createdBy,
    title: t.title,
    description: t.description,
    careerTrack: t.careerTrack,
    interviewType: t.interviewType,
    difficulty: t.difficulty,
    status: t.status,
    totalQuestions: t.totalQuestions,
    durationMin: t.durationMin,
    rounds: t.rounds,
    passingScore: t.passingScore,
    allowVoice: t.allowVoice,
    questionSource: t.questionSource,
    questionBankIds: t.questionBankIds,
    customQuestions: t.customQuestions ?? null,
    focusSkills: t.focusSkills,
    instructions: t.instructions,
    scheduledAt: t.scheduledAt?.toISOString() ?? null,
    deadline: t.deadline?.toISOString() ?? null,
    publishedAt: t.publishedAt?.toISOString() ?? null,
    archivedAt: t.archivedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

/** Load a template and enforce mentor ownership + track membership. */
async function loadOwnedTemplate(
  mentorId: number,
  id: number
): Promise<TemplateRow | { error: number }> {
  const t = await db.query.mockInterviewTemplatesTable.findFirst({
    where: eq(mockInterviewTemplatesTable.id, id),
  });
  if (!t) return { error: 404 };
  if (t.createdBy !== mentorId) return { error: 403 };
  const tracks = await getMentorTracks(mentorId);
  if (!tracks.includes(t.careerTrack)) return { error: 403 };
  return t;
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics (must precede /:id)
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/mentor/mock-interviews/analytics",
  ...guards,
  async (req: AuthRequest, res): Promise<void> => {
    const mentorId = req.user!.userId;
    const templates = await db
      .select()
      .from(mockInterviewTemplatesTable)
      .where(eq(mockInterviewTemplatesTable.createdBy, mentorId));
    const templateIds = templates.map((t) => t.id);

    const assignments = templateIds.length
      ? await db
          .select()
          .from(mockInterviewAssignmentsTable)
          .where(inArray(mockInterviewAssignmentsTable.templateId, templateIds))
      : [];

    const byStatus: Record<string, number> = {};
    let completed = 0;
    let scoreSum = 0;
    let scoreCount = 0;
    for (const a of assignments) {
      byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
      if (a.status === "completed") completed += 1;
      if (typeof a.score === "number") {
        scoreSum += a.score;
        scoreCount += 1;
      }
    }

    // Per-track template + assignment breakdown.
    const byTrack: Record<string, { templates: number; assignments: number }> =
      {};
    const tplTrack = new Map<number, string>();
    for (const t of templates) {
      tplTrack.set(t.id, t.careerTrack);
      byTrack[t.careerTrack] = byTrack[t.careerTrack] ?? {
        templates: 0,
        assignments: 0,
      };
      byTrack[t.careerTrack].templates += 1;
    }
    for (const a of assignments) {
      const tr = tplTrack.get(a.templateId);
      if (tr && byTrack[tr]) byTrack[tr].assignments += 1;
    }

    res.json({
      totalTemplates: templates.length,
      publishedTemplates: templates.filter((t) => t.status === "published")
        .length,
      totalAssignments: assignments.length,
      completedAssignments: completed,
      completionRate: assignments.length
        ? Math.round((completed / assignments.length) * 100)
        : 0,
      averageScore: scoreCount ? Math.round(scoreSum / scoreCount) : null,
      byStatus,
      byTrack,
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// AI question generator (template builder helper; precede /:id)
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/mentor/mock-interviews/ai/generate-questions",
  ...guards,
  async (req: AuthRequest, res): Promise<void> => {
    const mentorId = req.user!.userId;
    const parsed = aiGenerateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const body = parsed.data;
    const tracks = await getMentorTracks(mentorId);
    if (!tracks.includes(body.careerTrack)) {
      res.status(403).json({ error: "You cannot author for this track" });
      return;
    }

    const name = trackName(body.careerTrack);
    const skills = body.focusSkills?.length
      ? ` Focus on these skills: ${body.focusSkills.join(", ")}.`
      : "";
    const { data: generated, provider } = await generateJSON<{ questions: string[] }>({
      system: `You are a senior ${name} interviewer in India conducting a ${body.interviewType} interview. Produce realistic ${body.difficulty} questions, ordered warm-up to hard.${skills}`,
      user: `Generate exactly ${body.count} ${body.difficulty} ${body.interviewType} interview questions for a ${name} candidate. Return JSON object: {"questions": ["...", "..."]} with exactly ${body.count} question strings.`,
      maxTokens: 1500,
      validate: (v): v is { questions: string[] } => {
        const q = (v as { questions?: unknown })?.questions;
        return Array.isArray(q) && q.length > 0 && q.every((x) => typeof x === "string");
      },
      mock: () => ({ questions: mockInterviewQuestions(body.careerTrack, body.count) }),
    });

    const questions = generated.questions
      .slice(0, body.count)
      .map((q, i) => ({ index: i, question: q }));

    res.json({ provider, count: questions.length, questions });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// List templates (with assignment stats)
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/mentor/mock-interviews",
  ...guards,
  async (req: AuthRequest, res): Promise<void> => {
    const mentorId = req.user!.userId;
    const status = typeof req.query.status === "string" ? req.query.status : "";
    const track = typeof req.query.track === "string" ? req.query.track : "";

    const conds = [eq(mockInterviewTemplatesTable.createdBy, mentorId)];
    if (status) conds.push(eq(mockInterviewTemplatesTable.status, status as never));
    if (track)
      conds.push(eq(mockInterviewTemplatesTable.careerTrack, track as never));

    const templates = await db
      .select()
      .from(mockInterviewTemplatesTable)
      .where(and(...conds))
      .orderBy(desc(mockInterviewTemplatesTable.createdAt));

    const templateIds = templates.map((t) => t.id);
    const stats = new Map<
      number,
      { total: number; completed: number; avgScore: number | null }
    >();
    if (templateIds.length) {
      const rows = await db
        .select({
          templateId: mockInterviewAssignmentsTable.templateId,
          total: sql<number>`count(*)::int`,
          completed: sql<number>`count(*) filter (where ${mockInterviewAssignmentsTable.status} = 'completed')::int`,
          avgScore: sql<number | null>`round(avg(${mockInterviewAssignmentsTable.score}))::int`,
        })
        .from(mockInterviewAssignmentsTable)
        .where(inArray(mockInterviewAssignmentsTable.templateId, templateIds))
        .groupBy(mockInterviewAssignmentsTable.templateId);
      for (const r of rows)
        stats.set(r.templateId, {
          total: r.total,
          completed: r.completed,
          avgScore: r.avgScore ?? null,
        });
    }

    res.json(
      templates.map((t) => ({
        ...serializeTemplate(t),
        stats:
          stats.get(t.id) ?? { total: 0, completed: 0, avgScore: null },
      }))
    );
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Create template (draft)
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/mentor/mock-interviews",
  ...guards,
  async (req: AuthRequest, res): Promise<void> => {
    const mentorId = req.user!.userId;
    const parsed = templateBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const body = parsed.data;

    const tracks = await getMentorTracks(mentorId);
    if (!tracks.includes(body.careerTrack)) {
      res.status(403).json({ error: "You cannot author for this track" });
      return;
    }

    // Validate question sourcing.
    if (body.questionSource === "bank") {
      if (body.questionBankIds.length === 0) {
        res.status(400).json({ error: "Select at least one bank question" });
        return;
      }
      const found = await db
        .select({ id: questionBankTable.id })
        .from(questionBankTable)
        .where(
          and(
            inArray(questionBankTable.id, body.questionBankIds),
            eq(questionBankTable.careerTrack, body.careerTrack)
          )
        );
      if (found.length !== new Set(body.questionBankIds).size) {
        res
          .status(400)
          .json({ error: "Some bank questions are invalid or off-track" });
        return;
      }
    }
    if (
      body.questionSource === "custom" &&
      (!body.customQuestions || body.customQuestions.length === 0)
    ) {
      res.status(400).json({ error: "Add at least one custom question" });
      return;
    }

    const [created] = await db
      .insert(mockInterviewTemplatesTable)
      .values({
        createdBy: mentorId,
        title: body.title,
        description: body.description,
        careerTrack: body.careerTrack,
        interviewType: body.interviewType,
        difficulty: body.difficulty,
        status: "draft",
        totalQuestions: body.totalQuestions,
        durationMin: body.durationMin,
        rounds: body.rounds,
        passingScore: body.passingScore,
        allowVoice: body.allowVoice,
        questionSource: body.questionSource,
        questionBankIds: body.questionBankIds,
        customQuestions: body.customQuestions ?? null,
        focusSkills: body.focusSkills,
        instructions: body.instructions,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        deadline: body.deadline ? new Date(body.deadline) : null,
      })
      .returning();

    await createAuditLog({
      userId: mentorId,
      action: "mentor.mock_interview.create",
      entityType: "mock_interview_template",
      entityId: created.id,
      ipAddress: ip(req),
      metadata: { track: body.careerTrack, type: body.interviewType },
    });

    res.status(201).json(serializeTemplate(created));
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Get one template (+ assignments)
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/mentor/mock-interviews/:id",
  ...guards,
  async (req: AuthRequest, res): Promise<void> => {
    const mentorId = req.user!.userId;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid template id" });
      return;
    }
    const t = await loadOwnedTemplate(mentorId, id);
    if ("error" in t) {
      res.status(t.error).json({ error: t.error === 404 ? "Not found" : "Access denied" });
      return;
    }
    res.json(serializeTemplate(t));
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Update template (own; draft or published)
// ─────────────────────────────────────────────────────────────────────────────
router.patch(
  "/mentor/mock-interviews/:id",
  ...guards,
  async (req: AuthRequest, res): Promise<void> => {
    const mentorId = req.user!.userId;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid template id" });
      return;
    }
    const t = await loadOwnedTemplate(mentorId, id);
    if ("error" in t) {
      res.status(t.error).json({ error: t.error === 404 ? "Not found" : "Access denied" });
      return;
    }
    if (t.status === "archived") {
      res.status(409).json({ error: "Archived templates cannot be edited" });
      return;
    }
    const parsed = templateUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const body = parsed.data;

    // Track changes must remain within the mentor's allowed tracks.
    if (body.careerTrack) {
      const tracks = await getMentorTracks(mentorId);
      if (!tracks.includes(body.careerTrack)) {
        res.status(403).json({ error: "You cannot author for this track" });
        return;
      }
    }

    const [updated] = await db
      .update(mockInterviewTemplatesTable)
      .set({
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.careerTrack !== undefined ? { careerTrack: body.careerTrack } : {}),
        ...(body.interviewType !== undefined ? { interviewType: body.interviewType } : {}),
        ...(body.difficulty !== undefined ? { difficulty: body.difficulty } : {}),
        ...(body.totalQuestions !== undefined ? { totalQuestions: body.totalQuestions } : {}),
        ...(body.durationMin !== undefined ? { durationMin: body.durationMin } : {}),
        ...(body.rounds !== undefined ? { rounds: body.rounds } : {}),
        ...(body.passingScore !== undefined ? { passingScore: body.passingScore } : {}),
        ...(body.allowVoice !== undefined ? { allowVoice: body.allowVoice } : {}),
        ...(body.questionSource !== undefined ? { questionSource: body.questionSource } : {}),
        ...(body.questionBankIds !== undefined ? { questionBankIds: body.questionBankIds } : {}),
        ...(body.customQuestions !== undefined ? { customQuestions: body.customQuestions } : {}),
        ...(body.focusSkills !== undefined ? { focusSkills: body.focusSkills } : {}),
        ...(body.instructions !== undefined ? { instructions: body.instructions } : {}),
        ...(body.scheduledAt !== undefined ? { scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null } : {}),
        ...(body.deadline !== undefined ? { deadline: body.deadline ? new Date(body.deadline) : null } : {}),
      })
      .where(eq(mockInterviewTemplatesTable.id, id))
      .returning();

    await createAuditLog({
      userId: mentorId,
      action: "mentor.mock_interview.update",
      entityType: "mock_interview_template",
      entityId: id,
      ipAddress: ip(req),
      metadata: { fields: Object.keys(body) },
    });

    res.json(serializeTemplate(updated));
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Publish template
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/mentor/mock-interviews/:id/publish",
  ...guards,
  async (req: AuthRequest, res): Promise<void> => {
    const mentorId = req.user!.userId;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid template id" });
      return;
    }
    const t = await loadOwnedTemplate(mentorId, id);
    if ("error" in t) {
      res.status(t.error).json({ error: t.error === 404 ? "Not found" : "Access denied" });
      return;
    }
    if (t.status === "published") {
      res.json(serializeTemplate(t));
      return;
    }
    if (t.status === "archived") {
      res.status(409).json({ error: "Archived templates cannot be published" });
      return;
    }
    const [updated] = await db
      .update(mockInterviewTemplatesTable)
      .set({ status: "published", publishedAt: new Date() })
      .where(eq(mockInterviewTemplatesTable.id, id))
      .returning();

    await createAuditLog({
      userId: mentorId,
      action: "mentor.mock_interview.publish",
      entityType: "mock_interview_template",
      entityId: id,
      ipAddress: ip(req),
      metadata: {},
    });
    res.json(serializeTemplate(updated));
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Delete template (only if no assignments yet)
// ─────────────────────────────────────────────────────────────────────────────
router.delete(
  "/mentor/mock-interviews/:id",
  ...guards,
  async (req: AuthRequest, res): Promise<void> => {
    const mentorId = req.user!.userId;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid template id" });
      return;
    }
    const t = await loadOwnedTemplate(mentorId, id);
    if ("error" in t) {
      res.status(t.error).json({ error: t.error === 404 ? "Not found" : "Access denied" });
      return;
    }
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(mockInterviewAssignmentsTable)
      .where(eq(mockInterviewAssignmentsTable.templateId, id));
    if (count > 0) {
      // Soft-archive instead of destroying assignment history.
      await db
        .update(mockInterviewTemplatesTable)
        .set({ status: "archived", archivedAt: new Date() })
        .where(eq(mockInterviewTemplatesTable.id, id));
      await createAuditLog({
        userId: mentorId,
        action: "mentor.mock_interview.archive",
        entityType: "mock_interview_template",
        entityId: id,
        ipAddress: ip(req),
        metadata: { reason: "has_assignments" },
      });
      res.json({ archived: true });
      return;
    }
    await db
      .delete(mockInterviewTemplatesTable)
      .where(eq(mockInterviewTemplatesTable.id, id));
    await createAuditLog({
      userId: mentorId,
      action: "mentor.mock_interview.delete",
      entityType: "mock_interview_template",
      entityId: id,
      ipAddress: ip(req),
      metadata: {},
    });
    res.json({ deleted: true });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Assign template to students / batches / cohort
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/mentor/mock-interviews/:id/assign",
  ...guards,
  async (req: AuthRequest, res): Promise<void> => {
    const mentorId = req.user!.userId;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid template id" });
      return;
    }
    const t = await loadOwnedTemplate(mentorId, id);
    if ("error" in t) {
      res.status(t.error).json({ error: t.error === 404 ? "Not found" : "Access denied" });
      return;
    }
    if (t.status !== "published") {
      res.status(409).json({ error: "Publish the template before assigning" });
      return;
    }
    const parsed = assignSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const body = parsed.data;

    // Resolve candidate student IDs scoped to the mentor.
    let candidateIds: number[] = [];
    if (body.mode === "students") {
      if (!body.studentIds?.length) {
        res.status(400).json({ error: "studentIds required" });
        return;
      }
      for (const sid of body.studentIds) {
        if (!(await mentorOwnsStudent(mentorId, sid))) {
          res.status(403).json({ error: `Student ${sid} is not assigned to you` });
          return;
        }
      }
      candidateIds = body.studentIds;
    } else if (body.mode === "batches") {
      if (!body.batchIds?.length) {
        res.status(400).json({ error: "batchIds required" });
        return;
      }
      const ownedBatches = await getMentorBatchIds(mentorId);
      const ownedSet = new Set(ownedBatches);
      for (const bid of body.batchIds) {
        if (!ownedSet.has(bid)) {
          res.status(403).json({ error: `Batch ${bid} is not yours` });
          return;
        }
      }
      const rows = await db
        .select({ studentId: mentorStudentsTable.studentId })
        .from(mentorStudentsTable)
        .where(
          and(
            eq(mentorStudentsTable.mentorId, mentorId),
            inArray(mentorStudentsTable.batchId, body.batchIds)
          )
        );
      candidateIds = rows.map((r) => r.studentId);
    } else {
      // all | track — every student assigned to this mentor.
      candidateIds = await getMentorStudentIds(mentorId);
    }

    candidateIds = [...new Set(candidateIds)];
    if (candidateIds.length === 0) {
      res.status(400).json({ error: "No students matched the selection" });
      return;
    }

    // Track isolation: only students whose career_track matches the template.
    const studentRows = await db
      .select({ id: usersTable.id, track: usersTable.careerTrack })
      .from(usersTable)
      .where(inArray(usersTable.id, candidateIds));
    const eligibleIds = studentRows
      .filter((s) => s.track === t.careerTrack)
      .map((s) => s.id);

    if (eligibleIds.length === 0) {
      res.status(400).json({
        error: `No selected students are on the ${t.careerTrack.toUpperCase()} track`,
      });
      return;
    }

    const dueAt = body.dueAt ? new Date(body.dueAt) : t.deadline;

    const inserted = await db
      .insert(mockInterviewAssignmentsTable)
      .values(
        eligibleIds.map((sid) => ({
          templateId: id,
          studentId: sid,
          assignedBy: mentorId,
          status: "assigned" as const,
          dueAt: dueAt ?? null,
        }))
      )
      .onConflictDoNothing({
        target: [
          mockInterviewAssignmentsTable.templateId,
          mockInterviewAssignmentsTable.studentId,
        ],
      })
      .returning({ id: mockInterviewAssignmentsTable.id, studentId: mockInterviewAssignmentsTable.studentId });

    await createAuditLog({
      userId: mentorId,
      action: "mentor.mock_interview.assign",
      entityType: "mock_interview_template",
      entityId: id,
      ipAddress: ip(req),
      metadata: {
        mode: body.mode,
        eligible: eligibleIds.length,
        created: inserted.length,
        skippedTrackMismatch: candidateIds.length - eligibleIds.length,
      },
    });

    res.status(201).json({
      assigned: inserted.length,
      alreadyAssigned: eligibleIds.length - inserted.length,
      skippedTrackMismatch: candidateIds.length - eligibleIds.length,
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Results — assignments + scores + transcripts (assigned students only)
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/mentor/mock-interviews/:id/results",
  ...guards,
  async (req: AuthRequest, res): Promise<void> => {
    const mentorId = req.user!.userId;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid template id" });
      return;
    }
    const t = await loadOwnedTemplate(mentorId, id);
    if ("error" in t) {
      res.status(t.error).json({ error: t.error === 404 ? "Not found" : "Access denied" });
      return;
    }

    const assignments = await db
      .select()
      .from(mockInterviewAssignmentsTable)
      .where(eq(mockInterviewAssignmentsTable.templateId, id))
      .orderBy(desc(mockInterviewAssignmentsTable.createdAt));

    const studentIds = [...new Set(assignments.map((a) => a.studentId))];
    const interviewIds = assignments
      .map((a) => a.interviewId)
      .filter((x): x is number => typeof x === "number");

    const [students, interviews] = await Promise.all([
      studentIds.length
        ? db
            .select({
              id: usersTable.id,
              fullName: usersTable.fullName,
              email: usersTable.email,
            })
            .from(usersTable)
            .where(inArray(usersTable.id, studentIds))
        : Promise.resolve([]),
      interviewIds.length
        ? db
            .select()
            .from(aiInterviewsTable)
            .where(inArray(aiInterviewsTable.id, interviewIds))
        : Promise.resolve([]),
    ]);

    const studentMap = new Map(students.map((s) => [s.id, s]));
    const interviewMap = new Map(interviews.map((i) => [i.id, i]));

    res.json({
      template: serializeTemplate(t),
      results: assignments.map((a) => {
        const s = studentMap.get(a.studentId);
        const iv = a.interviewId ? interviewMap.get(a.interviewId) : undefined;
        return {
          assignmentId: a.id,
          studentId: a.studentId,
          studentName: s?.fullName ?? null,
          studentEmail: s?.email ?? null,
          status: a.status,
          score: a.score ?? null,
          dueAt: a.dueAt?.toISOString() ?? null,
          startedAt: a.startedAt?.toISOString() ?? null,
          completedAt: a.completedAt?.toISOString() ?? null,
          interviewId: a.interviewId ?? null,
          evaluation: iv?.evaluation ?? null,
          transcript: iv
            ? { questions: iv.questions ?? [], answers: iv.answers ?? [] }
            : null,
        };
      }),
    });
  }
);

export default router;
