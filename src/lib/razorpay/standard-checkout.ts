/**
 * Isolated Razorpay Standard Checkout browser adapter (IMP-026B).
 *
 * Generic Payment UX must not parse Razorpay fields directly.
 */
import type { CommerceClientAction } from "@/lib/customer-commerce";

import {
  RAZORPAY_STANDARD_CHECKOUT_KIND,
  type RazorpayCheckoutHandlerResponse,
  type RazorpayCheckoutInstance,
  type RazorpayStandardCheckoutAction,
} from "./types";

const SECRET_KEY_PATTERN = /(secret|webhook.?secret|key.?secret)/i;

export type ParseRazorpayCheckoutResult =
  | Readonly<{ ok: true; value: RazorpayStandardCheckoutAction }>
  | Readonly<{ ok: false; reason: "unsupported" | "malformed" | "secret" }>;

function readRequired(payload: Readonly<Record<string, string>>, key: string): string | null {
  const value = payload[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseRazorpayStandardCheckoutAction(
  action: CommerceClientAction | undefined,
): ParseRazorpayCheckoutResult {
  if (!action || action.kind !== RAZORPAY_STANDARD_CHECKOUT_KIND) {
    return Object.freeze({ ok: false, reason: "unsupported" });
  }
  const payload = action.payload ?? {};
  for (const key of Object.keys(payload)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      return Object.freeze({ ok: false, reason: "secret" });
    }
  }

  const keyId = readRequired(payload, "keyId");
  const razorpayOrderId = readRequired(payload, "razorpayOrderId");
  const amountPaise = readRequired(payload, "amountPaise");
  const currency = readRequired(payload, "currency");
  const paymentId = readRequired(payload, "paymentId");
  const attemptId = readRequired(payload, "attemptId");
  if (!keyId || !razorpayOrderId || !amountPaise || !currency || !paymentId || !attemptId) {
    return Object.freeze({ ok: false, reason: "malformed" });
  }
  if (!/^\d+$/.test(amountPaise) || currency !== "INR") {
    return Object.freeze({ ok: false, reason: "malformed" });
  }

  return Object.freeze({
    ok: true,
    value: Object.freeze({
      keyId,
      razorpayOrderId,
      amountPaise,
      currency,
      paymentId,
      attemptId,
    }),
  });
}

export type OpenRazorpayStandardCheckoutInput = Readonly<{
  action: RazorpayStandardCheckoutAction;
  display?: Readonly<{
    name?: string;
    description?: string;
    image?: string;
  }>;
  prefill?: Readonly<{
    name?: string;
    contact?: string;
  }>;
  onHandler: (evidence: RazorpayCheckoutHandlerResponse) => void;
  onDismiss: () => void;
  onProviderFailure: () => void;
}>;

export function readRazorpayHandlerEvidence(
  response: RazorpayCheckoutHandlerResponse | null | undefined,
): RazorpayCheckoutHandlerResponse | null {
  if (!response) return null;
  const razorpay_payment_id = String(response.razorpay_payment_id ?? "").trim();
  const razorpay_order_id = String(response.razorpay_order_id ?? "").trim();
  const razorpay_signature = String(response.razorpay_signature ?? "").trim();
  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) return null;
  return Object.freeze({ razorpay_payment_id, razorpay_order_id, razorpay_signature });
}

export function openRazorpayStandardCheckout(
  input: OpenRazorpayStandardCheckoutInput,
): RazorpayCheckoutInstance {
  if (typeof window === "undefined" || typeof window.Razorpay !== "function") {
    throw new Error("Razorpay Checkout is unavailable.");
  }

  const rzp = new window.Razorpay({
    key: input.action.keyId,
    amount: input.action.amountPaise,
    currency: input.action.currency,
    order_id: input.action.razorpayOrderId,
    name: input.display?.name,
    description: input.display?.description,
    image: input.display?.image,
    ...(input.prefill ? { prefill: input.prefill } : {}),
    retry: { enabled: false },
    handler: (response) => {
      const evidence = readRazorpayHandlerEvidence(response);
      if (!evidence) return;
      input.onHandler(evidence);
    },
    modal: {
      ondismiss: () => {
        input.onDismiss();
      },
    },
  });
  rzp.on("payment.failed", () => {
    input.onProviderFailure();
  });
  rzp.open();
  return rzp;
}
