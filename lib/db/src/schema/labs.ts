import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  real,
} from "drizzle-orm/pg-core";

export const labsTable = pgTable("labs", {
  id: serial("id").primaryKey(),
  trackId: integer("track_id"),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  difficulty: text("difficulty").notNull().default("beginner"),
  type: text("type").notNull().default("ctf"),
  tags: text("tags").array().notNull().default([]),
  totalPoints: integer("total_points").notNull().default(100),
  estimatedMinutes: integer("estimated_minutes").notNull().default(60),
  dockerImage: text("docker_image"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const labModulesTable = pgTable("lab_modules", {
  id: serial("id").primaryKey(),
  labId: integer("lab_id").notNull(),
  title: text("title").notNull(),
  order: integer("order").notNull(),
  taskDescription: text("task_description").notNull(),
  hint: text("hint"),
  flagFormat: text("flag_format"),
  points: integer("points").notNull().default(10),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const labAttemptsTable = pgTable("lab_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  labId: integer("lab_id").notNull(),
  status: text("status").notNull().default("in_progress"),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  totalScore: real("total_score").notNull().default(0),
  hintsUsed: integer("hints_used").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const labReportsTable = pgTable("lab_reports", {
  id: serial("id").primaryKey(),
  attemptId: integer("attempt_id").notNull(),
  userId: integer("user_id").notNull(),
  labId: integer("lab_id").notNull(),
  reportContent: text("report_content"),
  s3Key: text("s3_key"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: integer("reviewed_by"),
  grade: text("grade"),
  feedback: text("feedback"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sandboxSessionsTable = pgTable("sandbox_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  labId: integer("lab_id"),
  sessionToken: text("session_token").notNull().unique(),
  containerName: text("container_name"),
  status: text("status").notNull().default("starting"),
  ipAddress: text("ip_address"),
  port: integer("port"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  terminatedAt: timestamp("terminated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Lab = typeof labsTable.$inferSelect;
export type LabModule = typeof labModulesTable.$inferSelect;
export type LabAttempt = typeof labAttemptsTable.$inferSelect;
export type SandboxSession = typeof sandboxSessionsTable.$inferSelect;
