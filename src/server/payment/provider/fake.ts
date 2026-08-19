/**
 * Controllable in-memory fake Payment provider for tests (IMP-022).
 *
 * Never a real gateway SDK. Webhook verification uses a test-only shared
 * secret and the `x-fake-payment-signature` header.
 */

import { createHash, timingSafeEqual } from "node:crypto";

import {
  PAYMENT_FAKE_PROVIDER,
  PaymentError,
  RAZORPAY_STANDARD_CHECKOUT_KIND,
  type NormalizedProviderEvidence,
} from "../../../shared/payment";
import type { NormalizedRefundEvidence } from "../../../shared/refund";
import type {
  PaymentProvider,
  PaymentProviderCancelExecutionInput,
  PaymentProviderCreateExecutionInput,
  PaymentProviderCreateRefundInput,
  PaymentProviderQueryExecutionInput,
  PaymentProviderQueryRefundInput,
  PaymentProviderVerifyClientEvidenceInput,
  PaymentProviderVerifyWebhookInput,
  PaymentProviderWebhookEvidence,
} from "./types";

export type FakePaymentOutcome =
  | "succeed"
  | "fail"
  | "pending"
  | "indeterminate"
  | "client_action"
  | "razorpay_standard_checkout"
  | "cancelled";

export const FAKE_PAYMENT_WEBHOOK_SECRET = "test-fake-webhook-secret";
export const FAKE_PAYMENT_SIGNATURE_HEADER = "x-fake-payment-signature";

type StoredExecution = Readonly<{
  executionIdentity: string;
  amountPaise: bigint;
  currency: "INR";
  methodIntent: string;
  paymentId: string;
  attemptId: string;
  outcome: FakePaymentOutcome;
  createdAt: Date;
}>;

function digestBody(secret: string, rawBody: Uint8Array): string {
  const bodyText = Buffer.from(rawBody).toString("utf8");
  return createHash("sha256")
    .update(`${secret}:${bodyText}`, "utf8")
    .digest("hex");
}

function evidenceFor(
  stored: StoredExecution,
  overrides?: Partial<NormalizedProviderEvidence>,
): NormalizedProviderEvidence {
  const base: NormalizedProviderEvidence = {
    provider: PAYMENT_FAKE_PROVIDER,
    providerExecutionIdentity: stored.executionIdentity,
    observedAmountPaise: stored.amountPaise,
    observedCurrency: stored.currency,
    providerStatusCode: null,
    providerTimestamp: stored.createdAt,
    providerEventId: null,
    payloadDigest: null,
    outcome: "PENDING",
  };

  switch (stored.outcome) {
    case "succeed":
      return Object.freeze({
        ...base,
        outcome: "SUCCEEDED",
        providerStatusCode: "SUCCESS",
        ...overrides,
      });
    case "fail":
      return Object.freeze({
        ...base,
        outcome: "DEFINITIVE_FAILURE",
        providerStatusCode: "FAILED",
        ...overrides,
      });
    case "cancelled":
      return Object.freeze({
        ...base,
        outcome: "DEFINITIVE_CANCELLED",
        providerStatusCode: "CANCELLED",
        ...overrides,
      });
    case "indeterminate":
      return Object.freeze({
        ...base,
        outcome: "INDETERMINATE",
        providerStatusCode: "UNKNOWN",
        ...overrides,
      });
    case "client_action":
      return Object.freeze({
        ...base,
        outcome: "CLIENT_ACTION_REQUIRED",
        providerStatusCode: "ACTION_REQUIRED",
        clientAction: Object.freeze({
          kind: "redirect",
          payload: Object.freeze({
            url: `https://fake-payments.test/pay/${stored.executionIdentity}`,
          }),
        }),
        ...overrides,
      });
    case "razorpay_standard_checkout":
      return Object.freeze({
        ...base,
        outcome: "CLIENT_ACTION_REQUIRED",
        providerStatusCode: "ACTION_REQUIRED",
        clientAction: Object.freeze({
          kind: RAZORPAY_STANDARD_CHECKOUT_KIND,
          payload: Object.freeze({
            keyId: "rzp_test_fake_e2e",
            razorpayOrderId: `order_fake_${stored.attemptId}`,
            amountPaise: stored.amountPaise.toString(10),
            currency: stored.currency,
            paymentId: stored.paymentId,
            attemptId: stored.attemptId,
          }),
        }),
        ...overrides,
      });
    case "pending":
    default:
      return Object.freeze({
        ...base,
        outcome: "PENDING",
        providerStatusCode: "PENDING",
        ...overrides,
      });
  }
}

export type FakeRefundOutcome = "processed" | "pending" | "failed" | "indeterminate";

type StoredRefund = Readonly<{
  refundId: string;
  providerPaymentId: string;
  amountPaise: bigint;
  currency: "INR";
  idempotencyKey: string;
  providerRefundId: string;
  outcome: FakeRefundOutcome;
}>;

export type FakePaymentProvider = PaymentProvider &
  Readonly<{
    setOutcome(executionIdentity: string, outcome: FakePaymentOutcome): void;
    setDefaultOutcome(outcome: FakePaymentOutcome): void;
    getExecution(executionIdentity: string): StoredExecution | null;
    clear(): void;
    computeWebhookSignature(rawBody: Uint8Array): string;
    setRefundOutcome(outcome: FakeRefundOutcome): void;
    setCreateRefundHook(
      hook: ((input: PaymentProviderCreateRefundInput) => Promise<void> | void) | null,
    ): void;
    readonly createExecutionCallCount: number;
    readonly queryExecutionCallCount: number;
    readonly cancelExecutionCallCount: number;
    readonly createRefundCallCount: number;
    readonly queryRefundCallCount: number;
  }>;

export function createFakePaymentProvider(options?: {
  webhookSecret?: string;
  defaultOutcome?: FakePaymentOutcome;
}): FakePaymentProvider {
  const webhookSecret = options?.webhookSecret ?? FAKE_PAYMENT_WEBHOOK_SECRET;
  const executions = new Map<string, StoredExecution>();
  const refundsByKey = new Map<string, StoredRefund>();
  let defaultOutcome: FakePaymentOutcome = options?.defaultOutcome ?? "pending";
  let defaultRefundOutcome: FakeRefundOutcome = "processed";
  let createExecutionCallCount = 0;
  let queryExecutionCallCount = 0;
  let cancelExecutionCallCount = 0;
  let createRefundCallCount = 0;
  let queryRefundCallCount = 0;
  let createRefundHook: ((input: PaymentProviderCreateRefundInput) => Promise<void> | void) | null =
    null;
  let refundSeq = 1;

  const provider: FakePaymentProvider = {
    name: PAYMENT_FAKE_PROVIDER,

    get createExecutionCallCount(): number {
      return createExecutionCallCount;
    },
    get queryExecutionCallCount(): number {
      return queryExecutionCallCount;
    },
    get cancelExecutionCallCount(): number {
      return cancelExecutionCallCount;
    },
    get createRefundCallCount(): number {
      return createRefundCallCount;
    },
    get queryRefundCallCount(): number {
      return queryRefundCallCount;
    },

    setRefundOutcome(outcome: FakeRefundOutcome): void {
      defaultRefundOutcome = outcome;
      for (const [key, row] of refundsByKey) {
        refundsByKey.set(key, Object.freeze({ ...row, outcome }));
      }
    },

    setCreateRefundHook(
      hook: ((input: PaymentProviderCreateRefundInput) => Promise<void> | void) | null,
    ): void {
      createRefundHook = hook;
    },

    setDefaultOutcome(outcome: FakePaymentOutcome): void {
      defaultOutcome = outcome;
    },

    setOutcome(executionIdentity: string, outcome: FakePaymentOutcome): void {
      const existing = executions.get(executionIdentity);
      if (!existing) {
        throw new PaymentError(
          "PAYMENT_PROVIDER_EVIDENCE_INVALID",
          "Unknown fake execution identity.",
        );
      }
      executions.set(
        executionIdentity,
        Object.freeze({ ...existing, outcome }),
      );
    },

    getExecution(executionIdentity: string): StoredExecution | null {
      return executions.get(executionIdentity) ?? null;
    },

    clear(): void {
      executions.clear();
      refundsByKey.clear();
      createExecutionCallCount = 0;
      queryExecutionCallCount = 0;
      cancelExecutionCallCount = 0;
      createRefundCallCount = 0;
      queryRefundCallCount = 0;
    },

    computeWebhookSignature(rawBody: Uint8Array): string {
      return digestBody(webhookSecret, rawBody);
    },

    async createExecution(
      input: PaymentProviderCreateExecutionInput,
    ): Promise<NormalizedProviderEvidence> {
      createExecutionCallCount += 1;
      const existing = executions.get(input.executionIdentity);
      if (existing) {
        return evidenceFor(existing);
      }
      const stored: StoredExecution = Object.freeze({
        executionIdentity: input.executionIdentity,
        amountPaise: input.amountPaise,
        currency: input.currency,
        methodIntent: input.methodIntent,
        paymentId: input.paymentId,
        attemptId: input.attemptId,
        outcome: defaultOutcome,
        createdAt: new Date(),
      });
      executions.set(input.executionIdentity, stored);
      return evidenceFor(stored);
    },

    async queryExecution(
      input: PaymentProviderQueryExecutionInput,
    ): Promise<NormalizedProviderEvidence> {
      queryExecutionCallCount += 1;
      if (input.provider !== PAYMENT_FAKE_PROVIDER) {
        return Object.freeze({
          outcome: "UNSUPPORTED",
          provider: input.provider,
          providerExecutionIdentity: input.executionIdentity,
          observedAmountPaise: null,
          observedCurrency: null,
          providerStatusCode: null,
          providerTimestamp: null,
          providerEventId: null,
          payloadDigest: null,
        });
      }
      const stored = executions.get(input.executionIdentity);
      if (!stored) {
        return Object.freeze({
          outcome: "INDETERMINATE",
          provider: PAYMENT_FAKE_PROVIDER,
          providerExecutionIdentity: input.executionIdentity,
          observedAmountPaise: null,
          observedCurrency: null,
          providerStatusCode: "NOT_FOUND",
          providerTimestamp: null,
          providerEventId: null,
          payloadDigest: null,
        });
      }
      return evidenceFor(stored);
    },

    async cancelExecution(
      input: PaymentProviderCancelExecutionInput,
    ): Promise<NormalizedProviderEvidence> {
      cancelExecutionCallCount += 1;
      const stored = executions.get(input.executionIdentity);
      if (!stored) {
        return Object.freeze({
          outcome: "INDETERMINATE",
          provider: PAYMENT_FAKE_PROVIDER,
          providerExecutionIdentity: input.executionIdentity,
          observedAmountPaise: null,
          observedCurrency: null,
          providerStatusCode: "NOT_FOUND",
          providerTimestamp: null,
          providerEventId: null,
          payloadDigest: null,
        });
      }
      const cancelled: StoredExecution = Object.freeze({
        ...stored,
        outcome: "cancelled",
      });
      executions.set(input.executionIdentity, cancelled);
      return evidenceFor(cancelled);
    },

    async verifyClientEvidence(
      input: PaymentProviderVerifyClientEvidenceInput,
    ): Promise<NormalizedProviderEvidence> {
      if (input.kind !== RAZORPAY_STANDARD_CHECKOUT_KIND) {
        throw new PaymentError(
          "PAYMENT_PROVIDER_EVIDENCE_INVALID",
          "Unsupported fake client evidence kind.",
          { field: "kind" },
        );
      }
      const razorpayPaymentId = input.payload.razorpay_payment_id?.trim() ?? "";
      const razorpayOrderId = input.payload.razorpay_order_id?.trim() ?? "";
      const razorpaySignature = input.payload.razorpay_signature?.trim() ?? "";
      if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
        throw new PaymentError(
          "PAYMENT_PROVIDER_EVIDENCE_INVALID",
          "Fake Razorpay client evidence is incomplete.",
        );
      }
      const stored = executions.get(input.providerExecutionIdentity);
      if (!stored) {
        throw new PaymentError(
          "PAYMENT_PROVIDER_EVIDENCE_INVALID",
          "Unknown fake execution identity.",
        );
      }
      const failed = razorpayPaymentId.toLowerCase().includes("fail");
      const resolved: StoredExecution = Object.freeze({
        ...stored,
        outcome: failed ? "fail" : "succeed",
      });
      executions.set(input.providerExecutionIdentity, resolved);
      return evidenceFor(resolved);
    },

    async verifyWebhook(
      input: PaymentProviderVerifyWebhookInput,
    ): Promise<PaymentProviderWebhookEvidence> {
      const header =
        input.headers[FAKE_PAYMENT_SIGNATURE_HEADER] ??
        input.headers[FAKE_PAYMENT_SIGNATURE_HEADER.toUpperCase()] ??
        "";
      const expected = digestBody(webhookSecret, input.rawBody);
      const provided = typeof header === "string" ? header.trim() : "";
      const expectedBuf = Buffer.from(expected, "utf8");
      const providedBuf = Buffer.from(provided, "utf8");
      if (
        expectedBuf.length !== providedBuf.length ||
        !timingSafeEqual(expectedBuf, providedBuf)
      ) {
        throw new PaymentError(
          "PAYMENT_PROVIDER_EVIDENCE_INVALID",
          "Fake payment webhook signature verification failed.",
        );
      }

      let parsed: {
        family?: string;
        executionIdentity?: string;
        outcome?: FakePaymentOutcome | FakeRefundOutcome;
        providerEventId?: string;
        amountPaise?: string | number | bigint;
        providerRefundId?: string;
        providerPaymentId?: string;
        refundId?: string;
      };
      try {
        parsed = JSON.parse(Buffer.from(input.rawBody).toString("utf8")) as {
          family?: string;
          executionIdentity?: string;
          outcome?: FakePaymentOutcome | FakeRefundOutcome;
          providerEventId?: string;
          amountPaise?: string | number | bigint;
          providerRefundId?: string;
          providerPaymentId?: string;
          refundId?: string;
        };
      } catch {
        throw new PaymentError(
          "PAYMENT_PROVIDER_EVIDENCE_INVALID",
          "Fake payment webhook body is not valid JSON.",
        );
      }

      if (parsed.family === "refund") {
        const payloadDigest = createHash("sha256").update(input.rawBody).digest("hex");
        const outcome = parsed.outcome;
        const mapped: NormalizedRefundEvidence["outcome"] =
          outcome === "processed"
            ? "PROCESSED"
            : outcome === "failed"
              ? "FAILED"
              : outcome === "indeterminate"
                ? "INDETERMINATE"
                : "PENDING";
        return Object.freeze({
          family: "refund",
          outcome: mapped,
          provider: PAYMENT_FAKE_PROVIDER,
          providerRefundId: parsed.providerRefundId ?? null,
          providerPaymentId: parsed.providerPaymentId ?? null,
          observedAmountPaise:
            parsed.amountPaise !== undefined ? BigInt(parsed.amountPaise) : null,
          observedCurrency: "INR",
          providerStatusCode: typeof outcome === "string" ? outcome : "pending",
          providerTimestamp: new Date(),
          providerEventId:
            typeof parsed.providerEventId === "string"
              ? parsed.providerEventId
              : `fake_refund_evt_${parsed.providerRefundId ?? "unknown"}`,
          payloadDigest,
        });
      }

      if (
        typeof parsed.executionIdentity !== "string" ||
        parsed.executionIdentity.trim().length === 0
      ) {
        throw new PaymentError(
          "PAYMENT_PROVIDER_EVIDENCE_INVALID",
          "Fake payment webhook missing executionIdentity.",
        );
      }

      const stored = executions.get(parsed.executionIdentity);
      if (!stored) {
        throw new PaymentError(
          "PAYMENT_PROVIDER_EVIDENCE_INVALID",
          "Fake payment webhook references unknown execution.",
        );
      }

      if (parsed.outcome !== undefined) {
        executions.set(
          parsed.executionIdentity,
          Object.freeze({ ...stored, outcome: parsed.outcome as FakePaymentOutcome }),
        );
      }

      const current = executions.get(parsed.executionIdentity)!;
      const payloadDigest = createHash("sha256")
        .update(input.rawBody)
        .digest("hex");

      let observedAmount = current.amountPaise;
      if (parsed.amountPaise !== undefined) {
        observedAmount = BigInt(parsed.amountPaise);
      }

      return evidenceFor(current, {
        observedAmountPaise: observedAmount,
        providerEventId:
          typeof parsed.providerEventId === "string"
            ? parsed.providerEventId
            : `fake_evt_${current.executionIdentity}`,
        payloadDigest,
        providerTimestamp: new Date(),
      });
    },

    async createRefund(
      input: PaymentProviderCreateRefundInput,
    ): Promise<NormalizedRefundEvidence> {
      createRefundCallCount += 1;
      if (createRefundHook) {
        await createRefundHook(input);
      }
      const existing = refundsByKey.get(input.idempotencyKey);
      const stored =
        existing ??
        Object.freeze({
          refundId: input.refundId,
          providerPaymentId: input.providerPaymentId,
          amountPaise: input.amountPaise,
          currency: input.currency,
          idempotencyKey: input.idempotencyKey,
          providerRefundId: `rfnd_fake_${String(refundSeq++).padStart(4, "0")}`,
          outcome: defaultRefundOutcome,
        });
      if (!existing) refundsByKey.set(input.idempotencyKey, stored);
      if (stored.outcome === "indeterminate") {
        return Object.freeze({
          family: "refund",
          outcome: "INDETERMINATE",
          provider: PAYMENT_FAKE_PROVIDER,
          providerRefundId: null,
          providerPaymentId: stored.providerPaymentId,
          observedAmountPaise: stored.amountPaise,
          observedCurrency: stored.currency,
          providerStatusCode: "PROVIDER_CALL_UNCERTAIN",
          providerTimestamp: new Date(),
          providerEventId: null,
          payloadDigest: null,
        });
      }
      const outcome: NormalizedRefundEvidence["outcome"] =
        stored.outcome === "failed"
          ? "FAILED"
          : stored.outcome === "pending"
            ? "PENDING"
            : "PROCESSED";
      return Object.freeze({
        family: "refund",
        outcome,
        provider: PAYMENT_FAKE_PROVIDER,
        providerRefundId: stored.providerRefundId,
        providerPaymentId: stored.providerPaymentId,
        observedAmountPaise: stored.amountPaise,
        observedCurrency: stored.currency,
        providerStatusCode: stored.outcome,
        providerTimestamp: new Date(),
        providerEventId: null,
        payloadDigest: null,
        references: Object.freeze([
          Object.freeze({ kind: "razorpay_refund_id", value: stored.providerRefundId }),
          Object.freeze({
            kind: "razorpay_payment_id",
            value: stored.providerPaymentId,
          }),
        ]),
      });
    },

    async queryRefund(
      input: PaymentProviderQueryRefundInput,
    ): Promise<NormalizedRefundEvidence> {
      queryRefundCallCount += 1;
      const stored = [...refundsByKey.values()].find(
        (row) =>
          (input.providerRefundId && row.providerRefundId === input.providerRefundId) ||
          (input.idempotencyKey && row.idempotencyKey === input.idempotencyKey),
      );
      if (!stored) {
        return Object.freeze({
          family: "refund",
          outcome: "INDETERMINATE",
          provider: PAYMENT_FAKE_PROVIDER,
          providerRefundId: input.providerRefundId ?? null,
          providerPaymentId: input.providerPaymentId ?? null,
          observedAmountPaise: input.amountPaise ?? null,
          observedCurrency: null,
          providerStatusCode: "NOT_FOUND",
          providerTimestamp: new Date(),
          providerEventId: null,
          payloadDigest: null,
        });
      }
      const outcome: NormalizedRefundEvidence["outcome"] =
        stored.outcome === "failed"
          ? "FAILED"
          : stored.outcome === "pending"
            ? "PENDING"
            : stored.outcome === "indeterminate"
              ? "INDETERMINATE"
              : "PROCESSED";
      return Object.freeze({
        family: "refund",
        outcome,
        provider: PAYMENT_FAKE_PROVIDER,
        providerRefundId: stored.providerRefundId,
        providerPaymentId: stored.providerPaymentId,
        observedAmountPaise: stored.amountPaise,
        observedCurrency: stored.currency,
        providerStatusCode: stored.outcome,
        providerTimestamp: new Date(),
        providerEventId: null,
        payloadDigest: null,
      });
    },
  };

  return Object.freeze(provider);
}
