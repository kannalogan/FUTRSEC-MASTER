import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const domainEnum = pgEnum("domain", [
  "soc",
  "vapt",
  "grc",
  "ai_security",
  "cloud_security",
  "forensics",
]);

export const difficultyEnum = pgEnum("difficulty", [
  "beginner",
  "intermediate",
  "advanced",
]);

export const tracksTable = pgTable("tracks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  domain: domainEnum("domain").notNull(),
  description: text("description").notNull(),
  difficulty: difficultyEnum("difficulty").notNull(),
  durationWeeks: integer("duration_weeks").notNull(),
  totalModules: integer("total_modules").notNull().default(0),
  enrolledCount: integer("enrolled_count").notNull().default(0),
  iconUrl: text("icon_url"),
  accentColor: text("accent_color").notNull().default("#2563EB"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const learningModulesTable = pgTable("learning_modules", {
  id: serial("id").primaryKey(),
  trackId: integer("track_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  order: integer("order").notNull(),
  lessonCount: integer("lesson_count").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const lessonsTable = pgTable("lessons", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull(),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  order: integer("order").notNull(),
  type: text("type").notNull().default("video"),
  durationMinutes: integer("duration_minutes"),
  isPublished: boolean("is_published").notNull().default(false),
  isFree: boolean("is_free").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const lessonVideosTable = pgTable("lesson_videos", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").notNull(),
  s3Key: text("s3_key"),
  videoUrl: text("video_url"),
  durationSeconds: integer("duration_seconds"),
  resolution: text("resolution"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const lessonNotesTable = pgTable("lesson_notes", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const lessonPdfsTable = pgTable("lesson_pdfs", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").notNull(),
  title: text("title").notNull(),
  s3Key: text("s3_key").notNull(),
  fileSizeBytes: integer("file_size_bytes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const lessonQuizzesTable = pgTable("lesson_quizzes", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").notNull(),
  title: text("title").notNull(),
  passingScore: integer("passing_score").notNull().default(70),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const lessonBookmarksTable = pgTable("lesson_bookmarks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  lessonId: integer("lesson_id").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const lessonProgressTable = pgTable("lesson_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  lessonId: integer("lesson_id").notNull(),
  moduleId: integer("module_id").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  timeSpentSeconds: integer("time_spent_seconds").notNull().default(0),
});

export const moduleEnrollmentsTable = pgTable("module_enrollments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  moduleId: integer("module_id").notNull(),
  trackId: integer("track_id").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  progressPercent: integer("progress_percent").notNull().default(0),
});

export const insertTrackSchema = createInsertSchema(tracksTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTrack = z.infer<typeof insertTrackSchema>;
export type Track = typeof tracksTable.$inferSelect;
export type LearningModule = typeof learningModulesTable.$inferSelect;
export type Lesson = typeof lessonsTable.$inferSelect;
export type LessonProgress = typeof lessonProgressTable.$inferSelect;
export type ModuleEnrollment = typeof moduleEnrollmentsTable.$inferSelect;
