import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { careerTrackEnum } from "./users";

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────
export const batchStatusEnum = pgEnum("batch_status", [
  "upcoming",
  "active",
  "completed",
  "archived",
]);

export const mentorTaskTypeEnum = pgEnum("mentor_task_type", [
  "assessment",
  "resource",
  "assignment",
  "declaration",
]);

export const mentorTaskStatusEnum = pgEnum("mentor_task_status", [
  "draft",
  "scheduled",
  "published",
  "archived",
]);

export const mentorTaskAudienceEnum = pgEnum("mentor_task_audience", [
  "all_students",
  "trial_students",
  "all_batches",
  "specific_batches",
  "future_batches",
]);

export const mentorTaskAssignmentStatusEnum = pgEnum(
  "mentor_task_assignment_status",
  ["assigned", "in_progress", "completed", "missed"]
);

// ─────────────────────────────────────────────────────────────────────────────
// Batches (cohorts) — created & assigned by admins, taught by a mentor
// ─────────────────────────────────────────────────────────────────────────────
export const batchesTable = pgTable("batches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code"),
  careerTrack: careerTrackEnum("career_track").notNull(),
  mentorId: integer("mentor_id"),
  status: batchStatusEnum("status").notNull().default("upcoming"),
  description: text("description"),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Students belonging to a batch.
export const batchStudentsTable = pgTable(
  "batch_students",
  {
    id: serial("id").primaryKey(),
    batchId: integer("batch_id").notNull(),
    studentId: integer("student_id").notNull(),
    assignedBy: integer("assigned_by"),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniqBatchStudent: uniqueIndex("uniq_batch_student").on(
      t.batchId,
      t.studentId
    ),
  })
);

// Direct mentor↔student assignments (source of truth for "assigned students").
export const mentorStudentsTable = pgTable(
  "mentor_students",
  {
    id: serial("id").primaryKey(),
    mentorId: integer("mentor_id").notNull(),
    studentId: integer("student_id").notNull(),
    batchId: integer("batch_id"),
    isTrial: boolean("is_trial").notNull().default(false),
    assignedBy: integer("assigned_by"),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniqMentorStudent: uniqueIndex("uniq_mentor_student").on(
      t.mentorId,
      t.studentId
    ),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// Task Builder
// ─────────────────────────────────────────────────────────────────────────────
export const mentorTasksTable = pgTable("mentor_tasks", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull(),
  type: mentorTaskTypeEnum("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  // resource link, or a free-form body for declarations
  contentUrl: text("content_url"),
  // optional link to an existing assessment / assignment / declaration row
  refId: integer("ref_id"),
  careerTrack: careerTrackEnum("career_track").notNull(),
  status: mentorTaskStatusEnum("status").notNull().default("draft"),
  audience: mentorTaskAudienceEnum("audience").notNull().default("all_students"),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Specific batches a task targets (when audience = specific_batches).
export const mentorTaskBatchesTable = pgTable(
  "mentor_task_batches",
  {
    id: serial("id").primaryKey(),
    taskId: integer("task_id").notNull(),
    batchId: integer("batch_id").notNull(),
  },
  (t) => ({
    uniqTaskBatch: uniqueIndex("uniq_task_batch").on(t.taskId, t.batchId),
  })
);

// Per-student task assignment + completion state (drives missed-task at-risk signal).
export const mentorTaskAssignmentsTable = pgTable(
  "mentor_task_assignments",
  {
    id: serial("id").primaryKey(),
    taskId: integer("task_id").notNull(),
    studentId: integer("student_id").notNull(),
    status: mentorTaskAssignmentStatusEnum("status")
      .notNull()
      .default("assigned"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniqTaskStudent: uniqueIndex("uniq_task_student").on(
      t.taskId,
      t.studentId
    ),
  })
);

export type Batch = typeof batchesTable.$inferSelect;
export type BatchStudent = typeof batchStudentsTable.$inferSelect;
export type MentorStudent = typeof mentorStudentsTable.$inferSelect;
export type MentorTask = typeof mentorTasksTable.$inferSelect;
export type MentorTaskBatch = typeof mentorTaskBatchesTable.$inferSelect;
export type MentorTaskAssignment =
  typeof mentorTaskAssignmentsTable.$inferSelect;
