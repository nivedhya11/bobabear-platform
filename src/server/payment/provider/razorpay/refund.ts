/**
 * Razorpay Refund adapter helpers (IMP-027 / D-364).
 *
 * Normal speed only. Durable X-Refund-Idempotency. No operator notes/PII.
 * No real provider call from tests — callers inject HTTP transport.
 */
import { createHash } from "node:crypto";

import { PAYMENT_RAZORPAY_PROVIDER } from "../../../../shared/payment";
import {
  RAZORPAY_REFUND_PAYMENT_REFERENCE_KIND,
  RAZORPAY_REFUND_REFERENCE_KIND,
  type NormalizedRefundEvidence,
} from "../../../../shared/refund";
import type {
  PaymentProviderCreateRefundInput,
  PaymentProviderQueryRefundInput,
} from "../types";
import type { RazorpayHttpResult, RazorpayHttpTransport } from "./http";

const REFUND_IDEMPOTENCY_HEADER = "X-Refund-Idempotency";

export type RazorpayRefundEntity = Readonly<{
  id: string;
  payment_id: string | null;
  amount: number | string | null;
  currency: string | null;
  status: string | null;
  speed_requested?: string | null;
  acquirer_data?: Readonly<Record<string, unknown>> | null;
}>;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readAmountPaise(value: unknown): bigint | null {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isInteger(value)) return BigInt(value);
  if (typeof value === "string" && /^-?\d+$/.test(value)) return BigInt(value);
  return null;
}

export function parseRazorpayRefund(json: unknown): RazorpayRefundEntity | null {
  const record = asRecord(json);
  if (!record) return null;
  const id = readString(record.id);
  if (!id) return null;
  return {
    id,
    payment_id: readString(record.payment_id),
    amount: (record.amount as number | string | null | undefined) ?? null,
    currency: readString(record.currency),
    status: readString(record.status),
    speed_requested: readString(record.speed_requested),
    acquirer_data: asRecord(record.acquirer_data),
  };
}

function parseRefundCollection(json: unknown): RazorpayRefundEntity[] {
  const record = asRecord(json);
  const items = record?.items;
  if (!Array.isArray(items)) {
    const single = parseRazorpayRefund(json);
    return single ? [single] : [];
  }
  const refunds: RazorpayRefundEntity[] = [];
  for (const item of items) {
    const refund = parseRazorpayRefund(item);
    if (refund) refunds.push(refund);
  }
  return refunds;
}

function acquirerReference(entity: RazorpayRefundEntity): string | null {
  const data = entity.acquirer_data;
  if (!data) return null;
  return (
    readString(data.arn) ??
    readString(data.rrn) ??
    readString(data.utr) ??
    readString(data.acquirer_reference) ??
    null
  );
}

export function mapRazorpayRefundToEvidence(
  entity: RazorpayRefundEntity,
  extras?: Partial<NormalizedRefundEvidence>,
): NormalizedRefundEvidence {
  const status = (entity.status ?? "").toLowerCase();
  let outcome: NormalizedRefundEvidence["outcome"] = "PENDING";
  if (status === "processed") outcome = "PROCESSED";
  else if (status === "failed") outcome = "FAILED";
  else if (status === "pending") outcome = "PENDING";
  return Object.freeze({
    family: "refund",
    outcome,
    provider: PAYMENT_RAZORPAY_PROVIDER,
    providerRefundId: entity.id,
    providerPaymentId: entity.payment_id,
    observedAmountPaise: readAmountPaise(entity.amount),
    observedCurrency: entity.currency,
    providerStatusCode: entity.status,
    providerTimestamp: new Date(),
    providerEventId: extras?.providerEventId ?? null,
    payloadDigest: extras?.payloadDigest ?? null,
    acquirerReference: acquirerReference(entity),
    references: Object.freeze([
      Object.freeze({ kind: RAZORPAY_REFUND_REFERENCE_KIND, value: entity.id }),
      ...(entity.payment_id
        ? [
            Object.freeze({
              kind: RAZORPAY_REFUND_PAYMENT_REFERENCE_KIND,
              value: entity.payment_id,
            }),
          ]
        : []),
    ]),
    ...extras,
  });
}

function uncertainEvidence(
  input: {
    providerPaymentId?: string;
    providerRefundId?: string;
  },
  statusCode = "PROVIDER_CALL_UNCERTAIN",
): NormalizedRefundEvidence {
  return Object.freeze({
    family: "refund",
    outcome: "INDETERMINATE",
    provider: PAYMENT_RAZORPAY_PROVIDER,
    providerRefundId: input.providerRefundId ?? null,
    providerPaymentId: input.providerPaymentId ?? null,
    observedAmountPaise: null,
    observedCurrency: null,
    providerStatusCode: statusCode,
    providerTimestamp: new Date(),
    providerEventId: null,
    payloadDigest: null,
  });
}

function failedEvidence(
  input: PaymentProviderCreateRefundInput,
  statusCode: string,
): NormalizedRefundEvidence {
  return Object.freeze({
    family: "refund",
    outcome: "FAILED",
    provider: PAYMENT_RAZORPAY_PROVIDER,
    providerRefundId: null,
    providerPaymentId: input.providerPaymentId,
    observedAmountPaise: input.amountPaise,
    observedCurrency: input.currency,
    providerStatusCode: statusCode,
    providerTimestamp: new Date(),
    providerEventId: null,
    payloadDigest: null,
  });
}

function isDefinitiveClientFailure(result: Extract<RazorpayHttpResult, { kind: "http_error" }>): boolean {
  if (result.status === 409) return false;
  return result.status >= 400 && result.status < 500;
}

export async function razorpayCreateRefund(
  http: RazorpayHttpTransport,
  input: PaymentProviderCreateRefundInput,
): Promise<NormalizedRefundEvidence> {
  const result = await http.request({
    method: "POST",
    path: `/payments/${encodeURIComponent(input.providerPaymentId)}/refund`,
    headers: { [REFUND_IDEMPOTENCY_HEADER]: input.idempotencyKey },
    body: {
      amount: Number(input.amountPaise),
      currency: input.currency,
      speed: "normal",
    },
  });
  if (result.kind === "uncertain") {
    return uncertainEvidence({ providerPaymentId: input.providerPaymentId });
  }
  if (result.kind === "http_error") {
    if (result.status === 409) {
      return uncertainEvidence(
        { providerPaymentId: input.providerPaymentId },
        "IDEMPOTENCY_IN_PROGRESS",
      );
    }
    if (isDefinitiveClientFailure(result)) {
      return failedEvidence(input, `HTTP_${result.status}`);
    }
    return uncertainEvidence({ providerPaymentId: input.providerPaymentId }, `HTTP_${result.status}`);
  }
  const entity = parseRazorpayRefund(result.json);
  if (!entity) {
    return Object.freeze({
      family: "refund",
      outcome: "ANOMALY",
      provider: PAYMENT_RAZORPAY_PROVIDER,
      providerRefundId: null,
      providerPaymentId: input.providerPaymentId,
      observedAmountPaise: input.amountPaise,
      observedCurrency: input.currency,
      providerStatusCode: "RAZORPAY_REFUND_UNPARSEABLE",
      providerTimestamp: new Date(),
      providerEventId: null,
      payloadDigest: null,
      anomalyCode: "RAZORPAY_REFUND_UNPARSEABLE",
    });
  }
  return mapRazorpayRefundToEvidence(entity);
}

export async function razorpayQueryRefund(
  http: RazorpayHttpTransport,
  input: PaymentProviderQueryRefundInput,
): Promise<NormalizedRefundEvidence> {
  if (input.providerRefundId) {
    const result = await http.request({
      method: "GET",
      path: `/refunds/${encodeURIComponent(input.providerRefundId)}`,
    });
    if (result.kind === "uncertain") {
      return uncertainEvidence({
        providerRefundId: input.providerRefundId,
        providerPaymentId: input.providerPaymentId,
      });
    }
    if (result.kind === "http_error") {
      return uncertainEvidence(
        {
          providerRefundId: input.providerRefundId,
          providerPaymentId: input.providerPaymentId,
        },
        `HTTP_${result.status}`,
      );
    }
    const entity = parseRazorpayRefund(result.json);
    if (!entity) {
      return Object.freeze({
        family: "refund",
        outcome: "ANOMALY",
        provider: PAYMENT_RAZORPAY_PROVIDER,
        providerRefundId: input.providerRefundId,
        providerPaymentId: input.providerPaymentId ?? null,
        observedAmountPaise: input.amountPaise ?? null,
        observedCurrency: null,
        providerStatusCode: "RAZORPAY_REFUND_UNPARSEABLE",
        providerTimestamp: new Date(),
        providerEventId: null,
        payloadDigest: null,
        anomalyCode: "RAZORPAY_REFUND_UNPARSEABLE",
      });
    }
    return mapRazorpayRefundToEvidence(entity);
  }

  if (!input.providerPaymentId) {
    return uncertainEvidence({}, "MISSING_PROVIDER_REFUND_IDENTITY");
  }

  const listed = await http.request({
    method: "GET",
    path: `/payments/${encodeURIComponent(input.providerPaymentId)}/refunds`,
  });
  if (listed.kind !== "ok") {
    return uncertainEvidence({ providerPaymentId: input.providerPaymentId });
  }
  let refunds = parseRefundCollection(listed.json);
  if (input.amountPaise !== undefined) {
    const matched = refunds.filter((row) => readAmountPaise(row.amount) === input.amountPaise);
    if (matched.length === 1) refunds = matched;
  }
  if (refunds.length === 1) {
    return mapRazorpayRefundToEvidence(refunds[0]!);
  }
  return uncertainEvidence(
    { providerPaymentId: input.providerPaymentId },
    refunds.length === 0 ? "REFUND_NOT_FOUND" : "REFUND_QUERY_AMBIGUOUS",
  );
}

export function refundWebhookEvidenceFromPayload(
  eventName: string,
  payload: Record<string, unknown>,
  eventId: string,
  rawBody: Uint8Array,
): NormalizedRefundEvidence | null {
  if (
    eventName !== "refund.created" &&
    eventName !== "refund.processed" &&
    eventName !== "refund.failed"
  ) {
    return null;
  }
  const wrapper = asRecord(payload.refund);
  const entityJson = wrapper ? (asRecord(wrapper.entity) ?? wrapper) : null;
  const entity = parseRazorpayRefund(entityJson);
  const digest = createHash("sha256").update(rawBody).digest("hex");
  if (!entity) {
    return Object.freeze({
      family: "refund",
      outcome: "ANOMALY",
      provider: PAYMENT_RAZORPAY_PROVIDER,
      providerRefundId: null,
      providerPaymentId: null,
      observedAmountPaise: null,
      observedCurrency: null,
      providerStatusCode: eventName,
      providerTimestamp: new Date(),
      providerEventId: eventId,
      payloadDigest: digest,
      anomalyCode: "RAZORPAY_REFUND_WEBHOOK_UNPARSEABLE",
    });
  }
  let mapped = mapRazorpayRefundToEvidence(entity, {
    providerEventId: eventId,
    payloadDigest: digest,
  });
  if (eventName === "refund.created" && mapped.outcome === "PROCESSED") {
    mapped = Object.freeze({ ...mapped, outcome: "PENDING", providerStatusCode: entity.status });
  }
  if (eventName === "refund.processed") {
    mapped = Object.freeze({ ...mapped, outcome: "PROCESSED", providerStatusCode: entity.status ?? "processed" });
  }
  if (eventName === "refund.failed") {
    mapped = Object.freeze({ ...mapped, outcome: "FAILED", providerStatusCode: entity.status ?? "failed" });
  }
  return mapped;
}

export const RAZORPAY_REFUND_IDEMPOTENCY_HEADER = REFUND_IDEMPOTENCY_HEADER;
