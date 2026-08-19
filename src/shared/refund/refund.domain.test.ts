/**
 * Pure Refund domain tests (IMP-027 RF lifecycle / balance / reason).
 */
import { describe, expect, it } from "vitest";

import {
  computeRefundBalance,
  isAllowedRefundTransition,
  normalizeRefundOperatorNote,
  normalizeRefundReason,
  refundProviderIdempotencyKey,
  RefundError,
} from "./index";

describe("refund lifecycle", () => {
  it("allows locked transitions and never regresses PROCESSED", () => {
    expect(isAllowedRefundTransition("ACCEPTED", "PENDING")).toBe(true);
    expect(isAllowedRefundTransition("ACCEPTED", "INDETERMINATE")).toBe(true);
    expect(isAllowedRefundTransition("ACCEPTED", "PROCESSED")).toBe(true);
    expect(isAllowedRefundTransition("ACCEPTED", "FAILED")).toBe(true);
    expect(isAllowedRefundTransition("PENDING", "PROCESSED")).toBe(true);
    expect(isAllowedRefundTransition("PENDING", "FAILED")).toBe(true);
    expect(isAllowedRefundTransition("PENDING", "INDETERMINATE")).toBe(true);
    expect(isAllowedRefundTransition("INDETERMINATE", "PENDING")).toBe(true);
    expect(isAllowedRefundTransition("INDETERMINATE", "PROCESSED")).toBe(true);
    expect(isAllowedRefundTransition("INDETERMINATE", "FAILED")).toBe(true);
    expect(isAllowedRefundTransition("FAILED", "PROCESSED")).toBe(true);
    expect(isAllowedRefundTransition("PROCESSED", "PENDING")).toBe(false);
    expect(isAllowedRefundTransition("PROCESSED", "FAILED")).toBe(false);
    expect(isAllowedRefundTransition("PROCESSED", "ACCEPTED")).toBe(false);
    expect(isAllowedRefundTransition("FAILED", "PENDING")).toBe(false);
    expect(isAllowedRefundTransition("PROCESSED", "PROCESSED")).toBe(true);
  });
});

describe("refund balance", () => {
  it("does not double-count PROCESSED as reserved", () => {
    const balance = computeRefundBalance(BigInt(100000), [
      { amountPaise: BigInt(20000), status: "PROCESSED" },
      { amountPaise: BigInt(10000), status: "PENDING" },
      { amountPaise: BigInt(5000), status: "FAILED" },
    ]);
    expect(balance.successfulRefundedAmount).toBe(BigInt(20000));
    expect(balance.reservedRefundAmount).toBe(BigInt(10000));
    expect(balance.remainingRefundableAmount).toBe(BigInt(70000));
    expect(balance.fullyRefunded).toBe(false);
  });

  it("keeps INDETERMINATE reserved", () => {
    const balance = computeRefundBalance(BigInt(100000), [
      { amountPaise: BigInt(40000), status: "INDETERMINATE" },
    ]);
    expect(balance.reservedRefundAmount).toBe(BigInt(40000));
    expect(balance.remainingRefundableAmount).toBe(BigInt(60000));
  });
});

describe("refund reason", () => {
  it("requires a trimmed reason of at most 500 characters", () => {
    expect(normalizeRefundReason("  customer complaint  ")).toBe("customer complaint");
    expect(() => normalizeRefundReason("   ")).toThrow(RefundError);
    expect(() => normalizeRefundReason("a".repeat(501))).toThrow(RefundError);
    expect(normalizeRefundOperatorNote("  ")).toBeNull();
    expect(normalizeRefundOperatorNote(undefined)).toBeNull();
  });
});

describe("refund idempotency identity", () => {
  it("is deterministic from the BOBA Refund UUID without hyphens", () => {
    const id = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    expect(refundProviderIdempotencyKey(id)).toBe("boba_rfnd_aaaaaaaabbbb4ccc8dddeeeeeeeeeeee");
    expect(refundProviderIdempotencyKey(id)).toBe(refundProviderIdempotencyKey(id));
  });
});
