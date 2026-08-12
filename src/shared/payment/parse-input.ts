/**
 * Payment input canonicalization and parsing (IMP-022).
 *
 * Canonical request fingerprints use explicit semantic fields only —
 * never JSON.stringify of caller input, never caller-supplied money.
 */

import { createHash } from "node:crypto";

import {
  PAYMENT_OPERATION_KINDS,
  SUPPORTED_PAYMENT_METHOD_INTENTS,
  type PaymentOperationKind,
  type SupportedPaymentMethodIntent,
} from "./constants";
import { PaymentError } from "./errors";
import type {
  CancelPaymentInput,
  CompleteZeroPayableInput,
  GetPaymentInput,
  ReconcilePaymentAttemptInput,
  RetryPaymentInput,
  StartPaymentInput,
} from "./types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rejectUnknownKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  context: string,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new PaymentError(
        "PAYMENT_INVALID_INPUT",
        `Unknown field '${key}' is not permitted on ${context}.`,
        { field: key },
      );
    }
  }
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new PaymentError(
      "PAYMENT_INVALID_INPUT",
      `${field} must be a non-empty string.`,
      { field },
    );
  }
  return value.trim();
}

function requireUuid(value: unknown, field: string): string {
  const s = requireNonEmptyString(value, field);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      s,
    )
  ) {
    throw new PaymentError(
      "PAYMENT_INVALID_INPUT",
      `${field} must be a UUID.`,
      { field },
    );
  }
  return s.toLowerCase();
}

function requireExpectedRevision(value: unknown): bigint {
  if (typeof value === "bigint") {
    if (value <= BigInt(0)) {
      throw new PaymentError(
        "PAYMENT_INVALID_INPUT",
        "expectedCheckoutRevision must be a positive integer.",
        { field: "expectedCheckoutRevision" },
      );
    }
    return value;
  }
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return BigInt(value);
  }
  if (typeof value === "string" && /^[1-9][0-9]*$/.test(value)) {
    return BigInt(value);
  }
  throw new PaymentError(
    "PAYMENT_INVALID_INPUT",
    "expectedCheckoutRevision must be a positive integer.",
    { field: "expectedCheckoutRevision" },
  );
}

function requireMethodIntent(value: unknown): SupportedPaymentMethodIntent {
  const s = requireNonEmptyString(value, "paymentMethodIntent");
  if (
    !(SUPPORTED_PAYMENT_METHOD_INTENTS as readonly string[]).includes(s)
  ) {
    throw new PaymentError(
      "PAYMENT_UNSUPPORTED_METHOD",
      "Payment method intent is not supported.",
      { field: "paymentMethodIntent" },
    );
  }
  return s as SupportedPaymentMethodIntent;
}

export function parseStartPaymentInput(input: unknown): StartPaymentInput {
  if (!isPlainObject(input)) {
    throw new PaymentError(
      "PAYMENT_INVALID_INPUT",
      "startPayment input must be an object.",
    );
  }
  rejectUnknownKeys(
    input,
    [
      "checkoutId",
      "expectedCheckoutRevision",
      "paymentMethodIntent",
      "idempotencyKey",
    ],
    "startPayment",
  );
  return Object.freeze({
    checkoutId: requireUuid(input.checkoutId, "checkoutId"),
    expectedCheckoutRevision: requireExpectedRevision(
      input.expectedCheckoutRevision,
    ),
    paymentMethodIntent: requireMethodIntent(input.paymentMethodIntent),
    idempotencyKey: requireNonEmptyString(input.idempotencyKey, "idempotencyKey"),
  });
}

export function parseRetryPaymentInput(input: unknown): RetryPaymentInput {
  if (!isPlainObject(input)) {
    throw new PaymentError(
      "PAYMENT_INVALID_INPUT",
      "retryPayment input must be an object.",
    );
  }
  rejectUnknownKeys(
    input,
    [
      "paymentId",
      "expectedCheckoutRevision",
      "paymentMethodIntent",
      "idempotencyKey",
    ],
    "retryPayment",
  );
  return Object.freeze({
    paymentId: requireUuid(input.paymentId, "paymentId"),
    expectedCheckoutRevision: requireExpectedRevision(
      input.expectedCheckoutRevision,
    ),
    paymentMethodIntent: requireMethodIntent(input.paymentMethodIntent),
    idempotencyKey: requireNonEmptyString(input.idempotencyKey, "idempotencyKey"),
  });
}

export function parseCancelPaymentInput(input: unknown): CancelPaymentInput {
  if (!isPlainObject(input)) {
    throw new PaymentError(
      "PAYMENT_INVALID_INPUT",
      "cancelPayment input must be an object.",
    );
  }
  rejectUnknownKeys(
    input,
    ["paymentId", "expectedCheckoutRevision"],
    "cancelPayment",
  );
  return Object.freeze({
    paymentId: requireUuid(input.paymentId, "paymentId"),
    expectedCheckoutRevision: requireExpectedRevision(
      input.expectedCheckoutRevision,
    ),
  });
}

export function parseGetPaymentInput(input: unknown): GetPaymentInput {
  if (!isPlainObject(input)) {
    throw new PaymentError(
      "PAYMENT_INVALID_INPUT",
      "getPayment input must be an object.",
    );
  }
  rejectUnknownKeys(input, ["paymentId"], "getPayment");
  return Object.freeze({
    paymentId: requireUuid(input.paymentId, "paymentId"),
  });
}

export function parseReconcilePaymentAttemptInput(
  input: unknown,
): ReconcilePaymentAttemptInput {
  if (!isPlainObject(input)) {
    throw new PaymentError(
      "PAYMENT_INVALID_INPUT",
      "reconcilePaymentAttempt input must be an object.",
    );
  }
  rejectUnknownKeys(
    input,
    ["paymentId", "attemptId"],
    "reconcilePaymentAttempt",
  );
  return Object.freeze({
    paymentId: requireUuid(input.paymentId, "paymentId"),
    attemptId: requireUuid(input.attemptId, "attemptId"),
  });
}

export function parseCompleteZeroPayableInput(
  input: unknown,
): CompleteZeroPayableInput {
  if (!isPlainObject(input)) {
    throw new PaymentError(
      "PAYMENT_INVALID_INPUT",
      "completeZeroPayableCheckout input must be an object.",
    );
  }
  rejectUnknownKeys(
    input,
    ["checkoutId", "expectedCheckoutRevision", "idempotencyKey"],
    "completeZeroPayableCheckout",
  );
  return Object.freeze({
    checkoutId: requireUuid(input.checkoutId, "checkoutId"),
    expectedCheckoutRevision: requireExpectedRevision(
      input.expectedCheckoutRevision,
    ),
    idempotencyKey: requireNonEmptyString(input.idempotencyKey, "idempotencyKey"),
  });
}

export function hashPaymentRequestFingerprint(
  operationKind: PaymentOperationKind,
  fields: Readonly<Record<string, string>>,
): string {
  if (!(PAYMENT_OPERATION_KINDS as readonly string[]).includes(operationKind)) {
    throw new PaymentError(
      "PAYMENT_INVALID_INPUT",
      "Unknown payment operation kind for fingerprint.",
    );
  }
  const keys = Object.keys(fields).sort();
  const canonical = [
    `op=${operationKind}`,
    ...keys.map((k) => `${k}=${fields[k]!}`),
  ].join("\n");
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export function startPaymentFingerprint(input: StartPaymentInput): string {
  return hashPaymentRequestFingerprint("start_payment", {
    checkoutId: input.checkoutId,
    expectedCheckoutRevision: input.expectedCheckoutRevision.toString(),
    paymentMethodIntent: input.paymentMethodIntent,
  });
}

export function retryPaymentFingerprint(input: RetryPaymentInput): string {
  return hashPaymentRequestFingerprint("retry_payment", {
    paymentId: input.paymentId,
    expectedCheckoutRevision: input.expectedCheckoutRevision.toString(),
    paymentMethodIntent: input.paymentMethodIntent,
  });
}

export function zeroPayableFingerprint(input: CompleteZeroPayableInput): string {
  return hashPaymentRequestFingerprint("complete_zero_payable", {
    checkoutId: input.checkoutId,
    expectedCheckoutRevision: input.expectedCheckoutRevision.toString(),
  });
}
