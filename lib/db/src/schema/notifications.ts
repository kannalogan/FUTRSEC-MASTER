import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";

// In-app + multi-channel notifications. Channel abstraction supports
// in_app/email now; whatsapp/sms/push reserved for Phase 5B (no-op for now).
export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  role: text("role"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("system"),
  channel: text("channel").notNull().default("in_app"),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  link: text("link"),
  isRead: boolean("is_read").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Delivery log for outbound emails (and, later, other channels).
export const emailLogsTable = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  body: text("body"),
  status: text("status").notNull().default("sent"),
  provider: text("provider").notNull().default("smtp"),
  error: text("error"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Notification = typeof notificationsTable.$inferSelect;
export type EmailLog = typeof emailLogsTable.$inferSelect;
