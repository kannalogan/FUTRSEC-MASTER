import { Router } from "express";
import { count, eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable, tracksTable, labsTable, jobsTable } from "@workspace/db";

const router = Router();

let cachedStats: {
  data: object;
  expiresAt: number;
} | null = null;

const CACHE_TTL_MS = 5 * 60 * 1000;

router.get("/platform/stats", async (_req, res): Promise<void> => {
  if (cachedStats && cachedStats.expiresAt > Date.now()) {
    res.json(cachedStats.data);
    return;
  }

  const [
    [studentCount],
    [mentorCount],
    [trackCount],
    [labCount],
    [jobCount],
  ] = await Promise.all([
    db.select({ value: count() }).from(usersTable).where(eq(usersTable.role, "student")),
    db.select({ value: count() }).from(usersTable).where(eq(usersTable.role, "mentor")),
    db.select({ value: count() }).from(tracksTable).where(eq(tracksTable.isActive, true)),
    db.select({ value: count() }).from(labsTable).where(eq(labsTable.isActive, true)),
    db.select({ value: count() }).from(jobsTable).where(eq(jobsTable.status, "active")),
  ]);

  const stats = {
    totalStudents: studentCount.value,
    totalMentors: mentorCount.value,
    totalTracks: trackCount.value,
    totalLabs: labCount.value,
    totalJobs: jobCount.value,
    averageRating: 4.8,
    placementRate: 78,
  };

  cachedStats = { data: stats, expiresAt: Date.now() + CACHE_TTL_MS };
  res.json(stats);
});

export default router;
