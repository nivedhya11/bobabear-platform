import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OperationsOrderDetailClient } from "./OperationsOrderDetailClient";

const getWorkforceOrder = vi.fn<(...args: unknown[]) => unknown>();
let query = "orderId=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(query),
}));

vi.mock("@/lib/operations/orders", async () => {
  const actual = await vi.importActual<typeof import("@/lib/operations/orders")>(
    "@/lib/operations/orders",
  );
  return {
    ...actual,
    getWorkforceOrder: (...args: unknown[]) => getWorkforceOrder(...args),
  };
});

const ORDER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORDER_ID_TWO = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const order = {
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
    recipientName: "E2E Guest", recipientPhone: "+919876500251", addressLine1: "12 Mall Road",
    addressLine2: null, landmark: null, locality: null, city: "Dehradun", stateCode: "IN-UT",
    postalCode: "248001", label: null,
  },
  lines: [{
    productName: "Classic Milk Tea", variantName: "Regular", quantity: 1, lineTotalMinor: "27195",
    modifiers: [{ groupName: "Sweetness", optionName: "Less sugar", quantity: 1 }],
  }],
};

beforeEach(() => {
  query = `orderId=${ORDER_ID}`;
  getWorkforceOrder.mockReset();
});

describe("OperationsOrderDetailClient", () => {
  it("renders the accepted detail projection without lifecycle controls", async () => {
    getWorkforceOrder.mockResolvedValue({ ok: true, status: 200, data: { order } });
    render(<OperationsOrderDetailClient />);

    expect(screen.getByTestId("operations-detail-loading")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("operations-order-detail")).toBeInTheDocument());
    expect(getWorkforceOrder).toHaveBeenCalledWith(ORDER_ID);
    expect(screen.getByText("12 Mall Road")).toBeInTheDocument();
    expect(screen.getByText(/sweetness: less sugar × 1/i)).toBeInTheDocument();
    expect(screen.getByText(/payment provenance/i).parentElement).toHaveTextContent("PAYMENT");
    expect(screen.queryByRole("button", { name: /accept|fulfil|cancel/i })).not.toBeInTheDocument();
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
    [403, "ORDER_UNAUTHORIZED", "operations-detail-forbidden", /back to operations/i],
    [404, "ORDER_NOT_FOUND", "operations-detail-not-found", /back to operations/i],
    [500, "INTERNAL_ERROR", "operations-detail-error", /back to operations/i],
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
