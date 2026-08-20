import { describe, expect, it } from "vitest";

import {
  buildCustomerMenuLookups,
  cartBundleSelectionsToInput,
  cartModifiersToInput,
  cartPresentationItemsFromMenu,
  cartUnitCount,
  estimateCartPresentationPaise,
  formatCartEstimatePrimaryLabel,
  formatModifierPriceDelta,
  formatPresentationEstimateLabel,
  resolveCartLinePresentation,
  resolveCartPresentationEstimate,
  STALE_MODIFIER_OPTION_LABEL,
} from "./cart-presentation";
import type { CommerceCart } from "@/lib/customer-commerce";
import type { CustomerMenuProjection } from "@/shared/customer-menu/types";

const brandId = "brand-1";
const variantId = "var-1";
const bindingId = "binding-1";
const optionFree = "option-free";
const optionPaid = "option-paid";

const menu: CustomerMenuProjection = {
  brandId,
  menuId: "menu-1",
  name: "Primary Menu",
  sections: [{ id: "sec-1", parentSectionId: null, name: "Drinks", position: 1 }],
  items: [
    {
      productId: "prod-1",
      variantId,
      sectionId: "sec-1",
      name: "Classic Milk Tea",
      description: null,
      imagePath: null,
      displayPricePaise: 19900,
      currency: "INR",
      modifierGroups: [
        {
          modifierGroupId: "group-1",
          variantModifierGroupId: bindingId,
          name: "Toppings",
          required: false,
          minTotalQuantity: 0,
          maxTotalQuantity: 3,
          position: 0,
          options: [
            {
              modifierOptionId: "free",
              modifierGroupOptionId: optionFree,
              name: "Regular ice",
              minQuantity: 0,
              maxQuantity: 1,
              defaultQuantity: 1,
              position: 0,
              displayPriceDeltaPaise: 0,
              currency: "INR",
            },
            {
              modifierOptionId: "paid",
              modifierGroupOptionId: optionPaid,
              name: "Pearl",
              minQuantity: 0,
              maxQuantity: 3,
              defaultQuantity: 0,
              position: 1,
              displayPriceDeltaPaise: 2000,
              currency: "INR",
            },
          ],
        },
      ],
    },
  ],
};

const cart: CommerceCart = {
  id: "cart-1",
  brandId,
  ownerMode: "guest",
  revision: "1",
  manualCouponCode: null,
  expiresAt: null,
  createdAt: "2026-08-13T00:00:00.000Z",
  updatedAt: "2026-08-13T00:00:00.000Z",
  lines: [{ id: "line-1", variantId, quantity: 2, modifiers: [], bundleSelections: [] }],
};

describe("cart presentation", () => {
  it("counts units and estimates plain lines from Customer Menu displayPricePaise", () => {
    const lookups = buildCustomerMenuLookups(menu);
    expect(cartUnitCount(cart)).toBe(2);
    expect(estimateCartPresentationPaise(cart, lookups)).toBe(BigInt(39800));
    const estimate = resolveCartPresentationEstimate(cart, lookups);
    expect(estimate.complete).toBe(true);
    expect(estimate.totalPaise).toBe(BigInt(39800));
    expect(formatCartEstimatePrimaryLabel(estimate)).toBe("Estimated subtotal ₹398.00");
    expect(formatPresentationEstimateLabel(BigInt(39800))).toBe("₹398.00");
  });

  it("marks missing base product as not fully resolvable and withholds numeric aggregate", () => {
    const lookups = buildCustomerMenuLookups(menu);
    const orphanLine = {
      id: "line-orphan",
      variantId: "missing-variant",
      quantity: 1,
      modifiers: [] as const,
      bundleSelections: [] as const,
    };
    const presentation = resolveCartLinePresentation(orphanLine, lookups);
    expect(presentation.fullyResolvable).toBe(false);
    expect(presentation.unitPricePaise).toBe(0);
    const estimate = resolveCartPresentationEstimate(
      { ...cart, lines: [orphanLine] },
      lookups,
    );
    expect(estimate.complete).toBe(false);
    expect(formatCartEstimatePrimaryLabel(estimate)).toBe("Total shown at checkout");
    expect(formatCartEstimatePrimaryLabel(estimate)).not.toMatch(/₹/);
  });

  it("withholds numeric aggregate when a modifier is missing or stale", () => {
    const lookups = buildCustomerMenuLookups(menu);
    const line = {
      id: "line-stale-price",
      variantId,
      quantity: 1,
      modifiers: [
        {
          variantModifierGroupId: "00000000-0000-4000-8000-000000000001",
          modifierGroupOptionId: "00000000-0000-4000-8000-000000000002",
          quantity: 1,
        },
      ],
      bundleSelections: [],
    };
    expect(resolveCartLinePresentation(line, lookups).fullyResolvable).toBe(false);
    const estimate = resolveCartPresentationEstimate({ ...cart, lines: [line] }, lookups);
    expect(estimate.complete).toBe(false);
    expect(formatCartEstimatePrimaryLabel(estimate)).toBe("Total shown at checkout");
  });

  it("withholds numeric aggregate for bundle configuration that cannot prove display pricing", () => {
    const lookups = buildCustomerMenuLookups(menu);
    const line = {
      id: "line-bundle",
      variantId,
      quantity: 1,
      modifiers: [],
      bundleSelections: [
        {
          id: "bundle-child",
          bundleGroupOptionId: "bundle-opt-1",
          quantity: 1,
          modifiers: [],
        },
      ],
    };
    expect(resolveCartLinePresentation(line, lookups).fullyResolvable).toBe(false);
    const estimate = resolveCartPresentationEstimate({ ...cart, lines: [line] }, lookups);
    expect(estimate.complete).toBe(false);
    expect(formatCartEstimatePrimaryLabel(estimate)).toBe("Total shown at checkout");
  });

  it("builds presentation items from Customer Menu without legacy catalog", () => {
    const items = cartPresentationItemsFromMenu(menu);
    expect(items.get(variantId)?.name).toBe("Classic Milk Tea");
    expect(items.get(variantId)?.presentationPricePaise).toBe(19900);
  });

  it("renders configured modifier group and option names", () => {
    const lookups = buildCustomerMenuLookups(menu);
    const line = {
      id: "line-1",
      variantId,
      quantity: 1,
      modifiers: [
        { variantModifierGroupId: bindingId, modifierGroupOptionId: optionPaid, quantity: 1 },
      ],
      bundleSelections: [],
    };
    const presentation = resolveCartLinePresentation(line, lookups);
    expect(presentation.modifiers[0]?.groupName).toBe("Toppings");
    expect(presentation.modifiers[0]?.optionName).toBe("Pearl");
    expect(presentation.modifiers[0]?.stale).toBe(false);
  });

  it("shows modifier quantity when greater than one", () => {
    const lookups = buildCustomerMenuLookups(menu);
    const line = {
      id: "line-1",
      variantId,
      quantity: 1,
      modifiers: [
        { variantModifierGroupId: bindingId, modifierGroupOptionId: optionPaid, quantity: 2 },
      ],
      bundleSelections: [],
    };
    const presentation = resolveCartLinePresentation(line, lookups);
    expect(presentation.modifiers[0]?.quantity).toBe(2);
  });

  it("includes positive modifier display delta in presentation pricing", () => {
    const lookups = buildCustomerMenuLookups(menu);
    const line = {
      id: "line-1",
      variantId,
      quantity: 1,
      modifiers: [
        { variantModifierGroupId: bindingId, modifierGroupOptionId: optionPaid, quantity: 2 },
      ],
      bundleSelections: [],
    };
    const presentation = resolveCartLinePresentation(line, lookups);
    expect(presentation.unitPricePaise).toBe(19900 + 2000 * 2);
    expect(formatModifierPriceDelta(4000)).toBe("+₹40.00");
  });

  it("allows zero-price modifiers without fake surcharge display", () => {
    const lookups = buildCustomerMenuLookups(menu);
    const line = {
      id: "line-1",
      variantId,
      quantity: 1,
      modifiers: [
        { variantModifierGroupId: bindingId, modifierGroupOptionId: optionFree, quantity: 1 },
      ],
      bundleSelections: [],
    };
    const presentation = resolveCartLinePresentation(line, lookups);
    expect(presentation.unitPricePaise).toBe(19900);
    expect(formatModifierPriceDelta(0)).toBeNull();
  });

  it("keeps same-variant configured lines distinct by cartLineId", () => {
    const lookups = buildCustomerMenuLookups(menu);
    const lineA = {
      id: "line-a",
      variantId,
      quantity: 1,
      modifiers: [
        { variantModifierGroupId: bindingId, modifierGroupOptionId: optionPaid, quantity: 1 },
      ],
      bundleSelections: [],
    };
    const lineB = {
      id: "line-b",
      variantId,
      quantity: 1,
      modifiers: [
        { variantModifierGroupId: bindingId, modifierGroupOptionId: optionFree, quantity: 1 },
      ],
      bundleSelections: [],
    };
    const presentationA = resolveCartLinePresentation(lineA, lookups);
    const presentationB = resolveCartLinePresentation(lineB, lookups);
    expect(presentationA.lineId).not.toBe(presentationB.lineId);
    expect(presentationA.unitPricePaise).not.toBe(presentationB.unitPricePaise);
  });

  it("computes line total as unit price × line quantity including modifier deltas", () => {
    const lookups = buildCustomerMenuLookups(menu);
    const line = {
      id: "line-1",
      variantId,
      quantity: 3,
      modifiers: [
        { variantModifierGroupId: bindingId, modifierGroupOptionId: optionPaid, quantity: 2 },
      ],
      bundleSelections: [],
    };
    const presentation = resolveCartLinePresentation(line, lookups);
    expect(presentation.unitPricePaise).toBe(19900 + 4000);
    expect(presentation.lineTotalPaise).toBe((19900 + 4000) * 3);
    expect(estimateCartPresentationPaise({ ...cart, lines: [line] }, lookups)).toBe(
      BigInt(presentation.lineTotalPaise),
    );
  });

  it("does not regress plain line pricing", () => {
    const lookups = buildCustomerMenuLookups(menu);
    const presentation = resolveCartLinePresentation(cart.lines[0]!, lookups);
    expect(presentation.unitPricePaise).toBe(19900);
    expect(presentation.lineTotalPaise).toBe(39800);
  });

  it("marks stale persisted modifiers with neutral unavailable copy", () => {
    const lookups = buildCustomerMenuLookups(menu);
    const line = {
      id: "line-stale",
      variantId,
      quantity: 1,
      modifiers: [
        {
          variantModifierGroupId: "00000000-0000-4000-8000-000000000001",
          modifierGroupOptionId: "00000000-0000-4000-8000-000000000002",
          quantity: 1,
        },
      ],
      bundleSelections: [],
    };
    const presentation = resolveCartLinePresentation(line, lookups);
    expect(presentation.modifiers[0]?.stale).toBe(true);
    expect(presentation.modifiers[0]?.optionName).toBeNull();
    expect(STALE_MODIFIER_OPTION_LABEL).toBe(
      "Previously selected option is no longer available",
    );
    expect(presentation.editEligible).toBe(false);
  });

  it("converts persisted bundle selections to update input without server ids", () => {
    const converted = cartBundleSelectionsToInput([
      {
        id: "bundle-child-id",
        bundleGroupOptionId: "bundle-opt-1",
        quantity: 1,
        modifiers: [
          {
            variantModifierGroupId: bindingId,
            modifierGroupOptionId: optionPaid,
            quantity: 1,
          },
        ],
      },
    ]);
    expect(converted).toEqual([
      {
        bundleGroupOptionId: "bundle-opt-1",
        quantity: 1,
        modifiers: [
          {
            variantModifierGroupId: bindingId,
            modifierGroupOptionId: optionPaid,
            quantity: 1,
          },
        ],
      },
    ]);
    expect(converted[0]).not.toHaveProperty("id");
  });

  it("converts cart modifiers to canonical input shape", () => {
    expect(
      cartModifiersToInput([
        { variantModifierGroupId: bindingId, modifierGroupOptionId: optionPaid, quantity: 2 },
      ]),
    ).toEqual([
      { variantModifierGroupId: bindingId, modifierGroupOptionId: optionPaid, quantity: 2 },
    ]);
  });
});
