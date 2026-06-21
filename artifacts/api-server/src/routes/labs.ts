import { Router } from "express";
import { eq, and, desc, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable,
  tracksTable,
  labsTable,
  labModulesTable,
  labAttemptsTable,
  labReportsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { checkTrackQueryAccess, checkResourceTrackAccess, type CareerTrack } from "../lib/track-access";

const router = Router();

router.get("/labs", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
  const queryTrack = req.query.track as string | undefined;

  const denied = await checkTrackQueryAccess(
    req.user.role,
    (user?.careerTrack as CareerTrack | null) ?? null,
    queryTrack,
  );
  if (denied) { res.status(403).json({ error: denied }); return; }

  let track = null;
  if (queryTrack) {
    track = await db.query.tracksTable.findFirst({ where: eq(tracksTable.slug, queryTrack) }) ?? null;
  } else if (user?.selectedTrackId) {
    track = await db.query.tracksTable.findFirst({ where: eq(tracksTable.id, user.selectedTrackId) }) ?? null;
  }

  let labs: any[] = [];
  if (track) {
    labs = await db.select().from(labsTable).where(and(eq(labsTable.trackId, track.id), eq(labsTable.isActive, true)));
  } else {
    labs = await db.select().from(labsTable).where(eq(labsTable.isActive, true));
  }

  if (labs.length === 0) { res.json({ track, labs: [] }); return; }

  const attempts = await db.select().from(labAttemptsTable)
    .where(and(eq(labAttemptsTable.userId, userId), inArray(labAttemptsTable.labId, labs.map((l) => l.id))))
    .orderBy(desc(labAttemptsTable.startedAt));

  const latestAttempt = new Map<number, typeof attempts[0]>();
  for (const a of attempts) {
    if (!latestAttempt.has(a.labId)) latestAttempt.set(a.labId, a);
  }

  res.json({
    track,
    labs: labs.map((l) => ({
      ...l,
      attempt: latestAttempt.get(l.id) ?? null,
      status: latestAttempt.get(l.id)?.status ?? "not_started",
    })),
  });
});

router.get("/labs/:labId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;
  const labId = parseInt(String(req.params.labId), 10);
  if (isNaN(labId)) { res.status(400).json({ error: "Invalid labId" }); return; }

  const lab = await db.query.labsTable.findFirst({ where: eq(labsTable.id, labId) });
  if (!lab) { res.status(404).json({ error: "Lab not found" }); return; }

  const labDenied = await checkResourceTrackAccess(req.user.role, userId, lab.trackId);
  if (labDenied) { res.status(403).json({ error: labDenied }); return; }

  const [modules, attempts] = await Promise.all([
    db.select().from(labModulesTable).where(eq(labModulesTable.labId, labId)).orderBy(labModulesTable.order),
    db.select().from(labAttemptsTable)
      .where(and(eq(labAttemptsTable.userId, userId), eq(labAttemptsTable.labId, labId)))
      .orderBy(desc(labAttemptsTable.startedAt)),
  ]);

  res.json({ lab, modules, attempts });
});

router.post("/labs/:labId/start", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;
  const labId = parseInt(String(req.params.labId), 10);
  if (isNaN(labId)) { res.status(400).json({ error: "Invalid labId" }); return; }

  const lab = await db.query.labsTable.findFirst({ where: and(eq(labsTable.id, labId), eq(labsTable.isActive, true)) });
  if (!lab) { res.status(404).json({ error: "Lab not found or inactive" }); return; }

  const startDenied = await checkResourceTrackAccess(req.user.role, userId, lab.trackId);
  if (startDenied) { res.status(403).json({ error: startDenied }); return; }

  const existing = await db.query.labAttemptsTable.findFirst({
    where: and(eq(labAttemptsTable.userId, userId), eq(labAttemptsTable.labId, labId), eq(labAttemptsTable.status, "in_progress")),
  });
  if (existing) { res.json({ attempt: existing, alreadyStarted: true }); return; }

  const [attempt] = await db.insert(labAttemptsTable).values({
    userId,
    labId,
    status: "in_progress",
    totalScore: 0,
    hintsUsed: 0,
  }).returning();

  res.status(201).json({ attempt, alreadyStarted: false });
});

router.post("/labs/:labId/submit", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;
  const labId = parseInt(String(req.params.labId), 10);
  if (isNaN(labId)) { res.status(400).json({ error: "Invalid labId" }); return; }

  const attempt = await db.query.labAttemptsTable.findFirst({
    where: and(eq(labAttemptsTable.userId, userId), eq(labAttemptsTable.labId, labId), eq(labAttemptsTable.status, "in_progress")),
  });
  if (!attempt) { res.status(404).json({ error: "No active attempt found" }); return; }

  const score = req.body.score ?? 0;

  const [updated] = await db.update(labAttemptsTable).set({
    status: "completed",
    completedAt: new Date(),
    totalScore: score,
  }).where(eq(labAttemptsTable.id, attempt.id)).returning();

  await db.insert(labReportsTable).values({
    attemptId: attempt.id,
    userId,
    labId,
    reportContent: req.body.findings ?? "",
    submittedAt: new Date(),
  }).returning();

  res.json({ attempt: updated, score });
});

export default router;
