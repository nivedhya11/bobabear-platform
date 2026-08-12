/**
 * Shared catalog constants and pure helpers (IMP-012).
 */

export {
  CATALOG_CODE_MAX_LENGTH,
  CATALOG_CODE_MIN_LENGTH,
  CATALOG_CODE_PATTERN,
  CATALOG_DESCRIPTION_MAX,
  CATALOG_LIFECYCLE_STATUSES,
  CATALOG_NAME_MAX,
  CATALOG_QUANTITY_MAX,
  DIETARY_TAG_KINDS,
  PRODUCT_KINDS,
  isCatalogLifecycleStatus,
  isDietaryTagKind,
  isModifierGroupRequired,
  isProductKind,
} from "./constants";
export type {
  CatalogLifecycleStatus,
  DietaryTagKind,
  ProductKind,
} from "./constants";

export { deriveBundleDietaryInputs } from "./dietary-derivation";
export type {
  BundleDietaryDerivation,
  DeriveBundleDietaryInputsArgs,
  DietaryTagRef,
} from "./dietary-derivation";

export {
  BOBA_BEAR_BRAND_CODE,
  BOBA_BEAR_BRAND_NAME,
  DEFAULT_VARIANT_CODE,
  EXISTING_MENU_IMPORT_ID,
  EXISTING_MENU_IMPORT_VERSION,
  EXISTING_MENU_MANIFEST_RELATIVE_PATH,
  MENU_CODE_MAX_LENGTH,
  MENU_CODE_MIN_LENGTH,
  MENU_CODE_PATTERN,
  MENU_DESCRIPTION_MAX,
  MENU_IMAGE_PATH_MAX,
  MENU_LIFECYCLE_STATUSES,
  MENU_NAME_MAX,
  MENU_SAFE_ERROR_CODES,
  MENU_SECTION_MAX_DEPTH,
  PRIMARY_MENU_CODE,
  isMenuLifecycleStatus,
} from "./menu";
export type { MenuLifecycleStatus, MenuSafeErrorCode } from "./menu";
