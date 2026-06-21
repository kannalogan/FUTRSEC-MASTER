import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { careerTrackEnum } from "./users";

// Maps a student to a TPO (placement officer). A student may be linked to
// multiple TPOs only across different institutions in practice, but uniqueness
// is enforced per (tpoId, studentId) pair at the route layer.
export const studentTpoMapTable = pgTable("student_tpo_map", {
  id: serial("id").primaryKey(),
  tpoId: integer("tpo_id").notNull(),
  studentId: integer("student_id").notNull(),
  institution: text("institution"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Placement / training events created by a TPO.
export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  tpoId: integer("tpo_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("placement_drive"),
  location: text("location"),
  isOnline: boolean("is_online").notNull().default(false),
  meetingUrl: text("meeting_url"),
  careerTrack: careerTrackEnum("career_track"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  maxAttendees: integer("max_attendees"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const eventRegistrationsTable = pgTable("event_registrations", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  studentId: integer("student_id").notNull(),
  status: text("status").notNull().default("registered"),
  registeredAt: timestamp("registered_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type StudentTpoMap = typeof studentTpoMapTable.$inferSelect;
export type PlacementEvent = typeof eventsTable.$inferSelect;
export type EventRegistration = typeof eventRegistrationsTable.$inferSelect;
