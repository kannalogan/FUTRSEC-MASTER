import { Router, type Response, type NextFunction } from "express";
import { eq, and, inArray, desc } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import {
  usersTable,
  mentorProfilesTable,
  batchesTable,
  batchStudentsTable,
  mentorStudentsTable,
  mentorTasksTable,
  mentorTaskBatchesTable,
  mentorTaskAssignmentsTable,
  broadcastNotesTable,
  auditLogsTable,
  assessmentsTable,
  filesTable,
} from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";
import { signFileToken } from "../lib/storage/signed-url";
import {
  getMentorStudentIds,
  computeStudentMetrics,
  assessRisk,
  computeActivityHeatmap,
  resolveTaskAudience,
} from "../lib/mentor";

const router = Router();

const CAREER_TRACKS = ["soc", "vapt", "grc"] as const;

// Ensure the caller is an active mentor (deactivated mentors are locked out).
async function requireActiveMentor(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const me = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, req.user.userId),
  });
  if (!me || me.role !== "mentor") {
    res.status(403).json({ error: "Mentor access required" });
    return;
  }
  if (!me.isActive) {
    res.status(403).json({ error: "Your mentor account is deactivated" });
    return;
  }
  next();
}

function ip(req: AuthRequest): string | undefined {
  return req.ip;
}

const mentorGuards = [requireAuth, requireRole("mentor"), requireActiveMentor];

// ─────────────────────────────────────────────────────────────────────────────
// Overview
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/mentor/overview",
  ...mentorGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const mentorId = req.user!.userId;
    const studentIds = await getMentorStudentIds(mentorId);
    const metrics = await computeStudentMetrics(studentIds);

    const batches = await db
      .select({ id: batchesTable.id, status: batchesTable.status })
      .from(batchesTable)
      .where(eq(batchesTable.mentorId, mentorId));

    const tasks = await db
      .select({ id: mentorTasksTable.id, status: mentorTasksTable.status })
      .from(mentorTasksTable)
      .where(eq(mentorTasksTable.mentorId, mentorId));

    let atRisk = 0;
    let totalFts = 0;
    let trial = 0;
    for (const m of metrics.values()) {
      const r = assessRisk(m);
      if (r.riskLevel !== "low") atRisk += 1;
      totalFts += m.ftsTotal;
    }
    const trialRows = await db
      .select({ id: mentorStudentsTable.id })
      .from(mentorStudentsTable)
      .where(
        and(
          eq(mentorStudentsTable.mentorId, mentorId),
          eq(mentorStudentsTable.isTrial, true)
        )
      );
    trial = trialRows.length;

    res.json({
      totalStudents: studentIds.length,
      trialStudents: trial,
      totalBatches: batches.length,
      activeBatches: batches.filter((b) => b.status === "active").length,
      atRiskStudents: atRisk,
      avgFts: studentIds.length
        ? Math.round(totalFts / studentIds.length)
        : 0,
      draftTasks: tasks.filter((t) => t.status === "draft").length,
      publishedTasks: tasks.filter((t) => t.status === "published").length,
      scheduledTasks: tasks.filter((t) => t.status === "scheduled").length,
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Assigned students
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/mentor/students",
  ...mentorGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const mentorId = req.user!.userId;
    const links = await db
      .select({
        studentId: mentorStudentsTable.studentId,
        isTrial: mentorStudentsTable.isTrial,
        batchId: mentorStudentsTable.batchId,
        assignedAt: mentorStudentsTable.assignedAt,
        email: usersTable.email,
        fullName: usersTable.fullName,
        careerTrack: usersTable.careerTrack,
        isActive: usersTable.isActive,
      })
      .from(mentorStudentsTable)
      .innerJoin(usersTable, eq(usersTable.id, mentorStudentsTable.studentId))
      .where(eq(mentorStudentsTable.mentorId, mentorId))
      .orderBy(desc(mentorStudentsTable.assignedAt));

    const ids = links.map((l) => l.studentId);
    const metrics = await computeStudentMetrics(ids);

    res.json({
      students: links.map((l) => {
        const m = metrics.get(l.studentId);
        const risk = m ? assessRisk(m) : null;
        return {
          id: l.studentId,
          email: l.email,
          fullName: l.fullName,
          careerTrack: l.careerTrack,
          isActive: l.isActive,
          isTrial: l.isTrial,
          batchId: l.batchId,
          assignedAt: l.assignedAt.toISOString(),
          learningHours: m ? Math.round(m.learningHours * 10) / 10 : 0,
          lessonsCompleted: m?.lessonsCompleted ?? 0,
          ftsTotal: m?.ftsTotal ?? 0,
          avgModuleProgress: m?.avgModuleProgress ?? 0,
          lastActivityAt: m?.lastActivityAt ?? null,
          riskLevel: risk?.riskLevel ?? "low",
          riskScore: risk?.riskScore ?? 0,
        };
      }),
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Assigned batches
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/mentor/batches",
  ...mentorGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const mentorId = req.user!.userId;
    const batches = await db
      .select()
      .from(batchesTable)
      .where(eq(batchesTable.mentorId, mentorId))
      .orderBy(desc(batchesTable.createdAt));

    const ids = batches.map((b) => b.id);
    const counts = new Map<number, number>();
    if (ids.length > 0) {
      const rows = await db
        .select({ batchId: batchStudentsTable.batchId })
        .from(batchStudentsTable)
        .where(inArray(batchStudentsTable.batchId, ids));
      for (const r of rows)
        counts.set(r.batchId, (counts.get(r.batchId) ?? 0) + 1);
    }

    res.json({
      batches: batches.map((b) => ({
        id: b.id,
        name: b.name,
        code: b.code,
        careerTrack: b.careerTrack,
        status: b.status,
        description: b.description,
        startDate: b.startDate ? b.startDate.toISOString() : null,
        endDate: b.endDate ? b.endDate.toISOString() : null,
        studentCount: counts.get(b.id) ?? 0,
      })),
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Cohort analytics
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/mentor/analytics",
  ...mentorGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const mentorId = req.user!.userId;
    const studentIds = await getMentorStudentIds(mentorId);
    const metrics = await computeStudentMetrics(studentIds);
    const heatmap = await computeActivityHeatmap(studentIds);

    let learningHours = 0;
    let lessonsCompleted = 0;
    let totalFts = 0;
    let labPoints = 0;
    let labsCompleted = 0;
    let assessmentsTaken = 0;
    let assessmentsPassed = 0;
    let assignmentsSubmitted = 0;
    let avgProgressSum = 0;
    let activeLast14 = 0;

    const ftsBuckets = { low: 0, mid: 0, high: 0 };
    for (const m of metrics.values()) {
      learningHours += m.learningHours;
      lessonsCompleted += m.lessonsCompleted;
      totalFts += m.ftsTotal;
      labPoints += m.labPoints;
      labsCompleted += m.labsCompleted;
      assessmentsTaken += m.assessmentsTaken;
      assessmentsPassed += m.assessmentsPassed;
      assignmentsSubmitted += m.assignmentsSubmitted;
      avgProgressSum += m.avgModuleProgress;
      if (m.lessonsLast14 > 0) activeLast14 += 1;
      if (m.ftsTotal < 40) ftsBuckets.low += 1;
      else if (m.ftsTotal < 70) ftsBuckets.mid += 1;
      else ftsBuckets.high += 1;
    }
    const n = studentIds.length || 1;

    res.json({
      cohortSize: studentIds.length,
      learningHours: Math.round(learningHours * 10) / 10,
      avgLearningHours: Math.round((learningHours / n) * 10) / 10,
      lessonsCompleted,
      avgCompletion: Math.round(avgProgressSum / n),
      avgFts: Math.round(totalFts / n),
      ftsDistribution: ftsBuckets,
      labPoints,
      labsCompleted,
      assessmentsTaken,
      assessmentPassRate:
        assessmentsTaken > 0
          ? Math.round((assessmentsPassed / assessmentsTaken) * 100)
          : 0,
      assignmentsSubmitted,
      activeStudentsLast14: activeLast14,
      activityHeatmap: heatmap,
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// At-risk students
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/mentor/at-risk",
  ...mentorGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const mentorId = req.user!.userId;
    const links = await db
      .select({
        studentId: mentorStudentsTable.studentId,
        fullName: usersTable.fullName,
        email: usersTable.email,
        careerTrack: usersTable.careerTrack,
      })
      .from(mentorStudentsTable)
      .innerJoin(usersTable, eq(usersTable.id, mentorStudentsTable.studentId))
      .where(eq(mentorStudentsTable.mentorId, mentorId));

    const ids = links.map((l) => l.studentId);
    const metrics = await computeStudentMetrics(ids);
    const nameById = new Map(links.map((l) => [l.studentId, l]));

    const assessed = ids
      .map((id) => {
        const m = metrics.get(id)!;
        const risk = assessRisk(m);
        const info = nameById.get(id)!;
        return {
          studentId: id,
          fullName: info.fullName,
          email: info.email,
          careerTrack: info.careerTrack,
          riskScore: risk.riskScore,
          riskLevel: risk.riskLevel,
          signals: risk.signals,
          recommendations: risk.recommendations,
          ftsTotal: m.ftsTotal,
          lessonsLast14: m.lessonsLast14,
          missedTasks: m.missedTasks,
          lastActivityAt: m.lastActivityAt,
        };
      })
      .filter((r) => r.riskLevel !== "low")
      .sort((a, b) => b.riskScore - a.riskScore);

    res.json({ students: assessed });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Broadcast notes
// ─────────────────────────────────────────────────────────────────────────────
const createBroadcastSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  targetTrackIds: z.array(z.number().int().positive()).optional(),
  publish: z.boolean().optional(),
});

const updateBroadcastSchema = z.object({
  status: z.enum(["draft", "published", "archived"]),
});

router.get(
  "/mentor/broadcasts",
  ...mentorGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const mentorId = req.user!.userId;
    const rows = await db
      .select()
      .from(broadcastNotesTable)
      .where(eq(broadcastNotesTable.authorId, mentorId))
      .orderBy(desc(broadcastNotesTable.createdAt));
    res.json({
      broadcasts: rows.map((b) => ({
        id: b.id,
        title: b.title,
        content: b.content,
        targetTrackIds: b.targetTrackIds,
        status: b.status,
        publishedAt: b.publishedAt ? b.publishedAt.toISOString() : null,
        createdAt: b.createdAt.toISOString(),
      })),
    });
  }
);

router.post(
  "/mentor/broadcasts",
  ...mentorGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const mentorId = req.user!.userId;
    const parsed = createBroadcastSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const d = parsed.data;
    const [note] = await db
      .insert(broadcastNotesTable)
      .values({
        authorId: mentorId,
        title: d.title,
        content: d.content,
        targetRoles: ["student"],
        targetTrackIds: d.targetTrackIds ?? [],
        status: d.publish ? "published" : "draft",
        publishedAt: d.publish ? new Date() : null,
      })
      .returning();

    await createAuditLog({
      userId: mentorId,
      action: d.publish ? "mentor.broadcast.published" : "mentor.broadcast.created",
      entityType: "broadcast_note",
      entityId: note.id,
      ipAddress: ip(req),
      metadata: { title: d.title },
    });

    res.status(201).json({ broadcast: { id: note.id, status: note.status } });
  }
);

router.patch(
  "/mentor/broadcasts/:id",
  ...mentorGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const mentorId = req.user!.userId;
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = updateBroadcastSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const note = await db.query.broadcastNotesTable.findFirst({
      where: eq(broadcastNotesTable.id, id),
    });
    if (!note || note.authorId !== mentorId) {
      res.status(404).json({ error: "Broadcast not found" });
      return;
    }
    const [updated] = await db
      .update(broadcastNotesTable)
      .set({
        status: parsed.data.status,
        publishedAt:
          parsed.data.status === "published"
            ? note.publishedAt ?? new Date()
            : note.publishedAt,
      })
      .where(eq(broadcastNotesTable.id, id))
      .returning();

    await createAuditLog({
      userId: mentorId,
      action: `mentor.broadcast.${parsed.data.status}`,
      entityType: "broadcast_note",
      entityId: id,
      ipAddress: ip(req),
    });

    res.json({ broadcast: { id: updated.id, status: updated.status } });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Task Builder
// ─────────────────────────────────────────────────────────────────────────────
const createTaskSchema = z.object({
  type: z.enum(["assessment", "resource", "assignment", "declaration"]),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  contentUrl: z.string().max(1000).optional(),
  refId: z.number().int().positive().optional(),
  maxAttempts: z.number().int().positive().max(20).optional(),
  points: z.number().int().nonnegative().max(1000).optional(),
  careerTrack: z.enum(CAREER_TRACKS),
  audience: z.enum([
    "all_students",
    "trial_students",
    "all_batches",
    "specific_batches",
    "future_batches",
  ]),
  batchIds: z.array(z.number().int().positive()).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  scheduledAt: z.string().datetime().optional(),
  action: z.enum(["draft", "publish", "schedule"]).default("draft"),
});

const updateTaskSchema = createTaskSchema.partial().extend({
  action: z.enum(["draft", "publish", "schedule", "archive"]).optional(),
});

router.get(
  "/mentor/tasks",
  ...mentorGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const mentorId = req.user!.userId;
    const tasks = await db
      .select()
      .from(mentorTasksTable)
      .where(eq(mentorTasksTable.mentorId, mentorId))
      .orderBy(desc(mentorTasksTable.createdAt));

    const ids = tasks.map((t) => t.id);
    const counts = new Map<number, number>();
    if (ids.length > 0) {
      const rows = await db
        .select({ taskId: mentorTaskAssignmentsTable.taskId })
        .from(mentorTaskAssignmentsTable)
        .where(inArray(mentorTaskAssignmentsTable.taskId, ids));
      for (const r of rows)
        counts.set(r.taskId, (counts.get(r.taskId) ?? 0) + 1);
    }

    res.json({
      tasks: tasks.map((t) => ({
        id: t.id,
        type: t.type,
        title: t.title,
        description: t.description,
        contentUrl: t.contentUrl,
        refId: t.refId,
        maxAttempts: t.maxAttempts,
        points: t.points,
        careerTrack: t.careerTrack,
        status: t.status,
        audience: t.audience,
        startDate: t.startDate ? t.startDate.toISOString() : null,
        endDate: t.endDate ? t.endDate.toISOString() : null,
        scheduledAt: t.scheduledAt ? t.scheduledAt.toISOString() : null,
        publishedAt: t.publishedAt ? t.publishedAt.toISOString() : null,
        assignedCount: counts.get(t.id) ?? 0,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  }
);

async function materializeAssignments(
  mentorId: number,
  taskId: number,
  audience: string,
  batchIds: number[]
): Promise<number> {
  const studentIds = await resolveTaskAudience(mentorId, audience, batchIds);
  if (studentIds.length === 0) return 0;
  await db
    .insert(mentorTaskAssignmentsTable)
    .values(studentIds.map((studentId) => ({ taskId, studentId })))
    .onConflictDoNothing();
  return studentIds.length;
}

/** Return only the batch IDs that belong to this mentor. */
async function ownedBatchIds(
  mentorId: number,
  batchIds: number[]
): Promise<number[]> {
  if (batchIds.length === 0) return [];
  const rows = await db
    .select({ id: batchesTable.id })
    .from(batchesTable)
    .where(
      and(
        eq(batchesTable.mentorId, mentorId),
        inArray(batchesTable.id, batchIds)
      )
    );
  return rows.map((r) => r.id);
}

/** Load the persisted specific-batch IDs for a task. */
async function persistedTaskBatchIds(taskId: number): Promise<number[]> {
  const rows = await db
    .select({ batchId: mentorTaskBatchesTable.batchId })
    .from(mentorTaskBatchesTable)
    .where(eq(mentorTaskBatchesTable.taskId, taskId));
  return rows.map((r) => r.batchId);
}

router.post(
  "/mentor/tasks",
  ...mentorGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const mentorId = req.user!.userId;
    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const d = parsed.data;

    // Assessment tasks must reference an existing, active assessment.
    if (d.type === "assessment") {
      if (!d.refId) {
        res
          .status(400)
          .json({ error: "Assessment tasks require a linked assessment" });
        return;
      }
      const [assessment] = await db
        .select({ id: assessmentsTable.id, isActive: assessmentsTable.isActive })
        .from(assessmentsTable)
        .where(eq(assessmentsTable.id, d.refId));
      if (!assessment || !assessment.isActive) {
        res
          .status(400)
          .json({ error: "Linked assessment not found or inactive" });
        return;
      }
    }

    let createBatchIds: number[] = [];
    if (d.audience === "specific_batches") {
      if (!d.batchIds || d.batchIds.length === 0) {
        res.status(400).json({ error: "specific_batches requires batchIds" });
        return;
      }
      createBatchIds = await ownedBatchIds(mentorId, d.batchIds);
      if (createBatchIds.length !== d.batchIds.length) {
        res.status(403).json({ error: "One or more batches are not assigned to you" });
        return;
      }
    }
    if (d.action === "schedule" && !d.scheduledAt) {
      res.status(400).json({ error: "schedule requires scheduledAt" });
      return;
    }

    const status =
      d.action === "publish"
        ? "published"
        : d.action === "schedule"
          ? "scheduled"
          : "draft";

    const [task] = await db
      .insert(mentorTasksTable)
      .values({
        mentorId,
        type: d.type,
        title: d.title,
        description: d.description,
        contentUrl: d.contentUrl,
        refId: d.refId,
        maxAttempts: d.type === "assessment" ? (d.maxAttempts ?? null) : null,
        points: d.points ?? null,
        careerTrack: d.careerTrack,
        audience: d.audience,
        status,
        startDate: d.startDate ? new Date(d.startDate) : null,
        endDate: d.endDate ? new Date(d.endDate) : null,
        scheduledAt: d.scheduledAt ? new Date(d.scheduledAt) : null,
        publishedAt: status === "published" ? new Date() : null,
      })
      .returning();

    if (d.audience === "specific_batches" && createBatchIds.length > 0) {
      await db
        .insert(mentorTaskBatchesTable)
        .values(createBatchIds.map((batchId) => ({ taskId: task.id, batchId })))
        .onConflictDoNothing();
    }

    let assigned = 0;
    if (status === "published") {
      assigned = await materializeAssignments(
        mentorId,
        task.id,
        d.audience,
        createBatchIds
      );
    }

    await createAuditLog({
      userId: mentorId,
      action: `mentor.task.${d.action}`,
      entityType: "mentor_task",
      entityId: task.id,
      ipAddress: ip(req),
      metadata: { type: d.type, audience: d.audience, assigned },
    });

    res.status(201).json({ task: { id: task.id, status: task.status, assigned } });
  }
);

router.patch(
  "/mentor/tasks/:id",
  ...mentorGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const mentorId = req.user!.userId;
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = updateTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const task = await db.query.mentorTasksTable.findFirst({
      where: eq(mentorTasksTable.id, id),
    });
    if (!task || task.mentorId !== mentorId) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    const d = parsed.data;

    // Validate a (re)linked assessment if refId is being changed.
    const effectiveType = d.type ?? task.type;
    if (d.refId !== undefined && effectiveType === "assessment") {
      const [assessment] = await db
        .select({ id: assessmentsTable.id, isActive: assessmentsTable.isActive })
        .from(assessmentsTable)
        .where(eq(assessmentsTable.id, d.refId));
      if (!assessment || !assessment.isActive) {
        res
          .status(400)
          .json({ error: "Linked assessment not found or inactive" });
        return;
      }
    }

    let updateBatchIds: number[] | null = null;
    if (d.batchIds !== undefined) {
      updateBatchIds = await ownedBatchIds(mentorId, d.batchIds);
      if (updateBatchIds.length !== d.batchIds.length) {
        res.status(403).json({ error: "One or more batches are not assigned to you" });
        return;
      }
    }

    let status = task.status;
    let publishedAt = task.publishedAt;
    let archivedAt = task.archivedAt;
    let scheduledAt = task.scheduledAt;
    if (d.action === "publish") {
      status = "published";
      publishedAt = publishedAt ?? new Date();
    } else if (d.action === "schedule") {
      if (!d.scheduledAt && !task.scheduledAt) {
        res.status(400).json({ error: "schedule requires scheduledAt" });
        return;
      }
      status = "scheduled";
      scheduledAt = d.scheduledAt ? new Date(d.scheduledAt) : task.scheduledAt;
    } else if (d.action === "archive") {
      status = "archived";
      archivedAt = new Date();
    } else if (d.action === "draft") {
      status = "draft";
    }

    const [updated] = await db
      .update(mentorTasksTable)
      .set({
        ...(d.title !== undefined ? { title: d.title } : {}),
        ...(d.description !== undefined ? { description: d.description } : {}),
        ...(d.contentUrl !== undefined ? { contentUrl: d.contentUrl } : {}),
        ...(d.refId !== undefined ? { refId: d.refId } : {}),
        ...(d.maxAttempts !== undefined ? { maxAttempts: d.maxAttempts } : {}),
        ...(d.points !== undefined ? { points: d.points } : {}),
        ...(d.careerTrack !== undefined ? { careerTrack: d.careerTrack } : {}),
        ...(d.audience !== undefined ? { audience: d.audience } : {}),
        ...(d.startDate !== undefined
          ? { startDate: d.startDate ? new Date(d.startDate) : null }
          : {}),
        ...(d.endDate !== undefined
          ? { endDate: d.endDate ? new Date(d.endDate) : null }
          : {}),
        status,
        publishedAt,
        archivedAt,
        scheduledAt,
      })
      .where(eq(mentorTasksTable.id, id))
      .returning();

    if (updateBatchIds !== null) {
      await db
        .delete(mentorTaskBatchesTable)
        .where(eq(mentorTaskBatchesTable.taskId, id));
      if (updateBatchIds.length > 0) {
        await db
          .insert(mentorTaskBatchesTable)
          .values(updateBatchIds.map((batchId) => ({ taskId: id, batchId })))
          .onConflictDoNothing();
      }
    }

    let assigned = 0;
    if (d.action === "publish") {
      const effectiveBatchIds =
        updated.audience === "specific_batches"
          ? (updateBatchIds ?? (await persistedTaskBatchIds(id)))
          : [];
      assigned = await materializeAssignments(
        mentorId,
        id,
        updated.audience,
        effectiveBatchIds
      );
    }

    await createAuditLog({
      userId: mentorId,
      action: `mentor.task.${d.action ?? "updated"}`,
      entityType: "mentor_task",
      entityId: id,
      ipAddress: ip(req),
      metadata: { assigned },
    });

    res.json({ task: { id: updated.id, status: updated.status, assigned } });
  }
);

router.delete(
  "/mentor/tasks/:id",
  ...mentorGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const mentorId = req.user!.userId;
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const task = await db.query.mentorTasksTable.findFirst({
      where: eq(mentorTasksTable.id, id),
    });
    if (!task || task.mentorId !== mentorId) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    await db
      .delete(mentorTaskAssignmentsTable)
      .where(eq(mentorTaskAssignmentsTable.taskId, id));
    await db
      .delete(mentorTaskBatchesTable)
      .where(eq(mentorTaskBatchesTable.taskId, id));
    await db.delete(mentorTasksTable).where(eq(mentorTasksTable.id, id));

    await createAuditLog({
      userId: mentorId,
      action: "mentor.task.deleted",
      entityType: "mentor_task",
      entityId: id,
      ipAddress: ip(req),
    });

    res.json({ ok: true });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Assessment picker (active assessments to attach to assessment tasks)
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/mentor/assessments",
  ...mentorGuards,
  async (_req: AuthRequest, res): Promise<void> => {
    const rows = await db
      .select({
        id: assessmentsTable.id,
        title: assessmentsTable.title,
        type: assessmentsTable.type,
        totalQuestions: assessmentsTable.totalQuestions,
        passingScore: assessmentsTable.passingScore,
        durationMinutes: assessmentsTable.durationMinutes,
      })
      .from(assessmentsTable)
      .where(eq(assessmentsTable.isActive, true))
      .orderBy(assessmentsTable.title);
    res.json({ assessments: rows });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Assignment submissions for a task + mentor review
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/mentor/tasks/:id/submissions",
  ...mentorGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const mentorId = req.user!.userId;
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const task = await db.query.mentorTasksTable.findFirst({
      where: eq(mentorTasksTable.id, id),
    });
    if (!task || task.mentorId !== mentorId) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    if (task.type !== "assignment") {
      res.status(400).json({ error: "Task is not an assignment" });
      return;
    }
    const rows = await db
      .select({
        assignment: mentorTaskAssignmentsTable,
        studentName: usersTable.fullName,
        studentEmail: usersTable.email,
      })
      .from(mentorTaskAssignmentsTable)
      .innerJoin(
        usersTable,
        eq(mentorTaskAssignmentsTable.studentId, usersTable.id)
      )
      .where(eq(mentorTaskAssignmentsTable.taskId, id))
      .orderBy(desc(mentorTaskAssignmentsTable.submittedAt));

    res.json({
      task: { id: task.id, title: task.title, points: task.points },
      submissions: rows.map((r) => ({
        assignmentId: r.assignment.id,
        studentId: r.assignment.studentId,
        studentName: r.studentName,
        studentEmail: r.studentEmail,
        status: r.assignment.status,
        submissionText: r.assignment.submissionText,
        fileUrl: r.assignment.fileUrl,
        fileName: r.assignment.fileName,
        submittedAt: r.assignment.submittedAt
          ? r.assignment.submittedAt.toISOString()
          : null,
        reviewStatus: r.assignment.reviewStatus,
        reviewNotes: r.assignment.reviewNotes,
        score: r.assignment.score,
        reviewedAt: r.assignment.reviewedAt
          ? r.assignment.reviewedAt.toISOString()
          : null,
      })),
    });
  }
);

const reviewSubmissionSchema = z.object({
  reviewStatus: z.enum(["approved", "rejected", "changes_requested"]),
  reviewNotes: z.string().max(5000).optional(),
  score: z.number().int().nonnegative().max(1000).optional(),
});

router.post(
  "/mentor/task-submissions/:id/review",
  ...mentorGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const mentorId = req.user!.userId;
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = reviewSubmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    // Load the assignment + its task; verify task ownership.
    const [row] = await db
      .select({
        assignment: mentorTaskAssignmentsTable,
        task: mentorTasksTable,
      })
      .from(mentorTaskAssignmentsTable)
      .innerJoin(
        mentorTasksTable,
        eq(mentorTaskAssignmentsTable.taskId, mentorTasksTable.id)
      )
      .where(eq(mentorTaskAssignmentsTable.id, id));
    if (!row || row.task.mentorId !== mentorId) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }
    if (row.task.type !== "assignment") {
      res.status(400).json({ error: "Task is not an assignment" });
      return;
    }
    if (!row.assignment.submittedAt) {
      res.status(400).json({ error: "Nothing has been submitted yet" });
      return;
    }
    const d = parsed.data;
    const now = new Date();
    const approved = d.reviewStatus === "approved";
    const [updated] = await db
      .update(mentorTaskAssignmentsTable)
      .set({
        reviewStatus: d.reviewStatus,
        reviewNotes: d.reviewNotes ?? null,
        score: d.score ?? null,
        reviewedBy: mentorId,
        reviewedAt: now,
        status: approved ? "completed" : "in_progress",
        completedAt: approved ? now : null,
      })
      .where(eq(mentorTaskAssignmentsTable.id, id))
      .returning();

    await createAuditLog({
      userId: mentorId,
      action: "mentor.task_submission.reviewed",
      entityType: "mentor_task_assignment",
      entityId: id,
      ipAddress: ip(req),
      metadata: {
        taskId: row.task.id,
        reviewStatus: d.reviewStatus,
        score: d.score ?? null,
      },
    });
    res.json({
      assignmentId: updated.id,
      reviewStatus: updated.reviewStatus,
      status: updated.status,
    });
  }
);

// Mint a short-lived signed URL for a submitted assignment file. The mentor is
// not the file owner, so direct download is blocked; this authorizes access by
// verifying the file belongs to a submission on a task the mentor owns.
router.get(
  "/mentor/task-submissions/:id/file-url",
  ...mentorGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const mentorId = req.user!.userId;
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [row] = await db
      .select({
        assignment: mentorTaskAssignmentsTable,
        task: mentorTasksTable,
      })
      .from(mentorTaskAssignmentsTable)
      .innerJoin(
        mentorTasksTable,
        eq(mentorTaskAssignmentsTable.taskId, mentorTasksTable.id)
      )
      .where(eq(mentorTaskAssignmentsTable.id, id));
    if (!row || row.task.mentorId !== mentorId) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }
    const fileUrl = row.assignment.fileUrl;
    const match = fileUrl ? /\/storage\/files\/(\d+)\//.exec(fileUrl) : null;
    if (!match) {
      res.status(404).json({ error: "No file attached" });
      return;
    }
    const fileId = Number(match[1]);
    const [file] = await db
      .select()
      .from(filesTable)
      .where(eq(filesTable.id, fileId));
    if (!file || file.status === "deleted") {
      res.status(404).json({ error: "File not found" });
      return;
    }
    const { token, expiresAt } = signFileToken(file.id, 3600);
    res.json({
      url: `/api/storage/shared/${token}`,
      fileName: row.assignment.fileName ?? file.originalName,
      expiresAt: new Date(expiresAt).toISOString(),
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Audit logs (mentor's own actions)
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/mentor/audit-logs",
  ...mentorGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const mentorId = req.user!.userId;
    const rows = await db
      .select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.userId, mentorId))
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(200);
    res.json({
      logs: rows.map((l) => ({
        id: l.id,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        metadata: l.metadata ? JSON.parse(l.metadata) : null,
        createdAt: l.createdAt.toISOString(),
      })),
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Reports (cohort export summary)
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/mentor/reports",
  ...mentorGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const mentorId = req.user!.userId;
    const links = await db
      .select({
        studentId: mentorStudentsTable.studentId,
        fullName: usersTable.fullName,
        email: usersTable.email,
        careerTrack: usersTable.careerTrack,
      })
      .from(mentorStudentsTable)
      .innerJoin(usersTable, eq(usersTable.id, mentorStudentsTable.studentId))
      .where(eq(mentorStudentsTable.mentorId, mentorId));
    const ids = links.map((l) => l.studentId);
    const metrics = await computeStudentMetrics(ids);
    const info = new Map(links.map((l) => [l.studentId, l]));

    const rows = ids.map((id) => {
      const m = metrics.get(id)!;
      const risk = assessRisk(m);
      const i = info.get(id)!;
      return {
        studentId: id,
        fullName: i.fullName,
        email: i.email,
        careerTrack: i.careerTrack,
        learningHours: Math.round(m.learningHours * 10) / 10,
        lessonsCompleted: m.lessonsCompleted,
        avgModuleProgress: m.avgModuleProgress,
        ftsTotal: m.ftsTotal,
        labsCompleted: m.labsCompleted,
        assessmentsTaken: m.assessmentsTaken,
        assessmentsPassed: m.assessmentsPassed,
        assignmentsSubmitted: m.assignmentsSubmitted,
        missedTasks: m.missedTasks,
        riskLevel: risk.riskLevel,
        riskScore: risk.riskScore,
      };
    });

    await createAuditLog({
      userId: mentorId,
      action: "mentor.report.generated",
      entityType: "user",
      entityId: mentorId,
      ipAddress: ip(req),
      metadata: { rows: rows.length },
    });

    res.json({ generatedAt: new Date().toISOString(), rows });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────────────────────────────────────
const updateSettingsSchema = z.object({
  specialization: z.string().max(200).nullable().optional(),
  company: z.string().max(160).nullable().optional(),
  designation: z.string().max(160).nullable().optional(),
  linkedinUrl: z.string().max(300).nullable().optional(),
  calendlyUrl: z.string().max(300).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
  isAvailable: z.boolean().optional(),
});

router.get(
  "/mentor/settings",
  ...mentorGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const mentorId = req.user!.userId;
    const me = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, mentorId),
    });
    const profile = await db.query.mentorProfilesTable.findFirst({
      where: eq(mentorProfilesTable.userId, mentorId),
    });
    res.json({
      profile: {
        email: me?.email ?? null,
        fullName: me?.fullName ?? null,
        phone: me?.phone ?? null,
        careerTrack: me?.careerTrack ?? null,
        specialization: profile?.specialization ?? null,
        company: profile?.company ?? null,
        designation: profile?.designation ?? null,
        linkedinUrl: profile?.linkedinUrl ?? null,
        calendlyUrl: profile?.calendlyUrl ?? null,
        bio: profile?.bio ?? null,
        isAvailable: profile?.isAvailable ?? true,
      },
    });
  }
);

router.patch(
  "/mentor/settings",
  ...mentorGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const mentorId = req.user!.userId;
    const parsed = updateSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const existing = await db.query.mentorProfilesTable.findFirst({
      where: eq(mentorProfilesTable.userId, mentorId),
    });
    if (existing) {
      await db
        .update(mentorProfilesTable)
        .set({ ...parsed.data })
        .where(eq(mentorProfilesTable.userId, mentorId));
    } else {
      await db
        .insert(mentorProfilesTable)
        .values({ userId: mentorId, ...parsed.data });
    }

    await createAuditLog({
      userId: mentorId,
      action: "mentor.settings.updated",
      entityType: "mentor_profile",
      entityId: mentorId,
      ipAddress: ip(req),
    });

    res.json({ ok: true });
  }
);

export default router;
