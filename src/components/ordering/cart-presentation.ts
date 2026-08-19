/**
 * Cart presentation helpers — Customer Menu projection for display only, not payable authority.
 */

import type { CommerceCart, CommerceCartLine } from "@/lib/customer-commerce";
import type {
  CartBundleSelection,
  CartBundleSelectionInput,
  CartModifierSelection,
  CartModifierSelectionInput,
} from "@/shared/cart/types";
import type {
  CustomerMenuItem,
  CustomerMenuModifierGroup,
  CustomerMenuModifierOption,
  CustomerMenuProjection,
} from "@/shared/customer-menu/types";

export const STALE_MODIFIER_OPTION_LABEL =
  "Previously selected option is no longer available";

export type CartPresentationItem = Readonly<{
  variantId: string;
  name: string;
  presentationPricePaise: number;
  modifierGroups?: readonly CustomerMenuModifierGroup[];
}>;

export type ResolvedCartModifierPresentation = Readonly<{
  variantModifierGroupId: string;
  modifierGroupOptionId: string;
  quantity: number;
  groupName: string | null;
  optionName: string | null;
  displayPriceDeltaPaise: number | null;
  stale: boolean;
}>;

export type CartLinePresentation = Readonly<{
  lineId: string;
  variantId: string;
  quantity: number;
  itemName: string;
  modifiers: readonly ResolvedCartModifierPresentation[];
  unitPricePaise: number;
  lineTotalPaise: number;
  hasBundleSelections: boolean;
  fullyResolvable: boolean;
  customizable: boolean;
  editEligible: boolean;
}>;

export type CustomerMenuLookups = Readonly<{
  itemByVariant: ReadonlyMap<string, CustomerMenuItem>;
  modifierGroupByBindingId: ReadonlyMap<string, CustomerMenuModifierGroup>;
  modifierOptionByBinding: ReadonlyMap<string, CustomerMenuModifierOption>;
}>;

export function buildCustomerMenuLookups(menu: CustomerMenuProjection): CustomerMenuLookups {
  const itemByVariant = new Map<string, CustomerMenuItem>();
  const modifierGroupByBindingId = new Map<string, CustomerMenuModifierGroup>();
  const modifierOptionByBinding = new Map<string, CustomerMenuModifierOption>();

  for (const item of menu.items) {
    itemByVariant.set(item.variantId, item);
    for (const group of item.modifierGroups ?? []) {
      modifierGroupByBindingId.set(group.variantModifierGroupId, group);
      for (const option of group.options) {
        modifierOptionByBinding.set(
          `${group.variantModifierGroupId}:${option.modifierGroupOptionId}`,
          option,
        );
      }
    }
  }

  return { itemByVariant, modifierGroupByBindingId, modifierOptionByBinding };
}

export function cartBundleSelectionsToInput(
  bundleSelections: readonly CartBundleSelection[],
): readonly CartBundleSelectionInput[] {
  return bundleSelections.map((selection) => ({
    bundleGroupOptionId: selection.bundleGroupOptionId,
    quantity: selection.quantity,
    modifiers: selection.modifiers.map(
      (modifier): CartModifierSelectionInput => ({
        variantModifierGroupId: modifier.variantModifierGroupId,
        modifierGroupOptionId: modifier.modifierGroupOptionId,
        quantity: modifier.quantity,
      }),
    ),
  }));
}

export function cartModifiersToInput(
  modifiers: readonly CartModifierSelection[],
): readonly CartModifierSelectionInput[] {
  return modifiers.map((modifier) => ({
    variantModifierGroupId: modifier.variantModifierGroupId,
    modifierGroupOptionId: modifier.modifierGroupOptionId,
    quantity: modifier.quantity,
  }));
}

function resolveModifierPresentation(
  modifier: CartModifierSelection,
  lookups: CustomerMenuLookups,
): ResolvedCartModifierPresentation {
  const group = lookups.modifierGroupByBindingId.get(modifier.variantModifierGroupId);
  const option = lookups.modifierOptionByBinding.get(
    `${modifier.variantModifierGroupId}:${modifier.modifierGroupOptionId}`,
  );
  const stale = group === undefined || option === undefined;
  return {
    variantModifierGroupId: modifier.variantModifierGroupId,
    modifierGroupOptionId: modifier.modifierGroupOptionId,
    quantity: modifier.quantity,
    groupName: group?.name ?? null,
    optionName: option?.name ?? null,
    displayPriceDeltaPaise: option?.displayPriceDeltaPaise ?? null,
    stale,
  };
}

function modifierDeltaTotalPaise(
  modifiers: readonly ResolvedCartModifierPresentation[],
): number {
  let total = 0;
  for (const modifier of modifiers) {
    if (modifier.stale || modifier.displayPriceDeltaPaise === null) continue;
    total += modifier.displayPriceDeltaPaise * modifier.quantity;
  }
  return total;
}

export function resolveCartLinePresentation(
  line: CommerceCartLine,
  lookups: CustomerMenuLookups,
): CartLinePresentation {
  const item = lookups.itemByVariant.get(line.variantId);
  const itemName = item?.name ?? "Item";
  const modifiers = line.modifiers.map((modifier) =>
    resolveModifierPresentation(modifier, lookups),
  );
  const hasBundleSelections = line.bundleSelections.length > 0;
  const fullyResolvable = modifiers.every((modifier) => !modifier.stale);
  const customizable = (item?.modifierGroups?.length ?? 0) > 0;
  const basePricePaise = item?.displayPricePaise ?? 0;
  const unitPricePaise = hasBundleSelections
    ? basePricePaise
    : basePricePaise + modifierDeltaTotalPaise(modifiers);
  const lineTotalPaise = unitPricePaise * line.quantity;
  const editEligible =
    customizable && fullyResolvable && !hasBundleSelections && line.modifiers.length >= 0;

  return {
    lineId: line.id,
    variantId: line.variantId,
    quantity: line.quantity,
    itemName,
    modifiers,
    unitPricePaise,
    lineTotalPaise,
    hasBundleSelections,
    fullyResolvable,
    customizable,
    editEligible,
  };
}

export function buildCartLinePresentations(
  cart: CommerceCart | null | undefined,
  lookups: CustomerMenuLookups,
): readonly CartLinePresentation[] {
  if (!cart) return [];
  return cart.lines.map((line) => resolveCartLinePresentation(line, lookups));
}

/** @deprecated Prefer buildCustomerMenuLookups + resolveCartLinePresentation. */
export function cartPresentationItemsFromMenu(
  menu: CustomerMenuProjection,
): ReadonlyMap<string, CartPresentationItem> {
  return new Map(
    menu.items.map((item) => [
      item.variantId,
      {
        variantId: item.variantId,
        name: item.name,
        presentationPricePaise: item.displayPricePaise,
        modifierGroups: item.modifierGroups,
      },
    ]),
  );
}

export function cartUnitCount(cart: CommerceCart | null | undefined): number {
  if (!cart) return 0;
  return cart.lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function estimateCartPresentationPaise(
  cart: CommerceCart | null | undefined,
  lookups: CustomerMenuLookups,
): bigint;
/** @deprecated Use Customer Menu lookups instead of legacy item map. */
export function estimateCartPresentationPaise(
  cart: CommerceCart | null | undefined,
  itemsByVariant: ReadonlyMap<string, CartPresentationItem>,
): bigint;
export function estimateCartPresentationPaise(
  cart: CommerceCart | null | undefined,
  lookupsOrItems:
    | CustomerMenuLookups
    | ReadonlyMap<string, CartPresentationItem>,
): bigint {
  if (!cart) return BigInt(0);

  if ("itemByVariant" in lookupsOrItems) {
    let total = BigInt(0);
    for (const line of cart.lines) {
      const presentation = resolveCartLinePresentation(line, lookupsOrItems);
      total += BigInt(presentation.lineTotalPaise);
    }
    return total;
  }

  let total = BigInt(0);
  for (const line of cart.lines) {
    const item = lookupsOrItems.get(line.variantId);
    if (!item) continue;
    total += BigInt(item.presentationPricePaise) * BigInt(line.quantity);
  }
  return total;
}

export function formatPresentationEstimateLabel(paise: bigint): string {
  if (paise <= BigInt(0)) return "Menu prices";
  const hundred = BigInt(100);
  const rupees = paise / hundred;
  const fraction = paise % hundred;
  return `₹${rupees.toString()}.${fraction.toString().padStart(2, "0")} (menu prices)`;
}

export function formatModifierPriceDelta(deltaPaise: number): string | null {
  if (deltaPaise === 0) return null;
  const sign = deltaPaise > 0 ? "+" : "";
  const abs = Math.abs(deltaPaise);
  const rupees = Math.floor(abs / 100);
  const fraction = abs % 100;
  return `${sign}₹${rupees}.${fraction.toString().padStart(2, "0")}`;
}
