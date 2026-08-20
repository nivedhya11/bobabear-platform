/**
 * Fixed IMP-028C modifier bootstrap identities (Slice 4).
 *
 * Browser-safe constants only — no secrets, no database access.
 * Catalog modifier database IDs are resolved at bootstrap time by semantic code.
 */

export const IMP028C_MODIFIERS_IMPORT_ID = "imp028c-hong-kong-modifiers-v1";
export const IMP028C_MODIFIERS_IMPORT_VERSION = 1;
export const IMP028C_MODIFIERS_ARTIFACT_RELATIVE_PATH =
  "data/platform/catalog/imp028c-hong-kong-modifiers-v1.json";

/** Bootstrap-owned modifier group semantic code. */
export const IMP028C_MODIFIER_GROUP_CODE = "imp028c-toppings-extras" as const;
export const IMP028C_CLASSIC_BOBA_OPTION_CODE = "imp028c-classic-boba" as const;
export const IMP028C_EXTRA_BOBA_OPTION_CODE = "imp028c-extra-boba" as const;
export const IMP028C_GRASS_JELLY_OPTION_CODE = "imp028c-grass-jelly" as const;

export const HONG_KONG_MILK_TEA_PRODUCT_CODE = "hong-kong-milk-tea-boba" as const;
export const HONG_KONG_MILK_TEA_PRODUCT_NAME = "Hong Kong Milk Tea Boba" as const;
export const HONG_KONG_MILK_TEA_VARIANT_CODE = "default" as const;
export const HONG_KONG_MILK_TEA_BASE_PRICE_PAISE = 23_900 as const;

/** Legacy Slice 4 hard-coded UUIDs — bootstrap must not depend on these. */
export const LEGACY_SLICE4_BRAND_ID = "56ff7724-d511-5ef4-b5d5-d629cbfb2388" as const;
export const LEGACY_SLICE4_PRODUCT_ID = "64530ae2-695c-5fca-b173-e36ebb13119d" as const;
export const LEGACY_SLICE4_VARIANT_ID = "afbe2d74-0604-5645-9764-fcd74e4abc70" as const;
export const LEGACY_SLICE4_PRICE_BOOK_ID =
  "a0150001-0000-4000-8000-000000000010" as const;
