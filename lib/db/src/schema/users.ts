import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roleEnum = pgEnum("role", [
  "student",
  "mentor",
  "tpo",
  "employer",
  "admin",
]);

export const onboardingStepEnum = pgEnum("onboarding_step", [
  "consent",
  "profile",
  "track_selection",
  "pre_assessment",
  "pending_approval",
  "complete",
]);

// Permanent career track. Selected ONCE during onboarding and locked thereafter;
// only admins may change it (via the admin student-management flow). Values are
// kept in sync with the soc/vapt/grc subset of the learning `domain` enum.
export const careerTrackEnum = pgEnum("career_track", ["soc", "vapt", "grc"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique(),
  phone: text("phone").unique(),
  fullName: text("full_name"),
  passwordHash: text("password_hash"),
  role: roleEnum("role").notNull().default("student"),
  onboardingStep: onboardingStepEnum("onboarding_step")
    .notNull()
    .default("consent"),
  selectedTrackId: integer("selected_track_id"),
  careerTrack: careerTrackEnum("career_track"),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const studentProfilesTable = pgTable("student_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  college: text("college"),
  graduationYear: integer("graduation_year"),
  city: text("city"),
  linkedinUrl: text("linkedin_url"),
  githubUrl: text("github_url"),
  portfolioUrl: text("portfolio_url"),
  twitterUrl: text("twitter_url"),
  resumeUrl: text("resume_url"),
  currentRole: text("current_role"),
  bio: text("bio"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const mentorProfilesTable = pgTable("mentor_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  specialization: text("specialization"),
  yearsOfExperience: integer("years_of_experience"),
  company: text("company"),
  designation: text("designation"),
  linkedinUrl: text("linkedin_url"),
  calendlyUrl: text("calendly_url"),
  bio: text("bio"),
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const tpoProfilesTable = pgTable("tpo_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  institution: text("institution").notNull(),
  institutionCode: text("institution_code"),
  designation: text("designation"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const employersTable = pgTable("employers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  companyName: text("company_name").notNull(),
  companySize: text("company_size"),
  industry: text("industry"),
  website: text("website"),
  linkedinUrl: text("linkedin_url"),
  designation: text("designation"),
  logoUrl: text("logo_url"),
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const refreshTokensTable = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type StudentProfile = typeof studentProfilesTable.$inferSelect;
export type MentorProfile = typeof mentorProfilesTable.$inferSelect;
export type TpoProfile = typeof tpoProfilesTable.$inferSelect;
export type Employer = typeof employersTable.$inferSelect;
export type RefreshToken = typeof refreshTokensTable.$inferSelect;
