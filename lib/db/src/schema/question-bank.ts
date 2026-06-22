import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  real,
  jsonb,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { careerTrackEnum, roleEnum } from "./users";
import { questionTypeEnum } from "./assessments";

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────
export const questionDifficultyEnum = pgEnum("question_difficulty", [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
]);

export const questionStatusEnum = pgEnum("question_status", [
  "draft",
  "pending",
  "approved",
  "rejected",
  "archived",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Question Bank — a reusable library of questions authored by admins & mentors.
// Distinct from `assessment_questions` (which are bound to a single assessment).
// ─────────────────────────────────────────────────────────────────────────────
export const questionBankTable = pgTable("question_bank", {
  id: serial("id").primaryKey(),
  questionText: text("question_text").notNull(),
  questionType: questionTypeEnum("question_type").notNull().default("mcq"),
  careerTrack: careerTrackEnum("career_track").notNull(),
  difficulty: questionDifficultyEnum("difficulty")
    .notNull()
    .default("intermediate"),
  status: questionStatusEnum("status").notNull().default("draft"),

  // Authorship + governance
  createdBy: integer("created_by").notNull(),
  creatorRole: roleEnum("creator_role").notNull(),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  // When true, other mentors of the same track may view (never edit) this question.
  isShared: boolean("is_shared").notNull().default(false),
  version: integer("version").notNull().default(1),

  // Pedagogy tags
  topic: text("topic"),
  bloomLevel: text("bloom_level"),
  estimatedTimeMin: integer("estimated_time_min"),
  marks: integer("marks").notNull().default(1),
  negativeMarks: real("negative_marks").notNull().default(0),
  skills: text("skills").array().notNull().default([]),
  keywords: text("keywords").array().notNull().default([]),
  explanation: text("explanation"),

  // Type-specific payloads
  codeLanguage: text("code_language"),
  codeTemplate: text("code_template"),
  expectedOutput: text("expected_output"),
  scenarioContext: text("scenario_context"),

  // Analytics / AI
  usageCount: integer("usage_count").notNull().default(0),
  aiQualityScore: integer("ai_quality_score"),
  aiGenerated: boolean("ai_generated").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Options for choice-style questions (mcq / multi_select / true_false).
export const questionBankOptionsTable = pgTable("question_bank_options", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull(),
  optionText: text("option_text").notNull(),
  isCorrect: boolean("is_correct").notNull().default(false),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Immutable version history — one snapshot per edit.
export const questionBankVersionsTable = pgTable("question_bank_versions", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull(),
  version: integer("version").notNull(),
  snapshot: jsonb("snapshot").notNull(),
  changedBy: integer("changed_by"),
  changeNote: text("change_note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Optional batch/cohort scoping for a question.
export const questionBankBatchesTable = pgTable(
  "question_bank_batches",
  {
    id: serial("id").primaryKey(),
    questionId: integer("question_id").notNull(),
    batchId: integer("batch_id").notNull(),
  },
  (t) => ({
    uniqQuestionBatch: uniqueIndex("uniq_question_batch").on(
      t.questionId,
      t.batchId
    ),
  })
);

export type QuestionBankItem = typeof questionBankTable.$inferSelect;
export type QuestionBankOption = typeof questionBankOptionsTable.$inferSelect;
export type QuestionBankVersion = typeof questionBankVersionsTable.$inferSelect;
export type QuestionBankBatch = typeof questionBankBatchesTable.$inferSelect;
