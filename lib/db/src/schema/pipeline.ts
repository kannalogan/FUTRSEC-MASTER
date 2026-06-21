import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { careerTrackEnum } from "./users";

// Immutable history of application status transitions.
export const applicationStatusHistoryTable = pgTable(
  "application_status_history",
  {
    id: serial("id").primaryKey(),
    applicationId: integer("application_id").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    note: text("note"),
    changedBy: integer("changed_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  }
);

// A finalized placement (created when an application reaches "hired").
export const placementsTable = pgTable("placements", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  jobId: integer("job_id"),
  applicationId: integer("application_id"),
  offerId: integer("offer_id"),
  employerId: integer("employer_id"),
  companyName: text("company_name"),
  careerTrack: careerTrackEnum("career_track"),
  packageAmount: integer("package_amount"),
  status: text("status").notNull().default("placed"),
  placedAt: timestamp("placed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ApplicationStatusHistory =
  typeof applicationStatusHistoryTable.$inferSelect;
export type Placement = typeof placementsTable.$inferSelect;
