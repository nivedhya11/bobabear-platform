/**
 * Browser-safe ordering-catalog projection types (IMP-025).
 *
 * Identity authority remains the existing-menu-v1 import manifest.
 * Presentation fields are projected for ordering UX only.
 */

export type OrderingCatalogSection = Readonly<{
  id: string;
  sourceKey: string;
  name: string;
  parentSectionId: string | null;
  position: number;
}>;

export type OrderingCatalogItem = Readonly<{
  sourceKey: string;
  productId: string;
  variantId: string;
  sectionId: string;
  name: string;
  description: string;
  imagePath: string;
  /** Marketing/presentation rupees from menu.json — not commercial authority. */
  presentationPriceRupees: number;
  tags: readonly string[];
  categorySlug: string;
  subcategoryName: string;
  position: number;
}>;

export type OrderingCatalog = Readonly<{
  brandId: string;
  brandCode: string;
  importId: string;
  importVersion: number;
  sourceInventorySha256: string;
  sections: readonly OrderingCatalogSection[];
  items: readonly OrderingCatalogItem[];
}>;
