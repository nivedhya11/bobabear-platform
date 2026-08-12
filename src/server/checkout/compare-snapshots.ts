/**
 * Structural typed snapshot equality (IMP-021).
 * Never uses JSON.stringify as authoritative equality.
 */

import type { CheckoutSnapshot } from "../../shared/checkout";
import { destinationsEqual } from "../../shared/checkout";

export function checkoutSnapshotsStructurallyEqual(
  a: CheckoutSnapshot,
  b: CheckoutSnapshot,
): boolean {
  if (a.sourceCartRevision !== b.sourceCartRevision) return false;
  if (a.selectedOutletId !== b.selectedOutletId) return false;
  if (a.currency !== b.currency) return false;
  if (a.manualCouponCode !== b.manualCouponCode) return false;
  if (a.taxInclusionMode !== b.taxInclusionMode) return false;
  if (!destinationsEqual(a.destination, b.destination)) return false;
  if (
    a.basePaise !== b.basePaise ||
    a.modifierAdjustmentsPaise !== b.modifierAdjustmentsPaise ||
    a.bundleAdjustmentsPaise !== b.bundleAdjustmentsPaise ||
    a.chargesPaise !== b.chargesPaise ||
    a.prePromotionSubtotalPaise !== b.prePromotionSubtotalPaise ||
    a.promotionDiscountPaise !== b.promotionDiscountPaise ||
    a.taxablePaise !== b.taxablePaise ||
    a.taxPaise !== b.taxPaise ||
    a.grandTotalPaise !== b.grandTotalPaise
  ) {
    return false;
  }
  if (!linesEqual(a.lines, b.lines)) return false;
  if (!chargesEqual(a.charges, b.charges)) return false;
  if (!promotionEffectsEqual(a.promotionEffects, b.promotionEffects)) return false;
  if (!taxComponentsEqual(a.taxComponents, b.taxComponents)) return false;
  return true;
}

function linesEqual(
  a: CheckoutSnapshot["lines"],
  b: CheckoutSnapshot["lines"],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    if (
      x.sourceCartLineId !== y.sourceCartLineId ||
      x.productId !== y.productId ||
      x.variantId !== y.variantId ||
      x.productName !== y.productName ||
      x.variantName !== y.variantName ||
      x.quantity !== y.quantity ||
      x.sequence !== y.sequence ||
      x.lineBasePaise !== y.lineBasePaise ||
      x.lineModifierAdjustmentsPaise !== y.lineModifierAdjustmentsPaise ||
      x.lineBundleAdjustmentsPaise !== y.lineBundleAdjustmentsPaise ||
      x.lineSubtotalPaise !== y.lineSubtotalPaise ||
      x.linePromotionDiscountPaise !== y.linePromotionDiscountPaise ||
      x.lineTaxablePaise !== y.lineTaxablePaise ||
      x.lineTaxPaise !== y.lineTaxPaise ||
      x.lineTotalPaise !== y.lineTotalPaise
    ) {
      return false;
    }
    if (!modifiersEqual(x.modifiers, y.modifiers)) return false;
    if (!bundlesEqual(x.bundleSelections, y.bundleSelections)) return false;
  }
  return true;
}

function modifiersEqual(
  a: CheckoutSnapshot["lines"][number]["modifiers"],
  b: CheckoutSnapshot["lines"][number]["modifiers"],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    if (
      x.variantModifierGroupId !== y.variantModifierGroupId ||
      x.modifierGroupOptionId !== y.modifierGroupOptionId ||
      x.quantity !== y.quantity ||
      x.groupName !== y.groupName ||
      x.optionName !== y.optionName ||
      x.unitDeltaPaise !== y.unitDeltaPaise
    ) {
      return false;
    }
  }
  return true;
}

function bundlesEqual(
  a: CheckoutSnapshot["lines"][number]["bundleSelections"],
  b: CheckoutSnapshot["lines"][number]["bundleSelections"],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    if (
      x.bundleGroupOptionId !== y.bundleGroupOptionId ||
      x.selectedVariantId !== y.selectedVariantId ||
      x.quantity !== y.quantity ||
      x.groupName !== y.groupName ||
      x.optionName !== y.optionName ||
      x.variantName !== y.variantName ||
      x.unitDeltaPaise !== y.unitDeltaPaise
    ) {
      return false;
    }
    if (!modifiersEqual(x.modifiers, y.modifiers)) return false;
  }
  return true;
}

function chargesEqual(
  a: CheckoutSnapshot["charges"],
  b: CheckoutSnapshot["charges"],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    if (
      x.chargeDefinitionId !== y.chargeDefinitionId ||
      x.chargeCode !== y.chargeCode ||
      x.calculationMode !== y.calculationMode ||
      x.amountPaise !== y.amountPaise ||
      x.name !== y.name ||
      x.sortOrder !== y.sortOrder
    ) {
      return false;
    }
  }
  return true;
}

function promotionEffectsEqual(
  a: CheckoutSnapshot["promotionEffects"],
  b: CheckoutSnapshot["promotionEffects"],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    if (
      x.effectKind !== y.effectKind ||
      x.promotionId !== y.promotionId ||
      x.couponId !== y.couponId ||
      x.promotionCode !== y.promotionCode ||
      x.displayName !== y.displayName ||
      x.triggerType !== y.triggerType ||
      x.stackingPolicy !== y.stackingPolicy ||
      x.componentId !== y.componentId ||
      x.lineId !== y.lineId ||
      x.amountPaise !== y.amountPaise ||
      x.realizedDiscountPaise !== y.realizedDiscountPaise ||
      x.rewardVariantId !== y.rewardVariantId ||
      x.rewardUnitId !== y.rewardUnitId ||
      x.rewardQuantity !== y.rewardQuantity ||
      x.rewardBasePaise !== y.rewardBasePaise ||
      x.sortOrder !== y.sortOrder
    ) {
      return false;
    }
  }
  return true;
}

function taxComponentsEqual(
  a: CheckoutSnapshot["taxComponents"],
  b: CheckoutSnapshot["taxComponents"],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    if (
      x.targetContext !== y.targetContext ||
      x.taxType !== y.taxType ||
      x.rateBps !== y.rateBps ||
      x.taxableAmountPaise !== y.taxableAmountPaise ||
      x.taxAmountPaise !== y.taxAmountPaise ||
      x.sortOrder !== y.sortOrder
    ) {
      return false;
    }
  }
  return true;
}
