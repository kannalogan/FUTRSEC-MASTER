import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  real,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const assessmentTypeEnum = pgEnum("assessment_type", [
  "pre_assessment",
  "module_quiz",
  "final_exam",
  "practice",
]);

export const questionTypeEnum = pgEnum("question_type", [
  "mcq",
  "multi_select",
  "true_false",
  "code",
]);

export const assessmentsTable = pgTable("assessments", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: assessmentTypeEnum("type").notNull(),
  trackId: integer("track_id"),
  totalQuestions: integer("total_questions").notNull().default(0),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  passingScore: integer("passing_score").notNull().default(70),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const assessmentQuestionsTable = pgTable("assessment_questions", {
  id: serial("id").primaryKey(),
  assessmentId: integer("assessment_id").notNull(),
  questionText: text("question_text").notNull(),
  questionType: questionTypeEnum("question_type").notNull().default("mcq"),
  explanation: text("explanation"),
  points: integer("points").notNull().default(1),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const assessmentOptionsTable = pgTable("assessment_options", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull(),
  optionText: text("option_text").notNull(),
  isCorrect: boolean("is_correct").notNull().default(false),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const assessmentAnswersTable = pgTable("assessment_answers", {
  id: serial("id").primaryKey(),
  attemptId: integer("attempt_id").notNull(),
  questionId: integer("question_id").notNull(),
  selectedOptionIds: integer("selected_option_ids").array().notNull(),
  isCorrect: boolean("is_correct"),
  pointsAwarded: integer("points_awarded").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const assessmentAttemptsTable = pgTable("assessment_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  assessmentId: integer("assessment_id").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  status: text("status").notNull().default("in_progress"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const assessmentResultsTable = pgTable("assessment_results", {
  id: serial("id").primaryKey(),
  attemptId: integer("attempt_id").notNull().unique(),
  userId: integer("user_id").notNull(),
  assessmentId: integer("assessment_id").notNull(),
  score: integer("score").notNull(),
  totalMarks: integer("total_marks").notNull(),
  percentage: real("percentage").notNull(),
  passed: boolean("passed").notNull(),
  feedback: text("feedback"),
  suggestedTrackLevel: text("suggested_track_level"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const ftsScoresTable = pgTable("fts_scores", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  totalScore: real("total_score").notNull().default(0),
  assessmentScore: real("assessment_score").notNull().default(0),
  labScore: real("lab_score").notNull().default(0),
  assignmentScore: real("assignment_score").notNull().default(0),
  attendanceScore: real("attendance_score").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const ftsHistoryTable = pgTable("fts_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  event: text("event").notNull(),
  scoreDelta: real("score_delta").notNull(),
  previousScore: real("previous_score").notNull(),
  newScore: real("new_score").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Assessment = typeof assessmentsTable.$inferSelect;
export type AssessmentQuestion = typeof assessmentQuestionsTable.$inferSelect;
export type AssessmentOption = typeof assessmentOptionsTable.$inferSelect;
export type AssessmentAttempt = typeof assessmentAttemptsTable.$inferSelect;
export type AssessmentResult = typeof assessmentResultsTable.$inferSelect;
export type FtsScore = typeof ftsScoresTable.$inferSelect;

export const insertAssessmentSchema = createInsertSchema(assessmentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
