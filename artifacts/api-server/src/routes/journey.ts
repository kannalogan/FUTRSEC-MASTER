import { Router } from "express";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import {
  journeysTable,
  journeyDaysTable,
  journeyDayItemsTable,
  learningModulesTable,
  assessmentsTable,
  labsTable,
  mentorTasksTable,
  mockInterviewTemplatesTable,
  certificateTemplatesTable,
} from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";
import { type CareerTrack } from "../lib/track-access";
import { getMentorTracks } from "../lib/question-bank";

const router = Router();

const authorGuards = [requireAuth, requireRole("admin", "mentor")];

const TRACKS: CareerTrack[] = ["soc", "vapt", "grc"];

const ITEM_TYPES = [
  "course",
  "assessment",
  "lab",
  "assignment",
  "resource",
  "declaration",
  "mentor_review",
  "mock_interview",
  "certificate",
] as const;

function audit(req: AuthRequest, action: string, entityId: number | string, metadata?: Record<string, unknown>) {
  return createAuditLog({
    userId: req.user?.userId,
    action,
    entityType: "journey",
    entityId,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
    metadata,
  });
}

/**
 * Resolve the set of career tracks a mentor may author for. Mirrors the
 * established mentor-scoping pattern (own `users.career_track` ∪ tracks of any
 * batch they own). Admins are unscoped (return null = "any track").
 */
async function resolveAuthorTracks(role: string, userId: number): Promise<CareerTrack[] | null> {
  if (role === "admin") return null;
  return getMentorTracks(userId);
}

/**
 * Authorize a mutation against a journey. Admin → always allowed. Mentor → only
 * journeys whose track is within their scoped track set. Returns an error string
 * for a 403, or null when allowed.
 */
function authorizeJourney(role: string, authorTracks: CareerTrack[] | null, journeyTrack: string): string | null {
  if (role === "admin") return null;
  if (!authorTracks || authorTracks.length === 0)
    return "Access denied: no career track assigned to your mentor profile.";
  return authorTracks.includes(journeyTrack as CareerTrack)
    ? null
    : "Access denied: this journey belongs to a different career track.";
}

/**
 * Published (and archived) journeys are immutable: once a journey is published,
 * students may be enrolled and following its timeline, so its structure must not
 * change underneath them. Returns an error string (→ 409) when the journey is not
 * an editable draft, or null when structural mutation is allowed.
 */
function assertDraft(status: string): string | null {
  return status === "draft"
    ? null
    : "This journey is no longer a draft and can't be edited. Create a new draft to make changes.";
}

/**
 * Validate an item's refId exists in the correct entity table for its type, and
 * derive a sensible default title. mentor_review carries no ref. Returns either
 * { ok: true, title } or { ok: false, error }.
 */
async function validateItemRef(
  type: (typeof ITEM_TYPES)[number],
  refId: number | null | undefined
): Promise<{ ok: true; title: string | null } | { ok: false; error: string }> {
  if (type === "mentor_review") {
    return { ok: true, title: "Mentor Review" };
  }
  if (refId == null) {
    return { ok: false, error: `refId is required for item type "${type}"` };
  }
  switch (type) {
    case "course": {
      const row = await db.query.learningModulesTable.findFirst({
        where: eq(learningModulesTable.id, refId),
      });
      return row ? { ok: true, title: row.title } : { ok: false, error: "Referenced course not found" };
    }
    case "assessment": {
      const row = await db.query.assessmentsTable.findFirst({
        where: eq(assessmentsTable.id, refId),
      });
      return row ? { ok: true, title: row.title } : { ok: false, error: "Referenced assessment not found" };
    }
    case "lab": {
      const row = await db.query.labsTable.findFirst({ where: eq(labsTable.id, refId) });
      return row ? { ok: true, title: row.title } : { ok: false, error: "Referenced lab not found" };
    }
    case "assignment":
    case "resource":
    case "declaration": {
      const row = await db.query.mentorTasksTable.findFirst({
        where: eq(mentorTasksTable.id, refId),
      });
      if (!row) return { ok: false, error: "Referenced task not found" };
      if (row.type !== type)
        return { ok: false, error: `Referenced task is a "${row.type}", expected "${type}"` };
      return { ok: true, title: row.title };
    }
    case "mock_interview": {
      const row = await db.query.mockInterviewTemplatesTable.findFirst({
        where: eq(mockInterviewTemplatesTable.id, refId),
      });
      return row ? { ok: true, title: row.title } : { ok: false, error: "Referenced mock interview not found" };
    }
    case "certificate": {
      const row = await db.query.certificateTemplatesTable.findFirst({
        where: eq(certificateTemplatesTable.id, refId),
      });
      return row ? { ok: true, title: row.name } : { ok: false, error: "Referenced certificate template not found" };
    }
    default:
      return { ok: false, error: "Unsupported item type" };
  }
}

async function loadJourneyTree(journeyId: number) {
  const journey = await db.query.journeysTable.findFirst({
    where: eq(journeysTable.id, journeyId),
  });
  if (!journey) return null;
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
  return {
    ...journey,
    days: days.map((d) => ({
      ...d,
      items: items.filter((i) => i.dayId === d.id),
    })),
  };
}

async function refreshTotalDays(journeyId: number) {
  const days = await db
    .select({ id: journeyDaysTable.id })
    .from(journeyDaysTable)
    .where(eq(journeyDaysTable.journeyId, journeyId));
  await db
    .update(journeysTable)
    .set({ totalDays: days.length })
    .where(eq(journeysTable.id, journeyId));
}

// ─────────────────────────────────────────────────────────────────────────────
// Journeys
// ─────────────────────────────────────────────────────────────────────────────
const createJourneySchema = z.object({
  careerTrack: z.enum(TRACKS),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

router.post("/journeys", ...authorGuards, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const parsed = createJourneySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const authorTracks = await resolveAuthorTracks(req.user.role, req.user.userId);
  if (req.user.role === "mentor") {
    if (!authorTracks || authorTracks.length === 0) {
      res.status(403).json({ error: "No career track assigned to your mentor profile." });
      return;
    }
    if (!authorTracks.includes(parsed.data.careerTrack)) {
      res.status(403).json({ error: "Mentors can only create journeys for their assigned track." });
      return;
    }
  }
  const [created] = await db
    .insert(journeysTable)
    .values({
      careerTrack: parsed.data.careerTrack,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      createdBy: req.user.userId,
    })
    .returning();
  await audit(req, "journey.created", created.id, { careerTrack: created.careerTrack });
  res.status(201).json({ journey: created });
});

router.get("/journeys", ...authorGuards, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const authorTracks = await resolveAuthorTracks(req.user.role, req.user.userId);
  // Deny-by-default: a mentor with no scoped tracks sees nothing.
  if (authorTracks && authorTracks.length === 0) {
    res.json({ journeys: [] });
    return;
  }
  const rows = await db
    .select()
    .from(journeysTable)
    .where(authorTracks ? inArray(journeysTable.careerTrack, authorTracks) : undefined)
    .orderBy(desc(journeysTable.updatedAt));
  res.json({ journeys: rows });
});

// ── Item reorder (must precede /journeys/items/:itemId) ──
const reorderSchema = z.object({
  dayId: z.number().int().positive(),
  orderedItemIds: z.array(z.number().int().positive()),
});

router.post("/journeys/items/reorder", ...authorGuards, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const parsed = reorderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const day = await db.query.journeyDaysTable.findFirst({
    where: eq(journeyDaysTable.id, parsed.data.dayId),
  });
  if (!day) {
    res.status(404).json({ error: "Day not found" });
    return;
  }
  const journey = await db.query.journeysTable.findFirst({
    where: eq(journeysTable.id, day.journeyId),
  });
  if (!journey) {
    res.status(404).json({ error: "Journey not found" });
    return;
  }
  const authorTracks = await resolveAuthorTracks(req.user.role, req.user.userId);
  const denied = authorizeJourney(req.user.role, authorTracks, journey.careerTrack);
  if (denied) {
    res.status(403).json({ error: denied });
    return;
  }
  const locked = assertDraft(journey.status);
  if (locked) {
    res.status(409).json({ error: locked });
    return;
  }
  // Only reorder items that genuinely belong to this day (ignore foreign ids).
  const dayItems = await db
    .select({ id: journeyDayItemsTable.id })
    .from(journeyDayItemsTable)
    .where(eq(journeyDayItemsTable.dayId, parsed.data.dayId));
  const valid = new Set(dayItems.map((i) => i.id));
  let order = 0;
  for (const id of parsed.data.orderedItemIds) {
    if (!valid.has(id)) continue;
    await db
      .update(journeyDayItemsTable)
      .set({ order })
      .where(eq(journeyDayItemsTable.id, id));
    order += 1;
  }
  await audit(req, "journey.items.reordered", day.journeyId, { dayId: parsed.data.dayId });
  res.json({ ok: true });
});

// ── Update / delete a single item ──
const updateItemSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  isRequired: z.boolean().optional(),
  xpReward: z.number().int().min(0).max(100000).optional(),
  refId: z.number().int().positive().nullable().optional(),
});

async function loadItemWithJourney(itemId: number) {
  const item = await db.query.journeyDayItemsTable.findFirst({
    where: eq(journeyDayItemsTable.id, itemId),
  });
  if (!item) return null;
  const journey = await db.query.journeysTable.findFirst({
    where: eq(journeysTable.id, item.journeyId),
  });
  if (!journey) return null;
  return { item, journey };
}

router.patch("/journeys/items/:itemId", ...authorGuards, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const itemId = Number(req.params.itemId);
  if (!Number.isInteger(itemId)) {
    res.status(400).json({ error: "Invalid item id" });
    return;
  }
  const parsed = updateItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const loaded = await loadItemWithJourney(itemId);
  if (!loaded) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  const authorTracks = await resolveAuthorTracks(req.user.role, req.user.userId);
  const denied = authorizeJourney(req.user.role, authorTracks, loaded.journey.careerTrack);
  if (denied) {
    res.status(403).json({ error: denied });
    return;
  }
  const locked = assertDraft(loaded.journey.status);
  if (locked) {
    res.status(409).json({ error: locked });
    return;
  }
  // If refId changes, re-validate against the (unchanged) item type.
  if (parsed.data.refId !== undefined) {
    const check = await validateItemRef(loaded.item.type, parsed.data.refId);
    if (!check.ok) {
      res.status(400).json({ error: check.error });
      return;
    }
  }
  const [updated] = await db
    .update(journeyDayItemsTable)
    .set({
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      ...(parsed.data.isRequired !== undefined ? { isRequired: parsed.data.isRequired } : {}),
      ...(parsed.data.xpReward !== undefined ? { xpReward: parsed.data.xpReward } : {}),
      ...(parsed.data.refId !== undefined ? { refId: parsed.data.refId } : {}),
    })
    .where(eq(journeyDayItemsTable.id, itemId))
    .returning();
  await audit(req, "journey.item.updated", loaded.journey.id, { itemId });
  res.json({ item: updated });
});

router.delete("/journeys/items/:itemId", ...authorGuards, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const itemId = Number(req.params.itemId);
  if (!Number.isInteger(itemId)) {
    res.status(400).json({ error: "Invalid item id" });
    return;
  }
  const loaded = await loadItemWithJourney(itemId);
  if (!loaded) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  const authorTracks = await resolveAuthorTracks(req.user.role, req.user.userId);
  const denied = authorizeJourney(req.user.role, authorTracks, loaded.journey.careerTrack);
  if (denied) {
    res.status(403).json({ error: denied });
    return;
  }
  const locked = assertDraft(loaded.journey.status);
  if (locked) {
    res.status(409).json({ error: locked });
    return;
  }
  await db.delete(journeyDayItemsTable).where(eq(journeyDayItemsTable.id, itemId));
  await audit(req, "journey.item.deleted", loaded.journey.id, { itemId });
  res.json({ ok: true });
});

// ── Update / delete a single day ──
const updateDaySchema = z.object({
  offset: z.number().int().min(0).max(3650).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
});

async function loadDayWithJourney(dayId: number) {
  const day = await db.query.journeyDaysTable.findFirst({
    where: eq(journeyDaysTable.id, dayId),
  });
  if (!day) return null;
  const journey = await db.query.journeysTable.findFirst({
    where: eq(journeysTable.id, day.journeyId),
  });
  if (!journey) return null;
  return { day, journey };
}

router.patch("/journeys/days/:dayId", ...authorGuards, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const dayId = Number(req.params.dayId);
  if (!Number.isInteger(dayId)) {
    res.status(400).json({ error: "Invalid day id" });
    return;
  }
  const parsed = updateDaySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const loaded = await loadDayWithJourney(dayId);
  if (!loaded) {
    res.status(404).json({ error: "Day not found" });
    return;
  }
  const authorTracks = await resolveAuthorTracks(req.user.role, req.user.userId);
  const denied = authorizeJourney(req.user.role, authorTracks, loaded.journey.careerTrack);
  if (denied) {
    res.status(403).json({ error: denied });
    return;
  }
  const locked = assertDraft(loaded.journey.status);
  if (locked) {
    res.status(409).json({ error: locked });
    return;
  }
  // Enforce unique offset within the journey when offset changes.
  if (parsed.data.offset !== undefined && parsed.data.offset !== loaded.day.offset) {
    const clash = await db.query.journeyDaysTable.findFirst({
      where: and(
        eq(journeyDaysTable.journeyId, loaded.journey.id),
        eq(journeyDaysTable.offset, parsed.data.offset)
      ),
    });
    if (clash) {
      res.status(409).json({ error: "Another day already uses that offset" });
      return;
    }
  }
  const [updated] = await db
    .update(journeyDaysTable)
    .set({
      ...(parsed.data.offset !== undefined ? { offset: parsed.data.offset } : {}),
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
    })
    .where(eq(journeyDaysTable.id, dayId))
    .returning();
  await audit(req, "journey.day.updated", loaded.journey.id, { dayId });
  res.json({ day: updated });
});

router.delete("/journeys/days/:dayId", ...authorGuards, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const dayId = Number(req.params.dayId);
  if (!Number.isInteger(dayId)) {
    res.status(400).json({ error: "Invalid day id" });
    return;
  }
  const loaded = await loadDayWithJourney(dayId);
  if (!loaded) {
    res.status(404).json({ error: "Day not found" });
    return;
  }
  const authorTracks = await resolveAuthorTracks(req.user.role, req.user.userId);
  const denied = authorizeJourney(req.user.role, authorTracks, loaded.journey.careerTrack);
  if (denied) {
    res.status(403).json({ error: denied });
    return;
  }
  const locked = assertDraft(loaded.journey.status);
  if (locked) {
    res.status(409).json({ error: locked });
    return;
  }
  await db.delete(journeyDayItemsTable).where(eq(journeyDayItemsTable.dayId, dayId));
  await db.delete(journeyDaysTable).where(eq(journeyDaysTable.id, dayId));
  await refreshTotalDays(loaded.journey.id);
  await audit(req, "journey.day.deleted", loaded.journey.id, { dayId });
  res.json({ ok: true });
});

// ── Create an item under a day ──
const createItemSchema = z.object({
  type: z.enum(ITEM_TYPES),
  refId: z.number().int().positive().nullable().optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  order: z.number().int().min(0).optional(),
  isRequired: z.boolean().optional(),
  xpReward: z.number().int().min(0).max(100000).optional(),
});

router.post("/journeys/days/:dayId/items", ...authorGuards, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const dayId = Number(req.params.dayId);
  if (!Number.isInteger(dayId)) {
    res.status(400).json({ error: "Invalid day id" });
    return;
  }
  const parsed = createItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const loaded = await loadDayWithJourney(dayId);
  if (!loaded) {
    res.status(404).json({ error: "Day not found" });
    return;
  }
  const authorTracks = await resolveAuthorTracks(req.user.role, req.user.userId);
  const denied = authorizeJourney(req.user.role, authorTracks, loaded.journey.careerTrack);
  if (denied) {
    res.status(403).json({ error: denied });
    return;
  }
  const locked = assertDraft(loaded.journey.status);
  if (locked) {
    res.status(409).json({ error: locked });
    return;
  }
  const check = await validateItemRef(parsed.data.type, parsed.data.refId);
  if (!check.ok) {
    res.status(400).json({ error: check.error });
    return;
  }
  // Append to the end of the day unless an explicit order is given.
  let order = parsed.data.order;
  if (order === undefined) {
    const existing = await db
      .select({ order: journeyDayItemsTable.order })
      .from(journeyDayItemsTable)
      .where(eq(journeyDayItemsTable.dayId, dayId))
      .orderBy(desc(journeyDayItemsTable.order))
      .limit(1);
    order = existing.length ? existing[0].order + 1 : 0;
  }
  const [created] = await db
    .insert(journeyDayItemsTable)
    .values({
      dayId,
      journeyId: loaded.journey.id,
      type: parsed.data.type,
      refId: parsed.data.refId ?? null,
      title: parsed.data.title ?? check.title ?? parsed.data.type,
      description: parsed.data.description ?? null,
      order,
      isRequired: parsed.data.isRequired ?? true,
      xpReward: parsed.data.xpReward ?? 0,
    })
    .returning();
  await audit(req, "journey.item.created", loaded.journey.id, { dayId, itemId: created.id, type: created.type });
  res.status(201).json({ item: created });
});

// ── Journey lifecycle: publish / archive ──
router.post("/journeys/:id/publish", ...authorGuards, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid journey id" });
    return;
  }
  const journey = await db.query.journeysTable.findFirst({ where: eq(journeysTable.id, id) });
  if (!journey) {
    res.status(404).json({ error: "Journey not found" });
    return;
  }
  const authorTracks = await resolveAuthorTracks(req.user.role, req.user.userId);
  const denied = authorizeJourney(req.user.role, authorTracks, journey.careerTrack);
  if (denied) {
    res.status(403).json({ error: denied });
    return;
  }
  const days = await db
    .select({ id: journeyDaysTable.id })
    .from(journeyDaysTable)
    .where(eq(journeyDaysTable.journeyId, id));
  if (days.length === 0) {
    res.status(400).json({ error: "Add at least one day before publishing" });
    return;
  }
  // Only one published journey per track at a time — archive any prior one so
  // student auto-enrollment is unambiguous.
  await db
    .update(journeysTable)
    .set({ status: "archived", archivedAt: new Date() })
    .where(
      and(
        eq(journeysTable.careerTrack, journey.careerTrack),
        eq(journeysTable.status, "published")
      )
    );
  const [updated] = await db
    .update(journeysTable)
    .set({ status: "published", publishedAt: new Date(), archivedAt: null })
    .where(eq(journeysTable.id, id))
    .returning();
  await audit(req, "journey.published", id, { careerTrack: journey.careerTrack });
  res.json({ journey: updated });
});

router.post("/journeys/:id/archive", ...authorGuards, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid journey id" });
    return;
  }
  const journey = await db.query.journeysTable.findFirst({ where: eq(journeysTable.id, id) });
  if (!journey) {
    res.status(404).json({ error: "Journey not found" });
    return;
  }
  const authorTracks = await resolveAuthorTracks(req.user.role, req.user.userId);
  const denied = authorizeJourney(req.user.role, authorTracks, journey.careerTrack);
  if (denied) {
    res.status(403).json({ error: denied });
    return;
  }
  const [updated] = await db
    .update(journeysTable)
    .set({ status: "archived", archivedAt: new Date() })
    .where(eq(journeysTable.id, id))
    .returning();
  await audit(req, "journey.archived", id);
  res.json({ journey: updated });
});

// ── Create a day under a journey ──
const createDaySchema = z.object({
  offset: z.number().int().min(0).max(3650),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

router.post("/journeys/:id/days", ...authorGuards, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid journey id" });
    return;
  }
  const parsed = createDaySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const journey = await db.query.journeysTable.findFirst({ where: eq(journeysTable.id, id) });
  if (!journey) {
    res.status(404).json({ error: "Journey not found" });
    return;
  }
  const authorTracks = await resolveAuthorTracks(req.user.role, req.user.userId);
  const denied = authorizeJourney(req.user.role, authorTracks, journey.careerTrack);
  if (denied) {
    res.status(403).json({ error: denied });
    return;
  }
  const locked = assertDraft(journey.status);
  if (locked) {
    res.status(409).json({ error: locked });
    return;
  }
  const clash = await db.query.journeyDaysTable.findFirst({
    where: and(eq(journeyDaysTable.journeyId, id), eq(journeyDaysTable.offset, parsed.data.offset)),
  });
  if (clash) {
    res.status(409).json({ error: "A day already uses that offset" });
    return;
  }
  const [created] = await db
    .insert(journeyDaysTable)
    .values({
      journeyId: id,
      offset: parsed.data.offset,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
    })
    .returning();
  await refreshTotalDays(id);
  await audit(req, "journey.day.created", id, { dayId: created.id, offset: created.offset });
  res.status(201).json({ day: created });
});

// ── Journey detail / update / delete (param routes last) ──
router.get("/journeys/:id", ...authorGuards, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid journey id" });
    return;
  }
  const tree = await loadJourneyTree(id);
  if (!tree) {
    res.status(404).json({ error: "Journey not found" });
    return;
  }
  const authorTracks = await resolveAuthorTracks(req.user.role, req.user.userId);
  const denied = authorizeJourney(req.user.role, authorTracks, tree.careerTrack);
  if (denied) {
    res.status(403).json({ error: denied });
    return;
  }
  res.json({ journey: tree });
});

const updateJourneySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
});

router.patch("/journeys/:id", ...authorGuards, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid journey id" });
    return;
  }
  const parsed = updateJourneySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const journey = await db.query.journeysTable.findFirst({ where: eq(journeysTable.id, id) });
  if (!journey) {
    res.status(404).json({ error: "Journey not found" });
    return;
  }
  const authorTracks = await resolveAuthorTracks(req.user.role, req.user.userId);
  const denied = authorizeJourney(req.user.role, authorTracks, journey.careerTrack);
  if (denied) {
    res.status(403).json({ error: denied });
    return;
  }
  const locked = assertDraft(journey.status);
  if (locked) {
    res.status(409).json({ error: locked });
    return;
  }
  const [updated] = await db
    .update(journeysTable)
    .set({
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
    })
    .where(eq(journeysTable.id, id))
    .returning();
  await audit(req, "journey.updated", id);
  res.json({ journey: updated });
});

router.delete("/journeys/:id", ...authorGuards, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid journey id" });
    return;
  }
  const journey = await db.query.journeysTable.findFirst({ where: eq(journeysTable.id, id) });
  if (!journey) {
    res.status(404).json({ error: "Journey not found" });
    return;
  }
  const authorTracks = await resolveAuthorTracks(req.user.role, req.user.userId);
  const denied = authorizeJourney(req.user.role, authorTracks, journey.careerTrack);
  if (denied) {
    res.status(403).json({ error: denied });
    return;
  }
  // Published journeys may have enrolled students; archive before deleting.
  if (journey.status === "published") {
    res.status(409).json({ error: "Archive this journey before deleting it — it may have enrolled students." });
    return;
  }
  await db.delete(journeyDayItemsTable).where(eq(journeyDayItemsTable.journeyId, id));
  await db.delete(journeyDaysTable).where(eq(journeyDaysTable.journeyId, id));
  await db.delete(journeysTable).where(eq(journeysTable.id, id));
  await audit(req, "journey.deleted", id);
  res.json({ ok: true });
});

export default router;
