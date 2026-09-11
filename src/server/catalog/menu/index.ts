/**
 * Menu presentation subdomain (IMP-013 / IMP-036F F3A / F3B).
 *
 * Soft lifecycle only. Active graph is fail-closed.
 * Customer truth: ACTIVE Menu → effective MenuVersion graph only.
 * Admin HTTP transport lives under operations `/api/admin/v1/brands/{brandId}/menus/*`.
 */
import "server-only";

export { requireMenuManage, requireMenuRead } from "./authorize-menu";

export {
  MenuConflictError,
  MenuInvalidStateError,
  MenuNotFoundError,
  MenuValidationError,
} from "./errors";

export type {
  CreateMenuEntryInput,
  CreateMenuInput,
  CreateMenuSectionInput,
  Menu,
  MenuEntry,
  MenuEntryLifecycleInput,
  MenuGraph,
  MenuLifecycleInput,
  MenuReadInput,
  MenuSection,
  MenuSectionLifecycleInput,
  MenuVersion,
  MoveMenuEntryInput,
  ReorderMenuEntriesInput,
  ReorderMenuSectionsInput,
  UpdateMenuEntryDisplayInput,
  UpdateMenuSectionInput,
} from "./types";

export { activateMenu, createMenu, findMenuById, retireMenu } from "./menus";

export {
  activateMenuSection,
  createMenuSection,
  findMenuSectionById,
  retireMenuSection,
} from "./sections";

export {
  activateMenuEntry,
  createMenuEntry,
  findMenuEntryById,
  retireMenuEntry,
} from "./entries";

export { effectiveEntryDisplay, getMenuGraph } from "./reads";

export {
  getBrandMenuInspection,
  listBrandMenus,
} from "./inspection";
export type {
  MenuInspection,
  MenuInspectionEntry,
  MenuInspectionSection,
  MenuInspectionVersionGraph,
  MenuListItem,
} from "./inspection";

export {
  assertMenuGraphReady,
  assertNoActiveEntriesForProduct,
  assertSectionDepthAllowed,
} from "./validation";

export { insertMenuMutationAuditEvent } from "./audit";
export type { InsertMenuMutationAuditEventInput } from "./audit";

export {
  advanceMenuRevision,
  assertExpectedMenuRevision,
  beginMaterialMenuDraftMutation,
  compareMaterialGraphs,
  ensureDraftMenuVersion,
  loadVersionGraph,
  lockBrandForUpdate,
  lockBrandMenusForUpdate,
  lockMenuForUpdate,
  materialGraphFingerprint,
  parseExpectedMenuRevision,
} from "./versions";

export {
  moveMenuEntry,
  reorderMenuEntries,
  reorderMenuSections,
  updateMenuEntryDisplay,
  updateMenuSection,
} from "./draft";

export {
  diffMenuPublicationChanges,
  previewMenuPublication,
  publishMenuRevision,
  validateMenuPublication,
} from "./publish";
export type {
  MenuPublicationActiveMenuEffect,
  MenuPublicationChanges,
  MenuPublicationEntryChanges,
  MenuPublicationSectionChanges,
  PreviewMenuPublicationInput,
  PreviewMenuPublicationResult,
  PublishMenuRevisionInput,
  PublishMenuRevisionResult,
} from "./publish";
