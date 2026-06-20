import { Router } from "express";
import { eq, and, desc, count } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable,
  studentProfilesTable,
  ftsScoresTable,
  assessmentAttemptsTable,
  assessmentResultsTable,
  labAttemptsTable,
  jobApplicationsTable,
  consentLogsTable,
  tracksTable,
  learningModulesTable,
  lessonProgressTable,
  moduleEnrollmentsTable,
  checkpointsTable,
  checkpointProgressTable,
  lessonsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();

async function getUserTrack(user: { selectedTrackId: number | null } | undefined) {
  if (!user?.selectedTrackId) return null;
  return db.query.tracksTable.findFirst({ where: eq(tracksTable.id, user.selectedTrackId) }) ?? null;
}

router.get("/dashboard/home", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
  const track = user?.selectedTrackId
    ? await db.query.tracksTable.findFirst({ where: eq(tracksTable.id, user.selectedTrackId) }) ?? null
    : null;

  const [
    profile,
    fts,
    consentRec,
    [{ labCount }],
    [{ applicationCount }],
    [{ lessonsDone }],
    recentLabs,
    recentApps,
    checkpoints,
    checkpointProgress,
  ] = await Promise.all([
    db.query.studentProfilesTable.findFirst({ where: eq(studentProfilesTable.userId, userId) }),
    db.query.ftsScoresTable.findFirst({ where: eq(ftsScoresTable.userId, userId) }),
    db.query.consentLogsTable.findFirst({ where: eq(consentLogsTable.userId, userId) }),
    db.select({ labCount: count() }).from(labAttemptsTable).where(and(eq(labAttemptsTable.userId, userId), eq(labAttemptsTable.status, "completed"))),
    db.select({ applicationCount: count() }).from(jobApplicationsTable).where(eq(jobApplicationsTable.studentId, userId)),
    db.select({ lessonsDone: count() }).from(lessonProgressTable).where(eq(lessonProgressTable.userId, userId)),
    db.select({ id: labAttemptsTable.id, labId: labAttemptsTable.labId, status: labAttemptsTable.status, startedAt: labAttemptsTable.startedAt })
      .from(labAttemptsTable).where(eq(labAttemptsTable.userId, userId)).orderBy(desc(labAttemptsTable.startedAt)).limit(5),
    db.select({ id: jobApplicationsTable.id, jobId: jobApplicationsTable.jobId, status: jobApplicationsTable.status, appliedAt: jobApplicationsTable.appliedAt })
      .from(jobApplicationsTable).where(eq(jobApplicationsTable.studentId, userId)).orderBy(desc(jobApplicationsTable.appliedAt)).limit(5),
    track?.id
      ? db.select().from(checkpointsTable).where(eq(checkpointsTable.trackId, track.id)).orderBy(checkpointsTable.order).limit(5)
      : Promise.resolve([]),
    db.select().from(checkpointProgressTable).where(eq(checkpointProgressTable.userId, userId)),
  ]);

  const profileFields = ["college", "graduationYear", "city", "currentRole", "bio", "linkedinUrl", "githubUrl", "resumeUrl"];
  const filledFields = profileFields.filter((f) => !!(profile as any)?.[f]);
  const nameComplete = !!user?.fullName;
  const profileCompletion = Math.round(((filledFields.length + (nameComplete ? 1 : 0)) / (profileFields.length + 1)) * 100);

  const trialStartDate = user?.createdAt ?? new Date();
  const daysSinceStart = Math.floor((Date.now() - new Date(trialStartDate).getTime()) / 86400000);
  const trialDay = Math.min(daysSinceStart + 1, 15);
  const trialDaysRemaining = Math.max(0, 15 - trialDay);

  const checkpointMap = new Map(checkpointProgress.map((cp) => [cp.checkpointId, cp]));
  const checkpointTimeline = checkpoints.map((cp) => ({
    id: cp.id,
    title: cp.title,
    order: cp.order,
    requiredScore: cp.requiredScore,
    status: checkpointMap.get(cp.id)?.status ?? "locked",
    completedAt: checkpointMap.get(cp.id)?.completedAt ?? null,
  }));

  const completedCheckpoints = checkpointProgress.filter((cp) => cp.status === "completed").length;
  const checkpointProgressPct = checkpoints.length > 0 ? Math.round((completedCheckpoints / checkpoints.length) * 100) : 0;

  const ftsTotal = fts?.totalScore ?? 0;
  const aiReadiness = Math.min(100, Math.round(ftsTotal * 0.8 + profileCompletion * 0.2));
  const placementReadiness = Math.min(100, Math.round(ftsTotal * 0.6 + profileCompletion * 0.3 + checkpointProgressPct * 0.1));

  const nameParts = (user?.fullName ?? "").split(" ");
  const firstName = nameParts[0] ?? "";

  res.json({
    user: {
      id: user?.id,
      fullName: user?.fullName,
      firstName,
      email: user?.email,
      role: user?.role,
      selectedTrackId: user?.selectedTrackId,
      onboardingStep: user?.onboardingStep,
    },
    track,
    kpis: {
      profileCompletion,
      tasksCompleted: labCount + applicationCount,
      learningHours: Math.round((lessonsDone * 15) / 60),
      checkpointProgress: checkpointProgressPct,
      ftsScore: Math.round(ftsTotal),
      subscriptionStatus: consentRec ? "trial" : "none",
      aiReadiness,
      placementReadiness,
    },
    trial: {
      day: trialDay,
      totalDays: 15,
      daysRemaining: trialDaysRemaining,
      isActive: trialDay <= 15,
    },
    checkpointTimeline,
    recentActivity: {
      labs: recentLabs,
      applications: recentApps,
    },
  });
});

export default router;
