import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { ftsScoresTable } from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import {
  FTS_POINTS,
  FTS_UNLOCKS,
  getUnlocks,
  recomputeFts,
} from "../lib/fts";

const router = Router();

const adminGuards = [requireAuth, requireRole("admin")];

function parseId(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return parseInt(value ?? "", 10);
}

router.get(
  "/admin/fts/config",
  ...adminGuards,
  async (_req: AuthRequest, res): Promise<void> => {
    res.json({ points: FTS_POINTS, unlocks: FTS_UNLOCKS });
    return;
  },
);

router.post(
  "/admin/fts/recompute/:userId",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const userId = parseId(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      res.status(400).json({ error: "Invalid userId" });
      return;
    }
    const result = await recomputeFts(userId);
    req.log.info({ userId, total: result.total }, "Recomputed FTS score");
    res.json({
      userId,
      total: result.total,
      breakdown: result.breakdown,
      unlocks: getUnlocks(result.total),
    });
    return;
  },
);

router.get(
  "/admin/fts/:userId",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const userId = parseId(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      res.status(400).json({ error: "Invalid userId" });
      return;
    }
    const [score] = await db
      .select()
      .from(ftsScoresTable)
      .where(eq(ftsScoresTable.userId, userId))
      .limit(1);
    if (!score) {
      res.status(404).json({ error: "FTS score not found for user" });
      return;
    }
    res.json({ score, unlocks: getUnlocks(score.totalScore) });
    return;
  },
);

export default router;
