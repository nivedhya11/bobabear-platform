/**
 * Shared Cart value types (IMP-020).
 *
 * Cart persistence stores purchase intent only — never price, tax,
 * outlet, serviceability, or availability authority.
 */

import type {
  CartEvaluationStatus,
  CartLineProblemCode,
  CartReconciliationResolution,
} from "./constants";

export type CartOwnerMode = "customer" | "guest";

export type CartModifierSelection = Readonly<{
  variantModifierGroupId: string;
  modifierGroupOptionId: string;
  quantity: number;
}>;

export type CartBundleModifierSelection = Readonly<{
  variantModifierGroupId: string;
  modifierGroupOptionId: string;
  quantity: number;
}>;

export type CartBundleSelection = Readonly<{
  id: string;
  bundleGroupOptionId: string;
  quantity: number;
  modifiers: readonly CartBundleModifierSelection[];
}>;

export type CartLine = Readonly<{
  id: string;
  variantId: string;
  quantity: number;
  modifiers: readonly CartModifierSelection[];
  bundleSelections: readonly CartBundleSelection[];
}>;

export type Cart = Readonly<{
  id: string;
  brandId: string;
  ownerMode: CartOwnerMode;
  revision: bigint;
  manualCouponCode: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lines: readonly CartLine[];
}>;

/** Guest creation may return the raw bearer token exactly once. */
export type CartMutationResult = Readonly<{
  cart: Cart;
  /** Present only when a new guest Cart was created in this mutation. */
  guestToken?: string;
}>;

export type CartModifierSelectionInput = Readonly<{
  variantModifierGroupId: string;
  modifierGroupOptionId: string;
  quantity: number;
}>;

export type CartBundleSelectionInput = Readonly<{
  bundleGroupOptionId: string;
  quantity: number;
  modifiers?: readonly CartModifierSelectionInput[];
}>;

export type CartLineConfigurationInput = Readonly<{
  modifiers?: readonly CartModifierSelectionInput[];
  bundleSelections?: readonly CartBundleSelectionInput[];
}>;

export type CanonicalCartModifierSelection = Readonly<{
  variantModifierGroupId: string;
  modifierGroupOptionId: string;
  quantity: number;
}>;

export type CanonicalCartBundleSelection = Readonly<{
  bundleGroupOptionId: string;
  quantity: number;
  modifiers: readonly CanonicalCartModifierSelection[];
}>;

/** Quantity is not part of configuration identity / coalescing. */
export type CanonicalCartLineConfiguration = Readonly<{
  variantId: string;
  modifiers: readonly CanonicalCartModifierSelection[];
  bundleSelections: readonly CanonicalCartBundleSelection[];
}>;

export type CartLineProblem = Readonly<{
  cartLineId: string;
  code: CartLineProblemCode;
}>;

export type CartEvaluationResult = Readonly<{
  cartId: string;
  cartRevision: bigint;
  evaluatedAt: Date;
  status: CartEvaluationStatus;
  selectedOutletId?: string;
  problems?: readonly CartLineProblem[];
  /** Present only when status is COMPLETE — ephemeral quote authority. */
  quote?: unknown;
  serviceabilityReason?: string;
}>;

export type CartPolicy = Readonly<{
  /**
   * Guest Cart inactivity TTL in milliseconds. Required for any material
   * guest mutation. Must be a positive finite number — fail closed otherwise.
   * Not an environment variable in this slice; pass explicitly.
   */
  guestCartTtlMs?: number;
}>;

export type CartReconciliationConflict = Readonly<{
  code: "CART_RECONCILIATION_CONFLICT";
  resolutionOptions: readonly CartReconciliationResolution[];
}>;
