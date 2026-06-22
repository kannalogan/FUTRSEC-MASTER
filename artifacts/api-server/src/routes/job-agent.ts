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
  aiResumeAnalysisTable,
  certificatesTable,
} from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { getUserCareerTrack, checkJobTrackAccess, getUserTrackIdentifiers, jobMatchesTrack, type CareerTrack } from "../lib/track-access";
import {
  computeMatch,
  heuristicMatch,
  type MatchResult,
} from "../lib/ai/job-match";
import {
  loadStudentBundle,
  toJobMatchInput,
  type StudentBundle,
} from "../lib/ai/student-match";
import { computePlacementReadiness, type CareerContext } from "../lib/ai/mock-content";
import { eventBus } from "../lib/events";
import { createAuditLog } from "../lib/audit";

const router = Router();

/**
 * Active jobs visible to this student under strict track isolation. A student
 * with no determinable track sees only open postings (deny-by-default for
 * track-restricted jobs). Matches both legacy slug-form and domain-form
 * `requiredTracks` values.
 */
async function loadTrackJobs(
  careerTrack: CareerTrack | null,
  trackSlug: string | null,
): Promise<(typeof jobsTable.$inferSelect)[]> {
  const jobs = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.status, "active"))
    .orderBy(desc(jobsTable.createdAt))
    .limit(100);
  if (!careerTrack) {
    return jobs.filter((j) => j.requiredTracks.length === 0);
  }
  const ids = { domain: careerTrack, slug: trackSlug };
  return jobs.filter((j) => jobMatchesTrack(j.requiredTracks, ids));
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

/** Upsert a computed match into the job_matches cache (uniqueness on student+job). */
async function cacheMatch(studentId: number, jobId: number, match: MatchResult): Promise<void> {
  const existing = await db.query.jobMatchesTable.findFirst({
    where: and(eq(jobMatchesTable.studentId, studentId), eq(jobMatchesTable.jobId, jobId)),
  });
  const values = {
    matchScore: match.matchScore,
    reasons: match.reasons.join(" • "),
    factors: match.factors,
    breakdown: match.breakdown,
    missingSkills: match.missingSkills,
    recommendations: match.recommendations,
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

    const trackJobs = await loadTrackJobs(bundle.careerTrack, bundle.trackSlug);
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

    const trackJobs = await loadTrackJobs(bundle.careerTrack, bundle.trackSlug);
    if (trackJobs.length === 0) { res.json({ jobs: [] }); return; }

    const jobIds = trackJobs.map((j) => j.id);
    const [skillsMap, applications, savedRows, employers] = await Promise.all([
      loadJobSkills(jobIds),
      db.select().from(jobApplicationsTable).where(and(eq(jobApplicationsTable.studentId, userId), inArray(jobApplicationsTable.jobId, jobIds))),
      db.select().from(savedJobsTable).where(and(eq(savedJobsTable.studentId, userId), inArray(savedJobsTable.jobId, jobIds))),
      db.select().from(employersTable).where(inArray(employersTable.id, [...new Set(trackJobs.map((j) => j.employerId).filter((id): id is number => id !== null))])),
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
          employer: job.employerId !== null ? employerMap.get(job.employerId) ?? null : null,
          matchScore: match.matchScore,
          matchReasons: match.reasons,
          matchFactors: match.factors,
          matchBreakdown: match.breakdown,
          missingSkills: match.missingSkills,
          recommendations: match.recommendations,
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

    // Strict track isolation: re-filter saved jobs by the student's effective
    // track. Stale/cross-track saved rows (e.g. from a pre-isolation state) must
    // never be exposed; with no determinable track, only open jobs are visible.
    const ids = await getUserTrackIdentifiers(userId);
    const visibleJobs = jobs.filter((j) =>
      ids ? jobMatchesTrack(j.requiredTracks, ids) : j.requiredTracks.length === 0,
    );
    const jobMap = new Map(visibleJobs.map((j) => [j.id, j]));
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
          employer: job.employerId !== null ? employerMap.get(job.employerId) ?? null : null,
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

    const trackJobs = await loadTrackJobs(bundle.careerTrack, bundle.trackSlug);
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
    scored.sort((a, b) => b.match.matchScore - a.match.matchScore);

    const MAX_APPLY = 5;
    const top = scored.filter((s) => s.match.matchScore >= 40).slice(0, MAX_APPLY);

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
        matchScore: match.matchScore,
      });
      eventBus.emit("application.advanced", {
        type: "application.advanced",
        userId,
        applicationId: application.id,
        status: "applied",
      });

      applied.push({ jobId: job.id, applicationId: application.id, matchScore: match.matchScore, title: job.title });
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
