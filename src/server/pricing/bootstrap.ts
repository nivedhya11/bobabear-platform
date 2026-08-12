/**
 * Existing-menu Brand pricing bootstrap (IMP-015).
 *
 * Fixed sources only. Dry-run by default; writes require apply.
 * Creates one Brand Price Book + Variant baseline prices. No charges,
 * tax registrations, or lower-scope books.
 */
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";

import { and, eq } from "drizzle-orm";

import { EXISTING_MENU_MANIFEST_RELATIVE_PATH } from "../../shared/catalog/menu";
import {
  BOOTSTRAP_PRICE_BOOK_CODE,
  BOOTSTRAP_PRICE_BOOK_EFFECTIVE_FROM,
  BOOTSTRAP_PRICE_BOOK_ID,
  EXISTING_MENU_PRICING_ARTIFACT_RELATIVE_PATH,
  TAX_CATEGORY_RESTAURANT_SERVICE_ID,
  parseRupeeToPaise,
  MoneyParseError,
} from "../../shared/pricing";
import {
  priceBookVariantPricesTable,
  priceBooksTable,
} from "../../platform/database/schema/pricing";
import { catalogVariantsTable } from "../../platform/database/schema/catalog";
import { brandsTable } from "../../platform/database/schema/organizations";
import type { Persistence } from "../persistence/types";
import {
  assertSourceDigestMatches,
  MenuImportError,
  validateManifestStructure,
} from "../catalog/menu-import/validate-manifest";
import type { ExistingMenuV1Manifest } from "../catalog/menu-import/manifest-types";
import { insertPricingTaxAuditEvent } from "./audit";
import { PricingBootstrapError } from "./errors";

export type ExistingMenuPricingArtifact = Readonly<{
  import_id: string;
  version: number;
  source_inventory_sha256: string;
  price_book: Readonly<{
    id: string;
    code: string;
    name: string;
    sales_channel: "direct";
    currency: "INR";
    tax_inclusion_mode: "exclusive";
    effective_from: string;
  }>;
  tax_category_id: string;
  variant_prices: readonly Readonly<{
    variant_id: string;
    source_key: string;
    source_item_name: string;
    amount_paise: number;
    allow_territory_override: false;
    allow_organization_override: false;
    allow_outlet_override: false;
  }>[];
}>;

export type PricingBootstrapResult = Readonly<{
  mode: "dry-run" | "apply";
  outcome: "NO_CHANGES" | "WOULD_CREATE" | "APPLIED" | "FAILED";
  brandId: string;
  priceBookId: string;
  derivedVariantPriceCount: number;
  counts: Readonly<{
    created: number;
    unchanged: number;
    conflicts: number;
  }>;
}>;

function loadFixedManifest(projectRoot: string): ExistingMenuV1Manifest {
  const absolute = path.join(projectRoot, EXISTING_MENU_MANIFEST_RELATIVE_PATH);
  return JSON.parse(readFileSync(absolute, "utf8")) as ExistingMenuV1Manifest;
}

function loadPricingArtifact(projectRoot: string): ExistingMenuPricingArtifact {
  const absolute = path.join(projectRoot, EXISTING_MENU_PRICING_ARTIFACT_RELATIVE_PATH);
  return JSON.parse(readFileSync(absolute, "utf8")) as ExistingMenuPricingArtifact;
}

function wrapSourceDrift(error: unknown): never {
  if (error instanceof MenuImportError && error.code === "SOURCE_DRIFT") {
    throw new PricingBootstrapError("SOURCE_DRIFT", error.message);
  }
  if (error instanceof MenuImportError) {
    throw new PricingBootstrapError("validation", error.message);
  }
  if (error instanceof MoneyParseError) {
    throw new PricingBootstrapError("SOURCE_PRICE_INVALID", error.message);
  }
  throw error;
}

/** Collect name → price from static menu.json (authoritative display prices). */
export function collectStaticMenuPrices(projectRoot: string): Map<string, string | number> {
  const menu = JSON.parse(
    readFileSync(path.join(projectRoot, "src/data/menu.json"), "utf8"),
  ) as unknown;
  const prices = new Map<string, string | number>();
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const entry of node) visit(entry);
      return;
    }
    if (typeof node !== "object" || node === null) return;
    const record = node as Record<string, unknown>;
    if (typeof record.name === "string" && "price" in record) {
      const price = record.price;
      if (typeof price === "number" || typeof price === "string") {
        prices.set(record.name, price);
      }
    }
    for (const value of Object.values(record)) visit(value);
  };
  visit(menu);
  return prices;
}

/**
 * Derive Variant prices from manifest + static menu. Used by artifact generation
 * and parity tests — never hard-codes 74.
 */
export function deriveExistingMenuVariantPrices(projectRoot: string): ExistingMenuPricingArtifact["variant_prices"] {
  const manifest = loadFixedManifest(projectRoot);
  validateManifestStructure(manifest, projectRoot);
  assertSourceDigestMatches(manifest, projectRoot);
  const staticPrices = collectStaticMenuPrices(projectRoot);
  const rows: ExistingMenuPricingArtifact["variant_prices"][number][] = [];

  for (const product of manifest.products) {
    const sourcePrice = staticPrices.get(product.name);
    if (sourcePrice === undefined) {
      throw new PricingBootstrapError(
        "validation",
        `Static menu price missing for product "${product.name}".`,
      );
    }
    let amountPaise: bigint;
    try {
      amountPaise = parseRupeeToPaise(sourcePrice);
    } catch (error) {
      wrapSourceDrift(error);
    }
    if (amountPaise > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new PricingBootstrapError("SOURCE_PRICE_INVALID", "amount exceeds JSON-safe integer.");
    }
    rows.push({
      variant_id: product.variant.id,
      source_key: product.source_key,
      source_item_name: product.name,
      amount_paise: Number(amountPaise),
      allow_territory_override: false,
      allow_organization_override: false,
      allow_outlet_override: false,
    });
  }
  return rows;
}

export async function bootstrapExistingMenuPricing(options: {
  readonly projectRoot: string;
  readonly persistence: Persistence;
  readonly apply: boolean;
}): Promise<PricingBootstrapResult> {
  let manifest: ExistingMenuV1Manifest;
  let artifact: ExistingMenuPricingArtifact;
  try {
    manifest = loadFixedManifest(options.projectRoot);
    validateManifestStructure(manifest, options.projectRoot);
    assertSourceDigestMatches(manifest, options.projectRoot);
    artifact = loadPricingArtifact(options.projectRoot);
  } catch (error) {
    wrapSourceDrift(error);
  }

  if (artifact.import_id !== manifest.import_id || artifact.version !== manifest.version) {
    throw new PricingBootstrapError(
      "validation",
      "Pricing artifact import_id/version does not match existing-menu-v1 manifest.",
    );
  }
  if (artifact.source_inventory_sha256 !== manifest.source_inventory_sha256) {
    throw new PricingBootstrapError(
      "SOURCE_DRIFT",
      "Pricing artifact source digest does not match existing-menu-v1.",
    );
  }
  if (artifact.price_book.id !== BOOTSTRAP_PRICE_BOOK_ID) {
    throw new PricingBootstrapError("validation", "Unexpected bootstrap price book id.");
  }
  if (artifact.price_book.code !== BOOTSTRAP_PRICE_BOOK_CODE) {
    throw new PricingBootstrapError("validation", "Unexpected bootstrap price book code.");
  }
  if (artifact.tax_category_id !== TAX_CATEGORY_RESTAURANT_SERVICE_ID) {
    throw new PricingBootstrapError("validation", "Unexpected tax category id.");
  }

  // Live derivation must match artifact (artifact is the frozen checked-in truth).
  const derived = deriveExistingMenuVariantPrices(options.projectRoot);
  if (derived.length !== artifact.variant_prices.length) {
    throw new PricingBootstrapError(
      "PRICING_BOOTSTRAP_CONFLICT",
      "Derived variant price count does not match pricing artifact.",
    );
  }
  const artifactByVariant = new Map(artifact.variant_prices.map((r) => [r.variant_id, r]));
  for (const row of derived) {
    const expected = artifactByVariant.get(row.variant_id);
    if (!expected || expected.amount_paise !== row.amount_paise) {
      throw new PricingBootstrapError(
        "PRICING_BOOTSTRAP_CONFLICT",
        "Derived prices diverge from pricing artifact.",
      );
    }
  }

  let created = 0;
  let unchanged = 0;
  let conflicts = 0;
  let brandId = "";

  try {
    await options.persistence.transaction(async (tx) => {
      const brandRows = await tx.db
        .select()
        .from(brandsTable)
        .where(eq(brandsTable.code, manifest.brand.code))
        .limit(1);
      const brand = brandRows[0];
      if (!brand || brand.name !== manifest.brand.name || brand.status !== "active") {
        throw new PricingBootstrapError(
          "validation",
          "BOBA Bear brand missing or inactive; run menu import first.",
        );
      }
      brandId = brand.id;

      const existingBookRows = await tx.db
        .select()
        .from(priceBooksTable)
        .where(eq(priceBooksTable.id, BOOTSTRAP_PRICE_BOOK_ID))
        .limit(1);
      const existingBook = existingBookRows[0];

      if (existingBook) {
        if (
          existingBook.brandId !== brand.id ||
          existingBook.code !== BOOTSTRAP_PRICE_BOOK_CODE ||
          existingBook.scopeType !== "brand" ||
          existingBook.salesChannel !== "direct" ||
          existingBook.currency !== "INR" ||
          existingBook.taxInclusionMode !== "exclusive"
        ) {
          conflicts += 1;
          throw new PricingBootstrapError(
            "PRICING_BOOTSTRAP_CONFLICT",
            "Existing price book conflicts with bootstrap identity.",
          );
        }
      }

      for (const row of artifact.variant_prices) {
        const variantRows = await tx.db
          .select()
          .from(catalogVariantsTable)
          .where(eq(catalogVariantsTable.id, row.variant_id))
          .limit(1);
        const variant = variantRows[0];
        if (!variant || variant.brandId !== brand.id) {
          conflicts += 1;
          throw new PricingBootstrapError(
            "PRICING_BOOTSTRAP_CONFLICT",
            "Variant missing or brand mismatch for pricing bootstrap.",
          );
        }

        if (existingBook) {
          const priceRows = await tx.db
            .select()
            .from(priceBookVariantPricesTable)
            .where(
              and(
                eq(priceBookVariantPricesTable.priceBookId, BOOTSTRAP_PRICE_BOOK_ID),
                eq(priceBookVariantPricesTable.variantId, row.variant_id),
              ),
            )
            .limit(1);
          const existingPrice = priceRows[0];
          if (!existingPrice) {
            conflicts += 1;
            throw new PricingBootstrapError(
              "PRICING_BOOTSTRAP_CONFLICT",
              "Price book exists but a expected variant price row is missing.",
            );
          }
          if (
            existingPrice.amountPaise !== BigInt(row.amount_paise) ||
            existingPrice.taxCategoryId !== TAX_CATEGORY_RESTAURANT_SERVICE_ID ||
            existingPrice.allowTerritoryOverride ||
            existingPrice.allowOrganizationOverride ||
            existingPrice.allowOutletOverride
          ) {
            conflicts += 1;
            throw new PricingBootstrapError(
              "PRICING_BOOTSTRAP_CONFLICT",
              "Existing variant price diverges from bootstrap artifact.",
            );
          }
          unchanged += 1;
          continue;
        }

        created += 1;
      }

      if (existingBook) {
        if (created !== 0 || conflicts !== 0) {
          throw new PricingBootstrapError("PRICING_BOOTSTRAP_CONFLICT", "Unexpected bootstrap state.");
        }
        return;
      }

      if (!options.apply) {
        return;
      }

      const now = new Date();
      const effectiveFrom = new Date(BOOTSTRAP_PRICE_BOOK_EFFECTIVE_FROM);
      await tx.db.insert(priceBooksTable).values({
        id: BOOTSTRAP_PRICE_BOOK_ID,
        brandId: brand.id,
        scopeType: "brand",
        territoryId: null,
        organizationId: null,
        outletId: null,
        code: BOOTSTRAP_PRICE_BOOK_CODE,
        name: "Direct primary v1",
        salesChannel: "direct",
        currency: "INR",
        taxInclusionMode: "exclusive",
        effectiveFrom,
        effectiveTo: null,
        lifecycleStatus: "active",
        createdByWorkforceUserId: null,
        activatedByWorkforceUserId: null,
        retiredByWorkforceUserId: null,
        createdAt: now,
        updatedAt: now,
        activatedAt: now,
        retiredAt: null,
      });

      for (const row of artifact.variant_prices) {
        await tx.db.insert(priceBookVariantPricesTable).values({
          id: randomUUID(),
          brandId: brand.id,
          priceBookId: BOOTSTRAP_PRICE_BOOK_ID,
          variantId: row.variant_id,
          amountPaise: BigInt(row.amount_paise),
          allowTerritoryOverride: false,
          allowOrganizationOverride: false,
          allowOutletOverride: false,
          floorPaise: null,
          ceilingPaise: null,
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          createdAt: now,
        });
      }

      await insertPricingTaxAuditEvent(tx, {
        actorWorkforceUserId: null,
        action: "pricing.bootstrap_existing_menu",
        brandId: brand.id,
        targetType: "price_book",
        targetId: BOOTSTRAP_PRICE_BOOK_ID,
        metadata: {
          variantPriceCount: artifact.variant_prices.length,
          code: BOOTSTRAP_PRICE_BOOK_CODE,
        },
      });
    });
  } catch (error) {
    if (error instanceof PricingBootstrapError) throw error;
    throw error;
  }

  const mode = options.apply ? "apply" : "dry-run";
  if (unchanged === artifact.variant_prices.length && created === 0) {
    return {
      mode,
      outcome: "NO_CHANGES",
      brandId,
      priceBookId: BOOTSTRAP_PRICE_BOOK_ID,
      derivedVariantPriceCount: artifact.variant_prices.length,
      counts: { created: 0, unchanged, conflicts },
    };
  }
  if (!options.apply) {
    return {
      mode,
      outcome: "WOULD_CREATE",
      brandId,
      priceBookId: BOOTSTRAP_PRICE_BOOK_ID,
      derivedVariantPriceCount: artifact.variant_prices.length,
      counts: { created, unchanged, conflicts },
    };
  }
  return {
    mode,
    outcome: "APPLIED",
    brandId,
    priceBookId: BOOTSTRAP_PRICE_BOOK_ID,
    derivedVariantPriceCount: artifact.variant_prices.length,
    counts: { created, unchanged, conflicts },
  };
}
