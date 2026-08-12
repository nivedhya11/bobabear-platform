/**
 * Existing-menu Brand assortment bootstrap (IMP-014).
 *
 * Fixed existing-menu-v1 manifest only. Dry-run by default; writes with apply.
 * Creates Brand+Variant include rules for every manifest variant. Does not
 * create Brand/Outlet/Org/Territory or availability/schedule rows.
 */
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";

import { and, eq } from "drizzle-orm";

import { EXISTING_MENU_MANIFEST_RELATIVE_PATH } from "../../shared/catalog/menu";
import { assortmentRulesTable } from "../../platform/database/schema/assortment";
import { catalogVariantsTable } from "../../platform/database/schema/catalog";
import { brandsTable } from "../../platform/database/schema/organizations";
import type { Persistence } from "../persistence/types";
import {
  assertSourceDigestMatches,
  MenuImportError,
  validateManifestStructure,
} from "../catalog/menu-import/validate-manifest";
import type { ExistingMenuV1Manifest } from "../catalog/menu-import/manifest-types";
import { insertAssortmentAuditEvent } from "./audit";
import { AssortmentBootstrapError } from "./errors";

export type AssortmentBootstrapResult = Readonly<{
  mode: "dry-run" | "apply";
  outcome: "NO_CHANGES" | "WOULD_CREATE" | "APPLIED" | "FAILED";
  brandId: string;
  derivedVariantCount: number;
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

function wrapSourceDrift(error: unknown): never {
  if (error instanceof MenuImportError && error.code === "SOURCE_DRIFT") {
    throw new AssortmentBootstrapError("SOURCE_DRIFT", error.message);
  }
  if (error instanceof MenuImportError) {
    throw new AssortmentBootstrapError("validation", error.message);
  }
  throw error;
}

export async function bootstrapExistingMenuAssortment(options: {
  readonly projectRoot: string;
  readonly persistence: Persistence;
  readonly apply: boolean;
}): Promise<AssortmentBootstrapResult> {
  let manifest: ExistingMenuV1Manifest;
  try {
    manifest = loadFixedManifest(options.projectRoot);
    validateManifestStructure(manifest, options.projectRoot);
    assertSourceDigestMatches(manifest, options.projectRoot);
  } catch (error) {
    wrapSourceDrift(error);
  }

  const variantIds = manifest.products.map((p) => p.variant.id);
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
        throw new AssortmentBootstrapError(
          "validation",
          "BOBA Bear brand missing or inactive; run menu import first.",
        );
      }
      brandId = brand.id;

      for (const variantId of variantIds) {
        const variantRows = await tx.db
          .select()
          .from(catalogVariantsTable)
          .where(eq(catalogVariantsTable.id, variantId))
          .limit(1);
        const variant = variantRows[0];
        if (!variant || variant.brandId !== brand.id) {
          conflicts += 1;
          throw new AssortmentBootstrapError(
            "BOOTSTRAP_CONFLICT",
            "Manifest variant missing or not owned by BOBA Bear brand.",
          );
        }

        const activeInclude = await tx.db
          .select()
          .from(assortmentRulesTable)
          .where(
            and(
              eq(assortmentRulesTable.brandId, brand.id),
              eq(assortmentRulesTable.scopeType, "brand"),
              eq(assortmentRulesTable.targetType, "variant"),
              eq(assortmentRulesTable.variantId, variantId),
              eq(assortmentRulesTable.decision, "include"),
              eq(assortmentRulesTable.status, "active"),
            ),
          )
          .limit(1);

        if (activeInclude[0]) {
          const row = activeInclude[0];
          if (
            row.territoryId !== null ||
            row.organizationId !== null ||
            row.outletId !== null ||
            row.productId !== null ||
            row.modifierOptionId !== null
          ) {
            conflicts += 1;
            throw new AssortmentBootstrapError(
              "BOOTSTRAP_CONFLICT",
              "Active brand include exists with unexpected shape.",
            );
          }
          unchanged += 1;
          continue;
        }

        const activeExclude = await tx.db
          .select()
          .from(assortmentRulesTable)
          .where(
            and(
              eq(assortmentRulesTable.brandId, brand.id),
              eq(assortmentRulesTable.scopeType, "brand"),
              eq(assortmentRulesTable.targetType, "variant"),
              eq(assortmentRulesTable.variantId, variantId),
              eq(assortmentRulesTable.decision, "exclude"),
              eq(assortmentRulesTable.status, "active"),
            ),
          )
          .limit(1);

        if (activeExclude[0]) {
          conflicts += 1;
          throw new AssortmentBootstrapError(
            "BOOTSTRAP_CONFLICT",
            "Active brand exclude conflicts with bootstrap include.",
          );
        }

        created += 1;
        if (options.apply) {
          const now = new Date();
          const id = randomUUID();
          await tx.db.insert(assortmentRulesTable).values({
            id,
            brandId: brand.id,
            scopeType: "brand",
            territoryId: null,
            organizationId: null,
            outletId: null,
            targetType: "variant",
            productId: null,
            variantId,
            modifierOptionId: null,
            decision: "include",
            status: "active",
            reasonCode: "existing-menu-v1",
            createdByWorkforceUserId: null,
            retiredByWorkforceUserId: null,
            createdAt: now,
            retiredAt: null,
          });
        }
      }

      if (options.apply && created > 0) {
        await insertAssortmentAuditEvent(tx, {
          actorWorkforceUserId: null,
          action: "assortment.existing_menu_bootstrapped",
          brandId: brand.id,
          targetType: "brand",
          targetId: brand.id,
          metadata: {
            import_id: manifest.import_id,
            created,
            derivedVariantCount: variantIds.length,
          },
        });
      }

      if (conflicts > 0) {
        throw new AssortmentBootstrapError("BOOTSTRAP_CONFLICT", "Bootstrap conflict.");
      }
    });
  } catch (error) {
    if (error instanceof AssortmentBootstrapError) throw error;
    throw error;
  }

  if (created === 0) {
    return {
      mode: options.apply ? "apply" : "dry-run",
      outcome: "NO_CHANGES",
      brandId,
      derivedVariantCount: variantIds.length,
      counts: { created: 0, unchanged, conflicts: 0 },
    };
  }

  return {
    mode: options.apply ? "apply" : "dry-run",
    outcome: options.apply ? "APPLIED" : "WOULD_CREATE",
    brandId,
    derivedVariantCount: variantIds.length,
    counts: { created, unchanged, conflicts: 0 },
  };
}
