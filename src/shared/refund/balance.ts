/**
 * Refund remaining-balance formula (IMP-027 §8).
 *
 * remainingRefundableAmount =
 *   capturedAmount - successfulRefundedAmount - reservedRefundAmount
 *
 * PROCESSED counts once as successful. FAILED is released. INDETERMINATE stays reserved.
 */
import {
  REFUND_RESERVED_STATUSES,
  type RefundReservedStatus,
  type RefundStatus,
} from "./constants";

export type RefundAmountRow = Readonly<{
  amountPaise: bigint;
  status: RefundStatus;
}>;

export type RefundBalance = Readonly<{
  capturedAmount: bigint;
  successfulRefundedAmount: bigint;
  reservedRefundAmount: bigint;
  remainingRefundableAmount: bigint;
  fullyRefunded: boolean;
}>;

export function isReservedRefundStatus(status: RefundStatus): status is RefundReservedStatus {
  return (REFUND_RESERVED_STATUSES as readonly string[]).includes(status);
}

export function computeRefundBalance(
  capturedAmount: bigint,
  rows: readonly RefundAmountRow[],
): RefundBalance {
  let successfulRefundedAmount = BigInt(0);
  let reservedRefundAmount = BigInt(0);
  for (const row of rows) {
    if (row.status === "PROCESSED") {
      successfulRefundedAmount += row.amountPaise;
    } else if (isReservedRefundStatus(row.status)) {
      reservedRefundAmount += row.amountPaise;
    }
  }
  const remainingRefundableAmount =
    capturedAmount - successfulRefundedAmount - reservedRefundAmount;
  return Object.freeze({
    capturedAmount,
    successfulRefundedAmount,
    reservedRefundAmount,
    remainingRefundableAmount,
    fullyRefunded:
      remainingRefundableAmount === BigInt(0) && reservedRefundAmount === BigInt(0),
  });
}
