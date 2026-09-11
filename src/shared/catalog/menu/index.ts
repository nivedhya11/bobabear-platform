/**
 * Shared menu presentation constants (IMP-013 / IMP-036F F3A).
 */

export {
  BOBA_BEAR_BRAND_CODE,
  BOBA_BEAR_BRAND_NAME,
  DEFAULT_VARIANT_CODE,
  EXISTING_MENU_IMPORT_ID,
  EXISTING_MENU_IMPORT_VERSION,
  EXISTING_MENU_MANIFEST_RELATIVE_PATH,
  MENU_AUDIT_ACTIONS,
  MENU_CODE_MAX_LENGTH,
  MENU_CODE_MIN_LENGTH,
  MENU_CODE_PATTERN,
  MENU_DESCRIPTION_MAX,
  MENU_IMAGE_PATH_MAX,
  MENU_LIFECYCLE_STATUSES,
  MENU_NAME_MAX,
  MENU_SECTION_MAX_DEPTH,
  MENU_VERSION_LIFECYCLE_STATUSES,
  PRIMARY_MENU_CODE,
  isMenuAuditAction,
  isMenuLifecycleStatus,
  isMenuVersionLifecycleStatus,
} from "./constants";
export type {
  MenuAuditAction,
  MenuLifecycleStatus,
  MenuVersionLifecycleStatus,
} from "./constants";

export { MENU_SAFE_ERROR_CODES } from "./errors";
export type { MenuSafeErrorCode } from "./errors";
