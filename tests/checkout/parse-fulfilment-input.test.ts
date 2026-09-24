/**
 * Unit tests for parseSetCheckoutFulfilmentInput (IMP-036H-B).
 */
import { describe, expect, it } from "vitest";

import { parseSetCheckoutFulfilmentInput } from "../../src/shared/checkout";

const CHECKOUT_ID = "11111111-1111-4111-8111-111111111111";
const OUTLET_ID = "22222222-2222-4222-8222-222222222222";

describe("parseSetCheckoutFulfilmentInput", () => {
  it("parses DELIVERY and clears pickup outlet when null", () => {
    const parsed = parseSetCheckoutFulfilmentInput({
      checkoutId: CHECKOUT_ID,
      expectedCheckoutRevision: BigInt(3),
      fulfilmentMode: "DELIVERY",
      pickupOutletId: null,
    });
    expect(parsed.fulfilmentMode).toBe("DELIVERY");
    expect(parsed.pickupOutletId).toBeNull();
    expect(parsed.expectedCheckoutRevision).toBe(BigInt(3));
  });

  it("parses PICKUP with optional outlet", () => {
    const withOutlet = parseSetCheckoutFulfilmentInput({
      checkoutId: CHECKOUT_ID,
      expectedCheckoutRevision: BigInt(1),
      fulfilmentMode: "PICKUP",
      pickupOutletId: OUTLET_ID,
    });
    expect(withOutlet.pickupOutletId).toBe(OUTLET_ID);

    const without = parseSetCheckoutFulfilmentInput({
      checkoutId: CHECKOUT_ID,
      expectedCheckoutRevision: BigInt(1),
      fulfilmentMode: "PICKUP",
    });
    expect(without.pickupOutletId).toBeUndefined();
  });

  it("rejects DELIVERY with non-null pickupOutletId", () => {
    expect(() =>
      parseSetCheckoutFulfilmentInput({
        checkoutId: CHECKOUT_ID,
        expectedCheckoutRevision: BigInt(1),
        fulfilmentMode: "DELIVERY",
        pickupOutletId: OUTLET_ID,
      }),
    ).toThrow(/pickupOutletId/);
  });

  it("rejects unknown fields and invalid mode", () => {
    expect(() =>
      parseSetCheckoutFulfilmentInput({
        checkoutId: CHECKOUT_ID,
        expectedCheckoutRevision: BigInt(1),
        fulfilmentMode: "PICKUP",
        extra: true,
      }),
    ).toThrow(/Unknown field/);
    expect(() =>
      parseSetCheckoutFulfilmentInput({
        checkoutId: CHECKOUT_ID,
        expectedCheckoutRevision: BigInt(1),
        fulfilmentMode: "WALK_IN",
      }),
    ).toThrow(/fulfilmentMode/);
  });
});
