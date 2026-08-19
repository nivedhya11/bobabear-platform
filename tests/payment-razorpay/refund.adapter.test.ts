/**
 * IMP-027 Razorpay Refund adapter tests (RF-07, RF-08, RF-09, RF-10, RF-11).
 */
import { describe, expect, it } from "vitest";

import { createRazorpayPaymentProvider } from "../../src/server/payment/provider/razorpay";
import { RAZORPAY_REFUND_IDEMPOTENCY_HEADER } from "../../src/server/payment/provider/razorpay/refund";
import type {
  RazorpayHttpRequest,
  RazorpayHttpResult,
  RazorpayHttpTransport,
} from "../../src/server/payment/provider/razorpay/http";
import { refundProviderIdempotencyKey } from "../../src/shared/refund";

const KEY_ID = "rzp_test_key_id_xx";
const KEY_SECRET = "test_only_razorpay_key_secret";
const WEBHOOK_SECRET = "test_only_razorpay_webhook_secret";

function createRefundMockHttp() {
  const requests: RazorpayHttpRequest[] = [];
  const refunds = new Map<string, Record<string, unknown>>();
  let createKind: "ok" | "pending" | "failed" | "uncertain" | "http_error" = "ok";
  let seq = 1;

  const transport: RazorpayHttpTransport = Object.freeze({
    async request(input: RazorpayHttpRequest): Promise<RazorpayHttpResult> {
      requests.push(input);
      if (input.method === "POST" && input.path.includes("/refund")) {
        if (createKind === "uncertain") {
          return Object.freeze({ kind: "uncertain", reason: "timeout" });
        }
        if (createKind === "http_error") {
          return Object.freeze({
            kind: "http_error",
            status: 400,
            json: { error: { description: "refund not allowed" } },
          });
        }
        const key = input.headers?.[RAZORPAY_REFUND_IDEMPOTENCY_HEADER] ?? "";
        const existing = [...refunds.values()].find((row) => row.idempotencyKey === key);
        if (existing) {
          return Object.freeze({ kind: "ok", status: 200, json: existing });
        }
        const body = input.body as { amount: number; currency: string; speed?: string };
        const id = `rfnd_mock_${String(seq++).padStart(4, "0")}`;
        const status =
          createKind === "pending" ? "pending" : createKind === "failed" ? "failed" : "processed";
        const entity = {
          id,
          payment_id: input.path.split("/")[2],
          amount: body.amount,
          currency: body.currency,
          status,
          speed_requested: body.speed,
          idempotencyKey: key,
        };
        refunds.set(id, entity);
        return Object.freeze({ kind: "ok", status: 200, json: entity });
      }
      if (input.method === "GET" && input.path.startsWith("/refunds/")) {
        const id = decodeURIComponent(input.path.slice("/refunds/".length));
        const entity = refunds.get(id);
        if (!entity) {
          return Object.freeze({ kind: "http_error", status: 404, json: {} });
        }
        return Object.freeze({ kind: "ok", status: 200, json: entity });
      }
      return Object.freeze({ kind: "http_error", status: 404, json: {} });
    },
  });

  return {
    transport,
    requests,
    refunds,
    setCreateKind(kind: typeof createKind) {
      createKind = kind;
    },
  };
}

describe("Razorpay refund adapter", () => {
  it("RF-08 createRefund uses normal speed and durable idempotency header", async () => {
    const mock = createRefundMockHttp();
    const provider = createRazorpayPaymentProvider({
      keyId: KEY_ID,
      keySecret: KEY_SECRET,
      webhookSecret: WEBHOOK_SECRET,
      http: mock.transport,
    });
    const refundId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const key = refundProviderIdempotencyKey(refundId);
    const evidence = await provider.createRefund!({
      refundId,
      providerPaymentId: "pay_test_1",
      amountPaise: BigInt(50000),
      currency: "INR",
      idempotencyKey: key,
    });
    expect(evidence.family).toBe("refund");
    expect(evidence.outcome).toBe("PROCESSED");
    expect(mock.requests[0]?.headers?.[RAZORPAY_REFUND_IDEMPOTENCY_HEADER]).toBe(key);
    expect((mock.requests[0]?.body as { speed: string }).speed).toBe("normal");
    expect(JSON.stringify(mock.requests[0]?.body)).not.toContain("customer complaint");
    expect(JSON.stringify(mock.requests)).not.toContain(KEY_SECRET);
  });

  it("RF-07 / RF-09 maps pending and failed without treating HTTP acceptance as PROCESSED", async () => {
    const mock = createRefundMockHttp();
    const provider = createRazorpayPaymentProvider({
      keyId: KEY_ID,
      keySecret: KEY_SECRET,
      webhookSecret: WEBHOOK_SECRET,
      http: mock.transport,
    });
    mock.setCreateKind("pending");
    const pending = await provider.createRefund!({
      refundId: "bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      providerPaymentId: "pay_test_1",
      amountPaise: BigInt(100),
      currency: "INR",
      idempotencyKey: "boba_rfnd_pending",
    });
    expect(pending.outcome).toBe("PENDING");

    mock.setCreateKind("failed");
    const failed = await provider.createRefund!({
      refundId: "cccccccc-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      providerPaymentId: "pay_test_1",
      amountPaise: BigInt(100),
      currency: "INR",
      idempotencyKey: "boba_rfnd_failed",
    });
    expect(failed.outcome).toBe("FAILED");

    mock.setCreateKind("http_error");
    const rejected = await provider.createRefund!({
      refundId: "dddddddd-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      providerPaymentId: "pay_test_1",
      amountPaise: BigInt(100),
      currency: "INR",
      idempotencyKey: "boba_rfnd_http",
    });
    expect(rejected.outcome).toBe("FAILED");
  });

  it("RF-10 same idempotency key reuses provider refund; RF-11 new key is a new refund", async () => {
    const mock = createRefundMockHttp();
    const provider = createRazorpayPaymentProvider({
      keyId: KEY_ID,
      keySecret: KEY_SECRET,
      webhookSecret: WEBHOOK_SECRET,
      http: mock.transport,
    });
    const keyA = "boba_rfnd_samekey";
    const first = await provider.createRefund!({
      refundId: "11111111-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      providerPaymentId: "pay_test_1",
      amountPaise: BigInt(100),
      currency: "INR",
      idempotencyKey: keyA,
    });
    const retry = await provider.createRefund!({
      refundId: "11111111-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      providerPaymentId: "pay_test_1",
      amountPaise: BigInt(100),
      currency: "INR",
      idempotencyKey: keyA,
    });
    expect(retry.providerRefundId).toBe(first.providerRefundId);

    const second = await provider.createRefund!({
      refundId: "22222222-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      providerPaymentId: "pay_test_1",
      amountPaise: BigInt(50),
      currency: "INR",
      idempotencyKey: "boba_rfnd_newkey",
    });
    expect(second.providerRefundId).not.toBe(first.providerRefundId);
  });

  it("uncertain create does not mark FAILED", async () => {
    const mock = createRefundMockHttp();
    mock.setCreateKind("uncertain");
    const provider = createRazorpayPaymentProvider({
      keyId: KEY_ID,
      keySecret: KEY_SECRET,
      webhookSecret: WEBHOOK_SECRET,
      http: mock.transport,
    });
    const evidence = await provider.createRefund!({
      refundId: "33333333-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      providerPaymentId: "pay_test_1",
      amountPaise: BigInt(100),
      currency: "INR",
      idempotencyKey: "boba_rfnd_uncertain",
    });
    expect(evidence.outcome).toBe("INDETERMINATE");
  });

  it("normalizes refund.processed webhook without leaking secrets", async () => {
    const { razorpayWebhookSignatureHex } = await import(
      "../../src/server/payment/provider/razorpay/crypto"
    );
    const provider = createRazorpayPaymentProvider({
      keyId: KEY_ID,
      keySecret: KEY_SECRET,
      webhookSecret: WEBHOOK_SECRET,
    });
    const body = JSON.stringify({
      event: "refund.processed",
      payload: {
        refund: {
          entity: {
            id: "rfnd_hook_1",
            payment_id: "pay_test_1",
            amount: 100,
            currency: "INR",
            status: "processed",
          },
        },
      },
    });
    const rawBody = new TextEncoder().encode(body);
    const evidence = await provider.verifyWebhook({
      rawBody,
      headers: {
        "x-razorpay-signature": razorpayWebhookSignatureHex(WEBHOOK_SECRET, rawBody),
        "x-razorpay-event-id": "evt_refund_1",
      },
    });
    expect("family" in evidence && evidence.family === "refund").toBe(true);
    if ("family" in evidence && evidence.family === "refund") {
      expect(evidence.outcome).toBe("PROCESSED");
      expect(evidence.providerRefundId).toBe("rfnd_hook_1");
    }
    const serialized = JSON.stringify(evidence, (_key, value) =>
      typeof value === "bigint" ? value.toString(10) : value,
    );
    expect(serialized).not.toContain(WEBHOOK_SECRET);
    expect(serialized).not.toContain(KEY_SECRET);
  });

  it("payment.refunded remains ignored and is not Refund authority", async () => {
    const { razorpayWebhookSignatureHex } = await import(
      "../../src/server/payment/provider/razorpay/crypto"
    );
    const provider = createRazorpayPaymentProvider({
      keyId: KEY_ID,
      keySecret: KEY_SECRET,
      webhookSecret: WEBHOOK_SECRET,
    });
    const body = JSON.stringify({
      event: "payment.refunded",
      payload: {
        payment: {
          entity: {
            id: "pay_test_1",
            order_id: "order_test_1",
            amount: 100,
            currency: "INR",
            status: "refunded",
          },
        },
      },
    });
    const rawBody = new TextEncoder().encode(body);
    const evidence = await provider.verifyWebhook({
      rawBody,
      headers: {
        "x-razorpay-signature": razorpayWebhookSignatureHex(WEBHOOK_SECRET, rawBody),
        "x-razorpay-event-id": "evt_payment_refunded_1",
      },
    });
    expect("family" in evidence && evidence.family === "refund").toBe(false);
    expect(evidence.outcome).toBe("UNSUPPORTED");
    expect("providerStatusCode" in evidence && evidence.providerStatusCode).toBe("EVENT_IGNORED");
  });
});
