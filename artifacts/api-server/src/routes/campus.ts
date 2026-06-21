import { Router, type Response, type NextFunction } from "express";
import { eq, and, inArray, desc, ilike } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable,
  studentProfilesTable,
  tpoProfilesTable,
  studentTpoMapTable,
  campusDrivesTable,
  campusDriveRegistrationsTable,
} from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";
import { eventBus } from "../lib/events";

const router = Router();

const CAREER_TRACKS = ["soc", "vapt", "grc"] as const;
type CareerTrack = (typeof CAREER_TRACKS)[number];
function isCareerTrack(v: unknown): v is CareerTrack {
  return typeof v === "string" && (CAREER_TRACKS as readonly string[]).includes(v);
}

const DRIVE_MODES = ["onsite", "remote", "hybrid"] as const;
const DRIVE_STATUSES = ["open", "closed", "completed", "cancelled"] as const;
const REGISTRATION_STATUSES = [
  "registered",
  "shortlisted",
  "selected",
  "rejected",
  "withdrawn",
] as const;

function toStringArray(v: unknown): string[] | null {
  if (v == null) return null;
  if (!Array.isArray(v)) return null;
  return v.map((x) => String(x).trim()).filter((x) => x.length > 0);
}

// ── TPO guard (self-contained; mirrors tpo.ts requireApprovedTpo) ─────────────
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

const adminGuards = [requireAuth, requireRole("admin")];
const studentGuards = [requireAuth, requireRole("student")];
const tpoGuards = [requireAuth, requireRole("tpo"), requireApprovedTpo];

// Resolve the set of student userIds visible to this TPO:
//   explicitly mapped (student_tpo_map) ∪ students whose college == institution
async function getTpoStudentIds(
  tpoUserId: number,
  institution: string | null
): Promise<number[]> {
  const mapped = await db
    .select({ studentId: studentTpoMapTable.studentId })
    .from(studentTpoMapTable)
    .where(eq(studentTpoMapTable.tpoId, tpoUserId));
  const ids = new Set<number>(mapped.map((m) => m.studentId));

  if (institution) {
    const byCollege = await db
      .select({ userId: studentProfilesTable.userId })
      .from(studentProfilesTable)
      .where(ilike(studentProfilesTable.college, institution));
    for (const r of byCollege) ids.add(r.userId);
  }
  return [...ids];
}

function serializeDrive(d: typeof campusDrivesTable.$inferSelect) {
  return {
    ...d,
    deadline: d.deadline ? d.deadline.toISOString() : null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

function serializeRegistration(
  r: typeof campusDriveRegistrationsTable.$inferSelect
) {
  return {
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: create drive
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/campus/drives",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const {
      name,
      companyName,
      careerTrack,
      eligibleColleges,
      eligibleYears,
      eligibilityCriteria,
      packageDetails,
      mode,
      deadline,
      status,
    } = req.body ?? {};

    if (typeof name !== "string" || name.trim().length < 2) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    if (typeof companyName !== "string" || companyName.trim().length < 1) {
      res.status(400).json({ error: "companyName is required" });
      return;
    }
    if (!isCareerTrack(careerTrack)) {
      res.status(400).json({ error: "careerTrack must be soc, vapt, or grc" });
      return;
    }
    const colleges = toStringArray(eligibleColleges) ?? [];
    const years = toStringArray(eligibleYears) ?? [];
    const driveMode =
      typeof mode === "string" && (DRIVE_MODES as readonly string[]).includes(mode)
        ? mode
        : "onsite";
    const driveStatus =
      typeof status === "string" &&
      (DRIVE_STATUSES as readonly string[]).includes(status)
        ? status
        : "open";

    const [drive] = await db
      .insert(campusDrivesTable)
      .values({
        name: name.trim(),
        companyName: companyName.trim(),
        careerTrack,
        eligibleColleges: colleges,
        eligibleYears: years,
        eligibilityCriteria:
          typeof eligibilityCriteria === "string" ? eligibilityCriteria : null,
        packageDetails:
          typeof packageDetails === "string" ? packageDetails : null,
        mode: driveMode,
        deadline: deadline ? new Date(deadline) : null,
        status: driveStatus,
        createdBy: req.user!.userId,
      })
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "campus.drive.created",
      entityType: "campus_drive",
      entityId: drive.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { name: drive.name, careerTrack: drive.careerTrack },
    });

    res.status(201).json({ drive: serializeDrive(drive) });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: update drive
// ─────────────────────────────────────────────────────────────────────────────
router.patch(
  "/campus/drives/:id",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid drive id" });
      return;
    }
    const existing = await db.query.campusDrivesTable.findFirst({
      where: eq(campusDrivesTable.id, id),
    });
    if (!existing) {
      res.status(404).json({ error: "Drive not found" });
      return;
    }

    const b = req.body ?? {};
    if (b.careerTrack != null && !isCareerTrack(b.careerTrack)) {
      res.status(400).json({ error: "careerTrack must be soc, vapt, or grc" });
      return;
    }

    const updates: Partial<typeof campusDrivesTable.$inferInsert> = {};
    if (typeof b.name === "string") updates.name = b.name.trim();
    if (typeof b.companyName === "string")
      updates.companyName = b.companyName.trim();
    if (b.careerTrack != null) updates.careerTrack = b.careerTrack;
    if (b.eligibleColleges !== undefined)
      updates.eligibleColleges = toStringArray(b.eligibleColleges) ?? [];
    if (b.eligibleYears !== undefined)
      updates.eligibleYears = toStringArray(b.eligibleYears) ?? [];
    if (b.eligibilityCriteria !== undefined)
      updates.eligibilityCriteria = b.eligibilityCriteria ?? null;
    if (b.packageDetails !== undefined)
      updates.packageDetails = b.packageDetails ?? null;
    if (
      typeof b.mode === "string" &&
      (DRIVE_MODES as readonly string[]).includes(b.mode)
    )
      updates.mode = b.mode;
    if (b.deadline !== undefined)
      updates.deadline = b.deadline ? new Date(b.deadline) : null;
    if (
      typeof b.status === "string" &&
      (DRIVE_STATUSES as readonly string[]).includes(b.status)
    )
      updates.status = b.status;

    const [updated] = await db
      .update(campusDrivesTable)
      .set(updates)
      .where(eq(campusDrivesTable.id, id))
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "campus.drive.updated",
      entityType: "campus_drive",
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ drive: serializeDrive(updated) });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: set registration result (attendance + result/selection)
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/campus/drives/:id/registrations/:rid/result",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const driveId = parseInt(String(req.params.id), 10);
    const regId = parseInt(String(req.params.rid), 10);
    if (isNaN(driveId) || isNaN(regId)) {
      res.status(400).json({ error: "Invalid drive or registration id" });
      return;
    }

    const reg = await db.query.campusDriveRegistrationsTable.findFirst({
      where: eq(campusDriveRegistrationsTable.id, regId),
    });
    if (!reg || reg.driveId !== driveId) {
      res.status(404).json({ error: "Registration not found for this drive" });
      return;
    }

    const b = req.body ?? {};
    const updates: Partial<typeof campusDriveRegistrationsTable.$inferInsert> =
      {};
    if (b.attended !== undefined) updates.attended = !!b.attended;
    if (b.result !== undefined) updates.result = b.result ?? null;
    if (b.notes !== undefined) updates.notes = b.notes ?? null;
    if (
      typeof b.status === "string" &&
      (REGISTRATION_STATUSES as readonly string[]).includes(b.status)
    )
      updates.status = b.status;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    const [updated] = await db
      .update(campusDriveRegistrationsTable)
      .set(updates)
      .where(eq(campusDriveRegistrationsTable.id, regId))
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "campus.drive.registration.result",
      entityType: "campus_drive_registration",
      entityId: regId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { driveId, status: updated.status, result: updated.result },
    });

    res.json({ registration: serializeRegistration(updated) });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /campus/drives — admin sees all; student sees eligible (track + college/year)
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/campus/drives",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    const role = req.user!.role;

    if (role === "admin") {
      const trackFilter = isCareerTrack(req.query.track)
        ? req.query.track
        : null;
      const conds = trackFilter
        ? [eq(campusDrivesTable.careerTrack, trackFilter)]
        : [];
      const drives = await db
        .select()
        .from(campusDrivesTable)
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(campusDrivesTable.createdAt));

      const driveIds = drives.map((d) => d.id);
      const regs = driveIds.length
        ? await db
            .select({ driveId: campusDriveRegistrationsTable.driveId })
            .from(campusDriveRegistrationsTable)
            .where(inArray(campusDriveRegistrationsTable.driveId, driveIds))
        : [];
      const regCount = new Map<number, number>();
      for (const r of regs)
        regCount.set(r.driveId, (regCount.get(r.driveId) ?? 0) + 1);

      res.json({
        drives: drives.map((d) => ({
          ...serializeDrive(d),
          registrations: regCount.get(d.id) ?? 0,
        })),
      });
      return;
    }

    if (role !== "student") {
      res.status(403).json({ error: "Student or admin access required" });
      return;
    }

    // Student: only drives matching their career track + eligible college/year
    const me = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, req.user!.userId),
    });
    if (!me?.careerTrack) {
      res.json({ drives: [] });
      return;
    }
    const profile = await db.query.studentProfilesTable.findFirst({
      where: eq(studentProfilesTable.userId, req.user!.userId),
    });
    const college = profile?.college?.trim() ?? null;
    const gradYear =
      profile?.graduationYear != null ? String(profile.graduationYear) : null;

    const drives = await db
      .select()
      .from(campusDrivesTable)
      .where(eq(campusDrivesTable.careerTrack, me.careerTrack))
      .orderBy(desc(campusDrivesTable.createdAt));

    const eligible = drives.filter((d) => {
      if (d.eligibleColleges.length > 0) {
        if (
          !college ||
          !d.eligibleColleges.some(
            (c) => c.toLowerCase() === college.toLowerCase()
          )
        )
          return false;
      }
      if (d.eligibleYears.length > 0) {
        if (!gradYear || !d.eligibleYears.includes(gradYear)) return false;
      }
      return true;
    });

    const driveIds = eligible.map((d) => d.id);
    const myRegs = driveIds.length
      ? await db
          .select()
          .from(campusDriveRegistrationsTable)
          .where(
            and(
              eq(campusDriveRegistrationsTable.studentId, req.user!.userId),
              inArray(campusDriveRegistrationsTable.driveId, driveIds)
            )
          )
      : [];
    const regMap = new Map(myRegs.map((r) => [r.driveId, r]));

    res.json({
      drives: eligible.map((d) => ({
        ...serializeDrive(d),
        registered: regMap.has(d.id),
        registration: regMap.has(d.id)
          ? serializeRegistration(regMap.get(d.id)!)
          : null,
      })),
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT: register for a drive (eligibility check + dedupe)
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/campus/drives/:id/register",
  ...studentGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const driveId = parseInt(String(req.params.id), 10);
    if (isNaN(driveId)) {
      res.status(400).json({ error: "Invalid drive id" });
      return;
    }

    const drive = await db.query.campusDrivesTable.findFirst({
      where: eq(campusDrivesTable.id, driveId),
    });
    if (!drive) {
      res.status(404).json({ error: "Drive not found" });
      return;
    }
    if (drive.status !== "open") {
      res.status(403).json({ error: "This drive is not open for registration" });
      return;
    }
    if (drive.deadline && drive.deadline.getTime() < Date.now()) {
      res.status(403).json({ error: "The registration deadline has passed" });
      return;
    }

    const me = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, req.user!.userId),
    });
    // Track isolation: students may only register for own-track drives.
    if (!me?.careerTrack || me.careerTrack !== drive.careerTrack) {
      res.status(403).json({
        error: "This drive belongs to a different career track.",
      });
      return;
    }

    const profile = await db.query.studentProfilesTable.findFirst({
      where: eq(studentProfilesTable.userId, req.user!.userId),
    });
    const college = profile?.college?.trim() ?? null;
    const gradYear =
      profile?.graduationYear != null ? String(profile.graduationYear) : null;

    if (drive.eligibleColleges.length > 0) {
      if (
        !college ||
        !drive.eligibleColleges.some(
          (c) => c.toLowerCase() === college.toLowerCase()
        )
      ) {
        res
          .status(403)
          .json({ error: "Your college is not eligible for this drive" });
        return;
      }
    }
    if (drive.eligibleYears.length > 0) {
      if (!gradYear || !drive.eligibleYears.includes(gradYear)) {
        res.status(403).json({
          error: "Your graduation year is not eligible for this drive",
        });
        return;
      }
    }

    const existing = await db.query.campusDriveRegistrationsTable.findFirst({
      where: and(
        eq(campusDriveRegistrationsTable.driveId, driveId),
        eq(campusDriveRegistrationsTable.studentId, req.user!.userId)
      ),
    });
    if (existing) {
      res.status(409).json({
        error: "Already registered for this drive",
        registration: serializeRegistration(existing),
      });
      return;
    }

    const [registration] = await db
      .insert(campusDriveRegistrationsTable)
      .values({
        driveId,
        studentId: req.user!.userId,
        status: "registered",
      })
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "campus.drive.registered",
      entityType: "campus_drive_registration",
      entityId: registration.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { driveId, driveName: drive.name },
    });

    eventBus.emit("campusdrive.registered", {
      type: "campusdrive.registered",
      userId: req.user!.userId,
      driveId,
      driveName: drive.name,
    });

    res.status(201).json({ registration: serializeRegistration(registration) });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT: my registrations
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/campus/my-registrations",
  ...studentGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const regs = await db
      .select()
      .from(campusDriveRegistrationsTable)
      .where(eq(campusDriveRegistrationsTable.studentId, req.user!.userId))
      .orderBy(desc(campusDriveRegistrationsTable.createdAt));

    if (regs.length === 0) {
      res.json({ registrations: [] });
      return;
    }

    const driveIds = [...new Set(regs.map((r) => r.driveId))];
    const drives = await db
      .select()
      .from(campusDrivesTable)
      .where(inArray(campusDrivesTable.id, driveIds));
    const driveMap = new Map(drives.map((d) => [d.id, d]));

    res.json({
      registrations: regs.map((r) => ({
        ...serializeRegistration(r),
        drive: driveMap.has(r.driveId)
          ? serializeDrive(driveMap.get(r.driveId)!)
          : null,
      })),
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// TPO: registrations for a drive (scoped to mapped/institution students)
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/campus/drives/:id/registrations",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const driveId = parseInt(String(req.params.id), 10);
    if (isNaN(driveId)) {
      res.status(400).json({ error: "Invalid drive id" });
      return;
    }
    const drive = await db.query.campusDrivesTable.findFirst({
      where: eq(campusDrivesTable.id, driveId),
    });
    if (!drive) {
      res.status(404).json({ error: "Drive not found" });
      return;
    }

    const profile = await db.query.tpoProfilesTable.findFirst({
      where: eq(tpoProfilesTable.userId, req.user!.userId),
    });
    const studentIds = await getTpoStudentIds(
      req.user!.userId,
      profile?.institution ?? null
    );
    if (studentIds.length === 0) {
      res.json({ registered: [], selected: [], rejected: [], all: [] });
      return;
    }

    const regs = await db
      .select()
      .from(campusDriveRegistrationsTable)
      .where(
        and(
          eq(campusDriveRegistrationsTable.driveId, driveId),
          inArray(campusDriveRegistrationsTable.studentId, studentIds)
        )
      )
      .orderBy(desc(campusDriveRegistrationsTable.createdAt));

    const regStudentIds = [...new Set(regs.map((r) => r.studentId))];
    const students = regStudentIds.length
      ? await db
          .select({
            id: usersTable.id,
            fullName: usersTable.fullName,
            email: usersTable.email,
            careerTrack: usersTable.careerTrack,
          })
          .from(usersTable)
          .where(inArray(usersTable.id, regStudentIds))
      : [];
    const stuMap = new Map(students.map((s) => [s.id, s]));

    const enriched = regs.map((r) => ({
      ...serializeRegistration(r),
      student: stuMap.get(r.studentId) ?? null,
    }));

    res.json({
      drive: serializeDrive(drive),
      all: enriched,
      registered: enriched.filter(
        (r) => r.status === "registered" || r.status === "shortlisted"
      ),
      selected: enriched.filter((r) => r.status === "selected"),
      rejected: enriched.filter((r) => r.status === "rejected"),
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: all registrations for a drive (unscoped — admins manage every college)
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/campus/admin/drives/:id/registrations",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const driveId = parseInt(String(req.params.id), 10);
    if (isNaN(driveId)) {
      res.status(400).json({ error: "Invalid drive id" });
      return;
    }
    const drive = await db.query.campusDrivesTable.findFirst({
      where: eq(campusDrivesTable.id, driveId),
    });
    if (!drive) {
      res.status(404).json({ error: "Drive not found" });
      return;
    }

    const regs = await db
      .select()
      .from(campusDriveRegistrationsTable)
      .where(eq(campusDriveRegistrationsTable.driveId, driveId))
      .orderBy(desc(campusDriveRegistrationsTable.createdAt));

    const regStudentIds = [...new Set(regs.map((r) => r.studentId))];
    const students = regStudentIds.length
      ? await db
          .select({
            id: usersTable.id,
            fullName: usersTable.fullName,
            email: usersTable.email,
            careerTrack: usersTable.careerTrack,
          })
          .from(usersTable)
          .where(inArray(usersTable.id, regStudentIds))
      : [];
    const stuMap = new Map(students.map((s) => [s.id, s]));

    const enriched = regs.map((r) => ({
      ...serializeRegistration(r),
      student: stuMap.get(r.studentId) ?? null,
    }));

    res.json({
      drive: serializeDrive(drive),
      all: enriched,
      registered: enriched.filter(
        (r) => r.status === "registered" || r.status === "shortlisted"
      ),
      selected: enriched.filter((r) => r.status === "selected"),
      rejected: enriched.filter((r) => r.status === "rejected"),
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// TPO: placement report per drive (scoped to mapped/institution students)
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/campus/reports",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const profile = await db.query.tpoProfilesTable.findFirst({
      where: eq(tpoProfilesTable.userId, req.user!.userId),
    });
    const studentIds = await getTpoStudentIds(
      req.user!.userId,
      profile?.institution ?? null
    );
    if (studentIds.length === 0) {
      res.json({ reports: [] });
      return;
    }

    const regs = await db
      .select()
      .from(campusDriveRegistrationsTable)
      .where(inArray(campusDriveRegistrationsTable.studentId, studentIds));

    if (regs.length === 0) {
      res.json({ reports: [] });
      return;
    }

    const driveIds = [...new Set(regs.map((r) => r.driveId))];
    const drives = await db
      .select()
      .from(campusDrivesTable)
      .where(inArray(campusDrivesTable.id, driveIds))
      .orderBy(desc(campusDrivesTable.createdAt));

    const reports = drives.map((d) => {
      const driveRegs = regs.filter((r) => r.driveId === d.id);
      return {
        drive: serializeDrive(d),
        registered: driveRegs.length,
        attended: driveRegs.filter((r) => r.attended).length,
        shortlisted: driveRegs.filter((r) => r.status === "shortlisted").length,
        selected: driveRegs.filter((r) => r.status === "selected").length,
        rejected: driveRegs.filter((r) => r.status === "rejected").length,
      };
    });

    res.json({ reports });
  }
);

export default router;
