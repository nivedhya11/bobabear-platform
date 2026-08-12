/**
 * Menu presentation subdomain (IMP-013).
 *
 * Soft lifecycle only. Active graph is fail-closed. No public HTTP surface.
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
