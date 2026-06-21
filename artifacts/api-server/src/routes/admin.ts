import { Router } from "express";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";

const router = Router();

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

// PATCH /admin/students/:id/track — NEUTRALIZED (Part 6).
// A student's career track is IMMUTABLE. Track switching is intentionally
// disabled platform-wide; this endpoint now always rejects with 403.
router.patch(
  "/admin/students/:id/track",
  requireAuth,
  requireRole("admin"),
  async (_req: AuthRequest, res): Promise<void> => {
    res.status(403).json({
      error: "Student track is immutable",
      code: "TRACK_IMMUTABLE",
    });
  },
);

export default router;
