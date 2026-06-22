import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

// Uploaded / linked artifacts attached to a lab: PDFs, videos, PCAPs, scripts,
// challenge bundles, images, or external links. Stored as a resolvable URL
// (object-storage key optional) so the asset is always functional, never a stub.
export const labAssetsTable = pgTable(
  "lab_assets",
  {
    id: serial("id").primaryKey(),
    labId: integer("lab_id").notNull(),
    kind: text("kind").notNull(), // pdf | video | pcap | script | challenge | image | link
    title: text("title").notNull(),
    url: text("url").notNull(),
    storageKey: text("storage_key"),
    sizeBytes: integer("size_bytes"),
    uploadedBy: integer("uploaded_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("lab_assets_lab_idx").on(t.labId)],
);

// Ordered, progressive hints for a lab module (each can carry a point penalty).
export const labHintsTable = pgTable(
  "lab_hints",
  {
    id: serial("id").primaryKey(),
    labModuleId: integer("lab_module_id").notNull(),
    order: integer("order").notNull().default(1),
    content: text("content").notNull(),
    penaltyPoints: integer("penalty_points").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("lab_hints_module_idx").on(t.labModuleId)],
);

// Immutable snapshots of a lab's content for version history / rollback.
export const labVersionsTable = pgTable(
  "lab_versions",
  {
    id: serial("id").primaryKey(),
    labId: integer("lab_id").notNull(),
    version: integer("version").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    note: text("note"),
    createdBy: integer("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("lab_versions_lab_idx").on(t.labId)],
);

// A mentor assignment of a lab to a single student, a batch, a whole track, or
// the entire cohort. Exactly one of studentId/batchId/trackId is set depending
// on audienceType (cohort sets none).
export const labAssignmentsTable = pgTable(
  "lab_assignments",
  {
    id: serial("id").primaryKey(),
    labId: integer("lab_id").notNull(),
    assignedBy: integer("assigned_by").notNull(),
    audienceType: text("audience_type").notNull(), // student | batch | track | cohort
    studentId: integer("student_id"),
    batchId: integer("batch_id"),
    trackId: integer("track_id"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("lab_assignments_lab_idx").on(t.labId),
    index("lab_assignments_student_idx").on(t.studentId),
    index("lab_assignments_batch_idx").on(t.batchId),
  ],
);

export type LabAsset = typeof labAssetsTable.$inferSelect;
export type LabHint = typeof labHintsTable.$inferSelect;
export type LabVersion = typeof labVersionsTable.$inferSelect;
export type LabAssignment = typeof labAssignmentsTable.$inferSelect;
