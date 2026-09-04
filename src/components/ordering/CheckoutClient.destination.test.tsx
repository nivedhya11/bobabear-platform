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
  readPaymentRecovery,
} = vi.hoisted(() => ({
  fetchCustomerSession: vi.fn<(...args: unknown[]) => unknown>(),
  getActiveCart: vi.fn<(...args: unknown[]) => unknown>(),
  getActiveCheckout: vi.fn<(...args: unknown[]) => unknown>(),
  startCheckout: vi.fn<(...args: unknown[]) => unknown>(),
  listOwnAddresses: vi.fn<(...args: unknown[]) => unknown>(),
  setCheckoutDestination: vi.fn<(...args: unknown[]) => unknown>(),
  evaluateCheckout: vi.fn<(...args: unknown[]) => unknown>(),
  readGuestCartCredential: vi.fn<(...args: unknown[]) => unknown>(() => null),
  readPaymentRecovery: vi.fn<(...args: unknown[]) => unknown>(() => null),
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
    resumePaymentId?: string | null;
    cartChangedWhilePending?: boolean;
    embeddedInPreviousPaymentRecovery?: boolean;
    onPaymentTerminalForCartChange?: () => void;
  }) => (
    <div
      data-testid="payment-panel-mock"
      data-resume-payment-id={props.resumePaymentId ?? ""}
      data-cart-changed={props.cartChangedWhilePending ? "true" : "false"}
      data-embedded-recovery={props.embeddedInPreviousPaymentRecovery ? "true" : "false"}
    >
      {props.cartChangedWhilePending ? (
        <p data-testid="payment-checking">Checking previous payment status</p>
      ) : null}
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
      <button
        type="button"
        data-testid="simulate-payment-terminal"
        onClick={() => props.onPaymentTerminalForCartChange?.()}
      >
        Simulate terminal payment
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
    readPaymentRecovery: (...args: unknown[]) => readPaymentRecovery(...args),
    claimGuestCart: vi.fn(),
    reconcileGuestCart: vi.fn(),
    clearGuestCartCredential: vi.fn(),
    createOwnAddress: vi.fn(),
    updateOwnAddress: vi.fn(),
  };
});

const catalog = {
  brandId: "56ff7724-d511-5ef4-b5d5-d629cbfb2388",
  items: [
    {
      sourceKey: "hk",
      productId: "p-1",
      variantId: "var-1",
      sectionId: "s-1",
      name: "Brown Sugar Boba",
      description: "",
      imagePath: "",
      presentationPriceRupees: 220,
      tags: [],
      categorySlug: "drinks",
      subcategoryName: "Tea",
      position: 1,
    },
  ],
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
  readPaymentRecovery.mockReturnValue(null);
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

describe("CheckoutClient cart-changed payment recovery", () => {
  const pendingSnapshot = snapshot({
    sourceCartRevision: "5",
    checkoutRevision: "4",
    grandTotalPaise: "84700",
    lines: [
      {
        productName: "Hong Kong Milk Tea Boba",
        variantName: "Regular",
        quantity: 3,
        lineTotalPaise: "78700",
      },
    ],
  });

  const pendingCheckout = checkoutState({
    revision: "4",
    status: "PAYMENT_PENDING",
    sourceCartRevision: "5",
    activeSnapshotId: "snap-1",
    activeSnapshot: pendingSnapshot,
  });

  beforeEach(() => {
    getActiveCart.mockResolvedValue({
      ok: true,
      status: 200,
      data: { cart: { ...cart, revision: "16" } },
    });
    getActiveCheckout.mockResolvedValue({
      ok: true,
      status: 200,
      data: { checkout: pendingCheckout },
    });
    startCheckout.mockReset();
    readPaymentRecovery.mockReturnValue(null);
  });

  it("renders dedicated previous-payment recovery instead of plain dead-end", async () => {
    render(<CheckoutClient catalog={catalog} />);

    await waitFor(() => {
      expect(screen.getByTestId("cart-changed-unresolved")).toBeInTheDocument();
    });
    expect(screen.getByText("Previous payment is being checked")).toBeInTheDocument();
    expect(screen.getByTestId("previous-checkout-summary")).toHaveTextContent("Previous checkout");
    expect(screen.getByText("Previous checkout items")).toBeInTheDocument();
    expect(screen.getByText(/3 × Hong Kong Milk Tea Boba/)).toBeInTheDocument();
    expect(screen.getByTestId("current-cart-summary")).toHaveTextContent("1 item");
    expect(screen.getByTestId("current-cart-lines")).toHaveTextContent("1 × Brown Sugar Boba");
    expect(screen.getByTestId("current-cart-summary")).not.toHaveTextContent(
      "Hong Kong Milk Tea Boba",
    );
    expect(screen.queryByText("Your items")).not.toBeInTheDocument();
    expect(screen.queryByTestId("checkout-steps")).not.toBeInTheDocument();
    expect(screen.getByTestId("previous-checkout-address-lock")).toBeInTheDocument();
    expect(screen.getByTestId("cart-changed-back-to-cart")).toHaveAttribute("href", "/order/cart/");
    expect(
      screen.queryByText("Your cart changed. Review it and start checkout again."),
    ).not.toBeInTheDocument();
    expect(startCheckout).not.toHaveBeenCalled();
  });

  it("keeps recovery presentation when session recovery matches (no normal payment layout)", async () => {
    readPaymentRecovery.mockReturnValue({
      paymentId: "pay-1",
      checkoutId: "chk-1",
      checkoutRevision: "4",
    });

    render(<CheckoutClient catalog={catalog} />);

    await waitFor(() => {
      expect(screen.getByTestId("cart-changed-unresolved")).toBeInTheDocument();
    });
    expect(screen.getByTestId("payment-panel-mock")).toBeInTheDocument();
    const panel = screen.getByTestId("payment-panel-mock");
    expect(panel.getAttribute("data-resume-payment-id")).toBe("pay-1");
    expect(panel.getAttribute("data-cart-changed")).toBe("true");
    expect(panel.getAttribute("data-embedded-recovery")).toBe("true");
    expect(screen.getByTestId("payment-checking")).toBeInTheDocument();
    expect(screen.queryByTestId("checkout-ready")).not.toBeInTheDocument();
    expect(screen.queryByText("Your items")).not.toBeInTheDocument();
    expect(screen.queryByTestId("checkout-steps")).not.toBeInTheDocument();
    expect(startCheckout).not.toHaveBeenCalled();
  });

  it("returns to recovery when startCheckout still sees unresolved previous payment", async () => {
    readPaymentRecovery.mockReturnValue({
      paymentId: "pay-1",
      checkoutId: "chk-1",
      checkoutRevision: "4",
    });
    getActiveCheckout.mockResolvedValue({
      ok: true,
      status: 200,
      data: { checkout: pendingCheckout },
    });
    startCheckout.mockResolvedValue({
      ok: false,
      code: "CHECKOUT_STATE_CONFLICT",
      status: 409,
    });

    render(<CheckoutClient catalog={catalog} />);
    await waitFor(() => expect(screen.getByTestId("payment-panel-mock")).toBeInTheDocument());
    await userEvent.click(screen.getByTestId("simulate-payment-terminal"));
    await waitFor(() => expect(screen.getByTestId("cart-changed-fresh")).toBeInTheDocument());
    await userEvent.click(screen.getByTestId("cart-changed-start-fresh"));
    await waitFor(() => {
      expect(screen.getByTestId("cart-changed-unresolved")).toBeInTheDocument();
    });
    expect(startCheckout).toHaveBeenCalledWith({ cartId: "cart-1" });
  });

  it("offers actionable fresh checkout after payment becomes terminal", async () => {
    readPaymentRecovery.mockReturnValue({
      paymentId: "pay-1",
      checkoutId: "chk-1",
      checkoutRevision: "4",
    });
    startCheckout.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        checkout: checkoutState({
          id: "chk-2",
          status: "DRAFT",
          sourceCartRevision: "16",
          revision: "1",
        }),
      },
    });
    getActiveCheckout.mockResolvedValue({
      ok: true,
      status: 200,
      data: { checkout: pendingCheckout },
    });

    render(<CheckoutClient catalog={catalog} />);

    await waitFor(() => {
      expect(screen.getByTestId("payment-panel-mock")).toBeInTheDocument();
    });
    await userEvent.click(screen.getByTestId("simulate-payment-terminal"));

    await waitFor(() => {
      expect(screen.getByTestId("cart-changed-fresh")).toBeInTheDocument();
    });
    expect(screen.getByText("Your cart changed")).toBeInTheDocument();
    expect(screen.getByTestId("cart-changed-start-fresh")).toBeInTheDocument();
    expect(screen.getByTestId("cart-changed-review-cart")).toBeInTheDocument();
    expect(screen.queryByTestId("checkout-steps")).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId("cart-changed-start-fresh"));
    await waitFor(() => {
      expect(startCheckout).toHaveBeenCalledWith({ cartId: "cart-1" });
    });
  });

  it("keeps normal Delivery/Review/Payment stepper when cart matches checkout", async () => {
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
      data: { checkout: checkoutState({ revision: "1", status: "DRAFT", sourceCartRevision: "7" }) },
    });

    render(<CheckoutClient catalog={catalog} />);
    await waitFor(() => expect(screen.getByTestId("checkout-destination-select")).toBeInTheDocument());
    expect(screen.getByTestId("checkout-steps")).toBeInTheDocument();
  });
});
