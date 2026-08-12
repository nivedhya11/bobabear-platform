/**
 * Brand governance, RBAC ∩ delegation, and coupon inherited-scope proofs (IMP-016).
 */
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, inject, it } from "vitest";

import { promotionAuditEventsTable } from "../../src/platform/database/schema/promotions";
import {
  createMembership,
  grantRole,
} from "../../src/server/access-control";
import {
  createCouponDraft,
  createPromotionDraft,
  getPromotion,
  loadApplicableAutomaticPromotions,
  updateBrandPromotionPolicy,
  updateCouponDraft,
} from "../../src/server/promotions";
import { applyMigrations, withIsolatedTestDatabase, withTestDatabaseClient } from "./support/test-database";
import {
  createEligibleWorkforceUser,
  principalFor,
} from "./support/access-control-fixtures";
import {
  createAndActivatePromotion,
  createReadyDraftPromotion,
  enableOutletDelegation,
  seedPromotionsHarness,
  uniqueCode,
} from "./support/promotions-fixtures";

function adminConnectionInfo() {
  return {
    connectionString: inject("bobaBearTestAdminConnectionString"),
    host: inject("bobaBearTestAdminHost"),
    port: inject("bobaBearTestAdminPort"),
  };
}

const openHandles: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(openHandles.splice(0).map((h) => h.close()));
});

describe("Brand governance and RBAC ∩ delegation", () => {
  it("Brand Admin may administer descendant-scope drafts without delegation flags", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const harness = await seedPromotionsHarness(database.connectionString, openHandles);
      const actor = harness.brandAdminPrincipal;

      // Policy defaults: all delegation false
      const territory = await createReadyDraftPromotion(harness, {
        code: uniqueCode("t"),
        scopeType: "territory",
        territoryId: harness.tree.terrA.id,
      });
      const organization = await createReadyDraftPromotion(harness, {
        code: uniqueCode("o"),
        scopeType: "organization",
        organizationId: harness.tree.orgA.id,
      });
      const outlet = await createReadyDraftPromotion(harness, {
        code: uniqueCode("u"),
        scopeType: "outlet",
        outletId: harness.tree.outletA.id,
      });
      expect(territory.id).toBeTruthy();
      expect(organization.id).toBeTruthy();
      expect(outlet.id).toBeTruthy();

      await harness.persistence.transaction(async (tx) => {
        await updateBrandPromotionPolicy(tx, {
          actor,
          brandId: harness.tree.brand.id,
          allowTerritoryPromotions: true,
          allowOrganizationPromotions: true,
          allowOutletPromotions: true,
        });
      });

      await harness.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.select().from(promotionAuditEventsTable);
        expect(rows.some((r) => r.action === "brand_promotion_policy.updated")).toBe(true);
      });
    });
  }, 120_000);

  it("Outlet Manager: RBAC+delegation allowed; RBAC without delegation denied; no-RBAC denied", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const harness = await seedPromotionsHarness(database.connectionString, openHandles);

      const manager = await createEligibleWorkforceUser(harness.persistence);
      await harness.persistence.transaction(async (tx) => {
        const membership = await createMembership(tx, {
          workforceUserId: manager.id,
          scope: {
            scopeType: "outlet",
            brandId: harness.tree.brand.id,
            organizationId: harness.tree.orgA.id,
            territoryId: harness.tree.terrA.id,
            outletId: harness.tree.outletA.id,
          },
          status: "active",
        });
        await grantRole(tx, { membershipId: membership.id, roleKey: "outlet_manager" });
      });
      const managerPrincipal = principalFor(manager.id);

      // RBAC without delegation
      await expect(
        createReadyDraftPromotion(harness, {
          code: uniqueCode("om1"),
          scopeType: "outlet",
          outletId: harness.tree.outletA.id,
          actor: managerPrincipal,
        }),
      ).rejects.toMatchObject({ code: "PROMOTION_SCOPE_NOT_DELEGATED" });

      await enableOutletDelegation(harness);

      // RBAC + delegation
      const allowed = await createReadyDraftPromotion(harness, {
        code: uniqueCode("om2"),
        scopeType: "outlet",
        outletId: harness.tree.outletA.id,
        actor: managerPrincipal,
      });
      expect(allowed.id).toBeTruthy();

      // delegation without RBAC (kitchen operator)
      const kitchen = await createEligibleWorkforceUser(harness.persistence);
      await harness.persistence.transaction(async (tx) => {
        const membership = await createMembership(tx, {
          workforceUserId: kitchen.id,
          scope: {
            scopeType: "outlet",
            brandId: harness.tree.brand.id,
            organizationId: harness.tree.orgA.id,
            territoryId: harness.tree.terrA.id,
            outletId: harness.tree.outletA.id,
          },
          status: "active",
        });
        await grantRole(tx, { membershipId: membership.id, roleKey: "kitchen_operator" });
      });
      await expect(
        createReadyDraftPromotion(harness, {
          code: uniqueCode("om3"),
          scopeType: "outlet",
          outletId: harness.tree.outletA.id,
          actor: principalFor(kitchen.id),
        }),
      ).rejects.toThrow();
    });
  }, 120_000);

  it("Territory/Organization lower-scope: RBAC+delegation matrix via temporary manage grant", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const harness = await seedPromotionsHarness(database.connectionString, openHandles);

      // Temporary test-only permission grant (system catalogs are SELECT-only for app role)
      await withTestDatabaseClient(database.connectionString, async (admin) => {
        await admin.pool.query(
          `insert into app.access_role_permissions (role_key, permission_key, inheritance_mode, created_at)
           values
             ('support_refund_operator', 'promotions.manage', 'exact', now()),
             ('support_refund_operator', 'coupons.manage', 'exact', now())
           on conflict on constraint access_role_permissions_pkey do nothing`,
        );
      });

      const terrActor = await createEligibleWorkforceUser(harness.persistence);
      await harness.persistence.transaction(async (tx) => {
        const membership = await createMembership(tx, {
          workforceUserId: terrActor.id,
          scope: {
            scopeType: "territory",
            brandId: harness.tree.brand.id,
            territoryId: harness.tree.terrA.id,
          },
          status: "active",
        });
        await grantRole(tx, {
          membershipId: membership.id,
          roleKey: "support_refund_operator",
        });
      });
      const terrPrincipal = principalFor(terrActor.id);

      await expect(
        createReadyDraftPromotion(harness, {
          code: uniqueCode("tm1"),
          scopeType: "territory",
          territoryId: harness.tree.terrA.id,
          actor: terrPrincipal,
        }),
      ).rejects.toMatchObject({ code: "PROMOTION_SCOPE_NOT_DELEGATED" });

      await harness.persistence.transaction(async (tx) => {
        await updateBrandPromotionPolicy(tx, {
          actor: harness.brandAdminPrincipal,
          brandId: harness.tree.brand.id,
          allowTerritoryPromotions: true,
          allowOrganizationPromotions: true,
          allowOutletPromotions: false,
        });
      });

      const terrOk = await createReadyDraftPromotion(harness, {
        code: uniqueCode("tm2"),
        scopeType: "territory",
        territoryId: harness.tree.terrA.id,
        actor: terrPrincipal,
      });
      expect(terrOk.id).toBeTruthy();

      const orgActor = await createEligibleWorkforceUser(harness.persistence);
      await harness.persistence.transaction(async (tx) => {
        const membership = await createMembership(tx, {
          workforceUserId: orgActor.id,
          scope: {
            scopeType: "organization",
            brandId: harness.tree.brand.id,
            organizationId: harness.tree.orgA.id,
          },
          status: "active",
        });
        await grantRole(tx, {
          membershipId: membership.id,
          roleKey: "support_refund_operator",
        });
      });
      const orgOk = await createReadyDraftPromotion(harness, {
        code: uniqueCode("og1"),
        scopeType: "organization",
        organizationId: harness.tree.orgA.id,
        actor: principalFor(orgActor.id),
      });
      expect(orgOk.id).toBeTruthy();

      // delegation without RBAC: kitchen cannot manage territory even if delegated
      const kitchen = await createEligibleWorkforceUser(harness.persistence);
      await expect(
        createReadyDraftPromotion(harness, {
          code: uniqueCode("tm3"),
          scopeType: "territory",
          territoryId: harness.tree.terrA.id,
          actor: principalFor(kitchen.id),
        }),
      ).rejects.toThrow();
    });
  }, 120_000);

  it("active lower-scope Promotion remains effective after Brand disables delegation", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const harness = await seedPromotionsHarness(database.connectionString, openHandles);
      await enableOutletDelegation(harness);

      const active = await createAndActivatePromotion(harness, {
        code: uniqueCode("stay"),
        scopeType: "outlet",
        outletId: harness.tree.outletA.id,
        startsAt: new Date("2026-01-01T00:00:00Z"),
      });

      await harness.persistence.transaction(async (tx) => {
        await updateBrandPromotionPolicy(tx, {
          actor: harness.brandAdminPrincipal,
          brandId: harness.tree.brand.id,
          allowTerritoryPromotions: false,
          allowOrganizationPromotions: false,
          allowOutletPromotions: false,
        });
      });

      const row = await harness.persistence.withContext((ctx) => getPromotion(ctx, active.id));
      expect(row?.status).toBe("active");

      const loaded = await harness.persistence.withContext((ctx) =>
        loadApplicableAutomaticPromotions(ctx, {
          brandId: harness.tree.brand.id,
          territoryId: harness.tree.terrA.id,
          organizationId: harness.tree.orgA.id,
          outletId: harness.tree.outletA.id,
          at: new Date("2026-06-01T00:00:00Z"),
        }),
      );
      expect(loaded.some((p) => p.id === active.id)).toBe(true);
    });
  }, 120_000);
});

describe("Coupon authorization inherits Promotion scope", () => {
  it("Outlet Manager may mutate coupons only for authorized outlet promotions when delegated", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const harness = await seedPromotionsHarness(database.connectionString, openHandles);
      await enableOutletDelegation(harness);

      const manager = await createEligibleWorkforceUser(harness.persistence);
      await harness.persistence.transaction(async (tx) => {
        const membership = await createMembership(tx, {
          workforceUserId: manager.id,
          scope: {
            scopeType: "outlet",
            brandId: harness.tree.brand.id,
            organizationId: harness.tree.orgA.id,
            territoryId: harness.tree.terrA.id,
            outletId: harness.tree.outletA.id,
          },
          status: "active",
        });
        await grantRole(tx, { membershipId: membership.id, roleKey: "outlet_manager" });
      });
      const managerPrincipal = principalFor(manager.id);

      const outletPromo = await createAndActivatePromotion(harness, {
        code: uniqueCode("outc"),
        scopeType: "outlet",
        outletId: harness.tree.outletA.id,
        triggerType: "coupon",
      });
      const brandPromo = await createAndActivatePromotion(harness, {
        code: uniqueCode("brc"),
        scopeType: "brand",
        triggerType: "coupon",
      });
      const otherOutletPromo = await createAndActivatePromotion(harness, {
        code: uniqueCode("outb"),
        scopeType: "outlet",
        outletId: harness.tree.outletB.id,
        triggerType: "coupon",
      });

      const ok = await harness.persistence.transaction(async (tx) =>
        createCouponDraft(tx, {
          actor: managerPrincipal,
          promotionId: outletPromo.id,
          origin: "manual",
          canonicalCode: "OUTLET1",
        }),
      );
      await harness.persistence.transaction(async (tx) => {
        await updateCouponDraft(tx, {
          actor: managerPrincipal,
          couponId: ok.id,
          maximumRedemptions: 5,
        });
      });

      await expect(
        harness.persistence.transaction(async (tx) =>
          createCouponDraft(tx, {
            actor: managerPrincipal,
            promotionId: brandPromo.id,
            origin: "manual",
            canonicalCode: "BRAND1",
          }),
        ),
      ).rejects.toThrow();

      await expect(
        harness.persistence.transaction(async (tx) =>
          createCouponDraft(tx, {
            actor: managerPrincipal,
            promotionId: otherOutletPromo.id,
            origin: "manual",
            canonicalCode: "OTHER1",
          }),
        ),
      ).rejects.toThrow();

      // Disable delegation → further outlet coupon create denied
      await harness.persistence.transaction(async (tx) => {
        await updateBrandPromotionPolicy(tx, {
          actor: harness.brandAdminPrincipal,
          brandId: harness.tree.brand.id,
          allowTerritoryPromotions: false,
          allowOrganizationPromotions: false,
          allowOutletPromotions: false,
        });
      });
      await expect(
        harness.persistence.transaction(async (tx) =>
          createCouponDraft(tx, {
            actor: managerPrincipal,
            promotionId: outletPromo.id,
            origin: "manual",
            canonicalCode: "OUTLET2",
          }),
        ),
      ).rejects.toMatchObject({ code: "PROMOTION_SCOPE_NOT_DELEGATED" });
    });
  }, 120_000);
});

void sql;
void createPromotionDraft;
