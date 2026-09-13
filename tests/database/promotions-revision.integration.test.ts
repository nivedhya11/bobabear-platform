/**
 * IMP-036F F5 — Promotion aggregate revision and Coupon revision CAS proofs.
 */
import { afterEach, describe, expect, inject, it } from "vitest";

import { promotionsTable, promotionCouponsTable } from "../../src/platform/database/schema/promotions";
import { eq } from "drizzle-orm";
import { AuthorizationError, createMembership, grantRole } from "../../src/server/access-control";
import {
  PromotionAdminError,
  activateCoupon,
  activatePromotion,
  createCouponDraft,
  disableCoupon,
  enableCoupon,
  getCoupon,
  getPromotion,
  loadApplicableAutomaticPromotions,
  previewCouponConsequence,
  previewPromotionConsequence,
  retireCoupon,
  retirePromotion,
  setPromotionBenefit,
  setPromotionTargets,
  updateCouponDraft,
  updatePromotionDraft,
} from "../../src/server/promotions";
import {
  createEligibleWorkforceUser,
  principalFor,
} from "./support/access-control-fixtures";
import { applyMigrations, withIsolatedTestDatabase } from "./support/test-database";
import {
  createReadyDraftPromotion,
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

const AT = new Date("2026-06-01T00:00:00Z");

function assertNoDeadlock(result: PromiseSettledResult<unknown>): void {
  if (result.status === "rejected") {
    const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
    expect(message.toLowerCase()).not.toMatch(/deadlock/);
  }
}

describe("IMP-036F F5 — Promotion aggregate revision", () => {
  it("CAS-increments draft mutations, binds review to effect, and keeps fingerprint as provenance", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const harness = await seedPromotionsHarness(database.connectionString, openHandles);
      const actor = harness.brandAdminPrincipal;
      const draft = await createReadyDraftPromotion(harness, { code: uniqueCode("rev") });
      expect(draft.revision).toBe(BigInt(4));

      const updated = await harness.persistence.transaction((tx) =>
        updatePromotionDraft(tx, {
          actor,
          promotionId: draft.id,
          expectedPromotionRevision: draft.revision,
          displayName: "Revised name",
        }),
      );
      expect(updated.revision).toBe(BigInt(5));

      await expect(
        harness.persistence.transaction((tx) =>
          updatePromotionDraft(tx, {
            actor,
            promotionId: draft.id,
            expectedPromotionRevision: draft.revision,
            displayName: "Stale",
          }),
        ),
      ).rejects.toMatchObject({ code: "PROMOTION_STALE_REVISION" });
      const afterStale = await harness.persistence.withContext((ctx) => getPromotion(ctx, draft.id));
      expect(afterStale?.displayName).toBe("Revised name");
      expect(afterStale?.revision).toBe(BigInt(5));

      const afterBenefit = await harness.persistence.transaction((tx) =>
        setPromotionBenefit(tx, {
          actor,
          promotionId: draft.id,
          expectedPromotionRevision: BigInt(5),
          benefit: {
            benefitType: "percentage_discount",
            percentageBps: 1500,
            fixedAmountPaise: null,
            maximumDiscountPaise: null,
            buyQuantity: null,
            getQuantity: null,
            repeatable: null,
            maximumRewardQuantity: null,
            includeModifiers: false,
            includeBundleDeltas: false,
          },
        }),
      );
      expect(afterBenefit.revision).toBe(BigInt(6));

      const afterTargets = await harness.persistence.transaction((tx) =>
        setPromotionTargets(tx, {
          actor,
          promotionId: draft.id,
          expectedPromotionRevision: BigInt(6),
          targetRole: "qualifier",
          targets: [
            {
              targetRole: "qualifier",
              targetType: "all_merchandise",
              productId: null,
              variantId: null,
              chargeDefinitionId: null,
            },
          ],
        }),
      );
      expect(afterTargets.revision).toBe(BigInt(7));

      const preview = await harness.persistence.withContext((ctx) =>
        previewPromotionConsequence(ctx, {
          actor,
          brandId: harness.tree.brand.id,
          promotionId: draft.id,
        }),
      );
      expect(preview.expectedPromotionRevision).toBe("7");
      expect(preview.lifecycleStatus).toBe("draft");
      expect(preview.draftVsEffective).toBe("draft");
      expect(preview.supportedLifecycleStates).toEqual(["draft", "active", "retired"]);
      expect(preview.supportedLifecycleStates).not.toContain("scheduled");
      expect(preview.supportedLifecycleStates).not.toContain("ended");
      expect(preview.configurationFingerprint).toBeNull();

      const sibling = await createReadyDraftPromotion(harness, { code: uniqueCode("sib") });
      await harness.persistence.transaction((tx) =>
        updatePromotionDraft(tx, {
          actor,
          promotionId: sibling.id,
          expectedPromotionRevision: sibling.revision,
          displayName: "After review",
        }),
      );

      await expect(
        harness.persistence.transaction((tx) =>
          activatePromotion(tx, {
            actor,
            promotionId: sibling.id,
            expectedPromotionRevision: sibling.revision,
          }),
        ),
      ).rejects.toMatchObject({ code: "PROMOTION_STALE_REVISION" });
      const staleBlocked = await harness.persistence.withContext((ctx) =>
        getPromotion(ctx, sibling.id),
      );
      expect(staleBlocked?.status).toBe("draft");
      expect(staleBlocked?.configurationFingerprint).toBeNull();

      const customerBefore = await harness.persistence.withContext((ctx) =>
        loadApplicableAutomaticPromotions(ctx, {
          brandId: harness.tree.brand.id,
          territoryId: harness.tree.terrA.id,
          organizationId: harness.tree.orgA.id,
          outletId: harness.tree.outletA.id,
          at: AT,
        }),
      );
      expect(customerBefore.map((p) => p.id)).not.toContain(sibling.id);
      expect(customerBefore.map((p) => p.id)).not.toContain(draft.id);

      const activated = await harness.persistence.transaction((tx) =>
        activatePromotion(tx, {
          actor,
          promotionId: draft.id,
          expectedPromotionRevision: BigInt(7),
        }),
      );
      expect(activated.revision).toBe(BigInt(8));
      const active = await harness.persistence.withContext((ctx) => getPromotion(ctx, draft.id));
      expect(active?.status).toBe("active");
      expect(active?.configurationFingerprint).toMatch(/^[a-f0-9]{64}$/);
      const fingerprint = active!.configurationFingerprint;

      const customerAfter = await harness.persistence.withContext((ctx) =>
        loadApplicableAutomaticPromotions(ctx, {
          brandId: harness.tree.brand.id,
          territoryId: harness.tree.terrA.id,
          organizationId: harness.tree.orgA.id,
          outletId: harness.tree.outletA.id,
          at: AT,
        }),
      );
      expect(customerAfter.map((p) => p.id)).toContain(draft.id);

      const retirePreview = await harness.persistence.withContext((ctx) =>
        previewPromotionConsequence(ctx, {
          actor,
          brandId: harness.tree.brand.id,
          promotionId: draft.id,
        }),
      );
      expect(retirePreview.expectedPromotionRevision).toBe("8");
      expect(retirePreview.draftVsEffective).toBe("effective");
      expect(retirePreview.configurationFingerprint).toBe(fingerprint);

      const retired = await harness.persistence.transaction((tx) =>
        retirePromotion(tx, {
          actor,
          promotionId: draft.id,
          expectedPromotionRevision: BigInt(8),
        }),
      );
      expect(retired.revision).toBe(BigInt(9));
      const retiredRow = await harness.persistence.withContext((ctx) => getPromotion(ctx, draft.id));
      expect(retiredRow?.status).toBe("retired");
      expect(retiredRow?.configurationFingerprint).toBe(fingerprint);

      const statuses = await harness.persistence.withContext(async (ctx) => {
        const rows = await ctx.db
          .select({ status: promotionsTable.status })
          .from(promotionsTable)
          .where(eq(promotionsTable.brandId, harness.tree.brand.id));
        return rows.map((r) => r.status);
      });
      for (const status of statuses) {
        expect(["draft", "active", "retired"]).toContain(status);
      }
    });
  }, 120_000);

  it("two concurrent draft writes with the same expected revision: one success, one stale", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const harness = await seedPromotionsHarness(database.connectionString, openHandles);
      const actor = harness.brandAdminPrincipal;
      const draft = await createReadyDraftPromotion(harness, { code: uniqueCode("race") });

      const first = harness.persistence.transaction((tx) =>
        updatePromotionDraft(tx, {
          actor,
          promotionId: draft.id,
          expectedPromotionRevision: draft.revision,
          displayName: "Winner",
        }),
      );
      const second = harness.persistence.transaction((tx) =>
        updatePromotionDraft(tx, {
          actor,
          promotionId: draft.id,
          expectedPromotionRevision: draft.revision,
          displayName: "Loser",
        }),
      );
      const settled = await Promise.allSettled([first, second]);
      settled.forEach(assertNoDeadlock);
      const fulfilled = settled.filter((r) => r.status === "fulfilled");
      const rejected = settled.filter((r) => r.status === "rejected");
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(PromotionAdminError);
      expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({
        code: "PROMOTION_STALE_REVISION",
      });
      const row = await harness.persistence.withContext((ctx) => getPromotion(ctx, draft.id));
      expect(["Winner", "Loser"]).toContain(row?.displayName);
      expect(row?.revision).toBe(draft.revision + BigInt(1));
    });
  }, 120_000);
});

describe("IMP-036F F5 — Coupon revision lifecycle", () => {
  it("CAS-protects draft, activate, disable, enable, retire and stays bound to Promotion identity", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const harness = await seedPromotionsHarness(database.connectionString, openHandles);
      const actor = harness.brandAdminPrincipal;
      const promo = await createReadyDraftPromotion(harness, {
        code: uniqueCode("cpn"),
        triggerType: "coupon",
      });
      await harness.persistence.transaction((tx) =>
        activatePromotion(tx, {
          actor,
          promotionId: promo.id,
          expectedPromotionRevision: promo.revision,
        }),
      );

      const created = await harness.persistence.transaction((tx) =>
        createCouponDraft(tx, {
          actor,
          promotionId: promo.id,
          origin: "manual",
          canonicalCode: uniqueCode("CODE").toUpperCase().replace(/-/g, "").slice(0, 12),
        }),
      );
      expect(created.revision).toBe(BigInt(1));
      expect(created.canonicalCode).toMatch(/^[A-Z0-9]/);

      const updated = await harness.persistence.transaction((tx) =>
        updateCouponDraft(tx, {
          actor,
          couponId: created.id,
          expectedCouponRevision: created.revision,
          maximumRedemptions: 10,
        }),
      );
      expect(updated.revision).toBe(BigInt(2));

      const preview = await harness.persistence.withContext((ctx) =>
        previewCouponConsequence(ctx, {
          actor,
          brandId: harness.tree.brand.id,
          couponId: created.id,
          proposedStatus: "active",
        }),
      );
      expect(preview.expectedCouponRevision).toBe("2");
      expect(preview.promotionId).toBe(promo.id);
      expect(preview.supportedLifecycleStates).toEqual(["draft", "active", "disabled", "retired"]);

      const activated = await harness.persistence.transaction((tx) =>
        activateCoupon(tx, {
          actor,
          couponId: created.id,
          expectedCouponRevision: BigInt(2),
        }),
      );
      expect(activated.revision).toBe(BigInt(3));

      await expect(
        harness.persistence.transaction((tx) =>
          disableCoupon(tx, {
            actor,
            couponId: created.id,
            expectedCouponRevision: BigInt(2),
          }),
        ),
      ).rejects.toMatchObject({ code: "COUPON_STALE_REVISION" });
      const stillActive = await harness.persistence.withContext((ctx) => getCoupon(ctx, created.id));
      expect(stillActive?.status).toBe("active");
      expect(stillActive?.promotionId).toBe(promo.id);

      const disabled = await harness.persistence.transaction((tx) =>
        disableCoupon(tx, {
          actor,
          couponId: created.id,
          expectedCouponRevision: BigInt(3),
        }),
      );
      expect(disabled.revision).toBe(BigInt(4));
      const enabled = await harness.persistence.transaction((tx) =>
        enableCoupon(tx, {
          actor,
          couponId: created.id,
          expectedCouponRevision: BigInt(4),
        }),
      );
      expect(enabled.revision).toBe(BigInt(5));
      const retired = await harness.persistence.transaction((tx) =>
        retireCoupon(tx, {
          actor,
          couponId: created.id,
          expectedCouponRevision: BigInt(5),
        }),
      );
      expect(retired.revision).toBe(BigInt(6));
      const final = await harness.persistence.withContext((ctx) => getCoupon(ctx, created.id));
      expect(final?.status).toBe("retired");
      expect(final?.promotionId).toBe(promo.id);

      const statuses = await harness.persistence.withContext(async (ctx) => {
        const rows = await ctx.db
          .select({ status: promotionCouponsTable.status })
          .from(promotionCouponsTable)
          .where(eq(promotionCouponsTable.promotionId, promo.id));
        return rows.map((r) => r.status);
      });
      for (const status of statuses) {
        expect(["draft", "active", "disabled", "retired"]).toContain(status);
      }

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
        harness.persistence.transaction((tx) =>
          updateCouponDraft(tx, {
            actor: principalFor(kitchen.id),
            couponId: created.id,
            expectedCouponRevision: BigInt(6),
            maximumRedemptions: 99,
          }),
        ),
      ).rejects.toBeInstanceOf(AuthorizationError);
      const afterDenied = await harness.persistence.withContext((ctx) => getCoupon(ctx, created.id));
      expect(afterDenied?.status).toBe("retired");
      expect(afterDenied?.revision).toBe(BigInt(6));
    });
  }, 120_000);

  it("two concurrent coupon writes with the same expected revision: one success, one stale", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const harness = await seedPromotionsHarness(database.connectionString, openHandles);
      const actor = harness.brandAdminPrincipal;
      const promo = await createReadyDraftPromotion(harness, {
        code: uniqueCode("crace"),
        triggerType: "coupon",
      });
      await harness.persistence.transaction((tx) =>
        activatePromotion(tx, {
          actor,
          promotionId: promo.id,
          expectedPromotionRevision: promo.revision,
        }),
      );
      const created = await harness.persistence.transaction((tx) =>
        createCouponDraft(tx, {
          actor,
          promotionId: promo.id,
          origin: "manual",
          canonicalCode: uniqueCode("RACE").toUpperCase().replace(/-/g, "").slice(0, 12),
        }),
      );

      const first = harness.persistence.transaction((tx) =>
        updateCouponDraft(tx, {
          actor,
          couponId: created.id,
          expectedCouponRevision: created.revision,
          maximumRedemptions: 3,
        }),
      );
      const second = harness.persistence.transaction((tx) =>
        updateCouponDraft(tx, {
          actor,
          couponId: created.id,
          expectedCouponRevision: created.revision,
          maximumRedemptions: 7,
        }),
      );
      const settled = await Promise.allSettled([first, second]);
      settled.forEach(assertNoDeadlock);
      const fulfilled = settled.filter((r) => r.status === "fulfilled");
      const rejected = settled.filter((r) => r.status === "rejected");
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(PromotionAdminError);
      expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({
        code: "COUPON_STALE_REVISION",
      });
      const row = await harness.persistence.withContext((ctx) => getCoupon(ctx, created.id));
      expect(row?.revision).toBe(created.revision + BigInt(1));
      expect([3, 7]).toContain(row?.maximumRedemptions);
    });
  }, 120_000);
});
