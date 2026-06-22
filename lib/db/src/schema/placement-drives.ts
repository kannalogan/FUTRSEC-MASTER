import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// A TPO-owned placement drive: the coordination hub that ties a company to
// eligible students, interview rounds, and scheduled slots.
export const placementDrivesTable = pgTable(
  "placement_drives",
  {
    id: serial("id").primaryKey(),
    tpoId: integer("tpo_id").notNull(),
    companyId: integer("company_id"),
    companyName: text("company_name").notNull(),
    role: text("role").notNull(),
    careerTrack: text("career_track"),
    packageDetails: text("package_details"),
    mode: text("mode").notNull().default("onsite"), // onsite | remote | hybrid
    venue: text("venue"),
    meetingUrl: text("meeting_url"),
    eligibilityCriteria: text("eligibility_criteria"),
    minFtsScore: integer("min_fts_score"),
    status: text("status").notNull().default("draft"), // draft | published | in_progress | completed | cancelled
    driveDate: timestamp("drive_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("placement_drives_tpo_idx").on(t.tpoId)],
);

// An interview round within a drive (aptitude, technical, HR, managerial, final).
export const driveRoundsTable = pgTable(
  "drive_rounds",
  {
    id: serial("id").primaryKey(),
    driveId: integer("drive_id").notNull(),
    name: text("name").notNull(),
    type: text("type").notNull().default("technical"), // aptitude | gd | technical | hr | managerial | final
    sequence: integer("sequence").notNull().default(1),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    durationMinutes: integer("duration_minutes").notNull().default(30),
    venue: text("venue"),
    meetingUrl: text("meeting_url"),
    interviewerId: integer("interviewer_id"),
    interviewerName: text("interviewer_name"),
    capacity: integer("capacity"),
    status: text("status").notNull().default("scheduled"), // scheduled | in_progress | completed | cancelled
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("drive_rounds_drive_idx").on(t.driveId)],
);

// A student invited to a drive, tracking their pipeline stage end-to-end.
export const driveInvitesTable = pgTable(
  "drive_invites",
  {
    id: serial("id").primaryKey(),
    driveId: integer("drive_id").notNull(),
    studentId: integer("student_id").notNull(),
    stage: text("stage").notNull().default("invited"), // invited | shortlisted | technical | hr | final | offer | joined | rejected | withdrawn
    status: text("status").notNull().default("invited"), // invited | accepted | declined | withdrawn
    invitedBy: integer("invited_by").notNull(),
    invitedAt: timestamp("invited_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("drive_invites_drive_student_uq").on(t.driveId, t.studentId)],
);

// A scheduled time slot for a student in a specific round — the unit the
// calendar renders and drag-and-drop reschedules. Conflict detection keys on
// overlapping (studentId) or (interviewer) slots.
export const roundSchedulesTable = pgTable(
  "round_schedules",
  {
    id: serial("id").primaryKey(),
    roundId: integer("round_id").notNull(),
    driveId: integer("drive_id").notNull(),
    studentId: integer("student_id").notNull(),
    slotStart: timestamp("slot_start", { withTimezone: true }).notNull(),
    slotEnd: timestamp("slot_end", { withTimezone: true }).notNull(),
    venue: text("venue"),
    meetingUrl: text("meeting_url"),
    status: text("status").notNull().default("scheduled"), // scheduled | rescheduled | cancelled | completed
    result: text("result").notNull().default("pending"), // pending | pass | fail | selected | rejected | offer | joined
    attendance: text("attendance").notNull().default("unknown"), // unknown | present | absent
    score: integer("score"),
    feedback: text("feedback"),
    createdBy: integer("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("round_schedules_round_idx").on(t.roundId),
    index("round_schedules_student_idx").on(t.studentId),
    index("round_schedules_drive_idx").on(t.driveId),
  ],
);

export type PlacementDrive = typeof placementDrivesTable.$inferSelect;
export type DriveRound = typeof driveRoundsTable.$inferSelect;
export type DriveInvite = typeof driveInvitesTable.$inferSelect;
export type RoundSchedule = typeof roundSchedulesTable.$inferSelect;
