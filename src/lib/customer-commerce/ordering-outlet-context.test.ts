import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  menuOutletIdFromOrderingContext,
  resolveCustomerOrderingOutletContext,
} from "./ordering-outlet-context";

const evaluateDeliveryServiceability = vi.fn();

vi.mock("./serviceability", () => ({
  evaluateDeliveryServiceability: (...args: unknown[]) =>
    evaluateDeliveryServiceability(...args),
}));

beforeEach(() => {
  evaluateDeliveryServiceability.mockReset();
});

describe("resolveCustomerOrderingOutletContext", () => {
  it("does not invent an outlet without coordinates", async () => {
    const result = await resolveCustomerOrderingOutletContext({
      brandId: "brand-1",
      coordinates: null,
    });
    expect(result).toEqual({ kind: "no_location" });
    expect(evaluateDeliveryServiceability).not.toHaveBeenCalled();
    expect(menuOutletIdFromOrderingContext(result)).toBeUndefined();
  });

  it("uses server-selected outlet only when SERVICEABLE", async () => {
    evaluateDeliveryServiceability.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        decision: {
          status: "SERVICEABLE",
          evaluatedAt: "2026-09-09T00:00:00.000Z",
          selectedOutletId: "outlet-1",
        },
      },
    });
    const result = await resolveCustomerOrderingOutletContext({
      brandId: "brand-1",
      coordinates: { latitude: "30.3256000", longitude: "78.0436000" },
    });
    expect(result.kind).toBe("serviceable");
    expect(menuOutletIdFromOrderingContext(result)).toBe("outlet-1");
  });

  it("does not pass outlet projection context when temporarily unavailable", async () => {
    evaluateDeliveryServiceability.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        decision: {
          status: "TEMPORARILY_UNAVAILABLE",
          evaluatedAt: "2026-09-09T00:00:00.000Z",
        },
      },
    });
    const result = await resolveCustomerOrderingOutletContext({
      brandId: "brand-1",
      coordinates: { latitude: "30.3256000", longitude: "78.0436000" },
    });
    expect(result.kind).toBe("not_orderable");
    expect(menuOutletIdFromOrderingContext(result)).toBeUndefined();
  });
});
