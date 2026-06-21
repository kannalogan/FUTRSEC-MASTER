import { Router } from "express";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable, tracksTable } from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";

const router = Router();

const CAREER_TRACKS = ["soc", "vapt", "grc"] as const;
type CareerTrack = (typeof CAREER_TRACKS)[number];

function isCareerTrack(value: unknown): value is CareerTrack {
  return typeof value === "string" && (CAREER_TRACKS as readonly string[]).includes(value);
}

// GET /admin/students — list / search students (admin only)
router.get(
  "/admin/students",
  requireAuth,
  requireRole("admin"),
  async (req: AuthRequest, res): Promise<void> => {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

    const searchFilter = search
      ? or(
          ilike(usersTable.fullName, `%${search}%`),
          ilike(usersTable.email, `%${search}%`),
        )
      : undefined;

    const where = searchFilter
      ? and(eq(usersTable.role, "student"), searchFilter)
      : eq(usersTable.role, "student");

    const students = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        fullName: usersTable.fullName,
        careerTrack: usersTable.careerTrack,
        selectedTrackId: usersTable.selectedTrackId,
        onboardingStep: usersTable.onboardingStep,
        isActive: usersTable.isActive,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(where)
      .orderBy(desc(usersTable.createdAt))
      .limit(100);

    res.json({
      students: students.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
      })),
    });
  },
);

// PATCH /admin/students/:id/track — change a student's permanent career track
router.patch(
  "/admin/students/:id/track",
  requireAuth,
  requireRole("admin"),
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }

    const studentId = parseInt(String(req.params.id), 10);
    if (isNaN(studentId)) { res.status(400).json({ error: "Invalid student id" }); return; }

    const newTrack = req.body?.careerTrack;
    if (!isCareerTrack(newTrack)) {
      res.status(400).json({ error: "careerTrack must be one of: soc, vapt, grc" });
      return;
    }

    const student = await db.query.usersTable.findFirst({ where: eq(usersTable.id, studentId) });
    if (!student) { res.status(404).json({ error: "Student not found" }); return; }
    if (student.role !== "student") {
      res.status(400).json({ error: "Only student accounts can have their track changed" });
      return;
    }

    const toAdminStudent = (u: typeof student) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      careerTrack: u.careerTrack,
      selectedTrackId: u.selectedTrackId,
      onboardingStep: u.onboardingStep,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
    });

    const previousTrack = student.careerTrack ?? null;
    if (previousTrack === newTrack) {
      res.status(200).json({ student: toAdminStudent(student), previousTrack });
      return;
    }

    // Keep selectedTrackId (used by existing FK joins) consistent with the new domain.
    const matchingTrack = await db.query.tracksTable.findFirst({
      where: eq(tracksTable.domain, newTrack),
    });

    const [updated] = await db
      .update(usersTable)
      .set({
        careerTrack: newTrack,
        ...(matchingTrack ? { selectedTrackId: matchingTrack.id } : {}),
      })
      .where(eq(usersTable.id, studentId))
      .returning();

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.student.track_changed",
      entityType: "user",
      entityId: studentId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: {
        previousTrack,
        newTrack,
        changedBy: req.user.userId,
      },
    });

    res.json({
      student: toAdminStudent(updated),
      previousTrack,
    });
  },
);

export default router;
