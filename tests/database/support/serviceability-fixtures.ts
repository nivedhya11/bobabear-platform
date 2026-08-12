/**
 * Shared fixtures for Serviceability tests (IMP-019).
 */
import { inject } from "vitest";

import type { WebConfig } from "../../../src/platform/config";
import {
  bootstrapPlatformSuperAdmin,
  createMembership,
  grantRole,
} from "../../../src/server/access-control";
import {
  configureOutletOperatingProfile,
  pauseOutlet,
  replaceOutletOperatingSchedule,
} from "../../../src/server/assortment";
import { getApplicationPersistence } from "../../../src/server/persistence";
import type { Persistence } from "../../../src/server/persistence/types";
import {
  createEligibleWorkforceUser,
  principalFor,
  seedBrandTree,
  type SeededBrandTree,
  type WorkforceUserFixture,
} from "./access-control-fixtures";
import { applyMigrations, withIsolatedTestDatabase } from "./test-database";

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

export function trackPersistenceHandle(handle: { close(): Promise<void> }): void {
  openHandles.push(handle);
}

export async function closeTrackedPersistenceHandles(): Promise<void> {
  await Promise.all(openHandles.splice(0).map((h) => h.close()));
}

/** Full-week always-accepting schedule so resolveOutletOperatingState → AVAILABLE. */
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

export async function pauseOutletIndefinitely(
  persistence: Persistence,
  actor: unknown,
  outletId: string,
): Promise<void> {
  await persistence.transaction(async (tx) => {
    await pauseOutlet(tx, { actor, outletId, pausedUntil: null });
  });
}

export type ServiceabilityActors = Readonly<{
  tree: SeededBrandTree;
  otherTree: SeededBrandTree;
  psa: WorkforceUserFixture;
  brandAdmin: WorkforceUserFixture;
  otherBrandAdmin: WorkforceUserFixture;
  outletManager: WorkforceUserFixture;
  otherOutletManager: WorkforceUserFixture;
  kitchenOperator: WorkforceUserFixture;
  psaActor: ReturnType<typeof principalFor>;
  brandAdminActor: ReturnType<typeof principalFor>;
  otherBrandAdminActor: ReturnType<typeof principalFor>;
  outletManagerActor: ReturnType<typeof principalFor>;
  otherOutletManagerActor: ReturnType<typeof principalFor>;
  kitchenOperatorActor: ReturnType<typeof principalFor>;
}>;

export type ServiceabilityHarness = Readonly<{
  persistence: Persistence;
  database: { connectionString: string; databaseName: string };
  actors: ServiceabilityActors;
}>;

/**
 * Migrated DB + brand trees + PSA / Brand Admin / Outlet Manager actors,
 * with outlet A configured accepting+24h so evaluation can return SERVICEABLE.
 */
export async function withServiceabilityHarness<T>(
  fn: (harness: ServiceabilityHarness) => Promise<T>,
): Promise<T> {
  return withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
    await applyMigrations(database.connectionString);
    const persistence = getApplicationPersistence(
      applicationConfig(database.connectionString),
    );
    trackPersistenceHandle(persistence);

    const tree = await persistence.transaction((tx) => seedBrandTree(tx, "svc"));
    const otherTree = await persistence.transaction((tx) =>
      seedBrandTree(tx, "svx"),
    );

    const psa = await createEligibleWorkforceUser(persistence);
    await bootstrapPlatformSuperAdmin({ persistence, workforceUserId: psa.id });
    const psaActor = principalFor(psa.id);

    const brandAdmin = await createEligibleWorkforceUser(persistence);
    await persistence.transaction(async (tx) => {
      const membership = await createMembership(tx, {
        workforceUserId: brandAdmin.id,
        scope: { scopeType: "brand", brandId: tree.brand.id },
        status: "active",
      });
      await grantRole(tx, {
        membershipId: membership.id,
        roleKey: "brand_admin",
      });
    });

    const otherBrandAdmin = await createEligibleWorkforceUser(persistence);
    await persistence.transaction(async (tx) => {
      const membership = await createMembership(tx, {
        workforceUserId: otherBrandAdmin.id,
        scope: { scopeType: "brand", brandId: otherTree.brand.id },
        status: "active",
      });
      await grantRole(tx, {
        membershipId: membership.id,
        roleKey: "brand_admin",
      });
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
      await grantRole(tx, {
        membershipId: membership.id,
        roleKey: "outlet_manager",
      });
    });

    const otherOutletManager = await createEligibleWorkforceUser(persistence);
    await persistence.transaction(async (tx) => {
      const membership = await createMembership(tx, {
        workforceUserId: otherOutletManager.id,
        scope: {
          scopeType: "outlet",
          brandId: tree.brand.id,
          organizationId: tree.orgB.id,
          territoryId: tree.terrB.id,
          outletId: tree.outletB.id,
        },
        status: "active",
      });
      await grantRole(tx, {
        membershipId: membership.id,
        roleKey: "outlet_manager",
      });
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
      await grantRole(tx, {
        membershipId: membership.id,
        roleKey: "kitchen_operator",
      });
    });

    // Operating profiles for both brand outlets — PSA has outlet.operating_* .
    await configureAlwaysAcceptingOutlet(
      persistence,
      psaActor,
      tree.outletA.id,
    );
    await configureAlwaysAcceptingOutlet(
      persistence,
      psaActor,
      tree.outletB.id,
    );
    await configureAlwaysAcceptingOutlet(
      persistence,
      psaActor,
      otherTree.outletA.id,
    );

    const actors: ServiceabilityActors = {
      tree,
      otherTree,
      psa,
      brandAdmin,
      otherBrandAdmin,
      outletManager,
      otherOutletManager,
      kitchenOperator,
      psaActor,
      brandAdminActor: principalFor(brandAdmin.id),
      otherBrandAdminActor: principalFor(otherBrandAdmin.id),
      outletManagerActor: principalFor(outletManager.id),
      otherOutletManagerActor: principalFor(otherOutletManager.id),
      kitchenOperatorActor: principalFor(kitchenOperator.id),
    };

    return fn({ persistence, database, actors });
  });
}
