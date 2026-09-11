/**
 * Menu presentation subdomain (IMP-013 / IMP-036F F3A).
 *
 * Soft lifecycle only. Active graph is fail-closed. No public HTTP surface.
 * Customer truth: ACTIVE Menu → effective MenuVersion graph only.
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
  assertMenuGraphReady,
  assertNoActiveEntriesForProduct,
  assertSectionDepthAllowed,
} from "./validation";

export { insertMenuMutationAuditEvent } from "./audit";
export type { InsertMenuMutationAuditEventInput } from "./audit";

export {
  advanceMenuRevision,
  assertExpectedMenuRevision,
  compareMaterialGraphs,
  ensureDraftMenuVersion,
  loadVersionGraph,
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

export { previewMenuPublication, publishMenuRevision } from "./publish";
export type {
  PreviewMenuPublicationInput,
  PreviewMenuPublicationResult,
  PublishMenuRevisionInput,
  PublishMenuRevisionResult,
} from "./publish";
