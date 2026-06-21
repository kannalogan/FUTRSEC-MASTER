import { logger } from "../logger";

// Provider-agnostic payment abstraction. Phase 5A ships only the "manual"
// provider (auto-success, no real money movement). The stripe/razorpay
// providers are stubbed and throw NotConfiguredError until Phase 5B wires
// the real gateways. NO real gateway network calls happen here.

export interface CreateOrderInput {
  amount: number; // smallest currency unit (paise for INR)
  currency?: string;
  receipt?: string;
  notes?: Record<string, unknown>;
}

export interface OrderResult {
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
}

export interface VerifyPaymentInput {
  orderId: string;
  paymentId?: string;
  signature?: string;
}

export interface VerifyPaymentResult {
  verified: boolean;
  providerTxnId: string;
  status: string;
  rawPayload: Record<string, unknown>;
}

export interface RefundInput {
  providerTxnId: string;
  amount?: number;
}

export interface RefundResult {
  refunded: boolean;
  refundId: string;
  status: string;
}

export interface PaymentProvider {
  readonly name: string;
  createOrder(input: CreateOrderInput): Promise<OrderResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;
  refund(input: RefundInput): Promise<RefundResult>;
}

export class NotConfiguredError extends Error {
  code = "PROVIDER_NOT_CONFIGURED";
  constructor(provider: string) {
    super(
      `Payment provider "${provider}" is not configured. Real gateways are out of scope in Phase 5A.`,
    );
    this.name = "NotConfiguredError";
  }
}

function randomId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 12);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}

// Manual provider: every order/payment succeeds immediately. Used for the
// in-house manual checkout flow (admin/trial/upgrade) with no gateway.
class ManualPaymentProvider implements PaymentProvider {
  readonly name = "manual";

  async createOrder(input: CreateOrderInput): Promise<OrderResult> {
    const orderId = randomId("order");
    logger.info(
      { provider: this.name, orderId, amount: input.amount },
      "Manual order created",
    );
    return {
      orderId,
      amount: input.amount,
      currency: input.currency ?? "INR",
      status: "created",
      provider: this.name,
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    const providerTxnId = input.paymentId ?? randomId("pay");
    logger.info(
      { provider: this.name, orderId: input.orderId, providerTxnId },
      "Manual payment auto-verified",
    );
    return {
      verified: true,
      providerTxnId,
      status: "success",
      rawPayload: {
        provider: this.name,
        orderId: input.orderId,
        paymentId: providerTxnId,
        verifiedAt: new Date().toISOString(),
      },
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const refundId = randomId("rfnd");
    logger.info(
      { provider: this.name, providerTxnId: input.providerTxnId, refundId },
      "Manual refund processed",
    );
    return { refunded: true, refundId, status: "refunded" };
  }
}

// Stub gateway: throws until Phase 5B configures real credentials.
class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe";
  async createOrder(): Promise<OrderResult> {
    throw new NotConfiguredError(this.name);
  }
  async verifyPayment(): Promise<VerifyPaymentResult> {
    throw new NotConfiguredError(this.name);
  }
  async refund(): Promise<RefundResult> {
    throw new NotConfiguredError(this.name);
  }
}

class RazorpayPaymentProvider implements PaymentProvider {
  readonly name = "razorpay";
  async createOrder(): Promise<OrderResult> {
    throw new NotConfiguredError(this.name);
  }
  async verifyPayment(): Promise<VerifyPaymentResult> {
    throw new NotConfiguredError(this.name);
  }
  async refund(): Promise<RefundResult> {
    throw new NotConfiguredError(this.name);
  }
}

const PROVIDERS: Record<string, PaymentProvider> = {
  manual: new ManualPaymentProvider(),
  stripe: new StripePaymentProvider(),
  razorpay: new RazorpayPaymentProvider(),
};

export function getProvider(name?: string): PaymentProvider {
  const key = (name ?? "manual").toLowerCase();
  const provider = PROVIDERS[key];
  if (!provider) {
    throw new NotConfiguredError(key);
  }
  return provider;
}
