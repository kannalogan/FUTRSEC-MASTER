import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { tracksTable, usersTable } from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";

const router = Router();

const adminGuards = [requireAuth, requireRole("admin")] as const;

const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;

const updateTrackSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  description: z.string().min(1).max(4000).optional(),
  isActive: z.boolean().optional(),
  accentColor: z.string().min(1).max(40).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  durationWeeks: z.number().int().min(1).max(104).optional(),
});

// GET /admin/tracks — list all tracks with enrolled student counts.
// NOTE: This manages TRACK CONFIG only. There is intentionally no endpoint
// that changes a student's career track — student tracks are immutable.
router.get(
  "/admin/tracks",
  ...adminGuards,
  async (_req: AuthRequest, res): Promise<void> => {
    const tracks = await db.select().from(tracksTable).orderBy(tracksTable.id);

    const counts = await db
      .select({
        careerTrack: usersTable.careerTrack,
        count: sql<number>`count(*)::int`,
      })
      .from(usersTable)
      .where(eq(usersTable.role, "student"))
      .groupBy(usersTable.careerTrack);

    const countMap = new Map<string, number>();
    for (const c of counts) {
      if (c.careerTrack !== null) countMap.set(c.careerTrack, c.count);
    }

    res.json({
      tracks: tracks.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        domain: t.domain,
        description: t.description,
        difficulty: t.difficulty,
        durationWeeks: t.durationWeeks,
        totalModules: t.totalModules,
        enrolledCount: t.enrolledCount,
        accentColor: t.accentColor,
        isActive: t.isActive,
        studentCount: countMap.get(t.domain) ?? 0,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
    });
  },
);

// PATCH /admin/tracks/:id — edit track configuration (NOT student assignment).
router.patch(
  "/admin/tracks/:id",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const trackId = parseInt(String(req.params.id), 10);
    if (isNaN(trackId)) {
      res.status(400).json({ error: "Invalid track id" });
      return;
    }

    const parsed = updateTrackSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }

    const existing = await db.query.tracksTable.findFirst({
      where: eq(tracksTable.id, trackId),
    });
    if (!existing) {
      res.status(404).json({ error: "Track not found" });
      return;
    }

    const [updated] = await db
      .update(tracksTable)
      .set(parsed.data)
      .where(eq(tracksTable.id, trackId))
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "admin.track.updated",
      entityType: "track",
      entityId: trackId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { changes: parsed.data },
    });

    res.json({
      track: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  },
);

export default router;
