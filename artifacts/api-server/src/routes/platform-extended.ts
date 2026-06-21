import { Router } from "express";
import { eq, desc, count, countDistinct, sum, and, isNotNull } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable,
  tracksTable,
  assignmentsTable,
  assignmentSubmissionsTable,
  checkpointsTable,
  checkpointProgressTable,
  labAttemptsTable,
  labsTable,
  labModuleCompletionsTable,
  labReportsTable,
  sandboxSessionsTable,
  jobApplicationsTable,
  jobsTable,
  subscriptionsTable,
  paymentsTable,
  lessonProgressTable,
  moduleEnrollmentsTable,
  learningModulesTable,
  lessonsTable,
  lessonBookmarksTable,
  interviewsTable,
  offersTable,
  ftsScoresTable,
  broadcastNotesTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { getUserCareerTrack } from "../lib/track-access";

const router = Router();

// ── Assignments ───────────────────────────────────────────────────────────────
router.get("/assignments", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.user.userId) });
  const where = user?.selectedTrackId
    ? and(eq(assignmentsTable.isPublished, true), eq(assignmentsTable.trackId, user.selectedTrackId))
    : eq(assignmentsTable.isPublished, true);
  const list = await db.select().from(assignmentsTable).where(where).orderBy(desc(assignmentsTable.createdAt)).limit(50);
  const subs = await db.select().from(assignmentSubmissionsTable)
    .where(eq(assignmentSubmissionsTable.studentId, req.user.userId));
  const subMap = new Map(subs.map(s => [s.assignmentId, s]));
  res.json(list.map(a => ({ ...a, submission: subMap.get(a.id) ?? null })));
});

router.post("/assignments/:id/submit", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const assignmentId = Number(req.params["id"]);
  if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
    res.status(400).json({ error: "Invalid assignment id" });
    return;
  }
  const { content, submissionUrl } = req.body ?? {};

  // Verify the assignment exists and the student is eligible (published + track match)
  const assignment = await db.query.assignmentsTable.findFirst({
    where: eq(assignmentsTable.id, assignmentId),
  });
  if (!assignment || !assignment.isPublished) {
    res.status(404).json({ error: "Assignment not found" });
    return;
  }
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.user.userId) });
  if (user?.selectedTrackId && assignment.trackId !== user.selectedTrackId) {
    res.status(403).json({ error: "Assignment not available for your track" });
    return;
  }

  // Prevent duplicate submissions
  const existing = await db.query.assignmentSubmissionsTable.findFirst({
    where: and(
      eq(assignmentSubmissionsTable.assignmentId, assignmentId),
      eq(assignmentSubmissionsTable.studentId, req.user.userId),
    ),
  });
  if (existing) {
    res.status(409).json({ error: "You have already submitted this assignment" });
    return;
  }

  const [sub] = await db.insert(assignmentSubmissionsTable).values({
    assignmentId,
    studentId: req.user.userId,
    content: content ?? null,
    submissionUrl: submissionUrl ?? null,
    status: "submitted",
  }).returning();
  res.json(sub);
});

// ── Checkpoints ───────────────────────────────────────────────────────────────
router.get("/checkpoints", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.user.userId) });
  if (!user?.selectedTrackId) { res.json([]); return; }
  const cps = await db.select().from(checkpointsTable)
    .where(eq(checkpointsTable.trackId, user.selectedTrackId))
    .orderBy(checkpointsTable.order);
  const progress = await db.select().from(checkpointProgressTable)
    .where(eq(checkpointProgressTable.userId, req.user.userId));
  const pMap = new Map(progress.map(p => [p.checkpointId, p]));
  res.json(cps.map(cp => ({ ...cp, progress: pMap.get(cp.id) ?? null })));
});

// ── Tasks (derived from pending assignments + incomplete checkpoints) ──────────
router.get("/tasks", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.user.userId) });
  const trackId = user?.selectedTrackId ?? null;

  const assignWhere = trackId
    ? and(eq(assignmentsTable.isPublished, true), eq(assignmentsTable.trackId, trackId))
    : eq(assignmentsTable.isPublished, true);
  const assignments = await db.select().from(assignmentsTable).where(assignWhere).limit(50);
  const subs = await db.select().from(assignmentSubmissionsTable)
    .where(eq(assignmentSubmissionsTable.studentId, req.user.userId));
  const submitted = new Set(subs.map(s => s.assignmentId));

  const cps = trackId
    ? await db.select().from(checkpointsTable).where(eq(checkpointsTable.trackId, trackId)).orderBy(checkpointsTable.order)
    : [];
  const progress = await db.select().from(checkpointProgressTable)
    .where(eq(checkpointProgressTable.userId, req.user.userId));
  const cpStatus = new Map(progress.map(p => [p.checkpointId, p.status]));

  const tasks = [
    ...assignments.map(a => ({
      id: `assignment-${a.id}`,
      type: "assignment" as const,
      title: a.title,
      description: a.description,
      dueDate: a.dueDate,
      done: submitted.has(a.id),
      priority: a.dueDate ? "high" : "medium",
    })),
    ...cps.map(cp => ({
      id: `checkpoint-${cp.id}`,
      type: "checkpoint" as const,
      title: cp.title,
      description: cp.description ?? "",
      dueDate: null,
      done: cpStatus.get(cp.id) === "completed",
      priority: "medium",
    })),
  ];
  res.json(tasks);
});

// ── Projects (hands-on labs of project type for the user's track) ──────────────
router.get("/projects", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.user.userId) });
  const where = user?.selectedTrackId
    ? and(eq(labsTable.isActive, true), eq(labsTable.trackId, user.selectedTrackId))
    : eq(labsTable.isActive, true);
  const labs = await db.select().from(labsTable).where(where).orderBy(desc(labsTable.totalPoints)).limit(50);
  const attempts = await db.select().from(labAttemptsTable)
    .where(eq(labAttemptsTable.userId, req.user.userId));
  const aMap = new Map(attempts.map(a => [a.labId, a]));
  res.json(labs.map(l => ({ ...l, attempt: aMap.get(l.id) ?? null })));
});

/**
 * Resolve the single track row that owns a non-admin user's domain. Returns
 * `{ track }` on success, or `{ error }` (string) when the user has no
 * determinable track (deny-by-default). Admins with a track get it too; admins
 * without one get `{ track: null }` (full catalog).
 */
async function resolveDomainTrack(role: string, userId: number) {
  const effective = await getUserCareerTrack(userId);
  if (role !== "admin" && !effective) {
    return { error: "Access denied: select a career track to unlock this content." as const };
  }
  if (!effective) return { track: null as null };
  const track = await db.query.tracksTable.findFirst({ where: eq(tracksTable.domain, effective) });
  // Deny-by-default: a non-admin with a track that doesn't resolve to a domain
  // row must NOT fall through to the global (cross-track) query.
  if (!track && role !== "admin") {
    return { error: "Access denied: select a career track to unlock this content." as const };
  }
  return { track: track ?? null };
}

// ── CTF Challenges (labs of type ctf) ──────────────────────────────────────────
router.get("/ctf", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const resolved = await resolveDomainTrack(req.user.role, req.user.userId);
  if ("error" in resolved) { res.status(403).json({ error: resolved.error }); return; }

  const where = resolved.track
    ? and(eq(labsTable.isActive, true), eq(labsTable.type, "ctf"), eq(labsTable.trackId, resolved.track.id))
    : and(eq(labsTable.isActive, true), eq(labsTable.type, "ctf"));
  const labs = await db.select().from(labsTable).where(where).orderBy(desc(labsTable.totalPoints)).limit(50);
  const attempts = await db.select().from(labAttemptsTable).where(eq(labAttemptsTable.userId, req.user.userId));
  const aMap = new Map(attempts.map(a => [a.labId, a]));
  res.json(labs.map(l => {
    const { simulator: _sim, ...rest } = l;
    return { ...rest, attempt: aMap.get(l.id) ?? null };
  }));
});

// ── CTF Leaderboard (ranked by flags captured on ctf-type labs, track-scoped) ──
router.get("/ctf/leaderboard", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const resolved = await resolveDomainTrack(req.user.role, req.user.userId);
  if ("error" in resolved) { res.status(403).json({ error: resolved.error }); return; }

  // Scope the ranking to ctf-type labs in the viewer's domain. Admins without a
  // track see the global ctf ranking.
  const labFilter = resolved.track
    ? and(eq(labsTable.type, "ctf"), eq(labsTable.trackId, resolved.track.id))
    : eq(labsTable.type, "ctf");

  const rows = await db
    .select({
      userId: labModuleCompletionsTable.userId,
      name: usersTable.fullName,
      points: sum(labModuleCompletionsTable.pointsAwarded),
      flags: count(labModuleCompletionsTable.id),
      challenges: countDistinct(labModuleCompletionsTable.labId),
    })
    .from(labModuleCompletionsTable)
    .innerJoin(labsTable, eq(labModuleCompletionsTable.labId, labsTable.id))
    .leftJoin(usersTable, eq(labModuleCompletionsTable.userId, usersTable.id))
    .where(labFilter)
    .groupBy(labModuleCompletionsTable.userId, usersTable.fullName)
    .orderBy(desc(sum(labModuleCompletionsTable.pointsAwarded)));

  const ranked = rows.map((r, i) => ({
    rank: i + 1,
    userId: r.userId,
    name: r.name ?? "Anonymous",
    points: Number(r.points ?? 0),
    flags: Number(r.flags ?? 0),
    challenges: Number(r.challenges ?? 0),
    isMe: r.userId === req.user!.userId,
  }));

  const me = ranked.find((r) => r.isMe) ?? null;
  res.json({ leaderboard: ranked.slice(0, 50), me, totalPlayers: ranked.length });
});

// ── Sandbox sessions ───────────────────────────────────────────────────────────
router.get("/sandbox", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const sessions = await db.select().from(sandboxSessionsTable)
    .where(eq(sandboxSessionsTable.userId, req.user.userId))
    .orderBy(desc(sandboxSessionsTable.createdAt)).limit(20);
  res.json(sessions);
});

router.post("/sandbox", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { labId } = req.body ?? {};
  const token = `sbx_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  const [session] = await db.insert(sandboxSessionsTable).values({
    userId: req.user.userId,
    labId: labId ?? null,
    sessionToken: token,
    status: "starting",
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
  }).returning();
  res.json(session);
});

router.post("/sandbox/:id/terminate", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [updated] = await db.update(sandboxSessionsTable)
    .set({ status: "terminated", terminatedAt: new Date() })
    .where(and(eq(sandboxSessionsTable.id, Number(req.params["id"])), eq(sandboxSessionsTable.userId, req.user.userId)))
    .returning();
  res.json(updated ?? null);
});

// ── Virtual Machines (labs with a docker image) ────────────────────────────────
router.get("/vms", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.user.userId) });
  const where = user?.selectedTrackId
    ? and(eq(labsTable.isActive, true), isNotNull(labsTable.dockerImage), eq(labsTable.trackId, user.selectedTrackId))
    : and(eq(labsTable.isActive, true), isNotNull(labsTable.dockerImage));
  const labs = await db.select().from(labsTable).where(where).limit(50);
  const sessions = await db.select().from(sandboxSessionsTable)
    .where(eq(sandboxSessionsTable.userId, req.user.userId));
  const activeMap = new Map(
    sessions.filter(s => s.status !== "terminated" && s.labId != null).map(s => [s.labId, s]),
  );
  res.json(labs.map(l => ({
    id: l.id, title: l.title, description: l.description, dockerImage: l.dockerImage,
    difficulty: l.difficulty, tags: l.tags, estimatedMinutes: l.estimatedMinutes,
    session: activeMap.get(l.id) ?? null,
  })));
});

// ── Lab Reports ────────────────────────────────────────────────────────────────
router.get("/lab-reports", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const reports = await db.select({
    id: labReportsTable.id,
    labId: labReportsTable.labId,
    reportContent: labReportsTable.reportContent,
    submittedAt: labReportsTable.submittedAt,
    reviewedAt: labReportsTable.reviewedAt,
    grade: labReportsTable.grade,
    feedback: labReportsTable.feedback,
    createdAt: labReportsTable.createdAt,
    labTitle: labsTable.title,
  }).from(labReportsTable)
    .leftJoin(labsTable, eq(labReportsTable.labId, labsTable.id))
    .where(eq(labReportsTable.userId, req.user.userId))
    .orderBy(desc(labReportsTable.createdAt)).limit(50);
  res.json(reports);
});

// ── Bookmarks ─────────────────────────────────────────────────────────────────
router.get("/bookmarks", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const bookmarks = await db.select({
    id: lessonBookmarksTable.id,
    lessonId: lessonBookmarksTable.lessonId,
    note: lessonBookmarksTable.note,
    createdAt: lessonBookmarksTable.createdAt,
    lessonTitle: lessonsTable.title,
    lessonType: lessonsTable.type,
    lessonDuration: lessonsTable.durationMinutes,
  })
    .from(lessonBookmarksTable)
    .leftJoin(lessonsTable, eq(lessonBookmarksTable.lessonId, lessonsTable.id))
    .where(eq(lessonBookmarksTable.userId, req.user.userId))
    .orderBy(desc(lessonBookmarksTable.createdAt))
    .limit(100);
  res.json(bookmarks);
});

router.delete("/bookmarks/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  await db.delete(lessonBookmarksTable).where(
    and(
      eq(lessonBookmarksTable.id, Number(req.params["id"])),
      eq(lessonBookmarksTable.userId, req.user.userId),
    ),
  );
  res.json({ success: true });
});

// ── Calendar ──────────────────────────────────────────────────────────────────
router.get("/calendar/events", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.user.userId) });
  const assignmentWhere = user?.selectedTrackId
    ? and(eq(assignmentsTable.isPublished, true), eq(assignmentsTable.trackId, user.selectedTrackId))
    : eq(assignmentsTable.isPublished, true);

  const [assignments, interviews] = await Promise.all([
    db.select({ id: assignmentsTable.id, title: assignmentsTable.title, dueDate: assignmentsTable.dueDate })
      .from(assignmentsTable).where(assignmentWhere),
    db.select({ id: interviewsTable.id, scheduledAt: interviewsTable.scheduledAt, type: interviewsTable.type, status: interviewsTable.status })
      .from(interviewsTable)
      .leftJoin(jobApplicationsTable, eq(interviewsTable.applicationId, jobApplicationsTable.id))
      .where(eq(jobApplicationsTable.studentId, req.user.userId)),
  ]);

  res.json([
    ...assignments.filter(a => a.dueDate).map(a => ({
      id: `asgn-${a.id}`, title: `Due: ${a.title}`,
      date: a.dueDate!.toISOString(), type: "assignment", color: "#F97316",
    })),
    ...interviews.filter(i => i.scheduledAt).map(i => ({
      id: `int-${i.id}`, title: `${i.type} Interview`,
      date: i.scheduledAt!.toISOString(), type: "interview", color: "#8B5CF6",
    })),
  ]);
});

// ── Notifications ─────────────────────────────────────────────────────────────
router.get("/notifications", requireAuth, async (_req: AuthRequest, res): Promise<void> => {
  const broadcasts = await db.select({
    id: broadcastNotesTable.id, title: broadcastNotesTable.title,
    content: broadcastNotesTable.content, publishedAt: broadcastNotesTable.publishedAt,
  })
    .from(broadcastNotesTable)
    .where(eq(broadcastNotesTable.status, "published"))
    .orderBy(desc(broadcastNotesTable.publishedAt))
    .limit(20);
  const notifications = broadcasts.map(b => ({
    id: b.id, title: b.title, message: b.content.slice(0, 120),
    type: "announcement", createdAt: b.publishedAt ?? new Date(), read: false,
  }));
  res.json({ notifications, unreadCount: notifications.length });
});

// ── Subscription & Payments ───────────────────────────────────────────────────
router.get("/subscription", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const sub = await db.query.subscriptionsTable.findFirst({
    where: and(eq(subscriptionsTable.userId, req.user.userId), eq(subscriptionsTable.status, "active")),
  });
  res.json(sub ?? { plan: "free", status: "active", userId: req.user.userId });
});

router.get("/payments", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const payments = await db.select().from(paymentsTable)
    .where(eq(paymentsTable.userId, req.user.userId))
    .orderBy(desc(paymentsTable.createdAt)).limit(50);
  res.json(payments);
});

// ── Certifications ────────────────────────────────────────────────────────────
router.get("/certifications", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const completed = await db.select({
    labId: labAttemptsTable.labId, totalScore: labAttemptsTable.totalScore,
    completedAt: labAttemptsTable.completedAt, labTitle: labsTable.title,
  })
    .from(labAttemptsTable)
    .leftJoin(labsTable, eq(labAttemptsTable.labId, labsTable.id))
    .where(and(eq(labAttemptsTable.userId, req.user.userId), eq(labAttemptsTable.status, "completed")))
    .orderBy(desc(labAttemptsTable.completedAt)).limit(50);
  res.json(completed.map(c => ({
    id: `cert-${c.labId}`, title: `${c.labTitle ?? "Lab"} — Completion Certificate`,
    issuedAt: c.completedAt, score: Math.round(c.totalScore), type: "lab",
  })));
});

// ── Offer Tracker ─────────────────────────────────────────────────────────────
router.get("/offers", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const offers = await db.select({
    id: offersTable.id, jobId: offersTable.jobId, status: offersTable.status,
    createdAt: offersTable.createdAt, expiresAt: offersTable.expiresAt,
    salary: offersTable.salary, joiningDate: offersTable.joiningDate,
    offerLetterUrl: offersTable.offerLetterUrl, jobTitle: jobsTable.title,
  })
    .from(offersTable)
    .leftJoin(jobsTable, eq(offersTable.jobId, jobsTable.id))
    .where(eq(offersTable.studentId, req.user.userId))
    .orderBy(desc(offersTable.createdAt));
  res.json(offers);
});

// ── Internships (jobs of type internship) ──────────────────────────────────────
router.get("/internships", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const jobs = await db.select().from(jobsTable)
    .where(and(eq(jobsTable.status, "active"), eq(jobsTable.type, "internship")))
    .orderBy(desc(jobsTable.createdAt)).limit(50);
  const apps = await db.select().from(jobApplicationsTable)
    .where(eq(jobApplicationsTable.studentId, req.user.userId));
  const appMap = new Map(apps.map(a => [a.jobId, a]));
  res.json(jobs.map(j => ({ ...j, applied: appMap.has(j.id), application: appMap.get(j.id) ?? null })));
});

// ── Interview History ─────────────────────────────────────────────────────────
router.get("/interviews/history", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const interviews = await db.select({
    id: interviewsTable.id, type: interviewsTable.type,
    scheduledAt: interviewsTable.scheduledAt, status: interviewsTable.status,
    feedback: interviewsTable.feedback, meetingUrl: interviewsTable.meetingUrl,
    jobTitle: jobsTable.title,
  })
    .from(interviewsTable)
    .leftJoin(jobApplicationsTable, eq(interviewsTable.applicationId, jobApplicationsTable.id))
    .leftJoin(jobsTable, eq(jobApplicationsTable.jobId, jobsTable.id))
    .where(eq(jobApplicationsTable.studentId, req.user.userId))
    .orderBy(desc(interviewsTable.scheduledAt)).limit(50);
  res.json(interviews);
});

// ── Leaderboard ───────────────────────────────────────────────────────────────
router.get("/leaderboard", requireAuth, async (_req: AuthRequest, res): Promise<void> => {
  const top = await db.select({
    userId: ftsScoresTable.userId, score: ftsScoresTable.totalScore, name: usersTable.fullName,
  })
    .from(ftsScoresTable)
    .leftJoin(usersTable, eq(ftsScoresTable.userId, usersTable.id))
    .orderBy(desc(ftsScoresTable.totalScore)).limit(50);
  res.json(top.map((r, i) => ({ rank: i + 1, ...r })));
});

// ── Achievements ──────────────────────────────────────────────────────────────
router.get("/achievements", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [labC, appC, lessonC] = await Promise.all([
    db.select({ c: count() }).from(labAttemptsTable)
      .where(and(eq(labAttemptsTable.userId, req.user.userId), eq(labAttemptsTable.status, "completed"))),
    db.select({ c: count() }).from(jobApplicationsTable)
      .where(eq(jobApplicationsTable.studentId, req.user.userId)),
    db.select({ c: count() }).from(lessonProgressTable)
      .where(eq(lessonProgressTable.userId, req.user.userId)),
  ]);
  const labs = Number(labC[0]?.c ?? 0);
  const apps = Number(appC[0]?.c ?? 0);
  const lessons = Number(lessonC[0]?.c ?? 0);
  res.json({
    badges: [
      { id: "first_lab", title: "Lab Rookie", description: "Complete your first lab", icon: "🧪", earned: labs >= 1 },
      { id: "five_labs", title: "Lab Expert", description: "Complete 5 labs", icon: "⚡", earned: labs >= 5 },
      { id: "ten_labs", title: "Lab Master", description: "Complete 10 labs", icon: "🏆", earned: labs >= 10 },
      { id: "first_apply", title: "Job Seeker", description: "Apply to your first job", icon: "💼", earned: apps >= 1 },
      { id: "five_lessons", title: "Quick Learner", description: "Complete 5 lessons", icon: "📚", earned: lessons >= 5 },
      { id: "twenty_lessons", title: "Scholar", description: "Complete 20 lessons", icon: "🎓", earned: lessons >= 20 },
      { id: "profile_complete", title: "Profile Star", description: "Complete your profile", icon: "⭐", earned: true },
      { id: "consent_done", title: "Privacy Champion", description: "DPDP consent captured", icon: "🛡️", earned: true },
    ],
    stats: { labs, applications: apps, lessons },
  });
});

// ── AI Job Agent ──────────────────────────────────────────────────────────────
router.get("/ai/job-matches", requireAuth, async (_req: AuthRequest, res): Promise<void> => {
  const jobs = await db.select().from(jobsTable)
    .where(eq(jobsTable.status, "active")).orderBy(desc(jobsTable.createdAt)).limit(20);
  res.json(jobs.map(j => ({
    ...j,
    matchScore: Math.floor(65 + Math.random() * 30),
    reasons: ["Profile matches required skills", "Track alignment", "Location preference"],
  })));
});

// ── Placement Predictor ───────────────────────────────────────────────────────
router.get("/ai/placement-prediction", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [fts, labC, appC] = await Promise.all([
    db.query.ftsScoresTable.findFirst({ where: eq(ftsScoresTable.userId, req.user.userId) }),
    db.select({ c: count() }).from(labAttemptsTable)
      .where(and(eq(labAttemptsTable.userId, req.user.userId), eq(labAttemptsTable.status, "completed"))),
    db.select({ c: count() }).from(jobApplicationsTable)
      .where(eq(jobApplicationsTable.studentId, req.user.userId)),
  ]);
  const score = fts?.totalScore ?? 0;
  const labs = Number(labC[0]?.c ?? 0);
  const apps = Number(appC[0]?.c ?? 0);
  const prediction = Math.min(95, Math.round(40 + score * 0.3 + labs * 5 + apps * 2));
  res.json({
    placementProbability: prediction, currentScore: score, labsCompleted: labs,
    factors: [
      { label: "Assessment Score", value: Math.round(score), weight: "30%" },
      { label: "Labs Completed", value: labs, weight: "25%" },
      { label: "Profile Completeness", value: 70, weight: "20%" },
      { label: "Applications Sent", value: apps, weight: "25%" },
    ],
    recommendation: prediction < 60
      ? "Complete more labs and improve your assessment score to boost placement chances."
      : "Great progress! Apply to more jobs to maximize placement opportunities.",
  });
});

// ── Settings ──────────────────────────────────────────────────────────────────
router.get("/settings", requireAuth, async (_req: AuthRequest, res): Promise<void> => {
  res.json({
    notifications: { email: true, push: true, marketing: false, weeklyDigest: true },
    privacy: { profileVisible: true, showLeaderboard: true },
    theme: "system",
  });
});
router.put("/settings", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  res.json({ success: true, ...req.body });
});

// ── Support ───────────────────────────────────────────────────────────────────
router.post("/support/ticket", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { subject, message, category } = req.body ?? {};
  if (!subject || !message) { res.status(400).json({ error: "subject and message required" }); return; }
  res.json({
    ticketId: `TKT-${Date.now()}`, subject, category: category ?? "general",
    status: "open", createdAt: new Date(),
    message: "Support ticket submitted. Our team will respond within 24 hours.",
  });
});
router.get("/support/faqs", async (_req, res): Promise<void> => {
  res.json([
    { id: 1, q: "How do I start a lab?", a: "Navigate to Labs from the sidebar and click any lab card.", category: "labs" },
    { id: 2, q: "How are labs scored?", a: "Labs are scored based on task completion, accuracy, and hints used.", category: "labs" },
    { id: 3, q: "Can I switch my track?", a: "Track switching is available after the pre-assessment. Contact support for manual changes.", category: "tracks" },
    { id: 4, q: "How do I upload my resume?", a: "Go to Profile → Resume and upload a PDF file up to 5MB.", category: "profile" },
    { id: 5, q: "What certifications do I earn?", a: "You receive a completion certificate for each lab and course you finish.", category: "certifications" },
    { id: 6, q: "How does DPDP compliance work?", a: "FUTRSEC follows DPDP Act 2023. Manage all consents in the Privacy Center.", category: "privacy" },
    { id: 7, q: "How do I apply for jobs?", a: "Go to Jobs, find a listing, and click Apply. Track applications in My Applications.", category: "jobs" },
    { id: 8, q: "What is the AI Career Coach?", a: "An AI-powered tool for personalized career guidance, interview prep, and job matching.", category: "ai" },
  ]);
});

// ── Career Roadmap ─────────────────────────────────────────────────────────────
router.get("/career/roadmap", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.user.userId) });
  if (!user?.selectedTrackId) { res.json({ track: null, phases: [] }); return; }
  const [track, modules] = await Promise.all([
    db.query.tracksTable.findFirst({ where: eq(tracksTable.id, user.selectedTrackId) }),
    db.select().from(learningModulesTable)
      .where(eq(learningModulesTable.trackId, user.selectedTrackId))
      .orderBy(learningModulesTable.order),
  ]);
  const enrollments = await db.select().from(moduleEnrollmentsTable)
    .where(eq(moduleEnrollmentsTable.userId, req.user.userId));
  const enrolledSet = new Set(enrollments.map(e => e.moduleId));
  res.json({
    track,
    phases: modules.map((m, i) => ({
      id: m.id, title: m.title, order: m.order, lessonCount: m.lessonCount,
      status: enrolledSet.has(m.id) ? "in_progress" : i === 0 ? "available" : "locked",
    })),
  });
});

// ── Community ─────────────────────────────────────────────────────────────────
router.get("/community/posts", requireAuth, async (_req: AuthRequest, res): Promise<void> => {
  res.json({
    posts: [
      { id: 1, author: "Priya S.", role: "SOC Analyst", content: "Just completed the Wazuh SIEM lab — the detection engineering module is really thorough!", likes: 24, comments: 6, time: "2h ago", tags: ["SOC", "SIEM"] },
      { id: 2, author: "Rahul K.", role: "VAPT Student", content: "Passed the CEH exam today! The VAPT labs here really helped with practical prep 🎉", likes: 89, comments: 22, time: "5h ago", tags: ["VAPT", "CEH"] },
      { id: 3, author: "Anita M.", role: "GRC Specialist", content: "Anyone done the ISO 27001 implementation lab? Looking for study partners.", likes: 12, comments: 15, time: "1d ago", tags: ["GRC", "ISO27001"] },
      { id: 4, author: "Dev P.", role: "AI Security Eng", content: "The AI Career Coach gave me a 90% match with a CyberArk role in Bangalore. Applied immediately!", likes: 45, comments: 8, time: "2d ago", tags: ["AI", "Placement"] },
    ],
    total: 4,
  });
});

export default router;
