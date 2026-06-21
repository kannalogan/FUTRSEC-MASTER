import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { careerTrackEnum } from "./users";

// Campus placement drives created by admins (track-scoped).
export const campusDrivesTable = pgTable("campus_drives", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  companyName: text("company_name").notNull(),
  careerTrack: careerTrackEnum("career_track").notNull(),
  eligibleColleges: text("eligible_colleges").array().notNull().default([]),
  eligibleYears: text("eligible_years").array().notNull().default([]),
  eligibilityCriteria: text("eligibility_criteria"),
  packageDetails: text("package_details"),
  mode: text("mode").notNull().default("onsite"),
  deadline: timestamp("deadline", { withTimezone: true }),
  status: text("status").notNull().default("open"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const campusDriveRegistrationsTable = pgTable(
  "campus_drive_registrations",
  {
    id: serial("id").primaryKey(),
    driveId: integer("drive_id").notNull(),
    studentId: integer("student_id").notNull(),
    status: text("status").notNull().default("registered"),
    attended: boolean("attended").notNull().default(false),
    result: text("result"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  }
);

export type CampusDrive = typeof campusDrivesTable.$inferSelect;
export type CampusDriveRegistration =
  typeof campusDriveRegistrationsTable.$inferSelect;
