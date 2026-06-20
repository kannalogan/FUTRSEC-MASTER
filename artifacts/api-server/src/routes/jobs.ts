import { Router } from "express";
import { eq, and, desc, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable,
  tracksTable,
  jobsTable,
  jobSkillsTable,
  jobApplicationsTable,
  employersTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/jobs", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
  let trackSlug: string | null = (req.query.track as string) ?? null;

  if (!trackSlug && user?.selectedTrackId) {
    const track = await db.query.tracksTable.findFirst({ where: eq(tracksTable.id, user.selectedTrackId) });
    trackSlug = track?.slug ?? null;
  }

  let jobs = await db.select().from(jobsTable).where(eq(jobsTable.status, "active")).orderBy(desc(jobsTable.createdAt)).limit(50);

  if (trackSlug) {
    jobs = jobs.filter((j) => j.requiredTracks.length === 0 || j.requiredTracks.includes(trackSlug!));
  }

  if (jobs.length === 0) { res.json({ jobs: [] }); return; }

  const [skills, applications, employers] = await Promise.all([
    db.select().from(jobSkillsTable).where(inArray(jobSkillsTable.jobId, jobs.map((j) => j.id))),
    db.select().from(jobApplicationsTable).where(and(eq(jobApplicationsTable.studentId, userId), inArray(jobApplicationsTable.jobId, jobs.map((j) => j.id)))),
    db.select().from(employersTable).where(inArray(employersTable.id, [...new Set(jobs.map((j) => j.employerId))])),
  ]);

  const skillsMap = new Map<number, typeof skills>();
  for (const s of skills) {
    if (!skillsMap.has(s.jobId)) skillsMap.set(s.jobId, []);
    skillsMap.get(s.jobId)!.push(s);
  }
  const applicationMap = new Map(applications.map((a) => [a.jobId, a]));
  const employerMap = new Map(employers.map((e) => [e.id, e]));

  res.json({
    jobs: jobs.map((j) => ({
      ...j,
      skills: skillsMap.get(j.id) ?? [],
      application: applicationMap.get(j.id) ?? null,
      applied: applicationMap.has(j.id),
      employer: employerMap.get(j.employerId) ?? null,
    })),
  });
});

router.get("/jobs/applications/mine", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;

  const applications = await db.select().from(jobApplicationsTable)
    .where(eq(jobApplicationsTable.studentId, userId))
    .orderBy(desc(jobApplicationsTable.appliedAt));

  if (applications.length === 0) { res.json({ applications: [] }); return; }

  const jobs = await db.select().from(jobsTable)
    .where(inArray(jobsTable.id, applications.map((a) => a.jobId)));
  const jobMap = new Map(jobs.map((j) => [j.id, j]));

  res.json({ applications: applications.map((a) => ({ ...a, job: jobMap.get(a.jobId) ?? null })) });
});

router.get("/jobs/:jobId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;
  const jobId = parseInt(String(req.params.jobId), 10);
  if (isNaN(jobId)) { res.status(400).json({ error: "Invalid jobId" }); return; }

  const job = await db.query.jobsTable.findFirst({ where: and(eq(jobsTable.id, jobId), eq(jobsTable.status, "active")) });
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }

  const [skills, application, employer] = await Promise.all([
    db.select().from(jobSkillsTable).where(eq(jobSkillsTable.jobId, jobId)),
    db.query.jobApplicationsTable.findFirst({ where: and(eq(jobApplicationsTable.studentId, userId), eq(jobApplicationsTable.jobId, jobId)) }),
    db.query.employersTable.findFirst({ where: eq(employersTable.id, job.employerId) }),
  ]);

  res.json({ job, skills, application: application ?? null, employer: employer ?? null, applied: !!application });
});

router.post("/jobs/:jobId/apply", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;
  const jobId = parseInt(String(req.params.jobId), 10);
  if (isNaN(jobId)) { res.status(400).json({ error: "Invalid jobId" }); return; }

  const job = await db.query.jobsTable.findFirst({ where: and(eq(jobsTable.id, jobId), eq(jobsTable.status, "active")) });
  if (!job) { res.status(404).json({ error: "Job not found or closed" }); return; }

  const existing = await db.query.jobApplicationsTable.findFirst({
    where: and(eq(jobApplicationsTable.studentId, userId), eq(jobApplicationsTable.jobId, jobId)),
  });
  if (existing) { res.status(409).json({ error: "Already applied", application: existing }); return; }

  const [application] = await db.insert(jobApplicationsTable).values({
    jobId,
    studentId: userId,
    coverLetter: req.body.coverLetter ?? null,
    resumeUrl: req.body.resumeUrl ?? null,
    status: "applied",
  }).returning();

  res.status(201).json({ application });
});

export default router;
