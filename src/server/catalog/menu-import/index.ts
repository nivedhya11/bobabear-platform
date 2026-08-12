/**
 * Existing menu import tooling (IMP-013).
 *
 * Server-only. Fixed manifest only. No public HTTP surface.
 */
import "server-only";

export { buildExistingMenuV1Manifest } from "./build-manifest";
export { computeSourceInventorySha256 } from "./source-digest";
export {
  AUTHORITATIVE_MENU_SOURCE_RELATIVE_PATHS,
  inventoryAuthoritativeMenuSource,
  summarizeInventory,
} from "./source-inventory";
export type { MenuSourceInventory, SourceCard } from "./source-inventory";
export { rejectArbitraryManifestPath, runExistingMenuImport } from "./importer";
export type { ImportResult } from "./importer";
export { verifyExistingMenuImport } from "./verify";
export type { VerifyResult } from "./verify";
export { MenuImportError } from "./validate-manifest";
export type { ExistingMenuV1Manifest } from "./manifest-types";
export { normalizeProductCode, stableUuid } from "./stable-ids";
