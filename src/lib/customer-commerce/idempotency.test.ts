import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearPaymentRecovery,
  newCommerceIdempotencyKey,
  readOrCreateRetryIdempotencyKey,
  readOrCreateStartIdempotencyKey,
  readOrCreateZeroPayableIdempotencyKey,
  readPaymentRecovery,
  rememberPaymentRecovery,
} from "./idempotency";

afterEach(() => {
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("payment idempotency keys", () => {
  it("creates UUID keys compatible with browser crypto", () => {
    const key = newCommerceIdempotencyKey();
    expect(key).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("reuses the same start key for duplicate customer actions", () => {
    const first = readOrCreateStartIdempotencyKey({
      checkoutId: "chk-1",
      checkoutRevision: "3",
      paymentMethodIntent: "upi",
    });
    const second = readOrCreateStartIdempotencyKey({
      checkoutId: "chk-1",
      checkoutRevision: "3",
      paymentMethodIntent: "upi",
    });
    expect(second).toBe(first);
  });

  it("issues a new key when the logical start action changes", () => {
    const upi = readOrCreateStartIdempotencyKey({
      checkoutId: "chk-1",
      checkoutRevision: "3",
      paymentMethodIntent: "upi",
    });
    const card = readOrCreateStartIdempotencyKey({
      checkoutId: "chk-1",
      checkoutRevision: "3",
      paymentMethodIntent: "card",
    });
    const nextRevision = readOrCreateStartIdempotencyKey({
      checkoutId: "chk-1",
      checkoutRevision: "4",
      paymentMethodIntent: "upi",
    });
    expect(card).not.toBe(upi);
    expect(nextRevision).not.toBe(upi);
  });

  it("reuses retry keys for the same attempt and creates a new key for a later attempt", () => {
    const first = readOrCreateRetryIdempotencyKey({
      paymentId: "pay-1",
      attemptId: "att-1",
      checkoutRevision: "4",
      paymentMethodIntent: "upi",
    });
    const duplicate = readOrCreateRetryIdempotencyKey({
      paymentId: "pay-1",
      attemptId: "att-1",
      checkoutRevision: "4",
      paymentMethodIntent: "upi",
    });
    const nextAttempt = readOrCreateRetryIdempotencyKey({
      paymentId: "pay-1",
      attemptId: "att-2",
      checkoutRevision: "4",
      paymentMethodIntent: "upi",
    });
    expect(duplicate).toBe(first);
    expect(nextAttempt).not.toBe(first);
  });

  it("keeps zero-payable completion keys stable for the same checkout revision", () => {
    const first = readOrCreateZeroPayableIdempotencyKey({
      checkoutId: "chk-1",
      checkoutRevision: "3",
    });
    const duplicate = readOrCreateZeroPayableIdempotencyKey({
      checkoutId: "chk-1",
      checkoutRevision: "3",
    });
    expect(duplicate).toBe(first);
  });

  it("persists payment recovery state for return-to-flow", () => {
    rememberPaymentRecovery({
      paymentId: "pay-1",
      checkoutId: "chk-1",
      checkoutRevision: "4",
    });
    expect(readPaymentRecovery()).toEqual({
      paymentId: "pay-1",
      checkoutId: "chk-1",
      checkoutRevision: "4",
    });
    clearPaymentRecovery();
    expect(readPaymentRecovery()).toBeNull();
  });
});
