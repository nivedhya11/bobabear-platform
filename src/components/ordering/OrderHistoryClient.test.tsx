import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrderHistoryClient } from "./OrderHistoryClient";

const fetchCustomerSession = vi.fn<(...args: unknown[]) => unknown>();
const listCustomerOrders = vi.fn<(...args: unknown[]) => unknown>();

vi.mock("@/lib/customer-auth/client", () => ({
  fetchCustomerSession: (...args: unknown[]) => fetchCustomerSession(...args),
}));

vi.mock("@/lib/customer-commerce", async () => {
  const actual = await vi.importActual<typeof import("@/lib/customer-commerce")>(
    "@/lib/customer-commerce",
  );
  return {
    ...actual,
    listCustomerOrders: (...args: unknown[]) => listCustomerOrders(...args),
  };
});

beforeEach(() => {
  fetchCustomerSession.mockResolvedValue({ ok: true, data: { authenticated: true } });
  listCustomerOrders.mockReset();
});

describe("OrderHistoryClient", () => {
  it("renders order history with D-357 status labels", async () => {
    listCustomerOrders.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        items: [
          {
            orderId: "ord-1",
            orderNumber: "ORD-0123456789AB",
            status: "PLACED",
            revision: "1",
            createdAt: "2026-08-13T00:20:00.000Z",
            money: { grandTotalMinor: "27195", currency: "INR" },
            paymentSatisfaction: "PAID",
            outlet: { outletId: "o1", brandId: "b1", code: "e2e", name: "E2E" },
          },
        ],
        nextCursor: null,
      },
    });
    render(<OrderHistoryClient />);
    await waitFor(() => expect(screen.getByTestId("orders-list")).toBeInTheDocument());
    expect(screen.getByText("ORD-0123456789AB")).toBeInTheDocument();
    expect(screen.getByTestId("order-status")).toHaveTextContent("Order received");
  });

  it("renders an empty state", async () => {
    listCustomerOrders.mockResolvedValue({
      ok: true,
      status: 200,
      data: { items: [], nextCursor: null },
    });
    render(<OrderHistoryClient />);
    await waitFor(() => expect(screen.getByTestId("orders-empty")).toBeInTheDocument());
  });

  it("renders list errors", async () => {
    listCustomerOrders.mockResolvedValue({
      ok: false,
      code: "NETWORK_ERROR",
      status: 0,
    });
    render(<OrderHistoryClient />);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/network problem/i));
  });
});
