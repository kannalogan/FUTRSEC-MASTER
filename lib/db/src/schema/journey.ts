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
// Day-Based Journey Engine
//
// A Journey is a track-scoped, ordered sequence of Days. Each Day has an integer
// `offset` (0-based: Day 1 = offset 0) and contains ordered Items. A Day unlocks
// for a student when `offset <= daysSinceStart`, where daysSinceStart is derived
// from the student's enrollment anchor (student_journeys.startedAt). There are no
// calendar dates — unlocking is purely offset-based.
// ─────────────────────────────────────────────────────────────────────────────

export const journeyStatusEnum = pgEnum("journey_status", [
  "draft",
  "published",
  "archived",
]);

// Item kinds a journey day can contain. refId points at the underlying entity
// (see route validation): course→learning_modules, assessment→assessments,
// lab→labs, assignment/resource/declaration→mentor_tasks (of matching type),
// mock_interview→mock_interview template, certificate→certificate_templates,
// mentor_review→no ref (manual checkpoint).
export const journeyItemTypeEnum = pgEnum("journey_item_type", [
  "course",
  "assessment",
  "lab",
  "assignment",
  "resource",
  "declaration",
  "mentor_review",
  "mock_interview",
  "certificate",
]);

export const studentJourneyStatusEnum = pgEnum("student_journey_status", [
  "active",
  "completed",
  "paused",
]);

// Per-item completion state for a student. Day-level locking is enforced by
// offset at read time; this enum only tracks an item's completion lifecycle.
export const studentJourneyItemStatusEnum = pgEnum(
  "student_journey_item_status",
  ["in_progress", "completed"]
);

export const studentJourneyDayStatusEnum = pgEnum("student_journey_day_status", [
  "unlocked",
  "completed",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Authoring entities (admin + mentor)
// ─────────────────────────────────────────────────────────────────────────────
export const journeysTable = pgTable("journeys", {
  id: serial("id").primaryKey(),
  careerTrack: careerTrackEnum("career_track").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: journeyStatusEnum("status").notNull().default("draft"),
  totalDays: integer("total_days").notNull().default(0),
  createdBy: integer("created_by"),
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

export const journeyDaysTable = pgTable(
  "journey_days",
  {
    id: serial("id").primaryKey(),
    journeyId: integer("journey_id").notNull(),
    // 0-based day offset. Day 1 = offset 0 (unlocks on enrollment).
    offset: integer("offset").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    uniqJourneyOffset: uniqueIndex("uniq_journey_day_offset").on(
      t.journeyId,
      t.offset
    ),
  })
);

export const journeyDayItemsTable = pgTable("journey_day_items", {
  id: serial("id").primaryKey(),
  dayId: integer("day_id").notNull(),
  // Denormalized for efficient journey-wide progress queries.
  journeyId: integer("journey_id").notNull(),
  type: journeyItemTypeEnum("type").notNull(),
  // Underlying entity id (null for mentor_review checkpoints).
  refId: integer("ref_id"),
  title: text("title").notNull(),
  description: text("description"),
  order: integer("order").notNull().default(0),
  isRequired: boolean("is_required").notNull().default(true),
  xpReward: integer("xp_reward").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ─────────────────────────────────────────────────────────────────────────────
// Student progress entities
// ─────────────────────────────────────────────────────────────────────────────

// Enrollment + offset anchor. startedAt drives day unlocking.
export const studentJourneysTable = pgTable(
  "student_journeys",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id").notNull(),
    journeyId: integer("journey_id").notNull(),
    status: studentJourneyStatusEnum("status").notNull().default("active"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    uniqStudentJourney: uniqueIndex("uniq_student_journey").on(
      t.studentId,
      t.journeyId
    ),
  })
);

// Per-item completion (the granular source of truth).
export const studentJourneyProgressTable = pgTable(
  "student_journey_progress",
  {
    id: serial("id").primaryKey(),
    studentJourneyId: integer("student_journey_id").notNull(),
    itemId: integer("item_id").notNull(),
    // Denormalized for per-student rollups without a join.
    studentId: integer("student_id").notNull(),
    status: studentJourneyItemStatusEnum("status")
      .notNull()
      .default("completed"),
    xpEarned: integer("xp_earned").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    uniqStudentJourneyItem: uniqueIndex("uniq_student_journey_item").on(
      t.studentJourneyId,
      t.itemId
    ),
  })
);

// Per-day rollup (a day is completed when all its required items are done).
export const studentJourneyDaysTable = pgTable(
  "student_journey_days",
  {
    id: serial("id").primaryKey(),
    studentJourneyId: integer("student_journey_id").notNull(),
    dayId: integer("day_id").notNull(),
    studentId: integer("student_id").notNull(),
    status: studentJourneyDayStatusEnum("status").notNull().default("unlocked"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    uniqStudentJourneyDay: uniqueIndex("uniq_student_journey_day").on(
      t.studentJourneyId,
      t.dayId
    ),
  })
);

export type Journey = typeof journeysTable.$inferSelect;
export type JourneyDay = typeof journeyDaysTable.$inferSelect;
export type JourneyDayItem = typeof journeyDayItemsTable.$inferSelect;
export type StudentJourney = typeof studentJourneysTable.$inferSelect;
export type StudentJourneyProgress =
  typeof studentJourneyProgressTable.$inferSelect;
export type StudentJourneyDay = typeof studentJourneyDaysTable.$inferSelect;
