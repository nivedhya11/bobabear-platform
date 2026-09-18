/**
 * Founder staging baseline compatibility classifier integration tests.
 * Real Testcontainers PostgreSQL — identity-preserving vs mutable commercial state.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { eq } from "drizzle-orm";
import { afterEach, describe, expect, inject, it } from "vitest";

import type { WebConfig } from "../../src/platform/config";
import {
  catalogContentRevisionsTable,
  catalogModifierGroupsTable,
  catalogProductsTable,
  catalogVariantsTable,
} from "../../src/platform/database/schema/catalog";
import { menuEntriesTable, menuSectionsTable } from "../../src/platform/database/schema/menu";
import { priceBookVariantPricesTable } from "../../src/platform/database/schema/pricing";
import {
  bootstrapPlatformSuperAdmin,
  createMembership,
  grantRole,
} from "../../src/server/access-control";
import { bootstrapExistingMenuAssortment } from "../../src/server/assortment/bootstrap";
import {
  bootstrapImp028cModifiers,
  validateImp028cModifiersArtifactStructure,
  type Imp028cModifiersArtifact,
} from "../../src/server/catalog/imp028c-modifiers";
import { runExistingMenuImport } from "../../src/server/catalog/menu-import";
import {
  publishCatalogContentChange,
  saveModifierGroupContentDraft,
  saveProductContentDraft,
} from "../../src/server/catalog/publish";
import { getApplicationPersistence } from "../../src/server/persistence";
import type { Persistence } from "../../src/server/persistence/types";
import { bootstrapExistingMenuPricing } from "../../src/server/pricing/bootstrap";
import {
  classifyStagingBaseline,
  resolveStagingBootstrapAction,
} from "../../src/server/staging/baseline-compatibility";
import {
  HONG_KONG_MILK_TEA_PRODUCT_CODE,
  IMP028C_MODIFIER_GROUP_CODE,
  LEGACY_SLICE4_PRODUCT_ID,
} from "../../src/shared/catalog/imp028c-modifiers/constants";
import { EXISTING_MENU_MANIFEST_RELATIVE_PATH } from "../../src/shared/catalog/menu";
import { BOOTSTRAP_PRICE_BOOK_ID } from "../../src/shared/pricing";
import {
  createEligibleWorkforceUser,
  principalFor,
} from "../database/support/access-control-fixtures";
import { applyMigrations, withIsolatedTestDatabase } from "../database/support/test-database";

const projectRoot = process.cwd();
const IMP036C_ARTIFACT_PATH = "data/platform/catalog/imp036c-hong-kong-required-topping-v1.json";

function adminConnectionInfo() {
  return {
    connectionString: inject("bobaBearTestAdminConnectionString"),
    host: inject("bobaBearTestAdminHost"),
    port: inject("bobaBearTestAdminPort"),
  };
}

function applicationConfig(databaseUrl: string): WebConfig {
  return {
    environment: "test",
    processKind: "web",
    publicOrigin: "http://localhost:3000",
    logLevel: "warn",
    release: null,
    allowUnsafeAdapters: true,
    databaseSslMode: "disable",
    port: 3000,
    databaseUrl,
  };
}

const openHandles: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(openHandles.splice(0).map((h) => h.close()));
});

function loadImp036cArtifact(): Imp028cModifiersArtifact {
  const raw = JSON.parse(
    readFileSync(path.join(projectRoot, IMP036C_ARTIFACT_PATH), "utf8"),
  ) as Record<string, unknown>;
  return validateImp028cModifiersArtifactStructure({
    ...raw,
    import_id: "imp028c-hong-kong-modifiers-v1",
    version: 1,
  });
}

function loadManifest() {
  return JSON.parse(
    readFileSync(path.join(projectRoot, EXISTING_MENU_MANIFEST_RELATIVE_PATH), "utf8"),
  ) as {
    brand: { id: string };
    products: readonly { id: string; code: string; description: string | null; variant: { id: string } }[];
    sections: readonly { id: string; name: string; parent_section_id: string | null }[];
    entries: readonly { id: string; section_id: string; product_id: string }[];
  };
}

async function withMigratedPersistence<T>(
  fn: (persistence: Persistence) => Promise<T>,
): Promise<T> {
  return withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
    await applyMigrations(database.connectionString);
    const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
    openHandles.push(persistence);
    return fn(persistence);
  });
}

async function applyFullFounderSeedChain(persistence: Persistence): Promise<void> {
  await runExistingMenuImport({ projectRoot, persistence, apply: true });
  await bootstrapExistingMenuAssortment({ projectRoot, persistence, apply: true });
  await bootstrapExistingMenuPricing({ projectRoot, persistence, apply: true });
  await bootstrapImp028cModifiers({ projectRoot, persistence, apply: true });
  await bootstrapImp028cModifiers({
    projectRoot,
    persistence,
    apply: true,
    artifact: loadImp036cArtifact(),
  });
}

async function readBrandContentRevision(
  persistence: Persistence,
  brandId: string,
): Promise<bigint> {
  return persistence.withContext(async (ctx) => {
    const rows = await ctx.db
      .select()
      .from(catalogContentRevisionsTable)
      .where(eq(catalogContentRevisionsTable.brandId, brandId))
      .limit(1);
    const row = rows[0];
    if (!row) throw new Error("missing brand content revision");
    return row.contentRevision;
  });
}

async function grantBrandAdminForImportedBrand(
  persistence: Persistence,
  brandId: string,
): Promise<ReturnType<typeof principalFor>> {
  const psa = await createEligibleWorkforceUser(persistence);
  await bootstrapPlatformSuperAdmin({ persistence, workforceUserId: psa.id });
  const brandAdmin = await createEligibleWorkforceUser(persistence);
  await persistence.transaction(async (tx) => {
    const membership = await createMembership(tx, {
      workforceUserId: brandAdmin.id,
      scope: { scopeType: "brand", brandId },
      status: "active",
    });
    await grantRole(tx, { membershipId: membership.id, roleKey: "brand_admin" });
  });
  return principalFor(brandAdmin.id);
}

describe("classifyStagingBaseline", () => {
  it("classifies migrated empty business state as FRESH_EMPTY → APPLY", async () => {
    await withMigratedPersistence(async (persistence) => {
      const classification = await classifyStagingBaseline({ projectRoot, persistence });
      expect(classification.state).toBe("FRESH_EMPTY");
      expect(resolveStagingBootstrapAction(classification.state)).toBe("APPLY");
    });
  });

  it("classifies full seed chain as COMPLETE_COMPATIBLE and preserves post-seed product content mutation", async () => {
    await withMigratedPersistence(async (persistence) => {
      await applyFullFounderSeedChain(persistence);
      const before = await classifyStagingBaseline({ projectRoot, persistence });
      expect(before.state).toBe("COMPLETE_COMPATIBLE");
      expect(resolveStagingBootstrapAction(before.state)).toBe("PRESERVE");

      const manifest = loadManifest();
      const actor = await grantBrandAdminForImportedBrand(persistence, manifest.brand.id);
      const product = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db
          .select()
          .from(catalogProductsTable)
          .where(eq(catalogProductsTable.id, LEGACY_SLICE4_PRODUCT_ID))
          .limit(1);
        return rows[0]!;
      });
      expect(product.code).toBe(HONG_KONG_MILK_TEA_PRODUCT_CODE);
      const originalDescription = product.description ?? "";
      const mutatedDescription = `${originalDescription} [UAT-036F]`;

      const draft = await persistence.transaction((tx) =>
        saveProductContentDraft(tx, {
          actor,
          productId: product.id,
          expectedContentRevision: product.draftContentRevision,
          description: mutatedDescription,
        }),
      );
      const envelope = await readBrandContentRevision(persistence, manifest.brand.id);
      await persistence.transaction((tx) =>
        publishCatalogContentChange(tx, {
          actor,
          brandId: manifest.brand.id,
          productId: product.id,
          expectedContentRevision: envelope,
        }),
      );
      expect(draft.draftContentRevision).toBeGreaterThan(product.draftContentRevision);

      const afterMutation = await classifyStagingBaseline({ projectRoot, persistence });
      expect(afterMutation.state).toBe("COMPLETE_COMPATIBLE");
      expect(resolveStagingBootstrapAction(afterMutation.state)).toBe("PRESERVE");

      const description = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db
          .select({ description: catalogProductsTable.description })
          .from(catalogProductsTable)
          .where(eq(catalogProductsTable.id, LEGACY_SLICE4_PRODUCT_ID))
          .limit(1);
        return rows[0]?.description;
      });
      expect(description).toBe(mutatedDescription);

      await expect(
        runExistingMenuImport({ projectRoot, persistence, apply: true }),
      ).rejects.toMatchObject({
        name: "MenuImportError",
        code: "IMPORT_CONFLICT",
      });
      const stillMutated = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db
          .select({ description: catalogProductsTable.description })
          .from(catalogProductsTable)
          .where(eq(catalogProductsTable.id, LEGACY_SLICE4_PRODUCT_ID))
          .limit(1);
        return rows[0]?.description;
      });
      expect(stillMutated).toBe(mutatedDescription);
    });
  });

  it("treats mutable pricing amounts and menu section names as compatible", async () => {
    await withMigratedPersistence(async (persistence) => {
      await applyFullFounderSeedChain(persistence);
      const manifest = loadManifest();
      const variantId = manifest.products[0]!.variant.id;
      const sectionId = manifest.sections[0]!.id;

      await persistence.withContext(async (ctx) => {
        await ctx.db
          .update(priceBookVariantPricesTable)
          .set({ amountPaise: BigInt(42_000) })
          .where(
            eq(priceBookVariantPricesTable.priceBookId, BOOTSTRAP_PRICE_BOOK_ID),
          );
        // Narrow to one row via a second filter if needed — update all amounts is fine
        // for proving amount is not part of identity check.
        void variantId;
        await ctx.db
          .update(menuSectionsTable)
          .set({ name: "Renamed For UAT" })
          .where(eq(menuSectionsTable.id, sectionId));
      });

      const classification = await classifyStagingBaseline({ projectRoot, persistence });
      expect(classification.state).toBe("COMPLETE_COMPATIBLE");
    });
  });

  it("treats legitimate mutable menu placement as COMPLETE_COMPATIBLE", async () => {
    await withMigratedPersistence(async (persistence) => {
      await applyFullFounderSeedChain(persistence);
      const before = await classifyStagingBaseline({ projectRoot, persistence });
      expect(before.state).toBe("COMPLETE_COMPATIBLE");

      const manifest = loadManifest();
      expect(manifest.sections.length).toBeGreaterThanOrEqual(2);
      expect(manifest.entries.length).toBeGreaterThanOrEqual(1);
      const entry = manifest.entries[0]!;
      const alternateSection = manifest.sections.find((section) => section.id !== entry.section_id);
      expect(alternateSection).toBeDefined();
      const childSection =
        manifest.sections.find((section) => section.parent_section_id === null && section.id !== alternateSection!.id) ??
        manifest.sections.find((section) => section.id !== alternateSection!.id);
      expect(childSection).toBeDefined();

      await persistence.withContext(async (ctx) => {
        // Mirror IMP-036F moveMenuEntry / updateMenuSection placement mutations.
        await ctx.db
          .update(menuEntriesTable)
          .set({ sectionId: alternateSection!.id })
          .where(eq(menuEntriesTable.id, entry.id));
        await ctx.db
          .update(menuSectionsTable)
          .set({ parentSectionId: alternateSection!.id })
          .where(eq(menuSectionsTable.id, childSection!.id));
      });

      const afterPlacement = await classifyStagingBaseline({ projectRoot, persistence });
      expect(afterPlacement.state).toBe("COMPLETE_COMPATIBLE");
      expect(resolveStagingBootstrapAction(afterPlacement.state)).toBe("PRESERVE");

      const preserved = await persistence.withContext(async (ctx) => {
        const entryRows = await ctx.db
          .select({ sectionId: menuEntriesTable.sectionId })
          .from(menuEntriesTable)
          .where(eq(menuEntriesTable.id, entry.id))
          .limit(1);
        const sectionRows = await ctx.db
          .select({ parentSectionId: menuSectionsTable.parentSectionId })
          .from(menuSectionsTable)
          .where(eq(menuSectionsTable.id, childSection!.id))
          .limit(1);
        return {
          entrySectionId: entryRows[0]?.sectionId,
          sectionParentId: sectionRows[0]?.parentSectionId ?? null,
        };
      });
      expect(preserved.entrySectionId).toBe(alternateSection!.id);
      expect(preserved.sectionParentId).toBe(alternateSection!.id);
    });
  });

  it("treats legitimate mutable modifier-group presentation as COMPLETE_COMPATIBLE", async () => {
    await withMigratedPersistence(async (persistence) => {
      await applyFullFounderSeedChain(persistence);
      const before = await classifyStagingBaseline({ projectRoot, persistence });
      expect(before.state).toBe("COMPLETE_COMPATIBLE");

      const manifest = loadManifest();
      const actor = await grantBrandAdminForImportedBrand(persistence, manifest.brand.id);
      const group = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db
          .select()
          .from(catalogModifierGroupsTable)
          .where(eq(catalogModifierGroupsTable.code, IMP028C_MODIFIER_GROUP_CODE))
          .limit(1);
        return rows[0]!;
      });
      expect(group.code).toBe(IMP028C_MODIFIER_GROUP_CODE);
      const mutatedName = `${group.name} [UAT-036F-modifier]`;

      await persistence.transaction((tx) =>
        saveModifierGroupContentDraft(tx, {
          actor,
          modifierGroupId: group.id,
          expectedContentRevision: group.draftContentRevision,
          name: mutatedName,
        }),
      );
      const envelope = await readBrandContentRevision(persistence, manifest.brand.id);
      await persistence.transaction((tx) =>
        publishCatalogContentChange(tx, {
          actor,
          brandId: manifest.brand.id,
          productId: LEGACY_SLICE4_PRODUCT_ID,
          expectedContentRevision: envelope,
        }),
      );

      const afterMutation = await classifyStagingBaseline({ projectRoot, persistence });
      expect(afterMutation.state).toBe("COMPLETE_COMPATIBLE");
      expect(resolveStagingBootstrapAction(afterMutation.state)).toBe("PRESERVE");

      const preservedName = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db
          .select({ name: catalogModifierGroupsTable.name })
          .from(catalogModifierGroupsTable)
          .where(eq(catalogModifierGroupsTable.code, IMP028C_MODIFIER_GROUP_CODE))
          .limit(1);
        return rows[0]?.name;
      });
      expect(preservedName).toBe(mutatedName);
    });
  });

  it("classifies partial baseline as PARTIAL_OR_INCOMPATIBLE → BLOCK", async () => {
    await withMigratedPersistence(async (persistence) => {
      await runExistingMenuImport({ projectRoot, persistence, apply: true });
      // Menu imported but assortment/pricing/modifiers absent.
      const classification = await classifyStagingBaseline({ projectRoot, persistence });
      expect(classification.state).toBe("PARTIAL_OR_INCOMPATIBLE");
      expect(resolveStagingBootstrapAction(classification.state)).toBe("BLOCK");
      expect(classification.reasons.length).toBeGreaterThan(0);
    });
  });

  it("classifies stable identity mismatch as PARTIAL_OR_INCOMPATIBLE", async () => {
    await withMigratedPersistence(async (persistence) => {
      await applyFullFounderSeedChain(persistence);
      await persistence.withContext(async (ctx) => {
        await ctx.db
          .update(catalogProductsTable)
          .set({ code: "tampered-stable-code" })
          .where(eq(catalogProductsTable.id, LEGACY_SLICE4_PRODUCT_ID));
      });
      const classification = await classifyStagingBaseline({ projectRoot, persistence });
      expect(classification.state).toBe("PARTIAL_OR_INCOMPATIBLE");
      expect(classification.reasons.some((r) => r.includes("product_code_mismatch"))).toBe(true);
    });
  });

  it("classifies incompatible variant code as PARTIAL_OR_INCOMPATIBLE", async () => {
    await withMigratedPersistence(async (persistence) => {
      await applyFullFounderSeedChain(persistence);
      const hongKongVariantId = loadManifest().products.find(
        (p) => p.id === LEGACY_SLICE4_PRODUCT_ID,
      )!.variant.id;
      await persistence.withContext(async (ctx) => {
        await ctx.db
          .update(catalogVariantsTable)
          .set({ code: "tampered-variant-code" })
          .where(eq(catalogVariantsTable.id, hongKongVariantId));
      });
      const classification = await classifyStagingBaseline({ projectRoot, persistence });
      expect(classification.state).toBe("PARTIAL_OR_INCOMPATIBLE");
      expect(classification.reasons.some((r) => r.includes("variant_code_mismatch"))).toBe(true);
    });
  });

  it("is read-only: never calls persistence.transaction and leaves row counts unchanged", async () => {
    await withMigratedPersistence(async (persistence) => {
      await applyFullFounderSeedChain(persistence);

      let transactionCalls = 0;
      const guarded: Persistence = {
        role: persistence.role,
        withContext: (fn) => persistence.withContext(fn),
        transaction: async (fn) => {
          transactionCalls += 1;
          return persistence.transaction(fn);
        },
        checkAvailability: () => persistence.checkAvailability(),
        close: () => persistence.close(),
      };

      const productCountBefore = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db.select({ id: catalogProductsTable.id }).from(catalogProductsTable);
        return rows.length;
      });

      const classification = await classifyStagingBaseline({
        projectRoot,
        persistence: guarded,
      });
      expect(classification.state).toBe("COMPLETE_COMPATIBLE");
      expect(transactionCalls).toBe(0);

      const productCountAfter = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db.select({ id: catalogProductsTable.id }).from(catalogProductsTable);
        return rows.length;
      });
      expect(productCountAfter).toBe(productCountBefore);
    });
  });

  it("fresh apply path reaches COMPLETE_COMPATIBLE after seed chain", async () => {
    await withMigratedPersistence(async (persistence) => {
      const fresh = await classifyStagingBaseline({ projectRoot, persistence });
      expect(fresh.state).toBe("FRESH_EMPTY");
      await applyFullFounderSeedChain(persistence);
      const complete = await classifyStagingBaseline({ projectRoot, persistence });
      expect(complete.state).toBe("COMPLETE_COMPATIBLE");
    });
  });
});
