import { describe, expect, it } from "vitest";

import {
  cartEvaluationCustomerCopy,
  deliverToOperatingAreaLocality,
  deliverToOrientationBody,
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
});
