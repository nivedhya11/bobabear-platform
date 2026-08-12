/**
 * Browser-safe catalog constants (IMP-012).
 *
 * No database access, no secrets. Shared by server domain code and tests.
 */

export const CATALOG_LIFECYCLE_STATUSES = ["draft", "active", "retired"] as const;
export type CatalogLifecycleStatus = (typeof CATALOG_LIFECYCLE_STATUSES)[number];

export const PRODUCT_KINDS = ["standard", "bundle"] as const;
export type ProductKind = (typeof PRODUCT_KINDS)[number];

export const DIETARY_TAG_KINDS = ["dietary", "allergen"] as const;
export type DietaryTagKind = (typeof DIETARY_TAG_KINDS)[number];

export const CATALOG_CODE_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;
export const CATALOG_CODE_MIN_LENGTH = 1;
export const CATALOG_CODE_MAX_LENGTH = 64;

export const CATALOG_NAME_MAX = {
  product: 160,
  variant: 120,
  modifierGroup: 160,
  modifierOption: 160,
  bundleGroup: 160,
  dietaryTag: 160,
} as const;

export const CATALOG_DESCRIPTION_MAX = {
  product: 2000,
  variant: 1000,
  modifierGroup: 2000,
  modifierOption: 2000,
} as const;

export const CATALOG_QUANTITY_MAX = 99;

export function isCatalogLifecycleStatus(value: unknown): value is CatalogLifecycleStatus {
  return (
    typeof value === "string" &&
    (CATALOG_LIFECYCLE_STATUSES as readonly string[]).includes(value)
  );
}

export function isProductKind(value: unknown): value is ProductKind {
  return typeof value === "string" && (PRODUCT_KINDS as readonly string[]).includes(value);
}

export function isDietaryTagKind(value: unknown): value is DietaryTagKind {
  return typeof value === "string" && (DIETARY_TAG_KINDS as readonly string[]).includes(value);
}

/** Derived: a modifier group binding is required when min total quantity > 0. */
export function isModifierGroupRequired(minTotalQuantity: number): boolean {
  return minTotalQuantity > 0;
}
