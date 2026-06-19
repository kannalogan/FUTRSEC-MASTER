import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { tracksTable, learningModulesTable } from "@workspace/db";
import { logger } from "../lib/logger";
import type { AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/tracks", async (_req, res): Promise<void> => {
  const tracks = await db
    .select()
    .from(tracksTable)
    .where(eq(tracksTable.isActive, true))
    .orderBy(tracksTable.id);

  res.json(
    tracks.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      domain: t.domain,
      description: t.description,
      difficulty: t.difficulty,
      durationWeeks: t.durationWeeks,
      totalModules: t.totalModules,
      enrolledCount: t.enrolledCount,
      iconUrl: t.iconUrl ?? null,
      accentColor: t.accentColor,
    }))
  );
});

router.get("/tracks/:id", async (req: AuthRequest, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid track ID" });
    return;
  }

  const [track] = await db
    .select()
    .from(tracksTable)
    .where(eq(tracksTable.id, id));

  if (!track) {
    res.status(404).json({ error: "Track not found" });
    return;
  }

  const modules = await db
    .select()
    .from(learningModulesTable)
    .where(eq(learningModulesTable.trackId, id))
    .orderBy(learningModulesTable.order);

  res.json({
    id: track.id,
    name: track.name,
    slug: track.slug,
    domain: track.domain,
    description: track.description,
    difficulty: track.difficulty,
    durationWeeks: track.durationWeeks,
    accentColor: track.accentColor,
    modules: modules.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description ?? null,
      order: m.order,
      lessonCount: m.lessonCount,
    })),
  });
});

export default router;
