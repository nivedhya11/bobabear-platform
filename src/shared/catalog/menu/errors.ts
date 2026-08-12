/**
 * Safe menu / import outcome codes (IMP-013). Browser-safe; no secrets.
 */

export const MENU_SAFE_ERROR_CODES = [
  "validation",
  "not_found",
  "conflict",
  "invalid_state",
  "SOURCE_DRIFT",
  "IMPORT_CONFLICT",
] as const;

export type MenuSafeErrorCode = (typeof MENU_SAFE_ERROR_CODES)[number];
