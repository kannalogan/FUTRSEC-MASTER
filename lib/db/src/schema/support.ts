import {
  pgTable,
  serial,
  integer,
  text,
  uuid,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const TICKET_CATEGORIES = [
  "technical",
  "billing",
  "account",
  "content",
  "placement",
  "other",
] as const;
export const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const TICKET_STATUSES = [
  "open",
  "in_progress",
  "pending",
  "resolved",
  "closed",
] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export type TicketStatus = (typeof TICKET_STATUSES)[number];

// Attachment metadata: real, user-provided file links (name + url).
export type TicketAttachment = { name: string; url: string };

export const supportTicketsTable = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  // Public UUID used in URLs / API; DB serial id stays internal.
  ticketUid: uuid("ticket_uid").notNull().defaultRandom().unique(),
  category: text("category").notNull().default("other"),
  priority: text("priority").notNull().default("medium"),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"),
  attachments: jsonb("attachments")
    .$type<TicketAttachment[]>()
    .notNull()
    .default([]),
  createdBy: integer("created_by")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  assignedTo: integer("assigned_to").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

export const supportTicketRepliesTable = pgTable("support_ticket_replies", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id")
    .notNull()
    .references(() => supportTicketsTable.id, { onDelete: "cascade" }),
  authorId: integer("author_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  attachments: jsonb("attachments")
    .$type<TicketAttachment[]>()
    .notNull()
    .default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

const attachmentSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url().max(2000),
});

export const insertSupportTicketSchema = createInsertSchema(supportTicketsTable, {
  category: z.enum(TICKET_CATEGORIES),
  priority: z.enum(TICKET_PRIORITIES),
  subject: z.string().min(3).max(200),
  description: z.string().min(5).max(5000),
  attachments: z.array(attachmentSchema).max(10).optional(),
}).omit({
  id: true,
  ticketUid: true,
  status: true,
  createdBy: true,
  assignedTo: true,
  createdAt: true,
  updatedAt: true,
  closedAt: true,
});

export const insertSupportTicketReplySchema = createInsertSchema(
  supportTicketRepliesTable,
  {
    message: z.string().min(1).max(5000),
    attachments: z.array(attachmentSchema).max(10).optional(),
  },
).omit({
  id: true,
  ticketId: true,
  authorId: true,
  createdAt: true,
});

export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type InsertSupportTicketReply = z.infer<
  typeof insertSupportTicketReplySchema
>;
export type SupportTicket = typeof supportTicketsTable.$inferSelect;
export type SupportTicketReply = typeof supportTicketRepliesTable.$inferSelect;
