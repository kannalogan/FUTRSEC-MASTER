import { eq, and, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable,
  studentProfilesTable,
  subscriptionsTable,
  paymentsTable,
  paymentTransactionsTable,
  invoicesTable,
  couponsTable,
  referralsTable,
  type Subscription,
  type Payment,
  type Coupon,
} from "@workspace/db";
import { eventBus } from "./events";
import { getProvider } from "./payments/provider";
import { logger } from "./logger";

export const GST_RATE = 18; // percent
export const TRIAL_DAYS = 15;
export const DEFAULT_PLACE_OF_SUPPLY = "Karnataka";

/** Thrown when a user attempts to buy a track-specific plan outside their track. */
export class TrackMismatchError extends Error {
  readonly code = "TRACK_MISMATCH";
  constructor(message: string) {
    super(message);
    this.name = "TrackMismatchError";
  }
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number; // base amount in paise, exclusive of GST
  durationDays: number;
  isTrial: boolean;
  careerTrack: "soc" | "vapt" | "grc" | null;
  features: string[];
}

// Plan catalog. Prices are the GST-exclusive base in paise (INR).
export const PLANS: Record<string, Plan> = {
  trial: {
    id: "trial",
    name: "Free Trial",
    description: "15-day full access trial",
    price: 0,
    durationDays: TRIAL_DAYS,
    isTrial: true,
    careerTrack: null,
    features: [
      "Full access for 15 days",
      "All learning tracks preview",
      "AI tools (limited)",
    ],
  },
  premium_soc: {
    id: "premium_soc",
    name: "Premium — SOC Analyst",
    description: "Full SOC track access for 1 year",
    price: 499900,
    durationDays: 365,
    isTrial: false,
    careerTrack: "soc",
    features: [
      "Complete SOC learning path",
      "Unlimited labs & simulators",
      "AI Job Agent & auto-apply",
      "Placement support",
    ],
  },
  premium_vapt: {
    id: "premium_vapt",
    name: "Premium — VAPT",
    description: "Full VAPT track access for 1 year",
    price: 499900,
    durationDays: 365,
    isTrial: false,
    careerTrack: "vapt",
    features: [
      "Complete VAPT learning path",
      "Unlimited labs & simulators",
      "AI Job Agent & auto-apply",
      "Placement support",
    ],
  },
  premium_grc: {
    id: "premium_grc",
    name: "Premium — GRC",
    description: "Full GRC track access for 1 year",
    price: 499900,
    durationDays: 365,
    isTrial: false,
    careerTrack: "grc",
    features: [
      "Complete GRC learning path",
      "Unlimited labs & simulators",
      "AI Job Agent & auto-apply",
      "Placement support",
    ],
  },
  corporate: {
    id: "corporate",
    name: "Corporate",
    description: "Team & campus licensing (annual)",
    price: 1999900,
    durationDays: 365,
    isTrial: false,
    careerTrack: null,
    features: [
      "All tracks for your team",
      "Bulk seats & admin dashboard",
      "Priority support",
      "Custom reporting",
    ],
  },
};

export function getPlan(planId: string): Plan | null {
  return PLANS[planId] ?? null;
}

export interface GstBreakdown {
  base: number; // pre-tax base in paise
  tax: number; // GST in paise
  total: number; // base + tax in paise
  rate: number; // percent
}

export function computeGst(base: number, rate: number = GST_RATE): GstBreakdown {
  const safeBase = Math.max(0, Math.round(base));
  const tax = Math.round((safeBase * rate) / 100);
  return { base: safeBase, tax, total: safeBase + tax, rate };
}

let invoiceSeq = 0;
export function generateInvoiceNumber(paymentId: number): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  invoiceSeq += 1;
  const seq = String((paymentId * 1000 + (invoiceSeq % 1000)) % 1000000).padStart(6, "0");
  return `INV-${y}${m}-${seq}`;
}

export interface CouponValidation {
  valid: boolean;
  reason?: string;
  coupon?: Coupon;
  baseAmount?: number;
  discount?: number;
  finalAmount?: number;
}

export async function validateCoupon(
  code: string,
  planId?: string,
): Promise<CouponValidation> {
  const normalized = code.trim().toUpperCase();
  const coupon = await db.query.couponsTable.findFirst({
    where: eq(couponsTable.code, normalized),
  });
  if (!coupon) return { valid: false, reason: "Coupon not found" };
  if (!coupon.isActive) return { valid: false, reason: "Coupon is inactive" };

  const now = new Date();
  if (coupon.validFrom && now < coupon.validFrom) {
    return { valid: false, reason: "Coupon is not yet valid" };
  }
  if (coupon.validUntil && now > coupon.validUntil) {
    return { valid: false, reason: "Coupon has expired" };
  }
  if (
    coupon.maxRedemptions != null &&
    coupon.timesRedeemed >= coupon.maxRedemptions
  ) {
    return { valid: false, reason: "Coupon redemption limit reached" };
  }
  if (coupon.plan && planId && coupon.plan !== planId) {
    return { valid: false, reason: "Coupon not applicable to this plan" };
  }

  let baseAmount: number | undefined;
  let discount: number | undefined;
  let finalAmount: number | undefined;
  if (planId) {
    const plan = getPlan(planId);
    if (plan) {
      baseAmount = plan.price;
      discount = computeDiscount(coupon, baseAmount);
      finalAmount = Math.max(0, baseAmount - discount);
    }
  }

  return { valid: true, coupon, baseAmount, discount, finalAmount };
}

function computeDiscount(coupon: Coupon, base: number): number {
  if (coupon.discountType === "percent") {
    return Math.min(base, Math.round((base * coupon.discountValue) / 100));
  }
  // fixed amount (paise)
  return Math.min(base, Math.round(coupon.discountValue));
}

async function redeemCoupon(couponId: number, current: number): Promise<void> {
  await db
    .update(couponsTable)
    .set({ timesRedeemed: current + 1 })
    .where(eq(couponsTable.id, couponId));
}

export interface ApplyReferralResult {
  applied: boolean;
  reason?: string;
}

export async function applyReferral(
  code: string,
  referredUserId: number,
): Promise<ApplyReferralResult> {
  const normalized = code.trim().toUpperCase();
  const existing = await db.query.referralsTable.findFirst({
    where: eq(referralsTable.code, normalized),
  });

  if (existing) {
    if (existing.referrerUserId === referredUserId) {
      return { applied: false, reason: "Cannot use your own referral code" };
    }
    if (existing.referredUserId) {
      return { applied: false, reason: "Referral code already used" };
    }
    await db
      .update(referralsTable)
      .set({ referredUserId, status: "completed" })
      .where(eq(referralsTable.id, existing.id));
    return { applied: true };
  }

  // Unknown code — record a pending referral so it can be reconciled later.
  await db.insert(referralsTable).values({
    referrerUserId: 0,
    referredUserId,
    code: normalized,
    status: "pending",
  });
  return { applied: true };
}

export interface StartTrialResult {
  subscription: Subscription;
  alreadyOnTrial: boolean;
}

export async function startTrial(userId: number): Promise<StartTrialResult> {
  const existing = await db.query.subscriptionsTable.findFirst({
    where: eq(subscriptionsTable.userId, userId),
    orderBy: [desc(subscriptionsTable.createdAt)],
  });

  if (existing && (existing.plan === "trial" || existing.trialEndsAt)) {
    return { subscription: existing, alreadyOnTrial: true };
  }

  const plan = PLANS["trial"]!;
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + plan.durationDays * 86400000);

  let subscription: Subscription;
  if (existing) {
    const [updated] = await db
      .update(subscriptionsTable)
      .set({
        plan: "trial",
        status: "active",
        startDate: now,
        endDate: trialEndsAt,
        trialEndsAt,
      })
      .where(eq(subscriptionsTable.id, existing.id))
      .returning();
    subscription = updated!;
  } else {
    const [created] = await db
      .insert(subscriptionsTable)
      .values({
        userId,
        plan: "trial",
        status: "active",
        startDate: now,
        endDate: trialEndsAt,
        trialEndsAt,
      })
      .returning();
    subscription = created!;
  }

  eventBus.emit("subscription.trial_started", {
    type: "subscription.trial_started",
    userId,
    plan: "trial",
  });

  return { subscription, alreadyOnTrial: false };
}

export interface ChangePlanOptions {
  couponCode?: string;
  referralCode?: string;
  billingName?: string;
  gstNumber?: string;
  placeOfSupply?: string;
  provider?: string;
}

export interface ChangePlanResult {
  subscription: Subscription;
  payment: Payment;
  invoice: typeof invoicesTable.$inferSelect;
  discount: number;
}

export async function changePlan(
  userId: number,
  planId: string,
  options: ChangePlanOptions = {},
): Promise<ChangePlanResult> {
  const plan = getPlan(planId);
  if (!plan) {
    throw new Error(`Unknown plan: ${planId}`);
  }
  if (plan.isTrial) {
    throw new Error("Use startTrial to begin a trial plan");
  }

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId),
  });
  if (!user) {
    throw new Error("User not found");
  }

  // ── strict track isolation ────────────────────────────────────────────
  // Track-specific premium plans (premium_soc/vapt/grc) can only be purchased
  // by a user on the matching career track. Prevents cross-track entitlement
  // via direct API calls (frontend filtering is not sufficient).
  if (plan.careerTrack && plan.careerTrack !== user.careerTrack) {
    throw new TrackMismatchError(
      `This plan is only available for the ${plan.careerTrack.toUpperCase()} track.`,
    );
  }

  // ── coupon ────────────────────────────────────────────────────────────
  let discount = 0;
  let appliedCoupon: Coupon | null = null;
  if (options.couponCode) {
    const validation = await validateCoupon(options.couponCode, planId);
    if (!validation.valid || !validation.coupon) {
      throw new Error(validation.reason ?? "Invalid coupon");
    }
    appliedCoupon = validation.coupon;
    discount = validation.discount ?? 0;
  }

  const base = Math.max(0, plan.price - discount);
  const gst = computeGst(base);

  // ── manual payment via provider abstraction (auto-success) ────────────
  const provider = getProvider(options.provider ?? "manual");
  const order = await provider.createOrder({
    amount: gst.total,
    currency: "INR",
    receipt: `sub_${userId}_${Date.now()}`,
    notes: { plan: planId, userId },
  });
  const verification = await provider.verifyPayment({ orderId: order.orderId });

  const paid = verification.verified;
  const paymentStatus = paid ? "paid" : "failed";
  const now = new Date();

  // ── subscription upsert ───────────────────────────────────────────────
  const existing = await db.query.subscriptionsTable.findFirst({
    where: eq(subscriptionsTable.userId, userId),
    orderBy: [desc(subscriptionsTable.createdAt)],
  });
  const endDate = new Date(now.getTime() + plan.durationDays * 86400000);

  let subscription: Subscription;
  if (existing) {
    const [updated] = await db
      .update(subscriptionsTable)
      .set({
        plan: planId,
        status: paid ? "active" : existing.status,
        startDate: paid ? now : existing.startDate,
        endDate: paid ? endDate : existing.endDate,
        paymentGateway: provider.name,
        couponCode: options.couponCode ?? existing.couponCode,
        referralCode: options.referralCode ?? existing.referralCode,
        canceledAt: null,
      })
      .where(eq(subscriptionsTable.id, existing.id))
      .returning();
    subscription = updated!;
  } else {
    const [created] = await db
      .insert(subscriptionsTable)
      .values({
        userId,
        plan: planId,
        status: paid ? "active" : "pending",
        startDate: now,
        endDate,
        paymentGateway: provider.name,
        couponCode: options.couponCode ?? null,
        referralCode: options.referralCode ?? null,
      })
      .returning();
    subscription = created!;
  }

  // ── payment row ───────────────────────────────────────────────────────
  const [payment] = await db
    .insert(paymentsTable)
    .values({
      userId,
      subscriptionId: subscription.id,
      amount: gst.total,
      currency: "INR",
      status: paymentStatus,
      gateway: provider.name,
      gatewayOrderId: order.orderId,
      gatewayPaymentId: verification.providerTxnId,
      paidAt: paid ? now : null,
    })
    .returning();

  // ── provider transaction log ──────────────────────────────────────────
  await db.insert(paymentTransactionsTable).values({
    paymentId: payment!.id,
    provider: provider.name,
    providerTxnId: verification.providerTxnId,
    status: verification.status,
    amount: gst.total,
    rawPayload: verification.rawPayload,
  });

  // ── invoice (GST) ─────────────────────────────────────────────────────
  const billingName =
    options.billingName ?? user.fullName ?? user.email ?? `User ${userId}`;
  const placeOfSupply = options.placeOfSupply ?? DEFAULT_PLACE_OF_SUPPLY;

  let resolvedBillingName = billingName;
  if (!options.billingName && user.role === "student") {
    const profile = await db.query.studentProfilesTable.findFirst({
      where: eq(studentProfilesTable.userId, userId),
    });
    if (profile?.college) resolvedBillingName = billingName;
  }

  const [invoice] = await db
    .insert(invoicesTable)
    .values({
      userId,
      paymentId: payment!.id,
      invoiceNumber: generateInvoiceNumber(payment!.id),
      amount: gst.base,
      tax: gst.tax,
      totalAmount: gst.total,
      gstNumber: options.gstNumber ?? null,
      gstRate: gst.rate,
      placeOfSupply,
      billingName: resolvedBillingName,
    })
    .returning();

  // ── coupon / referral side-effects ────────────────────────────────────
  if (appliedCoupon) {
    await redeemCoupon(appliedCoupon.id, appliedCoupon.timesRedeemed);
  }
  if (options.referralCode) {
    try {
      await applyReferral(options.referralCode, userId);
    } catch (err) {
      logger.warn({ err }, "applyReferral failed (non-fatal)");
    }
  }

  // ── events ────────────────────────────────────────────────────────────
  if (paid) {
    eventBus.emit("subscription.changed", {
      type: "subscription.changed",
      userId,
      plan: planId,
    });
    eventBus.emit("payment.recorded", {
      type: "payment.recorded",
      userId,
      paymentId: payment!.id,
      amount: gst.total,
    });
  } else {
    eventBus.emit("payment.failed", {
      type: "payment.failed",
      userId,
      paymentId: payment!.id,
      reason: "Payment could not be verified",
    });
  }

  return { subscription, payment: payment!, invoice: invoice!, discount };
}

// Renewal reminder helper. Emits trial.expiring; no scheduler is wired here.
export async function sendRenewalReminder(userId: number): Promise<number> {
  const subscription = await db.query.subscriptionsTable.findFirst({
    where: eq(subscriptionsTable.userId, userId),
    orderBy: [desc(subscriptionsTable.createdAt)],
  });
  if (!subscription?.trialEndsAt) return 0;

  const msLeft = subscription.trialEndsAt.getTime() - Date.now();
  const daysLeft = Math.max(0, Math.ceil(msLeft / 86400000));

  eventBus.emit("trial.expiring", {
    type: "trial.expiring",
    userId,
    daysLeft,
  });
  return daysLeft;
}

export async function createCoupon(input: {
  code: string;
  description?: string;
  discountType?: string;
  discountValue: number;
  plan?: string;
  maxRedemptions?: number;
  validFrom?: Date;
  validUntil?: Date;
  isActive?: boolean;
}): Promise<Coupon> {
  const [coupon] = await db
    .insert(couponsTable)
    .values({
      code: input.code.trim().toUpperCase(),
      description: input.description ?? null,
      discountType: input.discountType ?? "percent",
      discountValue: input.discountValue,
      plan: input.plan ?? null,
      maxRedemptions: input.maxRedemptions ?? null,
      validFrom: input.validFrom ?? null,
      validUntil: input.validUntil ?? null,
      isActive: input.isActive ?? true,
    })
    .returning();
  return coupon!;
}

export async function listCoupons(): Promise<Coupon[]> {
  return db
    .select()
    .from(couponsTable)
    .orderBy(desc(couponsTable.createdAt));
}

export async function getActiveSubscription(
  userId: number,
): Promise<Subscription | undefined> {
  return db.query.subscriptionsTable.findFirst({
    where: and(eq(subscriptionsTable.userId, userId)),
    orderBy: [desc(subscriptionsTable.createdAt)],
  });
}
