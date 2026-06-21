import { Router } from "express";
import { eq, and, desc, inArray, gte, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable,
  studentProfilesTable,
  tpoProfilesTable,
  employersTable,
  jobsTable,
  jobApplicationsTable,
  offersTable,
  interviewsTable,
  subscriptionsTable,
  paymentsTable,
  aiHistoryTable,
  consentLogsTable,
  auditLogsTable,
} from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";

const router = Router();
const adminGuards = [requireAuth, requireRole("admin")];

const CAREER_TRACKS = ["soc", "vapt", "grc"] as const;
type CareerTrack = (typeof CAREER_TRACKS)[number];

// ── GET /admin/overview — dashboard cards ────────────────────────────────────
router.get(
  "/admin/overview",
  ...adminGuards,
  async (_req: AuthRequest, res): Promise<void> => {
    const now = Date.now();
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [
      students,
      mentors,
      tpos,
      companies,
      jobs,
      applications,
      offers,
      subs,
      payments,
      aiCount,
      dau,
      mau,
    ] = await Promise.all([
      db
        .select({ id: usersTable.id, careerTrack: usersTable.careerTrack })
        .from(usersTable)
        .where(eq(usersTable.role, "student")),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(usersTable)
        .where(eq(usersTable.role, "mentor")),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(usersTable)
        .where(eq(usersTable.role, "tpo")),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(usersTable)
        .where(eq(usersTable.role, "employer")),
      db.select({ c: sql<number>`count(*)::int` }).from(jobsTable),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(jobApplicationsTable),
      db
        .select({ status: offersTable.status })
        .from(offersTable),
      db
        .select({ status: subscriptionsTable.status })
        .from(subscriptionsTable),
      db
        .select({ amount: paymentsTable.amount, status: paymentsTable.status })
        .from(paymentsTable),
      db.select({ c: sql<number>`count(*)::int` }).from(aiHistoryTable),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(usersTable)
        .where(gte(usersTable.lastLoginAt, dayAgo)),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(usersTable)
        .where(gte(usersTable.lastLoginAt, monthAgo)),
    ]);

    const byTrack = { soc: 0, vapt: 0, grc: 0 };
    for (const s of students) {
      if (s.careerTrack && s.careerTrack in byTrack)
        byTrack[s.careerTrack as CareerTrack] += 1;
    }

    const revenue = payments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + (p.amount ?? 0), 0);

    res.json({
      totalStudents: students.length,
      byTrack,
      mentors: mentors[0]?.c ?? 0,
      tpos: tpos[0]?.c ?? 0,
      companies: companies[0]?.c ?? 0,
      jobs: jobs[0]?.c ?? 0,
      applications: applications[0]?.c ?? 0,
      placements: offers.filter((o) => o.status === "accepted").length,
      revenue,
      subscriptions: subs.filter((s) => s.status === "active").length,
      dailyActiveUsers: dau[0]?.c ?? 0,
      monthlyActiveUsers: mau[0]?.c ?? 0,
      aiUsage: aiCount[0]?.c ?? 0,
    });
  }
);

// ── GET /admin/track-analytics ───────────────────────────────────────────────
router.get(
  "/admin/track-analytics",
  ...adminGuards,
  async (_req: AuthRequest, res): Promise<void> => {
    const students = await db
      .select({ id: usersTable.id, careerTrack: usersTable.careerTrack })
      .from(usersTable)
      .where(eq(usersTable.role, "student"));
    const studentIds = students.map((s) => s.id);
    const trackOf = new Map(students.map((s) => [s.id, s.careerTrack]));

    const [apps, offers] = await Promise.all([
      studentIds.length
        ? db
            .select({ studentId: jobApplicationsTable.studentId })
            .from(jobApplicationsTable)
            .where(inArray(jobApplicationsTable.studentId, studentIds))
        : Promise.resolve([] as { studentId: number }[]),
      studentIds.length
        ? db
            .select({
              studentId: offersTable.studentId,
              status: offersTable.status,
            })
            .from(offersTable)
            .where(inArray(offersTable.studentId, studentIds))
        : Promise.resolve([] as { studentId: number; status: string }[]),
    ]);

    const rows = CAREER_TRACKS.map((track) => ({
      track,
      students: students.filter((s) => s.careerTrack === track).length,
      applications: apps.filter((a) => trackOf.get(a.studentId) === track).length,
      placements: offers.filter(
        (o) => trackOf.get(o.studentId) === track && o.status === "accepted"
      ).length,
    }));
    res.json({ rows });
  }
);

// ── TPO management ───────────────────────────────────────────────────────────
router.get(
  "/admin/tpos",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const statusFilter =
      typeof req.query.status === "string" ? req.query.status : null;
    const rows = await db
      .select({
        userId: usersTable.id,
        email: usersTable.email,
        fullName: usersTable.fullName,
        isActive: usersTable.isActive,
        createdAt: usersTable.createdAt,
        institution: tpoProfilesTable.institution,
        designation: tpoProfilesTable.designation,
        approvalStatus: tpoProfilesTable.approvalStatus,
        rejectionReason: tpoProfilesTable.rejectionReason,
      })
      .from(usersTable)
      .innerJoin(tpoProfilesTable, eq(tpoProfilesTable.userId, usersTable.id))
      .where(
        statusFilter
          ? and(
              eq(usersTable.role, "tpo"),
              eq(tpoProfilesTable.approvalStatus, statusFilter)
            )
          : eq(usersTable.role, "tpo")
      )
      .orderBy(desc(usersTable.createdAt));
    res.json({
      tpos: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    });
  }
);

async function reviewProfile(
  req: AuthRequest,
  res: import("express").Response,
  role: "tpo" | "employer",
  decision: "approved" | "rejected"
): Promise<void> {
  const userId = parseInt(String(req.params.id), 10);
  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId),
  });
  if (!user || user.role !== role) {
    res.status(404).json({ error: `${role} not found` });
    return;
  }
  const reason =
    typeof req.body?.reason === "string" ? req.body.reason : null;
  const reviewedAt = new Date();

  if (role === "tpo") {
    await db
      .update(tpoProfilesTable)
      .set({
        approvalStatus: decision,
        reviewedBy: req.user!.userId,
        reviewedAt,
        rejectionReason: decision === "rejected" ? reason : null,
      })
      .where(eq(tpoProfilesTable.userId, userId));
  } else {
    await db
      .update(employersTable)
      .set({
        approvalStatus: decision,
        isVerified: decision === "approved",
        reviewedBy: req.user!.userId,
        reviewedAt,
        rejectionReason: decision === "rejected" ? reason : null,
      })
      .where(eq(employersTable.userId, userId));
  }

  // Keep the user's onboarding state consistent with the approval decision so
  // any onboardingStep-based logic treats an approved tpo/employer as done.
  if (decision === "approved") {
    await db
      .update(usersTable)
      .set({ onboardingStep: "complete" })
      .where(eq(usersTable.id, userId));
  }

  await createAuditLog({
    userId: req.user!.userId,
    action: `admin.${role}.${decision}`,
    entityType: role,
    entityId: userId,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
    metadata: { decision, reason },
  });

  res.json({ success: true, userId, approvalStatus: decision });
}

router.post("/admin/tpos/:id/approve", ...adminGuards, (req: AuthRequest, res) =>
  reviewProfile(req, res, "tpo", "approved")
);
router.post("/admin/tpos/:id/reject", ...adminGuards, (req: AuthRequest, res) =>
  reviewProfile(req, res, "tpo", "rejected")
);

// ── Company (employer) management ────────────────────────────────────────────
router.get(
  "/admin/companies",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const statusFilter =
      typeof req.query.status === "string" ? req.query.status : null;
    const rows = await db
      .select({
        userId: usersTable.id,
        email: usersTable.email,
        fullName: usersTable.fullName,
        isActive: usersTable.isActive,
        createdAt: usersTable.createdAt,
        companyName: employersTable.companyName,
        industry: employersTable.industry,
        companySize: employersTable.companySize,
        website: employersTable.website,
        isVerified: employersTable.isVerified,
        approvalStatus: employersTable.approvalStatus,
        rejectionReason: employersTable.rejectionReason,
      })
      .from(usersTable)
      .innerJoin(employersTable, eq(employersTable.userId, usersTable.id))
      .where(
        statusFilter
          ? and(
              eq(usersTable.role, "employer"),
              eq(employersTable.approvalStatus, statusFilter)
            )
          : eq(usersTable.role, "employer")
      )
      .orderBy(desc(usersTable.createdAt));
    res.json({
      companies: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  }
);

router.post(
  "/admin/companies/:id/approve",
  ...adminGuards,
  (req: AuthRequest, res) => reviewProfile(req, res, "employer", "approved")
);
router.post(
  "/admin/companies/:id/reject",
  ...adminGuards,
  (req: AuthRequest, res) => reviewProfile(req, res, "employer", "rejected")
);

// ── Jobs (all) ───────────────────────────────────────────────────────────────
router.get(
  "/admin/jobs",
  ...adminGuards,
  async (_req: AuthRequest, res): Promise<void> => {
    const jobs = await db
      .select()
      .from(jobsTable)
      .orderBy(desc(jobsTable.createdAt))
      .limit(500);
    const employerIds = [...new Set(jobs.map((j) => j.employerId).filter((id): id is number => id !== null))];
    const emps = employerIds.length
      ? await db
          .select({ id: employersTable.id, companyName: employersTable.companyName })
          .from(employersTable)
          .where(inArray(employersTable.id, employerIds))
      : [];
    const empMap = new Map(emps.map((e) => [e.id, e.companyName]));
    res.json({
      jobs: jobs.map((j) => ({
        ...j,
        applicationDeadline: j.applicationDeadline?.toISOString() ?? null,
        createdAt: j.createdAt.toISOString(),
        updatedAt: j.updatedAt.toISOString(),
        companyName: j.employerId !== null ? empMap.get(j.employerId) ?? null : null,
      })),
    });
  }
);

// ── Applications (all) ───────────────────────────────────────────────────────
router.get(
  "/admin/applications",
  ...adminGuards,
  async (_req: AuthRequest, res): Promise<void> => {
    const apps = await db
      .select()
      .from(jobApplicationsTable)
      .orderBy(desc(jobApplicationsTable.appliedAt))
      .limit(500);
    const jobIds = [...new Set(apps.map((a) => a.jobId))];
    const studentIds = [...new Set(apps.map((a) => a.studentId))];
    const [jobs, students] = await Promise.all([
      jobIds.length
        ? db
            .select({ id: jobsTable.id, title: jobsTable.title })
            .from(jobsTable)
            .where(inArray(jobsTable.id, jobIds))
        : Promise.resolve([]),
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
    ]);
    const jobMap = new Map(jobs.map((j) => [j.id, j]));
    const stuMap = new Map(students.map((s) => [s.id, s]));
    res.json({
      applications: apps.map((a) => ({
        id: a.id,
        status: a.status,
        appliedAt: a.appliedAt.toISOString(),
        job: jobMap.get(a.jobId) ?? null,
        student: stuMap.get(a.studentId) ?? null,
      })),
    });
  }
);

// ── Placements (offers, all) ─────────────────────────────────────────────────
router.get(
  "/admin/placements",
  ...adminGuards,
  async (_req: AuthRequest, res): Promise<void> => {
    const offers = await db
      .select()
      .from(offersTable)
      .orderBy(desc(offersTable.createdAt))
      .limit(500);
    const jobIds = [...new Set(offers.map((o) => o.jobId))];
    const studentIds = [...new Set(offers.map((o) => o.studentId))];
    const [jobs, students] = await Promise.all([
      jobIds.length
        ? db
            .select({
              id: jobsTable.id,
              title: jobsTable.title,
              employerId: jobsTable.employerId,
            })
            .from(jobsTable)
            .where(inArray(jobsTable.id, jobIds))
        : Promise.resolve([]),
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
    ]);
    const jobMap = new Map(jobs.map((j) => [j.id, j]));
    const stuMap = new Map(students.map((s) => [s.id, s]));
    res.json({
      placements: offers.map((o) => ({
        id: o.id,
        status: o.status,
        salary: o.salary,
        joiningDate: o.joiningDate,
        createdAt: o.createdAt.toISOString(),
        job: jobMap.get(o.jobId) ?? null,
        student: stuMap.get(o.studentId) ?? null,
      })),
    });
  }
);

// ── Subscriptions ────────────────────────────────────────────────────────────
router.get(
  "/admin/subscriptions",
  ...adminGuards,
  async (_req: AuthRequest, res): Promise<void> => {
    const subs = await db
      .select()
      .from(subscriptionsTable)
      .orderBy(desc(subscriptionsTable.id))
      .limit(500);
    const userIds = [...new Set(subs.map((s) => s.userId))];
    const users = userIds.length
      ? await db
          .select({
            id: usersTable.id,
            fullName: usersTable.fullName,
            email: usersTable.email,
          })
          .from(usersTable)
          .where(inArray(usersTable.id, userIds))
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));
    res.json({
      subscriptions: subs.map((s) => ({
        ...s,
        user: userMap.get(s.userId) ?? null,
      })),
    });
  }
);

// ── Payments ─────────────────────────────────────────────────────────────────
router.get(
  "/admin/payments",
  ...adminGuards,
  async (_req: AuthRequest, res): Promise<void> => {
    const payments = await db
      .select()
      .from(paymentsTable)
      .orderBy(desc(paymentsTable.id))
      .limit(500);
    const userIds = [...new Set(payments.map((p) => p.userId))];
    const users = userIds.length
      ? await db
          .select({
            id: usersTable.id,
            fullName: usersTable.fullName,
            email: usersTable.email,
          })
          .from(usersTable)
          .where(inArray(usersTable.id, userIds))
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));
    res.json({
      payments: payments.map((p) => ({
        ...p,
        user: userMap.get(p.userId) ?? null,
      })),
    });
  }
);

// ── AI usage ─────────────────────────────────────────────────────────────────
router.get(
  "/admin/ai-usage",
  ...adminGuards,
  async (_req: AuthRequest, res): Promise<void> => {
    const history = await db
      .select()
      .from(aiHistoryTable)
      .orderBy(desc(aiHistoryTable.id))
      .limit(300);
    const totalTokens = history.reduce((s, h) => s + (h.tokens ?? 0), 0);
    const byModel = new Map<string, number>();
    for (const h of history) {
      const m = h.model ?? "unknown";
      byModel.set(m, (byModel.get(m) ?? 0) + 1);
    }
    const userIds = [...new Set(history.map((h) => h.userId))];
    const users = userIds.length
      ? await db
          .select({
            id: usersTable.id,
            fullName: usersTable.fullName,
            email: usersTable.email,
          })
          .from(usersTable)
          .where(inArray(usersTable.id, userIds))
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));
    res.json({
      totalInteractions: history.length,
      totalTokens,
      byModel: [...byModel.entries()].map(([model, count]) => ({
        model,
        count,
      })),
      recent: history.slice(0, 100).map((h) => ({
        id: h.id,
        model: h.model,
        tokens: h.tokens,
        createdAt: h.createdAt?.toISOString?.() ?? null,
        user: userMap.get(h.userId) ?? null,
      })),
    });
  }
);

// ── Consent logs ─────────────────────────────────────────────────────────────
router.get(
  "/admin/consent-logs",
  ...adminGuards,
  async (_req: AuthRequest, res): Promise<void> => {
    const logs = await db
      .select()
      .from(consentLogsTable)
      .orderBy(desc(consentLogsTable.updatedAt))
      .limit(500);
    const userIds = [...new Set(logs.map((l) => l.userId))];
    const users = userIds.length
      ? await db
          .select({
            id: usersTable.id,
            fullName: usersTable.fullName,
            email: usersTable.email,
          })
          .from(usersTable)
          .where(inArray(usersTable.id, userIds))
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));
    res.json({
      consents: logs.map((l) => ({
        id: l.id,
        marketing: l.marketing,
        analytics: l.analytics,
        dataProcessing: l.dataProcessing,
        thirdParty: l.thirdParty,
        updatedAt: l.updatedAt.toISOString(),
        user: userMap.get(l.userId) ?? null,
      })),
    });
  }
);

// ── Audit logs ───────────────────────────────────────────────────────────────
router.get(
  "/admin/audit-logs",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const action =
      typeof req.query.action === "string" ? req.query.action.trim() : "";
    const logs = await db
      .select()
      .from(auditLogsTable)
      .orderBy(desc(auditLogsTable.id))
      .limit(500);
    const filtered = action
      ? logs.filter((l) => l.action.includes(action))
      : logs;
    const userIds = [
      ...new Set(filtered.map((l) => l.userId).filter((v): v is number => v != null)),
    ];
    const users = userIds.length
      ? await db
          .select({
            id: usersTable.id,
            fullName: usersTable.fullName,
            email: usersTable.email,
          })
          .from(usersTable)
          .where(inArray(usersTable.id, userIds))
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));
    res.json({
      logs: filtered.slice(0, 300).map((l) => ({
        id: l.id,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        ipAddress: l.ipAddress,
        metadata: l.metadata,
        createdAt: l.createdAt.toISOString(),
        user: l.userId ? userMap.get(l.userId) ?? null : null,
      })),
    });
  }
);

export default router;
