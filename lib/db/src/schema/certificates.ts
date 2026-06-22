import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  date,
  jsonb,
} from "drizzle-orm/pg-core";
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
});

export const insertCertificateTemplateSchema = createInsertSchema(
  certificateTemplatesTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCertificateSchema = createInsertSchema(
  certificatesTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type CertificateTemplate =
  typeof certificateTemplatesTable.$inferSelect;
export type Certificate = typeof certificatesTable.$inferSelect;
export type InsertCertificateTemplate = z.infer<
  typeof insertCertificateTemplateSchema
>;
export type InsertCertificate = z.infer<typeof insertCertificateSchema>;
