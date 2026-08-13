import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PaymentPanel } from "./PaymentPanel";
import type { CommerceCheckout, CommerceCheckoutSnapshot } from "@/lib/customer-commerce";

const startPayment = vi.fn<(...args: unknown[]) => unknown>();
const retryPayment = vi.fn<(...args: unknown[]) => unknown>();
const getPaymentState = vi.fn<(...args: unknown[]) => unknown>();
const completeZeroPayableCheckout = vi.fn<(...args: unknown[]) => unknown>();
const listCustomerOrders = vi.fn<(...args: unknown[]) => unknown>();
const rememberPaymentRecovery = vi.fn<(...args: unknown[]) => unknown>();
const browserNavigate = vi.fn<(...args: unknown[]) => unknown>();
const readOrCreateStartIdempotencyKey = vi.fn<(...args: unknown[]) => unknown>(() => "idem-start");
const readOrCreateRetryIdempotencyKey = vi.fn<(...args: unknown[]) => unknown>(() => "idem-retry");
const readOrCreateZeroPayableIdempotencyKey = vi.fn<(...args: unknown[]) => unknown>(() => "idem-zero");

vi.mock("@/components/ordering/browser-navigate", () => ({
  browserNavigate: (...args: unknown[]) => browserNavigate(...args),
}));

vi.mock("@/lib/customer-commerce", async () => {
  const actual = await vi.importActual<typeof import("@/lib/customer-commerce")>(
    "@/lib/customer-commerce",
  );
  return {
    ...actual,
    startPayment: (...args: unknown[]) => startPayment(...args),
    retryPayment: (...args: unknown[]) => retryPayment(...args),
    getPaymentState: (...args: unknown[]) => getPaymentState(...args),
    completeZeroPayableCheckout: (...args: unknown[]) => completeZeroPayableCheckout(...args),
    listCustomerOrders: (...args: unknown[]) => listCustomerOrders(...args),
    rememberPaymentRecovery: (...args: unknown[]) => rememberPaymentRecovery(...args),
    readOrCreateStartIdempotencyKey: (...args: unknown[]) => readOrCreateStartIdempotencyKey(...args),
    readOrCreateRetryIdempotencyKey: (...args: unknown[]) => readOrCreateRetryIdempotencyKey(...args),
    readOrCreateZeroPayableIdempotencyKey: (...args: unknown[]) =>
      readOrCreateZeroPayableIdempotencyKey(...args),
  };
});

const snapshotBase: CommerceCheckoutSnapshot = {
  id: "snap-1",
  checkoutId: "chk-1",
  checkoutRevision: "3",
  sourceCartRevision: "2",
  selectedOutletId: "outlet-1",
  evaluatedAt: "2026-08-13T00:10:00.000Z",
  currency: "INR",
  basePaise: "19900",
  chargesPaise: "6000",
  prePromotionSubtotalPaise: "25900",
  promotionDiscountPaise: "0",
  taxablePaise: "25900",
  taxPaise: "1295",
  grandTotalPaise: "27195",
  taxInclusionMode: "exclusive",
  destination: {
    destinationKind: "ONE_TIME_ADDRESS",
    sourceSavedAddressId: null,
    recipientName: "A",
    recipientPhone: "+919876543210",
    addressLine1: "1 Mall Road",
    addressLine2: null,
    landmark: null,
    locality: null,
    city: "Dehradun",
    stateCode: "IN-UT",
    postalCode: "248001",
    coordinates: null,
    label: null,
  },
  lines: [],
  charges: [],
  promotionEffects: [],
  taxComponents: [],
};

const checkout: CommerceCheckout = {
  id: "chk-1",
  customerAuthUserId: "user-1",
  brandId: "brand-1",
  cartId: "cart-1",
  sourceCartRevision: "2",
  revision: "3",
  status: "READY_FOR_PAYMENT",
  expiresAt: "2026-08-13T01:00:00.000Z",
  activeSnapshotId: "snap-1",
  createdAt: "2026-08-13T00:00:00.000Z",
  updatedAt: "2026-08-13T00:10:00.000Z",
  destination: snapshotBase.destination,
  activeSnapshot: snapshotBase,
};

const payment = {
  id: "pay-1",
  checkoutId: "chk-1",
  checkoutSnapshotId: "snap-1",
  expectedAmountPaise: "27195",
  currency: "INR",
  status: "PROCESSING",
  createdAt: "2026-08-13T00:11:00.000Z",
  updatedAt: "2026-08-13T00:11:00.000Z",
  succeededAt: null,
  cancelledAt: null,
  expiredAt: null,
  supersededAt: null,
};

const attempt = {
  id: "att-1",
  paymentId: "pay-1",
  attemptOrdinal: "1",
  provider: "fake",
  methodIntent: "upi",
  providerExecutionIdentity: "payexec_1",
  status: "PENDING",
  createdAt: "2026-08-13T00:11:00.000Z",
  updatedAt: "2026-08-13T00:11:00.000Z",
  pendingAt: "2026-08-13T00:11:00.000Z",
  indeterminateAt: null,
  succeededAt: null,
  failedAt: null,
  cancelledAt: null,
};

beforeEach(() => {
  startPayment.mockReset();
  retryPayment.mockReset();
  getPaymentState.mockReset();
  completeZeroPayableCheckout.mockReset();
  listCustomerOrders.mockReset();
  rememberPaymentRecovery.mockReset();
  browserNavigate.mockReset();
  readOrCreateStartIdempotencyKey.mockClear();
  readOrCreateRetryIdempotencyKey.mockClear();
  readOrCreateZeroPayableIdempotencyKey.mockClear();
  listCustomerOrders.mockResolvedValue({
    ok: true,
    status: 200,
    data: { items: [{ orderId: "ord-1" }], nextCursor: null },
  });
});

describe("PaymentPanel", () => {
  it("shows starting then success for a paid start", async () => {
    const onOrderReady = vi.fn();
    startPayment.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        kind: "payment_started",
        payment: { ...payment, status: "SUCCEEDED" },
        attempt: { ...attempt, status: "SUCCEEDED" },
        checkoutId: "chk-1",
        checkoutRevision: "4",
      },
    });
    render(
      <PaymentPanel checkout={checkout} snapshot={snapshotBase} onOrderReady={onOrderReady} />,
    );
    await userEvent.click(screen.getByTestId("payment-start"));
    expect(screen.getByTestId("payment-starting")).toBeInTheDocument();
    await waitFor(() => expect(onOrderReady).toHaveBeenCalledWith("ord-1"));
    expect(startPayment).toHaveBeenCalledWith({
      checkoutId: "chk-1",
      expectedCheckoutRevision: "3",
      paymentMethodIntent: "upi",
      idempotencyKey: "idem-start",
    });
    expect(readOrCreateStartIdempotencyKey).toHaveBeenCalledTimes(1);
  });

  it("shows checking while payment remains unresolved", async () => {
    startPayment.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        kind: "payment_started",
        payment,
        attempt,
        checkoutId: "chk-1",
        checkoutRevision: "4",
      },
    });
    getPaymentState.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        state: {
          payment,
          attempt,
          attempts: [attempt],
          checkoutId: "chk-1",
          checkoutStatus: "PAYMENT_PENDING",
          checkoutRevision: "4",
          zeroPayableCompleted: false,
        },
      },
    });
    render(<PaymentPanel checkout={checkout} snapshot={snapshotBase} onOrderReady={vi.fn()} />);
    await userEvent.click(screen.getByTestId("payment-start"));
    await waitFor(() => expect(screen.getByTestId("payment-checking")).toBeInTheDocument());
  });

  it("offers retry when the attempt failed and payment remains OPEN", async () => {
    startPayment.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        kind: "payment_started",
        payment: { ...payment, status: "OPEN" },
        attempt: { ...attempt, status: "FAILED" },
        checkoutId: "chk-1",
        checkoutRevision: "4",
      },
    });
    retryPayment.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        kind: "payment_started",
        payment: { ...payment, status: "SUCCEEDED" },
        attempt: { ...attempt, id: "att-2", status: "SUCCEEDED" },
        checkoutId: "chk-1",
        checkoutRevision: "5",
      },
    });
    const onOrderReady = vi.fn();
    render(<PaymentPanel checkout={checkout} snapshot={snapshotBase} onOrderReady={onOrderReady} />);
    await userEvent.click(screen.getByTestId("payment-start"));
    await waitFor(() => expect(screen.getByTestId("payment-retry")).toBeInTheDocument());
    await userEvent.click(screen.getByTestId("payment-retry"));
    await waitFor(() => expect(onOrderReady).toHaveBeenCalledWith("ord-1"));
    expect(retryPayment).toHaveBeenCalledWith({
      paymentId: "pay-1",
      expectedCheckoutRevision: "4",
      paymentMethodIntent: "upi",
      idempotencyKey: "idem-retry",
    });
  });

  it("shows a clear error for transport failure", async () => {
    startPayment.mockResolvedValue({ ok: false, code: "NETWORK_ERROR", status: 0 });
    render(<PaymentPanel checkout={checkout} snapshot={snapshotBase} onOrderReady={vi.fn()} />);
    await userEvent.click(screen.getByTestId("payment-start"));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/network problem/i),
    );
  });

  it("follows a provider-neutral redirect clientAction", async () => {
    startPayment.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        kind: "payment_started",
        payment,
        attempt,
        checkoutId: "chk-1",
        checkoutRevision: "4",
        clientAction: { kind: "redirect", payload: { url: "https://fake-payments.test/pay/1" } },
      },
    });
    render(<PaymentPanel checkout={checkout} snapshot={snapshotBase} onOrderReady={vi.fn()} />);
    await userEvent.click(screen.getByTestId("payment-start"));
    await waitFor(() =>
      expect(browserNavigate).toHaveBeenCalledWith("https://fake-payments.test/pay/1"),
    );
    expect(rememberPaymentRecovery).toHaveBeenCalledWith({
      paymentId: "pay-1",
      checkoutId: "chk-1",
      checkoutRevision: "4",
    });
  });

  it("completes zero-payable without starting a Payment", async () => {
    const onOrderReady = vi.fn();
    completeZeroPayableCheckout.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        kind: "zero_payable_completed",
        checkoutId: "chk-1",
        checkoutRevision: "4",
        snapshotId: "snap-1",
      },
    });
    render(
      <PaymentPanel
        checkout={checkout}
        snapshot={{ ...snapshotBase, grandTotalPaise: "0" }}
        onOrderReady={onOrderReady}
      />,
    );
    expect(screen.queryByTestId("payment-start")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /complete order/i }));
    await waitFor(() => expect(onOrderReady).toHaveBeenCalledWith("ord-1"));
    expect(startPayment).not.toHaveBeenCalled();
    expect(completeZeroPayableCheckout).toHaveBeenCalledWith({
      checkoutId: "chk-1",
      expectedCheckoutRevision: "3",
      idempotencyKey: "idem-zero",
    });
  });

  it("reuses the same start key when the customer clicks Pay twice quickly", async () => {
    let resolveStart: ((value: unknown) => void) | undefined;
    startPayment.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveStart = resolve;
        }),
    );
    render(<PaymentPanel checkout={checkout} snapshot={snapshotBase} onOrderReady={vi.fn()} />);
    const button = screen.getByTestId("payment-start");
    await userEvent.click(button);
    await userEvent.click(button);
    expect(startPayment).toHaveBeenCalledTimes(1);
    resolveStart?.({
      ok: true,
      status: 200,
      data: {
        kind: "payment_started",
        payment: { ...payment, status: "SUCCEEDED" },
        attempt: { ...attempt, status: "SUCCEEDED" },
        checkoutId: "chk-1",
        checkoutRevision: "4",
      },
    });
    await waitFor(() => expect(readOrCreateStartIdempotencyKey).toHaveBeenCalledTimes(1));
  });
});
