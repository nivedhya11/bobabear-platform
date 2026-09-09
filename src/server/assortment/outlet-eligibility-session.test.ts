/**
 * Deterministic composition-shape evidence for outlet-aware Menu eligibility.
 *
 * Exercises the REAL production `resolveOutletVariantAvailability` path with a
 * full composition preload — nested scalar catalog / modifier / exclusion /
 * availability reads must not run during per-variant resolve.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PersistenceQueryContext } from "../persistence/types";

const findVariantById = vi.fn();
const findProductById = vi.fn();
const findModifierOptionById = vi.fn();
const findModifierOptionExclusion = vi.fn();
const findProductOrVariantExclusion = vi.fn();
const hasActiveBrandVariantInclude = vi.fn();
const loadEffectiveModifierOptionAvailabilityState = vi.fn();
const loadEffectiveVariantAvailabilityState = vi.fn();
const loadOutletAncestry = vi.fn();
const loadActiveBrandVariantIncludes = vi.fn();
const loadOutletExclusionIndex = vi.fn();
const resolveOutletOperatingState = vi.fn();
const loadEffectiveVariantAvailabilityStates = vi.fn();
const loadEffectiveModifierOptionAvailabilityStates = vi.fn();

vi.mock("../catalog/variants", () => ({
  findVariantById: (...args: unknown[]) => findVariantById(...args),
}));

vi.mock("../catalog/products", () => ({
  findProductById: (...args: unknown[]) => findProductById(...args),
}));

vi.mock("../catalog/modifiers", () => ({
  findModifierOptionById: (...args: unknown[]) => findModifierOptionById(...args),
}));

vi.mock("./assortment-reads", async () => {
  const actual = await vi.importActual<typeof import("./assortment-reads")>(
    "./assortment-reads",
  );
  return {
    ...actual,
    loadOutletAncestry: (...args: unknown[]) => loadOutletAncestry(...args),
    loadActiveBrandVariantIncludes: (...args: unknown[]) =>
      loadActiveBrandVariantIncludes(...args),
    loadOutletExclusionIndex: (...args: unknown[]) => loadOutletExclusionIndex(...args),
    findModifierOptionExclusion: (...args: unknown[]) => findModifierOptionExclusion(...args),
    findProductOrVariantExclusion: (...args: unknown[]) =>
      findProductOrVariantExclusion(...args),
    hasActiveBrandVariantInclude: (...args: unknown[]) => hasActiveBrandVariantInclude(...args),
  };
});

vi.mock("./resolve-operating", () => ({
  resolveOutletOperatingState: (...args: unknown[]) => resolveOutletOperatingState(...args),
}));

vi.mock("./availability", async () => {
  const actual = await vi.importActual<typeof import("./availability")>("./availability");
  return {
    ...actual,
    loadEffectiveVariantAvailabilityStates: (...args: unknown[]) =>
      loadEffectiveVariantAvailabilityStates(...args),
    loadEffectiveModifierOptionAvailabilityStates: (...args: unknown[]) =>
      loadEffectiveModifierOptionAvailabilityStates(...args),
    loadEffectiveVariantAvailabilityState: (...args: unknown[]) =>
      loadEffectiveVariantAvailabilityState(...args),
    loadEffectiveModifierOptionAvailabilityState: (...args: unknown[]) =>
      loadEffectiveModifierOptionAvailabilityState(...args),
  };
});

describe("outlet eligibility production query bound", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadOutletAncestry.mockResolvedValue({
      outletId: "outlet-1",
      brandId: "brand-1",
      organizationId: "org-1",
      territoryId: "terr-1",
      status: "active",
    });
    resolveOutletOperatingState.mockResolvedValue({
      effectiveState: "accepting",
      code: "AVAILABLE",
      timezone: "Asia/Kolkata",
      controlState: "accepting",
    });
    loadOutletExclusionIndex.mockResolvedValue({
      excludedProductIds: new Map(),
      excludedVariantIds: new Map(),
      excludedModifierOptionIds: new Set(),
    });
    loadActiveBrandVariantIncludes.mockImplementation(
      async (_ctx: unknown, _brand: string, ids: string[]) => new Set(ids),
    );
    loadEffectiveVariantAvailabilityStates.mockImplementation(
      async (_ctx: unknown, _outlet: string, ids: string[]) => {
        const map = new Map<string, "available">();
        for (const id of ids) map.set(id, "available");
        return map;
      },
    );
    loadEffectiveModifierOptionAvailabilityStates.mockImplementation(
      async (_ctx: unknown, _outlet: string, ids: string[]) => {
        const map = new Map<string, "available">();
        for (const id of ids) map.set(id, "available");
        return map;
      },
    );
  });

  it("resolves N menu variants through real IMP-014 without nested scalar DB fanout", async () => {
    const variantIds = ["var-1", "var-2", "var-3", "var-4", "var-5"];
    const productIds = variantIds.map((id) => `prod-${id}`);

    // Deterministic select order from loadOutletEligibilityComposition (no bundles):
    // variants → products → modifier bindings → group options → active options
    const selectQueue: unknown[][] = [
      variantIds.map((id, index) => ({
        id,
        brandId: "brand-1",
        productId: productIds[index]!,
        productKind: "standard",
        code: id,
        name: id,
        description: null,
        isDefault: true,
        isSelectorVisible: true,
        lifecycleStatus: "active",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        activatedAt: "2026-01-01T00:00:00.000Z",
        retiredAt: null,
      })),
      productIds.map((id) => ({
        id,
        brandId: "brand-1",
        code: id,
        name: id,
        description: null,
        productKind: "standard",
        lifecycleStatus: "active",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        activatedAt: "2026-01-01T00:00:00.000Z",
        retiredAt: null,
      })),
      variantIds.map((variantId, index) => ({
        id: `binding-${index}`,
        brandId: "brand-1",
        variantId,
        modifierGroupId: `group-${index}`,
        minTotalQuantity: 1,
        maxTotalQuantity: 2,
        position: 0,
        lifecycleStatus: "active",
      })),
      variantIds.map((_variantId, index) => ({
        id: `go-${index}`,
        brandId: "brand-1",
        modifierGroupId: `group-${index}`,
        modifierOptionId: `opt-${index}`,
        minQuantity: 0,
        maxQuantity: 1,
        defaultQuantity: 0,
        position: 0,
        lifecycleStatus: "active",
      })),
      variantIds.map((_id, index) => ({ id: `opt-${index}` })),
    ];

    let selectCallsDuringResolve = 0;
    let resolvePhase = false;
    const db = {
      select: vi.fn(() => {
        if (resolvePhase) {
          selectCallsDuringResolve += 1;
        }
        const rows = selectQueue.shift() ?? [];
        const chain = {
          from: () => chain,
          where: () => chain,
          orderBy: () => chain,
          limit: async () => rows,
          then: undefined as unknown,
        };
        // Make awaitable: drizzle builders are thenable via Promise resolution in our code
        // through awaiting the builder directly in some paths; emulate array result.
        Object.defineProperty(chain, "then", {
          value: (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
            Promise.resolve(rows).then(onFulfilled, onRejected),
        });
        return chain;
      }),
    };

    const context = { role: "application", db } as unknown as PersistenceQueryContext;
    const now = new Date("2026-09-09T12:00:00.000Z");

    const { createOutletEligibilitySession } = await import("./outlet-eligibility-session");
    const { resolveOutletVariantAvailability } = await import("./resolve-eligibility");

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
    expect(loadEffectiveModifierOptionAvailabilityStates).toHaveBeenCalledTimes(1);

    const selectCallsAfterPreload = db.select.mock.calls.length;
    resolvePhase = true;

    const decisions = await Promise.all(variantIds.map((id) => session.resolveVariant(id)));
    // duplicate resolve must hit decision cache, still production resolver path
    await session.resolveVariant("var-1");

    expect(decisions.every((decision) => decision.eligible && decision.code === "AVAILABLE")).toBe(
      true,
    );
    expect(selectCallsDuringResolve).toBe(0);
    expect(db.select.mock.calls.length).toBe(selectCallsAfterPreload);
    expect(findVariantById).not.toHaveBeenCalled();
    expect(findProductById).not.toHaveBeenCalled();
    expect(findModifierOptionById).not.toHaveBeenCalled();
    expect(findModifierOptionExclusion).not.toHaveBeenCalled();
    expect(findProductOrVariantExclusion).not.toHaveBeenCalled();
    expect(hasActiveBrandVariantInclude).not.toHaveBeenCalled();
    expect(loadEffectiveModifierOptionAvailabilityState).not.toHaveBeenCalled();
    expect(loadEffectiveVariantAvailabilityState).not.toHaveBeenCalled();

    // Direct production resolver with the same preload remains in-memory.
    const direct = await resolveOutletVariantAvailability(
      context,
      { variantId: "var-2", outletId: "outlet-1", context: { now } },
      session.preload,
    );
    expect(direct).toEqual({ eligible: true, code: "AVAILABLE" });
    expect(selectCallsDuringResolve).toBe(0);
    expect(findVariantById).not.toHaveBeenCalled();
  });

  it("marks required-modifier capacity infeasible from preloaded option availability", async () => {
    loadEffectiveModifierOptionAvailabilityStates.mockImplementation(
      async (_ctx: unknown, _outlet: string, ids: string[]) => {
        const map = new Map<string, "available" | "sold_out">();
        for (const id of ids) map.set(id, "sold_out");
        return map;
      },
    );

    const selectQueue: unknown[][] = [
      [
        {
          id: "var-1",
          brandId: "brand-1",
          productId: "prod-1",
          productKind: "standard",
          code: "var-1",
          name: "var-1",
          description: null,
          isDefault: true,
          isSelectorVisible: true,
          lifecycleStatus: "active",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          activatedAt: "2026-01-01T00:00:00.000Z",
          retiredAt: null,
        },
      ],
      [
        {
          id: "prod-1",
          brandId: "brand-1",
          code: "prod-1",
          name: "prod-1",
          description: null,
          productKind: "standard",
          lifecycleStatus: "active",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          activatedAt: "2026-01-01T00:00:00.000Z",
          retiredAt: null,
        },
      ],
      [
        {
          id: "binding-1",
          brandId: "brand-1",
          variantId: "var-1",
          modifierGroupId: "group-1",
          minTotalQuantity: 1,
          maxTotalQuantity: 1,
          position: 0,
          lifecycleStatus: "active",
        },
      ],
      [
        {
          id: "go-1",
          brandId: "brand-1",
          modifierGroupId: "group-1",
          modifierOptionId: "opt-1",
          minQuantity: 0,
          maxQuantity: 1,
          defaultQuantity: 0,
          position: 0,
          lifecycleStatus: "active",
        },
      ],
      [{ id: "opt-1" }],
    ];

    const db = {
      select: vi.fn(() => {
        const rows = selectQueue.shift() ?? [];
        const chain = {
          from: () => chain,
          where: () => chain,
          orderBy: () => chain,
          limit: async () => rows,
        };
        Object.defineProperty(chain, "then", {
          value: (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
            Promise.resolve(rows).then(onFulfilled, onRejected),
        });
        return chain;
      }),
    };

    const context = { role: "application", db } as unknown as PersistenceQueryContext;
    const { createOutletEligibilitySession } = await import("./outlet-eligibility-session");
    const session = await createOutletEligibilitySession(context, {
      outletId: "outlet-1",
      variantIds: ["var-1"],
      now: new Date("2026-09-09T12:00:00.000Z"),
    });

    const decision = await session.resolveVariant("var-1");
    expect(decision).toEqual({
      eligible: false,
      code: "MODIFIER_CONFIGURATION_UNAVAILABLE",
    });
    expect(findVariantById).not.toHaveBeenCalled();
    expect(loadEffectiveModifierOptionAvailabilityState).not.toHaveBeenCalled();
  });
});
