import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

// Provider-agnostic transaction log for a payment. provider is one of
// manual | stripe | razorpay. Real gateways wired in Phase 5B.
export const paymentTransactionsTable = pgTable("payment_transactions", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id").notNull(),
  provider: text("provider").notNull().default("manual"),
  providerTxnId: text("provider_txn_id"),
  status: text("status").notNull().default("success"),
  amount: integer("amount").notNull().default(0),
  rawPayload: jsonb("raw_payload"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const couponsTable = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description"),
  discountType: text("discount_type").notNull().default("percent"),
  discountValue: integer("discount_value").notNull().default(0),
  plan: text("plan"),
  maxRedemptions: integer("max_redemptions"),
  timesRedeemed: integer("times_redeemed").notNull().default(0),
  validFrom: timestamp("valid_from", { withTimezone: true }),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const referralsTable = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerUserId: integer("referrer_user_id").notNull(),
  referredUserId: integer("referred_user_id"),
  code: text("code").notNull(),
  status: text("status").notNull().default("pending"),
  rewardType: text("reward_type"),
  rewardValue: integer("reward_value"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PaymentTransaction = typeof paymentTransactionsTable.$inferSelect;
export type Coupon = typeof couponsTable.$inferSelect;
export type Referral = typeof referralsTable.$inferSelect;
