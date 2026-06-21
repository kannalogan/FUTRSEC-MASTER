import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// ─── Types (mirror routes/subscription.ts + lib/billing.ts) ──────────────────
export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number; // base in paise, GST-exclusive
  durationDays: number;
  isTrial: boolean;
  careerTrack: "soc" | "vapt" | "grc" | null;
  features: string[];
}

export interface Subscription {
  id: number;
  userId: number;
  plan: string;
  status: string;
  startDate: string;
  endDate: string | null;
  paymentGateway: string | null;
  externalSubId: string | null;
  trialEndsAt: string | null;
  autoRenew: boolean;
  couponCode: string | null;
  referralCode: string | null;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: number;
  userId: number;
  subscriptionId: number | null;
  amount: number;
  currency: string;
  status: string;
  gateway: string;
  gatewayOrderId: string | null;
  gatewayPaymentId: string | null;
  failureReason: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface Invoice {
  id: number;
  userId: number;
  paymentId: number;
  invoiceNumber: string;
  amount: number;
  tax: number;
  totalAmount: number;
  s3Key: string | null;
  gstNumber: string | null;
  gstRate: number | null;
  placeOfSupply: string | null;
  billingName: string | null;
  issuedAt: string;
  createdAt: string;
}

export interface Coupon {
  id: number;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  plan: string | null;
  maxRedemptions: number | null;
  timesRedeemed: number;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CouponValidation {
  valid: boolean;
  reason?: string;
  coupon?: Coupon;
  baseAmount?: number;
  discount?: number;
  finalAmount?: number;
}

export interface ChangePlanBody {
  plan: string;
  couponCode?: string;
  referralCode?: string;
  billingName?: string;
  gstNumber?: string;
  placeOfSupply?: string;
}

export interface ChangePlanResult {
  subscription: Subscription;
  payment: Payment;
  invoice: Invoice;
  discount: number;
}

export interface CreateCouponBody {
  code: string;
  description?: string;
  discountType?: string;
  discountValue: number;
  plan?: string;
  maxRedemptions?: number;
  validFrom?: string;
  validUntil?: string;
  isActive?: boolean;
}

// ─── Keys ───────────────────────────────────────────────────────────────────
export const subscriptionKeys = {
  all: ["subscription"] as const,
  me: ["subscription", "me"] as const,
  plans: ["subscription", "plans"] as const,
  payments: ["subscription", "payments"] as const,
  invoices: ["subscription", "invoices"] as const,
  coupons: ["subscription", "coupons"] as const,
};

// ─── Queries ────────────────────────────────────────────────────────────────
export function useSubscriptionMe() {
  return useQuery({
    queryKey: subscriptionKeys.me,
    queryFn: () =>
      apiFetch<{ subscription: Subscription | null; plan: Plan | null }>("/api/subscription/me"),
  });
}

export function usePlans() {
  return useQuery({
    queryKey: subscriptionKeys.plans,
    queryFn: () => apiFetch<{ plans: Plan[] }>("/api/subscription/plans"),
  });
}

export function useSubscriptionPayments() {
  return useQuery({
    queryKey: subscriptionKeys.payments,
    queryFn: () => apiFetch<{ payments: Payment[] }>("/api/subscription/payments"),
  });
}

export function useSubscriptionInvoices() {
  return useQuery({
    queryKey: subscriptionKeys.invoices,
    queryFn: () => apiFetch<{ invoices: Invoice[] }>("/api/subscription/invoices"),
  });
}

export function useCoupons() {
  return useQuery({
    queryKey: subscriptionKeys.coupons,
    queryFn: () => apiFetch<{ coupons: Coupon[] }>("/api/subscription/coupons"),
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────
export function useStartTrial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ subscription: Subscription }>("/api/subscription/start-trial", {
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: subscriptionKeys.all });
    },
  });
}

export function useChangePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ChangePlanBody) =>
      apiFetch<ChangePlanResult>("/api/subscription/change", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: subscriptionKeys.all });
    },
  });
}

export function useValidateCoupon() {
  return useMutation({
    mutationFn: (body: { code: string; plan?: string }) =>
      apiFetch<CouponValidation>("/api/subscription/coupons/validate", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}

export function useCreateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCouponBody) =>
      apiFetch<{ coupon: Coupon }>("/api/subscription/coupons", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: subscriptionKeys.coupons });
    },
  });
}
