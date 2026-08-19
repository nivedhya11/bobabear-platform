/**
 * IMP-026A Razorpay client-evidence, webhook inbox, processor, and Order recovery.
 */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  PaymentInboxProcessor,
  claimInboxBatch,
  enqueueVerifiedProviderEvent,
  getInboxByProviderEvent,
} from "../../src/server/payment/inbox";
import {
  getPaymentState,
  reconcilePaymentAttempt,
  startPayment,
  submitPaymentClientEvidence,
} from "../../src/server/payment";
import { createRazorpayPaymentProvider } from "../../src/server/payment/provider/razorpay";
import { razorpayClientSignatureHex } from "../../src/server/payment/provider/razorpay/crypto";
import type { PaymentOperationOptions } from "../../src/server/payment/operations";
import { PaymentError } from "../../src/shared/payment";
import { recoverMissingOrdersBatch } from "../../src/server/order";
import {
  CHECKOUT_POLICY,
  FIXED_NOW,
  PAYMENT_POLICY,
  closeTrackedPersistenceHandles,
  newIdempotencyKey,
  withPaymentReadyHarness,
} from "../database/support/payment-fixtures";
import {
  countOrdersForCheckout,
  deleteOrderRow,
  getOrderByCheckout,
  orderOpts,
} from "../database/support/order-fixtures";
import { createMockRazorpayHttp } from "./support/mock-http";

const KEY_ID = "rzp_test_key_id_xx";
const KEY_SECRET = "test_only_razorpay_key_secret";
const WEBHOOK_SECRET = "test_only_razorpay_webhook_secret";

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function razorpayOpts(provider: ReturnType<typeof createRazorpayPaymentProvider>): PaymentOperationOptions {
  return {
    clock: { now: () => new Date(FIXED_NOW.getTime()) },
    policy: PAYMENT_POLICY,
    checkoutPolicy: CHECKOUT_POLICY,
    provider,
  };
}

function sha256File(rel: string): string {
  return createHash("sha256")
    .update(readFileSync(path.join(process.cwd(), rel), "utf8"))
    .digest("hex");
}

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

describe("IMP-026A migration integrity", () => {
  it("seals 0018_payment_provider_event_inbox", () => {
    const integrity = JSON.parse(
      readFileSync(path.join(process.cwd(), "drizzle/migration-integrity.json"), "utf8"),
    ) as { migrations: Array<{ path: string; sha256: string }> };
    const sealed = integrity.migrations.find(
      (m) => m.path === "drizzle/0018_payment_provider_event_inbox.sql",
    );
    expect(sealed?.sha256).toBe(sha256File("drizzle/0018_payment_provider_event_inbox.sql"));
  });
});

describe("IMP-026A client evidence application", () => {
  it("accepts owned captured evidence and rejects unauthorized/malformed payloads", async () => {
    await withPaymentReadyHarness(async (h) => {
      const http = createMockRazorpayHttp();
      const provider = createRazorpayPaymentProvider({
        keyId: KEY_ID,
        keySecret: KEY_SECRET,
        webhookSecret: WEBHOOK_SECRET,
        http: http.transport,
      });
      const opts = razorpayOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("ce-ok"),
        },
        opts,
      );
      const orderId = started.clientAction!.payload.razorpayOrderId;
      const paymentId = "pay_ce_ok";
      http.putPayment({
        id: paymentId,
        order_id: orderId,
        amount: Number(started.payment.expectedAmountPaise),
        currency: "INR",
        status: "captured",
      });

      await expect(
        submitPaymentClientEvidence(
          h.persistence,
          h.actors.customerB,
          {
            paymentId: started.payment.id,
            kind: "razorpay_standard_checkout",
            payload: {
              razorpay_payment_id: paymentId,
              razorpay_signature: razorpayClientSignatureHex(KEY_SECRET, orderId, paymentId),
            },
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "PAYMENT_NOT_FOUND" });

      await expect(
        submitPaymentClientEvidence(
          h.persistence,
          h.actor,
          {
            paymentId: started.payment.id,
            kind: "razorpay_standard_checkout",
            payload: { razorpay_payment_id: paymentId },
          },
          opts,
        ),
      ).rejects.toBeInstanceOf(PaymentError);

      const authorizedPayment = "pay_ce_auth";
      http.putPayment({
        id: authorizedPayment,
        order_id: orderId,
        amount: Number(started.payment.expectedAmountPaise),
        currency: "INR",
        status: "authorized",
      });
      const authorized = await submitPaymentClientEvidence(
        h.persistence,
        h.actor,
        {
          paymentId: started.payment.id,
          kind: "razorpay_standard_checkout",
          payload: {
            razorpay_payment_id: authorizedPayment,
            razorpay_signature: razorpayClientSignatureHex(KEY_SECRET, orderId, authorizedPayment),
          },
        },
        opts,
      );
      expect(authorized.payment!.status).toBe("PROCESSING");

      const captured = await submitPaymentClientEvidence(
        h.persistence,
        h.actor,
        {
          paymentId: started.payment.id,
          kind: "razorpay_standard_checkout",
          payload: {
            razorpay_payment_id: paymentId,
            razorpay_order_id: "order_browser_spoof",
            razorpay_signature: razorpayClientSignatureHex(KEY_SECRET, orderId, paymentId),
          },
        },
        opts,
      );
      expect(captured.payment!.status).toBe("SUCCEEDED");
      expect(await getOrderByCheckout(h.persistence, h.checkoutId)).not.toBeNull();
    });
  });

  it("rejects captured client evidence with amount mismatch as non-success", async () => {
    await withPaymentReadyHarness(async (h) => {
      const http = createMockRazorpayHttp();
      const provider = createRazorpayPaymentProvider({
        keyId: KEY_ID,
        keySecret: KEY_SECRET,
        webhookSecret: WEBHOOK_SECRET,
        http: http.transport,
      });
      const opts = razorpayOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("ce-mismatch"),
        },
        opts,
      );
      const orderId = started.clientAction!.payload.razorpayOrderId;
      const mismatchPayment = "pay_ce_mismatch";
      http.putPayment({
        id: mismatchPayment,
        order_id: orderId,
        amount: Number(started.payment.expectedAmountPaise) + 1,
        currency: "INR",
        status: "captured",
      });
      const mismatched = await submitPaymentClientEvidence(
        h.persistence,
        h.actor,
        {
          paymentId: started.payment.id,
          kind: "razorpay_standard_checkout",
          payload: {
            razorpay_payment_id: mismatchPayment,
            razorpay_signature: razorpayClientSignatureHex(KEY_SECRET, orderId, mismatchPayment),
          },
        },
        opts,
      );
      expect(mismatched.payment!.status).toBe("PROCESSING");
    });
  });
});

describe("IMP-026A webhook inbox + processor", () => {
  it("enqueues verified events, retries unknown correlation, recovers abandoned claims, and is idempotent", async () => {
    await withPaymentReadyHarness(async (h) => {
      const http = createMockRazorpayHttp();
      const provider = createRazorpayPaymentProvider({
        keyId: KEY_ID,
        keySecret: KEY_SECRET,
        webhookSecret: WEBHOOK_SECRET,
        http: http.transport,
      });
      const opts = razorpayOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("wh-inbox"),
        },
        opts,
      );
      const orderId = started.clientAction!.payload.razorpayOrderId;
      const amount = Number(started.payment.expectedAmountPaise);

      const unknownNow = new Date(FIXED_NOW.getTime());
      await h.persistence.transaction((tx) =>
        enqueueVerifiedProviderEvent(tx, {
          provider: "razorpay",
          providerEventId: "evt_unknown_1",
          now: unknownNow,
          evidence: {
            outcome: "SUCCEEDED",
            provider: "razorpay",
            providerExecutionIdentity: "order_does_not_exist",
            observedAmountPaise: BigInt(amount),
            observedCurrency: "INR",
            providerStatusCode: "captured",
            providerTimestamp: unknownNow,
            providerEventId: "evt_unknown_1",
            payloadDigest: sha256Hex("evt_unknown_1"),
          },
        }),
      );
      const unknownProcessor = new PaymentInboxProcessor({
        persistence: h.persistence,
        now: () => new Date(FIXED_NOW.getTime()),
        maxAttempts: 2,
        retryDelayMs: 0,
      });
      await unknownProcessor.tick();
      const unknownPending = await h.persistence.withContext((ctx) =>
        getInboxByProviderEvent(ctx, { provider: "razorpay", providerEventId: "evt_unknown_1" }),
      );
      expect(unknownPending?.processingState).toBe("pending");
      expect(unknownPending?.lastErrorCode).toBe("UNKNOWN_CORRELATION");
      await unknownProcessor.tick();
      const unknownPoison = await h.persistence.withContext((ctx) =>
        getInboxByProviderEvent(ctx, { provider: "razorpay", providerEventId: "evt_unknown_1" }),
      );
      expect(unknownPoison?.processingState).toBe("poison");

      const capturedNow = new Date(FIXED_NOW.getTime());
      const enqueue1 = await h.persistence.transaction((tx) =>
        enqueueVerifiedProviderEvent(tx, {
          provider: "razorpay",
          providerEventId: "evt_cap_1",
          now: capturedNow,
          evidence: {
            outcome: "SUCCEEDED",
            provider: "razorpay",
            providerExecutionIdentity: orderId,
            observedAmountPaise: BigInt(amount),
            observedCurrency: "INR",
            providerStatusCode: "captured",
            providerTimestamp: capturedNow,
            providerEventId: "evt_cap_1",
            payloadDigest: sha256Hex("evt_cap_1"),
            references: [{ kind: "razorpay_order_id", value: orderId }],
          },
        }),
      );
      const enqueue2 = await h.persistence.transaction((tx) =>
        enqueueVerifiedProviderEvent(tx, {
          provider: "razorpay",
          providerEventId: "evt_cap_1",
          now: capturedNow,
          evidence: {
            outcome: "SUCCEEDED",
            provider: "razorpay",
            providerExecutionIdentity: orderId,
            observedAmountPaise: BigInt(amount),
            observedCurrency: "INR",
            providerStatusCode: "captured",
            providerTimestamp: capturedNow,
            providerEventId: "evt_cap_1",
            payloadDigest: sha256Hex("evt_cap_1"),
            references: [{ kind: "razorpay_order_id", value: orderId }],
          },
        }),
      );
      expect(enqueue1.kind).toBe("inserted");
      expect(enqueue2.kind).toBe("duplicate");

      const processor = new PaymentInboxProcessor({
        persistence: h.persistence,
        now: () => new Date(FIXED_NOW.getTime() + 2_000),
        maxAttempts: 8,
      });
      await processor.tick();
      const capturedInbox = await h.persistence.withContext((ctx) =>
        getInboxByProviderEvent(ctx, { provider: "razorpay", providerEventId: "evt_cap_1" }),
      );
      expect(capturedInbox?.processingState).toBe("processed");
      const after = await getPaymentState(
        h.persistence,
        h.actor,
        { paymentId: started.payment.id },
        opts,
      );
      expect(after.payment!.status).toBe("SUCCEEDED");
      expect(await getOrderByCheckout(h.persistence, h.checkoutId)).not.toBeNull();

      await processor.tick();
      const again = await getPaymentState(
        h.persistence,
        h.actor,
        { paymentId: started.payment.id },
        opts,
      );
      expect(again.payment!.status).toBe("SUCCEEDED");
      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(1);

      await h.persistence.transaction((tx) =>
        enqueueVerifiedProviderEvent(tx, {
          provider: "razorpay",
          providerEventId: "evt_abandoned",
          now: new Date(FIXED_NOW.getTime() + 2_500),
          evidence: {
            outcome: "UNSUPPORTED",
            provider: "razorpay",
            providerExecutionIdentity: "",
            observedAmountPaise: null,
            observedCurrency: null,
            providerStatusCode: "EVENT_IGNORED",
            providerTimestamp: new Date(FIXED_NOW.getTime() + 2_500),
            providerEventId: "evt_abandoned",
            payloadDigest: sha256Hex("evt_abandoned"),
          },
        }),
      );
      const leaseNow = new Date(FIXED_NOW.getTime() + 2_500);
      const claimed = await h.persistence.withContext((ctx) =>
        claimInboxBatch(ctx, {
          now: leaseNow,
          leaseToken: randomUUID(),
          leaseExpiresAt: new Date(leaseNow.getTime() - 1_000),
          limit: 8,
        }),
      );
      expect(claimed.some((row) => row.providerEventId === "evt_abandoned")).toBe(true);
      const recovered = await h.persistence.withContext((ctx) =>
        claimInboxBatch(ctx, {
          now: new Date(leaseNow.getTime() + 1),
          leaseToken: randomUUID(),
          leaseExpiresAt: new Date(leaseNow.getTime() + 30_000),
          limit: 8,
        }),
      );
      expect(recovered.some((row) => row.providerEventId === "evt_abandoned")).toBe(true);

      await h.persistence.transaction((tx) =>
        enqueueVerifiedProviderEvent(tx, {
          provider: "razorpay",
          providerEventId: "evt_fail_late",
          now: new Date(FIXED_NOW.getTime() + 3_000),
          evidence: {
            outcome: "DEFINITIVE_FAILURE",
            provider: "razorpay",
            providerExecutionIdentity: orderId,
            observedAmountPaise: BigInt(amount),
            observedCurrency: "INR",
            providerStatusCode: "failed",
            providerTimestamp: new Date(FIXED_NOW.getTime() + 3_000),
            providerEventId: "evt_fail_late",
            payloadDigest: sha256Hex("evt_fail_late"),
            references: [{ kind: "razorpay_order_id", value: orderId }],
          },
        }),
      );
      await processor.tick();
      const stillSuccess = await getPaymentState(
        h.persistence,
        h.actor,
        { paymentId: started.payment.id },
        opts,
      );
      expect(stillSuccess.payment!.status).toBe("SUCCEEDED");
    });
  });
});

describe("IMP-026B refunded provider-state semantics", () => {
  it("keeps captured success and a single Order when later evidence is refunded", async () => {
    await withPaymentReadyHarness(async (h) => {
      const http = createMockRazorpayHttp();
      const provider = createRazorpayPaymentProvider({
        keyId: KEY_ID,
        keySecret: KEY_SECRET,
        webhookSecret: WEBHOOK_SECRET,
        http: http.transport,
      });
      const opts = razorpayOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("refund-after-capture"),
        },
        opts,
      );
      const orderId = started.clientAction!.payload.razorpayOrderId;
      const providerPaymentId = "pay_refund_after_cap";
      http.putPayment({
        id: providerPaymentId,
        order_id: orderId,
        amount: Number(started.payment.expectedAmountPaise),
        currency: "INR",
        status: "captured",
      });
      await submitPaymentClientEvidence(
        h.persistence,
        h.actor,
        {
          paymentId: started.payment.id,
          kind: "razorpay_standard_checkout",
          payload: {
            razorpay_payment_id: providerPaymentId,
            razorpay_signature: razorpayClientSignatureHex(KEY_SECRET, orderId, providerPaymentId),
          },
        },
        opts,
      );
      expect((await getPaymentState(h.persistence, h.actor, { paymentId: started.payment.id }, opts)).payment!.status).toBe(
        "SUCCEEDED",
      );
      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(1);

      http.putPayment({
        id: providerPaymentId,
        order_id: orderId,
        amount: Number(started.payment.expectedAmountPaise),
        currency: "INR",
        status: "refunded",
      });
      const afterRefund = await reconcilePaymentAttempt(
        h.persistence,
        h.actor,
        { paymentId: started.payment.id, attemptId: started.attempt.id },
        opts,
      );
      expect(afterRefund.payment!.status).toBe("SUCCEEDED");
      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(1);
    });
  });

  it("does not establish Payment success or materialize Order from refunded-only evidence", async () => {
    await withPaymentReadyHarness(async (h) => {
      const http = createMockRazorpayHttp();
      const provider = createRazorpayPaymentProvider({
        keyId: KEY_ID,
        keySecret: KEY_SECRET,
        webhookSecret: WEBHOOK_SECRET,
        http: http.transport,
      });
      const opts = razorpayOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("refund-first"),
        },
        opts,
      );
      const orderId = started.clientAction!.payload.razorpayOrderId;
      const providerPaymentId = "pay_refund_first";
      http.putPayment({
        id: providerPaymentId,
        order_id: orderId,
        amount: Number(started.payment.expectedAmountPaise),
        currency: "INR",
        status: "refunded",
      });
      const observed = await submitPaymentClientEvidence(
        h.persistence,
        h.actor,
        {
          paymentId: started.payment.id,
          kind: "razorpay_standard_checkout",
          payload: {
            razorpay_payment_id: providerPaymentId,
            razorpay_signature: razorpayClientSignatureHex(KEY_SECRET, orderId, providerPaymentId),
          },
        },
        opts,
      );
      expect(observed.payment!.status).not.toBe("SUCCEEDED");
      expect(observed.attempt?.status).not.toBe("SUCCEEDED");
      expect(await getOrderByCheckout(h.persistence, h.checkoutId)).toBeNull();
      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(0);
    });
  });
});

describe("IMP-026A Order-gap recovery", () => {
  it("recoverMissingOrdersBatch creates exactly one Order and is idempotent", async () => {
    await withPaymentReadyHarness(async (h) => {
      const http = createMockRazorpayHttp();
      const provider = createRazorpayPaymentProvider({
        keyId: KEY_ID,
        keySecret: KEY_SECRET,
        webhookSecret: WEBHOOK_SECRET,
        http: http.transport,
      });
      const opts = razorpayOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("gap-1"),
        },
        opts,
      );
      const orderId = started.clientAction!.payload.razorpayOrderId;
      const paymentId = "pay_gap_1";
      http.putPayment({
        id: paymentId,
        order_id: orderId,
        amount: Number(started.payment.expectedAmountPaise),
        currency: "INR",
        status: "captured",
      });
      await submitPaymentClientEvidence(
        h.persistence,
        h.actor,
        {
          paymentId: started.payment.id,
          kind: "razorpay_standard_checkout",
          payload: {
            razorpay_payment_id: paymentId,
            razorpay_signature: razorpayClientSignatureHex(KEY_SECRET, orderId, paymentId),
          },
        },
        opts,
      );
      const created = await getOrderByCheckout(h.persistence, h.checkoutId);
      expect(created).not.toBeNull();
      await deleteOrderRow(h.persistence, created!.id, h.connectionString);
      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(0);

      const first = await recoverMissingOrdersBatch(h.persistence, {}, orderOpts());
      expect(first.results.some((item) => item.checkoutId === h.checkoutId && item.disposition === "CREATED")).toBe(
        true,
      );
      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(1);
      const second = await recoverMissingOrdersBatch(h.persistence, {}, orderOpts());
      expect(
        second.results.some(
          (item) => item.checkoutId === h.checkoutId && item.disposition === "ALREADY_EXISTS",
        ) || second.results.every((item) => item.checkoutId !== h.checkoutId),
      ).toBe(true);
      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(1);
    });
  });
});
