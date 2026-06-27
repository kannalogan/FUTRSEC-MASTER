import { Router } from "express";
import { eq, and, asc, ne } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  journeysTable,
  journeyDaysTable,
  journeyDayItemsTable,
  studentJourneysTable,
  studentJourneyProgressTable,
  studentJourneyDaysTable,
  assessmentAttemptsTable,
  moduleEnrollmentsTable,
  labModulesTable,
  labModuleCompletionsTable,
  type JourneyDay,
  type JourneyDayItem,
  type StudentJourney,
  type StudentJourneyProgress,
  type StudentJourneyDay,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { getUserCareerTrack } from "../lib/track-access";
import { createAuditLog } from "../lib/audit";
import { eventBus } from "../lib/events";

const router = Router();

const DAY_MS = 86_400_000;

function daysSinceStart(startedAt: Date): number {
  const diff = Date.now() - new Date(startedAt).getTime();
  return Math.max(0, Math.floor(diff / DAY_MS));
}

/**
 * Resolve the student's enrolled journey for their career track, auto-enrolling
 * into the published journey on first access. Returns null when the student has
 * no track or no published journey exists for it.
 */
async function resolveOrEnroll(studentId: number): Promise<{ enrollment: StudentJourney; journeyId: number } | null> {
  const track = await getUserCareerTrack(studentId);
  if (!track) return null;

  const published = await db.query.journeysTable.findFirst({
    where: and(eq(journeysTable.careerTrack, track), eq(journeysTable.status, "published")),
  });
  if (!published) {
    // The student may already be enrolled in a journey that was since archived;
    // keep serving it so progress is not lost.
    const existing = await db.query.studentJourneysTable.findFirst({
      where: eq(studentJourneysTable.studentId, studentId),
    });
    if (existing) return { enrollment: existing, journeyId: existing.journeyId };
    return null;
  }

  const existing = await db.query.studentJourneysTable.findFirst({
    where: and(
      eq(studentJourneysTable.studentId, studentId),
      eq(studentJourneysTable.journeyId, published.id)
    ),
  });
  if (existing) return { enrollment: existing, journeyId: published.id };

  // First enrollment — anchor the offset clock now.
  const [created] = await db
    .insert(studentJourneysTable)
    .values({ studentId, journeyId: published.id })
    .onConflictDoNothing()
    .returning();
  if (created) {
    await createAuditLog({
      userId: studentId,
      action: "journey.enrolled",
      entityType: "journey",
      entityId: published.id,
    });
    return { enrollment: created, journeyId: published.id };
  }
  // Lost an enrollment race — re-read.
  const row = await db.query.studentJourneysTable.findFirst({
    where: and(
      eq(studentJourneysTable.studentId, studentId),
      eq(studentJourneysTable.journeyId, published.id)
    ),
  });
  return row ? { enrollment: row, journeyId: published.id } : null;
}

async function loadJourneyContent(journeyId: number): Promise<{ days: JourneyDay[]; items: JourneyDayItem[] }> {
  const days = await db
    .select()
    .from(journeyDaysTable)
    .where(eq(journeyDaysTable.journeyId, journeyId))
    .orderBy(asc(journeyDaysTable.offset));
  const items = await db
    .select()
    .from(journeyDayItemsTable)
    .where(eq(journeyDayItemsTable.journeyId, journeyId))
    .orderBy(asc(journeyDayItemsTable.order), asc(journeyDayItemsTable.id));
  return { days, items };
}

/**
 * Verify that the work behind a journey item is genuinely done before crediting
 * completion. Auto-verifiable types (assessment / course / lab) are checked
 * against their source subsystem; acknowledgement/checkpoint types are accepted
 * on explicit completion. Returns null when allowed, or an error string.
 */
async function verifyUnderlyingCompletion(
  type: JourneyDayItem["type"],
  refId: number | null,
  studentId: number
): Promise<string | null> {
  switch (type) {
    case "assessment": {
      if (refId == null) return null;
      const attempt = await db.query.assessmentAttemptsTable.findFirst({
        where: and(
          eq(assessmentAttemptsTable.assessmentId, refId),
          eq(assessmentAttemptsTable.userId, studentId),
          eq(assessmentAttemptsTable.status, "submitted")
        ),
      });
      return attempt ? null : "Complete the assessment before marking this item done.";
    }
    case "course": {
      if (refId == null) return null;
      const enrollment = await db.query.moduleEnrollmentsTable.findFirst({
        where: and(
          eq(moduleEnrollmentsTable.userId, studentId),
          eq(moduleEnrollmentsTable.moduleId, refId)
        ),
      });
      const done = !!enrollment && (enrollment.completedAt != null || enrollment.progressPercent >= 100);
      return done ? null : "Finish the course before marking this item done.";
    }
    case "lab": {
      if (refId == null) return null;
      const modules = await db
        .select({ id: labModulesTable.id })
        .from(labModulesTable)
        .where(eq(labModulesTable.labId, refId));
      if (modules.length === 0) return null;
      const completions = await db
        .select({ labModuleId: labModuleCompletionsTable.labModuleId })
        .from(labModuleCompletionsTable)
        .where(
          and(
            eq(labModuleCompletionsTable.userId, studentId),
            eq(labModuleCompletionsTable.labId, refId)
          )
        );
      const solved = new Set(completions.map((c) => c.labModuleId));
      const allSolved = modules.every((m) => solved.has(m.id));
      return allSolved ? null : "Solve every lab challenge before marking this item done.";
    }
    default:
      // resource / declaration / mentor_review / mock_interview / certificate
      // are acknowledgement or externally-gated checkpoints.
      return null;
  }
}

const BADGE_DEFS: { id: string; label: string; test: (s: ProgressSummary) => boolean }[] = [
  { id: "first_step", label: "First Step", test: (s) => s.completedItems >= 1 },
  { id: "day_one_done", label: "Day One Done", test: (s) => s.completedDays >= 1 },
  { id: "week_warrior", label: "Week Warrior", test: (s) => s.completedDays >= 7 },
  { id: "halfway_there", label: "Halfway There", test: (s) => s.overallPercent >= 50 },
  { id: "journey_master", label: "Journey Master", test: (s) => s.overallPercent >= 100 },
  { id: "xp_100", label: "100 XP", test: (s) => s.xp >= 100 },
  { id: "xp_500", label: "500 XP", test: (s) => s.xp >= 500 },
  { id: "xp_1000", label: "1000 XP", test: (s) => s.xp >= 1000 },
];

interface ProgressSummary {
  overallPercent: number;
  xp: number;
  completedItems: number;
  totalRequiredItems: number;
  completedDays: number;
  totalDays: number;
  streak: number;
  careerReadiness: number;
}

const HIGH_VALUE: ReadonlySet<JourneyDayItem["type"]> = new Set([
  "assessment",
  "lab",
  "assignment",
  "mock_interview",
]);

function computeSummary(
  days: JourneyDay[],
  items: JourneyDayItem[],
  progress: StudentJourneyProgress[],
  studentDays: StudentJourneyDay[]
): ProgressSummary {
  const completedItemIds = new Set(progress.map((p) => p.itemId));
  const requiredItems = items.filter((i) => i.isRequired);
  const totalRequiredItems = requiredItems.length;
  const completedRequired = requiredItems.filter((i) => completedItemIds.has(i.id)).length;
  const completedItems = items.filter((i) => completedItemIds.has(i.id)).length;
  const overallPercent = totalRequiredItems === 0 ? 0 : Math.round((completedRequired / totalRequiredItems) * 100);
  const xp = progress.reduce((sum, p) => sum + p.xpEarned, 0);

  const completedDayIds = new Set(studentDays.filter((d) => d.status === "completed").map((d) => d.dayId));
  const completedDays = completedDayIds.size;

  // Streak = consecutive completed days from the earliest offset until a gap.
  const sortedDays = [...days].sort((a, b) => a.offset - b.offset);
  let streak = 0;
  for (const d of sortedDays) {
    if (completedDayIds.has(d.id)) streak += 1;
    else break;
  }

  // Career readiness: completion (60%) blended with depth across high-value
  // items (40%). Falls back to completion when no high-value items exist.
  const highValue = requiredItems.filter((i) => HIGH_VALUE.has(i.type));
  const depth =
    highValue.length === 0
      ? overallPercent
      : Math.round((highValue.filter((i) => completedItemIds.has(i.id)).length / highValue.length) * 100);
  const careerReadiness = Math.round(0.6 * overallPercent + 0.4 * depth);

  return {
    overallPercent,
    xp,
    completedItems,
    totalRequiredItems,
    completedDays,
    totalDays: days.length,
    streak,
    careerReadiness,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /student/journey — unlocked timeline
// ─────────────────────────────────────────────────────────────────────────────
router.get("/student/journey", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const studentId = req.user.userId;
  const resolved = await resolveOrEnroll(studentId);
  if (!resolved) {
    res.json({ journey: null });
    return;
  }
  const { enrollment, journeyId } = resolved;
  const journey = await db.query.journeysTable.findFirst({ where: eq(journeysTable.id, journeyId) });
  if (!journey) {
    res.json({ journey: null });
    return;
  }
  const { days, items } = await loadJourneyContent(journeyId);
  const progress = await db
    .select()
    .from(studentJourneyProgressTable)
    .where(eq(studentJourneyProgressTable.studentJourneyId, enrollment.id));
  const completedItemIds = new Set(progress.map((p) => p.itemId));

  const elapsed = daysSinceStart(enrollment.startedAt);
  const visibleDays = days
    .filter((d) => d.offset <= elapsed)
    .map((d) => ({
      id: d.id,
      offset: d.offset,
      dayNumber: d.offset + 1,
      title: d.title,
      description: d.description,
      unlocked: true,
      items: items
        .filter((i) => i.dayId === d.id)
        .map((i) => ({
          id: i.id,
          type: i.type,
          refId: i.refId,
          title: i.title,
          description: i.description,
          order: i.order,
          isRequired: i.isRequired,
          xpReward: i.xpReward,
          completed: completedItemIds.has(i.id),
        })),
    }));

  const lockedDayCount = days.filter((d) => d.offset > elapsed).length;
  const nextUnlockOffset = days
    .filter((d) => d.offset > elapsed)
    .reduce<number | null>((min, d) => (min === null || d.offset < min ? d.offset : min), null);

  res.json({
    journey: {
      id: journey.id,
      title: journey.title,
      description: journey.description,
      careerTrack: journey.careerTrack,
      totalDays: journey.totalDays,
      startedAt: enrollment.startedAt,
      status: enrollment.status,
      daysElapsed: elapsed,
      lockedDayCount,
      nextUnlockInDays: nextUnlockOffset === null ? null : nextUnlockOffset - elapsed,
      days: visibleDays,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /student/journey/items/:itemId/complete
// ─────────────────────────────────────────────────────────────────────────────
router.post("/student/journey/items/:itemId/complete", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const studentId = req.user.userId;
  const itemId = Number(req.params.itemId);
  if (!Number.isInteger(itemId)) {
    res.status(400).json({ error: "Invalid item id" });
    return;
  }

  const item = await db.query.journeyDayItemsTable.findFirst({
    where: eq(journeyDayItemsTable.id, itemId),
  });
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  // The student must be enrolled in this item's journey.
  const enrollment = await db.query.studentJourneysTable.findFirst({
    where: and(
      eq(studentJourneysTable.studentId, studentId),
      eq(studentJourneysTable.journeyId, item.journeyId)
    ),
  });
  if (!enrollment) {
    res.status(403).json({ error: "You are not enrolled in this journey." });
    return;
  }

  // Day must be unlocked (offset <= elapsed).
  const day = await db.query.journeyDaysTable.findFirst({ where: eq(journeyDaysTable.id, item.dayId) });
  if (!day) {
    res.status(404).json({ error: "Day not found" });
    return;
  }
  const elapsed = daysSinceStart(enrollment.startedAt);
  if (day.offset > elapsed) {
    res.status(403).json({ error: "This day is still locked." });
    return;
  }

  // Verify the underlying work is done (auto-verifiable types).
  const verifyError = await verifyUnderlyingCompletion(item.type, item.refId, studentId);
  if (verifyError) {
    res.status(409).json({ error: verifyError });
    return;
  }

  // Serialize all completions for this enrollment inside a transaction holding a
  // row lock on the enrollment. Without this, two concurrent completions could
  // each recompute the day/journey rollup against partially-visible progress and
  // persist a stale "unlocked" status even though all required items are done.
  const outcome = await db.transaction(async (tx) => {
    await tx
      .select({ id: studentJourneysTable.id })
      .from(studentJourneysTable)
      .where(eq(studentJourneysTable.id, enrollment.id))
      .for("update");

    // Idempotent insert — re-completing is a no-op (no XP double-credit).
    const inserted = await tx
      .insert(studentJourneyProgressTable)
      .values({
        studentJourneyId: enrollment.id,
        itemId: item.id,
        studentId,
        status: "completed",
        xpEarned: item.xpReward,
        completedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();

    // Recompute the day rollup: completed when every required item in the day is done.
    const dayItems = await tx
      .select()
      .from(journeyDayItemsTable)
      .where(eq(journeyDayItemsTable.dayId, day.id));
    const dayProgress = await tx
      .select()
      .from(studentJourneyProgressTable)
      .where(eq(studentJourneyProgressTable.studentJourneyId, enrollment.id));
    const doneIds = new Set(dayProgress.map((p) => p.itemId));
    const requiredDayItems = dayItems.filter((i) => i.isRequired);
    const dayComplete = requiredDayItems.length > 0 && requiredDayItems.every((i) => doneIds.has(i.id));

    await tx
      .insert(studentJourneyDaysTable)
      .values({
        studentJourneyId: enrollment.id,
        dayId: day.id,
        studentId,
        status: dayComplete ? "completed" : "unlocked",
        completedAt: dayComplete ? new Date() : null,
      })
      .onConflictDoUpdate({
        target: [studentJourneyDaysTable.studentJourneyId, studentJourneyDaysTable.dayId],
        set: {
          status: dayComplete ? "completed" : "unlocked",
          completedAt: dayComplete ? new Date() : null,
        },
      });

    // Recompute whole-journey completion.
    const allItems = await tx
      .select()
      .from(journeyDayItemsTable)
      .where(eq(journeyDayItemsTable.journeyId, item.journeyId));
    const requiredAll = allItems.filter((i) => i.isRequired);
    const journeyComplete = requiredAll.length > 0 && requiredAll.every((i) => doneIds.has(i.id));
    // Derive the active→completed transition from the affected-row count of a
    // status-guarded update, NOT from the outer `enrollment.status` (which was
    // read before the lock and may be stale). Two concurrent final-item
    // completions both hold the FOR UPDATE lock serially; only the first sees
    // status<>'completed', so only it flips the row and emits exactly once.
    let journeyJustCompleted = false;
    if (journeyComplete) {
      const flipped = await tx
        .update(studentJourneysTable)
        .set({ status: "completed", completedAt: new Date() })
        .where(
          and(
            eq(studentJourneysTable.id, enrollment.id),
            ne(studentJourneysTable.status, "completed")
          )
        )
        .returning({ id: studentJourneysTable.id });
      journeyJustCompleted = flipped.length > 0;
    }

    return { inserted, dayComplete, journeyComplete, journeyJustCompleted };
  });

  // Audit logs are written after the transaction commits.
  if (outcome.journeyJustCompleted) {
    await createAuditLog({
      userId: studentId,
      action: "journey.completed",
      entityType: "journey",
      entityId: item.journeyId,
    });

    // Emit on the transition to complete only (journeyJustCompleted guards
    // against repeat completions), so certificate auto-issuance stays idempotent.
    const [journey] = await db
      .select({
        title: journeysTable.title,
        careerTrack: journeysTable.careerTrack,
      })
      .from(journeysTable)
      .where(eq(journeysTable.id, item.journeyId));
    if (journey) {
      eventBus.emit("journey.completed", {
        type: "journey.completed",
        userId: studentId,
        journeyId: item.journeyId,
        journeyName: journey.title,
        careerTrack: journey.careerTrack,
      });
    }
  }
  if (outcome.inserted.length > 0) {
    await createAuditLog({
      userId: studentId,
      action: "journey.item.completed",
      entityType: "journey",
      entityId: item.journeyId,
      metadata: { itemId: item.id, type: item.type, xp: item.xpReward },
    });
  }

  res.json({
    ok: true,
    awardedXp: outcome.inserted.length > 0 ? item.xpReward : 0,
    dayComplete: outcome.dayComplete,
    journeyComplete: outcome.journeyComplete,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /student/journey/progress
// ─────────────────────────────────────────────────────────────────────────────
router.get("/student/journey/progress", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const studentId = req.user.userId;
  const resolved = await resolveOrEnroll(studentId);
  if (!resolved) {
    res.json({ progress: null });
    return;
  }
  const { enrollment, journeyId } = resolved;
  const { days, items } = await loadJourneyContent(journeyId);
  const progress = await db
    .select()
    .from(studentJourneyProgressTable)
    .where(eq(studentJourneyProgressTable.studentJourneyId, enrollment.id));
  const studentDays = await db
    .select()
    .from(studentJourneyDaysTable)
    .where(eq(studentJourneyDaysTable.studentJourneyId, enrollment.id));

  const summary = computeSummary(days, items, progress, studentDays);
  const badges = BADGE_DEFS.map((b) => ({ id: b.id, label: b.label, earned: b.test(summary) }));

  res.json({
    progress: {
      ...summary,
      status: enrollment.status,
      badges,
    },
  });
});

export default router;
