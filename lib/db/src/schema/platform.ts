import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Single-row (id = 1) platform configuration. NON-SECRET values only.
// Secrets (SMTP_*, OPENAI_API_KEY, GEMINI_API_KEY, RAZORPAY_*) live ONLY in env.
export const platformSettingsTable = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  trialDays: integer("trial_days").notNull().default(15),
  logoUrl: text("logo_url"),
  bannerUrl: text("banner_url"),
  termsContent: text("terms_content"),
  privacyContent: text("privacy_content"),
  refundContent: text("refund_content"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  contactAddress: text("contact_address"),
  updatedBy: integer("updated_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Per-feature AI configuration (enable/disable + arbitrary settings).
export const aiFeatureConfigTable = pgTable("ai_feature_config", {
  id: serial("id").primaryKey(),
  // explain_tutor | career_coach | mock_interview | resume_analyzer
  feature: text("feature").notNull().unique(),
  enabled: boolean("enabled").notNull().default(true),
  settings: jsonb("settings"),
  updatedBy: integer("updated_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertPlatformSettingsSchema = createInsertSchema(
  platformSettingsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAiFeatureConfigSchema = createInsertSchema(
  aiFeatureConfigTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type PlatformSettings = typeof platformSettingsTable.$inferSelect;
export type AiFeatureConfig = typeof aiFeatureConfigTable.$inferSelect;
export type InsertPlatformSettings = z.infer<
  typeof insertPlatformSettingsSchema
>;
export type InsertAiFeatureConfig = z.infer<
  typeof insertAiFeatureConfigSchema
>;
