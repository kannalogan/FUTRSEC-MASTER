import { Router, type Response, type NextFunction } from "express";
import { eq, and, inArray, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable,
  studentProfilesTable,
  employersTable,
  jobsTable,
  jobSkillsTable,
  jobApplicationsTable,
  jobShortlistsTable,
  interviewsTable,
  offersTable,
  ftsScoresTable,
} from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";

const router = Router();

const CAREER_TRACKS = ["soc", "vapt", "grc"] as const;
function isTrackArray(v: unknown): v is string[] {
  return (
    Array.isArray(v) &&
    v.every(
      (t) => typeof t === "string" && (CAREER_TRACKS as readonly string[]).includes(t)
    )
  );
}

async function loadEmployer(userId: number) {
  return db.query.employersTable.findFirst({
    where: eq(employersTable.userId, userId),
  });
}

async function requireApprovedEmployer(
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
  if (!me || me.role !== "employer") {
    res.status(403).json({ error: "Employer access required" });
    return;
  }
  if (!me.isActive) {
    res.status(403).json({ error: "Your company account is deactivated" });
    return;
  }
  const emp = await loadEmployer(req.user.userId);
  if (!emp || emp.approvalStatus !== "approved") {
    res.status(403).json({
      error: "Company account pending admin verification",
      code: "PENDING_APPROVAL",
      approvalStatus: emp?.approvalStatus ?? "pending",
    });
    return;
  }
  // attach employerId for downstream handlers
  (req as AuthRequest & { employerId?: number }).employerId = emp.id;
  next();
}

const empGuards = [requireAuth, requireRole("employer"), requireApprovedEmployer];

function getEmployerId(req: AuthRequest): number {
  return (req as AuthRequest & { employerId?: number }).employerId!;
}

// Verify a job belongs to the calling employer; returns job or null
async function ownedJob(jobId: number, employerId: number) {
  const job = await db.query.jobsTable.findFirst({
    where: eq(jobsTable.id, jobId),
  });
  if (!job || job.employerId !== employerId) return null;
  return job;
}

// Verify an application belongs to one of the employer's jobs
async function ownedApplication(applicationId: number, employerId: number) {
  const app = await db.query.jobApplicationsTable.findFirst({
    where: eq(jobApplicationsTable.id, applicationId),
  });
  if (!app) return null;
  const job = await ownedJob(app.jobId, employerId);
  if (!job) return null;
  return { app, job };
}

// ── GET /employer/me ─────────────────────────────────────────────────────────
router.get(
  "/employer/me",
  requireAuth,
  requireRole("employer"),
  async (req: AuthRequest, res): Promise<void> => {
    const me = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, req.user!.userId),
    });
    const emp = await loadEmployer(req.user!.userId);
    res.json({
      profile: {
        id: me?.id,
        email: me?.email,
        fullName: me?.fullName,
        isActive: me?.isActive ?? false,
        companyName: emp?.companyName ?? null,
        industry: emp?.industry ?? null,
        companySize: emp?.companySize ?? null,
        website: emp?.website ?? null,
        linkedinUrl: emp?.linkedinUrl ?? null,
        designation: emp?.designation ?? null,
        logoUrl: emp?.logoUrl ?? null,
        isVerified: emp?.isVerified ?? false,
        approvalStatus: emp?.approvalStatus ?? "pending",
        rejectionReason: emp?.rejectionReason ?? null,
      },
    });
  }
);

// ── GET /employer/overview — hiring analytics cards ──────────────────────────
router.get(
  "/employer/overview",
  ...empGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const employerId = getEmployerId(req);
    const jobs = await db
      .select()
      .from(jobsTable)
      .where(eq(jobsTable.employerId, employerId));
    const jobIds = jobs.map((j) => j.id);

    const apps = jobIds.length
      ? await db
          .select()
          .from(jobApplicationsTable)
          .where(inArray(jobApplicationsTable.jobId, jobIds))
      : [];
    const appIds = apps.map((a) => a.id);
    const ints = appIds.length
      ? await db
          .select()
          .from(interviewsTable)
          .where(inArray(interviewsTable.applicationId, appIds))
      : [];
    const offers = appIds.length
      ? await db
          .select()
          .from(offersTable)
          .where(inArray(offersTable.applicationId, appIds))
      : [];

    res.json({
      totalJobs: jobs.length,
      activeJobs: jobs.filter((j) => j.status === "active").length,
      applications: apps.length,
      shortlisted: apps.filter((a) => a.status === "shortlisted").length,
      interviews: ints.length,
      offers: offers.length,
      hired: offers.filter((o) => o.status === "accepted").length,
    });
  }
);

// ── Jobs CRUD ────────────────────────────────────────────────────────────────
router.get(
  "/employer/jobs",
  ...empGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const employerId = getEmployerId(req);
    const jobs = await db
      .select()
      .from(jobsTable)
      .where(eq(jobsTable.employerId, employerId))
      .orderBy(desc(jobsTable.createdAt));
    const jobIds = jobs.map((j) => j.id);
    const apps = jobIds.length
      ? await db
          .select({ jobId: jobApplicationsTable.jobId })
          .from(jobApplicationsTable)
          .where(inArray(jobApplicationsTable.jobId, jobIds))
      : [];
    const appCount = new Map<number, number>();
    for (const a of apps) appCount.set(a.jobId, (appCount.get(a.jobId) ?? 0) + 1);

    res.json({
      jobs: jobs.map((j) => ({
        ...j,
        applicationDeadline: j.applicationDeadline?.toISOString() ?? null,
        createdAt: j.createdAt.toISOString(),
        updatedAt: j.updatedAt.toISOString(),
        applications: appCount.get(j.id) ?? 0,
      })),
    });
  }
);

router.post(
  "/employer/jobs",
  ...empGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const employerId = getEmployerId(req);
    const {
      title,
      description,
      type,
      location,
      isRemote,
      minSalary,
      maxSalary,
      experience,
      requiredTracks,
      applicationDeadline,
      skills,
      status,
    } = req.body ?? {};

    if (typeof title !== "string" || title.trim().length < 2) {
      res.status(400).json({ error: "title is required" });
      return;
    }
    if (typeof description !== "string" || description.trim().length < 2) {
      res.status(400).json({ error: "description is required" });
      return;
    }
    if (requiredTracks != null && !isTrackArray(requiredTracks)) {
      res
        .status(400)
        .json({ error: "requiredTracks must be an array of soc/vapt/grc" });
      return;
    }
    const allowedStatus = ["active", "draft", "closed"];
    const jobStatus =
      typeof status === "string" && allowedStatus.includes(status)
        ? status
        : "active";

    const [job] = await db
      .insert(jobsTable)
      .values({
        employerId,
        title: title.trim(),
        description: description.trim(),
        type: typeof type === "string" && type ? type : "full_time",
        location: location ?? null,
        isRemote: !!isRemote,
        minSalary: typeof minSalary === "number" ? minSalary : null,
        maxSalary: typeof maxSalary === "number" ? maxSalary : null,
        experience: experience ?? null,
        requiredTracks: isTrackArray(requiredTracks) ? requiredTracks : [],
        status: jobStatus,
        applicationDeadline: applicationDeadline
          ? new Date(applicationDeadline)
          : null,
      })
      .returning();

    if (Array.isArray(skills) && skills.length) {
      const rows = skills
        .filter((s: unknown) => typeof s === "string" && s.trim())
        .map((s: string) => ({ jobId: job.id, skill: s.trim() }));
      if (rows.length) await db.insert(jobSkillsTable).values(rows);
    }

    await createAuditLog({
      userId: req.user!.userId,
      action: "employer.job.created",
      entityType: "job",
      entityId: job.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { title: job.title, status: jobStatus },
    });

    res.status(201).json({ job });
  }
);

router.patch(
  "/employer/jobs/:id",
  ...empGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const employerId = getEmployerId(req);
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid job id" });
      return;
    }
    const job = await ownedJob(id, employerId);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    const b = req.body ?? {};
    if (b.requiredTracks != null && !isTrackArray(b.requiredTracks)) {
      res
        .status(400)
        .json({ error: "requiredTracks must be an array of soc/vapt/grc" });
      return;
    }
    const allowedStatus = ["active", "draft", "closed"];

    const [updated] = await db
      .update(jobsTable)
      .set({
        ...(typeof b.title === "string" ? { title: b.title.trim() } : {}),
        ...(typeof b.description === "string"
          ? { description: b.description.trim() }
          : {}),
        ...(typeof b.type === "string" ? { type: b.type } : {}),
        ...(b.location !== undefined ? { location: b.location } : {}),
        ...(b.isRemote !== undefined ? { isRemote: !!b.isRemote } : {}),
        ...(b.minSalary !== undefined ? { minSalary: b.minSalary ?? null } : {}),
        ...(b.maxSalary !== undefined ? { maxSalary: b.maxSalary ?? null } : {}),
        ...(b.experience !== undefined ? { experience: b.experience } : {}),
        ...(isTrackArray(b.requiredTracks)
          ? { requiredTracks: b.requiredTracks }
          : {}),
        ...(typeof b.status === "string" && allowedStatus.includes(b.status)
          ? { status: b.status }
          : {}),
        ...(b.applicationDeadline !== undefined
          ? {
              applicationDeadline: b.applicationDeadline
                ? new Date(b.applicationDeadline)
                : null,
            }
          : {}),
      })
      .where(eq(jobsTable.id, id))
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "employer.job.updated",
      entityType: "job",
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ job: updated });
  }
);

// ── Candidate management ─────────────────────────────────────────────────────
router.get(
  "/employer/jobs/:id/candidates",
  ...empGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const employerId = getEmployerId(req);
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid job id" });
      return;
    }
    const job = await ownedJob(id, employerId);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const apps = await db
      .select()
      .from(jobApplicationsTable)
      .where(eq(jobApplicationsTable.jobId, id))
      .orderBy(desc(jobApplicationsTable.appliedAt));
    const studentIds = [...new Set(apps.map((a) => a.studentId))];
    if (studentIds.length === 0) {
      res.json({ candidates: [] });
      return;
    }

    const [students, profiles, fts] = await Promise.all([
      db
        .select({
          id: usersTable.id,
          fullName: usersTable.fullName,
          email: usersTable.email,
          careerTrack: usersTable.careerTrack,
        })
        .from(usersTable)
        .where(inArray(usersTable.id, studentIds)),
      db
        .select()
        .from(studentProfilesTable)
        .where(inArray(studentProfilesTable.userId, studentIds)),
      db
        .select()
        .from(ftsScoresTable)
        .where(inArray(ftsScoresTable.userId, studentIds)),
    ]);
    const stuMap = new Map(students.map((s) => [s.id, s]));
    const profMap = new Map(profiles.map((p) => [p.userId, p]));
    const ftsMap = new Map(fts.map((f) => [f.userId, f.totalScore]));

    res.json({
      candidates: apps.map((a) => ({
        application: {
          id: a.id,
          status: a.status,
          coverLetter: a.coverLetter,
          resumeUrl: a.resumeUrl,
          appliedAt: a.appliedAt.toISOString(),
        },
        student: stuMap.get(a.studentId) ?? null,
        profile: profMap.get(a.studentId) ?? null,
        ftsScore: ftsMap.get(a.studentId) ?? 0,
      })),
    });
  }
);

router.patch(
  "/employer/applications/:id",
  ...empGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const employerId = getEmployerId(req);
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid application id" });
      return;
    }
    const owned = await ownedApplication(id, employerId);
    if (!owned) {
      res.status(404).json({ error: "Application not found" });
      return;
    }
    const status = req.body?.status;
    const allowed = [
      "applied",
      "reviewing",
      "shortlisted",
      "interviewing",
      "offered",
      "rejected",
      "hired",
    ];
    if (typeof status !== "string" || !allowed.includes(status)) {
      res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
      return;
    }

    const [updated] = await db
      .update(jobApplicationsTable)
      .set({ status })
      .where(eq(jobApplicationsTable.id, id))
      .returning();

    if (status === "shortlisted") {
      const existing = await db.query.jobShortlistsTable.findFirst({
        where: and(
          eq(jobShortlistsTable.jobId, owned.app.jobId),
          eq(jobShortlistsTable.studentId, owned.app.studentId)
        ),
      });
      if (!existing) {
        await db.insert(jobShortlistsTable).values({
          jobId: owned.app.jobId,
          studentId: owned.app.studentId,
          shortlistedBy: req.user!.userId,
          reason: req.body?.reason ?? null,
        });
      }
    }

    await createAuditLog({
      userId: req.user!.userId,
      action: "employer.application.status_changed",
      entityType: "job_application",
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { status },
    });

    res.json({ application: updated });
  }
);

// ── Interview scheduling ─────────────────────────────────────────────────────
router.get(
  "/employer/interviews",
  ...empGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const employerId = getEmployerId(req);
    const jobs = await db
      .select({ id: jobsTable.id })
      .from(jobsTable)
      .where(eq(jobsTable.employerId, employerId));
    const jobIds = jobs.map((j) => j.id);
    if (jobIds.length === 0) {
      res.json({ interviews: [] });
      return;
    }
    const apps = await db
      .select()
      .from(jobApplicationsTable)
      .where(inArray(jobApplicationsTable.jobId, jobIds));
    const appIds = apps.map((a) => a.id);
    if (appIds.length === 0) {
      res.json({ interviews: [] });
      return;
    }
    const ints = await db
      .select()
      .from(interviewsTable)
      .where(inArray(interviewsTable.applicationId, appIds))
      .orderBy(desc(interviewsTable.createdAt));

    const appMap = new Map(apps.map((a) => [a.id, a]));
    const studentIds = [...new Set(apps.map((a) => a.studentId))];
    const students = await db
      .select({
        id: usersTable.id,
        fullName: usersTable.fullName,
        email: usersTable.email,
      })
      .from(usersTable)
      .where(inArray(usersTable.id, studentIds));
    const stuMap = new Map(students.map((s) => [s.id, s]));
    const jobsFull = await db
      .select({ id: jobsTable.id, title: jobsTable.title })
      .from(jobsTable)
      .where(inArray(jobsTable.id, jobIds));
    const jobMap = new Map(jobsFull.map((j) => [j.id, j]));

    res.json({
      interviews: ints.map((iv) => {
        const app = appMap.get(iv.applicationId);
        return {
          ...iv,
          scheduledAt: iv.scheduledAt?.toISOString() ?? null,
          createdAt: iv.createdAt.toISOString(),
          updatedAt: iv.updatedAt.toISOString(),
          student: app ? stuMap.get(app.studentId) ?? null : null,
          job: app ? jobMap.get(app.jobId) ?? null : null,
        };
      }),
    });
  }
);

router.post(
  "/employer/interviews",
  ...empGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const employerId = getEmployerId(req);
    const { applicationId, type, scheduledAt, meetingUrl } = req.body ?? {};
    const appId = parseInt(String(applicationId), 10);
    if (isNaN(appId)) {
      res.status(400).json({ error: "applicationId is required" });
      return;
    }
    const owned = await ownedApplication(appId, employerId);
    if (!owned) {
      res.status(404).json({ error: "Application not found" });
      return;
    }
    const allowedTypes = ["technical", "hr", "managerial", "final"];
    const interviewType =
      typeof type === "string" && allowedTypes.includes(type)
        ? type
        : "technical";

    const [interview] = await db
      .insert(interviewsTable)
      .values({
        applicationId: appId,
        type: interviewType,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        meetingUrl: meetingUrl ?? null,
        status: "scheduled",
      })
      .returning();

    await db
      .update(jobApplicationsTable)
      .set({ status: "interviewing" })
      .where(eq(jobApplicationsTable.id, appId));

    await createAuditLog({
      userId: req.user!.userId,
      action: "employer.interview.scheduled",
      entityType: "interview",
      entityId: interview.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { applicationId: appId, type: interviewType },
    });

    res.status(201).json({ interview });
  }
);

router.patch(
  "/employer/interviews/:id",
  ...empGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const employerId = getEmployerId(req);
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid interview id" });
      return;
    }
    const interview = await db.query.interviewsTable.findFirst({
      where: eq(interviewsTable.id, id),
    });
    if (!interview) {
      res.status(404).json({ error: "Interview not found" });
      return;
    }
    const owned = await ownedApplication(interview.applicationId, employerId);
    if (!owned) {
      res.status(403).json({ error: "This interview does not belong to you" });
      return;
    }
    const b = req.body ?? {};
    const allowedStatus = ["scheduled", "completed", "cancelled", "no_show"];

    const [updated] = await db
      .update(interviewsTable)
      .set({
        ...(typeof b.type === "string" ? { type: b.type } : {}),
        ...(b.scheduledAt !== undefined
          ? { scheduledAt: b.scheduledAt ? new Date(b.scheduledAt) : null }
          : {}),
        ...(b.meetingUrl !== undefined ? { meetingUrl: b.meetingUrl } : {}),
        ...(b.feedback !== undefined ? { feedback: b.feedback } : {}),
        ...(b.interviewerNotes !== undefined
          ? { interviewerNotes: b.interviewerNotes }
          : {}),
        ...(typeof b.status === "string" && allowedStatus.includes(b.status)
          ? { status: b.status }
          : {}),
      })
      .where(eq(interviewsTable.id, id))
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "employer.interview.updated",
      entityType: "interview",
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ interview: updated });
  }
);

// ── Offer management ─────────────────────────────────────────────────────────
router.get(
  "/employer/offers",
  ...empGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const employerId = getEmployerId(req);
    const jobs = await db
      .select({ id: jobsTable.id, title: jobsTable.title })
      .from(jobsTable)
      .where(eq(jobsTable.employerId, employerId));
    const jobIds = jobs.map((j) => j.id);
    if (jobIds.length === 0) {
      res.json({ offers: [] });
      return;
    }
    const offers = await db
      .select()
      .from(offersTable)
      .where(inArray(offersTable.jobId, jobIds))
      .orderBy(desc(offersTable.createdAt));
    const jobMap = new Map(jobs.map((j) => [j.id, j]));
    const studentIds = [...new Set(offers.map((o) => o.studentId))];
    const students = studentIds.length
      ? await db
          .select({
            id: usersTable.id,
            fullName: usersTable.fullName,
            email: usersTable.email,
          })
          .from(usersTable)
          .where(inArray(usersTable.id, studentIds))
      : [];
    const stuMap = new Map(students.map((s) => [s.id, s]));

    res.json({
      offers: offers.map((o) => ({
        ...o,
        expiresAt: o.expiresAt?.toISOString() ?? null,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
        student: stuMap.get(o.studentId) ?? null,
        job: jobMap.get(o.jobId) ?? null,
      })),
    });
  }
);

router.post(
  "/employer/offers",
  ...empGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const employerId = getEmployerId(req);
    const { applicationId, salary, joiningDate, offerLetterUrl, expiresAt } =
      req.body ?? {};
    const appId = parseInt(String(applicationId), 10);
    if (isNaN(appId)) {
      res.status(400).json({ error: "applicationId is required" });
      return;
    }
    const owned = await ownedApplication(appId, employerId);
    if (!owned) {
      res.status(404).json({ error: "Application not found" });
      return;
    }
    const existing = await db.query.offersTable.findFirst({
      where: eq(offersTable.applicationId, appId),
    });
    if (existing) {
      res
        .status(409)
        .json({ error: "An offer already exists for this application" });
      return;
    }

    const [offer] = await db
      .insert(offersTable)
      .values({
        applicationId: appId,
        studentId: owned.app.studentId,
        jobId: owned.app.jobId,
        salary: typeof salary === "number" ? salary : null,
        joiningDate: joiningDate ?? null,
        offerLetterUrl: offerLetterUrl ?? null,
        status: "sent",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      })
      .returning();

    await db
      .update(jobApplicationsTable)
      .set({ status: "offered" })
      .where(eq(jobApplicationsTable.id, appId));

    await createAuditLog({
      userId: req.user!.userId,
      action: "employer.offer.created",
      entityType: "offer",
      entityId: offer.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { applicationId: appId },
    });

    res.status(201).json({ offer });
  }
);

router.patch(
  "/employer/offers/:id",
  ...empGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const employerId = getEmployerId(req);
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid offer id" });
      return;
    }
    const offer = await db.query.offersTable.findFirst({
      where: eq(offersTable.id, id),
    });
    if (!offer) {
      res.status(404).json({ error: "Offer not found" });
      return;
    }
    const job = await ownedJob(offer.jobId, employerId);
    if (!job) {
      res.status(403).json({ error: "This offer does not belong to you" });
      return;
    }
    const b = req.body ?? {};
    const allowedStatus = ["sent", "accepted", "rejected", "withdrawn", "expired"];

    const [updated] = await db
      .update(offersTable)
      .set({
        ...(b.salary !== undefined ? { salary: b.salary ?? null } : {}),
        ...(b.joiningDate !== undefined ? { joiningDate: b.joiningDate } : {}),
        ...(b.offerLetterUrl !== undefined
          ? { offerLetterUrl: b.offerLetterUrl }
          : {}),
        ...(typeof b.status === "string" && allowedStatus.includes(b.status)
          ? { status: b.status }
          : {}),
        ...(b.expiresAt !== undefined
          ? { expiresAt: b.expiresAt ? new Date(b.expiresAt) : null }
          : {}),
      })
      .where(eq(offersTable.id, id))
      .returning();

    if (b.status === "accepted") {
      await db
        .update(jobApplicationsTable)
        .set({ status: "hired" })
        .where(eq(jobApplicationsTable.id, offer.applicationId));
    }

    await createAuditLog({
      userId: req.user!.userId,
      action: "employer.offer.updated",
      entityType: "offer",
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { status: b.status },
    });

    res.json({ offer: updated });
  }
);

export default router;
