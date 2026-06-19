import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";

export const assignmentsTable = pgTable("assignments", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id"),
  trackId: integer("track_id"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }),
  maxScore: integer("max_score").notNull().default(100),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const assignmentSubmissionsTable = pgTable("assignment_submissions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull(),
  studentId: integer("student_id").notNull(),
  submissionUrl: text("submission_url"),
  content: text("content"),
  status: text("status").notNull().default("submitted"),
  score: integer("score"),
  feedback: text("feedback"),
  submittedAt: timestamp("submitted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: integer("reviewed_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const declarationsTable = pgTable("declarations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isRequired: boolean("is_required").notNull().default(false),
  version: text("version").notNull().default("1.0"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const studentDeclarationsTable = pgTable("student_declarations", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  declarationId: integer("declaration_id").notNull(),
  signedAt: timestamp("signed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const broadcastNotesTable = pgTable("broadcast_notes", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  targetRoles: text("target_roles").array().notNull().default([]),
  targetTrackIds: integer("target_track_ids").array().notNull().default([]),
  status: text("status").notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const broadcastRecipientsTable = pgTable("broadcast_recipients", {
  id: serial("id").primaryKey(),
  broadcastId: integer("broadcast_id").notNull(),
  userId: integer("user_id").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const checkpointsTable = pgTable("checkpoints", {
  id: serial("id").primaryKey(),
  trackId: integer("track_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  order: integer("order").notNull(),
  requiredScore: integer("required_score").notNull().default(70),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const checkpointProgressTable = pgTable("checkpoint_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  checkpointId: integer("checkpoint_id").notNull(),
  status: text("status").notNull().default("pending"),
  score: integer("score"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Assignment = typeof assignmentsTable.$inferSelect;
export type AssignmentSubmission = typeof assignmentSubmissionsTable.$inferSelect;
export type BroadcastNote = typeof broadcastNotesTable.$inferSelect;
export type Checkpoint = typeof checkpointsTable.$inferSelect;
