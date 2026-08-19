/**
 * Durable Razorpay refund idempotency identity (IMP-027 §12).
 *
 * Deterministic from BOBA Refund ID. Never regenerated on retry.
 */
import { REFUND_IDEMPOTENCY_PREFIX } from "./constants";

export function refundProviderIdempotencyKey(refundId: string): string {
  return `${REFUND_IDEMPOTENCY_PREFIX}${refundId.replace(/-/g, "")}`;
}
