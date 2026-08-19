import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrderConfirmationClient } from "./OrderConfirmationClient";

const fetchCustomerSession = vi.fn<(...args: unknown[]) => unknown>();
const getCustomerOrder = vi.fn<(...args: unknown[]) => unknown>();

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("orderId=ord-1"),
}));

vi.mock("@/lib/customer-auth/client", () => ({
  fetchCustomerSession: (...args: unknown[]) => fetchCustomerSession(...args),
}));

vi.mock("@/lib/customer-commerce", async () => {
  const actual = await vi.importActual<typeof import("@/lib/customer-commerce")>(
    "@/lib/customer-commerce",
  );
  return {
    ...actual,
    getCustomerOrder: (...args: unknown[]) => getCustomerOrder(...args),
    clearPaymentRecovery: vi.fn(),
  };
});

beforeEach(() => {
  fetchCustomerSession.mockResolvedValue({ ok: true, data: { authenticated: true } });
  getCustomerOrder.mockReset();
});

describe("OrderConfirmationClient", () => {
  it("shows public order number and contextual support", async () => {
    getCustomerOrder.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        order: {
          orderId: "ord-1",
          orderNumber: "ORD-0123456789AB",
          status: "PLACED",
          revision: "1",
          createdAt: "2026-08-13T00:20:00.000Z",
          updatedAt: "2026-08-13T00:20:00.000Z",
          acceptedAt: null,
          fulfilledAt: null,
          cancelledAt: null,
          cancellationReasonCode: null,
          money: { grandTotalMinor: "27195", currency: "INR" },
          paymentSatisfaction: "PAID",
          outlet: { outletId: "o1", brandId: "b1", code: "e2e", name: "E2E" },
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
              lineTotalMinor: "19900",
              modifiers: [],
            },
          ],
        },
      },
    });
    render(<OrderConfirmationClient />);
    await waitFor(() => expect(screen.getByTestId("order-confirmation")).toBeInTheDocument());
    expect(screen.getByTestId("order-number")).toHaveTextContent("ORD-0123456789AB");
    expect(screen.getByRole("link", { name: /whatsapp support for order ORD-0123456789AB/i })).toHaveAttribute(
      "href",
      expect.stringContaining("ORD-0123456789AB"),
    );
  });
});
