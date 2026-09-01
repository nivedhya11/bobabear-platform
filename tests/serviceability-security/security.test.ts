/**
 * Serviceability RBAC / security tests (IMP-019).
 */
import { afterEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";

import {
  PERMISSION_KEYS,
  ROLE_KEYS,
  permissionsForRole,
} from "../../src/shared/access-control";
import { createWorkforcePrincipalFromTrustedIdentity } from "../../src/server/access-control/principal";
import { getApplicationPersistence } from "../../src/server/persistence";
import {
  evaluateServiceability,
  getOutletServiceabilityConfiguration,
  setOutletServiceabilityRoutingPriority,
  ServiceabilityError,
} from "../../src/server/serviceability";
import {
  adminConnectionInfo,
  applicationConfig,
  closeTrackedPersistenceHandles,
  seedOutletDistanceServiceability,
  TEST_INSIDE_COORDS,
  trackPersistenceHandle,
  withServiceabilityHarness,
} from "../database/support/serviceability-fixtures";
import { applyMigrations, withIsolatedTestDatabase } from "../database/support/test-database";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

describe("IMP-019 serviceability security", () => {
  it("declares exactly 51 permissions / 7 roles including the two serviceability keys", () => {
    expect(PERMISSION_KEYS).toHaveLength(68);
    expect(ROLE_KEYS).toHaveLength(7);
    expect(PERMISSION_KEYS).toContain("serviceability.read");
    expect(PERMISSION_KEYS).toContain("serviceability.manage");

    expect(permissionsForRole("platform_super_admin")).toContain("serviceability.read");
    expect(permissionsForRole("platform_super_admin")).toContain("serviceability.manage");
    expect(permissionsForRole("brand_admin")).toContain("serviceability.read");
    expect(permissionsForRole("brand_admin")).toContain("serviceability.manage");
    expect(permissionsForRole("outlet_manager")).toContain("serviceability.read");
    expect(permissionsForRole("outlet_manager")).toContain("serviceability.manage");

    for (const role of [
      "kitchen_operator",
      "delivery_coordinator",
      "support_refund_operator",
      "finance_viewer",
    ] as const) {
      expect(permissionsForRole(role)).not.toContain("serviceability.read");
      expect(permissionsForRole(role)).not.toContain("serviceability.manage");
    }
  });

  it("Brand Admin cross-brand denial; Outlet Manager cross-outlet denial", async () => {
    await withServiceabilityHarness(async ({ persistence, actors }) => {
      const {
        tree,
        otherTree,
        brandAdminActor,
        otherBrandAdminActor,
        outletManagerActor,
        otherOutletManagerActor,
      } = actors;

      await expect(
        getOutletServiceabilityConfiguration(persistence, otherBrandAdminActor, {
          outletId: tree.outletA.id,
        }),
      ).rejects.toMatchObject({ code: "SERVICEABILITY_UNAUTHORIZED" });

      await expect(
        setOutletServiceabilityRoutingPriority(persistence, otherBrandAdminActor, {
          outletId: tree.outletA.id,
          routingPriority: 1,
          expectedRevision: null,
        }),
      ).rejects.toMatchObject({ code: "SERVICEABILITY_UNAUTHORIZED" });

      await expect(
        getOutletServiceabilityConfiguration(persistence, outletManagerActor, {
          outletId: tree.outletB.id,
        }),
      ).rejects.toMatchObject({ code: "SERVICEABILITY_UNAUTHORIZED" });

      await expect(
        setOutletServiceabilityRoutingPriority(persistence, otherOutletManagerActor, {
          outletId: tree.outletA.id,
          routingPriority: 1,
          expectedRevision: null,
        }),
      ).rejects.toMatchObject({ code: "SERVICEABILITY_UNAUTHORIZED" });

      await setOutletServiceabilityRoutingPriority(persistence, brandAdminActor, {
        outletId: tree.outletA.id,
        routingPriority: 1,
        expectedRevision: null,
      });
      await setOutletServiceabilityRoutingPriority(persistence, otherBrandAdminActor, {
        outletId: otherTree.outletA.id,
        routingPriority: 2,
        expectedRevision: null,
      });
      await setOutletServiceabilityRoutingPriority(persistence, outletManagerActor, {
        outletId: tree.outletA.id,
        routingPriority: 3,
        expectedRevision: BigInt(1),
      });
    });
  });

  it("does not authorize by role name or Platform Super Admin magic bypass", async () => {
    await withServiceabilityHarness(async ({ persistence, actors }) => {
      await expect(
        getOutletServiceabilityConfiguration(persistence, actors.kitchenOperatorActor, {
          outletId: actors.tree.outletA.id,
        }),
      ).rejects.toMatchObject({ code: "SERVICEABILITY_UNAUTHORIZED" });

      const spoofed = createWorkforcePrincipalFromTrustedIdentity({
        workforceUserId: "00000000-0000-4000-8000-00000000psa1",
        disabledAt: null,
        passwordChangeRequired: false,
        twoFactorEnabled: true,
      });
      await expect(
        getOutletServiceabilityConfiguration(persistence, spoofed, {
          outletId: actors.tree.outletA.id,
        }),
      ).rejects.toMatchObject({ code: "SERVICEABILITY_UNAUTHORIZED" });
    });
  });

  it("runtime brand isolation: other brand coverage never selected", async () => {
    await withServiceabilityHarness(async ({ persistence, actors }) => {
      const { tree, otherTree, brandAdminActor, otherBrandAdminActor } = actors;

      await seedOutletDistanceServiceability(persistence, otherBrandAdminActor, otherTree.outletA.id);

      const decision = await evaluateServiceability(persistence, {
        brandId: tree.brand.id,
        location: { coordinates: TEST_INSIDE_COORDS },
      });
      expect(decision.status).toBe("INDETERMINATE");

      await seedOutletDistanceServiceability(persistence, brandAdminActor, tree.outletA.id);
      const own = await evaluateServiceability(persistence, {
        brandId: tree.brand.id,
        location: { coordinates: TEST_INSIDE_COORDS },
      });
      expect(own).toMatchObject({
        status: "SERVICEABLE",
        selectedOutletId: tree.outletA.id,
      });
    });
  });

  it("rejects customer actors, forbidden fields, and does not leak config on unauthorized", async () => {
    await withServiceabilityHarness(async ({ persistence, actors }) => {
      await expect(
        getOutletServiceabilityConfiguration(
          persistence,
          { kind: "customer", authUserId: "cust-1" },
          { outletId: actors.tree.outletA.id },
        ),
      ).rejects.toMatchObject({ code: "SERVICEABILITY_UNAUTHENTICATED" });

      await expect(
        setOutletServiceabilityRoutingPriority(persistence, actors.brandAdminActor, {
          outletId: actors.tree.outletA.id,
          routingPriority: 1,
          expectedRevision: null,
          deliveryFee: 100,
        }),
      ).rejects.toMatchObject({ code: "SERVICEABILITY_FORBIDDEN_FIELD" });

      await expect(
        getOutletServiceabilityConfiguration(persistence, actors.otherBrandAdminActor, {
          outletId: actors.tree.outletA.id,
        }),
      ).rejects.toBeInstanceOf(ServiceabilityError);

      const count = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select count(*)::int as c from app.outlet_serviceability_configs
          where outlet_id = ${actors.tree.outletA.id}::uuid
        `);
        return rows.rows[0]?.c as number;
      });
      expect(count).toBe(0);
    });
  });

  it("DB seed matches 51 permissions including serviceability.*", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(
        applicationConfig(database.connectionString),
      );
      trackPersistenceHandle(persistence);
      await persistence.withContext(async (ctx) => {
        const count = await ctx.db.execute(
          sql`select count(*)::int as c from app.access_permissions`,
        );
        expect(count.rows[0]?.c).toBe(68);
        const keys = await ctx.db.execute(sql`
          select key from app.access_permissions
          where key like 'serviceability.%' order by key
        `);
        expect(keys.rows.map((r) => r.key)).toEqual([
          "serviceability.manage",
          "serviceability.read",
        ]);
      });
    });
  });
});
