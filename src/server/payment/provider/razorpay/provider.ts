/**
 * Razorpay PaymentProvider adapter (IMP-026A).
 *
 * One BOBA Attempt = one Razorpay Order. Automatic capture.
 * Authorized is not success. Refund handling remains IMP-027.
 */
import { createHash } from "node:crypto";

import {
  PAYMENT_RAZORPAY_PROVIDER,
  PaymentError,
  RAZORPAY_ORDER_REFERENCE_KIND,
  RAZORPAY_PAYMENT_REFERENCE_KIND,
  RAZORPAY_RECEIPT_REFERENCE_KIND,
  RAZORPAY_STANDARD_CHECKOUT_KIND,
  type NormalizedProviderEvidence,
} from "../../../../shared/payment";
import type {
  PaymentProvider,
  PaymentProviderCreateExecutionInput,
  PaymentProviderCreateRefundInput,
  PaymentProviderQueryExecutionInput,
  PaymentProviderQueryRefundInput,
  PaymentProviderVerifyClientEvidenceInput,
  PaymentProviderVerifyWebhookInput,
  PaymentProviderWebhookEvidence,
} from "../types";
import {
  razorpayClientSignatureHex,
  razorpayWebhookSignatureHex,
  timingSafeStringEqual,
} from "./crypto";
import {
  createRazorpayHttpClient,
  type RazorpayHttpResult,
  type RazorpayHttpTransport,
} from "./http";
import { razorpayReceiptFromExecutionIdentity } from "./receipt";
import {
  razorpayCreateRefund,
  razorpayQueryRefund,
  refundWebhookEvidenceFromPayload,
} from "./refund";

export type RazorpayProviderConfig = Readonly<{
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  http?: RazorpayHttpTransport;
  apiBaseUrl?: string;
}>;

type RazorpayOrder = Readonly<{
  id: string;
  amount: number | string;
  currency: string;
  receipt?: string | null;
  status?: string | null;
}>;

type RazorpayPayment = Readonly<{
  id: string;
  order_id?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  status?: string | null;
}>;

const CLIENT_EVIDENCE_KIND = RAZORPAY_STANDARD_CHECKOUT_KIND;
const IGNORED_EVENT_STATUS = "EVENT_IGNORED";

function payloadDigest(rawBody: Uint8Array): string {
  return createHash("sha256").update(rawBody).digest("hex");
}

function headerValue(
  headers: Readonly<Record<string, string>>,
  name: string,
): string {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower) return value;
  }
  return "";
}

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

function errorDescription(json: unknown): string {
  const record = asRecord(json);
  const error = record ? asRecord(record.error) : null;
  const description = error ? readString(error.description) : null;
  return description?.toLowerCase() ?? "";
}

function isDuplicateReceiptError(result: Extract<RazorpayHttpResult, { kind: "http_error" }>): boolean {
  const description = errorDescription(result.json);
  return (
    result.status === 400 &&
    (description.includes("receipt") || description.includes("already exists") || description.includes("duplicate"))
  );
}

function parseOrder(json: unknown): RazorpayOrder | null {
  const record = asRecord(json);
  if (!record) return null;
  const id = readString(record.id);
  if (!id) return null;
  return {
    id,
    amount: (record.amount as number | string) ?? 0,
    currency: readString(record.currency) ?? "",
    receipt: readString(record.receipt),
    status: readString(record.status),
  };
}

function parseOrderCollection(json: unknown): RazorpayOrder[] {
  const record = asRecord(json);
  const items = record?.items;
  if (!Array.isArray(items)) {
    const single = parseOrder(json);
    return single ? [single] : [];
  }
  const orders: RazorpayOrder[] = [];
  for (const item of items) {
    const order = parseOrder(item);
    if (order) orders.push(order);
  }
  return orders;
}

function parsePayment(json: unknown): RazorpayPayment | null {
  const record = asRecord(json);
  if (!record) return null;
  const id = readString(record.id);
  if (!id) return null;
  return {
    id,
    order_id: readString(record.order_id),
    amount: (record.amount as number | string | null | undefined) ?? null,
    currency: readString(record.currency),
    status: readString(record.status),
  };
}

function parsePaymentCollection(json: unknown): RazorpayPayment[] {
  const record = asRecord(json);
  const items = record?.items;
  if (!Array.isArray(items)) {
    const single = parsePayment(json);
    return single ? [single] : [];
  }
  const payments: RazorpayPayment[] = [];
  for (const item of items) {
    const payment = parsePayment(item);
    if (payment) payments.push(payment);
  }
  return payments;
}

function anomalyEvidence(
  executionIdentity: string,
  anomalyCode: string,
  extras?: Partial<NormalizedProviderEvidence>,
): NormalizedProviderEvidence {
  return Object.freeze({
    outcome: "ANOMALY",
    provider: PAYMENT_RAZORPAY_PROVIDER,
    providerExecutionIdentity: executionIdentity,
    observedAmountPaise: null,
    observedCurrency: null,
    providerStatusCode: anomalyCode,
    providerTimestamp: null,
    providerEventId: null,
    payloadDigest: null,
    anomalyCode,
    ...extras,
  });
}

function orderMatchesExpectation(
  order: RazorpayOrder,
  expected: { receipt: string; amountPaise: bigint; currency: "INR" },
): boolean {
  const amount = readAmountPaise(order.amount);
  return (
    (order.receipt ?? "") === expected.receipt &&
    amount === expected.amountPaise &&
    order.currency === expected.currency
  );
}

function clientActionFor(
  input: PaymentProviderCreateExecutionInput,
  keyId: string,
  razorpayOrderId: string,
  receipt: string,
): NormalizedProviderEvidence {
  return Object.freeze({
    outcome: "CLIENT_ACTION_REQUIRED",
    provider: PAYMENT_RAZORPAY_PROVIDER,
    providerExecutionIdentity: input.executionIdentity,
    observedAmountPaise: input.amountPaise,
    observedCurrency: input.currency,
    providerStatusCode: "ORDER_CREATED",
    providerTimestamp: new Date(),
    providerEventId: null,
    payloadDigest: null,
    references: Object.freeze([
      Object.freeze({ kind: RAZORPAY_ORDER_REFERENCE_KIND, value: razorpayOrderId }),
      Object.freeze({ kind: RAZORPAY_RECEIPT_REFERENCE_KIND, value: receipt }),
    ]),
    clientAction: Object.freeze({
      kind: RAZORPAY_STANDARD_CHECKOUT_KIND,
      payload: Object.freeze({
        keyId,
        razorpayOrderId,
        amountPaise: input.amountPaise.toString(10),
        currency: input.currency,
        paymentId: input.paymentId,
        attemptId: input.attemptId,
      }),
    }),
  });
}

function mapPaymentsToEvidence(
  executionIdentity: string,
  orderId: string,
  order: RazorpayOrder,
  payments: readonly RazorpayPayment[],
): NormalizedProviderEvidence {
  const captured = payments.find((payment) => payment.status === "captured");
  const refunded = payments.find((payment) => payment.status === "refunded");
  const authorized = payments.find((payment) => payment.status === "authorized");
  const failed = payments.find((payment) => payment.status === "failed");
  const chosen = captured ?? refunded ?? authorized ?? failed ?? null;
  const observedAmount = chosen
    ? readAmountPaise(chosen.amount) ?? readAmountPaise(order.amount)
    : readAmountPaise(order.amount);
  const observedCurrency = chosen?.currency ?? order.currency ?? null;
  const references = [
    Object.freeze({ kind: RAZORPAY_ORDER_REFERENCE_KIND, value: orderId }),
    ...(order.receipt
      ? [Object.freeze({ kind: RAZORPAY_RECEIPT_REFERENCE_KIND, value: order.receipt })]
      : []),
    ...(chosen
      ? [Object.freeze({ kind: RAZORPAY_PAYMENT_REFERENCE_KIND, value: chosen.id })]
      : []),
  ];

  if (captured) {
    return Object.freeze({
      outcome: "SUCCEEDED",
      provider: PAYMENT_RAZORPAY_PROVIDER,
      providerExecutionIdentity: executionIdentity,
      observedAmountPaise: observedAmount,
      observedCurrency,
      providerStatusCode: "captured",
      providerTimestamp: new Date(),
      providerEventId: null,
      payloadDigest: null,
      references,
    });
  }
  if (refunded) {
    // Refunded is not captured-success evidence. Do not synthesize BOBA success
    // or regress an already-successful Payment. Refund lifecycle is IMP-027.
    return Object.freeze({
      outcome: "ANOMALY",
      provider: PAYMENT_RAZORPAY_PROVIDER,
      providerExecutionIdentity: executionIdentity,
      observedAmountPaise: observedAmount,
      observedCurrency,
      providerStatusCode: "refunded",
      providerTimestamp: new Date(),
      providerEventId: null,
      payloadDigest: null,
      references,
      anomalyCode: "RAZORPAY_REFUNDED_NON_SUCCESS",
    });
  }
  if (failed && !authorized) {
    return Object.freeze({
      outcome: "DEFINITIVE_FAILURE",
      provider: PAYMENT_RAZORPAY_PROVIDER,
      providerExecutionIdentity: executionIdentity,
      observedAmountPaise: observedAmount,
      observedCurrency,
      providerStatusCode: "failed",
      providerTimestamp: new Date(),
      providerEventId: null,
      payloadDigest: null,
      references,
    });
  }
  return Object.freeze({
    outcome: "PENDING",
    provider: PAYMENT_RAZORPAY_PROVIDER,
    providerExecutionIdentity: executionIdentity,
    observedAmountPaise: observedAmount,
    observedCurrency,
    providerStatusCode: authorized ? "authorized" : (order.status ?? "created"),
    providerTimestamp: new Date(),
    providerEventId: null,
    payloadDigest: null,
    references,
  });
}

async function fetchOrderPayments(
  http: RazorpayHttpTransport,
  orderId: string,
): Promise<RazorpayPayment[]> {
  const result = await http.request({
    method: "GET",
    path: `/orders/${encodeURIComponent(orderId)}/payments`,
  });
  if (result.kind !== "ok") return [];
  return parsePaymentCollection(result.json);
}

async function recoverOrderByReceipt(
  http: RazorpayHttpTransport,
  receipt: string,
): Promise<
  | Readonly<{ kind: "none" }>
  | Readonly<{ kind: "one"; order: RazorpayOrder }>
  | Readonly<{ kind: "many"; orders: RazorpayOrder[] }>
  | Readonly<{ kind: "uncertain" }>
> {
  const result = await http.request({
    method: "GET",
    path: "/orders",
    query: { receipt },
  });
  if (result.kind === "uncertain") return Object.freeze({ kind: "uncertain" });
  if (result.kind === "http_error") return Object.freeze({ kind: "none" });
  const orders = parseOrderCollection(result.json);
  if (orders.length === 0) return Object.freeze({ kind: "none" });
  if (orders.length === 1) return Object.freeze({ kind: "one", order: orders[0]! });
  return Object.freeze({ kind: "many", orders });
}

function entityFromPayload(
  payload: Record<string, unknown>,
  key: string,
): Record<string, unknown> | null {
  const wrapper = asRecord(payload[key]);
  if (!wrapper) return null;
  return asRecord(wrapper.entity) ?? wrapper;
}

export function createRazorpayPaymentProvider(
  config: RazorpayProviderConfig,
): PaymentProvider {
  const http =
    config.http ??
    createRazorpayHttpClient({
      keyId: config.keyId,
      keySecret: config.keySecret,
      baseUrl: config.apiBaseUrl,
    });

  return Object.freeze({
    name: PAYMENT_RAZORPAY_PROVIDER,

    async createExecution(
      input: PaymentProviderCreateExecutionInput,
    ): Promise<NormalizedProviderEvidence> {
      const receipt = razorpayReceiptFromExecutionIdentity(input.executionIdentity);
      const expected = {
        receipt,
        amountPaise: input.amountPaise,
        currency: input.currency,
      };

      const created = await http.request({
        method: "POST",
        path: "/orders",
        body: {
          amount: Number(input.amountPaise),
          currency: input.currency,
          receipt,
          payment_capture: true,
        },
      });

      if (created.kind === "ok") {
        const order = parseOrder(created.json);
        if (!order) {
          return anomalyEvidence(input.executionIdentity, "RAZORPAY_ORDER_UNPARSEABLE");
        }
        if (!orderMatchesExpectation(order, expected)) {
          return anomalyEvidence(input.executionIdentity, "PAYMENT_PROVIDER_FINANCIAL_MISMATCH", {
            observedAmountPaise: readAmountPaise(order.amount),
            observedCurrency: order.currency || null,
          });
        }
        return clientActionFor(input, config.keyId, order.id, receipt);
      }

      const shouldRecover =
        created.kind === "uncertain" ||
        (created.kind === "http_error" && isDuplicateReceiptError(created));
      if (!shouldRecover) {
        throw new PaymentError(
          "PAYMENT_PROVIDER_INDETERMINATE",
          "Razorpay Order creation failed.",
        );
      }

      const recovered = await recoverOrderByReceipt(http, receipt);
      if (recovered.kind === "uncertain") {
        return Object.freeze({
          outcome: "INDETERMINATE",
          provider: PAYMENT_RAZORPAY_PROVIDER,
          providerExecutionIdentity: input.executionIdentity,
          observedAmountPaise: null,
          observedCurrency: null,
          providerStatusCode: "PROVIDER_CALL_UNCERTAIN",
          providerTimestamp: new Date(),
          providerEventId: null,
          payloadDigest: null,
        });
      }
      if (recovered.kind === "many") {
        return anomalyEvidence(input.executionIdentity, "RAZORPAY_RECEIPT_AMBIGUOUS");
      }
      if (recovered.kind === "one") {
        if (!orderMatchesExpectation(recovered.order, expected)) {
          return anomalyEvidence(input.executionIdentity, "PAYMENT_PROVIDER_FINANCIAL_MISMATCH", {
            observedAmountPaise: readAmountPaise(recovered.order.amount),
            observedCurrency: recovered.order.currency || null,
          });
        }
        return clientActionFor(input, config.keyId, recovered.order.id, receipt);
      }

      if (created.kind === "uncertain") {
        const retry = await http.request({
          method: "POST",
          path: "/orders",
          body: {
            amount: Number(input.amountPaise),
            currency: input.currency,
            receipt,
            payment_capture: true,
          },
        });
        if (retry.kind === "ok") {
          const order = parseOrder(retry.json);
          if (!order || !orderMatchesExpectation(order, expected)) {
            return anomalyEvidence(input.executionIdentity, "PAYMENT_PROVIDER_FINANCIAL_MISMATCH");
          }
          return clientActionFor(input, config.keyId, order.id, receipt);
        }
        if (retry.kind === "http_error" && isDuplicateReceiptError(retry)) {
          const second = await recoverOrderByReceipt(http, receipt);
          if (second.kind === "one" && orderMatchesExpectation(second.order, expected)) {
            return clientActionFor(input, config.keyId, second.order.id, receipt);
          }
          if (second.kind === "many") {
            return anomalyEvidence(input.executionIdentity, "RAZORPAY_RECEIPT_AMBIGUOUS");
          }
        }
        return Object.freeze({
          outcome: "INDETERMINATE",
          provider: PAYMENT_RAZORPAY_PROVIDER,
          providerExecutionIdentity: input.executionIdentity,
          observedAmountPaise: null,
          observedCurrency: null,
          providerStatusCode: "PROVIDER_CALL_UNCERTAIN",
          providerTimestamp: new Date(),
          providerEventId: null,
          payloadDigest: null,
        });
      }

      throw new PaymentError(
        "PAYMENT_PROVIDER_INDETERMINATE",
        "Razorpay Order creation failed.",
      );
    },

    async queryExecution(
      input: PaymentProviderQueryExecutionInput,
    ): Promise<NormalizedProviderEvidence> {
      if (input.provider !== PAYMENT_RAZORPAY_PROVIDER) {
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

      let order: RazorpayOrder | null = null;
      if (input.executionIdentity.startsWith("order_")) {
        const fetched = await http.request({
          method: "GET",
          path: `/orders/${encodeURIComponent(input.executionIdentity)}`,
        });
        if (fetched.kind === "uncertain") {
          return Object.freeze({
            outcome: "INDETERMINATE",
            provider: PAYMENT_RAZORPAY_PROVIDER,
            providerExecutionIdentity: input.executionIdentity,
            observedAmountPaise: null,
            observedCurrency: null,
            providerStatusCode: "PROVIDER_CALL_UNCERTAIN",
            providerTimestamp: null,
            providerEventId: null,
            payloadDigest: null,
          });
        }
        if (fetched.kind === "ok") order = parseOrder(fetched.json);
      } else {
        const receipt = razorpayReceiptFromExecutionIdentity(input.executionIdentity);
        const recovered = await recoverOrderByReceipt(http, receipt);
        if (recovered.kind === "uncertain") {
          return Object.freeze({
            outcome: "INDETERMINATE",
            provider: PAYMENT_RAZORPAY_PROVIDER,
            providerExecutionIdentity: input.executionIdentity,
            observedAmountPaise: null,
            observedCurrency: null,
            providerStatusCode: "PROVIDER_CALL_UNCERTAIN",
            providerTimestamp: null,
            providerEventId: null,
            payloadDigest: null,
          });
        }
        if (recovered.kind === "many") {
          return anomalyEvidence(input.executionIdentity, "RAZORPAY_RECEIPT_AMBIGUOUS");
        }
        if (recovered.kind === "one") order = recovered.order;
      }

      if (!order) {
        return Object.freeze({
          outcome: "INDETERMINATE",
          provider: PAYMENT_RAZORPAY_PROVIDER,
          providerExecutionIdentity: input.executionIdentity,
          observedAmountPaise: null,
          observedCurrency: null,
          providerStatusCode: "NOT_FOUND",
          providerTimestamp: null,
          providerEventId: null,
          payloadDigest: null,
        });
      }

      const payments = await fetchOrderPayments(http, order.id);
      return mapPaymentsToEvidence(input.executionIdentity, order.id, order, payments);
    },

    async verifyWebhook(
      input: PaymentProviderVerifyWebhookInput,
    ): Promise<PaymentProviderWebhookEvidence> {
      const signature = headerValue(input.headers, "x-razorpay-signature");
      const eventId = headerValue(input.headers, "x-razorpay-event-id");
      const expected = razorpayWebhookSignatureHex(config.webhookSecret, input.rawBody);
      if (!signature || !timingSafeStringEqual(expected, signature)) {
        throw new PaymentError(
          "PAYMENT_PROVIDER_EVIDENCE_INVALID",
          "Razorpay webhook signature verification failed.",
        );
      }
      if (!eventId) {
        throw new PaymentError(
          "PAYMENT_PROVIDER_EVIDENCE_INVALID",
          "Razorpay webhook missing event id.",
        );
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(Buffer.from(input.rawBody).toString("utf8")) as unknown;
      } catch {
        throw new PaymentError(
          "PAYMENT_PROVIDER_EVIDENCE_INVALID",
          "Razorpay webhook body is not valid JSON.",
        );
      }
      const record = asRecord(parsed);
      if (!record) {
        throw new PaymentError(
          "PAYMENT_PROVIDER_EVIDENCE_INVALID",
          "Razorpay webhook body is not an object.",
        );
      }
      const eventName = readString(record.event) ?? "";
      const payload = asRecord(record.payload) ?? {};
      const digest = payloadDigest(input.rawBody);

      const refundEvidence = refundWebhookEvidenceFromPayload(
        eventName,
        payload,
        eventId,
        input.rawBody,
      );
      if (refundEvidence) {
        return refundEvidence;
      }

      const ignored = (): NormalizedProviderEvidence =>
        Object.freeze({
          outcome: "UNSUPPORTED",
          provider: PAYMENT_RAZORPAY_PROVIDER,
          providerExecutionIdentity: "",
          observedAmountPaise: null,
          observedCurrency: null,
          providerStatusCode: IGNORED_EVENT_STATUS,
          providerTimestamp: null,
          providerEventId: eventId,
          payloadDigest: digest,
        });

      if (
        eventName !== "payment.authorized" &&
        eventName !== "payment.captured" &&
        eventName !== "payment.failed" &&
        eventName !== "order.paid"
      ) {
        return ignored();
      }

      const paymentEntity = entityFromPayload(payload, "payment");
      const orderEntity = entityFromPayload(payload, "order");
      const payment = paymentEntity ? parsePayment(paymentEntity) : null;
      const orderId =
        readString(payment?.order_id) ??
        (orderEntity ? readString(orderEntity.id) : null);
      if (!orderId) {
        return ignored();
      }

      const amount =
        readAmountPaise(payment?.amount) ??
        (orderEntity ? readAmountPaise(orderEntity.amount) : null);
      const currency =
        payment?.currency ??
        (orderEntity ? readString(orderEntity.currency) : null);

      let outcome: NormalizedProviderEvidence["outcome"] = "PENDING";
      let statusCode = eventName;
      if (eventName === "payment.captured" || eventName === "order.paid") {
        const paymentStatus = payment?.status ?? null;
        if (paymentStatus === "authorized") {
          outcome = "PENDING";
          statusCode = "authorized";
        } else {
          outcome = "SUCCEEDED";
          statusCode = paymentStatus ?? "captured";
        }
      } else if (eventName === "payment.authorized") {
        outcome = "PENDING";
        statusCode = "authorized";
      } else if (eventName === "payment.failed") {
        outcome = "DEFINITIVE_FAILURE";
        statusCode = "failed";
      }

      return Object.freeze({
        outcome,
        provider: PAYMENT_RAZORPAY_PROVIDER,
        providerExecutionIdentity: orderId,
        observedAmountPaise: amount,
        observedCurrency: currency,
        providerStatusCode: statusCode,
        providerTimestamp: new Date(),
        providerEventId: eventId,
        payloadDigest: digest,
        references: Object.freeze([
          Object.freeze({ kind: RAZORPAY_ORDER_REFERENCE_KIND, value: orderId }),
          ...(payment
            ? [Object.freeze({ kind: RAZORPAY_PAYMENT_REFERENCE_KIND, value: payment.id })]
            : []),
        ]),
      });
    },

    async verifyClientEvidence(
      input: PaymentProviderVerifyClientEvidenceInput,
    ): Promise<NormalizedProviderEvidence> {
      if (input.kind !== CLIENT_EVIDENCE_KIND) {
        throw new PaymentError(
          "PAYMENT_PROVIDER_EVIDENCE_INVALID",
          "Unsupported payment client evidence kind.",
          { field: "kind" },
        );
      }
      const razorpayPaymentId = input.payload.razorpay_payment_id?.trim() ?? "";
      const razorpaySignature = input.payload.razorpay_signature?.trim() ?? "";
      if (!razorpayPaymentId || !razorpaySignature) {
        throw new PaymentError(
          "PAYMENT_PROVIDER_EVIDENCE_INVALID",
          "Razorpay client evidence is incomplete.",
        );
      }

      const storedOrderId =
        input.providerReferences?.find((ref) => ref.kind === RAZORPAY_ORDER_REFERENCE_KIND)
          ?.value.trim() ?? "";
      let expectedOrderId =
        storedOrderId ||
        (input.providerExecutionIdentity.startsWith("order_")
          ? input.providerExecutionIdentity
          : null);
      if (!expectedOrderId) {
        const receipt = razorpayReceiptFromExecutionIdentity(input.providerExecutionIdentity);
        const recovered = await recoverOrderByReceipt(http, receipt);
        if (recovered.kind !== "one") {
          throw new PaymentError(
            "PAYMENT_PROVIDER_EVIDENCE_INVALID",
            "Razorpay Order could not be resolved for client evidence.",
          );
        }
        expectedOrderId = recovered.order.id;
      }

      const expectedSignature = razorpayClientSignatureHex(
        config.keySecret,
        expectedOrderId,
        razorpayPaymentId,
      );
      if (!timingSafeStringEqual(expectedSignature, razorpaySignature)) {
        throw new PaymentError(
          "PAYMENT_PROVIDER_EVIDENCE_INVALID",
          "Razorpay client evidence signature verification failed.",
        );
      }

      const paymentResult = await http.request({
        method: "GET",
        path: `/payments/${encodeURIComponent(razorpayPaymentId)}`,
      });
      if (paymentResult.kind !== "ok") {
        return Object.freeze({
          outcome: "INDETERMINATE",
          provider: PAYMENT_RAZORPAY_PROVIDER,
          providerExecutionIdentity: input.providerExecutionIdentity,
          observedAmountPaise: null,
          observedCurrency: null,
          providerStatusCode: "PROVIDER_CALL_UNCERTAIN",
          providerTimestamp: new Date(),
          providerEventId: null,
          payloadDigest: null,
          references: Object.freeze([
            Object.freeze({ kind: RAZORPAY_ORDER_REFERENCE_KIND, value: expectedOrderId }),
            Object.freeze({ kind: RAZORPAY_PAYMENT_REFERENCE_KIND, value: razorpayPaymentId }),
          ]),
        });
      }
      const payment = parsePayment(paymentResult.json);
      if (!payment) {
        throw new PaymentError(
          "PAYMENT_PROVIDER_EVIDENCE_INVALID",
          "Razorpay payment could not be parsed after client evidence.",
        );
      }
      if (payment.order_id && payment.order_id !== expectedOrderId) {
        throw new PaymentError(
          "PAYMENT_PROVIDER_EVIDENCE_INVALID",
          "Razorpay payment does not belong to the stored Order.",
        );
      }

      const syntheticOrder: RazorpayOrder = {
        id: expectedOrderId,
        amount: payment.amount ?? 0,
        currency: payment.currency ?? "INR",
        receipt: null,
        status: null,
      };
      return mapPaymentsToEvidence(
        input.providerExecutionIdentity,
        expectedOrderId,
        syntheticOrder,
        [payment],
      );
    },

    async createRefund(input: PaymentProviderCreateRefundInput) {
      return razorpayCreateRefund(http, input);
    },

    async queryRefund(input: PaymentProviderQueryRefundInput) {
      return razorpayQueryRefund(http, input);
    },
  });
}
