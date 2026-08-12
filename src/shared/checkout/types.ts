/**
 * Shared Checkout value types (IMP-021).
 */

import type {
  CheckoutDestinationKind,
  CheckoutPromotionEffectKind,
  CheckoutStatus,
} from "./constants";

export type CheckoutPolicy = Readonly<{
  /**
   * Checkout pre-payment TTL in milliseconds. Required for startCheckout and
   * successful READY rebuilds that refresh expiry. Must be a positive finite
   * number — fail closed otherwise. Not an environment variable in this slice.
   */
  checkoutTtlMs: number;
}>;

export type CheckoutDestinationCoordinates = Readonly<{
  latitude: string;
  longitude: string;
}>;

export type CheckoutDestination = Readonly<{
  destinationKind: CheckoutDestinationKind;
  sourceSavedAddressId: string | null;
  recipientName: string;
  recipientPhone: string;
  addressLine1: string;
  addressLine2: string | null;
  landmark: string | null;
  locality: string | null;
  city: string;
  stateCode: string;
  postalCode: string;
  coordinates: CheckoutDestinationCoordinates | null;
  label: string | null;
}>;

export type CheckoutSnapshotModifierSelection = Readonly<{
  variantModifierGroupId: string;
  modifierGroupOptionId: string;
  quantity: number;
  groupName: string;
  optionName: string;
  unitDeltaPaise: bigint;
}>;

export type CheckoutSnapshotBundleModifierSelection = Readonly<{
  variantModifierGroupId: string;
  modifierGroupOptionId: string;
  quantity: number;
  groupName: string;
  optionName: string;
  unitDeltaPaise: bigint;
}>;

export type CheckoutSnapshotBundleSelection = Readonly<{
  id: string;
  bundleGroupOptionId: string;
  selectedVariantId: string;
  quantity: number;
  groupName: string;
  optionName: string;
  variantName: string;
  unitDeltaPaise: bigint;
  modifiers: readonly CheckoutSnapshotBundleModifierSelection[];
}>;

export type CheckoutSnapshotLine = Readonly<{
  id: string;
  sourceCartLineId: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  quantity: number;
  lineBasePaise: bigint;
  lineModifierAdjustmentsPaise: bigint;
  lineBundleAdjustmentsPaise: bigint;
  lineSubtotalPaise: bigint;
  linePromotionDiscountPaise: bigint;
  lineTaxablePaise: bigint;
  lineTaxPaise: bigint;
  lineTotalPaise: bigint;
  sequence: number;
  modifiers: readonly CheckoutSnapshotModifierSelection[];
  bundleSelections: readonly CheckoutSnapshotBundleSelection[];
}>;

export type CheckoutSnapshotCharge = Readonly<{
  id: string;
  chargeDefinitionId: string;
  chargeCode: "packaging" | "delivery";
  calculationMode: "fixed_per_order" | "per_item_quantity";
  amountPaise: bigint;
  name: string;
  sortOrder: number;
}>;

export type CheckoutSnapshotPromotionEffect = Readonly<{
  id: string;
  effectKind: CheckoutPromotionEffectKind;
  promotionId: string;
  couponId: string | null;
  promotionCode: string;
  displayName: string;
  triggerType: string | null;
  stackingPolicy: string | null;
  componentId: string | null;
  lineId: string | null;
  amountPaise: bigint | null;
  realizedDiscountPaise: bigint | null;
  rewardVariantId: string | null;
  rewardUnitId: string | null;
  rewardQuantity: number | null;
  rewardBasePaise: bigint | null;
  sortOrder: number;
}>;

export type CheckoutSnapshotTaxComponent = Readonly<{
  id: string;
  targetContext: string;
  taxType: string;
  rateBps: number;
  taxableAmountPaise: bigint;
  taxAmountPaise: bigint;
  sortOrder: number;
}>;

export type CheckoutSnapshot = Readonly<{
  id: string;
  checkoutId: string;
  checkoutRevision: bigint;
  sourceCartRevision: bigint;
  selectedOutletId: string;
  evaluatedAt: Date;
  serviceabilityEvaluatedAt: Date;
  currency: "INR";
  manualCouponCode: string | null;
  destination: CheckoutDestination;
  basePaise: bigint;
  modifierAdjustmentsPaise: bigint;
  bundleAdjustmentsPaise: bigint;
  chargesPaise: bigint;
  prePromotionSubtotalPaise: bigint;
  promotionDiscountPaise: bigint;
  taxablePaise: bigint;
  taxPaise: bigint;
  grandTotalPaise: bigint;
  taxInclusionMode: "exclusive" | "inclusive";
  createdAt: Date;
  lines: readonly CheckoutSnapshotLine[];
  charges: readonly CheckoutSnapshotCharge[];
  promotionEffects: readonly CheckoutSnapshotPromotionEffect[];
  taxComponents: readonly CheckoutSnapshotTaxComponent[];
}>;

export type Checkout = Readonly<{
  id: string;
  customerAuthUserId: string;
  brandId: string;
  cartId: string;
  sourceCartRevision: bigint;
  revision: bigint;
  status: CheckoutStatus;
  expiresAt: Date;
  activeSnapshotId: string | null;
  createdAt: Date;
  updatedAt: Date;
  destination: CheckoutDestination | null;
  activeSnapshot: CheckoutSnapshot | null;
}>;

export type CheckoutEvaluationSuccess = Readonly<{
  checkout: Checkout;
  snapshot: CheckoutSnapshot;
}>;

export type SavedAddressDestinationInput = Readonly<{
  kind: "SAVED_ADDRESS";
  savedAddressId: string;
}>;

export type OneTimeAddressDestinationInput = Readonly<{
  kind: "ONE_TIME_ADDRESS";
  recipientName: string;
  recipientPhone: string;
  addressLine1: string;
  addressLine2?: string | null;
  landmark?: string | null;
  locality?: string | null;
  city: string;
  stateCode: string;
  postalCode: string;
  coordinates?: CheckoutDestinationCoordinates | null;
  label?: string | null;
}>;

export type CheckoutDestinationInput =
  | SavedAddressDestinationInput
  | OneTimeAddressDestinationInput;
