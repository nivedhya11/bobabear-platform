/**
 * Typed Admin client for Catalog commercial authoring (IMP-036F F6B).
 * Encodes paths/shapes only — does not resolve commercial truth.
 */
import { adminRequest } from "./http";

export type CatalogLifecycleStatus = "draft" | "active" | "retired";

export type CatalogProductInspection = Readonly<{
  id: string;
  brandId: string;
  code: string;
  productKind: "standard" | "bundle";
  createdAt: string;
  updatedAt: string;
  activatedAt: string | null;
  retiredAt: string | null;
  effectiveContentRevision: string | null;
  draftContentRevision: string;
  draftDiffersFromEffective: boolean;
  effective: Readonly<{ name: string; description: string | null }> | null;
  draft: Readonly<{
    name: string;
    description: string | null;
    lifecycleStatus: CatalogLifecycleStatus;
  }>;
}>;

export type CatalogVariantInspection = Readonly<{
  id: string;
  brandId: string;
  productId: string;
  code: string;
  productKind: "standard" | "bundle";
  effectiveContentRevision: string | null;
  draftContentRevision: string;
  draftDiffersFromEffective: boolean;
  effective: Readonly<{
    name: string;
    description: string | null;
    isDefault: boolean;
    isSelectorVisible: boolean;
  }> | null;
  draft: Readonly<{
    name: string;
    description: string | null;
    isDefault: boolean;
    isSelectorVisible: boolean;
    lifecycleStatus: CatalogLifecycleStatus;
  }>;
}>;

export type CatalogModifierGroupInspection = Readonly<{
  id: string;
  brandId: string;
  code: string;
  draftContentRevision: string;
  draft: Readonly<{ name: string; description: string | null; lifecycleStatus: CatalogLifecycleStatus }>;
  effective: Readonly<{ name: string; description: string | null }> | null;
}>;

function brandCatalog(brandId: string) {
  return `/api/admin/v1/brands/${brandId}/catalog`;
}

export function fetchCatalogContentRevision(brandId: string) {
  return adminRequest<{ ok: true; contentRevision: string }>(
    `${brandCatalog(brandId)}/content-revision`,
  );
}

export function listCatalogProducts(brandId: string) {
  return adminRequest<{ ok: true; products: CatalogProductInspection[] }>(
    `${brandCatalog(brandId)}/products`,
  );
}

export function getCatalogProduct(brandId: string, productId: string) {
  return adminRequest<{ ok: true; product: CatalogProductInspection }>(
    `${brandCatalog(brandId)}/products/${productId}`,
  );
}

export type CatalogVariantModifierGroupRow = Readonly<{
  id: string;
  brandId: string;
  variantId: string;
  modifierGroupId: string;
  minTotalQuantity?: number;
  maxTotalQuantity?: number;
  required?: boolean;
  position?: number;
  lifecycleStatus?: CatalogLifecycleStatus;
}>;

export type CatalogModifierOptionRow = Readonly<{
  id: string;
  brandId: string;
  code: string;
  draft?: Readonly<{ name: string; description: string | null; lifecycleStatus: CatalogLifecycleStatus }>;
}>;

export type CatalogModifierGroupOptionRow = Readonly<{
  id: string;
  brandId: string;
  modifierGroupId: string;
  modifierOptionId: string;
  position?: number;
  lifecycleStatus?: CatalogLifecycleStatus;
}>;

export function getCatalogProductGraph(brandId: string, productId: string) {
  return adminRequest<{
    ok: true;
    graph: Readonly<{
      product: CatalogProductInspection;
      variants: CatalogVariantInspection[];
      modifierGroups: CatalogModifierGroupInspection[];
      modifierOptions: CatalogModifierOptionRow[];
      modifierGroupOptions: CatalogModifierGroupOptionRow[];
      variantModifierGroups: CatalogVariantModifierGroupRow[];
    }>;
  }>(`${brandCatalog(brandId)}/products/${productId}/graph`);
}

export function createCatalogProduct(
  brandId: string,
  body: Readonly<{
    code: string;
    name: string;
    productKind: "standard" | "bundle";
    description?: string;
  }>,
) {
  return adminRequest<{ ok: true; product: CatalogProductInspection }>(
    `${brandCatalog(brandId)}/products`,
    { method: "POST", body },
  );
}

export function createCatalogVariant(
  brandId: string,
  productId: string,
  body: Readonly<{
    code: string;
    name: string;
    description?: string;
    isDefault?: boolean;
    isSelectorVisible?: boolean;
  }>,
) {
  return adminRequest<{ ok: true; variant: CatalogVariantInspection }>(
    `${brandCatalog(brandId)}/products/${productId}/variants`,
    { method: "POST", body },
  );
}

export function saveProductContentDraft(
  brandId: string,
  productId: string,
  body: Readonly<{
    expectedContentRevision: string;
    name?: string;
    description?: string | null;
  }>,
) {
  return adminRequest<{
    ok: true;
    draft: Readonly<{
      productId: string;
      draftContentRevision: string;
      name: string;
      description: string | null;
    }>;
  }>(`${brandCatalog(brandId)}/products/${productId}/content-draft`, {
    method: "POST",
    body,
  });
}

export function saveVariantContentDraft(
  brandId: string,
  variantId: string,
  body: Readonly<{
    expectedContentRevision: string;
    name?: string;
    description?: string | null;
    isDefault?: boolean;
    isSelectorVisible?: boolean;
  }>,
) {
  return adminRequest<{
    ok: true;
    draft: Readonly<{
      variantId: string;
      draftContentRevision: string;
      name: string;
      description: string | null;
    }>;
  }>(`${brandCatalog(brandId)}/variants/${variantId}/content-draft`, {
    method: "POST",
    body,
  });
}

export function previewCatalogPublish(brandId: string, productId: string) {
  return adminRequest<{
    ok: true;
    preview: Readonly<{
      brandId: string;
      productId: string;
      productCode: string;
      expectedContentRevision: string;
      wouldChangeCustomerTruth: boolean;
      validationOk: boolean;
      validationBlockers: readonly string[];
      changes: readonly Readonly<{
        entityKind: string;
        entityId: string;
        entityCode?: string;
        changeType: string;
        summary: string;
        draftDiffersFromEffective: boolean;
      }>[];
      operation: "catalog_content_publish";
    }>;
  }>(`${brandCatalog(brandId)}/products/${productId}/consequence-preview`, {
    method: "POST",
    body: {},
  });
}

export function publishCatalogProduct(
  brandId: string,
  productId: string,
  body: Readonly<{ expectedContentRevision: string }>,
) {
  return adminRequest<{
    ok: true;
    publication: Readonly<{
      changed: boolean;
      contentRevision: string;
      previousContentRevision: string;
      productId: string;
      brandId: string;
    }>;
  }>(`${brandCatalog(brandId)}/products/${productId}/publish`, {
    method: "POST",
    body,
  });
}

export function activateCatalogProduct(brandId: string, productId: string) {
  return adminRequest<{ ok: true }>(`${brandCatalog(brandId)}/products/${productId}/activate`, {
    method: "POST",
    body: {},
  });
}

export function retireCatalogProduct(brandId: string, productId: string) {
  return adminRequest<{ ok: true }>(`${brandCatalog(brandId)}/products/${productId}/retire`, {
    method: "POST",
    body: {},
  });
}

export function activateCatalogVariant(brandId: string, variantId: string) {
  return adminRequest<{ ok: true }>(`${brandCatalog(brandId)}/variants/${variantId}/activate`, {
    method: "POST",
    body: {},
  });
}

export function retireCatalogVariant(brandId: string, variantId: string) {
  return adminRequest<{ ok: true }>(`${brandCatalog(brandId)}/variants/${variantId}/retire`, {
    method: "POST",
    body: {},
  });
}

export function listCatalogModifierGroups(brandId: string) {
  return adminRequest<{ ok: true; modifierGroups: CatalogModifierGroupInspection[] }>(
    `${brandCatalog(brandId)}/modifier-groups`,
  );
}

export function associateVariantModifierGroup(
  brandId: string,
  variantId: string,
  body: Readonly<{ modifierGroupId: string; minTotalQuantity?: number; maxTotalQuantity?: number; position?: number }>,
) {
  return adminRequest<{ ok: true }>(
    `${brandCatalog(brandId)}/variants/${variantId}/modifier-groups`,
    { method: "POST", body },
  );
}
