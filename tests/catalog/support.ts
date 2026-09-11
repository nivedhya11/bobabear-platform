/**
 * Shared harness for catalog domain tests that need PostgreSQL (IMP-012).
 */
import { eq } from "drizzle-orm";
import { afterEach } from "vitest";
import { inject } from "vitest";

import type { WebConfig } from "../../src/platform/config";
import { catalogContentRevisionsTable } from "../../src/platform/database/schema/catalog";
import {
  bootstrapPlatformSuperAdmin,
  createMembership,
  grantRole,
} from "../../src/server/access-control";
import {
  publishCatalogContentChange,
  type PublishCatalogContentChangeResult,
} from "../../src/server/catalog";
import {
  findMenuById,
  publishMenuRevision,
  type Menu,
  type PublishMenuRevisionResult,
} from "../../src/server/catalog/menu";
import { getApplicationPersistence } from "../../src/server/persistence";
import type {
  Persistence,
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../../src/server/persistence/types";
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

/**
 * Current Brand publication envelope (`catalog_content_revisions`).
 *
 * Every material draft save and every activate/retire advances this value, so
 * tests must read it immediately before publishing rather than assuming 1.
 */
export async function readBrandContentRevision(
  context: PersistenceQueryContext,
  brandId: string,
): Promise<bigint> {
  const rows = await context.db
    .select()
    .from(catalogContentRevisionsTable)
    .where(eq(catalogContentRevisionsTable.brandId, brandId))
    .limit(1);
  const row = rows[0];
  if (!row) throw new Error("missing brand content revision");
  return row.contentRevision;
}

/**
 * Publish the product-rooted envelope at whatever revision the Brand currently
 * holds. Use when a test needs customer-visible catalog state rather than when
 * it is asserting CAS behaviour for a specific reviewed revision.
 */
export async function publishProductEnvelope(
  context: PersistenceTransactionContext,
  input: Readonly<{ actor: unknown; brandId: string; productId: string }>,
): Promise<PublishCatalogContentChangeResult> {
  const expectedContentRevision = await readBrandContentRevision(context, input.brandId);
  return publishCatalogContentChange(context, {
    actor: input.actor,
    brandId: input.brandId,
    productId: input.productId,
    expectedContentRevision,
  });
}

/** Current Menu.revision — read immediately before a material Menu CAS mutation. */
export async function readMenuRevision(
  context: PersistenceQueryContext,
  menuId: string,
): Promise<bigint> {
  const menu = await findMenuById(context, menuId);
  if (!menu) throw new Error(`menu not found: ${menuId}`);
  return menu.revision;
}

export async function requireMenuById(
  persistence: Persistence,
  menuId: string,
): Promise<Menu> {
  const menu = await persistence.withContext((ctx) => findMenuById(ctx, menuId));
  if (!menu) throw new Error(`menu not found: ${menuId}`);
  return menu;
}

/** Publish at the Menu.revision observed immediately before the transaction opens. */
export async function publishMenuAtCurrentRevision(
  persistence: Persistence,
  input: Readonly<{ actor: unknown; menuId: string }>,
): Promise<PublishMenuRevisionResult> {
  const revision = await persistence.withContext((ctx) =>
    readMenuRevision(ctx, input.menuId),
  );
  return persistence.transaction((tx) =>
    publishMenuRevision(tx, {
      actor: input.actor,
      menuId: input.menuId,
      expectedMenuRevision: revision,
    }),
  );
}
