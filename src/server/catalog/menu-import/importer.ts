/**
 * Fixed existing-menu-v1 importer (IMP-013).
 *
 * Dry-run by default. Writes only with apply=true inside one transaction.
 * Owns only IDs present in the fixed checked-in manifest.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { and, eq } from "drizzle-orm";

import {
  EXISTING_MENU_MANIFEST_RELATIVE_PATH,
} from "../../../shared/catalog/menu";
import {
  catalogProductsTable,
  catalogVariantsTable,
} from "../../../platform/database/schema/catalog";
import {
  menuEntriesTable,
  menusTable,
  menuSectionsTable,
  menuVersionsTable,
} from "../../../platform/database/schema/menu";
import { brandsTable } from "../../../platform/database/schema/organizations";
import type {
  Persistence,
  PersistenceTransactionContext,
} from "../../persistence/types";
import type { ExistingMenuV1Manifest } from "./manifest-types";
import {
  assertSourceDigestMatches,
  MenuImportError,
  validateManifestStructure,
} from "./validate-manifest";
import {
  bootstrapActiveProductRevision,
  bootstrapActiveVariantRevision,
} from "../bootstrap-revisions";
import {
  ensureDraftMenuVersion,
  lockMenuForUpdate,
} from "../menu/versions";
/**
 * After legacy graph apply, ensure ACTIVE imported Menu has an EFFECTIVE
 * MenuVersion pointer. Idempotent when pointer already valid.
 */
async function ensureImportedMenuEffectiveVersion(
  tx: PersistenceTransactionContext,
  menuId: string,
  at: Date,
): Promise<void> {
  const menu = await lockMenuForUpdate(tx, menuId);
  if (menu.effectiveMenuVersionId) {
    return;
  }

  // Clear stale draft pointer so ensureDraft reseeds from current legacy rows.
  if (menu.draftMenuVersionId) {
    await tx.db
      .update(menusTable)
      .set({ draftMenuVersionId: null, updatedAt: at })
      .where(eq(menusTable.id, menuId));
  }

  const { draft } = await ensureDraftMenuVersion(tx, {
    menuId,
    actorWorkforceUserId: null,
    at,
  });

  await tx.db
    .update(menuVersionsTable)
    .set({
      lifecycleStatus: "EFFECTIVE",
      effectiveAt: at,
      supersededAt: null,
    })
    .where(eq(menuVersionsTable.id, draft.id));

  await tx.db
    .update(menusTable)
    .set({
      effectiveMenuVersionId: draft.id,
      draftMenuVersionId: null,
      updatedAt: at,
    })
    .where(eq(menusTable.id, menuId));
}

export type ImportPlanAction =
  | "create"
  | "reuse"
  | "unchanged"
  | "conflict";

export type ImportPlanItem = Readonly<{
  kind: string;
  id: string;
  action: ImportPlanAction;
  detail?: string;
}>;

export type ImportResult = Readonly<{
  mode: "dry-run" | "apply";
  import_id: string;
  version: number;
  outcome: "NO_CHANGES" | "WOULD_CREATE" | "APPLIED" | "FAILED";
  brandId: string;
  counts: Readonly<{
    products: number;
    variants: number;
    menus: number;
    sections: number;
    entries: number;
    created: number;
    unchanged: number;
    conflicts: number;
  }>;
  plan: readonly ImportPlanItem[];
}>;

function loadFixedManifest(projectRoot: string): ExistingMenuV1Manifest {
  const absolute = path.join(projectRoot, EXISTING_MENU_MANIFEST_RELATIVE_PATH);
  const raw = JSON.parse(readFileSync(absolute, "utf8")) as ExistingMenuV1Manifest;
  return raw;
}

function materialMatch(
  existing: Record<string, unknown>,
  expected: Record<string, unknown>,
): boolean {
  for (const [key, value] of Object.entries(expected)) {
    if (existing[key] !== value) return false;
  }
  return true;
}

export async function runExistingMenuImport(options: {
  readonly projectRoot: string;
  readonly persistence: Persistence;
  readonly apply: boolean;
}): Promise<ImportResult> {
  const manifest = loadFixedManifest(options.projectRoot);
  validateManifestStructure(manifest, options.projectRoot);
  assertSourceDigestMatches(manifest, options.projectRoot);

  const plan: ImportPlanItem[] = [];
  let created = 0;
  let unchanged = 0;
  let conflicts = 0;
  let resolvedBrandId = manifest.brand.id;

  const evaluate = async (
    tx: Parameters<Parameters<Persistence["transaction"]>[0]>[0],
  ): Promise<void> => {
    // Brand resolve/create (narrow exception)
    const brandByCode = await tx.db
      .select()
      .from(brandsTable)
      .where(eq(brandsTable.code, manifest.brand.code))
      .limit(1);
    const existingBrand = brandByCode[0];
    if (!existingBrand) {
      plan.push({ kind: "brand", id: manifest.brand.id, action: "create" });
      created += 1;
      if (options.apply) {
        const now = new Date();
        await tx.db.insert(brandsTable).values({
          id: manifest.brand.id,
          code: manifest.brand.code,
          name: manifest.brand.name,
          status: "active",
          createdAt: now,
          updatedAt: now,
        });
      }
      resolvedBrandId = manifest.brand.id;
    } else if (
      existingBrand.name === manifest.brand.name &&
      existingBrand.status === "active"
    ) {
      resolvedBrandId = existingBrand.id;
      plan.push({
        kind: "brand",
        id: existingBrand.id,
        action: existingBrand.id === manifest.brand.id ? "unchanged" : "reuse",
        detail:
          existingBrand.id === manifest.brand.id
            ? undefined
            : "Reusing existing brand identity with matching code/name.",
      });
      unchanged += 1;
    } else {
      conflicts += 1;
      plan.push({
        kind: "brand",
        id: existingBrand.id,
        action: "conflict",
        detail: "Brand code exists with conflicting identity.",
      });
      throw new MenuImportError(
        "IMPORT_CONFLICT",
        "Brand code boba-bear exists with conflicting identity.",
      );
    }

    const brandId = resolvedBrandId;
    const now = new Date();

    // Products + variants
    for (const product of manifest.products) {
      const rows = await tx.db
        .select()
        .from(catalogProductsTable)
        .where(eq(catalogProductsTable.id, product.id))
        .limit(1);
      const existing = rows[0];
      if (!existing) {
        // Also reject code collision under a different id
        const byCode = await tx.db
          .select()
          .from(catalogProductsTable)
          .where(
            and(
              eq(catalogProductsTable.brandId, brandId),
              eq(catalogProductsTable.code, product.code),
            ),
          )
          .limit(1);
        if (byCode[0]) {
          conflicts += 1;
          plan.push({
            kind: "product",
            id: byCode[0].id,
            action: "conflict",
            detail: `Product code ${product.code} owned by a different id.`,
          });
          throw new MenuImportError(
            "IMPORT_CONFLICT",
            `Product code conflict for ${product.code}.`,
          );
        }
        plan.push({ kind: "product", id: product.id, action: "create" });
        plan.push({ kind: "variant", id: product.variant.id, action: "create" });
        created += 2;
        if (options.apply) {
          await tx.db.insert(catalogProductsTable).values({
            id: product.id,
            brandId,
            code: product.code,
            name: product.name,
            description: product.description,
            productKind: "standard",
            lifecycleStatus: "active",
            createdAt: now,
            updatedAt: now,
            activatedAt: now,
            retiredAt: null,
          });
          await tx.db.insert(catalogVariantsTable).values({
            id: product.variant.id,
            brandId,
            productId: product.id,
            productKind: "standard",
            code: product.variant.code,
            name: "Default",
            description: null,
            isDefault: true,
            isSelectorVisible: false,
            lifecycleStatus: "active",
            createdAt: now,
            updatedAt: now,
            activatedAt: now,
            retiredAt: null,
          });
          await bootstrapActiveProductRevision(
            tx,
            {
              id: product.id,
              brandId,
              name: product.name,
              description: product.description,
            },
            now,
          );
          await bootstrapActiveVariantRevision(
            tx,
            {
              id: product.variant.id,
              brandId,
              name: "Default",
              description: null,
              isDefault: true,
              isSelectorVisible: false,
            },
            now,
          );
        }
      } else {
        const matches = materialMatch(
          {
            brandId: existing.brandId,
            code: existing.code,
            name: existing.name,
            description: existing.description,
            productKind: existing.productKind,
            lifecycleStatus: existing.lifecycleStatus,
          },
          {
            brandId,
            code: product.code,
            name: product.name,
            description: product.description,
            productKind: "standard",
            lifecycleStatus: "active",
          },
        );
        if (!matches) {
          conflicts += 1;
          plan.push({
            kind: "product",
            id: product.id,
            action: "conflict",
            detail: "Existing product materially conflicts with manifest.",
          });
          throw new MenuImportError(
            "IMPORT_CONFLICT",
            `Product conflict for ${product.code}.`,
          );
        }
        const variantRows = await tx.db
          .select()
          .from(catalogVariantsTable)
          .where(eq(catalogVariantsTable.id, product.variant.id))
          .limit(1);
        const variant = variantRows[0];
        if (
          !variant ||
          variant.productId !== product.id ||
          variant.code !== product.variant.code ||
          variant.isDefault !== true ||
          variant.isSelectorVisible !== false ||
          variant.lifecycleStatus !== "active"
        ) {
          conflicts += 1;
          plan.push({
            kind: "variant",
            id: product.variant.id,
            action: "conflict",
            detail: "Existing variant materially conflicts with manifest.",
          });
          throw new MenuImportError(
            "IMPORT_CONFLICT",
            `Variant conflict for product ${product.code}.`,
          );
        }
        plan.push({ kind: "product", id: product.id, action: "unchanged" });
        plan.push({ kind: "variant", id: product.variant.id, action: "unchanged" });
        unchanged += 2;
      }
    }

    // Menu
    {
      const rows = await tx.db
        .select()
        .from(menusTable)
        .where(eq(menusTable.id, manifest.menu.id))
        .limit(1);
      const existing = rows[0];
      if (!existing) {
        const byCode = await tx.db
          .select()
          .from(menusTable)
          .where(
            and(eq(menusTable.brandId, brandId), eq(menusTable.code, manifest.menu.code)),
          )
          .limit(1);
        if (byCode[0]) {
          conflicts += 1;
          throw new MenuImportError("IMPORT_CONFLICT", "Menu code primary conflict.");
        }
        plan.push({ kind: "menu", id: manifest.menu.id, action: "create" });
        created += 1;
        if (options.apply) {
          await tx.db.insert(menusTable).values({
            id: manifest.menu.id,
            brandId,
            code: manifest.menu.code,
            name: manifest.menu.name,
            lifecycleStatus: "active",
            revision: BigInt(1),
            effectiveMenuVersionId: null,
            draftMenuVersionId: null,
            createdAt: now,
            updatedAt: now,
            activatedAt: now,
            retiredAt: null,
          });
        }
      } else if (
        !materialMatch(
          {
            brandId: existing.brandId,
            code: existing.code,
            name: existing.name,
            lifecycleStatus: existing.lifecycleStatus,
          },
          {
            brandId,
            code: manifest.menu.code,
            name: manifest.menu.name,
            lifecycleStatus: "active",
          },
        )
      ) {
        conflicts += 1;
        throw new MenuImportError("IMPORT_CONFLICT", "Menu materially conflicts.");
      } else {
        plan.push({ kind: "menu", id: manifest.menu.id, action: "unchanged" });
        unchanged += 1;
      }
    }

    // Sections (parents before children — manifest order has roots first)
    for (const section of manifest.sections) {
      const rows = await tx.db
        .select()
        .from(menuSectionsTable)
        .where(eq(menuSectionsTable.id, section.id))
        .limit(1);
      const existing = rows[0];
      if (!existing) {
        const byCode = await tx.db
          .select()
          .from(menuSectionsTable)
          .where(
            and(
              eq(menuSectionsTable.menuId, manifest.menu.id),
              eq(menuSectionsTable.code, section.code),
            ),
          )
          .limit(1);
        if (byCode[0]) {
          conflicts += 1;
          throw new MenuImportError(
            "IMPORT_CONFLICT",
            `Section code conflict: ${section.code}`,
          );
        }
        plan.push({ kind: "section", id: section.id, action: "create" });
        created += 1;
        if (options.apply) {
          await tx.db.insert(menuSectionsTable).values({
            id: section.id,
            brandId,
            menuId: manifest.menu.id,
            parentSectionId: section.parent_section_id,
            code: section.code,
            name: section.name,
            description: section.description,
            position: section.position,
            lifecycleStatus: "active",
            createdAt: now,
            updatedAt: now,
            activatedAt: now,
            retiredAt: null,
          });
        }
      } else if (
        !materialMatch(
          {
            brandId: existing.brandId,
            menuId: existing.menuId,
            parentSectionId: existing.parentSectionId,
            code: existing.code,
            name: existing.name,
            description: existing.description,
            position: existing.position,
            lifecycleStatus: existing.lifecycleStatus,
          },
          {
            brandId,
            menuId: manifest.menu.id,
            parentSectionId: section.parent_section_id,
            code: section.code,
            name: section.name,
            description: section.description,
            position: section.position,
            lifecycleStatus: "active",
          },
        )
      ) {
        conflicts += 1;
        throw new MenuImportError(
          "IMPORT_CONFLICT",
          `Section conflict: ${section.code}`,
        );
      } else {
        plan.push({ kind: "section", id: section.id, action: "unchanged" });
        unchanged += 1;
      }
    }

    // Entries
    for (const entry of manifest.entries) {
      const rows = await tx.db
        .select()
        .from(menuEntriesTable)
        .where(eq(menuEntriesTable.id, entry.id))
        .limit(1);
      const existing = rows[0];
      if (!existing) {
        plan.push({ kind: "entry", id: entry.id, action: "create" });
        created += 1;
        if (options.apply) {
          await tx.db.insert(menuEntriesTable).values({
            id: entry.id,
            brandId,
            menuId: manifest.menu.id,
            sectionId: entry.section_id,
            productId: entry.product_id,
            displayName: entry.display_name,
            displayDescription: entry.display_description,
            imagePath: entry.image_path,
            position: entry.position,
            lifecycleStatus: "active",
            createdAt: now,
            updatedAt: now,
            activatedAt: now,
            retiredAt: null,
          });
        }
      } else if (
        !materialMatch(
          {
            brandId: existing.brandId,
            menuId: existing.menuId,
            sectionId: existing.sectionId,
            productId: existing.productId,
            displayName: existing.displayName,
            displayDescription: existing.displayDescription,
            imagePath: existing.imagePath,
            position: existing.position,
            lifecycleStatus: existing.lifecycleStatus,
          },
          {
            brandId,
            menuId: manifest.menu.id,
            sectionId: entry.section_id,
            productId: entry.product_id,
            displayName: entry.display_name,
            displayDescription: entry.display_description,
            imagePath: entry.image_path,
            position: entry.position,
            lifecycleStatus: "active",
          },
        )
      ) {
        conflicts += 1;
        throw new MenuImportError("IMPORT_CONFLICT", `Entry conflict: ${entry.source_key}`);
      } else {
        plan.push({ kind: "entry", id: entry.id, action: "unchanged" });
        unchanged += 1;
      }
    }

    if (options.apply) {
      // Post-apply verification inside the same transaction
      for (const product of manifest.products) {
        const rows = await tx.db
          .select({ id: catalogProductsTable.id })
          .from(catalogProductsTable)
          .where(eq(catalogProductsTable.id, product.id))
          .limit(1);
        if (!rows[0]) {
          throw new MenuImportError("validation", `Apply verification missing product ${product.id}`);
        }
      }
      for (const entry of manifest.entries) {
        const rows = await tx.db
          .select({ id: menuEntriesTable.id })
          .from(menuEntriesTable)
          .where(eq(menuEntriesTable.id, entry.id))
          .limit(1);
        if (!rows[0]) {
          throw new MenuImportError("validation", `Apply verification missing entry ${entry.id}`);
        }
      }

      // F3A: materialize EFFECTIVE MenuVersion from imported legacy graph so
      // customer projection can resolve the active Menu without legacy fallback.
      await ensureImportedMenuEffectiveVersion(tx, manifest.menu.id, now);
    }
  };

  try {
    if (options.apply) {
      await options.persistence.transaction(async (tx) => {
        await evaluate(tx);
      });
    } else {
      // Dry-run still reads through a transaction for consistent snapshots,
      // but evaluate never writes when apply=false.
      await options.persistence.transaction(async (tx) => {
        await evaluate(tx);
      });
    }
  } catch (error) {
    if (error instanceof MenuImportError) {
      throw error;
    }
    throw error;
  }

  const outcome =
    conflicts > 0
      ? "FAILED"
      : created === 0
        ? "NO_CHANGES"
        : options.apply
          ? "APPLIED"
          : "WOULD_CREATE";

  return {
    mode: options.apply ? "apply" : "dry-run",
    import_id: manifest.import_id,
    version: manifest.version,
    outcome,
    brandId: resolvedBrandId,
    counts: {
      products: manifest.products.length,
      variants: manifest.products.length,
      menus: 1,
      sections: manifest.sections.length,
      entries: manifest.entries.length,
      created,
      unchanged,
      conflicts,
    },
    plan,
  };
}

export function rejectArbitraryManifestPath(argv: readonly string[]): void {
  for (const arg of argv) {
    if (
      arg.startsWith("--file") ||
      arg.startsWith("--url") ||
      arg === "-" ||
      arg.startsWith("--manifest")
    ) {
      throw new MenuImportError(
        "validation",
        "Arbitrary import file/URL/stdin is not supported. Only the fixed existing-menu-v1 manifest may be used.",
      );
    }
  }
}
