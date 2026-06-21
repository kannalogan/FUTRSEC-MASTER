import { Router, type Response, type NextFunction } from "express";
import { eq, and, inArray, desc, ilike } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable,
  studentProfilesTable,
  tpoProfilesTable,
  studentTpoMapTable,
  employersTable,
  jobsTable,
  jobApplicationsTable,
  offersTable,
  applicationStatusHistoryTable,
  placementsTable,
} from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";
import { eventBus } from "../lib/events";

const router = Router();

const CAREER_TRACKS = ["soc", "vapt", "grc"] as const;
type CareerTrack = (typeof CAREER_TRACKS)[number];
function isCareerTrack(v: unknown): v is CareerTrack {
  return typeof v === "string" && (CAREER_TRACKS as readonly string[]).includes(v);
}

// Extended placement pipeline status set (superset of the employer/job flow).
export const PLACEMENT_STATUSES = [
  "applied",
  "screening",
  "shortlisted",
  "assessment",
  "interview_scheduled",
  "interviewing",
  "selected",
  "offer_released",
  "offer_accepted",
  "offer_rejected",
  "rejected",
  "hired",
] as const;
export type PlacementStatus = (typeof PLACEMENT_STATUSES)[number];

function isPlacementStatus(v: unknown): v is PlacementStatus {
  return (
    typeof v === "string" &&
    (PLACEMENT_STATUSES as readonly string[]).includes(v)
  );
}

// Resolve the set of student userIds visible to a TPO:
//   explicitly mapped (student_tpo_map) ∪ students whose college == institution
async function getTpoStudentIds(
  tpoUserId: number,
  institution: string | null
): Promise<number[]> {
  const mapped = await db
    .select({ studentId: studentTpoMapTable.studentId })
    .from(studentTpoMapTable)
    .where(eq(studentTpoMapTable.tpoId, tpoUserId));
  const ids = new Set<number>(mapped.map((m) => m.studentId));

  if (institution) {
    const byCollege = await db
      .select({ userId: studentProfilesTable.userId })
      .from(studentProfilesTable)
      .where(ilike(studentProfilesTable.college, institution));
    for (const r of byCollege) ids.add(r.userId);
  }
  return [...ids];
}

// ── POST /placement/applications/:id/advance ─────────────────────────────────
// Employer (owner of the job) or admin advances an application's pipeline stage.
router.post(
  "/placement/applications/:id/advance",
  requireAuth,
  requireRole("employer", "admin"),
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid application id" });
      return;
    }

    const toStatus = req.body?.status;
    if (!isPlacementStatus(toStatus)) {
      res.status(400).json({
        error: `status must be one of: ${PLACEMENT_STATUSES.join(", ")}`,
      });
      return;
    }
    const note =
      typeof req.body?.note === "string" ? req.body.note.trim() || null : null;

    const app = await db.query.jobApplicationsTable.findFirst({
      where: eq(jobApplicationsTable.id, id),
    });
    if (!app) {
      res.status(404).json({ error: "Application not found" });
      return;
    }

    const job = await db.query.jobsTable.findFirst({
      where: eq(jobsTable.id, app.jobId),
    });
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    // Ownership: employers may only advance applications on their own jobs.
    let employerCompanyName: string | null = null;
    let employerId: number | null = job.employerId;
    if (req.user!.role === "employer") {
      const emp = await db.query.employersTable.findFirst({
        where: eq(employersTable.userId, req.user!.userId),
      });
      if (!emp || emp.approvalStatus !== "approved") {
        res.status(403).json({
          error: "Company account pending admin verification",
          code: "PENDING_APPROVAL",
          approvalStatus: emp?.approvalStatus ?? "pending",
        });
        return;
      }
      if (job.employerId !== emp.id) {
        res.status(403).json({ error: "This application does not belong to you" });
        return;
      }
      employerCompanyName = emp.companyName;
    } else if (job.employerId !== null) {
      // Admin: resolve company name for placement record if available.
      const emp = await db.query.employersTable.findFirst({
        where: eq(employersTable.id, job.employerId),
      });
      employerCompanyName = emp?.companyName ?? null;
    }

    const fromStatus = app.status;

    const [updated] = await db
      .update(jobApplicationsTable)
      .set({ status: toStatus })
      .where(eq(jobApplicationsTable.id, id))
      .returning();

    await db.insert(applicationStatusHistoryTable).values({
      applicationId: id,
      fromStatus,
      toStatus,
      note,
      changedBy: req.user!.userId,
    });

    // On terminal "hired", create a placement record (idempotent per application).
    let placementCreated: typeof placementsTable.$inferSelect | null = null;
    if (toStatus === "hired") {
      const existing = await db.query.placementsTable.findFirst({
        where: eq(placementsTable.applicationId, id),
      });
      if (!existing) {
        const student = await db.query.usersTable.findFirst({
          where: eq(usersTable.id, app.studentId),
        });
        const offer = await db.query.offersTable.findFirst({
          where: eq(offersTable.applicationId, id),
        });
        const careerTrack =
          student?.careerTrack && isCareerTrack(student.careerTrack)
            ? student.careerTrack
            : null;
        const packageAmount =
          typeof offer?.salary === "number"
            ? offer.salary
            : typeof job.maxSalary === "number"
              ? job.maxSalary
              : null;

        const [placement] = await db
          .insert(placementsTable)
          .values({
            studentId: app.studentId,
            jobId: job.id,
            applicationId: id,
            offerId: offer?.id ?? null,
            employerId,
            companyName: employerCompanyName,
            careerTrack,
            packageAmount,
            status: "placed",
          })
          .returning();
        placementCreated = placement;
      } else {
        placementCreated = existing;
      }
    }

    await createAuditLog({
      userId: req.user!.userId,
      action: "placement.application.advanced",
      entityType: "job_application",
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { fromStatus, toStatus },
    });

    eventBus.emit("application.advanced", {
      type: "application.advanced",
      userId: app.studentId,
      applicationId: id,
      status: toStatus,
    });

    if (placementCreated) {
      eventBus.emit("placement.created", {
        type: "placement.created",
        userId: app.studentId,
        placementId: placementCreated.id,
        companyName: placementCreated.companyName ?? undefined,
      });
    }

    res.json({
      application: updated,
      placement: placementCreated,
    });
  }
);

// ── GET /placement/applications/:id/timeline ─────────────────────────────────
// Access: the student owner, the employer who owns the job, a mapped TPO, admin.
router.get(
  "/placement/applications/:id/timeline",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid application id" });
      return;
    }

    const app = await db.query.jobApplicationsTable.findFirst({
      where: eq(jobApplicationsTable.id, id),
    });
    if (!app) {
      res.status(404).json({ error: "Application not found" });
      return;
    }

    const role = req.user!.role;
    const userId = req.user!.userId;
    let allowed = false;

    if (role === "admin") {
      allowed = true;
    } else if (role === "student") {
      allowed = app.studentId === userId;
    } else if (role === "employer") {
      const job = await db.query.jobsTable.findFirst({
        where: eq(jobsTable.id, app.jobId),
      });
      if (job) {
        const emp = await db.query.employersTable.findFirst({
          where: eq(employersTable.userId, userId),
        });
        allowed = !!emp && job.employerId === emp.id;
      }
    } else if (role === "tpo") {
      const profile = await db.query.tpoProfilesTable.findFirst({
        where: eq(tpoProfilesTable.userId, userId),
      });
      if (profile && profile.approvalStatus === "approved") {
        const ids = await getTpoStudentIds(userId, profile.institution ?? null);
        allowed = ids.includes(app.studentId);
      }
    }

    if (!allowed) {
      res.status(403).json({ error: "You do not have access to this timeline" });
      return;
    }

    const history = await db
      .select()
      .from(applicationStatusHistoryTable)
      .where(eq(applicationStatusHistoryTable.applicationId, id))
      .orderBy(desc(applicationStatusHistoryTable.createdAt));

    res.json({
      applicationId: id,
      currentStatus: app.status,
      timeline: history.map((h) => ({
        id: h.id,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        note: h.note,
        changedBy: h.changedBy,
        createdAt: h.createdAt.toISOString(),
      })),
    });
  }
);

// ── GET /placement/me — student's placement status + offers + stages ─────────
router.get(
  "/placement/me",
  requireAuth,
  requireRole("student"),
  async (req: AuthRequest, res): Promise<void> => {
    const userId = req.user!.userId;

    const [apps, offers, placements] = await Promise.all([
      db
        .select()
        .from(jobApplicationsTable)
        .where(eq(jobApplicationsTable.studentId, userId))
        .orderBy(desc(jobApplicationsTable.appliedAt)),
      db
        .select()
        .from(offersTable)
        .where(eq(offersTable.studentId, userId))
        .orderBy(desc(offersTable.createdAt)),
      db
        .select()
        .from(placementsTable)
        .where(eq(placementsTable.studentId, userId))
        .orderBy(desc(placementsTable.placedAt)),
    ]);

    const jobIds = [
      ...new Set([
        ...apps.map((a) => a.jobId),
        ...offers.map((o) => o.jobId),
        ...placements.map((p) => p.jobId).filter((j): j is number => j != null),
      ]),
    ];
    const jobs = jobIds.length
      ? await db
          .select({ id: jobsTable.id, title: jobsTable.title })
          .from(jobsTable)
          .where(inArray(jobsTable.id, jobIds))
      : [];
    const jobMap = new Map(jobs.map((j) => [j.id, j]));

    res.json({
      isPlaced: placements.length > 0,
      placements: placements.map((p) => ({
        id: p.id,
        jobId: p.jobId,
        applicationId: p.applicationId,
        offerId: p.offerId,
        companyName: p.companyName,
        careerTrack: p.careerTrack,
        packageAmount: p.packageAmount,
        status: p.status,
        placedAt: p.placedAt.toISOString(),
        job: p.jobId ? jobMap.get(p.jobId) ?? null : null,
      })),
      offers: offers.map((o) => ({
        id: o.id,
        applicationId: o.applicationId,
        jobId: o.jobId,
        salary: o.salary,
        joiningDate: o.joiningDate,
        status: o.status,
        expiresAt: o.expiresAt?.toISOString() ?? null,
        createdAt: o.createdAt.toISOString(),
        job: jobMap.get(o.jobId) ?? null,
      })),
      stages: apps.map((a) => ({
        applicationId: a.id,
        jobId: a.jobId,
        status: a.status,
        appliedAt: a.appliedAt.toISOString(),
        job: jobMap.get(a.jobId) ?? null,
      })),
    });
  }
);

// ── GET /placement/student/:id — TPO / admin (track + map scoped) ────────────
router.get(
  "/placement/student/:id",
  requireAuth,
  requireRole("tpo", "admin"),
  async (req: AuthRequest, res): Promise<void> => {
    const studentId = parseInt(String(req.params.id), 10);
    if (isNaN(studentId)) {
      res.status(400).json({ error: "Invalid student id" });
      return;
    }

    const student = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, studentId),
    });
    if (!student || student.role !== "student") {
      res.status(404).json({ error: "Student not found" });
      return;
    }

    if (req.user!.role === "tpo") {
      const profile = await db.query.tpoProfilesTable.findFirst({
        where: eq(tpoProfilesTable.userId, req.user!.userId),
      });
      if (!profile || profile.approvalStatus !== "approved") {
        res.status(403).json({
          error: "TPO account pending admin approval",
          code: "PENDING_APPROVAL",
          approvalStatus: profile?.approvalStatus ?? "pending",
        });
        return;
      }
      const ids = await getTpoStudentIds(
        req.user!.userId,
        profile.institution ?? null
      );
      if (!ids.includes(studentId)) {
        res.status(403).json({ error: "This student is not in your scope" });
        return;
      }
    }

    const [apps, offers, placements] = await Promise.all([
      db
        .select()
        .from(jobApplicationsTable)
        .where(eq(jobApplicationsTable.studentId, studentId))
        .orderBy(desc(jobApplicationsTable.appliedAt)),
      db
        .select()
        .from(offersTable)
        .where(eq(offersTable.studentId, studentId))
        .orderBy(desc(offersTable.createdAt)),
      db
        .select()
        .from(placementsTable)
        .where(eq(placementsTable.studentId, studentId))
        .orderBy(desc(placementsTable.placedAt)),
    ]);

    const jobIds = [
      ...new Set([
        ...apps.map((a) => a.jobId),
        ...offers.map((o) => o.jobId),
        ...placements.map((p) => p.jobId).filter((j): j is number => j != null),
      ]),
    ];
    const jobs = jobIds.length
      ? await db
          .select({ id: jobsTable.id, title: jobsTable.title })
          .from(jobsTable)
          .where(inArray(jobsTable.id, jobIds))
      : [];
    const jobMap = new Map(jobs.map((j) => [j.id, j]));

    res.json({
      student: {
        id: student.id,
        fullName: student.fullName,
        email: student.email,
        careerTrack: student.careerTrack,
      },
      isPlaced: placements.length > 0,
      placements: placements.map((p) => ({
        id: p.id,
        jobId: p.jobId,
        applicationId: p.applicationId,
        offerId: p.offerId,
        companyName: p.companyName,
        careerTrack: p.careerTrack,
        packageAmount: p.packageAmount,
        status: p.status,
        placedAt: p.placedAt.toISOString(),
        job: p.jobId ? jobMap.get(p.jobId) ?? null : null,
      })),
      offers: offers.map((o) => ({
        id: o.id,
        applicationId: o.applicationId,
        jobId: o.jobId,
        salary: o.salary,
        joiningDate: o.joiningDate,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
        job: jobMap.get(o.jobId) ?? null,
      })),
      stages: apps.map((a) => ({
        applicationId: a.id,
        jobId: a.jobId,
        status: a.status,
        appliedAt: a.appliedAt.toISOString(),
        job: jobMap.get(a.jobId) ?? null,
      })),
    });
  }
);

export default router;
