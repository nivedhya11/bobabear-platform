/**
 * Fixed existing-menu-v1 manifest contract (IMP-013).
 */
import {
  BOBA_BEAR_BRAND_CODE,
  BOBA_BEAR_BRAND_NAME,
  DEFAULT_VARIANT_CODE,
  EXISTING_MENU_IMPORT_ID,
  EXISTING_MENU_IMPORT_VERSION,
  PRIMARY_MENU_CODE,
} from "../../../shared/catalog/menu";

export type ManifestBrand = Readonly<{
  id: string;
  code: typeof BOBA_BEAR_BRAND_CODE;
  name: typeof BOBA_BEAR_BRAND_NAME;
}>;

export type ManifestProduct = Readonly<{
  id: string;
  code: string;
  name: string;
  description: string;
  product_kind: "standard";
  source_key: string;
  variant: Readonly<{
    id: string;
    code: typeof DEFAULT_VARIANT_CODE;
    is_default: true;
    is_selector_visible: false;
  }>;
}>;

export type ManifestSection = Readonly<{
  id: string;
  code: string;
  name: string;
  description: null;
  parent_section_id: string | null;
  position: number;
  source_key: string;
}>;

export type ManifestEntry = Readonly<{
  id: string;
  section_id: string;
  product_id: string;
  display_name: null;
  display_description: null;
  image_path: string;
  position: number;
  source_key: string;
}>;

export type ExistingMenuV1Manifest = Readonly<{
  import_id: typeof EXISTING_MENU_IMPORT_ID;
  version: typeof EXISTING_MENU_IMPORT_VERSION;
  source_inventory_sha256: string;
  brand: ManifestBrand;
  menu: Readonly<{
    id: string;
    code: typeof PRIMARY_MENU_CODE;
    name: string;
  }>;
  sections: readonly ManifestSection[];
  products: readonly ManifestProduct[];
  entries: readonly ManifestEntry[];
  /** Explicit zero counts for founder-lock proof. */
  expected_zeros: Readonly<{
    multi_variant_products: 0;
    modifier_groups: 0;
    modifier_options: 0;
    bundle_products: 0;
    bundle_groups: 0;
    bundle_options: 0;
    dietary_assignments: 0;
  }>;
}>;
