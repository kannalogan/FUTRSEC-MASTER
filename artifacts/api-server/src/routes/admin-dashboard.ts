import { Router } from "express";
import { eq, and, gte, desc, sql, count } from "drizzle-orm";
import {
  db,
  usersTable,
  studentProfilesTable,
  subscriptionsTable,
  paymentsTable,
  learningModulesTable,
  labsTable,
  labModuleCompletionsTable,
  jobsTable,
  jobApplicationsTable,
  offersTable,
  checkpointsTable,
  checkpointProgressTable,
  ftsScoresTable,
  certificatesTable,
} from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";

const router = Router();

const adminGuards = [requireAuth, requireRole("admin")];

const CAREER_TRACKS = ["soc", "vapt", "grc"] as const;
type CareerTrack = (typeof CAREER_TRACKS)[number];

function isCareerTrack(value: unknown): value is CareerTrack {
  return (
    typeof value === "string" &&
    (CAREER_TRACKS as readonly string[]).includes(value)
  );
}

// GET /admin/dashboard/stats — high-level platform counts.
router.get(
  "/admin/dashboard/stats",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const [
      [totalStudentsRow],
      [activeStudentsRow],
      trackRows,
      subscriptions,
      [totalMentorsRow],
      [totalTposRow],
      [totalEmployersRow],
      [totalCoursesRow],
      [totalLabsRow],
      [totalJobsRow],
      [totalInternshipsRow],
      payments,
    ] = await Promise.all([
      db
        .select({ c: count() })
        .from(usersTable)
        .where(eq(usersTable.role, "student")),
      db
        .select({ c: count() })
        .from(usersTable)
        .where(and(eq(usersTable.role, "student"), eq(usersTable.isActive, true))),
      db
        .select({ track: usersTable.careerTrack, c: count() })
        .from(usersTable)
        .where(eq(usersTable.role, "student"))
        .groupBy(usersTable.careerTrack),
      db
        .select({
          userId: subscriptionsTable.userId,
          plan: subscriptionsTable.plan,
          status: subscriptionsTable.status,
        })
        .from(subscriptionsTable),
      db
        .select({ c: count() })
        .from(usersTable)
        .where(eq(usersTable.role, "mentor")),
      db
        .select({ c: count() })
        .from(usersTable)
        .where(eq(usersTable.role, "tpo")),
      db
        .select({ c: count() })
        .from(usersTable)
        .where(eq(usersTable.role, "employer")),
      db.select({ c: count() }).from(learningModulesTable),
      db.select({ c: count() }).from(labsTable),
      db.select({ c: count() }).from(jobsTable),
      db
        .select({ c: count() })
        .from(jobsTable)
        .where(eq(jobsTable.type, "internship")),
      db
        .select({ amount: paymentsTable.amount, status: paymentsTable.status })
        .from(paymentsTable),
    ]);

    const byTrack: Record<CareerTrack, number> = { soc: 0, vapt: 0, grc: 0 };
    for (const row of trackRows) {
      if (isCareerTrack(row.track)) byTrack[row.track] = Number(row.c);
    }

    const trialStudents = subscriptions.filter(
      (s) => s.status === "trial" || s.status === "trialing",
    ).length;
    const premiumStudents = subscriptions.filter(
      (s) =>
        typeof s.plan === "string" &&
        s.plan.startsWith("premium") &&
        s.status === "active",
    ).length;

    const revenue = payments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + (p.amount ?? 0), 0);

    res.json({
      totalStudents: Number(totalStudentsRow?.c ?? 0),
      activeStudents: Number(activeStudentsRow?.c ?? 0),
      trialStudents,
      premiumStudents,
      socStudents: byTrack.soc,
      vaptStudents: byTrack.vapt,
      grcStudents: byTrack.grc,
      totalMentors: Number(totalMentorsRow?.c ?? 0),
      totalTpos: Number(totalTposRow?.c ?? 0),
      totalEmployers: Number(totalEmployersRow?.c ?? 0),
      totalCourses: Number(totalCoursesRow?.c ?? 0),
      totalLabs: Number(totalLabsRow?.c ?? 0),
      totalJobs: Number(totalJobsRow?.c ?? 0),
      totalInternships: Number(totalInternshipsRow?.c ?? 0),
      revenue,
    });
  },
);

// GET /admin/dashboard/charts — time-series + distribution data for widgets.
router.get(
  "/admin/dashboard/charts",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 13);
    since.setUTCHours(0, 0, 0, 0);

    const [
      signupRows,
      trackRows,
      [totalStudentsRow],
      subscriptions,
      applications,
      [offersRow],
      ftsRows,
    ] = await Promise.all([
      db
        .select({
          day: sql<string>`to_char(${usersTable.createdAt}, 'YYYY-MM-DD')`,
          c: count(),
        })
        .from(usersTable)
        .where(
          and(eq(usersTable.role, "student"), gte(usersTable.createdAt, since)),
        )
        .groupBy(sql`to_char(${usersTable.createdAt}, 'YYYY-MM-DD')`),
      db
        .select({ track: usersTable.careerTrack, c: count() })
        .from(usersTable)
        .where(eq(usersTable.role, "student"))
        .groupBy(usersTable.careerTrack),
      db
        .select({ c: count() })
        .from(usersTable)
        .where(eq(usersTable.role, "student")),
      db
        .select({
          plan: subscriptionsTable.plan,
          status: subscriptionsTable.status,
        })
        .from(subscriptionsTable),
      db
        .select({ status: jobApplicationsTable.status })
        .from(jobApplicationsTable),
      db.select({ c: count() }).from(offersTable),
      db.select({ total: ftsScoresTable.totalScore }).from(ftsScoresTable),
    ]);

    // dailySignups: fill the last 14 days, defaulting missing days to 0.
    const signupMap = new Map<string, number>();
    for (const row of signupRows) signupMap.set(row.day, Number(row.c));
    const dailySignups: { date: string; count: number }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(since);
      d.setUTCDate(since.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      dailySignups.push({ date: key, count: signupMap.get(key) ?? 0 });
    }

    const trackDistribution = CAREER_TRACKS.map((track) => ({
      track,
      count: Number(
        trackRows.find((r) => r.track === track)?.c ?? 0,
      ),
    }));

    const trial = subscriptions.filter(
      (s) => s.status === "trial" || s.status === "trialing",
    ).length;
    const premium = subscriptions.filter(
      (s) =>
        typeof s.plan === "string" &&
        s.plan.startsWith("premium") &&
        s.status === "active",
    ).length;
    const totalStudents = Number(totalStudentsRow?.c ?? 0);
    const free = Math.max(0, totalStudents - trial - premium);

    const applied = applications.length;
    const interviewing = applications.filter(
      (a) => a.status === "interviewing" || a.status === "interview",
    ).length;
    const offers = Number(offersRow?.c ?? 0);

    const ftsDistribution = [
      { bucket: "0-20", count: 0 },
      { bucket: "21-40", count: 0 },
      { bucket: "41-60", count: 0 },
      { bucket: "61-80", count: 0 },
      { bucket: "81-100", count: 0 },
    ];
    for (const row of ftsRows) {
      const score = Number(row.total ?? 0);
      if (score <= 20) ftsDistribution[0].count += 1;
      else if (score <= 40) ftsDistribution[1].count += 1;
      else if (score <= 60) ftsDistribution[2].count += 1;
      else if (score <= 80) ftsDistribution[3].count += 1;
      else ftsDistribution[4].count += 1;
    }

    res.json({
      dailySignups,
      trackDistribution,
      trialVsPremium: { trial, premium, free },
      placement: { applied, interviewing, offers },
      ftsDistribution,
    });
  },
);

// GET /admin/students/export — CSV download of students (optional track/plan filters).
router.get(
  "/admin/students/export",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const trackFilter =
      typeof req.query.track === "string" && isCareerTrack(req.query.track)
        ? req.query.track
        : undefined;
    const planFilter =
      typeof req.query.plan === "string" && req.query.plan.trim() !== ""
        ? req.query.plan.trim()
        : undefined;

    const conditions = [eq(usersTable.role, "student")];
    if (trackFilter) conditions.push(eq(usersTable.careerTrack, trackFilter));

    let students;
    if (planFilter) {
      students = await db
        .select({
          id: usersTable.id,
          email: usersTable.email,
          fullName: usersTable.fullName,
          careerTrack: usersTable.careerTrack,
          isActive: usersTable.isActive,
          createdAt: usersTable.createdAt,
        })
        .from(usersTable)
        .innerJoin(
          subscriptionsTable,
          eq(subscriptionsTable.userId, usersTable.id),
        )
        .where(and(...conditions, eq(subscriptionsTable.plan, planFilter)))
        .orderBy(desc(usersTable.createdAt));
    } else {
      students = await db
        .select({
          id: usersTable.id,
          email: usersTable.email,
          fullName: usersTable.fullName,
          careerTrack: usersTable.careerTrack,
          isActive: usersTable.isActive,
          createdAt: usersTable.createdAt,
        })
        .from(usersTable)
        .where(and(...conditions))
        .orderBy(desc(usersTable.createdAt));
    }

    const escape = (value: unknown): string => {
      const str = value == null ? "" : String(value);
      if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
      return str;
    };

    const header = "id,email,fullName,careerTrack,isActive,createdAt";
    const rows = students.map((s) =>
      [
        s.id,
        escape(s.email),
        escape(s.fullName),
        escape(s.careerTrack),
        s.isActive,
        s.createdAt.toISOString(),
      ].join(","),
    );
    const csv = [header, ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="students.csv"',
    );
    res.send(csv);
  },
);

// GET /admin/students/:id/detail — full student profile snapshot.
router.get(
  "/admin/students/:id/detail",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const studentId = parseInt(raw, 10);
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

    const [profile] = await db
      .select()
      .from(studentProfilesTable)
      .where(eq(studentProfilesTable.userId, studentId));

    const [fts] = await db
      .select()
      .from(ftsScoresTable)
      .where(eq(ftsScoresTable.userId, studentId));

    // Checkpoints for the student's track joined with their progress.
    const checkpointConditions = student.selectedTrackId
      ? eq(checkpointsTable.trackId, student.selectedTrackId)
      : undefined;
    const checkpoints = await db
      .select({
        id: checkpointsTable.id,
        title: checkpointsTable.title,
        order: checkpointsTable.order,
        requiredScore: checkpointsTable.requiredScore,
        status: checkpointProgressTable.status,
        score: checkpointProgressTable.score,
        completedAt: checkpointProgressTable.completedAt,
      })
      .from(checkpointsTable)
      .leftJoin(
        checkpointProgressTable,
        and(
          eq(checkpointProgressTable.checkpointId, checkpointsTable.id),
          eq(checkpointProgressTable.userId, studentId),
        ),
      )
      .where(checkpointConditions)
      .orderBy(checkpointsTable.order);

    const completedLabs = await db
      .selectDistinctOn([labsTable.id], {
        labId: labsTable.id,
        title: labsTable.title,
        slug: labsTable.slug,
      })
      .from(labModuleCompletionsTable)
      .innerJoin(labsTable, eq(labsTable.id, labModuleCompletionsTable.labId))
      .where(eq(labModuleCompletionsTable.userId, studentId));

    const certificates = await db
      .select()
      .from(certificatesTable)
      .where(eq(certificatesTable.userId, studentId))
      .orderBy(desc(certificatesTable.id));

    res.json({
      student: {
        id: student.id,
        email: student.email,
        fullName: student.fullName,
        phone: student.phone,
        careerTrack: student.careerTrack,
        selectedTrackId: student.selectedTrackId,
        onboardingStep: student.onboardingStep,
        isActive: student.isActive,
        avatarUrl: student.avatarUrl,
        createdAt: student.createdAt.toISOString(),
      },
      profile: profile ?? null,
      ftsScores: fts ?? null,
      checkpoints: checkpoints.map((c) => ({
        ...c,
        status: c.status ?? "pending",
        completedAt: c.completedAt ? c.completedAt.toISOString() : null,
      })),
      completedLabs,
      certificates,
    });
  },
);

// POST /admin/students/:id/suspend — deactivate a student account.
router.post(
  "/admin/students/:id/suspend",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const studentId = parseInt(raw, 10);
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

    const [updated] = await db
      .update(usersTable)
      .set({ isActive: false })
      .where(eq(usersTable.id, studentId))
      .returning();

    req.log.info({ studentId }, "Student suspended");
    res.json({ id: updated.id, isActive: updated.isActive });
  },
);

// POST /admin/students/:id/activate — reactivate a student account.
router.post(
  "/admin/students/:id/activate",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const studentId = parseInt(raw, 10);
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

    const [updated] = await db
      .update(usersTable)
      .set({ isActive: true })
      .where(eq(usersTable.id, studentId))
      .returning();

    req.log.info({ studentId }, "Student activated");
    res.json({ id: updated.id, isActive: updated.isActive });
  },
);

export default router;
