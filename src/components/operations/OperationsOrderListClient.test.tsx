import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OperationsOrderListClient } from "./OperationsOrderListClient";

const listWorkforceOrders = vi.fn<(...args: unknown[]) => unknown>();

vi.mock("@/lib/operations/orders", () => ({
  listWorkforceOrders: (...args: unknown[]) => listWorkforceOrders(...args),
  WORKFORCE_ORDER_STATUSES: ["PLACED", "ACCEPTED", "FULFILLED", "CANCELLED"],
}));

const summary = {
  orderId: "ord-1",
  orderNumber: "ORD-0123456789AB",
  status: "PLACED",
  revision: "1",
  createdAt: "2026-08-13T00:20:00.000Z",
  acceptedAt: null,
  fulfilledAt: null,
  cancelledAt: null,
  money: { grandTotalMinor: "27195", currency: "INR" },
  outlet: { outletId: "o1", brandId: "b1", code: "e2e", name: "E2E Outlet" },
};

beforeEach(() => {
  listWorkforceOrders.mockReset();
});

describe("OperationsOrderListClient", () => {
  it("shows loading then a populated list", async () => {
    listWorkforceOrders.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { items: [summary], nextCursor: null },
    });
    render(<OperationsOrderListClient />);
    expect(screen.getByTestId("operations-loading")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("operations-table")).toBeInTheDocument());
    expect(screen.getByTestId("operations-table")).toHaveTextContent("ORD-0123456789AB");
    expect(screen.getByTestId("order-status-ord-1")).toHaveTextContent("Order received");
    for (const link of screen.getAllByRole("link", { name: /view details for order ord-0123456789ab/i })) {
      expect(link).toHaveAttribute("href", "/workforce/operations/orders/detail/?orderId=ord-1");
    }
  });

  it("renders an empty state", async () => {
    listWorkforceOrders.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { items: [], nextCursor: null },
    });
    render(<OperationsOrderListClient />);
    await waitFor(() => expect(screen.getByTestId("operations-empty")).toBeInTheDocument());
  });

  it("renders a 401 sign-in state", async () => {
    listWorkforceOrders.mockResolvedValueOnce({
      ok: false,
      code: "WORKFORCE_AUTH_REQUIRED",
      status: 401,
    });
    render(<OperationsOrderListClient />);
    await waitFor(() => expect(screen.getByTestId("operations-unauthorized")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /workforce sign in/i })).toHaveAttribute("href", "/workforce/login/");
  });

  it("renders a generic error with retry", async () => {
    listWorkforceOrders.mockResolvedValueOnce({
      ok: false,
      code: "NETWORK_ERROR",
      status: 0,
    });
    render(<OperationsOrderListClient />);
    await waitFor(() => expect(screen.getByTestId("operations-error")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("refresh resets to the first page with current filters", async () => {
    listWorkforceOrders
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { items: [summary], nextCursor: "cursor-2" },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { items: [summary], nextCursor: null },
      });
    render(<OperationsOrderListClient />);
    await waitFor(() => expect(screen.getByTestId("operations-load-more")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/status/i), { target: { value: "PLACED" } });
    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));

    await waitFor(() => expect(listWorkforceOrders).toHaveBeenCalledTimes(2));
    expect(listWorkforceOrders.mock.calls[1]?.[0]).toEqual({ status: "PLACED" });
  });

  it("load more appends the next page and hides the control when no cursor remains", async () => {
    const pageTwo = {
      ...summary,
      orderId: "ord-2",
      orderNumber: "ORD-0123456789CD",
    };
    listWorkforceOrders
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { items: [summary], nextCursor: "cursor-2" },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { items: [pageTwo], nextCursor: null },
      });
    render(<OperationsOrderListClient />);
    await waitFor(() => expect(screen.getByTestId("operations-load-more")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /load more/i }));
    await waitFor(() => expect(screen.getByTestId("operations-table")).toHaveTextContent("ORD-0123456789CD"));
    expect(listWorkforceOrders.mock.calls[1]?.[0]).toEqual({ cursor: "cursor-2" });
    await waitFor(() => expect(screen.queryByTestId("operations-load-more")).not.toBeInTheDocument());
  });

  it("encodes special characters in detail list-link query identifiers", async () => {
    const specialId = "order/id ?#";
    listWorkforceOrders.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: {
        items: [{ ...summary, orderId: specialId }],
        nextCursor: null,
      },
    });
    render(<OperationsOrderListClient />);
    await waitFor(() => expect(screen.getByTestId("operations-table")).toBeInTheDocument());
    const expectedHref =
      `/workforce/operations/orders/detail/?orderId=${encodeURIComponent(specialId)}`;
    for (const link of screen.getAllByRole("link", { name: /view details for order/i })) {
      expect(link).toHaveAttribute("href", expectedHref);
    }
  });
});
