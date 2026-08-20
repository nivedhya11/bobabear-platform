/**
 * IMP-028C modifier bootstrap integration tests (Slice 4).
 * @vitest-environment jsdom
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { and, eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { MenuItemCustomizationDialog } from "../../src/components/ordering/MenuItemCustomizationDialog";
import {
  buildCustomerMenuLookups,
  resolveCartLinePresentation,
} from "../../src/components/ordering/cart-presentation";
import { buildSnapshotCandidate } from "../../src/server/checkout/snapshot";
import { runExistingMenuImport } from "../../src/server/catalog/menu-import";
import {
  bootstrapImp028cFreshEnvironment,
  bootstrapImp028cModifiers,
  Imp028cModifiersBootstrapError,
  loadImp028cModifiersArtifact,
  resolveImp028cGraph,
  validateImp028cModifiersArtifactAgainstMenu,
} from "../../src/server/catalog/imp028c-modifiers";
import { bootstrapExistingMenuAssortment } from "../../src/server/assortment/bootstrap";
import { bootstrapExistingMenuPricing } from "../../src/server/pricing/bootstrap";
import { projectCustomerMenu } from "../../src/server/customer-commerce/menu/project-customer-menu";
import { addCartLine } from "../../src/server/cart";
import { getApplicationPersistence } from "../../src/server/persistence";
import {
  accessMembershipsTable,
  accessRoleAssignmentsTable,
} from "../../src/platform/database/schema/access-control";
import {
  catalogModifierGroupOptionsTable,
  catalogModifierGroupsTable,
  catalogModifierOptionsTable,
  catalogProductsTable,
  catalogVariantModifierGroupsTable,
  catalogVariantsTable,
} from "../../src/platform/database/schema/catalog";
import { brandsTable, territoriesTable } from "../../src/platform/database/schema/organizations";
import {
  priceBookModifierPricesTable,
  priceBookVariantPricesTable,
  priceBooksTable,
} from "../../src/platform/database/schema/pricing";
import { workforceAuthUsers } from "../../src/platform/database/schema/workforce-auth";
import {
  HONG_KONG_MILK_TEA_BASE_PRICE_PAISE,
  HONG_KONG_MILK_TEA_PRODUCT_CODE,
  HONG_KONG_MILK_TEA_PRODUCT_NAME,
  HONG_KONG_MILK_TEA_VARIANT_CODE,
  IMP028C_CLASSIC_BOBA_OPTION_CODE,
  IMP028C_EXTRA_BOBA_OPTION_CODE,
  IMP028C_MODIFIER_GROUP_CODE,
  LEGACY_SLICE4_BRAND_ID,
  LEGACY_SLICE4_PRICE_BOOK_ID,
  LEGACY_SLICE4_PRODUCT_ID,
  LEGACY_SLICE4_VARIANT_ID,
} from "../../src/shared/catalog/imp028c-modifiers/constants";
import { BOBA_BEAR_BRAND_CODE } from "../../src/shared/catalog/menu";
import { BOOTSTRAP_PRICE_BOOK_CODE } from "../../src/shared/pricing";
import { TAX_CATEGORY_RESTAURANT_SERVICE_ID } from "../../src/shared/pricing/constants";
import {
  adminConnectionInfo,
  applicationConfig,
} from "../assortment-availability/support";
import { applyMigrations, withIsolatedTestDatabase } from "../database/support/test-database";
import type { Persistence } from "../../src/server/persistence/types";

const projectRoot = process.cwd();
const AT = new Date("2026-08-09T12:00:00.000Z");

const openHandles: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(openHandles.splice(0).map((h) => h.close()));
});

async function withFreshMenuChain<T>(
  fn: (persistence: ReturnType<typeof getApplicationPersistence>) => Promise<T>,
): Promise<T> {
  return withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
    await applyMigrations(database.connectionString);
    const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
    openHandles.push(persistence);
    await runExistingMenuImport({ projectRoot, persistence, apply: true });
    await bootstrapExistingMenuAssortment({ projectRoot, persistence, apply: true });
    await bootstrapExistingMenuPricing({ projectRoot, persistence, apply: true });
    return fn(persistence);
  });
}

async function countSecurityFootprint(
  persistence: ReturnType<typeof getApplicationPersistence>,
): Promise<{ users: number; memberships: number; roleAssignments: number }> {
  return persistence.withContext(async (ctx) => {
    const users = await ctx.db.select().from(workforceAuthUsers);
    const memberships = await ctx.db.select().from(accessMembershipsTable);
    const roleAssignments = await ctx.db.select().from(accessRoleAssignmentsTable);
    return {
      users: users.length,
      memberships: memberships.length,
      roleAssignments: roleAssignments.length,
    };
  });
}

async function countOwnedGraphBySemantics(
  persistence: ReturnType<typeof getApplicationPersistence>,
): Promise<{ groups: number; bindings: number; vmg: number; prices: number }> {
  const graph = await resolveImp028cGraph(persistence, projectRoot);
  if (!graph) {
    return { groups: 0, bindings: 0, vmg: 0, prices: 0 };
  }
  return persistence.withContext(async (ctx) => {
    const groups = await ctx.db
      .select()
      .from(catalogModifierGroupsTable)
      .where(eq(catalogModifierGroupsTable.id, graph.modifierGroupId));
    const bindings = await ctx.db
      .select()
      .from(catalogModifierGroupOptionsTable)
      .where(eq(catalogModifierGroupOptionsTable.modifierGroupId, graph.modifierGroupId));
    const vmg = await ctx.db
      .select()
      .from(catalogVariantModifierGroupsTable)
      .where(eq(catalogVariantModifierGroupsTable.id, graph.variantModifierGroupId));
    const prices = await ctx.db
      .select()
      .from(priceBookModifierPricesTable)
      .where(eq(priceBookModifierPricesTable.variantModifierGroupId, graph.variantModifierGroupId));
    return {
      groups: groups.length,
      bindings: bindings.length,
      vmg: vmg.length,
      prices: prices.length,
    };
  });
}

async function seedAlternateSemanticPrerequisites(persistence: Persistence): Promise<{
  brandId: string;
  productId: string;
  variantId: string;
  priceBookId: string;
}> {
  const brandId = randomUUID();
  const productId = randomUUID();
  const variantId = randomUUID();
  const priceBookId = randomUUID();
  const now = new Date();

  await persistence.transaction(async (tx) => {
    await tx.db.insert(brandsTable).values({
      id: brandId,
      code: BOBA_BEAR_BRAND_CODE,
      name: "BOBA Bear",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    await tx.db.insert(catalogProductsTable).values({
      id: productId,
      brandId,
      code: HONG_KONG_MILK_TEA_PRODUCT_CODE,
      name: HONG_KONG_MILK_TEA_PRODUCT_NAME,
      description: null,
      productKind: "standard",
      lifecycleStatus: "active",
      createdAt: now,
      updatedAt: now,
      activatedAt: now,
      retiredAt: null,
    });
    await tx.db.insert(catalogVariantsTable).values({
      id: variantId,
      brandId,
      productId,
      productKind: "standard",
      code: HONG_KONG_MILK_TEA_VARIANT_CODE,
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
    await tx.db.insert(priceBooksTable).values({
      id: priceBookId,
      brandId,
      scopeType: "brand",
      territoryId: null,
      organizationId: null,
      outletId: null,
      code: BOOTSTRAP_PRICE_BOOK_CODE,
      name: "Direct primary v1",
      salesChannel: "direct",
      currency: "INR",
      taxInclusionMode: "exclusive",
      effectiveFrom: new Date("2026-08-08T00:00:00+05:30"),
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
    await tx.db.insert(priceBookVariantPricesTable).values({
      id: randomUUID(),
      brandId,
      priceBookId,
      variantId,
      amountPaise: BigInt(HONG_KONG_MILK_TEA_BASE_PRICE_PAISE),
      allowTerritoryOverride: false,
      allowOrganizationOverride: false,
      allowOutletOverride: false,
      floorPaise: null,
      ceilingPaise: null,
      taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
      createdAt: now,
    });
  });

  return { brandId, productId, variantId, priceBookId };
}

async function seedPrerequisitesWithWrongScopePriceBook(persistence: Persistence): Promise<void> {
  const brandId = randomUUID();
  const productId = randomUUID();
  const variantId = randomUUID();
  const priceBookId = randomUUID();
  const territoryId = randomUUID();
  const now = new Date();

  await persistence.transaction(async (tx) => {
    await tx.db.insert(brandsTable).values({
      id: brandId,
      code: BOBA_BEAR_BRAND_CODE,
      name: "BOBA Bear",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    await tx.db.insert(territoriesTable).values({
      id: territoryId,
      brandId,
      code: "test-territory",
      name: "Test Territory",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    await tx.db.insert(catalogProductsTable).values({
      id: productId,
      brandId,
      code: HONG_KONG_MILK_TEA_PRODUCT_CODE,
      name: HONG_KONG_MILK_TEA_PRODUCT_NAME,
      description: null,
      productKind: "standard",
      lifecycleStatus: "active",
      createdAt: now,
      updatedAt: now,
      activatedAt: now,
      retiredAt: null,
    });
    await tx.db.insert(catalogVariantsTable).values({
      id: variantId,
      brandId,
      productId,
      productKind: "standard",
      code: HONG_KONG_MILK_TEA_VARIANT_CODE,
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
    await tx.db.insert(priceBooksTable).values({
      id: priceBookId,
      brandId,
      scopeType: "territory",
      territoryId,
      organizationId: null,
      outletId: null,
      code: BOOTSTRAP_PRICE_BOOK_CODE,
      name: "Direct primary v1",
      salesChannel: "direct",
      currency: "INR",
      taxInclusionMode: "exclusive",
      effectiveFrom: new Date("2026-08-08T00:00:00+05:30"),
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
    await tx.db.insert(priceBookVariantPricesTable).values({
      id: randomUUID(),
      brandId,
      priceBookId,
      variantId,
      amountPaise: BigInt(HONG_KONG_MILK_TEA_BASE_PRICE_PAISE),
      allowTerritoryOverride: false,
      allowOrganizationOverride: false,
      allowOutletOverride: false,
      floorPaise: null,
      ceilingPaise: null,
      taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
      createdAt: now,
    });
  });
}

async function seedPrerequisitesWithInactiveBrandScopedPriceBook(
  persistence: Persistence,
): Promise<void> {
  const brandId = randomUUID();
  const productId = randomUUID();
  const variantId = randomUUID();
  const priceBookId = randomUUID();
  const now = new Date();

  await persistence.transaction(async (tx) => {
    await tx.db.insert(brandsTable).values({
      id: brandId,
      code: BOBA_BEAR_BRAND_CODE,
      name: "BOBA Bear",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    await tx.db.insert(catalogProductsTable).values({
      id: productId,
      brandId,
      code: HONG_KONG_MILK_TEA_PRODUCT_CODE,
      name: HONG_KONG_MILK_TEA_PRODUCT_NAME,
      description: null,
      productKind: "standard",
      lifecycleStatus: "active",
      createdAt: now,
      updatedAt: now,
      activatedAt: now,
      retiredAt: null,
    });
    await tx.db.insert(catalogVariantsTable).values({
      id: variantId,
      brandId,
      productId,
      productKind: "standard",
      code: HONG_KONG_MILK_TEA_VARIANT_CODE,
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
    await tx.db.insert(priceBooksTable).values({
      id: priceBookId,
      brandId,
      scopeType: "brand",
      territoryId: null,
      organizationId: null,
      outletId: null,
      code: BOOTSTRAP_PRICE_BOOK_CODE,
      name: "Direct primary v1",
      salesChannel: "direct",
      currency: "INR",
      taxInclusionMode: "exclusive",
      effectiveFrom: new Date("2026-08-08T00:00:00+05:30"),
      effectiveTo: null,
      lifecycleStatus: "draft",
      createdByWorkforceUserId: null,
      activatedByWorkforceUserId: null,
      retiredByWorkforceUserId: null,
      createdAt: now,
      updatedAt: now,
      activatedAt: null,
      retiredAt: null,
    });
    await tx.db.insert(priceBookVariantPricesTable).values({
      id: randomUUID(),
      brandId,
      priceBookId,
      variantId,
      amountPaise: BigInt(HONG_KONG_MILK_TEA_BASE_PRICE_PAISE),
      allowTerritoryOverride: false,
      allowOrganizationOverride: false,
      allowOutletOverride: false,
      floorPaise: null,
      ceilingPaise: null,
      taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
      createdAt: now,
    });
  });
}

describe("IMP-028C modifier bootstrap (Slice 4)", () => {
  it("S4-T01: artifact schema/validation succeeds", () => {
    const artifact = loadImp028cModifiersArtifact(projectRoot);
    validateImp028cModifiersArtifactAgainstMenu(projectRoot, artifact);
    expect(artifact.modifier_options).toHaveLength(3);
    expect(artifact.modifier_group.code).toBe(IMP028C_MODIFIER_GROUP_CODE);
    expect(artifact.brand.code).toBe(BOBA_BEAR_BRAND_CODE);
    expect(artifact.target.product_code).toBe(HONG_KONG_MILK_TEA_PRODUCT_CODE);
    expect(artifact.price_book.scope_type).toBe("brand");
  });

  it("S4-T02: invalid prerequisite fails closed", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);
      await expect(
        bootstrapImp028cModifiers({ projectRoot, persistence, apply: false }),
      ).rejects.toMatchObject({
        bootstrapErrorCode: "PREREQUISITE_MISSING",
      });
    });
  });

  it("UUID-independent semantic prerequisite resolution succeeds with alternate database IDs", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      const seeded = await seedAlternateSemanticPrerequisites(persistence);
      expect(seeded.brandId).not.toBe(LEGACY_SLICE4_BRAND_ID);
      expect(seeded.productId).not.toBe(LEGACY_SLICE4_PRODUCT_ID);
      expect(seeded.variantId).not.toBe(LEGACY_SLICE4_VARIANT_ID);
      expect(seeded.priceBookId).not.toBe(LEGACY_SLICE4_PRICE_BOOK_ID);

      const result = await bootstrapImp028cModifiers({ projectRoot, persistence, apply: true });
      expect(result.outcome).toBe("APPLIED");
      expect(result.brandId).toBe(seeded.brandId);
      expect(result.variantId).toBe(seeded.variantId);
      expect(result.priceBookId).toBe(seeded.priceBookId);
    });
  });

  it("rejects price book with wrong scope type even when brand and code match", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);
      await seedPrerequisitesWithWrongScopePriceBook(persistence);
      await expect(
        bootstrapImp028cModifiers({ projectRoot, persistence, apply: false }),
      ).rejects.toMatchObject({
        bootstrapErrorCode: "MODIFIER_BOOTSTRAP_CONFLICT",
        message: expect.stringMatching(/incompatible scope/i),
      });
    });
  });

  it("rejects inactive brand-scoped price book after scope-safe resolution", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);
      await seedPrerequisitesWithInactiveBrandScopedPriceBook(persistence);
      await expect(
        bootstrapImp028cModifiers({ projectRoot, persistence, apply: false }),
      ).rejects.toMatchObject({
        bootstrapErrorCode: "PREREQUISITE_MISSING",
        message: expect.stringMatching(/inactive after pricing bootstrap/i),
      });
    });
  });

  it("S4-T03/S4-T04/S4-T05/S4-T06/S4-T07/S4-T08: dry-run, apply, idempotency, lifecycle, pricing", async () => {
    await withFreshMenuChain(async (persistence) => {
      const beforeSecurity = await countSecurityFootprint(persistence);

      const dry = await bootstrapImp028cModifiers({ projectRoot, persistence, apply: false });
      expect(dry.outcome).toBe("WOULD_CREATE");
      expect((await countOwnedGraphBySemantics(persistence)).groups).toBe(0);
      expect(await countSecurityFootprint(persistence)).toEqual(beforeSecurity);

      const first = await bootstrapImp028cModifiers({ projectRoot, persistence, apply: true });
      expect(first.outcome).toBe("APPLIED");
      expect(await countSecurityFootprint(persistence)).toEqual(beforeSecurity);

      const graph = await resolveImp028cGraph(persistence, projectRoot);
      expect(graph).not.toBeNull();

      await persistence.withContext(async (ctx) => {
        const group = await ctx.db
          .select()
          .from(catalogModifierGroupsTable)
          .where(eq(catalogModifierGroupsTable.id, graph!.modifierGroupId));
        expect(group[0]?.lifecycleStatus).toBe("active");
        expect(group[0]?.code).toBe(IMP028C_MODIFIER_GROUP_CODE);

        const options = await ctx.db.select().from(catalogModifierOptionsTable);
        expect(options.filter((row) => row.lifecycleStatus === "active")).toHaveLength(3);

        const bindings = await ctx.db
          .select()
          .from(catalogModifierGroupOptionsTable)
          .where(eq(catalogModifierGroupOptionsTable.modifierGroupId, graph!.modifierGroupId));
        expect(bindings.every((row) => row.lifecycleStatus === "active")).toBe(true);

        const vmg = await ctx.db
          .select()
          .from(catalogVariantModifierGroupsTable)
          .where(eq(catalogVariantModifierGroupsTable.id, graph!.variantModifierGroupId));
        expect(vmg[0]?.lifecycleStatus).toBe("active");
        expect(vmg[0]?.variantId).toBe(first.variantId);

        const prices = await ctx.db
          .select()
          .from(priceBookModifierPricesTable)
          .where(
            eq(priceBookModifierPricesTable.variantModifierGroupId, graph!.variantModifierGroupId),
          );
        expect(prices).toHaveLength(3);
        const classicBindingId = graph!.bindingIdsByOptionCode.get(IMP028C_CLASSIC_BOBA_OPTION_CODE)!;
        const extraBindingId = graph!.bindingIdsByOptionCode.get(IMP028C_EXTRA_BOBA_OPTION_CODE)!;
        const classic = prices.find((row) => row.modifierGroupOptionId === classicBindingId);
        const extra = prices.find((row) => row.modifierGroupOptionId === extraBindingId);
        expect(classic?.priceDeltaPaise).toBe(BigInt(0));
        expect(extra?.priceDeltaPaise).toBe(BigInt(3000));
      });

      const second = await bootstrapImp028cModifiers({ projectRoot, persistence, apply: true });
      expect(second.outcome).toBe("NO_CHANGES");
      const counts = await countOwnedGraphBySemantics(persistence);
      expect(counts.groups).toBe(1);
      expect(counts.bindings).toBe(3);
      expect(counts.vmg).toBe(1);
      expect(counts.prices).toBe(3);
    });
  });

  it("S4-T09/S4-T10: Customer Menu projection exposes modifier metadata", async () => {
    await withFreshMenuChain(async (persistence) => {
      const applied = await bootstrapImp028cModifiers({ projectRoot, persistence, apply: true });
      const menu = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, { brandId: applied.brandId, at: AT }),
      );
      const item = menu.items.find((entry) => entry.variantId === applied.variantId);
      expect(item).toBeDefined();
      expect(item!.modifierGroups).toHaveLength(1);
      const group = item!.modifierGroups![0]!;
      expect(group.name).toBe("Toppings & Extras");
      const classic = group.options.find((option) => option.name === "Classic Boba")!;
      const extra = group.options.find((option) => option.name === "Extra Boba")!;
      const grass = group.options.find((option) => option.name === "Grass Jelly")!;
      expect(classic.displayPriceDeltaPaise).toBe(0);
      expect(classic.defaultQuantity).toBe(1);
      expect(extra.displayPriceDeltaPaise).toBe(3000);
      expect(extra.defaultQuantity).toBe(1);
      expect(grass.displayPriceDeltaPaise).toBe(4000);
      expect(grass.defaultQuantity).toBe(0);
    });
  });

  it("S4-T11: D-369 leaves paid catalog default unselected in add dialog", async () => {
    await withFreshMenuChain(async (persistence) => {
      const applied = await bootstrapImp028cModifiers({ projectRoot, persistence, apply: true });
      const menu = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, { brandId: applied.brandId, at: AT }),
      );
      const item = menu.items.find((entry) => entry.variantId === applied.variantId)!;
      render(
        <MenuItemCustomizationDialog
          item={item}
          mode="add"
          pending={false}
          error={null}
          onClose={() => {}}
          onAdd={() => {}}
        />,
      );
      expect(screen.getByRole("checkbox", { name: /classic boba/i })).toBeChecked();
      expect(screen.getByRole("checkbox", { name: /extra boba/i })).not.toBeChecked();
      expect(screen.getByRole("checkbox", { name: /grass jelly/i })).not.toBeChecked();
    });
  });

  it("S4-T12/S4-T13: configured cart accepts paid selection and presentation pricing", async () => {
    await withFreshMenuChain(async (persistence) => {
      const applied = await bootstrapImp028cModifiers({ projectRoot, persistence, apply: true });
      const graph = (await resolveImp028cGraph(persistence, projectRoot))!;
      const classicBindingId = graph.bindingIdsByOptionCode.get(IMP028C_CLASSIC_BOBA_OPTION_CODE)!;
      const extraBindingId = graph.bindingIdsByOptionCode.get(IMP028C_EXTRA_BOBA_OPTION_CODE)!;
      const access = { kind: "guest" as const, brandId: applied.brandId };

      const added = await addCartLine(
        persistence,
        access,
        {
          variantId: applied.variantId,
          quantity: 1,
          modifiers: [
            {
              variantModifierGroupId: graph.variantModifierGroupId,
              modifierGroupOptionId: classicBindingId,
              quantity: 1,
            },
            {
              variantModifierGroupId: graph.variantModifierGroupId,
              modifierGroupOptionId: extraBindingId,
              quantity: 1,
            },
          ],
        },
        { policy: { guestCartTtlMs: 3_600_000 } },
      );

      const line = added.cart.lines[0]!;
      expect(line.modifiers).toEqual(
        expect.arrayContaining([
          {
            variantModifierGroupId: graph.variantModifierGroupId,
            modifierGroupOptionId: classicBindingId,
            quantity: 1,
          },
          {
            variantModifierGroupId: graph.variantModifierGroupId,
            modifierGroupOptionId: extraBindingId,
            quantity: 1,
          },
        ]),
      );
      expect(line.modifiers).toHaveLength(2);

      const menu = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, { brandId: applied.brandId, at: AT }),
      );
      const lookups = buildCustomerMenuLookups(menu);
      const presentation = resolveCartLinePresentation(line, lookups);
      expect(presentation.modifiers.map((entry) => entry.optionName)).toEqual(
        expect.arrayContaining(["Classic Boba", "Extra Boba"]),
      );
      expect(presentation.lineTotalPaise).toBe(26_900);
    });
  });

  it("S4-T14: checkout snapshot preserves modifier commercial adjustment", () => {
    const destination = {
      destinationKind: "ONE_TIME_ADDRESS" as const,
      sourceSavedAddressId: null,
      recipientName: "Test",
      recipientPhone: "+919876543210",
      addressLine1: "1 Main",
      addressLine2: null,
      landmark: null,
      locality: null,
      city: "Mumbai",
      stateCode: "MH",
      postalCode: "400001",
      coordinates: null,
      label: null,
    };
    const candidate = buildSnapshotCandidate({
      checkoutId: "checkout-1",
      checkoutRevision: BigInt(1),
      sourceCartRevision: BigInt(1),
      selectedOutletId: "outlet-1",
      evaluatedAt: AT,
      serviceabilityEvaluatedAt: AT,
      manualCouponCode: null,
      destination,
      commercial: {
        quote: {
          calculatedAt: AT.toISOString(),
          currency: "INR",
          taxInclusionMode: "exclusive",
          basePaise: BigInt(23_900),
          modifierAdjustmentsPaise: BigInt(3_000),
          bundleAdjustmentsPaise: BigInt(0),
          chargesPaise: BigInt(0),
          prePromotionSubtotalPaise: BigInt(26_900),
          promotionDiscountPaise: BigInt(0),
          appliedPromotions: [],
          promotionAllocations: [],
          submittedCouponResult: null,
          taxablePaise: BigInt(26_900),
          taxPaise: BigInt(0),
          taxComponents: [],
          grandTotalPaise: BigInt(26_900),
          sourcePriceBookIds: [],
          taxPolicyIds: [],
          chargeLines: [],
        },
        lines: [
          {
            sourceCartLineId: "line-1",
            productId: "product-1",
            variantId: "variant-1",
            productName: "Hong Kong Milk Tea Boba",
            variantName: "Default",
            quantity: 1,
            lineBasePaise: BigInt(23_900),
            lineModifierAdjustmentsPaise: BigInt(3_000),
            lineBundleAdjustmentsPaise: BigInt(0),
            lineSubtotalPaise: BigInt(26_900),
            linePromotionDiscountPaise: BigInt(0),
            lineTaxablePaise: BigInt(26_900),
            lineTaxPaise: BigInt(0),
            lineTotalPaise: BigInt(26_900),
            sequence: 0,
            modifiers: [
              {
                variantModifierGroupId: "00000000-0000-4000-8000-000000000030",
                modifierGroupOptionId: "00000000-0000-4000-8000-000000000022",
                quantity: 1,
                groupName: "Toppings & Extras",
                optionName: "Extra Boba",
                unitDeltaPaise: BigInt(3_000),
              },
            ],
            bundleSelections: [],
          },
        ],
        charges: [],
        promotionEffects: [],
        taxComponents: [],
      },
      expiresAt: new Date(AT.getTime() + 3_600_000),
      updatedAt: AT,
    });

    expect(candidate.commercial.modifierAdjustmentsPaise).toBe(BigInt(3_000));
    expect(candidate.commercial.lines[0]?.modifiers[0]?.optionName).toBe("Extra Boba");
    expect(candidate.commercial.lines[0]?.lineModifierAdjustmentsPaise).toBe(BigInt(3_000));
  });

  it("S4-T15: menu re-import preserves additive modifier graph", async () => {
    await withFreshMenuChain(async (persistence) => {
      await bootstrapImp028cModifiers({ projectRoot, persistence, apply: true });
      await runExistingMenuImport({ projectRoot, persistence, apply: true });
      const counts = await countOwnedGraphBySemantics(persistence);
      expect(counts.groups).toBe(1);
      expect(counts.bindings).toBe(3);
      expect(counts.prices).toBe(3);
    });
  });

  it("S4-T16: fresh database bootstrap sequence reproduces content", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);
      const result = await bootstrapImp028cFreshEnvironment({ projectRoot, persistence });
      expect(result.outcome).toBe("APPLIED");
      const menu = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, { brandId: result.brandId, at: AT }),
      );
      const item = menu.items.find((entry) => entry.variantId === result.variantId);
      expect(item?.modifierGroups?.[0]?.options).toHaveLength(3);
    });
  });

  it("conflict detection fails on owned semantic price drift", async () => {
    await withFreshMenuChain(async (persistence) => {
      await bootstrapImp028cModifiers({ projectRoot, persistence, apply: true });
      const graph = (await resolveImp028cGraph(persistence, projectRoot))!;
      const extraBindingId = graph.bindingIdsByOptionCode.get(IMP028C_EXTRA_BOBA_OPTION_CODE)!;
      await persistence.withContext(async (ctx) => {
        await ctx.db
          .update(priceBookModifierPricesTable)
          .set({ priceDeltaPaise: BigInt(1) })
          .where(eq(priceBookModifierPricesTable.modifierGroupOptionId, extraBindingId));
      });
      await expect(
        bootstrapImp028cModifiers({ projectRoot, persistence, apply: true }),
      ).rejects.toBeInstanceOf(Imp028cModifiersBootstrapError);
    });
  });

  it("conflict detection fails when bootstrap group code exists with incompatible name", async () => {
    await withFreshMenuChain(async (persistence) => {
      const applied = await bootstrapImp028cModifiers({ projectRoot, persistence, apply: false });
      const artifact = loadImp028cModifiersArtifact(projectRoot);
      await persistence.withContext(async (ctx) => {
        const now = new Date();
        await ctx.db.insert(catalogModifierGroupsTable).values({
          id: randomUUID(),
          brandId: applied.brandId,
          code: artifact.modifier_group.code,
          name: "Conflicting Group Name",
          description: null,
          lifecycleStatus: "draft",
          createdAt: now,
          updatedAt: now,
          activatedAt: null,
          retiredAt: null,
        });
      });
      await expect(
        bootstrapImp028cModifiers({ projectRoot, persistence, apply: true }),
      ).rejects.toMatchObject({ bootstrapErrorCode: "MODIFIER_BOOTSTRAP_CONFLICT" });
    });
  });

  it("conflict detection fails when bootstrap option code exists with incompatible name", async () => {
    await withFreshMenuChain(async (persistence) => {
      const applied = await bootstrapImp028cModifiers({ projectRoot, persistence, apply: false });
      const artifact = loadImp028cModifiersArtifact(projectRoot);
      await persistence.withContext(async (ctx) => {
        const now = new Date();
        await ctx.db.insert(catalogModifierOptionsTable).values({
          id: randomUUID(),
          brandId: applied.brandId,
          code: IMP028C_EXTRA_BOBA_OPTION_CODE,
          name: "Conflicting Option Name",
          description: null,
          lifecycleStatus: "draft",
          createdAt: now,
          updatedAt: now,
          activatedAt: null,
          retiredAt: null,
        });
      });
      await expect(
        bootstrapImp028cModifiers({ projectRoot, persistence, apply: true }),
      ).rejects.toMatchObject({ bootstrapErrorCode: "MODIFIER_BOOTSTRAP_CONFLICT" });
    });
  });

  it("conflict detection fails on wrong product semantic target", async () => {
    await withFreshMenuChain(async (persistence) => {
      await bootstrapImp028cModifiers({ projectRoot, persistence, apply: true });
      await persistence.withContext(async (ctx) => {
        await ctx.db
          .update(catalogProductsTable)
          .set({ name: "Wrong Product Name" })
          .where(eq(catalogProductsTable.code, HONG_KONG_MILK_TEA_PRODUCT_CODE));
      });
      await expect(
        bootstrapImp028cModifiers({ projectRoot, persistence, apply: true }),
      ).rejects.toMatchObject({ bootstrapErrorCode: "MODIFIER_BOOTSTRAP_CONFLICT" });
    });
  });

  it("dry-run performs no catalog, pricing, or workforce writes", async () => {
    await withFreshMenuChain(async (persistence) => {
      const before = await persistence.withContext(async (ctx) => {
        const catalogCounts = await ctx.db.execute<{ count: string }>(sql`
          select
            (select count(*)::text from app.catalog_modifier_groups) as groups,
            (select count(*)::text from app.catalog_modifier_options) as options,
            (select count(*)::text from app.catalog_modifier_group_options) as bindings,
            (select count(*)::text from app.catalog_variant_modifier_groups) as vmg,
            (select count(*)::text from app.price_book_modifier_prices) as prices,
            (select count(*)::text from app.workforce_auth_users) as users,
            (select count(*)::text from app.access_memberships) as memberships,
            (select count(*)::text from app.access_role_assignments) as roles
        `);
        return catalogCounts.rows[0]!;
      });

      await bootstrapImp028cModifiers({ projectRoot, persistence, apply: false });

      const after = await persistence.withContext(async (ctx) => {
        const catalogCounts = await ctx.db.execute<{ count: string }>(sql`
          select
            (select count(*)::text from app.catalog_modifier_groups) as groups,
            (select count(*)::text from app.catalog_modifier_options) as options,
            (select count(*)::text from app.catalog_modifier_group_options) as bindings,
            (select count(*)::text from app.catalog_variant_modifier_groups) as vmg,
            (select count(*)::text from app.price_book_modifier_prices) as prices,
            (select count(*)::text from app.workforce_auth_users) as users,
            (select count(*)::text from app.access_memberships) as memberships,
            (select count(*)::text from app.access_role_assignments) as roles
        `);
        return catalogCounts.rows[0]!;
      });

      expect(after).toEqual(before);
    });
  });
});

describe("IMP-028C modifier bootstrap artifact file", () => {
  it("matches checked-in JSON on disk", () => {
    const fromLoader = loadImp028cModifiersArtifact(projectRoot);
    const fromDisk = JSON.parse(
      readFileSync(
        path.join(projectRoot, "data/platform/catalog/imp028c-hong-kong-modifiers-v1.json"),
        "utf8",
      ),
    );
    expect(fromLoader.import_id).toBe(fromDisk.import_id);
    expect(fromLoader.modifier_group.code).toBe(fromDisk.modifier_group.code);
    expect(fromLoader.modifier_options).toHaveLength(fromDisk.modifier_options.length);
    expect(fromLoader.brand.code).toBe(fromDisk.brand.code);
    expect(fromLoader.price_book.scope_type).toBe(fromDisk.price_book.scope_type);
  });
});
