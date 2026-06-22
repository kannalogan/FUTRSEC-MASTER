/**
 * Shared student-signal loader for the AI Job Agent.
 *
 * Loads every signal the matching engine needs for a student in one shot
 * (track, resume readiness, FTS / assessment score, checkpoint progress, derived
 * skills, issued certificates) and builds the StudentMatchContext consumed by
 * `heuristicMatch` / `computeMatch`. Kept in the lib so every route scores
 * students through the exact same data — there is one source of truth.
 */
import { eq, and, desc, count, isNotNull } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable,
  tracksTable,
  studentProfilesTable,
  ftsScoresTable,
  labAttemptsTable,
  moduleEnrollmentsTable,
  aiInterviewsTable,
  checkpointsTable,
  checkpointProgressTable,
  jobApplicationsTable,
  jobsTable,
  aiResumeAnalysisTable,
  certificatesTable,
} from "@workspace/db";
import { getUserCareerTrack, type CareerTrack } from "../track-access";
import type { StudentMatchContext, JobMatchInput } from "./job-match";
import type { CareerContext } from "./mock-content";

export const TRACK_SKILLS: Record<CareerTrack, string[]> = {
  soc: [
    "SIEM log analysis",
    "Incident triage",
    "MITRE ATT&CK",
    "Network traffic analysis",
    "Threat intelligence",
    "Event forensics",
    "Detection engineering",
    "SOAR automation",
  ],
  vapt: [
    "Web app pentesting",
    "OWASP Top 10",
    "Network scanning",
    "Burp Suite",
    "Metasploit",
    "Privilege escalation",
    "Active Directory attacks",
    "API security testing",
  ],
  grc: [
    "ISO 27001",
    "Risk assessment",
    "DPDP compliance",
    "Security policy",
    "Internal audit",
    "Business continuity",
    "Vendor risk",
    "NIST CSF",
  ],
};

export interface StudentBundle {
  userId: number;
  user: typeof usersTable.$inferSelect;
  trackSlug: string | null;
  careerTrack: CareerTrack | null;
  matchCtx: StudentMatchContext;
  careerCtx: CareerContext;
  cp5Complete: boolean;
}

/**
 * Loads every signal the job agent needs for a student in one shot: track,
 * resume readiness, FTS score, checkpoint progress (and CP5 completion gate),
 * derived current skills, and the career context used for placement readiness.
 */
export async function loadStudentBundle(userId: number): Promise<StudentBundle | null> {
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
  if (!user) return null;

  const careerTrack = await getUserCareerTrack(userId);

  let trackSlug: string | null = null;
  if (user.selectedTrackId) {
    const track = await db.query.tracksTable.findFirst({ where: eq(tracksTable.id, user.selectedTrackId) });
    trackSlug = track?.slug ?? null;
  }

  const [profile, fts, labsDone, modulesDone, interviewAgg, appsAgg, checkpoints, progress, resumeAnalysis, certificates] =
    await Promise.all([
      db.query.studentProfilesTable.findFirst({ where: eq(studentProfilesTable.userId, userId) }),
      db.query.ftsScoresTable.findFirst({ where: eq(ftsScoresTable.userId, userId) }),
      db
        .select({ c: count() })
        .from(labAttemptsTable)
        .where(and(eq(labAttemptsTable.userId, userId), eq(labAttemptsTable.status, "completed"))),
      db
        .select({ c: count() })
        .from(moduleEnrollmentsTable)
        .where(and(eq(moduleEnrollmentsTable.userId, userId), isNotNull(moduleEnrollmentsTable.completedAt))),
      db
        .select({ c: count() })
        .from(aiInterviewsTable)
        .where(and(eq(aiInterviewsTable.userId, userId), eq(aiInterviewsTable.status, "completed"))),
      db.select({ c: count() }).from(jobApplicationsTable).where(eq(jobApplicationsTable.studentId, userId)),
      user.selectedTrackId
        ? db.select().from(checkpointsTable).where(eq(checkpointsTable.trackId, user.selectedTrackId)).orderBy(checkpointsTable.order)
        : Promise.resolve([] as (typeof checkpointsTable.$inferSelect)[]),
      db.select().from(checkpointProgressTable).where(eq(checkpointProgressTable.userId, userId)),
      db.query.aiResumeAnalysisTable.findFirst({
        where: eq(aiResumeAnalysisTable.userId, userId),
        orderBy: [desc(aiResumeAnalysisTable.createdAt)],
      }),
      db
        .select({ careerTrack: certificatesTable.careerTrack })
        .from(certificatesTable)
        .where(and(eq(certificatesTable.userId, userId), eq(certificatesTable.status, "issued"))),
    ]);

  const completedCpIds = new Set(progress.filter((p) => p.status === "completed").map((p) => p.checkpointId));
  const totalCps = checkpoints.length;
  const completedCps = checkpoints.filter((cp) => completedCpIds.has(cp.id)).length;
  const checkpointCompletion = totalCps > 0 ? Math.round((completedCps / totalCps) * 100) : 0;
  const cp5 = checkpoints.find((cp) => cp.order === 5);
  const cp5Complete = cp5 ? completedCpIds.has(cp5.id) : false;

  const labsCompleted = Number(labsDone[0]?.c ?? 0);
  const modulesCompleted = Number(modulesDone[0]?.c ?? 0);
  const interviewsTaken = Number(interviewAgg[0]?.c ?? 0);
  const applications = Number(appsAgg[0]?.c ?? 0);
  const ftsScore = fts?.totalScore != null ? Math.round(fts.totalScore) : 0;
  const assessmentScore = fts?.assessmentScore != null ? Math.round(fts.assessmentScore) : 0;
  const hasResume = Boolean(profile?.resumeUrl);
  const resumeScore = resumeAnalysis?.atsScore != null ? resumeAnalysis.atsScore : null;

  // Profile completeness across the key student_profiles fields (0..1).
  const profileFields = [
    profile?.college,
    profile?.graduationYear,
    profile?.city,
    profile?.linkedinUrl,
    profile?.githubUrl,
    profile?.portfolioUrl,
    profile?.currentRole,
    profile?.bio,
    profile?.resumeUrl,
  ];
  const filledFields = profileFields.filter((v) => v != null && v !== "").length;
  const profileCompleteness = profileFields.length > 0 ? filledFields / profileFields.length : 0;

  const pool = careerTrack ? TRACK_SKILLS[careerTrack] : [];
  const acquiredCount = Math.min(pool.length, Math.floor((labsCompleted + modulesCompleted) / 2));
  const skills = pool.slice(0, acquiredCount);

  const matchCtx: StudentMatchContext = {
    userId,
    careerTrack,
    trackSlug,
    ftsScore,
    assessmentScore,
    hasResume,
    resumeScore,
    profileCompleteness,
    hasProfileRole: Boolean(profile?.currentRole),
    hasBio: Boolean(profile?.bio),
    labsCompleted,
    checkpointCompletion,
    skills,
    certificates: certificates.map((c) => ({ careerTrack: c.careerTrack })),
  };

  const careerCtx: CareerContext = {
    trackSlug,
    fullName: user.fullName,
    ftsScore,
    labsCompleted,
    modulesCompleted,
    interviewsTaken,
    hasResume,
    applications,
  };

  return { userId, user, trackSlug, careerTrack, matchCtx, careerCtx, cp5Complete };
}

export function toJobMatchInput(job: typeof jobsTable.$inferSelect, skills: string[]): JobMatchInput {
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    requiredTracks: job.requiredTracks,
    skills,
    minSalary: job.minSalary,
    maxSalary: job.maxSalary,
    location: job.location,
    isRemote: job.isRemote,
  };
}
