/**
 * Shared harness for catalog domain tests that need PostgreSQL (IMP-012).
 */
import { afterEach } from "vitest";
import { inject } from "vitest";

import type { WebConfig } from "../../src/platform/config";
import {
  bootstrapPlatformSuperAdmin,
  createMembership,
  grantRole,
} from "../../src/server/access-control";
import { getApplicationPersistence } from "../../src/server/persistence";
import type { Persistence } from "../../src/server/persistence/types";
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

export type CatalogActors = Readonly<{
  tree: SeededBrandTree;
  otherTree: SeededBrandTree;
  psa: WorkforceUserFixture;
  brandAdmin: WorkforceUserFixture;
  otherBrandAdmin: WorkforceUserFixture;
  outletManager: WorkforceUserFixture;
  psaActor: ReturnType<typeof principalFor>;
  brandAdminActor: ReturnType<typeof principalFor>;
  otherBrandAdminActor: ReturnType<typeof principalFor>;
  outletManagerActor: ReturnType<typeof principalFor>;
}>;

export async function withCatalogDomain<T>(
  fn: (persistence: Persistence, actors: CatalogActors) => Promise<T>,
): Promise<T> {
  return withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
    await applyMigrations(database.connectionString);
    const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
    openHandles.push(persistence);

    const tree = await persistence.transaction((tx) => seedBrandTree(tx, "cata"));
    const otherTree = await persistence.transaction((tx) => seedBrandTree(tx, "catb"));

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

    return fn(persistence, {
      tree,
      otherTree,
      psa,
      brandAdmin,
      otherBrandAdmin,
      outletManager,
      psaActor: principalFor(psa.id),
      brandAdminActor: principalFor(brandAdmin.id),
      otherBrandAdminActor: principalFor(otherBrandAdmin.id),
      outletManagerActor: principalFor(outletManager.id),
    });
  });
}
