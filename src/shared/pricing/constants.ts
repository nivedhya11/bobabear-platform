/**
 * Locked technical constants for Pricing / Charges / Tax (IMP-015).
 */

/** Stable system UUIDs seeded by migration 0009 (not business configuration). */
export const TAX_CATEGORY_RESTAURANT_SERVICE_ID =
  "a0150001-0000-4000-8000-000000000001" as const;
export const TAX_POLICY_RESTAURANT_SERVICE_V1_ID =
  "a0150001-0000-4000-8000-000000000002" as const;
export const CHARGE_DEFINITION_PACKAGING_ID =
  "a0150001-0000-4000-8000-000000000003" as const;
export const CHARGE_DEFINITION_DELIVERY_ID =
  "a0150001-0000-4000-8000-000000000004" as const;

/** Fixed Brand Price Book identity for existing-menu pricing bootstrap. */
export const BOOTSTRAP_PRICE_BOOK_ID =
  "a0150001-0000-4000-8000-000000000010" as const;
export const BOOTSTRAP_PRICE_BOOK_CODE = "direct-primary-v1" as const;
export const BOOTSTRAP_PRICE_BOOK_EFFECTIVE_FROM =
  "2026-08-08T00:00:00+05:30" as const;

export const TAX_CATEGORY_RESTAURANT_SERVICE_CODE = "restaurant_service" as const;
export const CHARGE_CODE_PACKAGING = "packaging" as const;
export const CHARGE_CODE_DELIVERY = "delivery" as const;

export const PRICING_SALES_CHANNEL_DIRECT = "direct" as const;
export const PRICING_CURRENCY_INR = "INR" as const;

export const PRICE_BOOK_SCOPE_TYPES = [
  "brand",
  "territory",
  "organization",
  "outlet",
] as const;
export type PriceBookScopeType = (typeof PRICE_BOOK_SCOPE_TYPES)[number];

export const PRICE_BOOK_LIFECYCLE_STATUSES = ["draft", "active", "retired"] as const;
export type PriceBookLifecycleStatus = (typeof PRICE_BOOK_LIFECYCLE_STATUSES)[number];

export const TAX_INCLUSION_MODES = ["exclusive", "inclusive"] as const;
export type TaxInclusionMode = (typeof TAX_INCLUSION_MODES)[number];

export const CHARGE_CALCULATION_MODES = [
  "fixed_per_order",
  "per_item_quantity",
] as const;
export type ChargeCalculationMode = (typeof CHARGE_CALCULATION_MODES)[number];

export const TAX_APPLICABILITIES = ["intra_state", "inter_state"] as const;
export type TaxApplicability = (typeof TAX_APPLICABILITIES)[number];

export const TAX_TYPES = ["cgst", "sgst", "utgst", "igst"] as const;
export type TaxType = (typeof TAX_TYPES)[number];

export const PLACE_OF_SUPPLY_METHODS = ["outlet_performance_location"] as const;
export type PlaceOfSupplyMethod = (typeof PLACE_OF_SUPPLY_METHODS)[number];

export const LEGAL_ENTITY_REGISTRATION_STATUSES = [
  "registered",
  "unregistered",
] as const;
export type LegalEntityRegistrationStatus =
  (typeof LEGAL_ENTITY_REGISTRATION_STATUSES)[number];

/** Indian Union Territory state codes (GST first two digits / ISO-style). */
export const INDIA_UNION_TERRITORY_STATE_CODES = [
  "04", // Chandigarh
  "07", // Delhi
  "26", // Dadra and Nagar Haveli and Daman and Diu (historical codes also handled in resolver)
  "25",
  "31", // Lakshadweep
  "35", // Andaman and Nicobar
  "38", // Ladakh
  "97", // Other Territory
] as const;

export const PRICING_TAX_AUDIT_ACTIONS = [
  "price_book.created",
  "price_book.activated",
  "price_book.retired",
  "pricing.bootstrap_existing_menu",
  "tax_profile.created",
  "tax_profile.retired",
  "outlet_tax_profile.assigned",
  "tax_policy.created",
  "tax_policy.activated",
  "tax_policy.retired",
  "charge_definition.changed",
] as const;
export type PricingTaxAuditAction = (typeof PRICING_TAX_AUDIT_ACTIONS)[number];

export const PRICING_DECISION_CODES = [
  "PRICE_RESOLVED",
  "PRICE_MISSING",
  "MODIFIER_PRICE_MISSING",
  "BUNDLE_OPTION_PRICE_MISSING",
  "OVERRIDE_NOT_PERMITTED",
  "OVERRIDE_OUT_OF_BOUNDS",
  "PRICE_BOOK_OVERLAP",
  "TAX_CONFIGURATION_MISSING",
  "SOURCE_PRICE_INVALID",
  "PRICING_BOOTSTRAP_CONFLICT",
  "SOURCE_DRIFT",
  "DENIED",
  "ERROR",
] as const;
export type PricingDecisionCode = (typeof PRICING_DECISION_CODES)[number];

export const EXISTING_MENU_PRICING_ARTIFACT_RELATIVE_PATH =
  "data/platform/pricing/existing-menu-pricing-v1.json" as const;
