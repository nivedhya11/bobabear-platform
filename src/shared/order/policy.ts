/**
 * Order policy helpers (IMP-023).
 */

import { OrderError } from "./errors";
import type { OrderPolicy } from "./types";

export function requireOrderPolicy(
  policy: OrderPolicy | null | undefined,
): OrderPolicy {
  if (!policy || typeof policy !== "object") {
    throw new OrderError(
      "ORDER_POLICY_INVALID",
      "OrderPolicy is required.",
      { field: "policy" },
    );
  }
  const { orderNumberMaxAttempts, recoveryBatchSize } = policy;
  if (
    typeof orderNumberMaxAttempts !== "number" ||
    !Number.isInteger(orderNumberMaxAttempts) ||
    orderNumberMaxAttempts < 1
  ) {
    throw new OrderError(
      "ORDER_POLICY_INVALID",
      "orderNumberMaxAttempts must be a positive integer.",
      { field: "orderNumberMaxAttempts" },
    );
  }
  if (
    typeof recoveryBatchSize !== "number" ||
    !Number.isInteger(recoveryBatchSize) ||
    recoveryBatchSize < 1
  ) {
    throw new OrderError(
      "ORDER_POLICY_INVALID",
      "recoveryBatchSize must be a positive integer.",
      { field: "recoveryBatchSize" },
    );
  }
  return Object.freeze({
    orderNumberMaxAttempts,
    recoveryBatchSize,
  });
}
