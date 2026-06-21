import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { createInsertSchema } from "drizzle-zod";

export const consentTypeEnum = pgEnum("consent_type", [
  "marketing",
  "analytics",
  "dataProcessing",
  "thirdParty",
]);

export const consentActionEnum = pgEnum("consent_action", [
  "granted",
  "withdrawn",
  "updated",
]);

export const dataRequestTypeEnum = pgEnum("data_request_type", [
  "download",
  "deletion",
  "correction",
]);

export const dataRequestStatusEnum = pgEnum("data_request_status", [
  "pending",
  "processing",
  "completed",
  "rejected",
]);

export const consentLogsTable = pgTable("consent_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  marketing: boolean("marketing").notNull().default(false),
  analytics: boolean("analytics").notNull().default(false),
  dataProcessing: boolean("data_processing").notNull().default(false),
  thirdParty: boolean("third_party").notNull().default(false),
  cookiePreferences: jsonb("cookie_preferences"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const consentHistoryTable = pgTable("consent_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  consentType: consentTypeEnum("consent_type").notNull(),
  action: consentActionEnum("action").notNull(),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const dataDownloadRequestsTable = pgTable("data_download_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  status: dataRequestStatusEnum("status").notNull().default("pending"),
  downloadUrl: text("download_url"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const dataDeleteRequestsTable = pgTable("data_delete_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  reason: text("reason").notNull(),
  status: dataRequestStatusEnum("status").notNull().default("pending"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const dataCorrectionRequestsTable = pgTable(
  "data_correction_requests",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    field: text("field").notNull(),
    currentValue: text("current_value").notNull(),
    requestedValue: text("requested_value").notNull(),
    supportingNote: text("supporting_note"),
    status: dataRequestStatusEnum("status").notNull().default("pending"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  }
);

export const retentionPoliciesTable = pgTable("retention_policies", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull().unique(),
  retentionDays: integer("retention_days").notNull(),
  legalBasis: text("legal_basis").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ConsentLog = typeof consentLogsTable.$inferSelect;
export type ConsentHistory = typeof consentHistoryTable.$inferSelect;
export type DataDownloadRequest =
  typeof dataDownloadRequestsTable.$inferSelect;
export type DataDeleteRequest = typeof dataDeleteRequestsTable.$inferSelect;
export type DataCorrectionRequest =
  typeof dataCorrectionRequestsTable.$inferSelect;
export type AuditLog = typeof auditLogsTable.$inferSelect;

export const insertConsentLogSchema = createInsertSchema(consentLogsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertConsentLog = z.infer<typeof insertConsentLogSchema>;
