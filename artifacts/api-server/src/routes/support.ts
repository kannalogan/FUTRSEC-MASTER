import { Router } from "express";
import { eq, and, or, desc, ilike, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@workspace/db";
import {
  supportTicketsTable,
  supportTicketRepliesTable,
  usersTable,
  insertSupportTicketSchema,
  insertSupportTicketReplySchema,
  TICKET_STATUSES,
  type SupportTicket,
  type SupportTicketReply,
} from "@workspace/db";
import { z } from "zod/v4";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";
import { createNotification } from "../lib/notifications";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────
function serializeTicket(t: SupportTicket) {
  return {
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    closedAt: t.closedAt?.toISOString() ?? null,
  };
}

function serializeReply(r: SupportTicketReply, authorName: string | null) {
  return {
    ...r,
    authorName,
    createdAt: r.createdAt.toISOString(),
  };
}

async function getAdminIds(): Promise<number[]> {
  const admins = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.role, "admin"));
  return admins.map((a) => a.id);
}

function canAccessTicket(ticket: SupportTicket, userId: number, role: string): boolean {
  return (
    role === "admin" ||
    ticket.createdBy === userId ||
    ticket.assignedTo === userId
  );
}

// ── POST /support/tickets — create (any authenticated role) ────────────────────
router.post(
  "/tickets",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    const parsed = insertSupportTicketSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid ticket data", details: parsed.error.issues });
      return;
    }
    const b = parsed.data;
    const [ticket] = await db
      .insert(supportTicketsTable)
      .values({
        category: b.category,
        priority: b.priority,
        subject: b.subject,
        description: b.description,
        attachments: b.attachments ?? [],
        createdBy: req.user!.userId,
        status: "open",
      })
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "support.ticket.create",
      entityType: "support_ticket",
      entityId: ticket.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { subject: ticket.subject, category: ticket.category, priority: ticket.priority },
    });

    const adminIds = await getAdminIds();
    for (const adminId of adminIds) {
      await createNotification({
        userId: adminId,
        role: "admin",
        title: "New support ticket",
        message: `${ticket.subject} (${ticket.priority} priority)`,
        type: "system",
        entityType: "support_ticket",
        entityId: ticket.id,
        link: `/admin/support`,
      });
    }

    req.log.info({ ticketId: ticket.id }, "Support ticket created");
    res.status(201).json({ ticket: serializeTicket(ticket) });
  }
);

// ── GET /support/tickets — list ────────────────────────────────────────────────
router.get(
  "/tickets",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    const creator = alias(usersTable, "creator");
    const assignee = alias(usersTable, "assignee");
    const userId = req.user!.userId;
    const isAdmin = req.user!.role === "admin";

    const conditions = [];
    if (!isAdmin) {
      conditions.push(
        or(
          eq(supportTicketsTable.createdBy, userId),
          eq(supportTicketsTable.assignedTo, userId)
        )
      );
    } else {
      const { status, priority, category, assignedTo, q } = req.query;
      if (typeof status === "string" && status)
        conditions.push(eq(supportTicketsTable.status, status));
      if (typeof priority === "string" && priority)
        conditions.push(eq(supportTicketsTable.priority, priority));
      if (typeof category === "string" && category)
        conditions.push(eq(supportTicketsTable.category, category));
      if (typeof assignedTo === "string" && assignedTo) {
        const assignedId = parseInt(assignedTo, 10);
        if (!Number.isNaN(assignedId))
          conditions.push(eq(supportTicketsTable.assignedTo, assignedId));
      }
      if (typeof q === "string" && q.trim())
        conditions.push(ilike(supportTicketsTable.subject, `%${q.trim()}%`));
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const rows = await db
      .select({
        ticket: supportTicketsTable,
        createdByName: creator.fullName,
        createdByEmail: creator.email,
        assignedToName: assignee.fullName,
      })
      .from(supportTicketsTable)
      .leftJoin(creator, eq(creator.id, supportTicketsTable.createdBy))
      .leftJoin(assignee, eq(assignee.id, supportTicketsTable.assignedTo))
      .where(where)
      .orderBy(desc(supportTicketsTable.updatedAt));

    const ticketIds = rows.map((r) => r.ticket.id);
    const replyCounts = ticketIds.length
      ? await db
          .select({
            ticketId: supportTicketRepliesTable.ticketId,
            count: sql<number>`count(*)::int`,
          })
          .from(supportTicketRepliesTable)
          .where(inArray(supportTicketRepliesTable.ticketId, ticketIds))
          .groupBy(supportTicketRepliesTable.ticketId)
      : [];
    const countMap = new Map(replyCounts.map((r) => [r.ticketId, r.count]));

    res.json({
      tickets: rows.map((r) => ({
        ...serializeTicket(r.ticket),
        createdByName: r.createdByName,
        createdByEmail: r.createdByEmail,
        assignedToName: r.assignedToName,
        replyCount: countMap.get(r.ticket.id) ?? 0,
      })),
    });
  }
);

// ── GET /support/tickets/stats/summary — admin only ────────────────────────────
router.get(
  "/tickets/stats/summary",
  requireAuth,
  requireRole("admin"),
  async (_req: AuthRequest, res): Promise<void> => {
    const [byStatus, byPriority, byCategory, totalsRows] = await Promise.all([
      db
        .select({
          status: supportTicketsTable.status,
          count: sql<number>`count(*)::int`,
        })
        .from(supportTicketsTable)
        .groupBy(supportTicketsTable.status),
      db
        .select({
          priority: supportTicketsTable.priority,
          count: sql<number>`count(*)::int`,
        })
        .from(supportTicketsTable)
        .groupBy(supportTicketsTable.priority),
      db
        .select({
          category: supportTicketsTable.category,
          count: sql<number>`count(*)::int`,
        })
        .from(supportTicketsTable)
        .groupBy(supportTicketsTable.category),
      db
        .select({
          total: sql<number>`count(*)::int`,
          open: sql<number>`(count(*) filter (where ${supportTicketsTable.status} = 'open'))::int`,
          resolved: sql<number>`(count(*) filter (where ${supportTicketsTable.status} in ('resolved','closed')))::int`,
          avgResolutionHours: sql<
            number | null
          >`avg(extract(epoch from (${supportTicketsTable.closedAt} - ${supportTicketsTable.createdAt})) / 3600.0) filter (where ${supportTicketsTable.closedAt} is not null)`,
        })
        .from(supportTicketsTable),
    ]);

    const totals = totalsRows[0] ?? {
      total: 0,
      open: 0,
      resolved: 0,
      avgResolutionHours: null,
    };

    res.json({
      total: totals.total,
      open: totals.open,
      resolved: totals.resolved,
      avgResolutionHours:
        totals.avgResolutionHours != null
          ? Math.round(Number(totals.avgResolutionHours) * 10) / 10
          : null,
      byStatus: byStatus.map((r) => ({ status: r.status, count: r.count })),
      byPriority: byPriority.map((r) => ({ priority: r.priority, count: r.count })),
      byCategory: byCategory.map((r) => ({ category: r.category, count: r.count })),
    });
  }
);

// ── GET /support/tickets/:uid — detail + replies ──────────────────────────────
router.get(
  "/tickets/:uid",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    const ticket = await db.query.supportTicketsTable.findFirst({
      where: eq(supportTicketsTable.ticketUid, String(req.params.uid)),
    });
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }
    if (!canAccessTicket(ticket, req.user!.userId, req.user!.role)) {
      res.status(403).json({ error: "You do not have access to this ticket" });
      return;
    }

    const creator = alias(usersTable, "creator");
    const assignee = alias(usersTable, "assignee");
    const [enriched] = await db
      .select({
        createdByName: creator.fullName,
        createdByEmail: creator.email,
        assignedToName: assignee.fullName,
      })
      .from(supportTicketsTable)
      .leftJoin(creator, eq(creator.id, supportTicketsTable.createdBy))
      .leftJoin(assignee, eq(assignee.id, supportTicketsTable.assignedTo))
      .where(eq(supportTicketsTable.id, ticket.id));

    const author = alias(usersTable, "author");
    const replyRows = await db
      .select({
        reply: supportTicketRepliesTable,
        authorName: author.fullName,
      })
      .from(supportTicketRepliesTable)
      .leftJoin(author, eq(author.id, supportTicketRepliesTable.authorId))
      .where(eq(supportTicketRepliesTable.ticketId, ticket.id))
      .orderBy(supportTicketRepliesTable.createdAt);

    res.json({
      ticket: {
        ...serializeTicket(ticket),
        createdByName: enriched?.createdByName ?? null,
        createdByEmail: enriched?.createdByEmail ?? null,
        assignedToName: enriched?.assignedToName ?? null,
      },
      replies: replyRows.map((r) => serializeReply(r.reply, r.authorName)),
    });
  }
);

// ── POST /support/tickets/:uid/replies — add reply ────────────────────────────
router.post(
  "/tickets/:uid/replies",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    const ticket = await db.query.supportTicketsTable.findFirst({
      where: eq(supportTicketsTable.ticketUid, String(req.params.uid)),
    });
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }
    if (!canAccessTicket(ticket, req.user!.userId, req.user!.role)) {
      res.status(403).json({ error: "You do not have access to this ticket" });
      return;
    }

    const parsed = insertSupportTicketReplySchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid reply data", details: parsed.error.issues });
      return;
    }
    const b = parsed.data;
    const authorId = req.user!.userId;

    const [reply] = await db
      .insert(supportTicketRepliesTable)
      .values({
        ticketId: ticket.id,
        authorId,
        message: b.message,
        attachments: b.attachments ?? [],
      })
      .returning();

    await db
      .update(supportTicketsTable)
      .set({ updatedAt: new Date() })
      .where(eq(supportTicketsTable.id, ticket.id));

    await createAuditLog({
      userId: authorId,
      action: "support.ticket.reply",
      entityType: "support_ticket",
      entityId: ticket.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { replyId: reply.id },
    });

    // Notify the OTHER party.
    const recipients = new Set<number>();
    if (authorId === ticket.createdBy) {
      if (ticket.assignedTo) recipients.add(ticket.assignedTo);
      for (const adminId of await getAdminIds()) recipients.add(adminId);
    } else {
      recipients.add(ticket.createdBy);
    }
    recipients.delete(authorId);

    for (const userId of recipients) {
      await createNotification({
        userId,
        title: "New reply on support ticket",
        message: `${ticket.subject}`,
        type: "system",
        entityType: "support_ticket",
        entityId: ticket.id,
        link: `/support/${ticket.ticketUid}`,
      });
    }

    req.log.info({ ticketId: ticket.id, replyId: reply.id }, "Support reply added");
    const author = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, authorId),
    });
    res.status(201).json({ reply: serializeReply(reply, author?.fullName ?? null) });
  }
);

// ── PATCH /support/tickets/:uid/status — admin or assignee ─────────────────────
const statusSchema = z.object({ status: z.enum(TICKET_STATUSES) });

router.patch(
  "/tickets/:uid/status",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    const ticket = await db.query.supportTicketsTable.findFirst({
      where: eq(supportTicketsTable.ticketUid, String(req.params.uid)),
    });
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }
    const isAdmin = req.user!.role === "admin";
    const isAssignee = ticket.assignedTo === req.user!.userId;
    if (!isAdmin && !isAssignee) {
      res.status(403).json({ error: "Only an admin or the assignee may change status" });
      return;
    }

    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid status", details: parsed.error.issues });
      return;
    }
    const { status } = parsed.data;
    const isClosing = status === "resolved" || status === "closed";

    const [updated] = await db
      .update(supportTicketsTable)
      .set({
        status,
        closedAt: isClosing ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(supportTicketsTable.id, ticket.id))
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "support.ticket.status",
      entityType: "support_ticket",
      entityId: ticket.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { from: ticket.status, to: status },
    });

    if (ticket.createdBy !== req.user!.userId) {
      await createNotification({
        userId: ticket.createdBy,
        title: "Support ticket updated",
        message: `"${ticket.subject}" is now ${status.replace("_", " ")}`,
        type: "system",
        entityType: "support_ticket",
        entityId: ticket.id,
        link: `/support/${ticket.ticketUid}`,
      });
    }

    req.log.info({ ticketId: ticket.id, status }, "Support ticket status changed");
    res.json({ ticket: serializeTicket(updated) });
  }
);

// ── PATCH /support/tickets/:uid/assign — admin only ────────────────────────────
const assignSchema = z.object({ assignedTo: z.number().int().nullable() });

router.patch(
  "/tickets/:uid/assign",
  requireAuth,
  requireRole("admin"),
  async (req: AuthRequest, res): Promise<void> => {
    const ticket = await db.query.supportTicketsTable.findFirst({
      where: eq(supportTicketsTable.ticketUid, String(req.params.uid)),
    });
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    const parsed = assignSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid assignment", details: parsed.error.issues });
      return;
    }
    const { assignedTo } = parsed.data;

    if (assignedTo !== null) {
      const assignee = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, assignedTo),
      });
      if (!assignee || (assignee.role !== "admin" && assignee.role !== "mentor")) {
        res
          .status(400)
          .json({ error: "Assignee must be an existing admin or mentor" });
        return;
      }
    }

    const nextStatus =
      assignedTo !== null && ticket.status === "open"
        ? "in_progress"
        : ticket.status;

    const [updated] = await db
      .update(supportTicketsTable)
      .set({ assignedTo, status: nextStatus, updatedAt: new Date() })
      .where(eq(supportTicketsTable.id, ticket.id))
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "support.ticket.assign",
      entityType: "support_ticket",
      entityId: ticket.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { assignedTo },
    });

    if (assignedTo !== null && assignedTo !== req.user!.userId) {
      await createNotification({
        userId: assignedTo,
        title: "Support ticket assigned to you",
        message: `${ticket.subject} (${ticket.priority} priority)`,
        type: "system",
        entityType: "support_ticket",
        entityId: ticket.id,
        link: `/support/${ticket.ticketUid}`,
      });
    }

    req.log.info({ ticketId: ticket.id, assignedTo }, "Support ticket assigned");
    res.json({ ticket: serializeTicket(updated) });
  }
);

// ── GET /support/assignees — admin only: candidate assignees ──────────────────
router.get(
  "/assignees",
  requireAuth,
  requireRole("admin"),
  async (_req: AuthRequest, res): Promise<void> => {
    const rows = await db
      .select({
        id: usersTable.id,
        fullName: usersTable.fullName,
        email: usersTable.email,
        role: usersTable.role,
      })
      .from(usersTable)
      .where(inArray(usersTable.role, ["admin", "mentor"]))
      .orderBy(usersTable.fullName);
    res.json({ assignees: rows });
  }
);

export default router;
