import { createHash, timingSafeEqual } from "node:crypto";
import { describe, expect, it } from "vitest";

import { PaymentError } from "../../src/shared/payment";
import {
  razorpayClientSignatureHex,
  razorpayWebhookSignatureHex,
  timingSafeStringEqual,
} from "../../src/server/payment/provider/razorpay/crypto";
import type {
  RazorpayHttpRequest,
  RazorpayHttpResult,
  RazorpayHttpTransport,
} from "../../src/server/payment/provider/razorpay/http";
import { createRazorpayPaymentProvider } from "../../src/server/payment/provider/razorpay/provider";
import {
  razorpayReceiptFromExecutionIdentity,
  RAZORPAY_RECEIPT_MAX_LENGTH,
} from "../../src/server/payment/provider/razorpay/receipt";

const KEY_ID = "rzp_test_key_id_xx";
const KEY_SECRET = "test_only_razorpay_key_secret";
const WEBHOOK_SECRET = "test_only_razorpay_webhook_secret";

type MockOrder = Readonly<{
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status?: string;
}>;

type MockPayment = Readonly<{
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
}>;

function createMockHttp() {
  const ordersById = new Map<string, MockOrder>();
  const ordersByReceipt = new Map<string, MockOrder[]>();
  const paymentsByOrder = new Map<string, MockPayment[]>();
  const paymentsById = new Map<string, MockPayment>();
  const requests: RazorpayHttpRequest[] = [];
  let createBehavior: "ok" | "uncertain" | "duplicate" | "http_error" = "ok";
  let orderSeq = 1;

  function putOrder(order: MockOrder): void {
    ordersById.set(order.id, order);
    const list = ordersByReceipt.get(order.receipt) ?? [];
    list.push(order);
    ordersByReceipt.set(order.receipt, list);
  }

  function putPayment(payment: MockPayment): void {
    paymentsById.set(payment.id, payment);
    const list = (paymentsByOrder.get(payment.order_id) ?? []).filter((row) => row.id !== payment.id);
    list.push(payment);
    paymentsByOrder.set(payment.order_id, list);
  }

  const transport: RazorpayHttpTransport = Object.freeze({
    async request(input: RazorpayHttpRequest): Promise<RazorpayHttpResult> {
      requests.push(input);
      if (input.method === "POST" && input.path === "/orders") {
        if (createBehavior === "uncertain") {
          return Object.freeze({ kind: "uncertain", reason: "timeout" });
        }
        if (createBehavior === "duplicate") {
          return Object.freeze({
            kind: "http_error",
            status: 400,
            json: { error: { description: "Receipt already exists" } },
          });
        }
        if (createBehavior === "http_error") {
          return Object.freeze({
            kind: "http_error",
            status: 422,
            json: { error: { description: "invalid" } },
          });
        }
        const body = input.body as {
          amount: number;
          currency: string;
          receipt: string;
          payment_capture?: boolean;
        };
        const existing = ordersByReceipt.get(body.receipt) ?? [];
        if (existing.length > 0) {
          return Object.freeze({
            kind: "http_error",
            status: 400,
            json: { error: { description: "duplicate receipt" } },
          });
        }
        const order: MockOrder = {
          id: `order_mock_${String(orderSeq++).padStart(4, "0")}`,
          amount: body.amount,
          currency: body.currency,
          receipt: body.receipt,
          status: "created",
        };
        putOrder(order);
        return Object.freeze({ kind: "ok", status: 200, json: order });
      }
      if (input.method === "GET" && input.path === "/orders") {
        const receipt = input.query?.receipt ?? "";
        return Object.freeze({
          kind: "ok",
          status: 200,
          json: { items: ordersByReceipt.get(receipt) ?? [] },
        });
      }
      if (
        input.method === "GET" &&
        input.path.endsWith("/payments") &&
        input.path.startsWith("/orders/")
      ) {
        const orderId = decodeURIComponent(
          input.path.slice("/orders/".length, -"/payments".length),
        );
        return Object.freeze({
          kind: "ok",
          status: 200,
          json: { items: paymentsByOrder.get(orderId) ?? [] },
        });
      }
      if (input.method === "GET" && input.path.startsWith("/orders/")) {
        const orderId = decodeURIComponent(input.path.slice("/orders/".length));
        const order = ordersById.get(orderId);
        if (!order) return Object.freeze({ kind: "http_error", status: 404, json: {} });
        return Object.freeze({ kind: "ok", status: 200, json: order });
      }
      if (input.method === "GET" && input.path.startsWith("/payments/")) {
        const paymentId = decodeURIComponent(input.path.slice("/payments/".length));
        const payment = paymentsById.get(paymentId);
        if (!payment) return Object.freeze({ kind: "http_error", status: 404, json: {} });
        return Object.freeze({ kind: "ok", status: 200, json: payment });
      }
      return Object.freeze({ kind: "http_error", status: 404, json: {} });
    },
  });

  return {
    transport,
    requests,
    putOrder,
    putPayment,
    setCreateBehavior(behavior: typeof createBehavior) {
      createBehavior = behavior;
    },
  };
}

function requireClientEvidenceVerifier(
  provider: ReturnType<typeof createRazorpayPaymentProvider>,
) {
  const verify = provider.verifyClientEvidence;
  if (typeof verify !== "function") {
    throw new Error("Razorpay provider must implement verifyClientEvidence.");
  }
  return verify.bind(provider);
}

function createInput(executionIdentity: string, amountPaise = BigInt(19900)) {
  return {
    executionIdentity,
    amountPaise,
    currency: "INR" as const,
    methodIntent: "upi",
    paymentId: "11111111-1111-4111-8111-111111111111",
    attemptId: "22222222-2222-4222-8222-222222222222",
  };
}

describe("IMP-026A Razorpay receipt", () => {
  it("is deterministic, ASCII, ≤40 chars, unique per Attempt, and PII-free", () => {
    const a = razorpayReceiptFromExecutionIdentity("payexec_attempt_alpha");
    const b = razorpayReceiptFromExecutionIdentity("payexec_attempt_alpha");
    const c = razorpayReceiptFromExecutionIdentity("payexec_attempt_bravo");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a.length).toBeLessThanOrEqual(RAZORPAY_RECEIPT_MAX_LENGTH);
    expect(a).toMatch(/^[A-Za-z0-9]+$/);
    expect(a.toLowerCase()).not.toContain("customer");
    expect(a.toLowerCase()).not.toContain("phone");
  });
});

describe("IMP-026A Razorpay createExecution", () => {
  it("creates an automatic-capture INR Order with authoritative amount and deterministic receipt", async () => {
    const http = createMockHttp();
    const provider = createRazorpayPaymentProvider({
      keyId: KEY_ID,
      keySecret: KEY_SECRET,
      webhookSecret: WEBHOOK_SECRET,
      http: http.transport,
    });
    const input = createInput("payexec_create_ok");
    const evidence = await provider.createExecution(input);
    const create = http.requests.find((req) => req.method === "POST" && req.path === "/orders");
    expect(create?.body).toEqual({
      amount: 19900,
      currency: "INR",
      receipt: razorpayReceiptFromExecutionIdentity(input.executionIdentity),
      payment_capture: true,
    });
    expect(evidence.outcome).toBe("CLIENT_ACTION_REQUIRED");
    expect(evidence.clientAction?.kind).toBe("razorpay_standard_checkout");
    expect(evidence.clientAction?.payload.keyId).toBe(KEY_ID);
    expect(evidence.clientAction?.payload.amountPaise).toBe("19900");
    expect(evidence.clientAction?.payload.currency).toBe("INR");
    expect(evidence.clientAction?.payload.paymentId).toBe(input.paymentId);
    expect(evidence.clientAction?.payload).not.toHaveProperty("keySecret");
    const serialized = JSON.stringify(evidence, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value,
    );
    expect(serialized).not.toContain(KEY_SECRET);
    expect(serialized).not.toContain(WEBHOOK_SECRET);
  });

  it("recovers an existing Order after uncertain create", async () => {
    const http = createMockHttp();
    const receipt = razorpayReceiptFromExecutionIdentity("payexec_uncertain");
    http.putOrder({
      id: "order_recovered_1",
      amount: 19900,
      currency: "INR",
      receipt,
      status: "created",
    });
    http.setCreateBehavior("uncertain");
    const provider = createRazorpayPaymentProvider({
      keyId: KEY_ID,
      keySecret: KEY_SECRET,
      webhookSecret: WEBHOOK_SECRET,
      http: http.transport,
    });
    const evidence = await provider.createExecution(createInput("payexec_uncertain"));
    expect(evidence.outcome).toBe("CLIENT_ACTION_REQUIRED");
    expect(evidence.clientAction?.payload.razorpayOrderId).toBe("order_recovered_1");
    expect(http.requests.some((req) => req.method === "GET" && req.query?.receipt === receipt)).toBe(
      true,
    );
  });

  it("treats duplicate-receipt create as recovery", async () => {
    const http = createMockHttp();
    const receipt = razorpayReceiptFromExecutionIdentity("payexec_dup");
    http.putOrder({
      id: "order_dup_1",
      amount: 19900,
      currency: "INR",
      receipt,
    });
    http.setCreateBehavior("duplicate");
    const provider = createRazorpayPaymentProvider({
      keyId: KEY_ID,
      keySecret: KEY_SECRET,
      webhookSecret: WEBHOOK_SECRET,
      http: http.transport,
    });
    const evidence = await provider.createExecution(createInput("payexec_dup"));
    expect(evidence.outcome).toBe("CLIENT_ACTION_REQUIRED");
    expect(evidence.clientAction?.payload.razorpayOrderId).toBe("order_dup_1");
  });

  it("returns anomaly when recovered Order amount/currency mismatch", async () => {
    const http = createMockHttp();
    const receipt = razorpayReceiptFromExecutionIdentity("payexec_mismatch");
    http.putOrder({
      id: "order_bad_amt",
      amount: 1,
      currency: "INR",
      receipt,
    });
    http.setCreateBehavior("uncertain");
    const provider = createRazorpayPaymentProvider({
      keyId: KEY_ID,
      keySecret: KEY_SECRET,
      webhookSecret: WEBHOOK_SECRET,
      http: http.transport,
    });
    const evidence = await provider.createExecution(createInput("payexec_mismatch"));
    expect(evidence.outcome).toBe("ANOMALY");
    expect(evidence.anomalyCode).toBe("PAYMENT_PROVIDER_FINANCIAL_MISMATCH");
  });
});

describe("IMP-026A Razorpay queryExecution", () => {
  it("maps created and authorized to pending, captured to success, failed to definitive failure", async () => {
    const http = createMockHttp();
    const receipt = razorpayReceiptFromExecutionIdentity("payexec_query");
    http.putOrder({
      id: "order_query_1",
      amount: 19900,
      currency: "INR",
      receipt,
      status: "created",
    });
    const provider = createRazorpayPaymentProvider({
      keyId: KEY_ID,
      keySecret: KEY_SECRET,
      webhookSecret: WEBHOOK_SECRET,
      http: http.transport,
    });

    const created = await provider.queryExecution({
      executionIdentity: "payexec_query",
      provider: "razorpay",
    });
    expect(created.outcome).toBe("PENDING");
    expect(created.providerStatusCode).toBe("created");

    http.putPayment({
      id: "pay_auth_1",
      order_id: "order_query_1",
      amount: 19900,
      currency: "INR",
      status: "authorized",
    });
    const authorized = await provider.queryExecution({
      executionIdentity: "payexec_query",
      provider: "razorpay",
    });
    expect(authorized.outcome).toBe("PENDING");
    expect(authorized.providerStatusCode).toBe("authorized");

    http.putPayment({
      id: "pay_cap_1",
      order_id: "order_query_1",
      amount: 19900,
      currency: "INR",
      status: "captured",
    });
    const captured = await provider.queryExecution({
      executionIdentity: "payexec_query",
      provider: "razorpay",
    });
    expect(captured.outcome).toBe("SUCCEEDED");
    expect(captured.providerStatusCode).toBe("captured");
  });

  it("maps failed without capture to definitive failure", async () => {
    const http = createMockHttp();
    const receipt = razorpayReceiptFromExecutionIdentity("payexec_fail");
    http.putOrder({
      id: "order_fail_1",
      amount: 19900,
      currency: "INR",
      receipt,
    });
    http.putPayment({
      id: "pay_fail_1",
      order_id: "order_fail_1",
      amount: 19900,
      currency: "INR",
      status: "failed",
    });
    const provider = createRazorpayPaymentProvider({
      keyId: KEY_ID,
      keySecret: KEY_SECRET,
      webhookSecret: WEBHOOK_SECRET,
      http: http.transport,
    });
    const failed = await provider.queryExecution({
      executionIdentity: "payexec_fail",
      provider: "razorpay",
    });
    expect(failed.outcome).toBe("DEFINITIVE_FAILURE");
  });

  it("maps refunded without captured to anomaly, not synthesized success", async () => {
    const http = createMockHttp();
    const receipt = razorpayReceiptFromExecutionIdentity("payexec_refund");
    http.putOrder({
      id: "order_ref_1",
      amount: 19900,
      currency: "INR",
      receipt,
    });
    http.putPayment({
      id: "pay_ref_1",
      order_id: "order_ref_1",
      amount: 19900,
      currency: "INR",
      status: "refunded",
    });
    const provider = createRazorpayPaymentProvider({
      keyId: KEY_ID,
      keySecret: KEY_SECRET,
      webhookSecret: WEBHOOK_SECRET,
      http: http.transport,
    });
    const refunded = await provider.queryExecution({
      executionIdentity: "payexec_refund",
      provider: "razorpay",
    });
    expect(refunded.outcome).toBe("ANOMALY");
    expect(refunded.providerStatusCode).toBe("refunded");
    expect(refunded.anomalyCode).toBe("RAZORPAY_REFUNDED_NON_SUCCESS");
  });

  it("prefers captured over refunded when both provider payments exist", async () => {
    const http = createMockHttp();
    const receipt = razorpayReceiptFromExecutionIdentity("payexec_cap_ref");
    http.putOrder({
      id: "order_cap_ref_1",
      amount: 19900,
      currency: "INR",
      receipt,
    });
    http.putPayment({
      id: "pay_cap_ref_1",
      order_id: "order_cap_ref_1",
      amount: 19900,
      currency: "INR",
      status: "captured",
    });
    http.putPayment({
      id: "pay_cap_ref_2",
      order_id: "order_cap_ref_1",
      amount: 19900,
      currency: "INR",
      status: "refunded",
    });
    const provider = createRazorpayPaymentProvider({
      keyId: KEY_ID,
      keySecret: KEY_SECRET,
      webhookSecret: WEBHOOK_SECRET,
      http: http.transport,
    });
    const evidence = await provider.queryExecution({
      executionIdentity: "payexec_cap_ref",
      provider: "razorpay",
    });
    expect(evidence.outcome).toBe("SUCCEEDED");
    expect(evidence.providerStatusCode).toBe("captured");
  });
});

describe("IMP-026A Razorpay signatures and client evidence", () => {
  it("accepts a valid client signature and rejects an invalid one", async () => {
    const http = createMockHttp();
    http.putOrder({
      id: "order_sig_1",
      amount: 19900,
      currency: "INR",
      receipt: razorpayReceiptFromExecutionIdentity("payexec_sig"),
    });
    http.putPayment({
      id: "pay_sig_1",
      order_id: "order_sig_1",
      amount: 19900,
      currency: "INR",
      status: "captured",
    });
    const provider = createRazorpayPaymentProvider({
      keyId: KEY_ID,
      keySecret: KEY_SECRET,
      webhookSecret: WEBHOOK_SECRET,
      http: http.transport,
    });
    const valid = razorpayClientSignatureHex(KEY_SECRET, "order_sig_1", "pay_sig_1");
    const verify = requireClientEvidenceVerifier(provider);
    const ok = await verify({
      paymentId: "11111111-1111-4111-8111-111111111111",
      attemptId: "22222222-2222-4222-8222-222222222222",
      providerExecutionIdentity: "payexec_sig",
      kind: "razorpay_standard_checkout",
      payload: {
        razorpay_payment_id: "pay_sig_1",
        razorpay_order_id: "order_wrong_browser",
        razorpay_signature: valid,
      },
      providerReferences: [{ kind: "razorpay_order_id", value: "order_sig_1" }],
    });
    expect(ok.outcome).toBe("SUCCEEDED");

    await expect(
      verify({
        paymentId: "11111111-1111-4111-8111-111111111111",
        attemptId: "22222222-2222-4222-8222-222222222222",
        providerExecutionIdentity: "payexec_sig",
        kind: "razorpay_standard_checkout",
        payload: {
          razorpay_payment_id: "pay_sig_1",
          razorpay_order_id: "order_wrong_browser",
          razorpay_signature: razorpayClientSignatureHex(
            KEY_SECRET,
            "order_wrong_browser",
            "pay_sig_1",
          ),
        },
        providerReferences: [{ kind: "razorpay_order_id", value: "order_sig_1" }],
      }),
    ).rejects.toBeInstanceOf(PaymentError);
  });

  it("maps authorized client evidence to pending, not success", async () => {
    const http = createMockHttp();
    http.putPayment({
      id: "pay_auth_ce",
      order_id: "order_auth_ce",
      amount: 19900,
      currency: "INR",
      status: "authorized",
    });
    const provider = createRazorpayPaymentProvider({
      keyId: KEY_ID,
      keySecret: KEY_SECRET,
      webhookSecret: WEBHOOK_SECRET,
      http: http.transport,
    });
    const evidence = await requireClientEvidenceVerifier(provider)({
      paymentId: "11111111-1111-4111-8111-111111111111",
      attemptId: "22222222-2222-4222-8222-222222222222",
      providerExecutionIdentity: "payexec_auth_ce",
      kind: "razorpay_standard_checkout",
      payload: {
        razorpay_payment_id: "pay_auth_ce",
        razorpay_signature: razorpayClientSignatureHex(KEY_SECRET, "order_auth_ce", "pay_auth_ce"),
      },
      providerReferences: [{ kind: "razorpay_order_id", value: "order_auth_ce" }],
    });
    expect(evidence.outcome).toBe("PENDING");
    expect(evidence.providerStatusCode).toBe("authorized");
  });

  it("uses timing-safe comparison", () => {
    expect(timingSafeStringEqual("abc", "abc")).toBe(true);
    expect(timingSafeStringEqual("abc", "abd")).toBe(false);
    expect(timingSafeStringEqual("short", "longer-value")).toBe(false);
    const left = createHash("sha256").update("x").digest();
    const right = createHash("sha256").update("y").digest();
    expect(timingSafeEqual(left, left)).toBe(true);
    expect(timingSafeEqual(left, right)).toBe(false);
  });
});

describe("IMP-026A Razorpay webhook verify", () => {
  it("verifies HMAC, uses event id, and does not reject stale created_at", async () => {
    const provider = createRazorpayPaymentProvider({
      keyId: KEY_ID,
      keySecret: KEY_SECRET,
      webhookSecret: WEBHOOK_SECRET,
      http: createMockHttp().transport,
    });
    const body = JSON.stringify({
      event: "payment.captured",
      created_at: 1,
      payload: {
        payment: {
          entity: {
            id: "pay_wh_1",
            order_id: "order_wh_1",
            amount: 19900,
            currency: "INR",
            status: "captured",
          },
        },
      },
    });
    const rawBody = new TextEncoder().encode(body);
    const evidence = await provider.verifyWebhook({
      rawBody,
      headers: {
        "X-Razorpay-Signature": razorpayWebhookSignatureHex(WEBHOOK_SECRET, rawBody),
        "x-razorpay-event-id": "evt_wh_1",
      },
    });
    expect(evidence.outcome).toBe("SUCCEEDED");
    expect(evidence.providerEventId).toBe("evt_wh_1");

    await expect(
      provider.verifyWebhook({
        rawBody,
        headers: {
          "X-Razorpay-Signature": "deadbeef",
          "x-razorpay-event-id": "evt_wh_1",
        },
      }),
    ).rejects.toBeInstanceOf(PaymentError);
  });

  it("ignores unknown events without mutating Payment authority", async () => {
    const provider = createRazorpayPaymentProvider({
      keyId: KEY_ID,
      keySecret: KEY_SECRET,
      webhookSecret: WEBHOOK_SECRET,
      http: createMockHttp().transport,
    });
    const body = JSON.stringify({ event: "invoice.paid", payload: {} });
    const rawBody = new TextEncoder().encode(body);
    const evidence = await provider.verifyWebhook({
      rawBody,
      headers: {
        "X-Razorpay-Signature": razorpayWebhookSignatureHex(WEBHOOK_SECRET, rawBody),
        "x-razorpay-event-id": "evt_ignore",
      },
    });
    expect(evidence.outcome).toBe("UNSUPPORTED");
    expect(evidence.providerStatusCode).toBe("EVENT_IGNORED");
  });
});
