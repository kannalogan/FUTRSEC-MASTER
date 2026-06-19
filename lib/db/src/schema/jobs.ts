import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  employerId: integer("employer_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull().default("full_time"),
  location: text("location"),
  isRemote: boolean("is_remote").notNull().default(false),
  minSalary: integer("min_salary"),
  maxSalary: integer("max_salary"),
  experience: text("experience"),
  requiredTracks: text("required_tracks").array().notNull().default([]),
  status: text("status").notNull().default("active"),
  applicationDeadline: timestamp("application_deadline", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const jobSkillsTable = pgTable("job_skills", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  skill: text("skill").notNull(),
  level: text("level").notNull().default("required"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const jobApplicationsTable = pgTable("job_applications", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  studentId: integer("student_id").notNull(),
  coverLetter: text("cover_letter"),
  resumeUrl: text("resume_url"),
  status: text("status").notNull().default("applied"),
  appliedAt: timestamp("applied_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const jobShortlistsTable = pgTable("job_shortlists", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  studentId: integer("student_id").notNull(),
  shortlistedBy: integer("shortlisted_by").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const interviewsTable = pgTable("interviews", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull(),
  type: text("type").notNull().default("technical"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  status: text("status").notNull().default("scheduled"),
  meetingUrl: text("meeting_url"),
  feedback: text("feedback"),
  interviewerNotes: text("interviewer_notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const offersTable = pgTable("offers", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull(),
  studentId: integer("student_id").notNull(),
  jobId: integer("job_id").notNull(),
  salary: integer("salary"),
  joiningDate: text("joining_date"),
  offerLetterUrl: text("offer_letter_url"),
  status: text("status").notNull().default("sent"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Job = typeof jobsTable.$inferSelect;
export type JobApplication = typeof jobApplicationsTable.$inferSelect;
export type Interview = typeof interviewsTable.$inferSelect;
export type Offer = typeof offersTable.$inferSelect;
