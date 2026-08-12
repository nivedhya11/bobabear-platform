/**
 * Public entry point for the Catalog module (IMP-012).
 *
 * Brand-owned canonical food catalog commands and admin reads. Soft
 * lifecycle only — no hard delete. Trusted internal reads do not authorize.
 */
import "server-only";

export {
  CatalogConflictError,
  CatalogInvalidStateError,
  CatalogNotFoundError,
  CatalogValidationError,
} from "./errors";
export type { CatalogErrorCode } from "./errors";

export type {
  AddBundleOptionInput,
  AddModifierOptionToGroupInput,
  ApplyModifierGroupToVariantInput,
  AssignDietaryTagInput,
  BundleGroupLifecycleInput,
  BundleOptionLifecycleInput,
  CatalogBundleGroup,
  CatalogBundleGroupOption,
  CatalogDietaryAssignment,
  CatalogDietaryTag,
  CatalogModifierGroup,
  CatalogModifierGroupOption,
  CatalogModifierOption,
  CatalogProduct,
  CatalogProductGraph,
  CatalogReadInput,
  CatalogVariant,
  CatalogVariantModifierGroup,
  CreateBundleGroupInput,
  CreateDietaryTagInput,
  CreateModifierGroupInput,
  CreateModifierOptionInput,
  CreateProductInput,
  CreateVariantInput,
  DietaryTagLifecycleInput,
  ModifierGroupLifecycleInput,
  ModifierGroupOptionLifecycleInput,
  ModifierOptionLifecycleInput,
  ProductLifecycleInput,
  RetireDietaryAssignmentInput,
  UpdateBundleGroupInput,
  UpdateBundleOptionInput,
  UpdateDietaryTagInput,
  UpdateModifierGroupInput,
  UpdateModifierGroupOptionInput,
  UpdateModifierOptionInput,
  UpdateProductInput,
  UpdateVariantInput,
  UpdateVariantModifierGroupInput,
  VariantLifecycleInput,
  VariantModifierGroupLifecycleInput,
} from "./types";

export {
  activateProduct,
  createProduct,
  findProductById,
  retireProduct,
  updateProduct,
} from "./products";

export {
  activateVariant,
  createVariant,
  findVariantById,
  retireVariant,
  updateVariant,
} from "./variants";

export {
  activateModifierGroup,
  activateModifierGroupOption,
  activateModifierOption,
  activateVariantModifierGroup,
  addModifierOptionToGroup,
  applyModifierGroupToVariant,
  createModifierGroup,
  createModifierOption,
  findModifierGroupById,
  findModifierGroupOptionById,
  findModifierOptionById,
  findVariantModifierGroupById,
  retireModifierGroup,
  retireModifierGroupOption,
  retireModifierOption,
  retireVariantModifierGroup,
  updateModifierGroup,
  updateModifierGroupOption,
  updateModifierOption,
  updateVariantModifierGroup,
} from "./modifiers";

export {
  activateBundleGroup,
  activateBundleOption,
  addBundleOption,
  createBundleGroup,
  findBundleGroupById,
  findBundleGroupOptionById,
  retireBundleGroup,
  retireBundleOption,
  updateBundleGroup,
  updateBundleOption,
} from "./bundles";

export {
  activateDietaryTag,
  assignDietaryTag,
  createDietaryTag,
  findDietaryTagById,
  retireDietaryAssignment,
  retireDietaryTag,
  updateDietaryTag,
} from "./dietary";

export {
  getCatalogProduct,
  getCatalogProductGraph,
  trustedInternalFindProductById,
  validateCatalogProduct,
} from "./reads";

export {
  assertProductGraphReady,
  validateActiveProductGraph,
} from "./validation";

export { requireCatalogManage, requireCatalogRead } from "./authorize-catalog";

export {
  MenuConflictError,
  MenuInvalidStateError,
  MenuNotFoundError,
  MenuValidationError,
  activateMenu,
  activateMenuEntry,
  activateMenuSection,
  assertMenuGraphReady,
  assertNoActiveEntriesForProduct,
  assertSectionDepthAllowed,
  createMenu,
  createMenuEntry,
  createMenuSection,
  effectiveEntryDisplay,
  findMenuById,
  findMenuEntryById,
  findMenuSectionById,
  getMenuGraph,
  requireMenuManage,
  requireMenuRead,
  retireMenu,
  retireMenuEntry,
  retireMenuSection,
} from "./menu";

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
} from "./menu";
