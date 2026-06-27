import { Router } from "express";
import { eq, and, inArray, desc } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import {
  mentorTasksTable,
  mentorTaskAssignmentsTable,
  assessmentsTable,
  assessmentAttemptsTable,
  filesTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";

const router = Router();

/**
 * Load a student's own task assignment joined with the mentor task, or null.
 * Guards ownership (studentId) so a student can only act on their own rows.
 */
async function loadOwnedAssignment(assignmentId: number, studentId: number) {
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
    .where(
      and(
        eq(mentorTaskAssignmentsTable.id, assignmentId),
        eq(mentorTaskAssignmentsTable.studentId, studentId)
      )
    );
  return row ?? null;
}

// ── List the student's mentor tasks (published + within availability window) ──
router.get(
  "/student/tasks",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const studentId = req.user.userId;
    const now = new Date();

    const rows = await db
      .select({
        assignment: mentorTaskAssignmentsTable,
        task: mentorTasksTable,
      })
      .from(mentorTaskAssignmentsTable)
      .innerJoin(
        mentorTasksTable,
        eq(mentorTaskAssignmentsTable.taskId, mentorTasksTable.id)
      )
      .where(
        and(
          eq(mentorTaskAssignmentsTable.studentId, studentId),
          eq(mentorTasksTable.status, "published")
        )
      )
      .orderBy(desc(mentorTasksTable.publishedAt));

    // Only surface tasks whose availability window has opened.
    const available = rows.filter(
      (r) => !r.task.startDate || r.task.startDate <= now
    );

    // Resolve linked assessment titles + per-assessment attempt counts.
    const assessmentIds = Array.from(
      new Set(
        available
          .filter((r) => r.task.type === "assessment" && r.task.refId != null)
          .map((r) => r.task.refId as number)
      )
    );
    const assessmentMap = new Map<
      number,
      { title: string; passingScore: number; isActive: boolean }
    >();
    const attemptCounts = new Map<number, number>();
    if (assessmentIds.length > 0) {
      const assessments = await db
        .select({
          id: assessmentsTable.id,
          title: assessmentsTable.title,
          passingScore: assessmentsTable.passingScore,
          isActive: assessmentsTable.isActive,
        })
        .from(assessmentsTable)
        .where(inArray(assessmentsTable.id, assessmentIds));
      for (const a of assessments)
        assessmentMap.set(a.id, {
          title: a.title,
          passingScore: a.passingScore,
          isActive: a.isActive,
        });

      const attempts = await db
        .select({ assessmentId: assessmentAttemptsTable.assessmentId })
        .from(assessmentAttemptsTable)
        .where(
          and(
            eq(assessmentAttemptsTable.userId, studentId),
            eq(assessmentAttemptsTable.status, "submitted"),
            inArray(assessmentAttemptsTable.assessmentId, assessmentIds)
          )
        );
      for (const at of attempts)
        attemptCounts.set(
          at.assessmentId,
          (attemptCounts.get(at.assessmentId) ?? 0) + 1
        );
    }

    res.json({
      tasks: available.map((r) => {
        const t = r.task;
        const a = r.assignment;
        const linkedAssessment =
          t.type === "assessment" && t.refId != null
            ? assessmentMap.get(t.refId)
            : undefined;
        const attemptsUsed =
          t.type === "assessment" && t.refId != null
            ? (attemptCounts.get(t.refId) ?? 0)
            : 0;
        return {
          assignmentId: a.id,
          taskId: t.id,
          type: t.type,
          title: t.title,
          description: t.description,
          contentUrl: t.contentUrl,
          careerTrack: t.careerTrack,
          refId: t.refId,
          points: t.points,
          maxAttempts: t.maxAttempts,
          startDate: t.startDate ? t.startDate.toISOString() : null,
          endDate: t.endDate ? t.endDate.toISOString() : null,
          status: a.status,
          completedAt: a.completedAt ? a.completedAt.toISOString() : null,
          // assignment submission state
          submissionText: a.submissionText,
          fileUrl: a.fileUrl,
          fileName: a.fileName,
          submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
          reviewStatus: a.reviewStatus,
          reviewNotes: a.reviewNotes,
          score: a.score,
          reviewedAt: a.reviewedAt ? a.reviewedAt.toISOString() : null,
          // declaration state
          acknowledged: a.acknowledged,
          signatureName: a.signatureName,
          signedAt: a.signedAt ? a.signedAt.toISOString() : null,
          // assessment context
          assessment: linkedAssessment
            ? {
                id: t.refId,
                title: linkedAssessment.title,
                passingScore: linkedAssessment.passingScore,
                isActive: linkedAssessment.isActive,
                attemptsUsed,
                attemptsRemaining:
                  t.maxAttempts != null
                    ? Math.max(0, t.maxAttempts - attemptsUsed)
                    : null,
              }
            : null,
        };
      }),
    });
  }
);

// ── Mark a resource task complete (student confirms they reviewed it) ──
router.post(
  "/student/tasks/:id/complete",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const owned = await loadOwnedAssignment(id, req.user.userId);
    if (!owned) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    if (owned.task.type !== "resource") {
      res.status(400).json({
        error: "This task type cannot be completed directly",
      });
      return;
    }
    const [updated] = await db
      .update(mentorTaskAssignmentsTable)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(mentorTaskAssignmentsTable.id, id))
      .returning();

    await createAuditLog({
      userId: req.user.userId,
      action: "student.task.completed",
      entityType: "mentor_task_assignment",
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") ?? undefined,
      metadata: { taskId: owned.task.id, type: owned.task.type },
    });
    res.json({ status: updated.status });
  }
);

// ── Submit an assignment task (file and/or text) → awaits mentor review ──
const submitAssignmentBody = z
  .object({
    submissionText: z.string().max(10000).optional(),
    fileId: z.number().int().positive().optional(),
  })
  .refine(
    (d) =>
      (d.submissionText && d.submissionText.trim().length > 0) ||
      d.fileId != null,
    { message: "Provide submission text or an uploaded file" }
  );

router.post(
  "/student/tasks/:id/submit",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = submitAssignmentBody.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const owned = await loadOwnedAssignment(id, req.user.userId);
    if (!owned) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    if (owned.task.type !== "assignment") {
      res.status(400).json({ error: "This task is not an assignment" });
      return;
    }
    if (owned.assignment.reviewStatus === "approved") {
      res.status(409).json({ error: "Submission already approved" });
      return;
    }
    const d = parsed.data;

    // Validate file ownership before persisting any reference. The mentor
    // review endpoint later mints a signed URL from this stored reference, so
    // we must never trust a client-supplied URL — only a file the submitting
    // student actually owns may be attached (broken-access-control guard).
    let fileUrl: string | null = null;
    let fileName: string | null = null;
    if (d.fileId != null) {
      const [file] = await db
        .select()
        .from(filesTable)
        .where(eq(filesTable.id, d.fileId));
      if (!file || file.status === "deleted") {
        res.status(404).json({ error: "File not found" });
        return;
      }
      if (file.ownerId !== req.user.userId) {
        res.status(403).json({ error: "You do not own this file" });
        return;
      }
      fileUrl = `/api/storage/files/${file.id}/download`;
      fileName = file.originalName;
    }

    const [updated] = await db
      .update(mentorTaskAssignmentsTable)
      .set({
        submissionText: d.submissionText ?? null,
        fileUrl,
        fileName,
        submittedAt: new Date(),
        status: "in_progress",
        reviewStatus: "pending",
        // clear any prior review when resubmitting
        reviewNotes: null,
        reviewedBy: null,
        reviewedAt: null,
        score: null,
      })
      .where(eq(mentorTaskAssignmentsTable.id, id))
      .returning();

    await createAuditLog({
      userId: req.user.userId,
      action: "student.task.submitted",
      entityType: "mentor_task_assignment",
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") ?? undefined,
      metadata: { taskId: owned.task.id, hasFile: fileUrl !== null },
    });
    res.json({ status: updated.status, reviewStatus: updated.reviewStatus });
  }
);

// ── Acknowledge / e-sign a declaration task ──
const acknowledgeBody = z.object({
  signatureName: z.string().min(1).max(200),
  acknowledged: z.literal(true),
});

router.post(
  "/student/tasks/:id/acknowledge",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = acknowledgeBody.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const owned = await loadOwnedAssignment(id, req.user.userId);
    if (!owned) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    if (owned.task.type !== "declaration") {
      res.status(400).json({ error: "This task is not a declaration" });
      return;
    }
    if (owned.assignment.acknowledged) {
      res.status(409).json({ error: "Declaration already acknowledged" });
      return;
    }
    const now = new Date();
    const [updated] = await db
      .update(mentorTaskAssignmentsTable)
      .set({
        acknowledged: true,
        signatureName: parsed.data.signatureName,
        signedAt: now,
        status: "completed",
        completedAt: now,
      })
      .where(eq(mentorTaskAssignmentsTable.id, id))
      .returning();

    await createAuditLog({
      userId: req.user.userId,
      action: "student.task.acknowledged",
      entityType: "mentor_task_assignment",
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") ?? undefined,
      metadata: {
        taskId: owned.task.id,
        signatureName: parsed.data.signatureName,
      },
    });
    res.json({ status: updated.status, signedAt: now.toISOString() });
  }
);

export default router;
