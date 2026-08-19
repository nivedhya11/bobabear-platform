/**
 * IMP-026A HTTP: Razorpay webhook ingress + client-evidence route.
 */
import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { getPaymentState, startPayment } from "../../src/server/payment";
import {
  getInboxByProviderEvent,
  PaymentInboxProcessor,
} from "../../src/server/payment/inbox";
import { createRazorpayPaymentProvider } from "../../src/server/payment/provider/razorpay";
import {
  razorpayClientSignatureHex,
  razorpayWebhookSignatureHex,
} from "../../src/server/payment/provider/razorpay/crypto";
import type { PaymentOperationOptions } from "../../src/server/payment/operations";
import { getOrderByCheckout } from "../database/support/order-fixtures";
import {
  CHECKOUT_POLICY,
  PAYMENT_POLICY,
  newIdempotencyKey,
  withCheckoutReadyHarness,
  bringCheckoutToReady,
} from "../database/support/payment-fixtures";
import { createMockRazorpayHttp } from "../payment-razorpay/support/mock-http";
import {
  mintCustomerSessionCookieHeader,
  withCustomerCommerceHttpService,
} from "./support/service-harness";

const KEY_ID = "rzp_test_key_id_xx";
const KEY_SECRET = "test_only_razorpay_key_secret";
const WEBHOOK_SECRET = "test_only_razorpay_webhook_secret";

function jsonHeaders(cookie?: string): HeadersInit {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (cookie) headers.cookie = cookie;
  return headers;
}

function razorpayOpts(
  provider: ReturnType<typeof createRazorpayPaymentProvider>,
): PaymentOperationOptions {
  return {
    clock: { now: () => new Date() },
    policy: PAYMENT_POLICY,
    checkoutPolicy: CHECKOUT_POLICY,
    provider,
  };
}

describe("IMP-026A HTTP Razorpay webhook", () => {
  it("acks after inbox insert and does not transition Payment in the HTTP request", async () => {
    await withCheckoutReadyHarness(async (harness) => {
      const http = createMockRazorpayHttp();
      const provider = createRazorpayPaymentProvider({
        keyId: KEY_ID,
        keySecret: KEY_SECRET,
        webhookSecret: WEBHOOK_SECRET,
        http: http.transport,
      });
      const ready = await bringCheckoutToReady(
        harness.persistence,
        harness.actors.customerA,
        harness.cartId,
        harness.addressId,
        { now: () => new Date() },
      );
      const started = await startPayment(
        harness.persistence,
        harness.actors.customerA,
        {
          checkoutId: ready.checkoutId,
          expectedCheckoutRevision: ready.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("http-wh"),
        },
        razorpayOpts(provider),
      );
      const orderId = started.clientAction!.payload.razorpayOrderId;
      const amount = Number(started.payment.expectedAmountPaise);
      const body = JSON.stringify({
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_http_wh",
              order_id: orderId,
              amount,
              currency: "INR",
              status: "captured",
            },
          },
        },
      });
      const raw = Buffer.from(body, "utf8");
      const signature = razorpayWebhookSignatureHex(WEBHOOK_SECRET, raw);

      await withCustomerCommerceHttpService(
        harness.database.connectionString,
        async ({ baseUrl }) => {
          const invalid = await fetch(
            `${baseUrl}/api/integrations/payments/razorpay/webhook`,
            {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "X-Razorpay-Signature": "invalid",
                "x-razorpay-event-id": "evt_http_wh_1",
              },
              body,
            },
          );
          expect(invalid.status).toBe(400);
          const missing = await harness.persistence.withContext((ctx) =>
            getInboxByProviderEvent(ctx, {
              provider: "razorpay",
              providerEventId: "evt_http_wh_1",
            }),
          );
          expect(missing).toBeNull();

          const first = await fetch(
            `${baseUrl}/api/integrations/payments/razorpay/webhook`,
            {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "X-Razorpay-Signature": signature,
                "x-razorpay-event-id": "evt_http_wh_1",
              },
              body,
            },
          );
          expect(first.status).toBe(200);
          expect((await first.json()).ok).toBe(true);

          const duplicate = await fetch(
            `${baseUrl}/api/integrations/payments/razorpay/webhook`,
            {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "X-Razorpay-Signature": signature,
                "x-razorpay-event-id": "evt_http_wh_1",
              },
              body,
            },
          );
          expect(duplicate.status).toBe(200);

          const inbox = await harness.persistence.withContext((ctx) =>
            getInboxByProviderEvent(ctx, {
              provider: "razorpay",
              providerEventId: "evt_http_wh_1",
            }),
          );
          expect(inbox?.processingState).toBe("pending");

          const stateBefore = await getPaymentState(
            harness.persistence,
            harness.actors.customerA,
            { paymentId: started.payment.id },
            razorpayOpts(provider),
          );
          expect(stateBefore.payment!.status).toBe("PROCESSING");
          expect(await getOrderByCheckout(harness.persistence, ready.checkoutId)).toBeNull();

          const processor = new PaymentInboxProcessor({
            persistence: harness.persistence,
            now: () => new Date(),
          });
          await processor.tick();

          const stateAfter = await getPaymentState(
            harness.persistence,
            harness.actors.customerA,
            { paymentId: started.payment.id },
            razorpayOpts(provider),
          );
          expect(stateAfter.payment!.status).toBe("SUCCEEDED");
          expect(await getOrderByCheckout(harness.persistence, ready.checkoutId)).not.toBeNull();
        },
        { paymentProvider: provider },
      );
    });
  });

  it("returns 500 when durable inbox insert fails", async () => {
    await withCheckoutReadyHarness(async (harness) => {
      const http = createMockRazorpayHttp();
      const provider = createRazorpayPaymentProvider({
        keyId: KEY_ID,
        keySecret: KEY_SECRET,
        webhookSecret: WEBHOOK_SECRET,
        http: http.transport,
      });
      await withCustomerCommerceHttpService(
        harness.database.connectionString,
        async ({ baseUrl, service }) => {
          const persistence = (
            service as unknown as {
              persistence: {
                transaction: (fn: unknown) => Promise<unknown>;
              };
            }
          ).persistence;
          const original = persistence.transaction.bind(persistence);
          persistence.transaction = async () => {
            throw new Error("inbox unavailable");
          };
          try {
            const body = JSON.stringify({
              event: "payment.authorized",
              payload: {
                payment: {
                  entity: {
                    id: "pay_fail_inbox",
                    order_id: "order_fail_inbox",
                    amount: 100,
                    currency: "INR",
                    status: "authorized",
                  },
                },
              },
            });
            const raw = Buffer.from(body, "utf8");
            const response = await fetch(
              `${baseUrl}/api/integrations/payments/razorpay/webhook`,
              {
                method: "POST",
                headers: {
                  "content-type": "application/json",
                  "X-Razorpay-Signature": razorpayWebhookSignatureHex(WEBHOOK_SECRET, raw),
                  "x-razorpay-event-id": "evt_fail_inbox",
                },
                body,
              },
            );
            expect(response.status).toBe(500);
          } finally {
            persistence.transaction = original;
          }
        },
        { paymentProvider: provider },
      );
    });
  });
});

describe("IMP-026A HTTP client-evidence", () => {
  it("requires auth, ownership, and bounded payload", async () => {
    await withCheckoutReadyHarness(async (harness) => {
      const http = createMockRazorpayHttp();
      const provider = createRazorpayPaymentProvider({
        keyId: KEY_ID,
        keySecret: KEY_SECRET,
        webhookSecret: WEBHOOK_SECRET,
        http: http.transport,
      });
      const ready = await bringCheckoutToReady(
        harness.persistence,
        harness.actors.customerA,
        harness.cartId,
        harness.addressId,
        { now: () => new Date() },
      );
      const started = await startPayment(
        harness.persistence,
        harness.actors.customerA,
        {
          checkoutId: ready.checkoutId,
          expectedCheckoutRevision: ready.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("http-ce"),
        },
        razorpayOpts(provider),
      );
      const orderId = started.clientAction!.payload.razorpayOrderId;
      const razorpayPaymentId = "pay_http_ce";
      http.putPayment({
        id: razorpayPaymentId,
        order_id: orderId,
        amount: Number(started.payment.expectedAmountPaise),
        currency: "INR",
        status: "captured",
      });
      const cookieA = await mintCustomerSessionCookieHeader(
        harness.database.connectionString,
        harness.actors.customerAId,
      );
      const cookieB = await mintCustomerSessionCookieHeader(
        harness.database.connectionString,
        harness.actors.customerBId,
      );

      await withCustomerCommerceHttpService(
        harness.database.connectionString,
        async ({ baseUrl }) => {
          const unauth = await fetch(
            `${baseUrl}/api/v1/payments/${started.payment.id}/client-evidence`,
            {
              method: "POST",
              headers: jsonHeaders(),
              body: JSON.stringify({
                kind: "razorpay_standard_checkout",
                payload: {
                  razorpay_payment_id: razorpayPaymentId,
                  razorpay_signature: razorpayClientSignatureHex(
                    KEY_SECRET,
                    orderId,
                    razorpayPaymentId,
                  ),
                },
              }),
            },
          );
          expect(unauth.status).toBe(401);

          const foreign = await fetch(
            `${baseUrl}/api/v1/payments/${started.payment.id}/client-evidence`,
            {
              method: "POST",
              headers: jsonHeaders(cookieB),
              body: JSON.stringify({
                kind: "razorpay_standard_checkout",
                payload: {
                  razorpay_payment_id: razorpayPaymentId,
                  razorpay_signature: razorpayClientSignatureHex(
                    KEY_SECRET,
                    orderId,
                    razorpayPaymentId,
                  ),
                },
              }),
            },
          );
          expect(foreign.status).toBe(404);

          const malformed = await fetch(
            `${baseUrl}/api/v1/payments/${started.payment.id}/client-evidence`,
            {
              method: "POST",
              headers: jsonHeaders(cookieA),
              body: JSON.stringify({
                kind: "razorpay_standard_checkout",
                payload: { huge: "x".repeat(600) },
              }),
            },
          );
          expect(malformed.status).toBe(400);

          const missing = await fetch(
            `${baseUrl}/api/v1/payments/${randomUUID()}/client-evidence`,
            {
              method: "POST",
              headers: jsonHeaders(cookieA),
              body: JSON.stringify({
                kind: "razorpay_standard_checkout",
                payload: {
                  razorpay_payment_id: razorpayPaymentId,
                  razorpay_signature: razorpayClientSignatureHex(
                    KEY_SECRET,
                    orderId,
                    razorpayPaymentId,
                  ),
                },
              }),
            },
          );
          expect(missing.status).toBe(404);

          const ok = await fetch(
            `${baseUrl}/api/v1/payments/${started.payment.id}/client-evidence`,
            {
              method: "POST",
              headers: jsonHeaders(cookieA),
              body: JSON.stringify({
                kind: "razorpay_standard_checkout",
                payload: {
                  razorpay_payment_id: razorpayPaymentId,
                  razorpay_signature: razorpayClientSignatureHex(
                    KEY_SECRET,
                    orderId,
                    razorpayPaymentId,
                  ),
                },
              }),
            },
          );
          expect(ok.status).toBe(200);
          const okBody = await ok.json();
          expect(okBody.ok).toBe(true);
          expect(okBody.state.payment.status).toBe("SUCCEEDED");
        },
        { paymentProvider: provider },
      );
    });
  });
});

describe("IMP-026 HTTP payment start persistence", () => {
  it("POST /api/v1/payments commits payment checkout_id and provider references with payment_id", async () => {
    await withCheckoutReadyHarness(async (harness) => {
      const http = createMockRazorpayHttp();
      const provider = createRazorpayPaymentProvider({
        keyId: KEY_ID,
        keySecret: KEY_SECRET,
        webhookSecret: WEBHOOK_SECRET,
        http: http.transport,
      });
      const ready = await bringCheckoutToReady(
        harness.persistence,
        harness.actors.customerA,
        harness.cartId,
        harness.addressId,
        { now: () => new Date() },
      );
      const cookie = await mintCustomerSessionCookieHeader(
        harness.database.connectionString,
        harness.actors.customerAId,
      );

      await withCustomerCommerceHttpService(
        harness.database.connectionString,
        async ({ baseUrl }) => {
          const started = await fetch(`${baseUrl}/api/v1/payments`, {
            method: "POST",
            headers: jsonHeaders(cookie),
            body: JSON.stringify({
              checkoutId: ready.checkoutId,
              expectedCheckoutRevision: ready.revision.toString(),
              paymentMethodIntent: "upi",
              idempotencyKey: newIdempotencyKey("http-start"),
            }),
          });
          const body = await started.json();
          expect(started.status).toBe(200);
          expect(body.ok).toBe(true);
          expect(body.clientAction?.kind).toBe("razorpay_standard_checkout");

          const paymentId = body.payment.id as string;
          const orderId = body.clientAction.payload.razorpayOrderId as string;
          const attemptId = body.attempt.id as string;

          await harness.persistence.withContext(async (ctx) => {
            const paymentRows = await ctx.db.execute(sql`
              select checkout_id::text as checkout_id
              from app.payments
              where id = ${paymentId}::uuid
            `);
            expect(paymentRows.rows).toHaveLength(1);
            expect(paymentRows.rows[0]!.checkout_id).toBe(ready.checkoutId);

            const refRows = await ctx.db.execute(sql`
              select reference_kind, reference_value, payment_id::text, attempt_id::text
              from app.payment_provider_references
              where payment_id = ${paymentId}::uuid
            `);
            expect(refRows.rows.length).toBeGreaterThan(0);
            for (const row of refRows.rows) {
              expect(row.payment_id).toBe(paymentId);
            }
            const orderRef = refRows.rows.find(
              (row) => row.reference_kind === "razorpay_order_id",
            );
            expect(orderRef?.reference_value).toBe(orderId);
            expect(orderRef?.attempt_id).toBe(attemptId);
          });
        },
        { paymentProvider: provider, enablePaymentInboxProcessor: true },
      );
    });
  });
});
