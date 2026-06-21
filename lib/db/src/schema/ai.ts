import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

export const aiInterviewsTable = pgTable("ai_interviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  trackId: integer("track_id"),
  jobId: integer("job_id"),
  status: text("status").notNull().default("pending"),
  interviewType: text("interview_type").notNull().default("text"),
  difficulty: text("difficulty").notNull().default("intermediate"),
  totalQuestions: integer("total_questions").notNull().default(10),
  questions: jsonb("questions"),
  answers: jsonb("answers"),
  evaluation: jsonb("evaluation"),
  overallScore: integer("overall_score"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const aiReportsTable = pgTable("ai_reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  reportType: text("report_type").notNull(),
  content: text("content").notNull(),
  metadata: text("metadata"),
  generatedAt: timestamp("generated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const aiResumeAnalysisTable = pgTable("ai_resume_analysis", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  resumeUrl: text("resume_url").notNull(),
  analysisResult: text("analysis_result"),
  atsScore: integer("ats_score"),
  suggestions: text("suggestions"),
  keywords: text("keywords").array().notNull().default([]),
  analyzedAt: timestamp("analyzed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const aiCareerReportsTable = pgTable("ai_career_reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  currentRole: text("current_role"),
  targetRole: text("target_role"),
  roadmap: text("roadmap"),
  timelineMonths: integer("timeline_months"),
  confidence: integer("confidence"),
  generatedAt: timestamp("generated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const aiSkillGapReportsTable = pgTable("ai_skill_gap_reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  trackId: integer("track_id"),
  currentSkills: text("current_skills").array().notNull().default([]),
  requiredSkills: text("required_skills").array().notNull().default([]),
  gapSkills: text("gap_skills").array().notNull().default([]),
  recommendations: text("recommendations"),
  generatedAt: timestamp("generated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const aiHistoryTable = pgTable("ai_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  sessionId: text("session_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  model: text("model"),
  tokens: integer("tokens"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const subscriptionsTable = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  plan: text("plan").notNull().default("free"),
  status: text("status").notNull().default("active"),
  startDate: timestamp("start_date", { withTimezone: true })
    .notNull()
    .defaultNow(),
  endDate: timestamp("end_date", { withTimezone: true }),
  paymentGateway: text("payment_gateway"),
  externalSubId: text("external_sub_id"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  autoRenew: boolean("auto_renew").notNull().default(false),
  couponCode: text("coupon_code"),
  referralCode: text("referral_code"),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subscriptionId: integer("subscription_id"),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("INR"),
  status: text("status").notNull().default("pending"),
  gateway: text("gateway").notNull().default("razorpay"),
  gatewayOrderId: text("gateway_order_id"),
  gatewayPaymentId: text("gateway_payment_id"),
  failureReason: text("failure_reason"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  paymentId: integer("payment_id").notNull(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  amount: integer("amount").notNull(),
  tax: integer("tax").notNull().default(0),
  totalAmount: integer("total_amount").notNull(),
  s3Key: text("s3_key"),
  gstNumber: text("gst_number"),
  gstRate: integer("gst_rate"),
  placeOfSupply: text("place_of_supply"),
  billingName: text("billing_name"),
  issuedAt: timestamp("issued_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AiInterview = typeof aiInterviewsTable.$inferSelect;
export type AiReport = typeof aiReportsTable.$inferSelect;
export type Subscription = typeof subscriptionsTable.$inferSelect;
export type Payment = typeof paymentsTable.$inferSelect;
