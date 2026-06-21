import { Router } from "express";
import { eq, and, desc, inArray, sum } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  tracksTable,
  labsTable,
  labModulesTable,
  labAttemptsTable,
  labReportsTable,
  labModuleCompletionsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { checkTrackQueryAccess, checkResourceTrackAccess, getUserCareerTrack } from "../lib/track-access";

const router = Router();

/** Normalize a flag/answer for comparison: trim, lowercase, collapse whitespace. */
function normalizeFlag(v: unknown): string {
  return String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Strip server-only fields (flag, solutionExplanation) from a module row. */
function sanitizeModule(m: typeof labModulesTable.$inferSelect) {
  const { flag: _flag, solutionExplanation: _sol, ...safe } = m;
  return { ...safe, hasFlag: m.flag != null };
}

/** Find the user's active (in-progress) attempt for a lab, creating one if absent. */
async function getOrCreateAttempt(userId: number, labId: number) {
  const existing = await db.query.labAttemptsTable.findFirst({
    where: and(
      eq(labAttemptsTable.userId, userId),
      eq(labAttemptsTable.labId, labId),
      eq(labAttemptsTable.status, "in_progress"),
    ),
  });
  if (existing) return existing;
  const [created] = await db
    .insert(labAttemptsTable)
    .values({ userId, labId, status: "in_progress", totalScore: 0, hintsUsed: 0 })
    .returning();
  return created;
}

/**
 * The user's earned score for a lab. Completions are unique per (user, module),
 * so summing the user's completions for this lab gives their definitive score —
 * re-attempting cannot inflate it.
 */
async function recomputeLabScore(userId: number, labId: number): Promise<number> {
  const [row] = await db
    .select({ total: sum(labModuleCompletionsTable.pointsAwarded) })
    .from(labModuleCompletionsTable)
    .where(and(eq(labModuleCompletionsTable.userId, userId), eq(labModuleCompletionsTable.labId, labId)));
  return Number(row?.total ?? 0);
}

// ── List labs for the user's track ─────────────────────────────────────────────
router.get("/labs", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;

  const queryTrack = req.query.track as string | undefined;
  const isAdmin = req.user.role === "admin";

  // Resolve the user's effective track (careerTrack → selectedTrack domain).
  const effectiveTrack = await getUserCareerTrack(userId);

  // Track-locked, deny-by-default: a non-admin with no determinable track
  // cannot list any track-scoped labs.
  if (!isAdmin && !effectiveTrack) {
    res.status(403).json({ error: "Access denied: select a career track to unlock this content." });
    return;
  }

  // Reject cross-track query attempts (uses the effective track, not just careerTrack).
  const denied = await checkTrackQueryAccess(req.user.role, effectiveTrack, queryTrack);
  if (denied) { res.status(403).json({ error: denied }); return; }

  // Resolve the track whose labs we will return.
  let track = null;
  if (queryTrack) {
    track = await db.query.tracksTable.findFirst({ where: eq(tracksTable.slug, queryTrack) }) ?? null;
  } else if (effectiveTrack) {
    // Non-admins (and tracked admins) are scoped to their own domain.
    track = await db.query.tracksTable.findFirst({ where: eq(tracksTable.domain, effectiveTrack) }) ?? null;
  }

  let labs: (typeof labsTable.$inferSelect)[] = [];
  if (track) {
    labs = await db.select().from(labsTable).where(and(eq(labsTable.trackId, track.id), eq(labsTable.isActive, true)));
  } else if (isAdmin) {
    // Only admins may see the full cross-track catalog.
    labs = await db.select().from(labsTable).where(eq(labsTable.isActive, true));
  }

  if (labs.length === 0) { res.json({ track, labs: [] }); return; }

  const labIds = labs.map((l) => l.id);
  const attempts = await db.select().from(labAttemptsTable)
    .where(and(eq(labAttemptsTable.userId, userId), inArray(labAttemptsTable.labId, labIds)))
    .orderBy(desc(labAttemptsTable.startedAt));

  const latestAttempt = new Map<number, typeof attempts[0]>();
  for (const a of attempts) {
    if (!latestAttempt.has(a.labId)) latestAttempt.set(a.labId, a);
  }

  res.json({
    track,
    labs: labs.map((l) => {
      const { simulator: _sim, ...rest } = l;
      return {
        ...rest,
        attempt: latestAttempt.get(l.id) ?? null,
        status: latestAttempt.get(l.id)?.status ?? "not_started",
      };
    }),
  });
});

// ── Lab detail (with simulator + sanitized modules + solved state) ──────────────
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

  const activeAttempt = attempts.find((a) => a.status === "in_progress") ?? attempts[0] ?? null;

  // Solved state is per-user-per-lab (completions are unique per user+module),
  // so it persists across attempts and matches the leaderboard's accounting.
  const completions = await db.select().from(labModuleCompletionsTable)
    .where(and(eq(labModuleCompletionsTable.userId, userId), eq(labModuleCompletionsTable.labId, labId)));
  const solvedById = new Map(completions.map((c) => [c.labModuleId, c]));
  const moduleById = new Map(modules.map((m) => [m.id, m]));

  res.json({
    lab,
    modules: modules.map((m) => {
      const safe = sanitizeModule(m);
      const solved = solvedById.get(m.id);
      // Reveal the writeup (which contains the answer) only after the module is solved.
      return solved
        ? { ...safe, solved: true, pointsAwarded: solved.pointsAwarded, solutionExplanation: m.solutionExplanation }
        : { ...safe, solved: false };
    }),
    attempts,
    activeAttempt,
    solvedModuleIds: completions.map((c) => c.labModuleId),
    earnedPoints: completions.reduce((acc, c) => acc + c.pointsAwarded, 0),
  });
});

// ── Start an attempt ───────────────────────────────────────────────────────────
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
    userId, labId, status: "in_progress", totalScore: 0, hintsUsed: 0,
  }).returning();

  res.status(201).json({ attempt, alreadyStarted: false });
});

// ── Submit a flag for a module (server-validated) ──────────────────────────────
router.post("/labs/:labId/modules/:moduleId/flag", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;
  const labId = parseInt(String(req.params.labId), 10);
  const moduleId = parseInt(String(req.params.moduleId), 10);
  if (isNaN(labId) || isNaN(moduleId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const submitted = req.body?.flag;
  if (typeof submitted !== "string" || submitted.trim() === "") {
    res.status(400).json({ error: "A flag is required" }); return;
  }

  const lab = await db.query.labsTable.findFirst({ where: and(eq(labsTable.id, labId), eq(labsTable.isActive, true)) });
  if (!lab) { res.status(404).json({ error: "Lab not found or inactive" }); return; }

  const denied = await checkResourceTrackAccess(req.user.role, userId, lab.trackId);
  if (denied) { res.status(403).json({ error: denied }); return; }

  const mod = await db.query.labModulesTable.findFirst({ where: eq(labModulesTable.id, moduleId) });
  if (!mod || mod.labId !== labId) { res.status(404).json({ error: "Module not found in this lab" }); return; }
  if (!mod.flag) { res.status(400).json({ error: "This module has no flag to submit" }); return; }

  const attempt = await getOrCreateAttempt(userId, labId);

  // Already solved by this user (in ANY attempt)? Idempotent — never re-award.
  const already = await db.query.labModuleCompletionsTable.findFirst({
    where: and(eq(labModuleCompletionsTable.userId, userId), eq(labModuleCompletionsTable.labModuleId, moduleId)),
  });
  if (already) {
    res.json({
      correct: true, alreadySolved: true, pointsAwarded: already.pointsAwarded,
      totalScore: await recomputeLabScore(userId, labId), solutionExplanation: mod.solutionExplanation,
    });
    return;
  }

  if (normalizeFlag(submitted) !== normalizeFlag(mod.flag)) {
    res.json({ correct: false, message: "Incorrect — review the simulator and try again." });
    return;
  }

  // Insert guarded by the (user, module) unique index — on a race, fall back to
  // the existing completion rather than double-awarding.
  try {
    await db.insert(labModuleCompletionsTable).values({
      attemptId: attempt.id, userId, labId, labModuleId: moduleId, pointsAwarded: mod.points,
    });
  } catch (err) {
    const dup = await db.query.labModuleCompletionsTable.findFirst({
      where: and(eq(labModuleCompletionsTable.userId, userId), eq(labModuleCompletionsTable.labModuleId, moduleId)),
    });
    if (!dup) throw err;
    res.json({
      correct: true, alreadySolved: true, pointsAwarded: dup.pointsAwarded,
      totalScore: await recomputeLabScore(userId, labId), solutionExplanation: mod.solutionExplanation,
    });
    return;
  }
  const totalScore = await recomputeLabScore(userId, labId);
  await db.update(labAttemptsTable).set({ totalScore }).where(eq(labAttemptsTable.id, attempt.id));

  res.json({
    correct: true, alreadySolved: false, pointsAwarded: mod.points, totalScore,
    solutionExplanation: mod.solutionExplanation,
  });
});

// ── Reveal a hint for a module (records hint usage) ─────────────────────────────
router.post("/labs/:labId/modules/:moduleId/hint", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;
  const labId = parseInt(String(req.params.labId), 10);
  const moduleId = parseInt(String(req.params.moduleId), 10);
  if (isNaN(labId) || isNaN(moduleId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const lab = await db.query.labsTable.findFirst({ where: eq(labsTable.id, labId) });
  if (!lab) { res.status(404).json({ error: "Lab not found" }); return; }

  const denied = await checkResourceTrackAccess(req.user.role, userId, lab.trackId);
  if (denied) { res.status(403).json({ error: denied }); return; }

  const mod = await db.query.labModulesTable.findFirst({ where: eq(labModulesTable.id, moduleId) });
  if (!mod || mod.labId !== labId) { res.status(404).json({ error: "Module not found in this lab" }); return; }
  if (!mod.hint) { res.json({ hint: null, message: "No hint available for this task." }); return; }

  const attempt = await getOrCreateAttempt(userId, labId);
  await db.update(labAttemptsTable)
    .set({ hintsUsed: (attempt.hintsUsed ?? 0) + 1 })
    .where(eq(labAttemptsTable.id, attempt.id));

  res.json({ hint: mod.hint });
});

// ── Finish a lab (score derived from completions, never the client) ─────────────
async function finishLab(req: AuthRequest, res: import("express").Response): Promise<void> {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = req.user.userId;
  const labId = parseInt(String(req.params.labId), 10);
  if (isNaN(labId)) { res.status(400).json({ error: "Invalid labId" }); return; }

  const lab = await db.query.labsTable.findFirst({ where: eq(labsTable.id, labId) });
  if (!lab) { res.status(404).json({ error: "Lab not found" }); return; }

  const denied = await checkResourceTrackAccess(req.user.role, userId, lab.trackId);
  if (denied) { res.status(403).json({ error: denied }); return; }

  const attempt = await db.query.labAttemptsTable.findFirst({
    where: and(eq(labAttemptsTable.userId, userId), eq(labAttemptsTable.labId, labId), eq(labAttemptsTable.status, "in_progress")),
  });
  if (!attempt) { res.status(404).json({ error: "No active attempt found" }); return; }

  const totalScore = await recomputeLabScore(userId, labId);
  const [updated] = await db.update(labAttemptsTable).set({
    status: "completed", completedAt: new Date(), totalScore,
  }).where(eq(labAttemptsTable.id, attempt.id)).returning();

  await db.insert(labReportsTable).values({
    attemptId: attempt.id, userId, labId,
    reportContent: typeof req.body?.findings === "string" ? req.body.findings : "",
    submittedAt: new Date(),
  });

  res.json({ attempt: updated, score: totalScore });
}

router.post("/labs/:labId/finish", requireAuth, finishLab);
// Backwards-compatible alias; score is derived server-side, client `score` is ignored.
router.post("/labs/:labId/submit", requireAuth, finishLab);

export default router;
