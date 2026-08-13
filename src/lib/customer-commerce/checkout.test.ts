import { afterEach, describe, expect, it, vi } from "vitest";

import { evaluateCheckout, setCheckoutDestination, startCheckout } from "./checkout";

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

const checkout = {
  id: "chk-1",
  customerAuthUserId: "user-1",
  brandId: "brand-1",
  cartId: "cart-1",
  sourceCartRevision: "2",
  revision: "1",
  status: "DRAFT",
  expiresAt: "2026-08-13T01:00:00.000Z",
  activeSnapshotId: null,
  createdAt: "2026-08-13T00:00:00.000Z",
  updatedAt: "2026-08-13T00:00:00.000Z",
  destination: null,
  activeSnapshot: null,
};

describe("checkout client", () => {
  it("starts checkout, sets destination, and returns authoritative evaluate totals", async () => {
    const snapshot = {
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
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ ok: true, checkout }))
        .mockResolvedValueOnce(
          jsonResponse({
            ok: true,
            checkout: { ...checkout, revision: "2", destination: snapshot.destination },
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            ok: true,
            checkout: { ...checkout, revision: "3", status: "READY_FOR_PAYMENT", activeSnapshot: snapshot },
            snapshot,
          }),
        ),
    );

    const started = await startCheckout({ cartId: "cart-1" });
    expect(started.ok).toBe(true);

    const dest = await setCheckoutDestination({
      checkoutId: "chk-1",
      expectedCheckoutRevision: "1",
      destination: {
        kind: "ONE_TIME_ADDRESS",
        recipientName: "A",
        recipientPhone: "+919876543210",
        addressLine1: "1 Mall Road",
        city: "Dehradun",
        stateCode: "IN-UT",
        postalCode: "248001",
      },
    });
    expect(dest.ok).toBe(true);

    const evaluated = await evaluateCheckout({
      checkoutId: "chk-1",
      expectedCheckoutRevision: "2",
    });
    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) return;
    expect(evaluated.data.checkout.status).toBe("READY_FOR_PAYMENT");
    expect(evaluated.data.snapshot.grandTotalPaise).toBe("27195");
  });

  it("surfaces serviceability / business evaluate failures without inventing codes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(
          { ok: false, code: "CHECKOUT_NOT_SERVICEABLE", requestId: "req-s" },
          409,
        ),
      ),
    );
    const failed = await evaluateCheckout({
      checkoutId: "chk-1",
      expectedCheckoutRevision: "2",
    });
    expect(failed).toEqual({
      ok: false,
      code: "CHECKOUT_NOT_SERVICEABLE",
      requestId: "req-s",
      status: 409,
    });
  });
});
