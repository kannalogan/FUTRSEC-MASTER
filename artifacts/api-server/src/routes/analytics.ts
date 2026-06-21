import { Router, type Response, type NextFunction } from "express";
import { eq, and, inArray, gte, ilike, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable,
  studentProfilesTable,
  tpoProfilesTable,
  studentTpoMapTable,
  employersTable,
  ftsScoresTable,
  checkpointsTable,
  checkpointProgressTable,
  lessonProgressTable,
  labAttemptsTable,
  labsTable,
  jobsTable,
  jobApplicationsTable,
  offersTable,
  interviewsTable,
  placementsTable,
  subscriptionsTable,
  paymentsTable,
} from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";

const router = Router();

const CAREER_TRACKS = ["soc", "vapt", "grc"] as const;
type CareerTrack = (typeof CAREER_TRACKS)[number];

// ── Guards (mirror tpo.ts / employer.ts; this is a parallel read-only module) ──
async function requireApprovedTpo(
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
  if (!me || me.role !== "tpo") {
    res.status(403).json({ error: "TPO access required" });
    return;
  }
  if (!me.isActive) {
    res.status(403).json({ error: "Your TPO account is deactivated" });
    return;
  }
  const profile = await db.query.tpoProfilesTable.findFirst({
    where: eq(tpoProfilesTable.userId, req.user.userId),
  });
  if (!profile || profile.approvalStatus !== "approved") {
    res.status(403).json({
      error: "TPO account pending admin approval",
      code: "PENDING_APPROVAL",
      approvalStatus: profile?.approvalStatus ?? "pending",
    });
    return;
  }
  next();
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
  const emp = await db.query.employersTable.findFirst({
    where: eq(employersTable.userId, req.user.userId),
  });
  if (!emp || emp.approvalStatus !== "approved") {
    res.status(403).json({
      error: "Company account pending admin verification",
      code: "PENDING_APPROVAL",
      approvalStatus: emp?.approvalStatus ?? "pending",
    });
    return;
  }
  (req as AuthRequest & { employerId?: number }).employerId = emp.id;
  next();
}

// Students visible to a TPO: explicitly mapped ∪ same-institution college match.
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

// ── GET /analytics/student ───────────────────────────────────────────────────
router.get(
  "/analytics/student",
  requireAuth,
  requireRole("student"),
  async (req: AuthRequest, res): Promise<void> => {
    const userId = req.user!.userId;

    const [user, profile, fts, lessonsDone, labStats, checkpointProgress] =
      await Promise.all([
        db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) }),
        db.query.studentProfilesTable.findFirst({
          where: eq(studentProfilesTable.userId, userId),
        }),
        db.query.ftsScoresTable.findFirst({
          where: eq(ftsScoresTable.userId, userId),
        }),
        db
          .select({ c: sql<number>`count(*)::int` })
          .from(lessonProgressTable)
          .where(eq(lessonProgressTable.userId, userId)),
        db
          .select({
            status: labAttemptsTable.status,
            labId: labAttemptsTable.labId,
          })
          .from(labAttemptsTable)
          .where(eq(labAttemptsTable.userId, userId)),
        db
          .select()
          .from(checkpointProgressTable)
          .where(eq(checkpointProgressTable.userId, userId)),
      ]);

    // Checkpoint progress (scoped to the student's selected track).
    let checkpointProgressPct = 0;
    if (user?.selectedTrackId) {
      const checkpoints = await db
        .select({ id: checkpointsTable.id })
        .from(checkpointsTable)
        .where(eq(checkpointsTable.trackId, user.selectedTrackId));
      const completed = checkpointProgress.filter(
        (cp) => cp.status === "completed"
      ).length;
      checkpointProgressPct =
        checkpoints.length > 0
          ? Math.round((completed / checkpoints.length) * 100)
          : 0;
    }

    // Lab completion (% of track-eligible active labs the student finished).
    const completedLabIds = new Set(
      labStats.filter((l) => l.status === "completed").map((l) => l.labId)
    );
    let totalLabs = 0;
    if (user?.selectedTrackId) {
      const [{ c }] = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(labsTable)
        .where(
          and(eq(labsTable.trackId, user.selectedTrackId), eq(labsTable.isActive, true))
        );
      totalLabs = c ?? 0;
    }
    const labCompletion =
      totalLabs > 0
        ? Math.min(100, Math.round((completedLabIds.size / totalLabs) * 100))
        : 0;

    // Profile completion (mirrors dashboard heuristic).
    const profileFields = [
      "college",
      "graduationYear",
      "city",
      "currentRole",
      "bio",
      "linkedinUrl",
      "githubUrl",
      "resumeUrl",
    ];
    const filled = profileFields.filter(
      (f) => !!(profile as Record<string, unknown> | undefined)?.[f]
    ).length;
    const nameComplete = user?.fullName ? 1 : 0;
    const profileCompletion = Math.round(
      ((filled + nameComplete) / (profileFields.length + 1)) * 100
    );

    const ftsScore = Math.round(fts?.totalScore ?? 0);
    const learningHours = Math.round(((lessonsDone[0]?.c ?? 0) * 15) / 60);
    const jobReadiness = Math.min(
      100,
      Math.round(
        ftsScore * 0.6 + profileCompletion * 0.3 + checkpointProgressPct * 0.1
      )
    );

    res.json({
      learningHours,
      ftsScore,
      checkpointProgress: checkpointProgressPct,
      labCompletion,
      jobReadiness,
    });
  }
);

// ── GET /analytics/tpo ───────────────────────────────────────────────────────
router.get(
  "/analytics/tpo",
  requireAuth,
  requireRole("tpo"),
  requireApprovedTpo,
  async (req: AuthRequest, res): Promise<void> => {
    const profile = await db.query.tpoProfilesTable.findFirst({
      where: eq(tpoProfilesTable.userId, req.user!.userId),
    });
    const studentIds = await getTpoStudentIds(
      req.user!.userId,
      profile?.institution ?? null
    );

    if (studentIds.length === 0) {
      res.json({
        placementRate: 0,
        activeStudents: 0,
        trackDistribution: CAREER_TRACKS.map((track) => ({ track, count: 0 })),
        selectedStudents: 0,
        interviewStats: { total: 0, completed: 0, scheduled: 0 },
      });
      return;
    }

    const students = await db
      .select({
        id: usersTable.id,
        careerTrack: usersTable.careerTrack,
        isActive: usersTable.isActive,
      })
      .from(usersTable)
      .where(inArray(usersTable.id, studentIds));

    const trackCounts = { soc: 0, vapt: 0, grc: 0 };
    for (const s of students) {
      if (s.careerTrack && s.careerTrack in trackCounts)
        trackCounts[s.careerTrack as CareerTrack] += 1;
    }
    const activeStudents = students.filter((s) => s.isActive).length;

    const [apps, placements] = await Promise.all([
      db
        .select({ id: jobApplicationsTable.id })
        .from(jobApplicationsTable)
        .where(inArray(jobApplicationsTable.studentId, studentIds)),
      db
        .select({ studentId: placementsTable.studentId })
        .from(placementsTable)
        .where(inArray(placementsTable.studentId, studentIds)),
    ]);

    const placedStudentIds = new Set(placements.map((p) => p.studentId));
    const selectedStudents = placedStudentIds.size;
    const placementRate =
      students.length > 0
        ? Math.round((selectedStudents / students.length) * 100)
        : 0;

    const appIds = apps.map((a) => a.id);
    const interviews = appIds.length
      ? await db
          .select({ status: interviewsTable.status })
          .from(interviewsTable)
          .where(inArray(interviewsTable.applicationId, appIds))
      : [];

    res.json({
      placementRate,
      activeStudents,
      trackDistribution: (Object.keys(trackCounts) as CareerTrack[]).map(
        (track) => ({ track, count: trackCounts[track] })
      ),
      selectedStudents,
      interviewStats: {
        total: interviews.length,
        completed: interviews.filter((i) => i.status === "completed").length,
        scheduled: interviews.filter((i) => i.status === "scheduled").length,
      },
    });
  }
);

// ── GET /analytics/employer ──────────────────────────────────────────────────
router.get(
  "/analytics/employer",
  requireAuth,
  requireRole("employer"),
  requireApprovedEmployer,
  async (req: AuthRequest, res): Promise<void> => {
    const employerId = (req as AuthRequest & { employerId?: number })
      .employerId!;

    const jobs = await db
      .select({ id: jobsTable.id })
      .from(jobsTable)
      .where(eq(jobsTable.employerId, employerId));
    const jobIds = jobs.map((j) => j.id);

    if (jobIds.length === 0) {
      res.json({
        applications: 0,
        shortlisted: 0,
        hired: 0,
        trackDistribution: CAREER_TRACKS.map((track) => ({ track, count: 0 })),
        avgScores: 0,
      });
      return;
    }

    const apps = await db
      .select({
        id: jobApplicationsTable.id,
        studentId: jobApplicationsTable.studentId,
        status: jobApplicationsTable.status,
      })
      .from(jobApplicationsTable)
      .where(inArray(jobApplicationsTable.jobId, jobIds));

    const studentIds = [...new Set(apps.map((a) => a.studentId))];
    const [students, fts] = await Promise.all([
      studentIds.length
        ? db
            .select({ id: usersTable.id, careerTrack: usersTable.careerTrack })
            .from(usersTable)
            .where(inArray(usersTable.id, studentIds))
        : Promise.resolve([] as { id: number; careerTrack: CareerTrack | null }[]),
      studentIds.length
        ? db
            .select({
              userId: ftsScoresTable.userId,
              totalScore: ftsScoresTable.totalScore,
            })
            .from(ftsScoresTable)
            .where(inArray(ftsScoresTable.userId, studentIds))
        : Promise.resolve([] as { userId: number; totalScore: number }[]),
    ]);

    const trackOf = new Map(students.map((s) => [s.id, s.careerTrack]));
    const trackCounts = { soc: 0, vapt: 0, grc: 0 };
    for (const id of studentIds) {
      const t = trackOf.get(id);
      if (t && t in trackCounts) trackCounts[t as CareerTrack] += 1;
    }

    const avgScores = fts.length
      ? Math.round(
          (fts.reduce((s, f) => s + (f.totalScore ?? 0), 0) / fts.length) * 10
        ) / 10
      : 0;

    res.json({
      applications: apps.length,
      shortlisted: apps.filter((a) => a.status === "shortlisted").length,
      hired: apps.filter((a) => a.status === "hired").length,
      trackDistribution: (Object.keys(trackCounts) as CareerTrack[]).map(
        (track) => ({ track, count: trackCounts[track] })
      ),
      avgScores,
    });
  }
);

// ── GET /analytics/admin ─────────────────────────────────────────────────────
router.get(
  "/analytics/admin",
  requireAuth,
  requireRole("admin"),
  async (_req: AuthRequest, res): Promise<void> => {
    const now = Date.now();
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [
      students,
      placements,
      payments,
      subs,
      dau,
      mau,
    ] = await Promise.all([
      db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.role, "student")),
      db.select().from(placementsTable),
      db
        .select({ amount: paymentsTable.amount, status: paymentsTable.status, paidAt: paymentsTable.paidAt })
        .from(paymentsTable),
      db
        .select({
          status: subscriptionsTable.status,
          plan: subscriptionsTable.plan,
          trialEndsAt: subscriptionsTable.trialEndsAt,
        })
        .from(subscriptionsTable),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(usersTable)
        .where(gte(usersTable.lastLoginAt, dayAgo)),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(usersTable)
        .where(gte(usersTable.lastLoginAt, monthAgo)),
    ]);

    const totalStudents = students.length;
    const totalPlacements = placements.length;
    const placementRate =
      totalStudents > 0
        ? Math.round((totalPlacements / totalStudents) * 100)
        : 0;

    const packages = placements
      .map((p) => p.packageAmount)
      .filter((v): v is number => typeof v === "number" && v > 0);
    const avgPackage = packages.length
      ? Math.round(packages.reduce((a, b) => a + b, 0) / packages.length)
      : 0;
    const highestPackage = packages.length ? Math.max(...packages) : 0;

    // Track-wise placement
    const trackWise = { soc: 0, vapt: 0, grc: 0 };
    for (const p of placements) {
      if (p.careerTrack && p.careerTrack in trackWise)
        trackWise[p.careerTrack as CareerTrack] += 1;
    }
    const trackWisePlacement = (Object.keys(trackWise) as CareerTrack[]).map(
      (track) => ({ track, count: trackWise[track] })
    );

    // College-wise placement (resolve colleges of placed students)
    const placedStudentIds = [
      ...new Set(placements.map((p) => p.studentId)),
    ];
    const profiles = placedStudentIds.length
      ? await db
          .select({
            userId: studentProfilesTable.userId,
            college: studentProfilesTable.college,
          })
          .from(studentProfilesTable)
          .where(inArray(studentProfilesTable.userId, placedStudentIds))
      : [];
    const collegeOf = new Map(profiles.map((p) => [p.userId, p.college]));
    const collegeCounts = new Map<string, number>();
    for (const p of placements) {
      const college = collegeOf.get(p.studentId) ?? "Unknown";
      collegeCounts.set(college, (collegeCounts.get(college) ?? 0) + 1);
    }
    const collegeWisePlacement = [...collegeCounts.entries()].map(
      ([college, count]) => ({ college, count })
    );
    const topColleges = [...collegeWisePlacement]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Revenue
    const paid = payments.filter((p) => p.status === "paid");
    const revenue = paid.reduce((s, p) => s + (p.amount ?? 0), 0);
    const monthlyMap = new Map<string, number>();
    for (const p of paid) {
      const when = p.paidAt ? new Date(p.paidAt) : null;
      if (!when) continue;
      const key = `${when.getUTCFullYear()}-${String(
        when.getUTCMonth() + 1
      ).padStart(2, "0")}`;
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + (p.amount ?? 0));
    }
    const monthlyRevenue = [...monthlyMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, amount]) => ({ month, amount }));

    // Subscriptions + trial conversions
    const activeSubs = subs.filter((s) => s.status === "active").length;
    const trials = subs.filter((s) => s.trialEndsAt != null);
    const converted = trials.filter(
      (s) =>
        s.status === "active" &&
        s.plan !== "trial" &&
        s.plan !== "free"
    ).length;
    const trialConversions = converted;

    res.json({
      totalPlacements,
      placementRate,
      avgPackage,
      highestPackage,
      trackWisePlacement,
      collegeWisePlacement,
      topColleges,
      revenue,
      monthlyRevenue,
      subscriptions: activeSubs,
      trialConversions,
      dau: dau[0]?.c ?? 0,
      mau: mau[0]?.c ?? 0,
    });
  }
);

export default router;
