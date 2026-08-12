/**
 * Shared harness for assortment / availability / operating domain tests (IMP-014).
 */
import { afterEach } from "vitest";
import { inject } from "vitest";

import type { WebConfig } from "../../src/platform/config";
import {
  bootstrapPlatformSuperAdmin,
  createMembership,
  grantRole,
} from "../../src/server/access-control";
import {
  activateProduct,
  activateVariant,
  createProduct,
  createVariant,
} from "../../src/server/catalog";
import {
  configureOutletOperatingProfile,
  includeBrandVariant,
  replaceOutletOperatingSchedule,
} from "../../src/server/assortment";
import { getApplicationPersistence } from "../../src/server/persistence";
import type { Persistence } from "../../src/server/persistence/types";
import { getLocalWallClockParts, type DayOfWeek } from "../../src/shared/assortment";
import {
  createEligibleWorkforceUser,
  principalFor,
  seedBrandTree,
  type SeededBrandTree,
  type WorkforceUserFixture,
} from "../database/support/access-control-fixtures";
import { applyMigrations, withIsolatedTestDatabase } from "../database/support/test-database";

export function adminConnectionInfo() {
  return {
    connectionString: inject("bobaBearTestAdminConnectionString"),
    host: inject("bobaBearTestAdminHost"),
    port: inject("bobaBearTestAdminPort"),
  };
}

export function applicationConfig(databaseUrl: string): WebConfig {
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

export type AssortmentActors = Readonly<{
  tree: SeededBrandTree;
  otherTree: SeededBrandTree;
  psa: WorkforceUserFixture;
  brandAdmin: WorkforceUserFixture;
  otherBrandAdmin: WorkforceUserFixture;
  outletManager: WorkforceUserFixture;
  kitchenOperator: WorkforceUserFixture;
  psaActor: ReturnType<typeof principalFor>;
  brandAdminActor: ReturnType<typeof principalFor>;
  otherBrandAdminActor: ReturnType<typeof principalFor>;
  outletManagerActor: ReturnType<typeof principalFor>;
  kitchenOperatorActor: ReturnType<typeof principalFor>;
}>;

export async function withAssortmentDomain<T>(
  fn: (persistence: Persistence, actors: AssortmentActors) => Promise<T>,
): Promise<T> {
  return withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
    await applyMigrations(database.connectionString);
    const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
    openHandles.push(persistence);

    const tree = await persistence.transaction((tx) => seedBrandTree(tx, "asta"));
    const otherTree = await persistence.transaction((tx) => seedBrandTree(tx, "astb"));

    const psa = await createEligibleWorkforceUser(persistence);
    await bootstrapPlatformSuperAdmin({ persistence, workforceUserId: psa.id });

    const brandAdmin = await createEligibleWorkforceUser(persistence);
    await persistence.transaction(async (tx) => {
      const membership = await createMembership(tx, {
        workforceUserId: brandAdmin.id,
        scope: { scopeType: "brand", brandId: tree.brand.id },
        status: "active",
      });
      await grantRole(tx, { membershipId: membership.id, roleKey: "brand_admin" });
    });

    const otherBrandAdmin = await createEligibleWorkforceUser(persistence);
    await persistence.transaction(async (tx) => {
      const membership = await createMembership(tx, {
        workforceUserId: otherBrandAdmin.id,
        scope: { scopeType: "brand", brandId: otherTree.brand.id },
        status: "active",
      });
      await grantRole(tx, { membershipId: membership.id, roleKey: "brand_admin" });
    });

    const outletManager = await createEligibleWorkforceUser(persistence);
    await persistence.transaction(async (tx) => {
      const membership = await createMembership(tx, {
        workforceUserId: outletManager.id,
        scope: {
          scopeType: "outlet",
          brandId: tree.brand.id,
          organizationId: tree.orgA.id,
          territoryId: tree.terrA.id,
          outletId: tree.outletA.id,
        },
        status: "active",
      });
      await grantRole(tx, { membershipId: membership.id, roleKey: "outlet_manager" });
    });

    const kitchenOperator = await createEligibleWorkforceUser(persistence);
    await persistence.transaction(async (tx) => {
      const membership = await createMembership(tx, {
        workforceUserId: kitchenOperator.id,
        scope: {
          scopeType: "outlet",
          brandId: tree.brand.id,
          organizationId: tree.orgA.id,
          territoryId: tree.terrA.id,
          outletId: tree.outletA.id,
        },
        status: "active",
      });
      await grantRole(tx, { membershipId: membership.id, roleKey: "kitchen_operator" });
    });

    return fn(persistence, {
      tree,
      otherTree,
      psa,
      brandAdmin,
      otherBrandAdmin,
      outletManager,
      kitchenOperator,
      psaActor: principalFor(psa.id),
      brandAdminActor: principalFor(brandAdmin.id),
      otherBrandAdminActor: principalFor(otherBrandAdmin.id),
      outletManagerActor: principalFor(outletManager.id),
      kitchenOperatorActor: principalFor(kitchenOperator.id),
    });
  });
}

export type ActiveStandardVariant = Readonly<{
  productId: string;
  variantId: string;
}>;

/** Create + activate a standard product with one default variant. */
export async function createActiveStandardVariant(
  persistence: Persistence,
  actor: unknown,
  brandId: string,
  codePrefix: string,
): Promise<ActiveStandardVariant> {
  const product = await persistence.transaction((tx) =>
    createProduct(tx, {
      actor,
      brandId,
      code: `${codePrefix}-p`,
      name: `${codePrefix} Product`,
      productKind: "standard",
    }),
  );
  const variant = await persistence.transaction((tx) =>
    createVariant(tx, {
      actor,
      productId: product.id,
      code: "default",
      name: "Default",
      isDefault: true,
      isSelectorVisible: false,
    }),
  );
  await persistence.transaction(async (tx) => {
    await activateVariant(tx, { actor, variantId: variant.id });
    await activateProduct(tx, { actor, productId: product.id });
  });
  return { productId: product.id, variantId: variant.id };
}

/** Full-week always-accepting schedule in Asia/Kolkata. */
export async function configureAlwaysAcceptingOutlet(
  persistence: Persistence,
  actor: unknown,
  outletId: string,
  timezone = "Asia/Kolkata",
): Promise<void> {
  await persistence.transaction(async (tx) => {
    await configureOutletOperatingProfile(tx, {
      actor,
      outletId,
      timezone,
    });
    await replaceOutletOperatingSchedule(tx, {
      actor,
      outletId,
      intervals: ([0, 1, 2, 3, 4, 5, 6] as const).map((dayOfWeek) => ({
        dayOfWeek,
        startMinute: 0,
        endMinute: 1440,
      })),
    });
  });
}

export async function includeVariantAtBrand(
  persistence: Persistence,
  actor: unknown,
  brandId: string,
  variantId: string,
): Promise<void> {
  await persistence.transaction((tx) =>
    includeBrandVariant(tx, { actor, brandId, variantId }),
  );
}

/**
 * Find a Date whose Asia/Kolkata (or other) wall clock matches dayOfWeek + minuteOfDay.
 */
export function findInstantForLocalWallClock(
  timeZone: string,
  dayOfWeek: DayOfWeek,
  minuteOfDay: number,
  around: Date = new Date(),
): Date {
  const start = around.getTime() - 8 * 24 * 60 * 60 * 1000;
  const end = start + 16 * 24 * 60 * 60 * 1000;
  for (let t = start; t < end; t += 60_000) {
    const candidate = new Date(t);
    const parts = getLocalWallClockParts(candidate, timeZone);
    if (parts.dayOfWeek === dayOfWeek && parts.minuteOfDay === minuteOfDay) {
      return candidate;
    }
  }
  throw new Error(
    `Unable to find instant for ${timeZone} day=${dayOfWeek} minute=${minuteOfDay}`,
  );
}

export function nowInsideAcceptingWindow(): Date {
  return new Date();
}
