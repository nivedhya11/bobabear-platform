import { afterEach, describe, expect, it, vi } from "vitest";

import {
  completeZeroPayableCheckout,
  getPayment,
  getPaymentState,
  retryPayment,
  startPayment,
  submitPaymentClientEvidence,
} from "./payment";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const payment = {
  id: "11111111-1111-4111-8111-111111111111",
  checkoutId: "22222222-2222-4222-8222-222222222222",
  checkoutSnapshotId: "33333333-3333-4333-8333-333333333333",
  expectedAmountPaise: "27195",
  currency: "INR",
  status: "PROCESSING",
  createdAt: "2026-08-13T00:00:00.000Z",
  updatedAt: "2026-08-13T00:00:00.000Z",
  succeededAt: null,
  cancelledAt: null,
  expiredAt: null,
  supersededAt: null,
};

const attempt = {
  id: "44444444-4444-4444-8444-444444444444",
  paymentId: payment.id,
  attemptOrdinal: "1",
  provider: "fake",
  methodIntent: "upi",
  providerExecutionIdentity: "payexec_1",
  status: "PENDING",
  createdAt: "2026-08-13T00:00:00.000Z",
  updatedAt: "2026-08-13T00:00:00.000Z",
  pendingAt: "2026-08-13T00:00:00.000Z",
  indeterminateAt: null,
  succeededAt: null,
  failedAt: null,
  cancelledAt: null,
};

describe("payment client", () => {
  it("starts payment with JSON idempotencyKey and same-origin credentials", async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      async () =>
        jsonResponse({
          ok: true,
          kind: "payment_started",
          payment,
          attempt,
          checkoutId: payment.checkoutId,
          checkoutRevision: "4",
          clientAction: { kind: "redirect", payload: { url: "https://fake-payments.test/pay/1" } },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const started = await startPayment({
      checkoutId: payment.checkoutId,
      expectedCheckoutRevision: "3",
      paymentMethodIntent: "upi",
      idempotencyKey: "idem-start-1",
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.data.payment.id).toBe(payment.id);
    expect(started.data.clientAction?.kind).toBe("redirect");

    const init = fetchMock.mock.calls[0]?.[1];
    expect(init).toBeDefined();
    if (!init) return;
    expect(init.credentials).toBe("same-origin");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      checkoutId: payment.checkoutId,
      expectedCheckoutRevision: "3",
      paymentMethodIntent: "upi",
      idempotencyKey: "idem-start-1",
    });
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("reads payment and payment state", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ ok: true, payment: { ...payment, status: "SUCCEEDED" } }))
        .mockResolvedValueOnce(
          jsonResponse({
            ok: true,
            state: {
              payment: { ...payment, status: "SUCCEEDED" },
              attempt: { ...attempt, status: "SUCCEEDED" },
              attempts: [{ ...attempt, status: "SUCCEEDED" }],
              checkoutId: payment.checkoutId,
              checkoutStatus: "COMPLETED",
              checkoutRevision: "5",
              zeroPayableCompleted: false,
            },
          }),
        ),
    );

    const got = await getPayment(payment.id);
    expect(got.ok).toBe(true);
    if (!got.ok) return;
    expect(got.data.payment.status).toBe("SUCCEEDED");

    const state = await getPaymentState(payment.id);
    expect(state.ok).toBe(true);
    if (!state.ok) return;
    expect(state.data.state.checkoutStatus).toBe("COMPLETED");
  });

  it("retries payment with a distinct idempotencyKey", async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      async () =>
        jsonResponse({
          ok: true,
          kind: "payment_started",
          payment: { ...payment, status: "PROCESSING" },
          attempt: { ...attempt, id: "55555555-5555-4555-8555-555555555555", attemptOrdinal: "2" },
          checkoutId: payment.checkoutId,
          checkoutRevision: "4",
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const retried = await retryPayment({
      paymentId: payment.id,
      expectedCheckoutRevision: "4",
      paymentMethodIntent: "upi",
      idempotencyKey: "idem-retry-1",
    });
    expect(retried.ok).toBe(true);
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      expectedCheckoutRevision: "4",
      paymentMethodIntent: "upi",
      idempotencyKey: "idem-retry-1",
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(`/api/v1/payments/${payment.id}/retry`);
  });

  it("surfaces D-360 payment errors without inventing codes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({ ok: false, code: "PAYMENT_IDEMPOTENCY_CONFLICT", requestId: "req-p" }, 409),
      ),
    );
    const failed = await startPayment({
      checkoutId: payment.checkoutId,
      expectedCheckoutRevision: "3",
      paymentMethodIntent: "card",
      idempotencyKey: "idem-start-1",
    });
    expect(failed).toEqual({
      ok: false,
      code: "PAYMENT_IDEMPOTENCY_CONFLICT",
      requestId: "req-p",
      status: 409,
    });
  });

  it("submits Razorpay client evidence without treating the handler as success", async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      async () =>
        jsonResponse({
          ok: true,
          state: {
            payment: { ...payment, status: "PROCESSING" },
            attempt,
            attempts: [attempt],
            checkoutId: payment.checkoutId,
            checkoutStatus: "PAYMENT_PENDING",
            checkoutRevision: "4",
            zeroPayableCompleted: false,
          },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const submitted = await submitPaymentClientEvidence({
      paymentId: payment.id,
      kind: "razorpay_standard_checkout",
      payload: {
        razorpay_payment_id: "pay_1",
        razorpay_order_id: "order_1",
        razorpay_signature: "sig_1",
      },
    });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    expect(submitted.data.state.payment?.status).toBe("PROCESSING");
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(`/api/v1/payments/${payment.id}/client-evidence`);
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      kind: "razorpay_standard_checkout",
      payload: {
        razorpay_payment_id: "pay_1",
        razorpay_order_id: "order_1",
        razorpay_signature: "sig_1",
      },
    });
  });

  it("surfaces invalid client-evidence responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({ ok: false, code: "PAYMENT_PROVIDER_EVIDENCE_INVALID", requestId: "req-e" }, 400),
      ),
    );
    const rejected = await submitPaymentClientEvidence({
      paymentId: payment.id,
      kind: "razorpay_standard_checkout",
      payload: {
        razorpay_payment_id: "pay_1",
        razorpay_order_id: "order_1",
        razorpay_signature: "bad",
      },
    });
    expect(rejected).toEqual({
      ok: false,
      code: "PAYMENT_PROVIDER_EVIDENCE_INVALID",
      requestId: "req-e",
      status: 400,
    });
  });

  it("completes zero-payable without paymentMethodIntent", async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      async () =>
        jsonResponse({
          ok: true,
          kind: "zero_payable_completed",
          checkoutId: payment.checkoutId,
          checkoutRevision: "4",
          snapshotId: payment.checkoutSnapshotId,
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const completed = await completeZeroPayableCheckout({
      checkoutId: payment.checkoutId,
      expectedCheckoutRevision: "3",
      idempotencyKey: "idem-zero-1",
    });
    expect(completed.ok).toBe(true);
    if (!completed.ok) return;
    expect(completed.data.kind).toBe("zero_payable_completed");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      expectedCheckoutRevision: "3",
      idempotencyKey: "idem-zero-1",
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      `/api/v1/checkouts/${payment.checkoutId}/complete-zero-payable`,
    );
  });
});
