/**
 * Map persisted Cart line rows into canonical configuration (IMP-020).
 */

import {
  canonicalizeLineConfiguration,
  type CanonicalCartLineConfiguration,
  type CartBundleSelection,
  type CartLine,
  type CartModifierSelection,
} from "../../shared/cart";

export function cartLineToCanonicalConfiguration(
  line: Pick<CartLine, "variantId" | "modifiers" | "bundleSelections">,
): CanonicalCartLineConfiguration {
  return canonicalizeLineConfiguration(line.variantId, {
    modifiers: line.modifiers.map((m: CartModifierSelection) => ({
      variantModifierGroupId: m.variantModifierGroupId,
      modifierGroupOptionId: m.modifierGroupOptionId,
      quantity: m.quantity,
    })),
    bundleSelections: line.bundleSelections.map((b: CartBundleSelection) => ({
      bundleGroupOptionId: b.bundleGroupOptionId,
      quantity: b.quantity,
      modifiers: b.modifiers.map((m) => ({
        variantModifierGroupId: m.variantModifierGroupId,
        modifierGroupOptionId: m.modifierGroupOptionId,
        quantity: m.quantity,
      })),
    })),
  });
}
