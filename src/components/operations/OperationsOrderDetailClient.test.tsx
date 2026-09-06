import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OperationsOrderDetailClient } from "./OperationsOrderDetailClient";

const getWorkforceOrder = vi.fn<(...args: unknown[]) => unknown>();
const acceptWorkforceOrder = vi.fn<(...args: unknown[]) => unknown>();
const fulfilWorkforceOrder = vi.fn<(...args: unknown[]) => unknown>();
const cancelWorkforceOrder = vi.fn<(...args: unknown[]) => unknown>();
let query = "orderId=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(query),
}));

vi.mock("@/lib/administration/api", () => ({
  fetchAdminSession: vi.fn(async () => ({
    ok: true,
    status: 200,
    data: {
      session: {
        workforceUserId: "workforce-1",
        signedInLabel: "ops@example.com",
        capabilities: {
          "order.read": true,
          "payment.refund": true,
          "payment.refund.read": true,
          "notification.resend": true,
        },
      },
    },
  })),
}));

vi.mock("@/lib/operations/delivery", () => ({
  getWorkforceDelivery: vi.fn(async () => ({
    ok: true,
    status: 200,
    data: { delivery: null },
  })),
  postDeliveryCommand: vi.fn(),
}));

vi.mock("@/lib/operations/refunds", () => ({
  getOrderRefunds: vi.fn(async () => ({
    ok: false,
    status: 404,
    code: "REFUND_NOT_FOUND",
  })),
  createOrderRefund: vi.fn(),
  createRefundRequestId: () => "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  refundStatusLabel: (status: string) => status,
}));

vi.mock("@/lib/operations/notifications", () => ({
  getOrderNotifications: vi.fn(async () => ({
    ok: false,
    status: 404,
    code: "NOTIFICATION_NOT_FOUND",
  })),
  resendOrderNotification: vi.fn(),
  notificationStatusLabel: (status: string) => status,
}));

vi.mock("@/lib/operations/orders", async () => {
  const actual = await vi.importActual<typeof import("@/lib/operations/orders")>(
    "@/lib/operations/orders",
  );
  return {
    ...actual,
    getWorkforceOrder: (...args: unknown[]) => getWorkforceOrder(...args),
    acceptWorkforceOrder: (...args: unknown[]) => acceptWorkforceOrder(...args),
    fulfilWorkforceOrder: (...args: unknown[]) => fulfilWorkforceOrder(...args),
    cancelWorkforceOrder: (...args: unknown[]) => cancelWorkforceOrder(...args),
  };
});

const ORDER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORDER_ID_TWO = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function baseOrder(overrides: Record<string, unknown> = {}) {
  return {
    orderId: ORDER_ID,
    orderNumber: "ORD-0123456789AB",
    status: "ACCEPTED",
    revision: "2",
    createdAt: "2026-08-13T00:20:00.000Z",
    updatedAt: "2026-08-13T00:25:00.000Z",
    acceptedAt: "2026-08-13T00:25:00.000Z",
    fulfilledAt: null,
    cancelledAt: null,
    money: { grandTotalMinor: "27195", currency: "INR" },
    outlet: { outletId: "o1", brandId: "b1", code: "e2e", name: "E2E Outlet" },
    paymentProvenanceKind: "PAYMENT",
    acceptedByWorkforceUserId: "workforce-1",
    fulfilledByWorkforceUserId: null,
    cancelledByWorkforceUserId: null,
    cancellationReasonCode: null,
    destination: {
      recipientName: "E2E Guest",
      recipientPhone: "+919876500251",
      addressLine1: "12 Mall Road",
      addressLine2: null,
      landmark: null,
      locality: null,
      city: "Dehradun",
      stateCode: "IN-UT",
      postalCode: "248001",
      label: null,
    },
    lines: [
      {
        productName: "Classic Milk Tea",
        variantName: "Regular",
        quantity: 1,
        lineTotalMinor: "27195",
        modifiers: [{ groupName: "Sweetness", optionName: "Less sugar", quantity: 1 }],
      },
    ],
    ...overrides,
  };
}

const order = baseOrder();

beforeEach(() => {
  query = `orderId=${ORDER_ID}`;
  getWorkforceOrder.mockReset();
  acceptWorkforceOrder.mockReset();
  fulfilWorkforceOrder.mockReset();
  cancelWorkforceOrder.mockReset();
});

async function renderReady(orderOverride = order) {
  getWorkforceOrder.mockResolvedValue({ ok: true, status: 200, data: { order: orderOverride } });
  render(<OperationsOrderDetailClient />);
  await waitFor(() => expect(screen.getByTestId("operations-order-detail")).toBeInTheDocument());
}

describe("OperationsOrderDetailClient", () => {
  it("renders the accepted detail projection with Fulfil and Cancel actions", async () => {
    await renderReady();
    expect(getWorkforceOrder).toHaveBeenCalledWith(ORDER_ID);
    expect(screen.getByText("12 Mall Road")).toBeInTheDocument();
    expect(screen.getByText(/sweetness: less sugar × 1/i)).toBeInTheDocument();
    expect(screen.getByText(/payment provenance/i).parentElement).toHaveTextContent("PAYMENT");
    expect(screen.getByRole("button", { name: "Fulfil" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
  });

  it("shows Accept and Cancel for PLACED orders", async () => {
    await renderReady(baseOrder({ status: "PLACED", revision: "1", acceptedAt: null, acceptedByWorkforceUserId: null }));
    expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Fulfil" })).not.toBeInTheDocument();
  });

  it("shows no lifecycle actions for FULFILLED orders", async () => {
    await renderReady(
      baseOrder({
        status: "FULFILLED",
        revision: "3",
        fulfilledAt: "2026-08-13T01:00:00.000Z",
        fulfilledByWorkforceUserId: "workforce-2",
      }),
    );
    expect(screen.queryByTestId("operations-lifecycle-actions")).not.toBeInTheDocument();
  });

  it("shows no lifecycle actions for CANCELLED orders", async () => {
    await renderReady(
      baseOrder({
        status: "CANCELLED",
        revision: "2",
        cancelledAt: "2026-08-13T01:00:00.000Z",
        cancelledByWorkforceUserId: "workforce-2",
        cancellationReasonCode: "CUSTOMER_REQUESTED",
      }),
    );
    expect(screen.queryByTestId("operations-lifecycle-actions")).not.toBeInTheDocument();
  });

  it("requires confirmation before accept and refetches after server-confirmed success", async () => {
    const user = userEvent.setup();
    const placed = baseOrder({
      status: "PLACED",
      revision: "1",
      acceptedAt: null,
      acceptedByWorkforceUserId: null,
    });
    const accepted = baseOrder({ status: "ACCEPTED", revision: "2" });
    getWorkforceOrder
      .mockResolvedValueOnce({ ok: true, status: 200, data: { order: placed } })
      .mockResolvedValueOnce({ ok: true, status: 200, data: { order: accepted } });
    acceptWorkforceOrder.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        order: {
          orderId: ORDER_ID,
          orderNumber: placed.orderNumber,
          status: "ACCEPTED",
          revision: "2",
          updatedAt: "2026-08-13T00:30:00.000Z",
          acceptedAt: "2026-08-13T00:30:00.000Z",
        },
      },
    });

    render(<OperationsOrderDetailClient />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Accept" }));
    expect(screen.getByRole("dialog", { name: "Accept this order?" })).toBeInTheDocument();
    expect(acceptWorkforceOrder).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Confirm accept" }));
    await waitFor(() => expect(acceptWorkforceOrder).toHaveBeenCalledWith(ORDER_ID, "1"));
    await waitFor(() => expect(getWorkforceOrder).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole("button", { name: "Fulfil" })).toBeInTheDocument());
    expect(screen.getByTestId("operations-detail-live-status")).toHaveTextContent(/accepted/i);
  });

  it("requires confirmation before fulfil and refetches after success", async () => {
    const user = userEvent.setup();
    const fulfilled = baseOrder({
      status: "FULFILLED",
      revision: "3",
      fulfilledAt: "2026-08-13T01:00:00.000Z",
      fulfilledByWorkforceUserId: "workforce-2",
    });
    getWorkforceOrder
      .mockResolvedValueOnce({ ok: true, status: 200, data: { order } })
      .mockResolvedValueOnce({ ok: true, status: 200, data: { order: fulfilled } });
    fulfilWorkforceOrder.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        order: {
          orderId: ORDER_ID,
          orderNumber: order.orderNumber,
          status: "FULFILLED",
          revision: "3",
          updatedAt: "2026-08-13T01:00:00.000Z",
          acceptedAt: order.acceptedAt,
          fulfilledAt: "2026-08-13T01:00:00.000Z",
        },
      },
    });

    render(<OperationsOrderDetailClient />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Fulfil" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Fulfil" }));
    await user.click(screen.getByRole("button", { name: "Confirm fulfil" }));
    await waitFor(() => expect(fulfilWorkforceOrder).toHaveBeenCalledWith(ORDER_ID, "2"));
    await waitFor(() => expect(screen.queryByTestId("operations-lifecycle-actions")).not.toBeInTheDocument());
  });

  it("requires a cancellation reason and submits the exact code", async () => {
    const user = userEvent.setup();
    const cancelled = baseOrder({
      status: "CANCELLED",
      revision: "3",
      cancelledAt: "2026-08-13T01:10:00.000Z",
      cancelledByWorkforceUserId: "workforce-2",
      cancellationReasonCode: "ITEM_UNAVAILABLE",
    });
    getWorkforceOrder
      .mockResolvedValueOnce({ ok: true, status: 200, data: { order } })
      .mockResolvedValueOnce({ ok: true, status: 200, data: { order: cancelled } });
    cancelWorkforceOrder.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        order: {
          orderId: ORDER_ID,
          orderNumber: order.orderNumber,
          status: "CANCELLED",
          revision: "3",
          updatedAt: "2026-08-13T01:10:00.000Z",
          cancelledAt: "2026-08-13T01:10:00.000Z",
          cancellationReasonCode: "ITEM_UNAVAILABLE",
        },
      },
    });

    render(<OperationsOrderDetailClient />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    const dialog = screen.getByRole("dialog", { name: "Cancel this order?" });
    expect(within(dialog).getByRole("button", { name: "Confirm cancel" })).toBeDisabled();
    await user.selectOptions(within(dialog).getByLabelText("Cancellation reason"), "ITEM_UNAVAILABLE");
    await user.click(within(dialog).getByRole("button", { name: "Confirm cancel" }));
    await waitFor(() =>
      expect(cancelWorkforceOrder).toHaveBeenCalledWith(ORDER_ID, "2", "ITEM_UNAVAILABLE"),
    );
  });

  it("disables every lifecycle control while a mutation is pending", async () => {
    const user = userEvent.setup();
    let resolveAccept: ((value: unknown) => void) | undefined;
    getWorkforceOrder.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        order: baseOrder({
          status: "PLACED",
          revision: "1",
          acceptedAt: null,
          acceptedByWorkforceUserId: null,
        }),
      },
    });
    acceptWorkforceOrder.mockImplementation(
      () => new Promise((resolve) => {
        resolveAccept = resolve;
      }),
    );

    render(<OperationsOrderDetailClient />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Accept" }));
    await user.click(screen.getByRole("button", { name: "Confirm accept" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Accept" })).toBeDisabled());
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Confirm accept" })).toBeDisabled();
    resolveAccept?.({
      ok: true,
      status: 200,
      data: {
        order: {
          orderId: ORDER_ID,
          orderNumber: "ORD-0123456789AB",
          status: "ACCEPTED",
          revision: "2",
          updatedAt: "2026-08-13T00:30:00.000Z",
          acceptedAt: "2026-08-13T00:30:00.000Z",
        },
      },
    });
  });

  it.each([
    ["WORKFORCE_AUTH_REQUIRED", 401, "operations-detail-unauthorized"],
    ["ORDER_UNAUTHORIZED", 403, null],
    ["ORDER_NOT_FOUND", 404, "operations-detail-not-found"],
    ["ORDER_CANCELLATION_REASON_INVALID", 400, null],
    ["ORDER_CONFLICT", 409, null],
    ["ORDER_ACCEPT_NOT_ALLOWED", 409, null],
    ["INTERNAL_ERROR", 500, null],
    ["NETWORK_ERROR", 0, null],
    ["INVALID_RESPONSE", 200, null],
  ] as const)("handles mutation failure %s without claiming success", async (code, status, detailTestId) => {
    const user = userEvent.setup();
    getWorkforceOrder.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        order: baseOrder({
          status: "PLACED",
          revision: "1",
          acceptedAt: null,
          acceptedByWorkforceUserId: null,
        }),
      },
    });
    acceptWorkforceOrder.mockResolvedValue({ ok: false, code, status });

    render(<OperationsOrderDetailClient />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Accept" }));
    await user.click(screen.getByRole("button", { name: "Confirm accept" }));

    await waitFor(() => {
      if (detailTestId) {
        expect(screen.getByTestId(detailTestId)).toBeInTheDocument();
      } else {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      }
    });
    expect(screen.getByTestId("operations-detail-live-status")).not.toHaveTextContent(/order .* accepted/i);
    if (code === "NETWORK_ERROR") {
      expect(screen.getByRole("alert")).toHaveTextContent(/refresh order status before trying again/i);
    }
    if (code === "ORDER_CONFLICT" || code === "ORDER_ACCEPT_NOT_ALLOWED") {
      await waitFor(() => expect(getWorkforceOrder.mock.calls.length).toBeGreaterThan(1));
      expect(acceptWorkforceOrder).toHaveBeenCalledTimes(1);
    }
  });

  it("recomputes eligibility after ORDER_CONFLICT refetch", async () => {
    const user = userEvent.setup();
    const placed = baseOrder({
      status: "PLACED",
      revision: "1",
      acceptedAt: null,
      acceptedByWorkforceUserId: null,
    });
    const alreadyAccepted = baseOrder({ status: "ACCEPTED", revision: "2" });
    getWorkforceOrder
      .mockResolvedValueOnce({ ok: true, status: 200, data: { order: placed } })
      .mockResolvedValueOnce({ ok: true, status: 200, data: { order: alreadyAccepted } });
    acceptWorkforceOrder.mockResolvedValue({ ok: false, code: "ORDER_CONFLICT", status: 409 });

    render(<OperationsOrderDetailClient />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Accept" }));
    await user.click(screen.getByRole("button", { name: "Confirm accept" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Fulfil" })).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
    expect(acceptWorkforceOrder).toHaveBeenCalledTimes(1);
  });

  it("does not fetch when the order ID is missing", async () => {
    query = "";
    render(<OperationsOrderDetailClient />);
    await waitFor(() => expect(screen.getByTestId("operations-detail-missing")).toBeInTheDocument());
    expect(getWorkforceOrder).not.toHaveBeenCalled();
  });

  it("does not fetch when the order ID is empty", async () => {
    query = "orderId=";
    render(<OperationsOrderDetailClient />);
    await waitFor(() => expect(screen.getByTestId("operations-detail-missing")).toBeInTheDocument());
    expect(getWorkforceOrder).not.toHaveBeenCalled();
  });

  it("does not fetch when orderId=not-a-uuid", async () => {
    query = "orderId=not-a-uuid";
    render(<OperationsOrderDetailClient />);
    await waitFor(() => expect(screen.getByTestId("operations-detail-missing")).toBeInTheDocument());
    expect(getWorkforceOrder).not.toHaveBeenCalled();
  });

  it("does not fetch whitespace-only order IDs", async () => {
    query = "orderId=%20%20";
    render(<OperationsOrderDetailClient />);
    await waitFor(() => expect(screen.getByTestId("operations-detail-missing")).toBeInTheDocument());
    expect(getWorkforceOrder).not.toHaveBeenCalled();
  });

  it("fetches when orderId is a valid accepted UUID", async () => {
    getWorkforceOrder.mockResolvedValue({ ok: true, status: 200, data: { order } });
    render(<OperationsOrderDetailClient />);
    await waitFor(() => expect(getWorkforceOrder).toHaveBeenCalledWith(ORDER_ID));
  });

  it("surfaces INVALID_RESPONSE as the generic failure state without crashing", async () => {
    getWorkforceOrder.mockResolvedValue({ ok: false, code: "INVALID_RESPONSE", status: 200 });
    render(<OperationsOrderDetailClient />);
    await waitFor(() => expect(screen.getByTestId("operations-detail-error")).toBeInTheDocument());
    expect(screen.queryByTestId("operations-order-detail")).not.toBeInTheDocument();
  });

  it.each([
    [401, "WORKFORCE_AUTH_REQUIRED", "operations-detail-unauthorized", /workforce sign in/i],
    [403, "ORDER_UNAUTHORIZED", "operations-detail-forbidden", /back to orders/i],
    [404, "ORDER_NOT_FOUND", "operations-detail-not-found", /back to orders/i],
    [500, "INTERNAL_ERROR", "operations-detail-error", /back to orders/i],
  ])("renders safe failure state for %s", async (status, code, testId, linkName) => {
    getWorkforceOrder.mockResolvedValue({ ok: false, status, code });
    render(<OperationsOrderDetailClient />);
    await waitFor(() => expect(screen.getByTestId(testId)).toBeInTheDocument());
    expect(screen.getByRole("link", { name: linkName })).toBeInTheDocument();
  });

  it("keeps a stale success from replacing the current order", async () => {
    let resolveFirst: ((value: unknown) => void) | undefined;
    let resolveSecond: ((value: unknown) => void) | undefined;
    getWorkforceOrder
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve; }));
    const rendered = render(<OperationsOrderDetailClient />);
    query = `orderId=${ORDER_ID_TWO}`;
    rendered.rerender(<OperationsOrderDetailClient />);
    resolveSecond?.({
      ok: true,
      status: 200,
      data: { order: { ...order, orderId: ORDER_ID_TWO, orderNumber: "ORD-SECOND" } },
    });
    await waitFor(() => expect(screen.getByText("ORD-SECOND")).toBeInTheDocument());
    resolveFirst?.({ ok: true, status: 200, data: { order } });
    await waitFor(() => expect(screen.queryByText("ORD-0123456789AB")).not.toBeInTheDocument());
  });

  it("keeps a stale error from overwriting newer ready state", async () => {
    let resolveFirst: ((value: unknown) => void) | undefined;
    let resolveSecond: ((value: unknown) => void) | undefined;
    getWorkforceOrder
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve; }));
    const rendered = render(<OperationsOrderDetailClient />);
    query = `orderId=${ORDER_ID_TWO}`;
    rendered.rerender(<OperationsOrderDetailClient />);
    resolveSecond?.({
      ok: true,
      status: 200,
      data: { order: { ...order, orderId: ORDER_ID_TWO, orderNumber: "ORD-SECOND" } },
    });
    await waitFor(() => expect(screen.getByText("ORD-SECOND")).toBeInTheDocument());
    resolveFirst?.({ ok: false, code: "INTERNAL_ERROR", status: 500 });
    await waitFor(() => {
      expect(screen.getByText("ORD-SECOND")).toBeInTheDocument();
      expect(screen.queryByTestId("operations-detail-error")).not.toBeInTheDocument();
    });
  });

  it("ignores mutation completion after orderId changes", async () => {
    const user = userEvent.setup();
    let resolveAccept: ((value: unknown) => void) | undefined;
    getWorkforceOrder.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        order: baseOrder({
          status: "PLACED",
          revision: "1",
          acceptedAt: null,
          acceptedByWorkforceUserId: null,
        }),
      },
    });
    acceptWorkforceOrder.mockImplementation(
      () => new Promise((resolve) => {
        resolveAccept = resolve;
      }),
    );

    const rendered = render(<OperationsOrderDetailClient />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Accept" }));
    await user.click(screen.getByRole("button", { name: "Confirm accept" }));

    query = `orderId=${ORDER_ID_TWO}`;
    getWorkforceOrder.mockResolvedValue({
      ok: true,
      status: 200,
      data: { order: { ...order, orderId: ORDER_ID_TWO, orderNumber: "ORD-SECOND", status: "ACCEPTED" } },
    });
    rendered.rerender(<OperationsOrderDetailClient />);
    await waitFor(() => expect(screen.getByText("ORD-SECOND")).toBeInTheDocument());

    resolveAccept?.({
      ok: true,
      status: 200,
      data: {
        order: {
          orderId: ORDER_ID,
          orderNumber: "ORD-0123456789AB",
          status: "ACCEPTED",
          revision: "2",
          updatedAt: "2026-08-13T00:30:00.000Z",
          acceptedAt: "2026-08-13T00:30:00.000Z",
        },
      },
    });
    await Promise.resolve();
    expect(screen.getByText("ORD-SECOND")).toBeInTheDocument();
    expect(screen.queryByText("ORD-0123456789AB")).not.toBeInTheDocument();
  });

  it("ignores completion after unmount", async () => {
    let resolveRequest: ((value: unknown) => void) | undefined;
    getWorkforceOrder.mockImplementationOnce(
      () => new Promise((resolve) => { resolveRequest = resolve; }),
    );
    const rendered = render(<OperationsOrderDetailClient />);
    expect(screen.getByTestId("operations-detail-loading")).toBeInTheDocument();
    rendered.unmount();
    resolveRequest?.({ ok: true, status: 200, data: { order } });
    await Promise.resolve();
    expect(screen.queryByTestId("operations-order-detail")).not.toBeInTheDocument();
  });
});
