/**
 * Safe menu / import outcome codes (IMP-013 / IMP-036F F3A). Browser-safe; no secrets.
 */

export const MENU_SAFE_ERROR_CODES = [
  "validation",
  "not_found",
  "conflict",
  "invalid_state",
  "MENU_STALE_REVISION",
  "SOURCE_DRIFT",
  "IMPORT_CONFLICT",
] as const;

export type MenuSafeErrorCode = (typeof MENU_SAFE_ERROR_CODES)[number];
