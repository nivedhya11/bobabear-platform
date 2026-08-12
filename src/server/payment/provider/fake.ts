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
  type NormalizedProviderEvidence,
} from "../../../shared/payment";
import type {
  PaymentProvider,
  PaymentProviderCancelExecutionInput,
  PaymentProviderCreateExecutionInput,
  PaymentProviderQueryExecutionInput,
  PaymentProviderVerifyWebhookInput,
} from "./types";

export type FakePaymentOutcome =
  | "succeed"
  | "fail"
  | "pending"
  | "indeterminate"
  | "client_action"
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

export type FakePaymentProvider = PaymentProvider &
  Readonly<{
    setOutcome(executionIdentity: string, outcome: FakePaymentOutcome): void;
    setDefaultOutcome(outcome: FakePaymentOutcome): void;
    getExecution(executionIdentity: string): StoredExecution | null;
    clear(): void;
    computeWebhookSignature(rawBody: Uint8Array): string;
    readonly createExecutionCallCount: number;
    readonly queryExecutionCallCount: number;
    readonly cancelExecutionCallCount: number;
  }>;

export function createFakePaymentProvider(options?: {
  webhookSecret?: string;
  defaultOutcome?: FakePaymentOutcome;
}): FakePaymentProvider {
  const webhookSecret = options?.webhookSecret ?? FAKE_PAYMENT_WEBHOOK_SECRET;
  const executions = new Map<string, StoredExecution>();
  let defaultOutcome: FakePaymentOutcome = options?.defaultOutcome ?? "pending";
  let createExecutionCallCount = 0;
  let queryExecutionCallCount = 0;
  let cancelExecutionCallCount = 0;

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

    async verifyWebhook(
      input: PaymentProviderVerifyWebhookInput,
    ): Promise<NormalizedProviderEvidence> {
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
        executionIdentity?: string;
        outcome?: FakePaymentOutcome;
        providerEventId?: string;
        amountPaise?: string | number | bigint;
      };
      try {
        parsed = JSON.parse(Buffer.from(input.rawBody).toString("utf8")) as {
          executionIdentity?: string;
          outcome?: FakePaymentOutcome;
          providerEventId?: string;
          amountPaise?: string | number | bigint;
        };
      } catch {
        throw new PaymentError(
          "PAYMENT_PROVIDER_EVIDENCE_INVALID",
          "Fake payment webhook body is not valid JSON.",
        );
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
          Object.freeze({ ...stored, outcome: parsed.outcome }),
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
  };

  return Object.freeze(provider);
}
