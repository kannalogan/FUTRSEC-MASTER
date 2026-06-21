import { Router } from "express";
import { eq, and, desc, inArray, count, isNotNull } from "drizzle-orm";
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
  jobsTable,
  jobSkillsTable,
  jobApplicationsTable,
  interviewsTable,
  offersTable,
  employersTable,
  savedJobsTable,
  jobMatchesTable,
  autoApplySettingsTable,
  subscriptionsTable,
} from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { getUserCareerTrack, checkJobTrackAccess, type CareerTrack } from "../lib/track-access";
import {
  computeMatch,
  heuristicMatch,
  type StudentMatchContext,
  type JobMatchInput,
  type MatchResult,
} from "../lib/ai/job-match";
import { computePlacementReadiness, type CareerContext } from "../lib/ai/mock-content";
import { eventBus } from "../lib/events";
import { createAuditLog } from "../lib/audit";

const router = Router();

const TRACK_SKILLS: Record<CareerTrack, string[]> = {
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

interface StudentBundle {
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
async function loadStudentBundle(userId: number): Promise<StudentBundle | null> {
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
  if (!user) return null;

  const careerTrack = await getUserCareerTrack(userId);

  let trackSlug: string | null = null;
  if (user.selectedTrackId) {
    const track = await db.query.tracksTable.findFirst({ where: eq(tracksTable.id, user.selectedTrackId) });
    trackSlug = track?.slug ?? null;
  }

  const [profile, fts, labsDone, modulesDone, interviewAgg, appsAgg, checkpoints, progress] =
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
  const hasResume = Boolean(profile?.resumeUrl);

  const pool = careerTrack ? TRACK_SKILLS[careerTrack] : [];
  const acquiredCount = Math.min(pool.length, Math.floor((labsCompleted + modulesCompleted) / 2));
  const skills = pool.slice(0, acquiredCount);

  const matchCtx: StudentMatchContext = {
    userId,
    careerTrack,
    trackSlug,
    ftsScore,
    hasResume,
    checkpointCompletion,
    skills,
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

/** Active jobs visible to this student under strict track isolation. */
async function loadTrackJobs(trackSlug: string | null): Promise<(typeof jobsTable.$inferSelect)[]> {
  const jobs = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.status, "active"))
    .orderBy(desc(jobsTable.createdAt))
    .limit(100);
  return jobs.filter((j) => j.requiredTracks.length === 0 || (trackSlug != null && j.requiredTracks.includes(trackSlug)));
}

async function loadJobSkills(jobIds: number[]): Promise<Map<number, string[]>> {
  const map = new Map<number, string[]>();
  if (jobIds.length === 0) return map;
  const rows = await db.select().from(jobSkillsTable).where(inArray(jobSkillsTable.jobId, jobIds));
  for (const r of rows) {
    if (!map.has(r.jobId)) map.set(r.jobId, []);
    map.get(r.jobId)!.push(r.skill);
  }
  return map;
}

function toJobMatchInput(job: typeof jobsTable.$inferSelect, skills: string[]): JobMatchInput {
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

/** Upsert a computed match into the job_matches cache (uniqueness on student+job). */
async function cacheMatch(studentId: number, jobId: number, match: MatchResult): Promise<void> {
  const existing = await db.query.jobMatchesTable.findFirst({
    where: and(eq(jobMatchesTable.studentId, studentId), eq(jobMatchesTable.jobId, jobId)),
  });
  const values = {
    matchScore: match.score,
    reasons: match.reasons.join(" • "),
    factors: match.factors,
  };
  if (existing) {
    await db.update(jobMatchesTable).set(values).where(eq(jobMatchesTable.id, existing.id));
  } else {
    await db.insert(jobMatchesTable).values({ studentId, jobId, ...values });
  }
}

function latestSubscription(userId: number) {
  return db.query.subscriptionsTable.findFirst({
    where: eq(subscriptionsTable.userId, userId),
    orderBy: [desc(subscriptionsTable.createdAt)],
  });
}

type Sub = typeof subscriptionsTable.$inferSelect;

function isPremiumPlan(sub: Sub | null | undefined): boolean {
  if (!sub) return false;
  const plan = (sub.plan ?? "").toLowerCase();
  const status = (sub.status ?? "").toLowerCase();
  const isPremiumTier = plan.startsWith("premium") || plan === "corporate";
  if (!isPremiumTier) return false;
  // Entitlement must be active — canceled/expired premium records do not unlock features.
  if (status !== "active") return false;
  if (sub.endDate && new Date(sub.endDate) < new Date()) return false;
  return true;
}

function isTrialSub(sub: Sub | null | undefined): boolean {
  if (!sub) return false;
  const plan = (sub.plan ?? "").toLowerCase();
  const status = (sub.status ?? "").toLowerCase();
  if (plan === "trial" || status === "trialing" || status === "trial") return true;
  if (sub.trialEndsAt && new Date(sub.trialEndsAt) > new Date() && !isPremiumPlan(sub)) return true;
  return false;
}

/** Returns null when auto-apply may be enabled, or a reason string for FEATURE_LOCKED. */
function autoApplyGate(sub: Sub | null | undefined, cp5Complete: boolean): string | null {
  if (isTrialSub(sub)) {
    return "Auto-apply is not available on the free trial. Upgrade to a premium plan to unlock it.";
  }
  if (!isPremiumPlan(sub)) {
    return "Auto-apply requires an active premium plan.";
  }
  if (!cp5Complete) {
    return "Complete checkpoint CP5 (Job Ready) to unlock auto-apply.";
  }
  return null;
}

/* ─────────────────────────────── overview ─────────────────────────────── */
router.get(
  "/job-agent/overview",
  requireAuth,
  requireRole("student"),
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
    const bundle = await loadStudentBundle(req.user.userId);
    if (!bundle) { res.status(404).json({ error: "Student not found" }); return; }

    const trackJobs = await loadTrackJobs(bundle.trackSlug);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [appliedAgg, offersAgg, savedAgg, applications] = await Promise.all([
      db.select({ c: count() }).from(jobApplicationsTable).where(eq(jobApplicationsTable.studentId, req.user.userId)),
      db.select({ c: count() }).from(offersTable).where(eq(offersTable.studentId, req.user.userId)),
      db.select({ c: count() }).from(savedJobsTable).where(eq(savedJobsTable.studentId, req.user.userId)),
      db.select({ id: jobApplicationsTable.id }).from(jobApplicationsTable).where(eq(jobApplicationsTable.studentId, req.user.userId)),
    ]);

    let interviewsCount = 0;
    const appIds = applications.map((a) => a.id);
    if (appIds.length > 0) {
      const ivAgg = await db.select({ c: count() }).from(interviewsTable).where(inArray(interviewsTable.applicationId, appIds));
      interviewsCount = Number(ivAgg[0]?.c ?? 0);
    }

    const readiness = computePlacementReadiness(bundle.careerCtx);

    res.json({
      recommended: trackJobs.length,
      new: trackJobs.filter((j) => j.createdAt && new Date(j.createdAt) >= sevenDaysAgo).length,
      saved: Number(savedAgg[0]?.c ?? 0),
      applied: Number(appliedAgg[0]?.c ?? 0),
      interviews: interviewsCount,
      offers: Number(offersAgg[0]?.c ?? 0),
      placementReadiness: readiness.score,
    });
  },
);

/* ────────────────────────────── recommended ───────────────────────────── */
router.get(
  "/job-agent/recommended",
  requireAuth,
  requireRole("student"),
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
    const userId = req.user.userId;
    const bundle = await loadStudentBundle(userId);
    if (!bundle) { res.status(404).json({ error: "Student not found" }); return; }

    const trackJobs = await loadTrackJobs(bundle.trackSlug);
    if (trackJobs.length === 0) { res.json({ jobs: [] }); return; }

    const jobIds = trackJobs.map((j) => j.id);
    const [skillsMap, applications, savedRows, employers] = await Promise.all([
      loadJobSkills(jobIds),
      db.select().from(jobApplicationsTable).where(and(eq(jobApplicationsTable.studentId, userId), inArray(jobApplicationsTable.jobId, jobIds))),
      db.select().from(savedJobsTable).where(and(eq(savedJobsTable.studentId, userId), inArray(savedJobsTable.jobId, jobIds))),
      db.select().from(employersTable).where(inArray(employersTable.id, [...new Set(trackJobs.map((j) => j.employerId))])),
    ]);

    const appliedSet = new Set(applications.map((a) => a.jobId));
    const savedSet = new Set(savedRows.map((s) => s.jobId));
    const employerMap = new Map(employers.map((e) => [e.id, e]));

    const results = await Promise.all(
      trackJobs.map(async (job) => {
        const skills = skillsMap.get(job.id) ?? [];
        const match = await computeMatch(bundle.matchCtx, toJobMatchInput(job, skills));
        await cacheMatch(userId, job.id, match);
        return {
          ...job,
          skills,
          employer: employerMap.get(job.employerId) ?? null,
          matchScore: match.score,
          matchReasons: match.reasons,
          matchFactors: match.factors,
          applied: appliedSet.has(job.id),
          saved: savedSet.has(job.id),
        };
      }),
    );

    results.sort((a, b) => b.matchScore - a.matchScore);
    res.json({ jobs: results });
  },
);

/* ───────────────────────────────── saved ──────────────────────────────── */
router.get(
  "/job-agent/saved",
  requireAuth,
  requireRole("student"),
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
    const userId = req.user.userId;

    const saved = await db.select().from(savedJobsTable).where(eq(savedJobsTable.studentId, userId)).orderBy(desc(savedJobsTable.createdAt));
    if (saved.length === 0) { res.json({ jobs: [] }); return; }

    const jobIds = saved.map((s) => s.jobId);
    const [jobs, skillsMap, employers, applications] = await Promise.all([
      db.select().from(jobsTable).where(inArray(jobsTable.id, jobIds)),
      loadJobSkills(jobIds),
      db.select().from(employersTable),
      db.select().from(jobApplicationsTable).where(and(eq(jobApplicationsTable.studentId, userId), inArray(jobApplicationsTable.jobId, jobIds))),
    ]);
    const jobMap = new Map(jobs.map((j) => [j.id, j]));
    const employerMap = new Map(employers.map((e) => [e.id, e]));
    const appliedSet = new Set(applications.map((a) => a.jobId));

    const result = saved
      .map((s) => {
        const job = jobMap.get(s.jobId);
        if (!job) return null;
        return {
          ...job,
          savedAt: s.createdAt,
          skills: skillsMap.get(job.id) ?? [],
          employer: employerMap.get(job.employerId) ?? null,
          applied: appliedSet.has(job.id),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    res.json({ jobs: result });
  },
);

router.post(
  "/job-agent/jobs/:jobId/save",
  requireAuth,
  requireRole("student"),
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
    const userId = req.user.userId;
    const jobId = parseInt(String(req.params.jobId), 10);
    if (isNaN(jobId)) { res.status(400).json({ error: "Invalid jobId" }); return; }

    const job = await db.query.jobsTable.findFirst({ where: eq(jobsTable.id, jobId) });
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }

    const denied = await checkJobTrackAccess(req.user.role, userId, job.requiredTracks);
    if (denied) { res.status(403).json({ error: denied }); return; }

    const existing = await db.query.savedJobsTable.findFirst({
      where: and(eq(savedJobsTable.studentId, userId), eq(savedJobsTable.jobId, jobId)),
    });
    if (existing) { res.status(200).json({ saved: existing }); return; }

    const [saved] = await db.insert(savedJobsTable).values({ studentId: userId, jobId }).returning();
    res.status(201).json({ saved });
  },
);

router.delete(
  "/job-agent/jobs/:jobId/save",
  requireAuth,
  requireRole("student"),
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
    const userId = req.user.userId;
    const jobId = parseInt(String(req.params.jobId), 10);
    if (isNaN(jobId)) { res.status(400).json({ error: "Invalid jobId" }); return; }

    await db.delete(savedJobsTable).where(and(eq(savedJobsTable.studentId, userId), eq(savedJobsTable.jobId, jobId)));
    res.json({ success: true });
  },
);

/* ──────────────────────────────── auto-apply ──────────────────────────── */
async function getOrLoadSettings(userId: number) {
  const settings = await db.query.autoApplySettingsTable.findFirst({
    where: eq(autoApplySettingsTable.studentId, userId),
  });
  return settings ?? null;
}

router.get(
  "/job-agent/auto-apply",
  requireAuth,
  requireRole("student"),
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
    const userId = req.user.userId;

    const [settings, sub, bundle] = await Promise.all([
      getOrLoadSettings(userId),
      latestSubscription(userId),
      loadStudentBundle(userId),
    ]);
    const cp5Complete = bundle?.cp5Complete ?? false;
    const lockReason = autoApplyGate(sub, cp5Complete);

    res.json({
      settings: settings ?? {
        studentId: userId,
        enabled: false,
        minSalary: null,
        preferredLocation: null,
        workMode: null,
        companySize: null,
      },
      eligibility: {
        eligible: lockReason === null,
        isPremium: isPremiumPlan(sub),
        isTrial: isTrialSub(sub),
        cp5Complete,
        lockReason,
      },
    });
  },
);

router.put(
  "/job-agent/auto-apply",
  requireAuth,
  requireRole("student"),
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
    const userId = req.user.userId;
    const body = req.body ?? {};

    const wantsEnable = body.enabled === true;
    if (wantsEnable) {
      const [sub, bundle] = await Promise.all([latestSubscription(userId), loadStudentBundle(userId)]);
      const lockReason = autoApplyGate(sub, bundle?.cp5Complete ?? false);
      if (lockReason) {
        res.status(403).json({ error: lockReason, code: "FEATURE_LOCKED" });
        return;
      }
    }

    const patch = {
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      minSalary: body.minSalary === undefined ? undefined : body.minSalary === null ? null : Number(body.minSalary),
      preferredLocation: body.preferredLocation === undefined ? undefined : body.preferredLocation ?? null,
      workMode: body.workMode === undefined ? undefined : body.workMode ?? null,
      companySize: body.companySize === undefined ? undefined : body.companySize ?? null,
    };

    const existing = await getOrLoadSettings(userId);
    let settings;
    if (existing) {
      const cleaned = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
      [settings] = await db.update(autoApplySettingsTable).set(cleaned).where(eq(autoApplySettingsTable.id, existing.id)).returning();
    } else {
      [settings] = await db
        .insert(autoApplySettingsTable)
        .values({
          studentId: userId,
          enabled: patch.enabled ?? false,
          minSalary: patch.minSalary ?? null,
          preferredLocation: patch.preferredLocation ?? null,
          workMode: patch.workMode ?? null,
          companySize: patch.companySize ?? null,
        })
        .returning();
    }

    res.json({ settings });
  },
);

router.post(
  "/job-agent/auto-apply/run",
  requireAuth,
  requireRole("student"),
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
    const userId = req.user.userId;

    const [settings, sub, bundle] = await Promise.all([
      getOrLoadSettings(userId),
      latestSubscription(userId),
      loadStudentBundle(userId),
    ]);
    if (!bundle) { res.status(404).json({ error: "Student not found" }); return; }

    const lockReason = autoApplyGate(sub, bundle.cp5Complete);
    if (lockReason) { res.status(403).json({ error: lockReason, code: "FEATURE_LOCKED" }); return; }
    if (!settings?.enabled) { res.status(400).json({ error: "Auto-apply is not enabled." }); return; }

    const trackJobs = await loadTrackJobs(bundle.trackSlug);
    if (trackJobs.length === 0) { res.json({ applied: [] }); return; }

    const jobIds = trackJobs.map((j) => j.id);
    const [skillsMap, existingApps] = await Promise.all([
      loadJobSkills(jobIds),
      db.select().from(jobApplicationsTable).where(and(eq(jobApplicationsTable.studentId, userId), inArray(jobApplicationsTable.jobId, jobIds))),
    ]);
    const appliedSet = new Set(existingApps.map((a) => a.jobId));

    const candidates = trackJobs.filter((job) => {
      if (appliedSet.has(job.id)) return false;
      if (settings.minSalary != null && job.maxSalary != null && job.maxSalary < settings.minSalary) return false;
      if (settings.workMode === "remote" && !job.isRemote) return false;
      if (
        settings.preferredLocation &&
        job.location &&
        !job.location.toLowerCase().includes(settings.preferredLocation.toLowerCase()) &&
        !job.isRemote
      ) {
        return false;
      }
      return true;
    });

    const scored = candidates.map((job) => {
      const skills = skillsMap.get(job.id) ?? [];
      const match = heuristicMatch(bundle.matchCtx, toJobMatchInput(job, skills));
      return { job, match };
    });
    scored.sort((a, b) => b.match.score - a.match.score);

    const MAX_APPLY = 5;
    const top = scored.filter((s) => s.match.score >= 40).slice(0, MAX_APPLY);

    const applied: Array<{ jobId: number; applicationId: number; matchScore: number; title: string }> = [];
    for (const { job, match } of top) {
      const [application] = await db
        .insert(jobApplicationsTable)
        .values({
          jobId: job.id,
          studentId: userId,
          status: "applied",
        })
        .returning();

      await cacheMatch(userId, job.id, match);

      eventBus.emit("job.matched", {
        type: "job.matched",
        userId,
        jobId: job.id,
        matchScore: match.score,
      });
      eventBus.emit("application.advanced", {
        type: "application.advanced",
        userId,
        applicationId: application.id,
        status: "applied",
      });

      applied.push({ jobId: job.id, applicationId: application.id, matchScore: match.score, title: job.title });
    }

    await createAuditLog({
      userId,
      action: "job_agent.auto_apply_run",
      entityType: "job_agent",
      entityId: userId,
      metadata: { applied: applied.length },
    });

    res.json({ applied, count: applied.length });
  },
);

export default router;
