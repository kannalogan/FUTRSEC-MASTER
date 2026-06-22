import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  bigint,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Logical areas a file can belong to. Kept as text (not a pg enum) so new
// usage areas can be added without a migration.
export const FILE_USAGE_AREAS = [
  "courses",
  "lessons",
  "labs",
  "assignments",
  "certificates",
  "support",
  "community",
  "resumes",
  "job_descriptions",
  "employer_documents",
  "tpo_files",
  "mentor_resources",
  "general",
] as const;

export const FILE_VISIBILITIES = ["public", "private"] as const;

// pending → scanning → clean | infected | skipped
export const FILE_SCAN_STATUSES = [
  "pending",
  "scanning",
  "clean",
  "infected",
  "skipped",
] as const;

// active | deleted (soft delete, restorable)
export const FILE_STATUSES = ["active", "deleted"] as const;

// Object-storage backed file metadata. The bytes live in the storage provider
// (GCS via Replit App Storage by default); this table is the system of record
// for ownership, ACL, versioning, quota accounting, scan status and lifecycle.
export const filesTable = pgTable(
  "files",
  {
    id: serial("id").primaryKey(),
    // Stable storage key / object path (e.g. "/objects/uploads/<uuid>").
    objectPath: text("object_path").notNull(),
    ownerId: integer("owner_id").notNull(),
    originalName: text("original_name").notNull(),
    contentType: text("content_type").notNull(),
    // Size in bytes. bigint for files larger than 2GB headroom.
    size: bigint("size", { mode: "number" }).notNull().default(0),
    // Virtual folder path for UI organization, e.g. "/labs/week-1".
    folder: text("folder").notNull().default("/"),
    usageArea: text("usage_area").notNull().default("general"),
    visibility: text("visibility").notNull().default("private"),
    // Version chain: v1 has parentFileId = null; subsequent versions point at
    // the original (head) file id and increment `version`.
    version: integer("version").notNull().default(1),
    parentFileId: integer("parent_file_id"),
    isLatest: boolean("is_latest").notNull().default(true),
    status: text("status").notNull().default("active"),
    scanStatus: text("scan_status").notNull().default("pending"),
    metadata: jsonb("metadata"),
    // Optional auto-expiry for transient files (signed URL/lifecycle).
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: integer("deleted_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("files_owner_idx").on(t.ownerId),
    index("files_usage_area_idx").on(t.usageArea),
    index("files_parent_idx").on(t.parentFileId),
    index("files_status_idx").on(t.status),
  ],
);

// Per-user storage quota accounting. Default quota assigned on first upload.
export const fileQuotasTable = pgTable("file_quotas", {
  userId: integer("user_id").primaryKey(),
  // Bytes.
  quotaBytes: bigint("quota_bytes", { mode: "number" })
    .notNull()
    .default(2_147_483_648), // 2 GiB default
  usedBytes: bigint("used_bytes", { mode: "number" }).notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertFileSchema = createInsertSchema(filesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type FileRecord = typeof filesTable.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;
export type FileQuota = typeof fileQuotasTable.$inferSelect;
