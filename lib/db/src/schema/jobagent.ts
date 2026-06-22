import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

// Cached AI match score between a student and a job. Uniqueness on
// (studentId, jobId) enforced at the route layer (upsert pattern).
export const jobMatchesTable = pgTable("job_matches", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  jobId: integer("job_id").notNull(),
  matchScore: integer("match_score").notNull().default(0),
  reasons: text("reasons"),
  factors: jsonb("factors"),
  // Per-component score breakdown (skills/experience/assessment/fts/resume/track/certificate).
  breakdown: jsonb("breakdown"),
  // Skills required by the job the student is missing.
  missingSkills: jsonb("missing_skills"),
  // Concrete learning recommendations to close the gap.
  recommendations: jsonb("recommendations"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const savedJobsTable = pgTable("saved_jobs", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  jobId: integer("job_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Premium AI auto-apply preferences. One row per student.
export const autoApplySettingsTable = pgTable("auto_apply_settings", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  minSalary: integer("min_salary"),
  preferredLocation: text("preferred_location"),
  workMode: text("work_mode"),
  companySize: text("company_size"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type JobMatch = typeof jobMatchesTable.$inferSelect;
export type SavedJob = typeof savedJobsTable.$inferSelect;
export type AutoApplySettings = typeof autoApplySettingsTable.$inferSelect;
