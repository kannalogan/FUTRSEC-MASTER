import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable,
  studentProfilesTable,
  ftsScoresTable,
  assessmentResultsTable,
  labAttemptsTable,
  jobApplicationsTable,
  lessonProgressTable,
  tracksTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/profile/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;

  const [user, profile, fts, assessmentResults, labsAll, applications, lessonsCompleted] = await Promise.all([
    db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) }),
    db.query.studentProfilesTable.findFirst({ where: eq(studentProfilesTable.userId, userId) }),
    db.query.ftsScoresTable.findFirst({ where: eq(ftsScoresTable.userId, userId) }),
    db.select().from(assessmentResultsTable).where(eq(assessmentResultsTable.userId, userId)).limit(10),
    db.select().from(labAttemptsTable).where(eq(labAttemptsTable.userId, userId)),
    db.select().from(jobApplicationsTable).where(eq(jobApplicationsTable.studentId, userId)).limit(20),
    db.select().from(lessonProgressTable).where(eq(lessonProgressTable.userId, userId)),
  ]);

  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const track = user.selectedTrackId
    ? await db.query.tracksTable.findFirst({ where: eq(tracksTable.id, user.selectedTrackId) }) ?? null
    : null;

  const completedLabs = labsAll.filter((l) => l.status === "completed");
  const totalLabScore = completedLabs.reduce((sum, l) => sum + l.totalScore, 0);

  const nameParts = (user.fullName ?? "").split(" ");
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ");

  res.json({
    user: {
      id: user.id,
      fullName: user.fullName,
      firstName,
      lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      selectedTrackId: user.selectedTrackId,
      track,
      onboardingStep: user.onboardingStep,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    },
    profile: profile ?? null,
    stats: {
      ftsScore: fts?.totalScore ?? 0,
      assessmentScore: fts?.assessmentScore ?? 0,
      labScore: fts?.labScore ?? 0,
      assignmentScore: fts?.assignmentScore ?? 0,
      attendanceScore: fts?.attendanceScore ?? 0,
      totalLabsCompleted: completedLabs.length,
      totalLabScore,
      totalLessonsCompleted: lessonsCompleted.length,
      totalApplications: applications.length,
      assessmentCount: assessmentResults.length,
    },
    recentAssessments: assessmentResults.slice(0, 5),
    recentApplications: applications.slice(0, 5),
  });
});

router.put("/profile/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;

  const { fullName, college, graduationYear, city, currentRole, bio, linkedinUrl, githubUrl, portfolioUrl, twitterUrl, resumeUrl } = req.body;

  if (fullName !== undefined) {
    await db.update(usersTable).set({ fullName }).where(eq(usersTable.id, userId));
  }

  const profileFields = { college, graduationYear, city, currentRole, bio, linkedinUrl, githubUrl, portfolioUrl, twitterUrl, resumeUrl };
  const profileUpdate = Object.fromEntries(Object.entries(profileFields).filter(([, v]) => v !== undefined));

  if (Object.keys(profileUpdate).length > 0) {
    const existing = await db.query.studentProfilesTable.findFirst({ where: eq(studentProfilesTable.userId, userId) });
    if (existing) {
      await db.update(studentProfilesTable).set(profileUpdate).where(eq(studentProfilesTable.userId, userId));
    } else {
      await db.insert(studentProfilesTable).values({ userId, ...profileUpdate });
    }
  }

  const [user, profile] = await Promise.all([
    db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) }),
    db.query.studentProfilesTable.findFirst({ where: eq(studentProfilesTable.userId, userId) }),
  ]);

  res.json({ user, profile: profile ?? null });
});

export default router;
