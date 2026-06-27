import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  date,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { careerTrackEnum } from "./users";

// Admin-managed certificate templates (course / internship / achievement).
export const certificateTemplatesTable = pgTable("certificate_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  // course_completion | internship | achievement
  type: text("type").notNull().default("course_completion"),
  careerTrack: careerTrackEnum("career_track"),
  logoUrl: text("logo_url"),
  signatureUrl: text("signature_url"),
  signatureName: text("signature_name"),
  bodyTemplate: text("body_template"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Issued certificates with public QR verification token.
export const certificatesTable = pgTable("certificates", {
  id: serial("id").primaryKey(),
  // Human-readable public id, e.g. FUTR-CERT-2026-000123
  certificateCode: text("certificate_code").notNull().unique(),
  userId: integer("user_id").notNull(),
  templateId: integer("template_id"),
  // course_completion | internship | achievement
  type: text("type").notNull().default("course_completion"),
  title: text("title").notNull(),
  careerTrack: careerTrackEnum("career_track"),
  // Provenance of an auto-issued certificate. sourceType is one of
  // course | learning_path | lab_series | career_roadmap | internship | journey | manual.
  // (userId, sourceType, sourceId) is the idempotency key for auto-issuance.
  sourceType: text("source_type").notNull().default("manual"),
  sourceId: integer("source_id"),
  courseName: text("course_name"),
  internshipName: text("internship_name"),
  mentorId: integer("mentor_id"),
  durationText: text("duration_text"),
  achievementLabel: text("achievement_label"),
  issuedDate: date("issued_date", { mode: "string" }).notNull(),
  // Optional expiry; when in the past the certificate is treated as expired.
  expiresDate: date("expires_date", { mode: "string" }),
  verifyToken: text("verify_token").notNull().unique(),
  // issued | revoked | expired
  status: text("status").notNull().default("issued"),
  // Object path of the generated PDF in storage (set on first generation).
  pdfObjectPath: text("pdf_object_path"),
  metadata: jsonb("metadata"),
  issuedBy: integer("issued_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (t) => [
  // DB-enforced idempotency for auto-issued certificates: at most one
  // certificate per (user, source). Manual certificates (sourceId null) are
  // exempt via the partial predicate so admins can issue freely.
  uniqueIndex("certificates_user_source_uq")
    .on(t.userId, t.sourceType, t.sourceId)
    .where(sql`${t.sourceType} <> 'manual' and ${t.sourceId} is not null`),
]);

// Per-source auto-issuance rules. When a learner completes a source entity
// (course/lab series/learning path/career roadmap/internship), a certificate is
// auto-issued only if a row here exists with enabled=true.
export const certificateAutoIssueConfigTable = pgTable(
  "certificate_auto_issue_config",
  {
    id: serial("id").primaryKey(),
    // course | learning_path | lab_series | career_roadmap | internship
    sourceType: text("source_type").notNull(),
    sourceId: integer("source_id").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    // Validity window in months from issue date; null = never expires.
    expiryMonths: integer("expiry_months"),
    // When true, completing again re-issues (renews) the certificate.
    allowReissue: boolean("allow_reissue").notNull().default(false),
    templateId: integer("template_id"),
    // Optional override for the certificate type label.
    certificateType: text("certificate_type"),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    // One config row per source; makes PUT upserts race-safe.
    uniqueIndex("cert_auto_issue_source_uq").on(t.sourceType, t.sourceId),
  ],
);

// Tracks an admin-triggered bulk PDF generation run handled by the BullMQ
// certificate_generation queue. bullJobId links the DB row to the queue job.
export const certificateGenerationJobsTable = pgTable(
  "certificate_generation_jobs",
  {
    id: serial("id").primaryKey(),
    bullJobId: text("bull_job_id"),
    // queued | running | paused | completed | failed | cancelled
    status: text("status").notNull().default("queued"),
    total: integer("total").notNull().default(0),
    processed: integer("processed").notNull().default(0),
    succeeded: integer("succeeded").notNull().default(0),
    failed: integer("failed").notNull().default(0),
    certificateIds: jsonb("certificate_ids").notNull(),
    failedIds: jsonb("failed_ids"),
    avgMsPerCert: integer("avg_ms_per_cert"),
    durationMs: integer("duration_ms"),
    error: text("error"),
    // Sharding: a large bulk run is split into a PARENT row (is_shard=false,
    // shard_count=N) plus N SHARD rows (is_shard=true, parent_job_id=parent,
    // shard_index 0..N-1). Shards are the unit of work distributed across
    // workers/partitions; the parent aggregates their progress. partition is the
    // queue partition a shard was routed to (shard_index % CERT_QUEUE_PARTITIONS).
    parentJobId: integer("parent_job_id"),
    isShard: boolean("is_shard").notNull().default(false),
    shardIndex: integer("shard_index"),
    shardCount: integer("shard_count").notNull().default(1),
    partition: integer("partition").notNull().default(0),
    createdBy: integer("created_by").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("cert_gen_jobs_parent_idx").on(t.parentJobId)],
);

export const insertCertificateTemplateSchema = createInsertSchema(
  certificateTemplatesTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCertificateSchema = createInsertSchema(
  certificatesTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCertificateAutoIssueConfigSchema = createInsertSchema(
  certificateAutoIssueConfigTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCertificateGenerationJobSchema = createInsertSchema(
  certificateGenerationJobsTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type CertificateTemplate =
  typeof certificateTemplatesTable.$inferSelect;
export type Certificate = typeof certificatesTable.$inferSelect;
export type CertificateAutoIssueConfig =
  typeof certificateAutoIssueConfigTable.$inferSelect;
export type CertificateGenerationJob =
  typeof certificateGenerationJobsTable.$inferSelect;
export type InsertCertificateTemplate = z.infer<
  typeof insertCertificateTemplateSchema
>;
export type InsertCertificate = z.infer<typeof insertCertificateSchema>;
export type InsertCertificateAutoIssueConfig = z.infer<
  typeof insertCertificateAutoIssueConfigSchema
>;
export type InsertCertificateGenerationJob = z.infer<
  typeof insertCertificateGenerationJobSchema
>;
