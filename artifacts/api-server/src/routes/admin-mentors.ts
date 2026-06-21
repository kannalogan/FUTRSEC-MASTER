import { Router } from "express";
import { eq, and, or, ilike, desc, inArray, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import {
  usersTable,
  mentorProfilesTable,
  tracksTable,
  batchesTable,
  batchStudentsTable,
  mentorStudentsTable,
} from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";

const router = Router();

const CAREER_TRACKS = ["soc", "vapt", "grc"] as const;
const BATCH_STATUSES = ["upcoming", "active", "completed", "archived"] as const;

const createMentorSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(160),
  phone: z.string().min(4).max(20).optional(),
  careerTrack: z.enum(CAREER_TRACKS),
  specialization: z.string().max(200).optional(),
  yearsOfExperience: z.number().int().min(0).max(60).optional(),
  company: z.string().max(160).optional(),
  designation: z.string().max(160).optional(),
});

const updateMentorSchema = z.object({
  fullName: z.string().min(1).max(160).optional(),
  careerTrack: z.enum(CAREER_TRACKS).optional(),
  isActive: z.boolean().optional(),
});

const assignStudentsSchema = z.object({
  studentIds: z.array(z.number().int().positive()).min(1).max(500),
  batchId: z.number().int().positive().optional(),
  isTrial: z.boolean().optional(),
});

const createBatchSchema = z.object({
  name: z.string().min(1).max(160),
  code: z.string().max(40).optional(),
  careerTrack: z.enum(CAREER_TRACKS),
  mentorId: z.number().int().positive().optional(),
  status: z.enum(BATCH_STATUSES).optional(),
  description: z.string().max(2000).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const updateBatchSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  code: z.string().max(40).optional(),
  mentorId: z.number().int().positive().nullable().optional(),
  status: z.enum(BATCH_STATUSES).optional(),
  description: z.string().max(2000).optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
});

function ip(req: AuthRequest): string | undefined {
  return req.ip;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mentors
// ─────────────────────────────────────────────────────────────────────────────

// GET /admin/mentors — list mentors with assigned student & batch counts
router.get(
  "/admin/mentors",
  requireAuth,
  requireRole("admin"),
  async (req: AuthRequest, res): Promise<void> => {
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const where = search
      ? and(
          eq(usersTable.role, "mentor"),
          or(
            ilike(usersTable.fullName, `%${search}%`),
            ilike(usersTable.email, `%${search}%`)
          )
        )
      : eq(usersTable.role, "mentor");

    const mentors = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        fullName: usersTable.fullName,
        phone: usersTable.phone,
        careerTrack: usersTable.careerTrack,
        isActive: usersTable.isActive,
        lastLoginAt: usersTable.lastLoginAt,
        createdAt: usersTable.createdAt,
        specialization: mentorProfilesTable.specialization,
        company: mentorProfilesTable.company,
        designation: mentorProfilesTable.designation,
        yearsOfExperience: mentorProfilesTable.yearsOfExperience,
      })
      .from(usersTable)
      .leftJoin(
        mentorProfilesTable,
        eq(mentorProfilesTable.userId, usersTable.id)
      )
      .where(where)
      .orderBy(desc(usersTable.createdAt))
      .limit(200);

    const ids = mentors.map((m) => m.id);
    const studentCounts = new Map<number, number>();
    const batchCounts = new Map<number, number>();
    if (ids.length > 0) {
      const sc = await db
        .select({
          mentorId: mentorStudentsTable.mentorId,
          count: sql<number>`count(*)::int`,
        })
        .from(mentorStudentsTable)
        .where(inArray(mentorStudentsTable.mentorId, ids))
        .groupBy(mentorStudentsTable.mentorId);
      for (const r of sc) studentCounts.set(r.mentorId, r.count);
      const bc = await db
        .select({
          mentorId: batchesTable.mentorId,
          count: sql<number>`count(*)::int`,
        })
        .from(batchesTable)
        .where(inArray(batchesTable.mentorId, ids))
        .groupBy(batchesTable.mentorId);
      for (const r of bc) if (r.mentorId) batchCounts.set(r.mentorId, r.count);
    }

    res.json({
      mentors: mentors.map((m) => ({
        ...m,
        lastLoginAt: m.lastLoginAt ? m.lastLoginAt.toISOString() : null,
        createdAt: m.createdAt.toISOString(),
        studentCount: studentCounts.get(m.id) ?? 0,
        batchCount: batchCounts.get(m.id) ?? 0,
      })),
    });
  }
);

// POST /admin/mentors — create a mentor account (mentors cannot self-register)
router.post(
  "/admin/mentors",
  requireAuth,
  requireRole("admin"),
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const parsed = createMentorSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const data = parsed.data;

    const existing = await db.query.usersTable.findFirst({
      where: eq(usersTable.email, data.email),
    });
    if (existing) {
      res.status(409).json({ error: "A user with that email already exists" });
      return;
    }

    const [mentor] = await db
      .insert(usersTable)
      .values({
        email: data.email,
        phone: data.phone,
        fullName: data.fullName,
        role: "mentor",
        onboardingStep: "complete",
        careerTrack: data.careerTrack,
        isActive: true,
      })
      .returning();

    await db.insert(mentorProfilesTable).values({
      userId: mentor.id,
      specialization: data.specialization,
      yearsOfExperience: data.yearsOfExperience,
      company: data.company,
      designation: data.designation,
    });

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.mentor.created",
      entityType: "user",
      entityId: mentor.id,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { email: data.email, careerTrack: data.careerTrack },
    });

    res.status(201).json({
      mentor: {
        id: mentor.id,
        email: mentor.email,
        fullName: mentor.fullName,
        phone: mentor.phone,
        careerTrack: mentor.careerTrack,
        isActive: mentor.isActive,
        createdAt: mentor.createdAt.toISOString(),
        lastLoginAt: null,
        studentCount: 0,
        batchCount: 0,
      },
    });
  }
);

// PATCH /admin/mentors/:id — update track / activate / deactivate
router.patch(
  "/admin/mentors/:id",
  requireAuth,
  requireRole("admin"),
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid mentor id" });
      return;
    }
    const parsed = updateMentorSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const mentor = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, id),
    });
    if (!mentor || mentor.role !== "mentor") {
      res.status(404).json({ error: "Mentor not found" });
      return;
    }

    const updates = parsed.data;
    if (updates.careerTrack) {
      const matching = await db.query.tracksTable.findFirst({
        where: eq(tracksTable.domain, updates.careerTrack),
      });
      if (matching) {
        await db
          .update(usersTable)
          .set({ selectedTrackId: matching.id })
          .where(eq(usersTable.id, id));
      }
    }

    const [updated] = await db
      .update(usersTable)
      .set({
        ...(updates.fullName !== undefined ? { fullName: updates.fullName } : {}),
        ...(updates.careerTrack !== undefined
          ? { careerTrack: updates.careerTrack }
          : {}),
        ...(updates.isActive !== undefined ? { isActive: updates.isActive } : {}),
      })
      .where(eq(usersTable.id, id))
      .returning();

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.mentor.updated",
      entityType: "user",
      entityId: id,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { ...updates },
    });

    res.json({
      mentor: {
        id: updated.id,
        email: updated.email,
        fullName: updated.fullName,
        phone: updated.phone,
        careerTrack: updated.careerTrack,
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString(),
        lastLoginAt: updated.lastLoginAt
          ? updated.lastLoginAt.toISOString()
          : null,
      },
    });
  }
);

// GET /admin/mentors/:id/students — students assigned to a mentor
router.get(
  "/admin/mentors/:id/students",
  requireAuth,
  requireRole("admin"),
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid mentor id" });
      return;
    }
    const rows = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        fullName: usersTable.fullName,
        careerTrack: usersTable.careerTrack,
        isTrial: mentorStudentsTable.isTrial,
        batchId: mentorStudentsTable.batchId,
        assignedAt: mentorStudentsTable.assignedAt,
      })
      .from(mentorStudentsTable)
      .innerJoin(usersTable, eq(usersTable.id, mentorStudentsTable.studentId))
      .where(eq(mentorStudentsTable.mentorId, id))
      .orderBy(desc(mentorStudentsTable.assignedAt));

    res.json({
      students: rows.map((r) => ({
        ...r,
        assignedAt: r.assignedAt.toISOString(),
      })),
    });
  }
);

// POST /admin/mentors/:id/students — assign students to a mentor
router.post(
  "/admin/mentors/:id/students",
  requireAuth,
  requireRole("admin"),
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid mentor id" });
      return;
    }
    const parsed = assignStudentsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const mentor = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, id),
    });
    if (!mentor || mentor.role !== "mentor") {
      res.status(404).json({ error: "Mentor not found" });
      return;
    }

    const validStudents = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(
        and(
          inArray(usersTable.id, parsed.data.studentIds),
          eq(usersTable.role, "student")
        )
      );
    const validIds = validStudents.map((s) => s.id);
    if (validIds.length === 0) {
      res.status(400).json({ error: "No valid student accounts in selection" });
      return;
    }

    await db
      .insert(mentorStudentsTable)
      .values(
        validIds.map((studentId) => ({
          mentorId: id,
          studentId,
          batchId: parsed.data.batchId ?? null,
          isTrial: parsed.data.isTrial ?? false,
          assignedBy: req.user!.userId,
        }))
      )
      .onConflictDoNothing();

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.mentor.students_assigned",
      entityType: "user",
      entityId: id,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { studentIds: validIds, batchId: parsed.data.batchId ?? null },
    });

    res.status(201).json({ assigned: validIds.length });
  }
);

// DELETE /admin/mentors/:id/students/:studentId — unassign a student
router.delete(
  "/admin/mentors/:id/students/:studentId",
  requireAuth,
  requireRole("admin"),
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const id = parseInt(String(req.params.id), 10);
    const studentId = parseInt(String(req.params.studentId), 10);
    if (isNaN(id) || isNaN(studentId)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db
      .delete(mentorStudentsTable)
      .where(
        and(
          eq(mentorStudentsTable.mentorId, id),
          eq(mentorStudentsTable.studentId, studentId)
        )
      );
    await createAuditLog({
      userId: req.user.userId,
      action: "admin.mentor.student_unassigned",
      entityType: "user",
      entityId: id,
      ipAddress: ip(req),
      metadata: { studentId },
    });
    res.json({ ok: true });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Batches
// ─────────────────────────────────────────────────────────────────────────────

// GET /admin/batches — list all batches
router.get(
  "/admin/batches",
  requireAuth,
  requireRole("admin"),
  async (_req: AuthRequest, res): Promise<void> => {
    const rows = await db
      .select({
        id: batchesTable.id,
        name: batchesTable.name,
        code: batchesTable.code,
        careerTrack: batchesTable.careerTrack,
        mentorId: batchesTable.mentorId,
        status: batchesTable.status,
        startDate: batchesTable.startDate,
        endDate: batchesTable.endDate,
        createdAt: batchesTable.createdAt,
        mentorName: usersTable.fullName,
      })
      .from(batchesTable)
      .leftJoin(usersTable, eq(usersTable.id, batchesTable.mentorId))
      .orderBy(desc(batchesTable.createdAt));

    const ids = rows.map((b) => b.id);
    const counts = new Map<number, number>();
    if (ids.length > 0) {
      const c = await db
        .select({
          batchId: batchStudentsTable.batchId,
          count: sql<number>`count(*)::int`,
        })
        .from(batchStudentsTable)
        .where(inArray(batchStudentsTable.batchId, ids))
        .groupBy(batchStudentsTable.batchId);
      for (const r of c) counts.set(r.batchId, r.count);
    }

    res.json({
      batches: rows.map((b) => ({
        ...b,
        startDate: b.startDate ? b.startDate.toISOString() : null,
        endDate: b.endDate ? b.endDate.toISOString() : null,
        createdAt: b.createdAt.toISOString(),
        studentCount: counts.get(b.id) ?? 0,
      })),
    });
  }
);

// POST /admin/batches — create a batch
router.post(
  "/admin/batches",
  requireAuth,
  requireRole("admin"),
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const parsed = createBatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const d = parsed.data;
    if (d.mentorId) {
      const mentor = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, d.mentorId),
      });
      if (!mentor || mentor.role !== "mentor") {
        res.status(400).json({ error: "mentorId must reference a mentor" });
        return;
      }
    }
    const [batch] = await db
      .insert(batchesTable)
      .values({
        name: d.name,
        code: d.code,
        careerTrack: d.careerTrack,
        mentorId: d.mentorId ?? null,
        status: d.status ?? "upcoming",
        description: d.description,
        startDate: d.startDate ? new Date(d.startDate) : null,
        endDate: d.endDate ? new Date(d.endDate) : null,
        createdBy: req.user.userId,
      })
      .returning();

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.batch.created",
      entityType: "batch",
      entityId: batch.id,
      ipAddress: ip(req),
      metadata: { name: d.name, careerTrack: d.careerTrack },
    });

    res.status(201).json({
      batch: {
        ...batch,
        startDate: batch.startDate ? batch.startDate.toISOString() : null,
        endDate: batch.endDate ? batch.endDate.toISOString() : null,
        createdAt: batch.createdAt.toISOString(),
        updatedAt: batch.updatedAt.toISOString(),
        studentCount: 0,
      },
    });
  }
);

// PATCH /admin/batches/:id — update batch (assign mentor / status / dates)
router.patch(
  "/admin/batches/:id",
  requireAuth,
  requireRole("admin"),
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid batch id" });
      return;
    }
    const parsed = updateBatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const batch = await db.query.batchesTable.findFirst({
      where: eq(batchesTable.id, id),
    });
    if (!batch) {
      res.status(404).json({ error: "Batch not found" });
      return;
    }
    const d = parsed.data;
    if (d.mentorId) {
      const mentor = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, d.mentorId),
      });
      if (!mentor || mentor.role !== "mentor") {
        res.status(400).json({ error: "mentorId must reference a mentor" });
        return;
      }
    }
    const [updated] = await db
      .update(batchesTable)
      .set({
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.code !== undefined ? { code: d.code } : {}),
        ...(d.mentorId !== undefined ? { mentorId: d.mentorId } : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
        ...(d.description !== undefined ? { description: d.description } : {}),
        ...(d.startDate !== undefined
          ? { startDate: d.startDate ? new Date(d.startDate) : null }
          : {}),
        ...(d.endDate !== undefined
          ? { endDate: d.endDate ? new Date(d.endDate) : null }
          : {}),
      })
      .where(eq(batchesTable.id, id))
      .returning();

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.batch.updated",
      entityType: "batch",
      entityId: id,
      ipAddress: ip(req),
      metadata: { ...d },
    });

    res.json({
      batch: {
        ...updated,
        startDate: updated.startDate ? updated.startDate.toISOString() : null,
        endDate: updated.endDate ? updated.endDate.toISOString() : null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  }
);

// POST /admin/batches/:id/students — add students to a batch
router.post(
  "/admin/batches/:id/students",
  requireAuth,
  requireRole("admin"),
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid batch id" });
      return;
    }
    const parsed = assignStudentsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const batch = await db.query.batchesTable.findFirst({
      where: eq(batchesTable.id, id),
    });
    if (!batch) {
      res.status(404).json({ error: "Batch not found" });
      return;
    }
    const validStudents = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(
        and(
          inArray(usersTable.id, parsed.data.studentIds),
          eq(usersTable.role, "student")
        )
      );
    const validIds = validStudents.map((s) => s.id);
    if (validIds.length === 0) {
      res.status(400).json({ error: "No valid student accounts in selection" });
      return;
    }
    await db
      .insert(batchStudentsTable)
      .values(
        validIds.map((studentId) => ({
          batchId: id,
          studentId,
          assignedBy: req.user!.userId,
        }))
      )
      .onConflictDoNothing();

    // Keep mentor↔student links consistent when the batch has a mentor.
    if (batch.mentorId) {
      await db
        .insert(mentorStudentsTable)
        .values(
          validIds.map((studentId) => ({
            mentorId: batch.mentorId!,
            studentId,
            batchId: id,
            assignedBy: req.user!.userId,
          }))
        )
        .onConflictDoNothing();
    }

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.batch.students_added",
      entityType: "batch",
      entityId: id,
      ipAddress: ip(req),
      metadata: { studentIds: validIds },
    });

    res.status(201).json({ added: validIds.length });
  }
);

export default router;
