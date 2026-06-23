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
  category: text("category"),
  difficulty: difficultyEnum("difficulty").notNull().default("beginner"),
  thumbnailUrl: text("thumbnail_url"),
  xpReward: integer("xp_reward").notNull().default(100),
  estimatedMinutes: integer("estimated_minutes").notNull().default(60),
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
  // Authoring metadata. provider drives playback: youtube/vimeo render as an
  // embed iframe, everything else (bunny/s3/url) plays in a native <video> tag.
  // Null provider is derived from the URL host at read time (backward compat).
  title: text("title"),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  provider: text("provider"),
  transcript: text("transcript"),
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
  // Provenance: when quiz questions were copied from an assessment or the
  // question bank, sourceType records the origin. Questions are always
  // snapshotted into lesson_quiz_questions so playback/grading stay stable.
  sourceType: text("source_type"),
  sourceAssessmentId: integer("source_assessment_id"),
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

export const lessonResourcesTable = pgTable("lesson_resources", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  type: text("type").notNull().default("link"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const lessonVideoProgressTable = pgTable("lesson_video_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  lessonId: integer("lesson_id").notNull(),
  positionSeconds: integer("position_seconds").notNull().default(0),
  watchedPercent: integer("watched_percent").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const userLessonNotesTable = pgTable("user_lesson_notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  lessonId: integer("lesson_id").notNull(),
  content: text("content").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const quizQuestionTypeEnum = pgEnum("quiz_question_type", [
  "mcq",
  "multi_select",
  "true_false",
  "scenario",
]);

export const lessonQuizQuestionsTable = pgTable("lesson_quiz_questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull(),
  question: text("question").notNull(),
  type: quizQuestionTypeEnum("type").notNull().default("mcq"),
  options: text("options").array().notNull().default([]),
  correctAnswers: integer("correct_answers").array().notNull().default([]),
  explanation: text("explanation"),
  points: integer("points").notNull().default(10),
  order: integer("order").notNull().default(0),
});

export const quizAttemptsTable = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  quizId: integer("quiz_id").notNull(),
  lessonId: integer("lesson_id").notNull(),
  score: integer("score").notNull().default(0),
  maxScore: integer("max_score").notNull().default(0),
  passed: boolean("passed").notNull().default(false),
  timeSpentSeconds: integer("time_spent_seconds").notNull().default(0),
  completedAt: timestamp("completed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const discussionPostsTable = pgTable("discussion_posts", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").notNull(),
  userId: integer("user_id").notNull(),
  body: text("body").notNull(),
  isPinned: boolean("is_pinned").notNull().default(false),
  isSolved: boolean("is_solved").notNull().default(false),
  likeCount: integer("like_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const discussionCommentsTable = pgTable("discussion_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  userId: integer("user_id").notNull(),
  body: text("body").notNull(),
  isAcceptedAnswer: boolean("is_accepted_answer").notNull().default(false),
  likeCount: integer("like_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const discussionLikesTable = pgTable("discussion_likes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  postId: integer("post_id"),
  commentId: integer("comment_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
export type LessonResource = typeof lessonResourcesTable.$inferSelect;
export type LessonVideoProgress = typeof lessonVideoProgressTable.$inferSelect;
export type UserLessonNote = typeof userLessonNotesTable.$inferSelect;
export type LessonQuizQuestion = typeof lessonQuizQuestionsTable.$inferSelect;
export type QuizAttempt = typeof quizAttemptsTable.$inferSelect;
export type DiscussionPost = typeof discussionPostsTable.$inferSelect;
export type DiscussionComment = typeof discussionCommentsTable.$inferSelect;
export type DiscussionLike = typeof discussionLikesTable.$inferSelect;
