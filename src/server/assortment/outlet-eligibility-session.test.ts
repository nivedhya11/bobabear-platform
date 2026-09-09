/**
 * Deterministic composition-shape evidence for outlet-aware Menu eligibility.
 */
import { describe, expect, it, vi } from "vitest";

import type { PersistenceQueryContext } from "../persistence/types";

vi.mock("./assortment-reads", async () => {
  const actual = await vi.importActual<typeof import("./assortment-reads")>(
    "./assortment-reads",
  );
  return {
    ...actual,
    loadOutletAncestry: vi.fn(async () => ({
      outletId: "outlet-1",
      brandId: "brand-1",
      organizationId: "org-1",
      territoryId: "terr-1",
      status: "active",
    })),
    loadActiveBrandVariantIncludes: vi.fn(async (_ctx: unknown, _brand: string, ids: string[]) =>
      new Set(ids),
    ),
    loadOutletExclusionIndex: vi.fn(async () => ({
      excludedProductIds: new Map(),
      excludedVariantIds: new Map(),
      excludedModifierOptionIds: new Set(),
    })),
  };
});

vi.mock("./resolve-operating", () => ({
  resolveOutletOperatingState: vi.fn(async () => ({
    effectiveState: "accepting",
    code: "AVAILABLE",
    timezone: "Asia/Kolkata",
    controlState: "accepting",
  })),
}));

vi.mock("./availability", async () => {
  const actual = await vi.importActual<typeof import("./availability")>("./availability");
  return {
    ...actual,
    loadEffectiveVariantAvailabilityStates: vi.fn(async (_ctx, _outlet, ids: string[]) => {
      const map = new Map<string, "available">();
      for (const id of ids) map.set(id, "available");
      return map;
    }),
  };
});

vi.mock("./resolve-eligibility", () => ({
  resolveOutletVariantAvailability: vi.fn(async () => ({
    eligible: true,
    code: "AVAILABLE",
  })),
}));

vi.mock("../catalog/variants", () => ({
  findVariantById: vi.fn(),
}));

vi.mock("../catalog/products", () => ({
  findProductById: vi.fn(),
}));

describe("createOutletEligibilitySession query composition shape", () => {
  it("loads outlet-common ancestry/operating/includes/availability/exclusions once per session", async () => {
    const { loadOutletAncestry, loadActiveBrandVariantIncludes, loadOutletExclusionIndex } =
      await import("./assortment-reads");
    const { resolveOutletOperatingState } = await import("./resolve-operating");
    const { loadEffectiveVariantAvailabilityStates } = await import("./availability");
    const { resolveOutletVariantAvailability } = await import("./resolve-eligibility");
    const { createOutletEligibilitySession } = await import("./outlet-eligibility-session");

    const context = { role: "application", db: {} } as PersistenceQueryContext;
    const variantIds = ["var-1", "var-2", "var-3"];
    const now = new Date("2026-09-09T12:00:00.000Z");

    const session = await createOutletEligibilitySession(context, {
      outletId: "outlet-1",
      variantIds,
      now,
    });

    expect(loadOutletAncestry).toHaveBeenCalledTimes(1);
    expect(resolveOutletOperatingState).toHaveBeenCalledTimes(1);
    expect(loadActiveBrandVariantIncludes).toHaveBeenCalledTimes(1);
    expect(loadEffectiveVariantAvailabilityStates).toHaveBeenCalledTimes(1);
    expect(loadOutletExclusionIndex).toHaveBeenCalledTimes(1);

    await session.resolveVariant("var-1");
    await session.resolveVariant("var-2");
    await session.resolveVariant("var-1");

    expect(resolveOutletVariantAvailability).toHaveBeenCalledTimes(2);
    expect(resolveOutletVariantAvailability).toHaveBeenCalledWith(
      context,
      expect.objectContaining({ variantId: "var-1", outletId: "outlet-1" }),
      expect.objectContaining({
        ancestry: expect.objectContaining({ outletId: "outlet-1" }),
        operating: expect.objectContaining({ code: "AVAILABLE" }),
        includedVariantIds: expect.any(Set),
        variantAvailability: expect.any(Map),
        exclusions: expect.any(Object),
      }),
    );
    expect(loadOutletAncestry).toHaveBeenCalledTimes(1);
    expect(resolveOutletOperatingState).toHaveBeenCalledTimes(1);
  });
});
