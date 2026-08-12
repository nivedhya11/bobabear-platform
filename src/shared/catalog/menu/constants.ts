/**
 * Browser-safe menu presentation constants (IMP-013).
 *
 * No database access, no secrets. Positions are zero-based within each parent.
 */

import {
  CATALOG_LIFECYCLE_STATUSES,
  type CatalogLifecycleStatus,
} from "../constants";

export const MENU_LIFECYCLE_STATUSES = CATALOG_LIFECYCLE_STATUSES;
export type MenuLifecycleStatus = CatalogLifecycleStatus;

/** Maximum section nesting: root Section + one child Section. */
export const MENU_SECTION_MAX_DEPTH = 2;

export const MENU_CODE_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;
export const MENU_CODE_MIN_LENGTH = 1;
export const MENU_CODE_MAX_LENGTH = 64;

export const MENU_NAME_MAX = {
  menu: 160,
  section: 160,
  entryDisplayName: 160,
} as const;

export const MENU_DESCRIPTION_MAX = {
  section: 2000,
  entryDisplayDescription: 2000,
} as const;

export const MENU_IMAGE_PATH_MAX = 512;

/** Fixed IMP-013 v1 import identity. */
export const EXISTING_MENU_IMPORT_ID = "existing-menu-v1";
export const EXISTING_MENU_IMPORT_VERSION = 1;
export const EXISTING_MENU_MANIFEST_RELATIVE_PATH =
  "data/platform/imports/existing-menu-v1.json";

export const BOBA_BEAR_BRAND_CODE = "boba-bear";
export const BOBA_BEAR_BRAND_NAME = "BOBA Bear";

export const PRIMARY_MENU_CODE = "primary";
export const DEFAULT_VARIANT_CODE = "default";

export function isMenuLifecycleStatus(value: unknown): value is MenuLifecycleStatus {
  return (
    typeof value === "string" &&
    (MENU_LIFECYCLE_STATUSES as readonly string[]).includes(value)
  );
}
