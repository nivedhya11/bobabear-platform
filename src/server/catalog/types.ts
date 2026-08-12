/**
 * Catalog domain types and command inputs (IMP-012).
 */
import type {
  CatalogLifecycleStatus,
  DietaryTagKind,
  ProductKind,
} from "../../shared/catalog";

export type CatalogProduct = Readonly<{
  id: string;
  brandId: string;
  code: string;
  name: string;
  description: string | null;
  productKind: ProductKind;
  lifecycleStatus: CatalogLifecycleStatus;
  createdAt: Date;
  updatedAt: Date;
  activatedAt: Date | null;
  retiredAt: Date | null;
}>;

export type CatalogVariant = Readonly<{
  id: string;
  brandId: string;
  productId: string;
  productKind: ProductKind;
  code: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isSelectorVisible: boolean;
  lifecycleStatus: CatalogLifecycleStatus;
  createdAt: Date;
  updatedAt: Date;
  activatedAt: Date | null;
  retiredAt: Date | null;
}>;

export type CatalogModifierGroup = Readonly<{
  id: string;
  brandId: string;
  code: string;
  name: string;
  description: string | null;
  lifecycleStatus: CatalogLifecycleStatus;
  createdAt: Date;
  updatedAt: Date;
  activatedAt: Date | null;
  retiredAt: Date | null;
}>;

export type CatalogModifierOption = Readonly<{
  id: string;
  brandId: string;
  code: string;
  name: string;
  description: string | null;
  lifecycleStatus: CatalogLifecycleStatus;
  createdAt: Date;
  updatedAt: Date;
  activatedAt: Date | null;
  retiredAt: Date | null;
}>;

export type CatalogModifierGroupOption = Readonly<{
  id: string;
  brandId: string;
  modifierGroupId: string;
  modifierOptionId: string;
  minQuantity: number;
  maxQuantity: number;
  defaultQuantity: number;
  position: number;
  lifecycleStatus: CatalogLifecycleStatus;
  createdAt: Date;
  updatedAt: Date;
  activatedAt: Date | null;
  retiredAt: Date | null;
}>;

export type CatalogVariantModifierGroup = Readonly<{
  id: string;
  brandId: string;
  variantId: string;
  modifierGroupId: string;
  minTotalQuantity: number;
  maxTotalQuantity: number;
  /** Derived: minTotalQuantity > 0. */
  required: boolean;
  position: number;
  lifecycleStatus: CatalogLifecycleStatus;
  createdAt: Date;
  updatedAt: Date;
  activatedAt: Date | null;
  retiredAt: Date | null;
}>;

export type CatalogBundleGroup = Readonly<{
  id: string;
  brandId: string;
  bundleVariantId: string;
  parentProductKind: "bundle";
  code: string;
  name: string;
  minSelections: number;
  maxSelections: number;
  position: number;
  lifecycleStatus: CatalogLifecycleStatus;
  createdAt: Date;
  updatedAt: Date;
  activatedAt: Date | null;
  retiredAt: Date | null;
}>;

export type CatalogBundleGroupOption = Readonly<{
  id: string;
  brandId: string;
  bundleGroupId: string;
  componentVariantId: string;
  componentProductKind: "standard";
  quantity: number;
  isDefault: boolean;
  position: number;
  lifecycleStatus: CatalogLifecycleStatus;
  createdAt: Date;
  updatedAt: Date;
  activatedAt: Date | null;
  retiredAt: Date | null;
}>;

export type CatalogDietaryTag = Readonly<{
  id: string;
  brandId: string;
  code: string;
  name: string;
  kind: DietaryTagKind;
  lifecycleStatus: CatalogLifecycleStatus;
  createdAt: Date;
  updatedAt: Date;
  activatedAt: Date | null;
  retiredAt: Date | null;
}>;

export type CatalogDietaryAssignment = Readonly<{
  id: string;
  brandId: string;
  targetType: "variant" | "modifier_option";
  targetId: string;
  dietaryTagId: string;
  assignedAt: Date;
  retiredAt: Date | null;
}>;

export type CatalogProductGraph = Readonly<{
  product: CatalogProduct;
  variants: readonly CatalogVariant[];
  modifierGroups: readonly CatalogModifierGroup[];
  modifierOptions: readonly CatalogModifierOption[];
  modifierGroupOptions: readonly CatalogModifierGroupOption[];
  variantModifierGroups: readonly CatalogVariantModifierGroup[];
  bundleGroups: readonly CatalogBundleGroup[];
  bundleGroupOptions: readonly CatalogBundleGroupOption[];
  dietaryTags: readonly CatalogDietaryTag[];
  variantDietaryTags: readonly CatalogDietaryAssignment[];
  modifierOptionDietaryTags: readonly CatalogDietaryAssignment[];
}>;

// --- Command inputs ---

export type CreateProductInput = Readonly<{
  actor: unknown;
  brandId: string;
  code: string;
  name: string;
  description?: string | null;
  productKind: ProductKind;
}>;

export type UpdateProductInput = Readonly<{
  actor: unknown;
  productId: string;
  name?: string;
  description?: string | null;
}>;

export type ProductLifecycleInput = Readonly<{
  actor: unknown;
  productId: string;
}>;

export type CreateVariantInput = Readonly<{
  actor: unknown;
  productId: string;
  code: string;
  name: string;
  description?: string | null;
  isDefault?: boolean;
  isSelectorVisible?: boolean;
}>;

export type UpdateVariantInput = Readonly<{
  actor: unknown;
  variantId: string;
  name?: string;
  description?: string | null;
  isDefault?: boolean;
  isSelectorVisible?: boolean;
}>;

export type VariantLifecycleInput = Readonly<{
  actor: unknown;
  variantId: string;
}>;

export type CreateModifierGroupInput = Readonly<{
  actor: unknown;
  brandId: string;
  code: string;
  name: string;
  description?: string | null;
}>;

export type UpdateModifierGroupInput = Readonly<{
  actor: unknown;
  modifierGroupId: string;
  name?: string;
  description?: string | null;
}>;

export type ModifierGroupLifecycleInput = Readonly<{
  actor: unknown;
  modifierGroupId: string;
}>;

export type CreateModifierOptionInput = Readonly<{
  actor: unknown;
  brandId: string;
  code: string;
  name: string;
  description?: string | null;
}>;

export type UpdateModifierOptionInput = Readonly<{
  actor: unknown;
  modifierOptionId: string;
  name?: string;
  description?: string | null;
}>;

export type ModifierOptionLifecycleInput = Readonly<{
  actor: unknown;
  modifierOptionId: string;
}>;

export type AddModifierOptionToGroupInput = Readonly<{
  actor: unknown;
  modifierGroupId: string;
  modifierOptionId: string;
  minQuantity?: number;
  maxQuantity: number;
  defaultQuantity?: number;
  position?: number;
}>;

export type UpdateModifierGroupOptionInput = Readonly<{
  actor: unknown;
  modifierGroupOptionId: string;
  minQuantity?: number;
  maxQuantity?: number;
  defaultQuantity?: number;
  position?: number;
}>;

export type ModifierGroupOptionLifecycleInput = Readonly<{
  actor: unknown;
  modifierGroupOptionId: string;
}>;

export type ApplyModifierGroupToVariantInput = Readonly<{
  actor: unknown;
  variantId: string;
  modifierGroupId: string;
  minTotalQuantity?: number;
  maxTotalQuantity: number;
  position?: number;
}>;

export type UpdateVariantModifierGroupInput = Readonly<{
  actor: unknown;
  variantModifierGroupId: string;
  minTotalQuantity?: number;
  maxTotalQuantity?: number;
  position?: number;
}>;

export type VariantModifierGroupLifecycleInput = Readonly<{
  actor: unknown;
  variantModifierGroupId: string;
}>;

export type CreateBundleGroupInput = Readonly<{
  actor: unknown;
  bundleVariantId: string;
  code: string;
  name: string;
  minSelections?: number;
  maxSelections: number;
  position?: number;
}>;

export type UpdateBundleGroupInput = Readonly<{
  actor: unknown;
  bundleGroupId: string;
  name?: string;
  minSelections?: number;
  maxSelections?: number;
  position?: number;
}>;

export type BundleGroupLifecycleInput = Readonly<{
  actor: unknown;
  bundleGroupId: string;
}>;

export type AddBundleOptionInput = Readonly<{
  actor: unknown;
  bundleGroupId: string;
  componentVariantId: string;
  quantity?: number;
  isDefault?: boolean;
  position?: number;
}>;

export type UpdateBundleOptionInput = Readonly<{
  actor: unknown;
  bundleGroupOptionId: string;
  quantity?: number;
  isDefault?: boolean;
  position?: number;
}>;

export type BundleOptionLifecycleInput = Readonly<{
  actor: unknown;
  bundleGroupOptionId: string;
}>;

export type CreateDietaryTagInput = Readonly<{
  actor: unknown;
  brandId: string;
  code: string;
  name: string;
  kind: DietaryTagKind;
}>;

export type UpdateDietaryTagInput = Readonly<{
  actor: unknown;
  dietaryTagId: string;
  name?: string;
}>;

export type DietaryTagLifecycleInput = Readonly<{
  actor: unknown;
  dietaryTagId: string;
}>;

export type AssignDietaryTagInput = Readonly<{
  actor: unknown;
  dietaryTagId: string;
  targetType: "variant" | "modifier_option";
  targetId: string;
}>;

export type RetireDietaryAssignmentInput = Readonly<{
  actor: unknown;
  targetType: "variant" | "modifier_option";
  assignmentId: string;
}>;

export type CatalogReadInput = Readonly<{
  actor: unknown;
  productId: string;
}>;
