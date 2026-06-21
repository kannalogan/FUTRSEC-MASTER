import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { paymentsTable, invoicesTable } from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import {
  PLANS,
  getPlan,
  startTrial,
  changePlan,
  validateCoupon,
  createCoupon,
  listCoupons,
  getActiveSubscription,
  TrackMismatchError,
  type ChangePlanOptions,
} from "../lib/billing";
import { NotConfiguredError } from "../lib/payments/provider";
import { logger } from "../lib/logger";

const router = Router();

// ── GET /subscription/plans ──────────────────────────────────────────────
router.get("/subscription/plans", requireAuth, async (_req: AuthRequest, res): Promise<void> => {
  res.json({ plans: Object.values(PLANS) });
});

// ── GET /subscription/me ─────────────────────────────────────────────────
router.get("/subscription/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const subscription = await getActiveSubscription(req.user.userId);
  const plan = subscription ? getPlan(subscription.plan) : null;
  res.json({ subscription: subscription ?? null, plan });
});

// ── POST /subscription/start-trial ───────────────────────────────────────
router.post("/subscription/start-trial", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  try {
    const result = await startTrial(req.user.userId);
    if (result.alreadyOnTrial) {
      res.status(409).json({
        error: "Trial already used",
        code: "TRIAL_ALREADY_USED",
        subscription: result.subscription,
      });
      return;
    }
    res.status(201).json({ subscription: result.subscription });
  } catch (err) {
    logger.error({ err }, "start-trial failed");
    res.status(500).json({ error: "Failed to start trial" });
  }
});

// ── POST /subscription/change ────────────────────────────────────────────
router.post("/subscription/change", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const body = req.body as {
    plan?: string;
    couponCode?: string;
    referralCode?: string;
    billingName?: string;
    gstNumber?: string;
    placeOfSupply?: string;
  };

  if (!body.plan || typeof body.plan !== "string") {
    res.status(400).json({ error: "plan is required" });
    return;
  }
  const plan = getPlan(body.plan);
  if (!plan) {
    res.status(400).json({ error: "Unknown plan" });
    return;
  }
  if (plan.isTrial) {
    res.status(400).json({ error: "Use /subscription/start-trial for trial plans" });
    return;
  }

  const options: ChangePlanOptions = {};
  if (body.couponCode) options.couponCode = body.couponCode;
  if (body.referralCode) options.referralCode = body.referralCode;
  if (body.billingName) options.billingName = body.billingName;
  if (body.gstNumber) options.gstNumber = body.gstNumber;
  if (body.placeOfSupply) options.placeOfSupply = body.placeOfSupply;

  try {
    const result = await changePlan(req.user.userId, body.plan, options);
    res.status(201).json({
      subscription: result.subscription,
      payment: result.payment,
      invoice: result.invoice,
      discount: result.discount,
    });
  } catch (err) {
    if (err instanceof TrackMismatchError) {
      res.status(403).json({ error: err.message, code: err.code });
      return;
    }
    if (err instanceof NotConfiguredError) {
      res.status(400).json({ error: err.message, code: err.code });
      return;
    }
    const message = err instanceof Error ? err.message : "Failed to change plan";
    logger.error({ err }, "change plan failed");
    res.status(400).json({ error: message });
  }
});

// ── GET /subscription/payments ───────────────────────────────────────────
router.get("/subscription/payments", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const payments = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.userId, req.user.userId))
    .orderBy(desc(paymentsTable.createdAt));
  res.json({ payments });
});

// ── GET /subscription/invoices ───────────────────────────────────────────
router.get("/subscription/invoices", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const invoices = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.userId, req.user.userId))
    .orderBy(desc(invoicesTable.createdAt));
  res.json({ invoices });
});

// ── POST /subscription/coupons/validate ──────────────────────────────────
router.post("/subscription/coupons/validate", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const body = req.body as { code?: string; plan?: string };
  if (!body.code || typeof body.code !== "string") {
    res.status(400).json({ error: "code is required" });
    return;
  }
  const validation = await validateCoupon(body.code, body.plan);
  res.json(validation);
});

// ── Admin: POST /subscription/coupons ────────────────────────────────────
router.post("/subscription/coupons", requireAuth, requireRole("admin"), async (req: AuthRequest, res): Promise<void> => {
  const body = req.body as {
    code?: string;
    description?: string;
    discountType?: string;
    discountValue?: number;
    plan?: string;
    maxRedemptions?: number;
    validFrom?: string;
    validUntil?: string;
    isActive?: boolean;
  };

  if (!body.code || typeof body.code !== "string") {
    res.status(400).json({ error: "code is required" });
    return;
  }
  if (typeof body.discountValue !== "number") {
    res.status(400).json({ error: "discountValue is required" });
    return;
  }
  if (body.discountType && !["percent", "fixed"].includes(body.discountType)) {
    res.status(400).json({ error: "discountType must be 'percent' or 'fixed'" });
    return;
  }

  try {
    const input: Parameters<typeof createCoupon>[0] = {
      code: body.code,
      discountValue: body.discountValue,
    };
    if (body.description) input.description = body.description;
    if (body.discountType) input.discountType = body.discountType;
    if (body.plan) input.plan = body.plan;
    if (typeof body.maxRedemptions === "number") input.maxRedemptions = body.maxRedemptions;
    if (body.validFrom) input.validFrom = new Date(body.validFrom);
    if (body.validUntil) input.validUntil = new Date(body.validUntil);
    if (typeof body.isActive === "boolean") input.isActive = body.isActive;

    const coupon = await createCoupon(input);
    res.status(201).json({ coupon });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create coupon";
    logger.error({ err }, "create coupon failed");
    res.status(400).json({ error: message });
  }
});

// ── Admin: GET /subscription/coupons ─────────────────────────────────────
router.get("/subscription/coupons", requireAuth, requireRole("admin"), async (_req: AuthRequest, res): Promise<void> => {
  const coupons = await listCoupons();
  res.json({ coupons });
});

export default router;
