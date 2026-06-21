import { Router } from "express";
import { eq, and, desc, count } from "drizzle-orm";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();

// ── GET /notifications?type= ────────────────────────────────────────────────
// Own notifications, newest first (excluding archived), with unreadCount.
router.get(
  "/notifications",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const userId = req.user.userId;
    const typeFilter =
      typeof req.query["type"] === "string" && req.query["type"].trim()
        ? req.query["type"].trim()
        : null;

    const conds = [
      eq(notificationsTable.userId, userId),
      eq(notificationsTable.isArchived, false),
    ];
    if (typeFilter) conds.push(eq(notificationsTable.type, typeFilter));

    const notifications = await db
      .select()
      .from(notificationsTable)
      .where(and(...conds))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(100);

    const [unread] = await db
      .select({ value: count() })
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId, userId),
          eq(notificationsTable.isArchived, false),
          eq(notificationsTable.isRead, false)
        )
      );

    res.json({
      notifications,
      unreadCount: Number(unread?.value ?? 0),
    });
  }
);

// ── POST /notifications/:id/read ────────────────────────────────────────────
router.post(
  "/notifications/:id/read",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid notification id" });
      return;
    }
    const [updated] = await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(
        and(
          eq(notificationsTable.id, id),
          eq(notificationsTable.userId, req.user.userId)
        )
      )
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }
    res.json(updated);
  }
);

// ── POST /notifications/read-all ────────────────────────────────────────────
router.post(
  "/notifications/read-all",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(
        and(
          eq(notificationsTable.userId, req.user.userId),
          eq(notificationsTable.isRead, false)
        )
      );
    res.json({ success: true });
  }
);

// ── POST /notifications/:id/archive ─────────────────────────────────────────
router.post(
  "/notifications/:id/archive",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid notification id" });
      return;
    }
    const [updated] = await db
      .update(notificationsTable)
      .set({ isArchived: true })
      .where(
        and(
          eq(notificationsTable.id, id),
          eq(notificationsTable.userId, req.user.userId)
        )
      )
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }
    res.json(updated);
  }
);

export default router;
