/**
 * IMP-028C modifier bootstrap artifact validation (Slice 4).
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { CATALOG_QUANTITY_MAX } from "../../../shared/catalog";
import {
  BOBA_BEAR_BRAND_CODE,
  EXISTING_MENU_IMPORT_ID,
  EXISTING_MENU_IMPORT_VERSION,
  EXISTING_MENU_MANIFEST_RELATIVE_PATH,
} from "../../../shared/catalog/menu";
import {
  IMP028C_MODIFIERS_ARTIFACT_RELATIVE_PATH,
  IMP028C_MODIFIERS_IMPORT_ID,
  IMP028C_MODIFIERS_IMPORT_VERSION,
} from "../../../shared/catalog/imp028c-modifiers/constants";
import {
  BOOTSTRAP_PRICE_BOOK_CODE,
  PRICE_BOOK_SCOPE_TYPES,
  type PriceBookScopeType,
} from "../../../shared/pricing";
import { assertNonNegativeInt, assertQuantityInRange } from "../assert-role";
import { CatalogValidationError } from "../errors";
import {
  assertSourceDigestMatches,
  MenuImportError,
  validateManifestStructure,
} from "../menu-import/validate-manifest";
import type { ExistingMenuV1Manifest } from "../menu-import/manifest-types";
import { Imp028cModifiersBootstrapError } from "./errors";

export type Imp028cModifiersArtifact = Readonly<{
  import_id: typeof IMP028C_MODIFIERS_IMPORT_ID;
  version: typeof IMP028C_MODIFIERS_IMPORT_VERSION;
  source_menu_import_id: typeof EXISTING_MENU_IMPORT_ID;
  source_menu_import_version: typeof EXISTING_MENU_IMPORT_VERSION;
  source_inventory_sha256: string;
  brand: Readonly<{ code: string }>;
  target: Readonly<{
    product_code: string;
    product_name: string;
    variant_code: string;
  }>;
  price_book: Readonly<{ code: string; scope_type: PriceBookScopeType }>;
  modifier_group: Readonly<{
    code: string;
    name: string;
  }>;
  modifier_options: readonly Readonly<{
    option: Readonly<{
      code: string;
      name: string;
    }>;
    binding: Readonly<{
      min_quantity: number;
      max_quantity: number;
      default_quantity: number;
      position: number;
    }>;
    price: Readonly<{
      price_delta_paise: number;
    }>;
  }>[];
  variant_modifier_group: Readonly<{
    min_total_quantity: number;
    max_total_quantity: number;
    position: number;
  }>;
}>;

function assertNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Imp028cModifiersBootstrapError("validation", {
      message: `${field} must be a non-empty string.`,
    });
  }
  return value;
}

function runCatalogQuantityValidation(fn: () => void): void {
  try {
    fn();
  } catch (error) {
    if (error instanceof CatalogValidationError) {
      throw new Imp028cModifiersBootstrapError("validation", { message: error.message });
    }
    throw error;
  }
}

function assertQuantityTriple(
  minQuantity: number,
  maxQuantity: number,
  defaultQuantity: number,
  fieldPrefix: string,
): void {
  if (minQuantity > maxQuantity) {
    throw new Imp028cModifiersBootstrapError("validation", {
      message: `${fieldPrefix}: minQuantity must be <= maxQuantity.`,
    });
  }
  if (defaultQuantity < minQuantity || defaultQuantity > maxQuantity) {
    throw new Imp028cModifiersBootstrapError("validation", {
      message: `${fieldPrefix}: defaultQuantity must be between minQuantity and maxQuantity.`,
    });
  }
}

function assertTotalRange(minTotal: number, maxTotal: number, fieldPrefix: string): void {
  if (minTotal > maxTotal) {
    throw new Imp028cModifiersBootstrapError("validation", {
      message: `${fieldPrefix}: minTotalQuantity must be <= maxTotalQuantity.`,
    });
  }
}

export function validateImp028cModifiersArtifactStructure(raw: unknown): Imp028cModifiersArtifact {
  if (typeof raw !== "object" || raw === null) {
    throw new Imp028cModifiersBootstrapError("validation", {
      message: "Modifier bootstrap artifact must be an object.",
    });
  }
  const artifact = raw as Record<string, unknown>;

  if (artifact.import_id !== IMP028C_MODIFIERS_IMPORT_ID) {
    throw new Imp028cModifiersBootstrapError("validation", {
      message: "Unexpected modifier bootstrap import_id.",
    });
  }
  if (artifact.version !== IMP028C_MODIFIERS_IMPORT_VERSION) {
    throw new Imp028cModifiersBootstrapError("validation", {
      message: "Unexpected modifier bootstrap version.",
    });
  }
  if (artifact.source_menu_import_id !== EXISTING_MENU_IMPORT_ID) {
    throw new Imp028cModifiersBootstrapError("validation", {
      message: "Unexpected source_menu_import_id.",
    });
  }
  if (artifact.source_menu_import_version !== EXISTING_MENU_IMPORT_VERSION) {
    throw new Imp028cModifiersBootstrapError("validation", {
      message: "Unexpected source_menu_import_version.",
    });
  }
  assertNonEmptyString(artifact.source_inventory_sha256, "source_inventory_sha256");

  const brand = artifact.brand;
  if (typeof brand !== "object" || brand === null) {
    throw new Imp028cModifiersBootstrapError("validation", {
      message: "brand must be an object.",
    });
  }
  const brandCode = assertNonEmptyString((brand as Record<string, unknown>).code, "brand.code");
  if (brandCode !== BOBA_BEAR_BRAND_CODE) {
    throw new Imp028cModifiersBootstrapError("validation", {
      message: "Unexpected brand.code.",
    });
  }

  const priceBook = artifact.price_book;
  if (typeof priceBook !== "object" || priceBook === null) {
    throw new Imp028cModifiersBootstrapError("validation", {
      message: "price_book must be an object.",
    });
  }
  const priceBookCode = assertNonEmptyString(
    (priceBook as Record<string, unknown>).code,
    "price_book.code",
  );
  if (priceBookCode !== BOOTSTRAP_PRICE_BOOK_CODE) {
    throw new Imp028cModifiersBootstrapError("validation", {
      message: "Unexpected price_book.code.",
    });
  }
  const priceBookScopeType = assertNonEmptyString(
    (priceBook as Record<string, unknown>).scope_type,
    "price_book.scope_type",
  );
  if (!(PRICE_BOOK_SCOPE_TYPES as readonly string[]).includes(priceBookScopeType)) {
    throw new Imp028cModifiersBootstrapError("validation", {
      message: "Unexpected price_book.scope_type.",
    });
  }
  if (priceBookScopeType !== "brand") {
    throw new Imp028cModifiersBootstrapError("validation", {
      message: "Unexpected price_book.scope_type.",
    });
  }

  const target = artifact.target;
  if (typeof target !== "object" || target === null) {
    throw new Imp028cModifiersBootstrapError("validation", {
      message: "target must be an object.",
    });
  }
  const targetRecord = target as Record<string, unknown>;
  const productCode = assertNonEmptyString(targetRecord.product_code, "target.product_code");
  const productName = assertNonEmptyString(targetRecord.product_name, "target.product_name");
  const variantCode = assertNonEmptyString(targetRecord.variant_code, "target.variant_code");

  const group = artifact.modifier_group;
  if (typeof group !== "object" || group === null) {
    throw new Imp028cModifiersBootstrapError("validation", {
      message: "modifier_group must be an object.",
    });
  }
  const groupRecord = group as Record<string, unknown>;
  assertNonEmptyString(groupRecord.code, "modifier_group.code");
  assertNonEmptyString(groupRecord.name, "modifier_group.name");

  if (!Array.isArray(artifact.modifier_options) || artifact.modifier_options.length !== 3) {
    throw new Imp028cModifiersBootstrapError("validation", {
      message: "modifier_options must contain exactly three entries.",
    });
  }

  const seenOptionCodes = new Set<string>();
  const modifierOptions = artifact.modifier_options.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      throw new Imp028cModifiersBootstrapError("validation", {
        message: `modifier_options[${index}] must be an object.`,
      });
    }
    const record = entry as Record<string, unknown>;
    const option = record.option;
    const binding = record.binding;
    const price = record.price;
    if (
      typeof option !== "object" ||
      option === null ||
      typeof binding !== "object" ||
      binding === null ||
      typeof price !== "object" ||
      price === null
    ) {
      throw new Imp028cModifiersBootstrapError("validation", {
        message: `modifier_options[${index}] requires option, binding, and price.`,
      });
    }
    const optionRecord = option as Record<string, unknown>;
    const bindingRecord = binding as Record<string, unknown>;
    const priceRecord = price as Record<string, unknown>;
    const optionCode = assertNonEmptyString(
      optionRecord.code,
      `modifier_options[${index}].option.code`,
    );
    if (seenOptionCodes.has(optionCode)) {
      throw new Imp028cModifiersBootstrapError("validation", {
        message: `Duplicate modifier option code ${optionCode}.`,
      });
    }
    seenOptionCodes.add(optionCode);
    assertNonEmptyString(optionRecord.name, `modifier_options[${index}].option.name`);

    const fieldPrefix = `modifier_options[${index}].binding`;
    let minQuantity = 0;
    let maxQuantity = 0;
    let defaultQuantity = 0;
    let position = 0;
    runCatalogQuantityValidation(() => {
      minQuantity = assertNonNegativeInt(bindingRecord.min_quantity, `${fieldPrefix}.min_quantity`);
      maxQuantity = assertQuantityInRange(
        bindingRecord.max_quantity,
        `${fieldPrefix}.max_quantity`,
        1,
        CATALOG_QUANTITY_MAX,
      );
      defaultQuantity = assertNonNegativeInt(
        bindingRecord.default_quantity,
        `${fieldPrefix}.default_quantity`,
      );
      position = assertNonNegativeInt(bindingRecord.position, `${fieldPrefix}.position`);
      assertQuantityTriple(minQuantity, maxQuantity, defaultQuantity, fieldPrefix);
    });

    let priceDeltaPaise = 0;
    runCatalogQuantityValidation(() => {
      priceDeltaPaise = assertNonNegativeInt(
        priceRecord.price_delta_paise,
        `modifier_options[${index}].price.price_delta_paise`,
      );
    });

    return Object.freeze({
      option: Object.freeze({ code: optionCode, name: optionRecord.name as string }),
      binding: Object.freeze({
        min_quantity: minQuantity,
        max_quantity: maxQuantity,
        default_quantity: defaultQuantity,
        position,
      }),
      price: Object.freeze({ price_delta_paise: priceDeltaPaise }),
    });
  });

  const vmg = artifact.variant_modifier_group;
  if (typeof vmg !== "object" || vmg === null) {
    throw new Imp028cModifiersBootstrapError("validation", {
      message: "variant_modifier_group must be an object.",
    });
  }
  const vmgRecord = vmg as Record<string, unknown>;
  const vmgFieldPrefix = "variant_modifier_group";
  let minTotalQuantity = 0;
  let maxTotalQuantity = 0;
  let vmgPosition = 0;
  runCatalogQuantityValidation(() => {
    minTotalQuantity = assertNonNegativeInt(
      vmgRecord.min_total_quantity,
      `${vmgFieldPrefix}.min_total_quantity`,
    );
    maxTotalQuantity = assertQuantityInRange(
      vmgRecord.max_total_quantity,
      `${vmgFieldPrefix}.max_total_quantity`,
      1,
      CATALOG_QUANTITY_MAX,
    );
    vmgPosition = assertNonNegativeInt(vmgRecord.position, `${vmgFieldPrefix}.position`);
    assertTotalRange(minTotalQuantity, maxTotalQuantity, vmgFieldPrefix);
  });

  let sumDefault = 0;
  for (const entry of modifierOptions) {
    sumDefault += entry.binding.default_quantity;
  }
  if (sumDefault < minTotalQuantity || sumDefault > maxTotalQuantity) {
    throw new Imp028cModifiersBootstrapError("validation", {
      message: "Sum of option default_quantity values must lie within variant group total range.",
    });
  }

  return Object.freeze({
    import_id: IMP028C_MODIFIERS_IMPORT_ID,
    version: IMP028C_MODIFIERS_IMPORT_VERSION,
    source_menu_import_id: EXISTING_MENU_IMPORT_ID,
    source_menu_import_version: EXISTING_MENU_IMPORT_VERSION,
    source_inventory_sha256: artifact.source_inventory_sha256 as string,
    brand: Object.freeze({ code: brandCode }),
    target: Object.freeze({
      product_code: productCode,
      product_name: productName,
      variant_code: variantCode,
    }),
    price_book: Object.freeze({
      code: priceBookCode,
      scope_type: priceBookScopeType as PriceBookScopeType,
    }),
    modifier_group: Object.freeze({
      code: groupRecord.code as string,
      name: groupRecord.name as string,
    }),
    modifier_options: Object.freeze(modifierOptions),
    variant_modifier_group: Object.freeze({
      min_total_quantity: minTotalQuantity,
      max_total_quantity: maxTotalQuantity,
      position: vmgPosition,
    }),
  });
}

function wrapSourceDrift(error: unknown): never {
  if (error instanceof MenuImportError && error.code === "SOURCE_DRIFT") {
    throw new Imp028cModifiersBootstrapError("SOURCE_DRIFT", { message: error.message });
  }
  if (error instanceof MenuImportError) {
    throw new Imp028cModifiersBootstrapError("validation", { message: error.message });
  }
  throw error;
}

export function loadImp028cModifiersArtifact(projectRoot: string): Imp028cModifiersArtifact {
  const absolute = path.join(projectRoot, IMP028C_MODIFIERS_ARTIFACT_RELATIVE_PATH);
  const raw = JSON.parse(readFileSync(absolute, "utf8")) as unknown;
  return validateImp028cModifiersArtifactStructure(raw);
}

export function validateImp028cModifiersArtifactAgainstMenu(
  projectRoot: string,
  artifact: Imp028cModifiersArtifact,
): ExistingMenuV1Manifest {
  let manifest: ExistingMenuV1Manifest;
  try {
    const absolute = path.join(projectRoot, EXISTING_MENU_MANIFEST_RELATIVE_PATH);
    manifest = JSON.parse(readFileSync(absolute, "utf8")) as ExistingMenuV1Manifest;
    validateManifestStructure(manifest, projectRoot);
    assertSourceDigestMatches(manifest, projectRoot);
  } catch (error) {
    wrapSourceDrift(error);
  }

  if (artifact.source_inventory_sha256 !== manifest.source_inventory_sha256) {
    throw new Imp028cModifiersBootstrapError("SOURCE_DRIFT", {
      message: "Modifier artifact source digest does not match existing-menu-v1.",
    });
  }
  if (artifact.brand.code !== manifest.brand.code) {
    throw new Imp028cModifiersBootstrapError("validation", {
      message: "Modifier artifact brand.code does not match existing-menu-v1 brand.",
    });
  }

  const product = manifest.products.find((entry) => entry.code === artifact.target.product_code);
  if (!product || product.name !== artifact.target.product_name) {
    throw new Imp028cModifiersBootstrapError("validation", {
      message: "Modifier artifact target product does not match existing-menu-v1.",
    });
  }
  if (product.variant.code !== artifact.target.variant_code) {
    throw new Imp028cModifiersBootstrapError("validation", {
      message: "Modifier artifact target variant does not match existing-menu-v1.",
    });
  }

  return manifest;
}
