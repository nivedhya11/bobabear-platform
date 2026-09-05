/**
 * Safe mapping for Order Refund idempotent replay authorization failures.
 *
 * Expected unauthorized / not-found outcomes stay non-disclosing.
 * Unexpected infrastructure or programming failures must not be masked as
 * REFUND_NOT_FOUND.
 */
import "server-only";

import { RefundError } from "../../shared/refund";

export function throwMappedOrderRefundReplayAuthorizationFailure(error: unknown): never {
  if (error instanceof RefundError) {
    if (error.code === "REFUND_UNAUTHORIZED") {
      throw error;
    }
    if (error.code === "REFUND_NOT_FOUND") {
      throw new RefundError("REFUND_NOT_FOUND", "Refund not found.");
    }
  }
  throw error;
}
