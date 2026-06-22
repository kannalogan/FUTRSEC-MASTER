import { Router, type Response, type NextFunction } from "express";
import { eq, and, inArray, desc, asc, ne, lt, gt } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable,
  studentProfilesTable,
  tpoProfilesTable,
  ftsScoresTable,
  placementDrivesTable,
  driveRoundsTable,
  driveInvitesTable,
  roundSchedulesTable,
  type PlacementDrive,
} from "@workspace/db";
import { z } from "zod/v4";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";
import { createNotification } from "../lib/notifications";
import { loadTpoProfile, getTpoStudentIds } from "../lib/tpo-scope";

const router = Router();

// ── Guards ───────────────────────────────────────────────────────────────────
async function requireApprovedTpo(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const me = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, req.user.userId),
  });
  if (!me || me.role !== "tpo") {
    res.status(403).json({ error: "TPO access required" });
    return;
  }
  if (!me.isActive) {
    res.status(403).json({ error: "Your TPO account is deactivated" });
    return;
  }
  const profile = await db.query.tpoProfilesTable.findFirst({
    where: eq(tpoProfilesTable.userId, req.user.userId),
  });
  if (!profile || profile.approvalStatus !== "approved") {
    res.status(403).json({
      error: "TPO account pending admin approval",
      code: "PENDING_APPROVAL",
      approvalStatus: profile?.approvalStatus ?? "pending",
    });
    return;
  }
  next();
}

const tpoGuards = [requireAuth, requireRole("tpo"), requireApprovedTpo];
const studentGuards = [requireAuth, requireRole("student")];

// Load a drive and verify it belongs to the calling TPO. Returns the drive or
// null (caller is responsible for 404 / 403 semantics — here we collapse both
// into "not yours" via 404 to avoid leaking existence).
async function ownedDrive(
  driveId: number,
  tpoUserId: number
): Promise<PlacementDrive | null> {
  const drive = await db.query.placementDrivesTable.findFirst({
    where: eq(placementDrivesTable.id, driveId),
  });
  if (!drive || drive.tpoId !== tpoUserId) return null;
  return drive;
}

function parseId(value: unknown): number | null {
  const n = parseInt(String(value), 10);
  return Number.isNaN(n) ? null : n;
}

const MODES = ["onsite", "remote", "hybrid"] as const;
const ROUND_TYPES = ["aptitude", "gd", "technical", "hr", "managerial", "final"] as const;
const RESULT_VALUES = ["pending", "pass", "fail", "selected", "rejected", "offer", "joined"] as const;
const TRACKS = ["soc", "vapt", "grc"] as const;

// ── Drives ───────────────────────────────────────────────────────────────────
const createDriveSchema = z.object({
  companyId: z.number().int().nullable().optional(),
  companyName: z.string().trim().min(2),
  role: z.string().trim().min(2),
  careerTrack: z.enum(TRACKS).nullable().optional(),
  packageDetails: z.string().trim().nullable().optional(),
  mode: z.enum(MODES).optional(),
  venue: z.string().trim().nullable().optional(),
  meetingUrl: z.string().trim().nullable().optional(),
  eligibilityCriteria: z.string().trim().nullable().optional(),
  minFtsScore: z.number().int().min(0).max(100).nullable().optional(),
  driveDate: z.string().datetime().nullable().optional(),
});

const updateDriveSchema = createDriveSchema.partial();

router.get(
  "/placement-drives",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const drives = await db
      .select()
      .from(placementDrivesTable)
      .where(eq(placementDrivesTable.tpoId, req.user!.userId))
      .orderBy(desc(placementDrivesTable.createdAt));

    const driveIds = drives.map((d) => d.id);
    const invites = driveIds.length
      ? await db
          .select({ driveId: driveInvitesTable.driveId })
          .from(driveInvitesTable)
          .where(inArray(driveInvitesTable.driveId, driveIds))
      : [];
    const rounds = driveIds.length
      ? await db
          .select({ driveId: driveRoundsTable.driveId })
          .from(driveRoundsTable)
          .where(inArray(driveRoundsTable.driveId, driveIds))
      : [];

    const inviteCount = new Map<number, number>();
    for (const i of invites)
      inviteCount.set(i.driveId, (inviteCount.get(i.driveId) ?? 0) + 1);
    const roundCount = new Map<number, number>();
    for (const r of rounds)
      roundCount.set(r.driveId, (roundCount.get(r.driveId) ?? 0) + 1);

    res.json({
      drives: drives.map((d) => ({
        ...d,
        driveDate: d.driveDate?.toISOString() ?? null,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
        invites: inviteCount.get(d.id) ?? 0,
        rounds: roundCount.get(d.id) ?? 0,
      })),
    });
  }
);

router.post(
  "/placement-drives",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const parsed = createDriveSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid drive data", details: parsed.error.issues });
      return;
    }
    const b = parsed.data;
    const [drive] = await db
      .insert(placementDrivesTable)
      .values({
        tpoId: req.user!.userId,
        companyId: b.companyId ?? null,
        companyName: b.companyName,
        role: b.role,
        careerTrack: b.careerTrack ?? null,
        packageDetails: b.packageDetails ?? null,
        mode: b.mode ?? "onsite",
        venue: b.venue ?? null,
        meetingUrl: b.meetingUrl ?? null,
        eligibilityCriteria: b.eligibilityCriteria ?? null,
        minFtsScore: b.minFtsScore ?? null,
        status: "draft",
        driveDate: b.driveDate ? new Date(b.driveDate) : null,
      })
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "placement_drive.created",
      entityType: "placement_drive",
      entityId: drive.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { companyName: drive.companyName, role: drive.role },
    });

    res.status(201).json({ drive });
  }
);

// ── Student-facing reads (registered before /:id so static paths win) ─────────
router.get(
  "/placement-drives/my-invites",
  ...studentGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const invites = await db
      .select()
      .from(driveInvitesTable)
      .where(eq(driveInvitesTable.studentId, req.user!.userId))
      .orderBy(desc(driveInvitesTable.invitedAt));

    const driveIds = [...new Set(invites.map((i) => i.driveId))];
    if (driveIds.length === 0) {
      res.json({ invites: [] });
      return;
    }
    const [drives, rounds] = await Promise.all([
      db
        .select()
        .from(placementDrivesTable)
        .where(inArray(placementDrivesTable.id, driveIds)),
      db
        .select()
        .from(driveRoundsTable)
        .where(inArray(driveRoundsTable.driveId, driveIds))
        .orderBy(asc(driveRoundsTable.sequence)),
    ]);
    const driveMap = new Map(drives.map((d) => [d.id, d]));
    const roundsByDrive = new Map<number, typeof rounds>();
    for (const r of rounds) {
      const arr = roundsByDrive.get(r.driveId) ?? [];
      arr.push(r);
      roundsByDrive.set(r.driveId, arr);
    }

    res.json({
      invites: invites.map((i) => {
        const d = driveMap.get(i.driveId);
        return {
          ...i,
          invitedAt: i.invitedAt.toISOString(),
          respondedAt: i.respondedAt?.toISOString() ?? null,
          updatedAt: i.updatedAt.toISOString(),
          drive: d
            ? {
                id: d.id,
                companyName: d.companyName,
                role: d.role,
                careerTrack: d.careerTrack,
                packageDetails: d.packageDetails,
                mode: d.mode,
                venue: d.venue,
                meetingUrl: d.meetingUrl,
                status: d.status,
                driveDate: d.driveDate?.toISOString() ?? null,
              }
            : null,
          rounds: (roundsByDrive.get(i.driveId) ?? []).map((r) => ({
            id: r.id,
            name: r.name,
            type: r.type,
            sequence: r.sequence,
            scheduledAt: r.scheduledAt?.toISOString() ?? null,
            durationMinutes: r.durationMinutes,
          })),
        };
      }),
    });
  }
);

router.get(
  "/placement-drives/my-schedule",
  ...studentGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const schedules = await db
      .select()
      .from(roundSchedulesTable)
      .where(eq(roundSchedulesTable.studentId, req.user!.userId))
      .orderBy(asc(roundSchedulesTable.slotStart));

    const driveIds = [...new Set(schedules.map((s) => s.driveId))];
    const roundIds = [...new Set(schedules.map((s) => s.roundId))];
    const [drives, rounds] = await Promise.all([
      driveIds.length
        ? db
            .select()
            .from(placementDrivesTable)
            .where(inArray(placementDrivesTable.id, driveIds))
        : Promise.resolve([]),
      roundIds.length
        ? db
            .select()
            .from(driveRoundsTable)
            .where(inArray(driveRoundsTable.id, roundIds))
        : Promise.resolve([]),
    ]);
    const driveMap = new Map(drives.map((d) => [d.id, d]));
    const roundMap = new Map(rounds.map((r) => [r.id, r]));

    res.json({
      schedules: schedules.map((s) => {
        const d = driveMap.get(s.driveId);
        const r = roundMap.get(s.roundId);
        return {
          ...s,
          slotStart: s.slotStart.toISOString(),
          slotEnd: s.slotEnd.toISOString(),
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
          drive: d ? { id: d.id, companyName: d.companyName, role: d.role } : null,
          round: r ? { id: r.id, name: r.name, type: r.type } : null,
        };
      }),
    });
  }
);

router.get(
  "/placement-drives/:id",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ error: "Invalid drive id" });
      return;
    }
    const drive = await ownedDrive(id, req.user!.userId);
    if (!drive) {
      res.status(404).json({ error: "Drive not found" });
      return;
    }

    const [rounds, invites, schedules] = await Promise.all([
      db
        .select()
        .from(driveRoundsTable)
        .where(eq(driveRoundsTable.driveId, id))
        .orderBy(asc(driveRoundsTable.sequence)),
      db.select().from(driveInvitesTable).where(eq(driveInvitesTable.driveId, id)),
      db
        .select({ id: roundSchedulesTable.id })
        .from(roundSchedulesTable)
        .where(eq(roundSchedulesTable.driveId, id)),
    ]);

    res.json({
      drive: {
        ...drive,
        driveDate: drive.driveDate?.toISOString() ?? null,
        createdAt: drive.createdAt.toISOString(),
        updatedAt: drive.updatedAt.toISOString(),
      },
      rounds: rounds.map((r) => ({
        ...r,
        scheduledAt: r.scheduledAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      counts: {
        invites: invites.length,
        accepted: invites.filter((i) => i.status === "accepted").length,
        declined: invites.filter((i) => i.status === "declined").length,
        schedules: schedules.length,
        rounds: rounds.length,
      },
    });
  }
);

router.put(
  "/placement-drives/:id",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ error: "Invalid drive id" });
      return;
    }
    const drive = await ownedDrive(id, req.user!.userId);
    if (!drive) {
      res.status(404).json({ error: "Drive not found" });
      return;
    }
    const parsed = updateDriveSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid drive data", details: parsed.error.issues });
      return;
    }
    const b = parsed.data;
    const [updated] = await db
      .update(placementDrivesTable)
      .set({
        ...(b.companyId !== undefined ? { companyId: b.companyId } : {}),
        ...(b.companyName !== undefined ? { companyName: b.companyName } : {}),
        ...(b.role !== undefined ? { role: b.role } : {}),
        ...(b.careerTrack !== undefined ? { careerTrack: b.careerTrack } : {}),
        ...(b.packageDetails !== undefined ? { packageDetails: b.packageDetails } : {}),
        ...(b.mode !== undefined ? { mode: b.mode } : {}),
        ...(b.venue !== undefined ? { venue: b.venue } : {}),
        ...(b.meetingUrl !== undefined ? { meetingUrl: b.meetingUrl } : {}),
        ...(b.eligibilityCriteria !== undefined
          ? { eligibilityCriteria: b.eligibilityCriteria }
          : {}),
        ...(b.minFtsScore !== undefined ? { minFtsScore: b.minFtsScore } : {}),
        ...(b.driveDate !== undefined
          ? { driveDate: b.driveDate ? new Date(b.driveDate) : null }
          : {}),
      })
      .where(eq(placementDrivesTable.id, id))
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "placement_drive.updated",
      entityType: "placement_drive",
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ drive: updated });
  }
);

router.post(
  "/placement-drives/:id/publish",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ error: "Invalid drive id" });
      return;
    }
    const drive = await ownedDrive(id, req.user!.userId);
    if (!drive) {
      res.status(404).json({ error: "Drive not found" });
      return;
    }
    if (drive.status === "cancelled") {
      res.status(400).json({ error: "Cannot publish a cancelled drive" });
      return;
    }
    const [updated] = await db
      .update(placementDrivesTable)
      .set({ status: "published" })
      .where(eq(placementDrivesTable.id, id))
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "placement_drive.published",
      entityType: "placement_drive",
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ drive: updated });
  }
);

router.post(
  "/placement-drives/:id/cancel",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ error: "Invalid drive id" });
      return;
    }
    const drive = await ownedDrive(id, req.user!.userId);
    if (!drive) {
      res.status(404).json({ error: "Drive not found" });
      return;
    }
    const [updated] = await db
      .update(placementDrivesTable)
      .set({ status: "cancelled" })
      .where(eq(placementDrivesTable.id, id))
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "placement_drive.cancelled",
      entityType: "placement_drive",
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ drive: updated });
  }
);

// ── Rounds ───────────────────────────────────────────────────────────────────
const createRoundSchema = z.object({
  name: z.string().trim().min(1),
  type: z.enum(ROUND_TYPES).optional(),
  sequence: z.number().int().min(1).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  durationMinutes: z.number().int().min(5).max(600).optional(),
  venue: z.string().trim().nullable().optional(),
  meetingUrl: z.string().trim().nullable().optional(),
  interviewerId: z.number().int().nullable().optional(),
  interviewerName: z.string().trim().nullable().optional(),
  capacity: z.number().int().min(0).nullable().optional(),
});

const updateRoundSchema = createRoundSchema.partial().extend({
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
});

router.post(
  "/placement-drives/:id/rounds",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ error: "Invalid drive id" });
      return;
    }
    const drive = await ownedDrive(id, req.user!.userId);
    if (!drive) {
      res.status(404).json({ error: "Drive not found" });
      return;
    }
    const parsed = createRoundSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid round data", details: parsed.error.issues });
      return;
    }
    const b = parsed.data;
    const [round] = await db
      .insert(driveRoundsTable)
      .values({
        driveId: id,
        name: b.name,
        type: b.type ?? "technical",
        sequence: b.sequence ?? 1,
        scheduledAt: b.scheduledAt ? new Date(b.scheduledAt) : null,
        durationMinutes: b.durationMinutes ?? 30,
        venue: b.venue ?? null,
        meetingUrl: b.meetingUrl ?? null,
        interviewerId: b.interviewerId ?? null,
        interviewerName: b.interviewerName ?? null,
        capacity: b.capacity ?? null,
        status: "scheduled",
      })
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "placement_drive.round.created",
      entityType: "drive_round",
      entityId: round.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { driveId: id, name: round.name },
    });

    res.status(201).json({ round });
  }
);

// Verify a round exists and its drive belongs to the calling TPO.
async function ownedRound(roundId: number, tpoUserId: number) {
  const round = await db.query.driveRoundsTable.findFirst({
    where: eq(driveRoundsTable.id, roundId),
  });
  if (!round) return null;
  const drive = await ownedDrive(round.driveId, tpoUserId);
  if (!drive) return null;
  return { round, drive };
}

router.put(
  "/placement-drives/rounds/:roundId",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const roundId = parseId(req.params.roundId);
    if (roundId === null) {
      res.status(400).json({ error: "Invalid round id" });
      return;
    }
    const owned = await ownedRound(roundId, req.user!.userId);
    if (!owned) {
      res.status(404).json({ error: "Round not found" });
      return;
    }
    const parsed = updateRoundSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid round data", details: parsed.error.issues });
      return;
    }
    const b = parsed.data;
    const [updated] = await db
      .update(driveRoundsTable)
      .set({
        ...(b.name !== undefined ? { name: b.name } : {}),
        ...(b.type !== undefined ? { type: b.type } : {}),
        ...(b.sequence !== undefined ? { sequence: b.sequence } : {}),
        ...(b.scheduledAt !== undefined
          ? { scheduledAt: b.scheduledAt ? new Date(b.scheduledAt) : null }
          : {}),
        ...(b.durationMinutes !== undefined ? { durationMinutes: b.durationMinutes } : {}),
        ...(b.venue !== undefined ? { venue: b.venue } : {}),
        ...(b.meetingUrl !== undefined ? { meetingUrl: b.meetingUrl } : {}),
        ...(b.interviewerId !== undefined ? { interviewerId: b.interviewerId } : {}),
        ...(b.interviewerName !== undefined ? { interviewerName: b.interviewerName } : {}),
        ...(b.capacity !== undefined ? { capacity: b.capacity } : {}),
        ...(b.status !== undefined ? { status: b.status } : {}),
      })
      .where(eq(driveRoundsTable.id, roundId))
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "placement_drive.round.updated",
      entityType: "drive_round",
      entityId: roundId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ round: updated });
  }
);

router.delete(
  "/placement-drives/rounds/:roundId",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const roundId = parseId(req.params.roundId);
    if (roundId === null) {
      res.status(400).json({ error: "Invalid round id" });
      return;
    }
    const owned = await ownedRound(roundId, req.user!.userId);
    if (!owned) {
      res.status(404).json({ error: "Round not found" });
      return;
    }
    await db
      .delete(roundSchedulesTable)
      .where(eq(roundSchedulesTable.roundId, roundId));
    await db.delete(driveRoundsTable).where(eq(driveRoundsTable.id, roundId));

    await createAuditLog({
      userId: req.user!.userId,
      action: "placement_drive.round.deleted",
      entityType: "drive_round",
      entityId: roundId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ success: true });
  }
);

// ── Invites ──────────────────────────────────────────────────────────────────
const inviteSchema = z.object({
  studentIds: z.array(z.number().int()).min(1),
});

router.post(
  "/placement-drives/:id/invites",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ error: "Invalid drive id" });
      return;
    }
    const drive = await ownedDrive(id, req.user!.userId);
    if (!drive) {
      res.status(404).json({ error: "Drive not found" });
      return;
    }
    const parsed = inviteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "studentIds[] is required", details: parsed.error.issues });
      return;
    }
    const requestedIds = [...new Set(parsed.data.studentIds)];

    // Restrict to students within this TPO's scope (mapped or same institution).
    const tpoProfile = await loadTpoProfile(req.user!.userId);
    const scopedIds = new Set(
      await getTpoStudentIds(req.user!.userId, tpoProfile?.institution ?? null)
    );

    // Validate each id is a real student AND inside the TPO's scope.
    const students = await db
      .select({ id: usersTable.id, role: usersTable.role })
      .from(usersTable)
      .where(inArray(usersTable.id, requestedIds));
    const validStudentIds = new Set(
      students
        .filter((s) => s.role === "student" && scopedIds.has(s.id))
        .map((s) => s.id)
    );

    // Exclude those already invited (UNIQUE(driveId, studentId)).
    const existing = await db
      .select({ studentId: driveInvitesTable.studentId })
      .from(driveInvitesTable)
      .where(eq(driveInvitesTable.driveId, id));
    const alreadyInvited = new Set(existing.map((e) => e.studentId));

    const toInvite = requestedIds.filter(
      (sid) => validStudentIds.has(sid) && !alreadyInvited.has(sid)
    );

    if (toInvite.length === 0) {
      res.status(400).json({
        error: "No new valid students to invite",
        skipped: {
          invalid: requestedIds.filter((sid) => !validStudentIds.has(sid)),
          duplicate: requestedIds.filter((sid) => alreadyInvited.has(sid)),
        },
      });
      return;
    }

    const inserted = await db
      .insert(driveInvitesTable)
      .values(
        toInvite.map((sid) => ({
          driveId: id,
          studentId: sid,
          stage: "invited",
          status: "invited",
          invitedBy: req.user!.userId,
        }))
      )
      .returning();

    for (const sid of toInvite) {
      await createNotification({
        userId: sid,
        role: "student",
        title: `Placement invite: ${drive.companyName}`,
        message: `You have been invited to the ${drive.role} drive at ${drive.companyName}. Review and respond from "My Interviews".`,
        type: "placement",
        entityType: "placement_drive",
        entityId: id,
        link: "/student/my-interviews",
        channels: ["in_app", "email"],
      });
    }

    await createAuditLog({
      userId: req.user!.userId,
      action: "placement_drive.invites.created",
      entityType: "placement_drive",
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { count: inserted.length },
    });

    res.status(201).json({
      invited: inserted.length,
      skipped: {
        invalid: requestedIds.filter((sid) => !validStudentIds.has(sid)),
        duplicate: requestedIds.filter((sid) => alreadyInvited.has(sid)),
      },
    });
  }
);

router.post(
  "/placement-drives/:id/invites/auto",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ error: "Invalid drive id" });
      return;
    }
    const drive = await ownedDrive(id, req.user!.userId);
    if (!drive) {
      res.status(404).json({ error: "Drive not found" });
      return;
    }

    // Eligible students: matching careerTrack (if set on the drive) AND FTS >=
    // minFtsScore (if set). Only role=student AND within this TPO's scope.
    const tpoProfile = await loadTpoProfile(req.user!.userId);
    const scopedIds = new Set(
      await getTpoStudentIds(req.user!.userId, tpoProfile?.institution ?? null)
    );
    if (scopedIds.size === 0) {
      res.json({ invited: 0, eligible: 0 });
      return;
    }
    const conds = [eq(usersTable.role, "student")];
    if (drive.careerTrack && (TRACKS as readonly string[]).includes(drive.careerTrack)) {
      conds.push(eq(usersTable.careerTrack, drive.careerTrack as (typeof TRACKS)[number]));
    }
    const candidates = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(...conds));
    let candidateIds = candidates.map((c) => c.id).filter((cid) => scopedIds.has(cid));

    if (drive.minFtsScore != null && candidateIds.length) {
      const fts = await db
        .select({ userId: ftsScoresTable.userId, totalScore: ftsScoresTable.totalScore })
        .from(ftsScoresTable)
        .where(inArray(ftsScoresTable.userId, candidateIds));
      const scoreMap = new Map(fts.map((f) => [f.userId, f.totalScore]));
      const min = drive.minFtsScore;
      candidateIds = candidateIds.filter((cid) => (scoreMap.get(cid) ?? 0) >= min);
    }

    if (candidateIds.length === 0) {
      res.json({ invited: 0, eligible: 0 });
      return;
    }

    const existing = await db
      .select({ studentId: driveInvitesTable.studentId })
      .from(driveInvitesTable)
      .where(eq(driveInvitesTable.driveId, id));
    const alreadyInvited = new Set(existing.map((e) => e.studentId));
    const toInvite = candidateIds.filter((cid) => !alreadyInvited.has(cid));

    if (toInvite.length === 0) {
      res.json({ invited: 0, eligible: candidateIds.length });
      return;
    }

    const inserted = await db
      .insert(driveInvitesTable)
      .values(
        toInvite.map((sid) => ({
          driveId: id,
          studentId: sid,
          stage: "invited",
          status: "invited",
          invitedBy: req.user!.userId,
        }))
      )
      .returning();

    for (const sid of toInvite) {
      await createNotification({
        userId: sid,
        role: "student",
        title: `Placement invite: ${drive.companyName}`,
        message: `You are eligible for the ${drive.role} drive at ${drive.companyName}. Respond from "My Interviews".`,
        type: "placement",
        entityType: "placement_drive",
        entityId: id,
        link: "/student/my-interviews",
        channels: ["in_app", "email"],
      });
    }

    await createAuditLog({
      userId: req.user!.userId,
      action: "placement_drive.invites.auto",
      entityType: "placement_drive",
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { count: inserted.length, eligible: candidateIds.length },
    });

    res.status(201).json({ invited: inserted.length, eligible: candidateIds.length });
  }
);

router.get(
  "/placement-drives/:id/invites",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ error: "Invalid drive id" });
      return;
    }
    const drive = await ownedDrive(id, req.user!.userId);
    if (!drive) {
      res.status(404).json({ error: "Drive not found" });
      return;
    }
    const invites = await db
      .select()
      .from(driveInvitesTable)
      .where(eq(driveInvitesTable.driveId, id))
      .orderBy(desc(driveInvitesTable.invitedAt));

    const studentIds = [...new Set(invites.map((i) => i.studentId))];
    const [students, profiles, fts] = await Promise.all([
      studentIds.length
        ? db
            .select({
              id: usersTable.id,
              fullName: usersTable.fullName,
              email: usersTable.email,
              careerTrack: usersTable.careerTrack,
            })
            .from(usersTable)
            .where(inArray(usersTable.id, studentIds))
        : Promise.resolve([]),
      studentIds.length
        ? db
            .select()
            .from(studentProfilesTable)
            .where(inArray(studentProfilesTable.userId, studentIds))
        : Promise.resolve([]),
      studentIds.length
        ? db
            .select()
            .from(ftsScoresTable)
            .where(inArray(ftsScoresTable.userId, studentIds))
        : Promise.resolve([]),
    ]);
    const stuMap = new Map(students.map((s) => [s.id, s]));
    const profMap = new Map(profiles.map((p) => [p.userId, p]));
    const ftsMap = new Map(fts.map((f) => [f.userId, f.totalScore]));

    res.json({
      invites: invites.map((i) => ({
        ...i,
        invitedAt: i.invitedAt.toISOString(),
        respondedAt: i.respondedAt?.toISOString() ?? null,
        updatedAt: i.updatedAt.toISOString(),
        student: stuMap.get(i.studentId) ?? null,
        college: profMap.get(i.studentId)?.college ?? null,
        ftsScore: ftsMap.get(i.studentId) ?? 0,
      })),
    });
  }
);

const STAGES = [
  "invited",
  "shortlisted",
  "technical",
  "hr",
  "final",
  "offer",
  "joined",
  "rejected",
  "withdrawn",
] as const;
const patchInviteSchema = z
  .object({
    stage: z.enum(STAGES).optional(),
    status: z.enum(["invited", "accepted", "declined", "withdrawn"]).optional(),
  })
  .refine((d) => d.stage !== undefined || d.status !== undefined, {
    message: "stage or status required",
  });

router.patch(
  "/placement-drives/invites/:inviteId",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const inviteId = parseId(req.params.inviteId);
    if (inviteId === null) {
      res.status(400).json({ error: "Invalid invite id" });
      return;
    }
    const invite = await db.query.driveInvitesTable.findFirst({
      where: eq(driveInvitesTable.id, inviteId),
    });
    if (!invite) {
      res.status(404).json({ error: "Invite not found" });
      return;
    }
    const drive = await ownedDrive(invite.driveId, req.user!.userId);
    if (!drive) {
      res.status(404).json({ error: "Invite not found" });
      return;
    }
    const parsed = patchInviteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid update", details: parsed.error.issues });
      return;
    }
    const [updated] = await db
      .update(driveInvitesTable)
      .set({
        ...(parsed.data.stage !== undefined ? { stage: parsed.data.stage } : {}),
        ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      })
      .where(eq(driveInvitesTable.id, inviteId))
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "placement_drive.invite.updated",
      entityType: "drive_invite",
      entityId: inviteId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { stage: parsed.data.stage, status: parsed.data.status },
    });

    res.json({ invite: updated });
  }
);

// ── Student-facing ───────────────────────────────────────────────────────────
const respondSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

router.post(
  "/placement-drives/invites/:inviteId/respond",
  ...studentGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const inviteId = parseId(req.params.inviteId);
    if (inviteId === null) {
      res.status(400).json({ error: "Invalid invite id" });
      return;
    }
    const parsed = respondSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "action must be accept or decline" });
      return;
    }
    const invite = await db.query.driveInvitesTable.findFirst({
      where: eq(driveInvitesTable.id, inviteId),
    });
    if (!invite) {
      res.status(404).json({ error: "Invite not found" });
      return;
    }
    if (invite.studentId !== req.user!.userId) {
      res.status(403).json({ error: "This invite does not belong to you" });
      return;
    }
    const newStatus = parsed.data.action === "accept" ? "accepted" : "declined";
    const [updated] = await db
      .update(driveInvitesTable)
      .set({
        status: newStatus,
        respondedAt: new Date(),
        ...(parsed.data.action === "decline" ? { stage: "withdrawn" } : {}),
      })
      .where(eq(driveInvitesTable.id, inviteId))
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "placement_drive.invite.responded",
      entityType: "drive_invite",
      entityId: inviteId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { status: newStatus },
    });

    // Notify the owning TPO.
    const drive = await db.query.placementDrivesTable.findFirst({
      where: eq(placementDrivesTable.id, invite.driveId),
    });
    if (drive) {
      const me = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, req.user!.userId),
      });
      await createNotification({
        userId: drive.tpoId,
        role: "tpo",
        title: `Invite ${newStatus}: ${drive.companyName}`,
        message: `${me?.fullName ?? "A student"} ${newStatus} the invite for the ${drive.role} drive.`,
        type: "placement",
        entityType: "placement_drive",
        entityId: drive.id,
        link: `/tpo/drives/${drive.id}`,
        channels: ["in_app"],
      });
    }

    res.json({ invite: updated });
  }
);

// ── Schedules / Calendar ─────────────────────────────────────────────────────
type SchedConflict = {
  type: "student" | "interviewer";
  scheduleId: number;
  slotStart: string;
  slotEnd: string;
};

// Find non-cancelled slots overlapping [start, end) that clash with the student
// or the round's interviewer. Excludes `excludeScheduleId` (for reschedules).
async function findConflicts(opts: {
  studentId: number;
  interviewerId: number | null;
  start: Date;
  end: Date;
  excludeScheduleId?: number;
}): Promise<SchedConflict[]> {
  const { studentId, interviewerId, start, end, excludeScheduleId } = opts;
  const conflicts: SchedConflict[] = [];

  const overlap = and(
    lt(roundSchedulesTable.slotStart, end),
    gt(roundSchedulesTable.slotEnd, start),
    ne(roundSchedulesTable.status, "cancelled")
  );

  // Student conflicts.
  const studentRows = await db
    .select()
    .from(roundSchedulesTable)
    .where(and(eq(roundSchedulesTable.studentId, studentId), overlap));
  for (const r of studentRows) {
    if (excludeScheduleId && r.id === excludeScheduleId) continue;
    conflicts.push({
      type: "student",
      scheduleId: r.id,
      slotStart: r.slotStart.toISOString(),
      slotEnd: r.slotEnd.toISOString(),
    });
  }

  // Interviewer conflicts: schedules belonging to rounds with the same interviewer.
  if (interviewerId != null) {
    const interviewerRounds = await db
      .select({ id: driveRoundsTable.id })
      .from(driveRoundsTable)
      .where(eq(driveRoundsTable.interviewerId, interviewerId));
    const roundIds = interviewerRounds.map((r) => r.id);
    if (roundIds.length) {
      const ivRows = await db
        .select()
        .from(roundSchedulesTable)
        .where(and(inArray(roundSchedulesTable.roundId, roundIds), overlap));
      for (const r of ivRows) {
        if (excludeScheduleId && r.id === excludeScheduleId) continue;
        if (conflicts.some((c) => c.scheduleId === r.id)) continue;
        conflicts.push({
          type: "interviewer",
          scheduleId: r.id,
          slotStart: r.slotStart.toISOString(),
          slotEnd: r.slotEnd.toISOString(),
        });
      }
    }
  }

  return conflicts;
}

const createScheduleSchema = z.object({
  studentId: z.number().int(),
  slotStart: z.string().datetime(),
  slotEnd: z.string().datetime(),
  venue: z.string().trim().nullable().optional(),
  meetingUrl: z.string().trim().nullable().optional(),
});

router.post(
  "/placement-drives/rounds/:roundId/schedules",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const roundId = parseId(req.params.roundId);
    if (roundId === null) {
      res.status(400).json({ error: "Invalid round id" });
      return;
    }
    const owned = await ownedRound(roundId, req.user!.userId);
    if (!owned) {
      res.status(404).json({ error: "Round not found" });
      return;
    }
    const parsed = createScheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid schedule data", details: parsed.error.issues });
      return;
    }
    const b = parsed.data;
    const start = new Date(b.slotStart);
    const end = new Date(b.slotEnd);
    if (end <= start) {
      res.status(400).json({ error: "slotEnd must be after slotStart" });
      return;
    }

    // Student must exist and be invited to this drive.
    const invite = await db.query.driveInvitesTable.findFirst({
      where: and(
        eq(driveInvitesTable.driveId, owned.drive.id),
        eq(driveInvitesTable.studentId, b.studentId)
      ),
    });
    if (!invite) {
      res.status(400).json({ error: "Student is not invited to this drive" });
      return;
    }

    const conflicts = await findConflicts({
      studentId: b.studentId,
      interviewerId: owned.round.interviewerId,
      start,
      end,
    });
    if (conflicts.length > 0) {
      res.status(409).json({ error: "Scheduling conflict detected", conflicts });
      return;
    }

    const [schedule] = await db
      .insert(roundSchedulesTable)
      .values({
        roundId,
        driveId: owned.drive.id,
        studentId: b.studentId,
        slotStart: start,
        slotEnd: end,
        venue: b.venue ?? owned.round.venue ?? null,
        meetingUrl: b.meetingUrl ?? owned.round.meetingUrl ?? null,
        status: "scheduled",
        result: "pending",
        attendance: "unknown",
        createdBy: req.user!.userId,
      })
      .returning();

    await createNotification({
      userId: b.studentId,
      role: "student",
      title: `Interview scheduled: ${owned.drive.companyName}`,
      message: `Your ${owned.round.name} round for ${owned.drive.role} is scheduled. Check "My Interviews".`,
      type: "placement",
      entityType: "round_schedule",
      entityId: schedule.id,
      link: "/student/my-interviews",
      channels: ["in_app", "email"],
    });

    await createAuditLog({
      userId: req.user!.userId,
      action: "placement_drive.schedule.created",
      entityType: "round_schedule",
      entityId: schedule.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { roundId, studentId: b.studentId },
    });

    res.status(201).json({ schedule });
  }
);

// Verify a schedule exists and its drive belongs to the calling TPO.
async function ownedSchedule(scheduleId: number, tpoUserId: number) {
  const schedule = await db.query.roundSchedulesTable.findFirst({
    where: eq(roundSchedulesTable.id, scheduleId),
  });
  if (!schedule) return null;
  const drive = await ownedDrive(schedule.driveId, tpoUserId);
  if (!drive) return null;
  const round = await db.query.driveRoundsTable.findFirst({
    where: eq(driveRoundsTable.id, schedule.roundId),
  });
  return { schedule, drive, round: round ?? null };
}

const reschedSchema = z.object({
  slotStart: z.string().datetime(),
  slotEnd: z.string().datetime(),
  venue: z.string().trim().nullable().optional(),
  meetingUrl: z.string().trim().nullable().optional(),
});

router.patch(
  "/placement-drives/schedules/:scheduleId",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const scheduleId = parseId(req.params.scheduleId);
    if (scheduleId === null) {
      res.status(400).json({ error: "Invalid schedule id" });
      return;
    }
    const owned = await ownedSchedule(scheduleId, req.user!.userId);
    if (!owned) {
      res.status(404).json({ error: "Schedule not found" });
      return;
    }
    const parsed = reschedSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid reschedule data", details: parsed.error.issues });
      return;
    }
    const start = new Date(parsed.data.slotStart);
    const end = new Date(parsed.data.slotEnd);
    if (end <= start) {
      res.status(400).json({ error: "slotEnd must be after slotStart" });
      return;
    }

    const conflicts = await findConflicts({
      studentId: owned.schedule.studentId,
      interviewerId: owned.round?.interviewerId ?? null,
      start,
      end,
      excludeScheduleId: scheduleId,
    });
    if (conflicts.length > 0) {
      res.status(409).json({ error: "Scheduling conflict detected", conflicts });
      return;
    }

    const [updated] = await db
      .update(roundSchedulesTable)
      .set({
        slotStart: start,
        slotEnd: end,
        status: "rescheduled",
        ...(parsed.data.venue !== undefined ? { venue: parsed.data.venue } : {}),
        ...(parsed.data.meetingUrl !== undefined
          ? { meetingUrl: parsed.data.meetingUrl }
          : {}),
      })
      .where(eq(roundSchedulesTable.id, scheduleId))
      .returning();

    await createNotification({
      userId: owned.schedule.studentId,
      role: "student",
      title: `Interview rescheduled: ${owned.drive.companyName}`,
      message: `Your interview slot for ${owned.drive.role} has been rescheduled. Check "My Interviews".`,
      type: "placement",
      entityType: "round_schedule",
      entityId: scheduleId,
      link: "/student/my-interviews",
      channels: ["in_app", "email"],
    });

    await createAuditLog({
      userId: req.user!.userId,
      action: "placement_drive.schedule.rescheduled",
      entityType: "round_schedule",
      entityId: scheduleId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ schedule: updated });
  }
);

const attendanceSchema = z.object({
  attendance: z.enum(["present", "absent"]),
});

router.patch(
  "/placement-drives/schedules/:scheduleId/attendance",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const scheduleId = parseId(req.params.scheduleId);
    if (scheduleId === null) {
      res.status(400).json({ error: "Invalid schedule id" });
      return;
    }
    const owned = await ownedSchedule(scheduleId, req.user!.userId);
    if (!owned) {
      res.status(404).json({ error: "Schedule not found" });
      return;
    }
    const parsed = attendanceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "attendance must be present or absent" });
      return;
    }
    const [updated] = await db
      .update(roundSchedulesTable)
      .set({ attendance: parsed.data.attendance })
      .where(eq(roundSchedulesTable.id, scheduleId))
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "placement_drive.schedule.attendance",
      entityType: "round_schedule",
      entityId: scheduleId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { attendance: parsed.data.attendance },
    });

    res.json({ schedule: updated });
  }
);

const resultSchema = z.object({
  result: z.enum(RESULT_VALUES),
  score: z.number().int().min(0).max(100).nullable().optional(),
  feedback: z.string().trim().nullable().optional(),
});

// Map a slot result to the next pipeline stage on the drive invite.
const RESULT_TO_STAGE: Record<string, string> = {
  pass: "shortlisted",
  selected: "final",
  offer: "offer",
  joined: "joined",
  fail: "rejected",
  rejected: "rejected",
};

router.patch(
  "/placement-drives/schedules/:scheduleId/result",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const scheduleId = parseId(req.params.scheduleId);
    if (scheduleId === null) {
      res.status(400).json({ error: "Invalid schedule id" });
      return;
    }
    const owned = await ownedSchedule(scheduleId, req.user!.userId);
    if (!owned) {
      res.status(404).json({ error: "Schedule not found" });
      return;
    }
    const parsed = resultSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid result data", details: parsed.error.issues });
      return;
    }
    const b = parsed.data;
    const [updated] = await db
      .update(roundSchedulesTable)
      .set({
        result: b.result,
        status: "completed",
        ...(b.score !== undefined ? { score: b.score } : {}),
        ...(b.feedback !== undefined ? { feedback: b.feedback } : {}),
      })
      .where(eq(roundSchedulesTable.id, scheduleId))
      .returning();

    // Advance the invite pipeline stage.
    const nextStage = RESULT_TO_STAGE[b.result];
    if (nextStage) {
      await db
        .update(driveInvitesTable)
        .set({ stage: nextStage })
        .where(
          and(
            eq(driveInvitesTable.driveId, owned.drive.id),
            eq(driveInvitesTable.studentId, owned.schedule.studentId)
          )
        );
    }

    await createNotification({
      userId: owned.schedule.studentId,
      role: "student",
      title: `Interview result: ${owned.drive.companyName}`,
      message: `Your ${owned.round?.name ?? "interview"} result for ${owned.drive.role} is now "${b.result}". Check "My Interviews".`,
      type: "placement",
      entityType: "round_schedule",
      entityId: scheduleId,
      link: "/student/my-interviews",
      channels: ["in_app", "email"],
    });

    await createAuditLog({
      userId: req.user!.userId,
      action: "placement_drive.schedule.result",
      entityType: "round_schedule",
      entityId: scheduleId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { result: b.result, score: b.score ?? null },
    });

    res.json({ schedule: updated });
  }
);

router.delete(
  "/placement-drives/schedules/:scheduleId",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const scheduleId = parseId(req.params.scheduleId);
    if (scheduleId === null) {
      res.status(400).json({ error: "Invalid schedule id" });
      return;
    }
    const owned = await ownedSchedule(scheduleId, req.user!.userId);
    if (!owned) {
      res.status(404).json({ error: "Schedule not found" });
      return;
    }
    const [updated] = await db
      .update(roundSchedulesTable)
      .set({ status: "cancelled" })
      .where(eq(roundSchedulesTable.id, scheduleId))
      .returning();

    await createNotification({
      userId: owned.schedule.studentId,
      role: "student",
      title: `Interview cancelled: ${owned.drive.companyName}`,
      message: `Your interview slot for ${owned.drive.role} has been cancelled.`,
      type: "placement",
      entityType: "round_schedule",
      entityId: scheduleId,
      link: "/student/my-interviews",
      channels: ["in_app", "email"],
    });

    await createAuditLog({
      userId: req.user!.userId,
      action: "placement_drive.schedule.cancelled",
      entityType: "round_schedule",
      entityId: scheduleId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ schedule: updated });
  }
);

router.get(
  "/placement-drives/:id/schedules",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ error: "Invalid drive id" });
      return;
    }
    const drive = await ownedDrive(id, req.user!.userId);
    if (!drive) {
      res.status(404).json({ error: "Drive not found" });
      return;
    }
    const schedules = await db
      .select()
      .from(roundSchedulesTable)
      .where(eq(roundSchedulesTable.driveId, id))
      .orderBy(asc(roundSchedulesTable.slotStart));

    const studentIds = [...new Set(schedules.map((s) => s.studentId))];
    const roundIds = [...new Set(schedules.map((s) => s.roundId))];
    const [students, rounds] = await Promise.all([
      studentIds.length
        ? db
            .select({
              id: usersTable.id,
              fullName: usersTable.fullName,
              email: usersTable.email,
            })
            .from(usersTable)
            .where(inArray(usersTable.id, studentIds))
        : Promise.resolve([]),
      roundIds.length
        ? db
            .select()
            .from(driveRoundsTable)
            .where(inArray(driveRoundsTable.id, roundIds))
        : Promise.resolve([]),
    ]);
    const stuMap = new Map(students.map((s) => [s.id, s]));
    const roundMap = new Map(rounds.map((r) => [r.id, r]));

    res.json({
      schedules: schedules.map((s) => {
        const r = roundMap.get(s.roundId);
        return {
          ...s,
          slotStart: s.slotStart.toISOString(),
          slotEnd: s.slotEnd.toISOString(),
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
          student: stuMap.get(s.studentId) ?? null,
          round: r
            ? {
                id: r.id,
                name: r.name,
                type: r.type,
                interviewerId: r.interviewerId,
                interviewerName: r.interviewerName,
              }
            : null,
        };
      }),
    });
  }
);

// ── Analytics ────────────────────────────────────────────────────────────────
router.get(
  "/placement-drives/analytics/overview",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const drives = await db
      .select()
      .from(placementDrivesTable)
      .where(eq(placementDrivesTable.tpoId, req.user!.userId));
    const driveIds = drives.map((d) => d.id);

    const invites = driveIds.length
      ? await db
          .select()
          .from(driveInvitesTable)
          .where(inArray(driveInvitesTable.driveId, driveIds))
      : [];

    const placed = invites.filter((i) => i.stage === "joined").length;
    const offers = invites.filter(
      (i) => i.stage === "offer" || i.stage === "joined"
    ).length;
    const totalInvited = invites.length;

    // By-track: count drives + placements per track.
    const driveTrack = new Map(drives.map((d) => [d.id, d.careerTrack]));
    const byTrack: Record<string, { drives: number; placed: number }> = {
      soc: { drives: 0, placed: 0 },
      vapt: { drives: 0, placed: 0 },
      grc: { drives: 0, placed: 0 },
    };
    for (const d of drives) {
      if (d.careerTrack && d.careerTrack in byTrack) byTrack[d.careerTrack].drives += 1;
    }
    for (const i of invites) {
      if (i.stage === "joined") {
        const t = driveTrack.get(i.driveId);
        if (t && t in byTrack) byTrack[t].placed += 1;
      }
    }

    res.json({
      drives: drives.length,
      published: drives.filter((d) => d.status === "published").length,
      inProgress: drives.filter((d) => d.status === "in_progress").length,
      completed: drives.filter((d) => d.status === "completed").length,
      totalInvited,
      offers,
      placed,
      placementRate: totalInvited ? Math.round((placed / totalInvited) * 1000) / 10 : 0,
      byTrack: (TRACKS as readonly string[]).map((t) => ({
        track: t,
        drives: byTrack[t].drives,
        placed: byTrack[t].placed,
      })),
    });
  }
);

router.get(
  "/placement-drives/:id/analytics",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ error: "Invalid drive id" });
      return;
    }
    const drive = await ownedDrive(id, req.user!.userId);
    if (!drive) {
      res.status(404).json({ error: "Drive not found" });
      return;
    }

    const [invites, rounds, schedules] = await Promise.all([
      db.select().from(driveInvitesTable).where(eq(driveInvitesTable.driveId, id)),
      db
        .select()
        .from(driveRoundsTable)
        .where(eq(driveRoundsTable.driveId, id))
        .orderBy(asc(driveRoundsTable.sequence)),
      db.select().from(roundSchedulesTable).where(eq(roundSchedulesTable.driveId, id)),
    ]);

    const invited = invites.length;
    const accepted = invites.filter((i) => i.status === "accepted").length;
    const declined = invites.filter((i) => i.status === "declined").length;

    const activeSched = schedules.filter((s) => s.status !== "cancelled");
    const completed = activeSched.filter((s) => s.status === "completed");
    const present = activeSched.filter((s) => s.attendance === "present").length;
    const attendanceMarked = activeSched.filter((s) => s.attendance !== "unknown").length;

    // Per-round pass rates.
    const perRound = rounds.map((r) => {
      const rs = activeSched.filter((s) => s.roundId === r.id);
      const done = rs.filter((s) => s.status === "completed");
      const passed = rs.filter((s) =>
        ["pass", "selected", "offer", "joined"].includes(s.result)
      ).length;
      return {
        roundId: r.id,
        name: r.name,
        type: r.type,
        sequence: r.sequence,
        scheduled: rs.length,
        completed: done.length,
        passed,
        passRate: done.length ? Math.round((passed / done.length) * 1000) / 10 : 0,
      };
    });

    const offers = invites.filter(
      (i) => i.stage === "offer" || i.stage === "joined"
    ).length;
    const joined = invites.filter((i) => i.stage === "joined").length;

    const funnel = [
      { stage: "Invited", count: invited },
      { stage: "Accepted", count: accepted },
      { stage: "Scheduled", count: new Set(activeSched.map((s) => s.studentId)).size },
      { stage: "Completed", count: new Set(completed.map((s) => s.studentId)).size },
      { stage: "Offers", count: offers },
      { stage: "Joined", count: joined },
    ];

    res.json({
      invited,
      accepted,
      declined,
      pending: invited - accepted - declined,
      attendanceRate: attendanceMarked
        ? Math.round((present / attendanceMarked) * 1000) / 10
        : 0,
      offers,
      joined,
      perRound,
      funnel,
    });
  }
);

export default router;
