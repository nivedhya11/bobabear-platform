import { describe, expect, it } from "vitest";

import {
  cartEvaluationCustomerCopy,
  deliverToOperatingAreaLocality,
  deliverToOrientationBody,
  deliveryServiceabilityCustomerCopy,
  isCartCheckoutBlocked,
} from "./serviceability-copy";

describe("serviceability copy", () => {
  it("shows operating area without claiming live serviceability", () => {
    expect(deliverToOperatingAreaLocality()).toBe("Dehradun");
    expect(deliverToOrientationBody()).toMatch(/choose your delivery location/i);
    expect(deliverToOrientationBody()).not.toMatch(/checkout/i);
    expect(deliverToOrientationBody()).not.toMatch(/you're in the boba zone/i);
  });

  it("does not overclaim before evaluation", () => {
    expect(cartEvaluationCustomerCopy(null, false)).toBeNull();
    expect(cartEvaluationCustomerCopy(null, true)).toMatch(/check this location before you pay/i);
    expect(cartEvaluationCustomerCopy({ status: "COMPLETE" } as never, true)).toBe(
      "This location looks deliverable.",
    );
    expect(cartEvaluationCustomerCopy({ status: "SERVICEABILITY_NOT_SERVICEABLE" } as never, true)).toMatch(
      /don't deliver/i,
    );
  });

  it("does not frame CART_INVALID as a location problem", () => {
    const copy = cartEvaluationCustomerCopy({ status: "CART_INVALID" } as never, true);
    expect(copy).toMatch(/aren't available/i);
    expect(copy).not.toMatch(/location/i);
  });

  it("maps delivery serviceability decisions without inventing outlet authority", () => {
    expect(deliveryServiceabilityCustomerCopy(null, false)).toBeNull();
    expect(
      deliveryServiceabilityCustomerCopy(
        { status: "TEMPORARILY_UNAVAILABLE", evaluatedAt: "2026-09-09T00:00:00.000Z" },
        true,
      ),
    ).toMatch(/isn't available right now/i);
  });

  it("blocks checkout for known blocking evaluations while allowing no-location continue", () => {
    expect(isCartCheckoutBlocked(null)).toBe(false);
    expect(isCartCheckoutBlocked({ status: "COMPLETE" } as never)).toBe(false);
    expect(isCartCheckoutBlocked({ status: "REQUIRES_FULFILMENT_CONTEXT" } as never)).toBe(false);
    expect(isCartCheckoutBlocked({ status: "CART_INVALID" } as never)).toBe(true);
    expect(isCartCheckoutBlocked({ status: "SERVICEABILITY_TEMPORARILY_UNAVAILABLE" } as never)).toBe(
      true,
    );
  });
});
