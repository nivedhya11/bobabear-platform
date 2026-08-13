import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CheckoutClient, EMPTY_ONE_TIME_ADDRESS } from "./CheckoutClient";
import type { OrderingCatalog } from "@/shared/ordering-catalog";

const fetchCustomerSession = vi.fn<(...args: unknown[]) => unknown>();
const getActiveCart = vi.fn<(...args: unknown[]) => unknown>();
const getActiveCheckout = vi.fn<(...args: unknown[]) => unknown>();
const startCheckout = vi.fn<(...args: unknown[]) => unknown>();
const listOwnAddresses = vi.fn<(...args: unknown[]) => unknown>();
const readGuestCartCredential = vi.fn<(...args: unknown[]) => unknown>(() => null);

vi.mock("@/lib/customer-auth/client", () => ({
  fetchCustomerSession: (...args: unknown[]) => fetchCustomerSession(...args),
}));

vi.mock("@/lib/customer-commerce", async () => {
  const actual = await vi.importActual<typeof import("@/lib/customer-commerce")>(
    "@/lib/customer-commerce",
  );
  return {
    ...actual,
    getActiveCart: (...args: unknown[]) => getActiveCart(...args),
    getActiveCheckout: (...args: unknown[]) => getActiveCheckout(...args),
    startCheckout: (...args: unknown[]) => startCheckout(...args),
    listOwnAddresses: (...args: unknown[]) => listOwnAddresses(...args),
    readGuestCartCredential: (...args: unknown[]) => readGuestCartCredential(...args),
    claimGuestCart: vi.fn(),
    reconcileGuestCart: vi.fn(),
    clearGuestCartCredential: vi.fn(),
    createOwnAddress: vi.fn(),
    setCheckoutDestination: vi.fn(),
    evaluateCheckout: vi.fn(),
  };
});

const catalog = {
  brandId: "56ff7724-d511-5ef4-b5d5-d629cbfb2388",
  items: [],
} as unknown as OrderingCatalog;

beforeEach(() => {
  fetchCustomerSession.mockResolvedValue({
    ok: true,
    data: { authenticated: true },
  });
  getActiveCart.mockResolvedValue({
    ok: true,
    status: 200,
    data: {
      cart: {
        id: "cart-1",
        brandId: catalog.brandId,
        ownerMode: "customer",
        revision: "1",
        manualCouponCode: null,
        expiresAt: null,
        createdAt: "2026-08-13T00:00:00.000Z",
        updatedAt: "2026-08-13T00:00:00.000Z",
        lines: [{ id: "line-1", variantId: "var-1", quantity: 1, modifiers: [], bundleSelections: [] }],
      },
    },
  });
  getActiveCheckout.mockResolvedValue({ ok: true, status: 200, data: { checkout: null } });
  startCheckout.mockResolvedValue({
    ok: true,
    status: 200,
    data: {
      checkout: {
        id: "chk-1",
        customerAuthUserId: "user-1",
        brandId: catalog.brandId,
        cartId: "cart-1",
        sourceCartRevision: "1",
        revision: "1",
        status: "DRAFT",
        expiresAt: "2026-08-13T01:00:00.000Z",
        activeSnapshotId: null,
        createdAt: "2026-08-13T00:00:00.000Z",
        updatedAt: "2026-08-13T00:00:00.000Z",
        destination: null,
        activeSnapshot: null,
      },
    },
  });
  listOwnAddresses.mockResolvedValue({ ok: true, status: 200, data: { addresses: [] } });
});

describe("one-time destination defaults", () => {
  it("does not assume 248001 or IN-UT", () => {
    expect(EMPTY_ONE_TIME_ADDRESS.postalCode).toBe("");
    expect(EMPTY_ONE_TIME_ADDRESS.stateCode).toBe("");
    expect(EMPTY_ONE_TIME_ADDRESS.city).toBe("");
    expect(JSON.stringify(EMPTY_ONE_TIME_ADDRESS)).not.toMatch(/248001|IN-UT|Dehradun/);
  });

  it("requires the customer to enter PIN and state", async () => {
    render(<CheckoutClient catalog={catalog} />);
    await waitFor(() => expect(screen.getByLabelText(/PIN code/i)).toBeInTheDocument());
    expect(screen.getByLabelText(/PIN code/i)).toHaveValue("");
    expect(screen.getByLabelText(/^City$/i)).toHaveValue("");
    const state = screen.getByLabelText(/^State$/i) as HTMLSelectElement;
    expect(state.value).toBe("");
    expect(state.value).not.toBe("IN-UT");
  });
});
