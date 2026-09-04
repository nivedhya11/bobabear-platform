import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CheckoutClient } from "@/components/ordering/CheckoutClient";
import type { OrderingCatalog } from "@/shared/ordering-catalog";

const {
  fetchCustomerSession,
  getActiveCart,
  getActiveCheckout,
  startCheckout,
  listOwnAddresses,
  setCheckoutDestination,
  evaluateCheckout,
  readGuestCartCredential,
} = vi.hoisted(() => ({
  fetchCustomerSession: vi.fn<(...args: unknown[]) => unknown>(),
  getActiveCart: vi.fn<(...args: unknown[]) => unknown>(),
  getActiveCheckout: vi.fn<(...args: unknown[]) => unknown>(),
  startCheckout: vi.fn<(...args: unknown[]) => unknown>(),
  listOwnAddresses: vi.fn<(...args: unknown[]) => unknown>(),
  setCheckoutDestination: vi.fn<(...args: unknown[]) => unknown>(),
  evaluateCheckout: vi.fn<(...args: unknown[]) => unknown>(),
  readGuestCartCredential: vi.fn<(...args: unknown[]) => unknown>(() => null),
}));

vi.mock("@/lib/customer-auth/client", () => ({
  fetchCustomerSession: (...args: unknown[]) => fetchCustomerSession(...args),
}));

vi.mock("@/components/ordering/CheckoutDestinationFlow", () => ({
  CheckoutDestinationFlow: (props: {
    pending: boolean;
    onComplete: (draft: { kind: "SAVED_ADDRESS"; savedAddressId: string }) => void;
  }) => (
    <div data-testid="checkout-destination-select">
      <h2>Choose a delivery address</h2>
      <button type="button">Add new address</button>
      <button
        type="button"
        data-testid="pick-address-a"
        disabled={props.pending}
        onClick={() => props.onComplete({ kind: "SAVED_ADDRESS", savedAddressId: "addr-a" })}
      >
        Address A
      </button>
      <button
        type="button"
        data-testid="pick-address-b"
        disabled={props.pending}
        onClick={() => props.onComplete({ kind: "SAVED_ADDRESS", savedAddressId: "addr-b" })}
      >
        Address B
      </button>
    </div>
  ),
}));

vi.mock("@/components/ordering/PaymentPanel", () => ({
  PaymentPanel: (props: {
    onBackToReview?: (checkoutRevision: string) => void;
    onCheckoutRevisionChange?: (checkoutRevision: string) => void;
  }) => (
    <div data-testid="payment-panel-mock">
      <button
        type="button"
        data-testid="simulate-payment-revision-advance"
        onClick={() => props.onCheckoutRevisionChange?.("11")}
      >
        Simulate payment revision
      </button>
      <button
        type="button"
        data-testid="payment-back-to-review"
        onClick={() => props.onBackToReview?.("11")}
      >
        Back to review
      </button>
    </div>
  ),
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
    setCheckoutDestination: (...args: unknown[]) => setCheckoutDestination(...args),
    evaluateCheckout: (...args: unknown[]) => evaluateCheckout(...args),
    readGuestCartCredential: (...args: unknown[]) => readGuestCartCredential(...args),
    claimGuestCart: vi.fn(),
    reconcileGuestCart: vi.fn(),
    clearGuestCartCredential: vi.fn(),
    createOwnAddress: vi.fn(),
    updateOwnAddress: vi.fn(),
  };
});

const catalog = {
  brandId: "56ff7724-d511-5ef4-b5d5-d629cbfb2388",
  items: [],
} as unknown as OrderingCatalog;

const cart = {
  id: "cart-1",
  brandId: catalog.brandId,
  ownerMode: "customer" as const,
  revision: "7",
  manualCouponCode: null,
  expiresAt: null,
  createdAt: "2026-09-04T00:00:00.000Z",
  updatedAt: "2026-09-04T00:00:00.000Z",
  lines: [
    {
      id: "line-1",
      variantId: "var-1",
      quantity: 1,
      modifiers: [],
      bundleSelections: [],
    },
  ],
};

function snapshot(overrides: Record<string, unknown> = {}) {
  return {
    id: "snap-1",
    checkoutId: "chk-1",
    checkoutRevision: "3",
    sourceCartRevision: "7",
    selectedOutletId: "outlet-1",
    evaluatedAt: "2026-09-04T00:00:00.000Z",
    serviceabilityEvaluatedAt: "2026-09-04T00:00:00.000Z",
    currency: "INR",
    manualCouponCode: null,
    destination: {
      destinationKind: "SAVED_ADDRESS",
      sourceSavedAddressId: "addr-a",
      recipientName: "Founder",
      recipientPhone: "9999999999",
      addressLine1: "C-802",
      addressLine2: null,
      landmark: null,
      locality: "ISBT",
      city: "DEHRADUN",
      stateCode: "UK",
      postalCode: "248002",
      coordinates: { latitude: "30.2868286", longitude: "77.9991566" },
      label: "ADDRESS",
    },
    basePaise: "19900",
    modifierAdjustmentsPaise: "0",
    bundleAdjustmentsPaise: "0",
    chargesPaise: "6000",
    prePromotionSubtotalPaise: "25900",
    promotionDiscountPaise: "0",
    taxablePaise: "25900",
    taxPaise: "0",
    grandTotalPaise: "25900",
    taxInclusionMode: "TAX_INCLUSIVE",
    createdAt: "2026-09-04T00:00:00.000Z",
    lines: [],
    charges: [
      { code: "PACKAGING", amountPaise: "2000" },
      { code: "DELIVERY", amountPaise: "4000" },
    ],
    promotionEffects: [],
    taxComponents: [],
    ...overrides,
  };
}

function checkoutState(overrides: Record<string, unknown> = {}) {
  return {
    id: "chk-1",
    customerAuthUserId: "user-1",
    brandId: catalog.brandId,
    cartId: "cart-1",
    sourceCartRevision: "7",
    revision: "1",
    status: "DRAFT",
    expiresAt: "2026-09-04T01:00:00.000Z",
    activeSnapshotId: null,
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
    destination: null,
    activeSnapshot: null,
    ...overrides,
  };
}

beforeEach(() => {
  fetchCustomerSession.mockResolvedValue({
    ok: true,
    data: { authenticated: true },
  });
  getActiveCart.mockResolvedValue({
    ok: true,
    status: 200,
    data: { cart },
  });
  getActiveCheckout.mockResolvedValue({
    ok: true,
    status: 200,
    data: { checkout: null },
  });
  startCheckout.mockResolvedValue({
    ok: true,
    status: 200,
    data: { checkout: checkoutState({ revision: "1", status: "DRAFT" }) },
  });
  listOwnAddresses.mockResolvedValue({
    ok: true,
    status: 200,
    data: {
      addresses: [
        { id: "addr-a", label: "ADDRESS", addressLine1: "C-802" },
        { id: "addr-b", label: "WORK", addressLine1: "37a LIG" },
      ],
    },
  });
});

describe("map-first checkout destination", () => {
  it("renders the saved-address-first checkout destination flow", async () => {
    render(<CheckoutClient catalog={catalog} />);
    await waitFor(() => expect(screen.getByTestId("checkout-destination-select")).toBeInTheDocument());
    expect(screen.getByText("Choose a delivery address")).toBeInTheDocument();
    expect(screen.queryByLabelText(/PIN code/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^City$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^State$/i)).not.toBeInTheDocument();
  });
});

describe("CheckoutClient back-navigation revision reconciliation", () => {
  it("TEST 1: Review → Back to Delivery → Address B uses current revision", async () => {
    const user = userEvent.setup();
    setCheckoutDestination
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          checkout: checkoutState({
            revision: "2",
            status: "DRAFT",
            destination: { sourceSavedAddressId: "addr-a" },
          }),
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          checkout: checkoutState({
            revision: "4",
            status: "DRAFT",
            destination: { sourceSavedAddressId: "addr-b" },
          }),
        },
      });
    evaluateCheckout
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          checkout: checkoutState({
            revision: "3",
            status: "READY_FOR_PAYMENT",
            activeSnapshotId: "snap-1",
            activeSnapshot: snapshot({ checkoutRevision: "3" }),
          }),
          snapshot: snapshot({ checkoutRevision: "3" }),
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          checkout: checkoutState({
            revision: "5",
            status: "READY_FOR_PAYMENT",
            activeSnapshotId: "snap-2",
            activeSnapshot: snapshot({ id: "snap-2", checkoutRevision: "5" }),
          }),
          snapshot: snapshot({ id: "snap-2", checkoutRevision: "5" }),
        },
      });
    getActiveCheckout
      .mockResolvedValueOnce({ ok: true, status: 200, data: { checkout: null } })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          checkout: checkoutState({
            revision: "3",
            status: "READY_FOR_PAYMENT",
            activeSnapshotId: "snap-1",
            activeSnapshot: snapshot({ checkoutRevision: "3" }),
          }),
        },
      });

    render(<CheckoutClient catalog={catalog} />);
    await waitFor(() => expect(screen.getByTestId("pick-address-a")).toBeInTheDocument());
    await user.click(screen.getByTestId("pick-address-a"));
    await waitFor(() => expect(screen.getByTestId("checkout-review")).toBeInTheDocument());
    await user.click(screen.getByTestId("checkout-back-to-delivery"));
    await waitFor(() => expect(screen.getByTestId("pick-address-b")).toBeInTheDocument());
    await user.click(screen.getByTestId("pick-address-b"));
    await waitFor(() =>
      expect(setCheckoutDestination).toHaveBeenLastCalledWith(
        expect.objectContaining({
          expectedCheckoutRevision: "3",
          destination: { kind: "SAVED_ADDRESS", savedAddressId: "addr-b" },
        }),
      ),
    );
    expect(screen.queryByText(/Checkout changed/i)).not.toBeInTheDocument();
  });

  it("TEST 2: Payment revision advance → Back → Edit delivery uses authoritative revision", async () => {
    const user = userEvent.setup();
    setCheckoutDestination
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { checkout: checkoutState({ revision: "2", status: "DRAFT" }) },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { checkout: checkoutState({ revision: "12", status: "DRAFT" }) },
      });
    evaluateCheckout
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          checkout: checkoutState({
            revision: "3",
            status: "READY_FOR_PAYMENT",
            activeSnapshotId: "snap-1",
            activeSnapshot: snapshot({ checkoutRevision: "3" }),
          }),
          snapshot: snapshot({ checkoutRevision: "3" }),
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          checkout: checkoutState({
            revision: "13",
            status: "READY_FOR_PAYMENT",
            activeSnapshotId: "snap-2",
            activeSnapshot: snapshot({ id: "snap-2", checkoutRevision: "13" }),
          }),
          snapshot: snapshot({ id: "snap-2", checkoutRevision: "13" }),
        },
      });
    getActiveCheckout
      .mockResolvedValueOnce({ ok: true, status: 200, data: { checkout: null } })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          checkout: checkoutState({
            revision: "11",
            status: "READY_FOR_PAYMENT",
            activeSnapshotId: "snap-1",
            activeSnapshot: snapshot({ checkoutRevision: "11" }),
          }),
        },
      });

    render(<CheckoutClient catalog={catalog} />);
    await waitFor(() => expect(screen.getByTestId("pick-address-a")).toBeInTheDocument());
    await user.click(screen.getByTestId("pick-address-a"));
    await waitFor(() => expect(screen.getByTestId("checkout-review")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Continue to payment/i }));
    await waitFor(() => expect(screen.getByTestId("payment-panel-mock")).toBeInTheDocument());
    await user.click(screen.getByTestId("simulate-payment-revision-advance"));
    await user.click(screen.getByTestId("payment-back-to-review"));
    await waitFor(() => expect(screen.getByTestId("checkout-review")).toBeInTheDocument());
    await user.click(screen.getByTestId("checkout-back-to-delivery"));
    await waitFor(() => expect(screen.getByTestId("pick-address-b")).toBeInTheDocument());
    await user.click(screen.getByTestId("pick-address-b"));
    await waitFor(() =>
      expect(setCheckoutDestination).toHaveBeenLastCalledWith(
        expect.objectContaining({
          expectedCheckoutRevision: "11",
          destination: { kind: "SAVED_ADDRESS", savedAddressId: "addr-b" },
        }),
      ),
    );
    expect(screen.queryByText(/Checkout changed/i)).not.toBeInTheDocument();
  });

  it("TEST 9: genuine stale expectedCheckoutRevision still surfaces CHECKOUT_CONFLICT", async () => {
    const user = userEvent.setup();
    setCheckoutDestination
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { checkout: checkoutState({ revision: "2", status: "DRAFT" }) },
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        code: "CHECKOUT_CONFLICT",
      });
    evaluateCheckout.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: {
        checkout: checkoutState({
          revision: "3",
          status: "READY_FOR_PAYMENT",
          activeSnapshotId: "snap-1",
          activeSnapshot: snapshot({ checkoutRevision: "3" }),
        }),
        snapshot: snapshot({ checkoutRevision: "3" }),
      },
    });
    getActiveCheckout
      .mockResolvedValueOnce({ ok: true, status: 200, data: { checkout: null } })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          checkout: checkoutState({
            revision: "3",
            status: "READY_FOR_PAYMENT",
            activeSnapshotId: "snap-1",
            activeSnapshot: snapshot({ checkoutRevision: "3" }),
          }),
        },
      });

    render(<CheckoutClient catalog={catalog} />);
    await waitFor(() => expect(screen.getByTestId("pick-address-a")).toBeInTheDocument());
    await user.click(screen.getByTestId("pick-address-a"));
    await waitFor(() => expect(screen.getByTestId("checkout-review")).toBeInTheDocument());
    await user.click(screen.getByTestId("checkout-back-to-delivery"));
    await waitFor(() => expect(screen.getByTestId("pick-address-b")).toBeInTheDocument());
    await user.click(screen.getByTestId("pick-address-b"));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Checkout changed. Refresh and try again."),
    );
  });
});
