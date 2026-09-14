/**
 * IMP-036F F5 independent-review correction — closes review 5192671845 findings.
 *
 * Covers: automatic-coupon guard, post-effect promotion preview, path-Brand binding,
 * tariff safe-integer rejection, coupon code projection, coupon transition preview.
 */
import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterEach, describe, expect, inject, it } from "vitest";

import { createMembership, grantRole } from "../../src/server/access-control";
import { promotionCouponsTable } from "../../src/platform/database/schema/promotions";
import { PricingValidationError } from "../../src/server/pricing";
import {
  activateCoupon,
  activatePromotion,
  createCouponDraft,
  disableCoupon,
  enableCoupon,
  getCoupon,
  getPromotion,
  inspectBrandCoupon,
  listPromotionCoupons,
  loadApplicableAutomaticPromotions,
  previewCouponConsequence,
  previewPromotionConsequence,
  retireCoupon,
  retirePromotion,
  updateCouponDraft,
  updatePromotionDraft,
} from "../../src/server/promotions";
import {
  previewOutletDeliveryTariffConsequence,
  readOutletDeliveryTariff,
  updateOutletDeliveryTariff,
} from "../../src/server/pricing/delivery-tariff";
import { resolveCustomerDeliveryCharge } from "../../src/server/pricing/resolve-delivery-charge";
import {
  assertCouponActivationReady,
  assertLegalCouponLifecycleTransition,
  isLegalCouponLifecycleTransition,
} from "../../src/shared/promotions";
import type { CheckoutDestination } from "../../src/shared/checkout";
import {
  createEligibleWorkforceUser,
  principalFor,
  seedBrandTree,
} from "./support/access-control-fixtures";
import {
  createAndActivatePromotion,
  createReadyDraftPromotion,
  seedPromotionsHarness,
  uniqueCode,
} from "./support/promotions-fixtures";
import {
  closeTrackedPersistenceHandles,
  seedOutletDistanceServiceability,
  TEST_INSIDE_COORDS,
  withServiceabilityHarness,
} from "./support/serviceability-fixtures";
import { applyMigrations, withIsolatedTestDatabase } from "./support/test-database";

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
  await closeTrackedPersistenceHandles();
});

const AT = new Date("2026-09-13T12:00:00.000Z");
const UNSAFE = Number.MAX_SAFE_INTEGER + 1;

function destination(): CheckoutDestination {
  return {
    destinationKind: "ONE_TIME_ADDRESS",
    sourceSavedAddressId: null,
    recipientName: "F5 Customer",
    recipientPhone: "+919999999999",
    addressLine1: "1 Test Street",
    addressLine2: null,
    landmark: null,
    locality: null,
    city: "Dehradun",
    stateCode: "UK",
    postalCode: "248001",
    coordinates: TEST_INSIDE_COORDS,
    label: null,
  };
}

describe("IMP-036F F5 correction — coupon trigger + preview + brand binding", () => {
  it("A/B: rejects coupon create/activate against automatic promotions; coupon path remains valid", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const harness = await seedPromotionsHarness(database.connectionString, openHandles);
      const actor = harness.brandAdminPrincipal;

      const automatic = await createAndActivatePromotion(harness, {
        code: uniqueCode("auto"),
        triggerType: "automatic",
      });

      await expect(
        harness.persistence.transaction((tx) =>
          createCouponDraft(tx, {
            actor,
            brandId: harness.tree.brand.id,
            promotionId: automatic.id,
            origin: "manual",
            canonicalCode: "AUTOFAIL1",
          }),
        ),
      ).rejects.toMatchObject({
        message: expect.stringMatching(/coupon-triggered/i),
      });

      const couponsAfterReject = await harness.persistence.withContext(async (ctx) =>
        ctx.db
          .select()
          .from(promotionCouponsTable)
          .where(eq(promotionCouponsTable.promotionId, automatic.id)),
      );
      expect(couponsAfterReject).toHaveLength(0);

      const legacyId = randomUUID();
      const now = new Date();
      await harness.persistence.transaction(async (tx) => {
        await tx.db.insert(promotionCouponsTable).values({
          id: legacyId,
          promotionId: automatic.id,
          canonicalCode: "LEGACYAUTO1",
          origin: "manual",
          status: "draft",
          startsAt: null,
          endsAt: null,
          maximumRedemptions: null,
          maximumRedemptionsPerCustomer: null,
          activatedAt: null,
          disabledAt: null,
          retiredAt: null,
          revision: BigInt(1),
          createdAt: now,
          updatedAt: now,
        });
      });
      const beforeLegacy = await harness.persistence.withContext((ctx) => getCoupon(ctx, legacyId));
      await expect(
        harness.persistence.transaction((tx) =>
          activateCoupon(tx, {
            actor,
            brandId: harness.tree.brand.id,
            couponId: legacyId,
            expectedCouponRevision: BigInt(1),
          }),
        ),
      ).rejects.toMatchObject({
        message: expect.stringMatching(/coupon-triggered/i),
      });
      const afterLegacy = await harness.persistence.withContext((ctx) => getCoupon(ctx, legacyId));
      expect(afterLegacy?.status).toBe("draft");
      expect(afterLegacy?.revision).toBe(BigInt(1));
      expect(afterLegacy?.revision).toBe(beforeLegacy?.revision);

      const couponPromo = await createAndActivatePromotion(harness, {
        code: uniqueCode("cpn"),
        triggerType: "coupon",
      });
      const coupon = await harness.persistence.transaction((tx) =>
        createCouponDraft(tx, {
          actor,
          brandId: harness.tree.brand.id,
          promotionId: couponPromo.id,
          origin: "manual",
          canonicalCode: "VALIDCPN1",
        }),
      );
      expect(coupon.canonicalCode).toBe("VALIDCPN1");
      await harness.persistence.transaction((tx) =>
        activateCoupon(tx, {
          actor,
          brandId: harness.tree.brand.id,
          couponId: coupon.id,
          expectedCouponRevision: coupon.revision,
        }),
      );
      const customerAutos = await harness.persistence.withContext((ctx) =>
        loadApplicableAutomaticPromotions(ctx, {
          brandId: harness.tree.brand.id,
          territoryId: harness.tree.terrA.id,
          organizationId: harness.tree.orgA.id,
          outletId: harness.tree.outletA.id,
          at: AT,
        }),
      );
      expect(customerAutos.map((p) => p.id)).toContain(automatic.id);
      expect(customerAutos.map((p) => p.id)).not.toContain(couponPromo.id);
    });
  }, 180_000);

  it("C/D: promotion consequence preview describes post-effect state; illegal previews fail; no mutation", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const harness = await seedPromotionsHarness(database.connectionString, openHandles);
      const actor = harness.brandAdminPrincipal;
      const draft = await createReadyDraftPromotion(harness, { code: uniqueCode("prv") });

      const activationPreview = await harness.persistence.withContext((ctx) =>
        previewPromotionConsequence(ctx, {
          actor,
          brandId: harness.tree.brand.id,
          promotionId: draft.id,
          proposedStatus: "active",
        }),
      );
      expect(activationPreview.currentStatus).toBe("draft");
      expect(activationPreview.proposedStatus).toBe("active");
      expect(activationPreview.expectedPromotionRevision).toBe(draft.revision.toString(10));
      expect(activationPreview.customerVisibleImplication).toMatch(/Active automatic/i);
      const afterActPreview = await harness.persistence.withContext((ctx) =>
        getPromotion(ctx, draft.id),
      );
      expect(afterActPreview?.status).toBe("draft");
      expect(afterActPreview?.revision).toBe(draft.revision);

      await expect(
        harness.persistence.withContext((ctx) =>
          previewPromotionConsequence(ctx, {
            actor,
            brandId: harness.tree.brand.id,
            promotionId: draft.id,
            proposedStatus: "retired",
          }),
        ),
      ).rejects.toMatchObject({ code: "invalid_state" });

      await harness.persistence.transaction((tx) =>
        updatePromotionDraft(tx, {
          actor,
          brandId: harness.tree.brand.id,
          promotionId: draft.id,
          expectedPromotionRevision: draft.revision,
          displayName: "Mutated after review",
        }),
      );
      await expect(
        harness.persistence.transaction((tx) =>
          activatePromotion(tx, {
            actor,
            brandId: harness.tree.brand.id,
            promotionId: draft.id,
            expectedPromotionRevision: draft.revision,
          }),
        ),
      ).rejects.toMatchObject({ code: "PROMOTION_STALE_REVISION" });

      const fresh = await harness.persistence.withContext((ctx) => getPromotion(ctx, draft.id));
      await harness.persistence.transaction((tx) =>
        activatePromotion(tx, {
          actor,
          brandId: harness.tree.brand.id,
          promotionId: draft.id,
          expectedPromotionRevision: fresh!.revision,
        }),
      );

      const retirementPreview = await harness.persistence.withContext((ctx) =>
        previewPromotionConsequence(ctx, {
          actor,
          brandId: harness.tree.brand.id,
          promotionId: draft.id,
          proposedStatus: "retired",
        }),
      );
      expect(retirementPreview.currentStatus).toBe("active");
      expect(retirementPreview.proposedStatus).toBe("retired");
      expect(retirementPreview.customerVisibleImplication).toMatch(/no longer receive/i);
      const revBeforeRetire = (
        await harness.persistence.withContext((ctx) => getPromotion(ctx, draft.id))
      )!.revision;
      expect(retirementPreview.expectedPromotionRevision).toBe(revBeforeRetire.toString(10));
      const afterRetPreview = await harness.persistence.withContext((ctx) =>
        getPromotion(ctx, draft.id),
      );
      expect(afterRetPreview?.status).toBe("active");
      expect(afterRetPreview?.revision).toBe(revBeforeRetire);

      await harness.persistence.transaction((tx) =>
        retirePromotion(tx, {
          actor,
          brandId: harness.tree.brand.id,
          promotionId: draft.id,
          expectedPromotionRevision: revBeforeRetire,
        }),
      );
    });
  }, 180_000);

  it("E/F/G: foreign Brand path mutations and coupon creation are safe 404 with no mutation", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const harness = await seedPromotionsHarness(database.connectionString, openHandles);
      const otherTree = await harness.persistence.transaction((tx) => seedBrandTree(tx, "f5b"));
      const otherAdmin = await createEligibleWorkforceUser(harness.persistence);
      await harness.persistence.transaction(async (tx) => {
        const membership = await createMembership(tx, {
          workforceUserId: otherAdmin.id,
          scope: { scopeType: "brand", brandId: otherTree.brand.id },
          status: "active",
        });
        await grantRole(tx, { membershipId: membership.id, roleKey: "brand_admin" });
      });
      const actor = harness.brandAdminPrincipal;
      const otherActor = principalFor(otherAdmin.id);
      const missingId = randomUUID();

      const draft = await createReadyDraftPromotion(harness, {
        code: uniqueCode("brd"),
        triggerType: "coupon",
      });
      const before = await harness.persistence.withContext((ctx) => getPromotion(ctx, draft.id));

      await expect(
        harness.persistence.transaction((tx) =>
          updatePromotionDraft(tx, {
            actor,
            brandId: otherTree.brand.id,
            promotionId: draft.id,
            expectedPromotionRevision: draft.revision,
            displayName: "Should not apply",
          }),
        ),
      ).rejects.toMatchObject({ code: "not_found" });

      await expect(
        harness.persistence.transaction((tx) =>
          updatePromotionDraft(tx, {
            actor: otherActor,
            brandId: otherTree.brand.id,
            promotionId: draft.id,
            expectedPromotionRevision: draft.revision,
            displayName: "Probe",
          }),
        ),
      ).rejects.toMatchObject({ code: "not_found" });

      await expect(
        harness.persistence.transaction((tx) =>
          updatePromotionDraft(tx, {
            actor: otherActor,
            brandId: otherTree.brand.id,
            promotionId: missingId,
            expectedPromotionRevision: BigInt(1),
            displayName: "Missing",
          }),
        ),
      ).rejects.toMatchObject({ code: "not_found" });

      const afterForeign = await harness.persistence.withContext((ctx) =>
        getPromotion(ctx, draft.id),
      );
      expect(afterForeign?.displayName).toBe(before?.displayName);
      expect(afterForeign?.revision).toBe(before?.revision);

      await expect(
        harness.persistence.transaction((tx) =>
          updatePromotionDraft(tx, {
            actor: otherActor,
            brandId: harness.tree.brand.id,
            promotionId: draft.id,
            expectedPromotionRevision: draft.revision,
            displayName: "Denied",
          }),
        ),
      ).rejects.toThrow();

      await harness.persistence.transaction((tx) =>
        activatePromotion(tx, {
          actor,
          brandId: harness.tree.brand.id,
          promotionId: draft.id,
          expectedPromotionRevision: draft.revision,
        }),
      );
      const coupon = await harness.persistence.transaction((tx) =>
        createCouponDraft(tx, {
          actor,
          brandId: harness.tree.brand.id,
          promotionId: draft.id,
          origin: "manual",
          canonicalCode: "BRANDCPN1",
        }),
      );
      const couponBefore = await harness.persistence.withContext((ctx) =>
        getCoupon(ctx, coupon.id),
      );

      await expect(
        harness.persistence.transaction((tx) =>
          updateCouponDraft(tx, {
            actor,
            brandId: otherTree.brand.id,
            couponId: coupon.id,
            expectedCouponRevision: coupon.revision,
            maximumRedemptions: 99,
          }),
        ),
      ).rejects.toMatchObject({ code: "not_found" });

      await expect(
        harness.persistence.transaction((tx) =>
          updateCouponDraft(tx, {
            actor: otherActor,
            brandId: otherTree.brand.id,
            couponId: coupon.id,
            expectedCouponRevision: coupon.revision,
            maximumRedemptions: 99,
          }),
        ),
      ).rejects.toMatchObject({ code: "not_found" });

      await expect(
        harness.persistence.transaction((tx) =>
          createCouponDraft(tx, {
            actor,
            brandId: otherTree.brand.id,
            promotionId: draft.id,
            origin: "manual",
            canonicalCode: "WRONGBRAND",
          }),
        ),
      ).rejects.toMatchObject({ code: "not_found" });

      const couponAfter = await harness.persistence.withContext((ctx) =>
        getCoupon(ctx, coupon.id),
      );
      expect(couponAfter?.revision).toBe(couponBefore?.revision);
      expect(couponAfter?.maximumRedemptions).toBe(couponBefore?.maximumRedemptions);
      const wrongBrandRows = await harness.persistence.withContext(async (ctx) =>
        ctx.db
          .select()
          .from(promotionCouponsTable)
          .where(eq(promotionCouponsTable.canonicalCode, "WRONGBRAND")),
      );
      expect(wrongBrandRows).toHaveLength(0);

      const updated = await harness.persistence.transaction((tx) =>
        updateCouponDraft(tx, {
          actor,
          brandId: harness.tree.brand.id,
          couponId: coupon.id,
          expectedCouponRevision: coupon.revision,
          maximumRedemptions: 3,
        }),
      );
      expect(updated.revision).toBe(coupon.revision + BigInt(1));
    });
  }, 180_000);

  it("K/L/M/N: coupon projections expose canonicalCode; transition preview validates legality", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const harness = await seedPromotionsHarness(database.connectionString, openHandles);
      const otherTree = await harness.persistence.transaction((tx) => seedBrandTree(tx, "f5c"));
      const otherAdmin = await createEligibleWorkforceUser(harness.persistence);
      await harness.persistence.transaction(async (tx) => {
        const membership = await createMembership(tx, {
          workforceUserId: otherAdmin.id,
          scope: { scopeType: "brand", brandId: otherTree.brand.id },
          status: "active",
        });
        await grantRole(tx, { membershipId: membership.id, roleKey: "brand_admin" });
      });
      const actor = harness.brandAdminPrincipal;
      const otherActor = principalFor(otherAdmin.id);

      const promo = await createAndActivatePromotion(harness, {
        code: uniqueCode("code"),
        triggerType: "coupon",
      });
      const code = "CANONCODE1";
      const coupon = await harness.persistence.transaction((tx) =>
        createCouponDraft(tx, {
          actor,
          brandId: harness.tree.brand.id,
          promotionId: promo.id,
          origin: "manual",
          canonicalCode: code,
        }),
      );

      const list = await harness.persistence.withContext((ctx) =>
        listPromotionCoupons(ctx, {
          actor,
          brandId: harness.tree.brand.id,
          promotionId: promo.id,
        }),
      );
      expect(list.coupons[0]?.canonicalCode).toBe(code);

      const detail = await harness.persistence.withContext((ctx) =>
        inspectBrandCoupon(ctx, {
          actor,
          brandId: harness.tree.brand.id,
          couponId: coupon.id,
        }),
      );
      expect(detail.coupon.canonicalCode).toBe(code);

      const preview = await harness.persistence.withContext((ctx) =>
        previewCouponConsequence(ctx, {
          actor,
          brandId: harness.tree.brand.id,
          couponId: coupon.id,
          proposedStatus: "active",
        }),
      );
      expect(preview.canonicalCode).toBe(code);
      expect(preview.currentStatus).toBe("draft");
      expect(preview.proposedStatus).toBe("active");

      await expect(
        harness.persistence.withContext((ctx) =>
          inspectBrandCoupon(ctx, {
            actor: otherActor,
            brandId: otherTree.brand.id,
            couponId: coupon.id,
          }),
        ),
      ).rejects.toMatchObject({ code: "not_found" });

      await expect(
        harness.persistence.withContext((ctx) =>
          previewCouponConsequence(ctx, {
            actor,
            brandId: harness.tree.brand.id,
            couponId: coupon.id,
            proposedStatus: "disabled",
          }),
        ),
      ).rejects.toMatchObject({ code: "invalid_state" });
      await expect(
        harness.persistence.withContext((ctx) =>
          previewCouponConsequence(ctx, {
            actor,
            brandId: harness.tree.brand.id,
            couponId: coupon.id,
            proposedStatus: "retired",
          }),
        ),
      ).rejects.toMatchObject({ code: "invalid_state" });

      const revBefore = (
        await harness.persistence.withContext((ctx) => getCoupon(ctx, coupon.id))
      )!.revision;
      await harness.persistence.transaction((tx) =>
        activateCoupon(tx, {
          actor,
          brandId: harness.tree.brand.id,
          couponId: coupon.id,
          expectedCouponRevision: revBefore,
        }),
      );

      for (const proposed of ["disabled", "retired"] as const) {
        const p = await harness.persistence.withContext((ctx) =>
          previewCouponConsequence(ctx, {
            actor,
            brandId: harness.tree.brand.id,
            couponId: coupon.id,
            proposedStatus: proposed,
          }),
        );
        expect(p.proposedStatus).toBe(proposed);
        expect(p.canonicalCode).toBe(code);
      }
      await expect(
        harness.persistence.withContext((ctx) =>
          previewCouponConsequence(ctx, {
            actor,
            brandId: harness.tree.brand.id,
            couponId: coupon.id,
            proposedStatus: "active",
          }),
        ),
      ).rejects.toMatchObject({ code: "invalid_state" });

      const activeRow = await harness.persistence.withContext((ctx) => getCoupon(ctx, coupon.id));
      await harness.persistence.transaction((tx) =>
        retireCoupon(tx, {
          actor,
          brandId: harness.tree.brand.id,
          couponId: coupon.id,
          expectedCouponRevision: activeRow!.revision,
        }),
      );
      for (const proposed of ["active", "disabled", "retired", "draft"] as const) {
        await expect(
          harness.persistence.withContext((ctx) =>
            previewCouponConsequence(ctx, {
              actor,
              brandId: harness.tree.brand.id,
              couponId: coupon.id,
              proposedStatus: proposed,
            }),
          ),
        ).rejects.toMatchObject({ code: "invalid_state" });
      }
      const retired = await harness.persistence.withContext((ctx) => getCoupon(ctx, coupon.id));
      expect(retired?.status).toBe("retired");
      expect(retired?.revision).toBe(activeRow!.revision + BigInt(1));
    });
  }, 180_000);
});

describe("IMP-036F F5 residual — coupon activation-preview parity", () => {
  async function snapshotCouponPromotion(
    harness: Awaited<ReturnType<typeof seedPromotionsHarness>>,
    couponId: string,
    promotionId: string,
  ) {
    const coupon = await harness.persistence.withContext((ctx) => getCoupon(ctx, couponId));
    const promotion = await harness.persistence.withContext((ctx) => getPromotion(ctx, promotionId));
    return {
      couponStatus: coupon!.status,
      couponRevision: coupon!.revision,
      promotionStatus: promotion!.status,
      promotionRevision: promotion!.revision,
      promotionStartsAt: promotion!.startsAt.toISOString(),
      promotionEndsAt: promotion!.endsAt ? promotion!.endsAt.toISOString() : null,
    };
  }

  it("draft→active: ready parent succeeds; inactive/retired/automatic/window failures reject preview+effect without mutation", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const harness = await seedPromotionsHarness(database.connectionString, openHandles);
      const actor = harness.brandAdminPrincipal;
      const brandId = harness.tree.brand.id;
      const promoStart = new Date("2026-03-01T00:00:00.000Z");
      const promoEnd = new Date("2026-06-01T00:00:00.000Z");

      // 1 + 7: active coupon-triggered Promotion + equal/narrower Coupon window → preview+effect succeed
      const readyPromo = await createAndActivatePromotion(harness, {
        code: uniqueCode("rdy"),
        triggerType: "coupon",
        startsAt: promoStart,
        endsAt: promoEnd,
      });
      const readyCoupon = await harness.persistence.transaction((tx) =>
        createCouponDraft(tx, {
          actor,
          brandId,
          promotionId: readyPromo.id,
          origin: "manual",
          canonicalCode: "READYACT1",
          startsAt: promoStart,
          endsAt: new Date("2026-05-01T00:00:00.000Z"),
        }),
      );
      const beforeReady = await snapshotCouponPromotion(harness, readyCoupon.id, readyPromo.id);
      const readyPreview = await harness.persistence.withContext((ctx) =>
        previewCouponConsequence(ctx, {
          actor,
          brandId,
          couponId: readyCoupon.id,
          proposedStatus: "active",
        }),
      );
      expect(readyPreview.currentStatus).toBe("draft");
      expect(readyPreview.proposedStatus).toBe("active");
      expect(readyPreview.expectedCouponRevision).toBe(beforeReady.couponRevision.toString(10));
      expect(readyPreview.customerVisibleImplication).toMatch(/can redeem/i);
      const afterReadyPreview = await snapshotCouponPromotion(
        harness,
        readyCoupon.id,
        readyPromo.id,
      );
      expect(afterReadyPreview).toEqual(beforeReady);

      const activated = await harness.persistence.transaction((tx) =>
        activateCoupon(tx, {
          actor,
          brandId,
          couponId: readyCoupon.id,
          expectedCouponRevision: BigInt(readyPreview.expectedCouponRevision),
        }),
      );
      expect(activated.revision).toBe(beforeReady.couponRevision + BigInt(1));
      const afterReadyEffect = await harness.persistence.withContext((ctx) =>
        getCoupon(ctx, readyCoupon.id),
      );
      expect(afterReadyEffect?.status).toBe("active");
      expect(afterReadyEffect?.revision).toBe(activated.revision);

      // 2: draft/inactive parent Promotion → preview+effect fail, unchanged
      const draftPromo = await createReadyDraftPromotion(harness, {
        code: uniqueCode("dft"),
        triggerType: "coupon",
      });
      const draftCoupon = await harness.persistence.transaction((tx) =>
        createCouponDraft(tx, {
          actor,
          brandId,
          promotionId: draftPromo.id,
          origin: "manual",
          canonicalCode: "DRAFTPAR1",
        }),
      );
      const beforeDraft = await snapshotCouponPromotion(harness, draftCoupon.id, draftPromo.id);
      await expect(
        harness.persistence.withContext((ctx) =>
          previewCouponConsequence(ctx, {
            actor,
            brandId,
            couponId: draftCoupon.id,
            proposedStatus: "active",
          }),
        ),
      ).rejects.toMatchObject({ code: "COUPON_PROMOTION_NOT_ACTIVE" });
      await expect(
        harness.persistence.transaction((tx) =>
          activateCoupon(tx, {
            actor,
            brandId,
            couponId: draftCoupon.id,
            expectedCouponRevision: beforeDraft.couponRevision,
          }),
        ),
      ).rejects.toMatchObject({ code: "COUPON_PROMOTION_NOT_ACTIVE" });
      expect(await snapshotCouponPromotion(harness, draftCoupon.id, draftPromo.id)).toEqual(
        beforeDraft,
      );

      // 3: retired parent Promotion → preview+effect fail
      const retirePromo = await createAndActivatePromotion(harness, {
        code: uniqueCode("ret"),
        triggerType: "coupon",
      });
      const retireCoupon = await harness.persistence.transaction((tx) =>
        createCouponDraft(tx, {
          actor,
          brandId,
          promotionId: retirePromo.id,
          origin: "manual",
          canonicalCode: "RETIRED1X",
        }),
      );
      const retirePromoRevision = (
        await harness.persistence.withContext((ctx) => getPromotion(ctx, retirePromo.id))
      )!.revision;
      await harness.persistence.transaction((tx) =>
        retirePromotion(tx, {
          actor,
          brandId,
          promotionId: retirePromo.id,
          expectedPromotionRevision: retirePromoRevision,
        }),
      );
      const beforeRetired = await snapshotCouponPromotion(harness, retireCoupon.id, retirePromo.id);
      expect(beforeRetired.promotionStatus).toBe("retired");
      await expect(
        harness.persistence.withContext((ctx) =>
          previewCouponConsequence(ctx, {
            actor,
            brandId,
            couponId: retireCoupon.id,
            proposedStatus: "active",
          }),
        ),
      ).rejects.toMatchObject({ code: "COUPON_PROMOTION_NOT_ACTIVE" });
      await expect(
        harness.persistence.transaction((tx) =>
          activateCoupon(tx, {
            actor,
            brandId,
            couponId: retireCoupon.id,
            expectedCouponRevision: beforeRetired.couponRevision,
          }),
        ),
      ).rejects.toMatchObject({ code: "COUPON_PROMOTION_NOT_ACTIVE" });
      expect(await snapshotCouponPromotion(harness, retireCoupon.id, retirePromo.id)).toEqual(
        beforeRetired,
      );

      // 4: automatic Promotion + legacy Coupon row → preview+effect fail
      const automatic = await createAndActivatePromotion(harness, {
        code: uniqueCode("aut"),
        triggerType: "automatic",
      });
      const legacyId = randomUUID();
      const now = new Date();
      await harness.persistence.transaction(async (tx) => {
        await tx.db.insert(promotionCouponsTable).values({
          id: legacyId,
          promotionId: automatic.id,
          canonicalCode: "LEGACYPRV1",
          origin: "manual",
          status: "draft",
          startsAt: null,
          endsAt: null,
          maximumRedemptions: null,
          maximumRedemptionsPerCustomer: null,
          activatedAt: null,
          disabledAt: null,
          retiredAt: null,
          revision: BigInt(1),
          createdAt: now,
          updatedAt: now,
        });
      });
      const beforeLegacy = await snapshotCouponPromotion(harness, legacyId, automatic.id);
      await expect(
        harness.persistence.withContext((ctx) =>
          previewCouponConsequence(ctx, {
            actor,
            brandId,
            couponId: legacyId,
            proposedStatus: "active",
          }),
        ),
      ).rejects.toMatchObject({
        message: expect.stringMatching(/coupon-triggered/i),
      });
      await expect(
        harness.persistence.transaction((tx) =>
          activateCoupon(tx, {
            actor,
            brandId,
            couponId: legacyId,
            expectedCouponRevision: beforeLegacy.couponRevision,
          }),
        ),
      ).rejects.toMatchObject({
        message: expect.stringMatching(/coupon-triggered/i),
      });
      expect(await snapshotCouponPromotion(harness, legacyId, automatic.id)).toEqual(beforeLegacy);

      // 5: Coupon starts before Promotion → reject
      const earlyCoupon = await harness.persistence.transaction((tx) =>
        createCouponDraft(tx, {
          actor,
          brandId,
          promotionId: readyPromo.id,
          origin: "manual",
          canonicalCode: "EARLYSTRT1",
          startsAt: new Date("2026-02-01T00:00:00.000Z"),
          endsAt: new Date("2026-05-01T00:00:00.000Z"),
        }),
      );
      const beforeEarly = await snapshotCouponPromotion(harness, earlyCoupon.id, readyPromo.id);
      await expect(
        harness.persistence.withContext((ctx) =>
          previewCouponConsequence(ctx, {
            actor,
            brandId,
            couponId: earlyCoupon.id,
            proposedStatus: "active",
          }),
        ),
      ).rejects.toMatchObject({ code: "COUPON_WINDOW_INVALID" });
      await expect(
        harness.persistence.transaction((tx) =>
          activateCoupon(tx, {
            actor,
            brandId,
            couponId: earlyCoupon.id,
            expectedCouponRevision: beforeEarly.couponRevision,
          }),
        ),
      ).rejects.toMatchObject({ code: "COUPON_WINDOW_INVALID" });
      expect(await snapshotCouponPromotion(harness, earlyCoupon.id, readyPromo.id)).toEqual(
        beforeEarly,
      );

      // 6: Coupon ends after Promotion → reject
      const lateCoupon = await harness.persistence.transaction((tx) =>
        createCouponDraft(tx, {
          actor,
          brandId,
          promotionId: readyPromo.id,
          origin: "manual",
          canonicalCode: "LATEENDXX1",
          startsAt: promoStart,
          endsAt: new Date("2026-07-01T00:00:00.000Z"),
        }),
      );
      const beforeLate = await snapshotCouponPromotion(harness, lateCoupon.id, readyPromo.id);
      await expect(
        harness.persistence.withContext((ctx) =>
          previewCouponConsequence(ctx, {
            actor,
            brandId,
            couponId: lateCoupon.id,
            proposedStatus: "active",
          }),
        ),
      ).rejects.toMatchObject({ code: "COUPON_WINDOW_INVALID" });
      await expect(
        harness.persistence.transaction((tx) =>
          activateCoupon(tx, {
            actor,
            brandId,
            couponId: lateCoupon.id,
            expectedCouponRevision: beforeLate.couponRevision,
          }),
        ),
      ).rejects.toMatchObject({ code: "COUPON_WINDOW_INVALID" });
      expect(await snapshotCouponPromotion(harness, lateCoupon.id, readyPromo.id)).toEqual(
        beforeLate,
      );
    });
  }, 180_000);

  it("disabled→active re-enable: preview/effect parity with parent Promotion readiness", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const harness = await seedPromotionsHarness(database.connectionString, openHandles);
      const actor = harness.brandAdminPrincipal;
      const brandId = harness.tree.brand.id;

      const promo = await createAndActivatePromotion(harness, {
        code: uniqueCode("enb"),
        triggerType: "coupon",
        startsAt: new Date("2026-03-01T00:00:00.000Z"),
        endsAt: new Date("2026-06-01T00:00:00.000Z"),
      });
      const coupon = await harness.persistence.transaction((tx) =>
        createCouponDraft(tx, {
          actor,
          brandId,
          promotionId: promo.id,
          origin: "manual",
          canonicalCode: "REENABLE1",
          startsAt: new Date("2026-03-01T00:00:00.000Z"),
          endsAt: new Date("2026-05-15T00:00:00.000Z"),
        }),
      );
      const activateRev = (
        await harness.persistence.withContext((ctx) => getCoupon(ctx, coupon.id))
      )!.revision;
      await harness.persistence.transaction((tx) =>
        activateCoupon(tx, {
          actor,
          brandId,
          couponId: coupon.id,
          expectedCouponRevision: activateRev,
        }),
      );
      const disableRev = (
        await harness.persistence.withContext((ctx) => getCoupon(ctx, coupon.id))
      )!.revision;
      await harness.persistence.transaction((tx) =>
        disableCoupon(tx, {
          actor,
          brandId,
          couponId: coupon.id,
          expectedCouponRevision: disableRev,
        }),
      );

      // Valid re-enable while parent remains active
      const beforeEnable = await snapshotCouponPromotion(harness, coupon.id, promo.id);
      expect(beforeEnable.couponStatus).toBe("disabled");
      const enablePreview = await harness.persistence.withContext((ctx) =>
        previewCouponConsequence(ctx, {
          actor,
          brandId,
          couponId: coupon.id,
          proposedStatus: "active",
        }),
      );
      expect(enablePreview.currentStatus).toBe("disabled");
      expect(enablePreview.proposedStatus).toBe("active");
      expect(enablePreview.expectedCouponRevision).toBe(beforeEnable.couponRevision.toString(10));
      expect(await snapshotCouponPromotion(harness, coupon.id, promo.id)).toEqual(beforeEnable);

      const enabled = await harness.persistence.transaction((tx) =>
        enableCoupon(tx, {
          actor,
          brandId,
          couponId: coupon.id,
          expectedCouponRevision: BigInt(enablePreview.expectedCouponRevision),
        }),
      );
      expect(enabled.revision).toBe(beforeEnable.couponRevision + BigInt(1));
      expect(
        (await harness.persistence.withContext((ctx) => getCoupon(ctx, coupon.id)))?.status,
      ).toBe("active");

      // Disable again, retire parent → re-enable preview+effect reject
      const disableAgainRev = (
        await harness.persistence.withContext((ctx) => getCoupon(ctx, coupon.id))
      )!.revision;
      await harness.persistence.transaction((tx) =>
        disableCoupon(tx, {
          actor,
          brandId,
          couponId: coupon.id,
          expectedCouponRevision: disableAgainRev,
        }),
      );
      const retireParentRev = (
        await harness.persistence.withContext((ctx) => getPromotion(ctx, promo.id))
      )!.revision;
      await harness.persistence.transaction((tx) =>
        retirePromotion(tx, {
          actor,
          brandId,
          promotionId: promo.id,
          expectedPromotionRevision: retireParentRev,
        }),
      );
      const beforeRetiredParent = await snapshotCouponPromotion(harness, coupon.id, promo.id);
      expect(beforeRetiredParent.couponStatus).toBe("disabled");
      expect(beforeRetiredParent.promotionStatus).toBe("retired");
      await expect(
        harness.persistence.withContext((ctx) =>
          previewCouponConsequence(ctx, {
            actor,
            brandId,
            couponId: coupon.id,
            proposedStatus: "active",
          }),
        ),
      ).rejects.toMatchObject({ code: "COUPON_PROMOTION_NOT_ACTIVE" });
      await expect(
        harness.persistence.transaction((tx) =>
          enableCoupon(tx, {
            actor,
            brandId,
            couponId: coupon.id,
            expectedCouponRevision: beforeRetiredParent.couponRevision,
          }),
        ),
      ).rejects.toMatchObject({ code: "COUPON_PROMOTION_NOT_ACTIVE" });
      expect(await snapshotCouponPromotion(harness, coupon.id, promo.id)).toEqual(
        beforeRetiredParent,
      );
    });
  }, 180_000);
});

describe("IMP-036F F5 correction — coupon lifecycle rule unit", () => {
  it("enumerates legal and illegal coupon transitions", () => {
    expect(isLegalCouponLifecycleTransition("draft", "active")).toBe(true);
    expect(isLegalCouponLifecycleTransition("active", "disabled")).toBe(true);
    expect(isLegalCouponLifecycleTransition("disabled", "active")).toBe(true);
    expect(isLegalCouponLifecycleTransition("active", "retired")).toBe(true);
    expect(isLegalCouponLifecycleTransition("disabled", "retired")).toBe(true);

    expect(isLegalCouponLifecycleTransition("draft", "disabled")).toBe(false);
    expect(isLegalCouponLifecycleTransition("draft", "retired")).toBe(false);
    expect(isLegalCouponLifecycleTransition("active", "active")).toBe(false);
    expect(isLegalCouponLifecycleTransition("disabled", "disabled")).toBe(false);
    expect(isLegalCouponLifecycleTransition("retired", "active")).toBe(false);
    expect(isLegalCouponLifecycleTransition("retired", "disabled")).toBe(false);
    expect(isLegalCouponLifecycleTransition("retired", "retired")).toBe(false);

    expect(() => assertLegalCouponLifecycleTransition("retired", "active")).toThrow(/terminal/i);
    expect(() => assertLegalCouponLifecycleTransition("draft", "retired")).toThrow(
      /Illegal coupon lifecycle/i,
    );
  });

  it("assertCouponActivationReady rejects automatic / inactive / window mismatches", () => {
    const promotion = {
      triggerType: "coupon",
      status: "active",
      startsAt: new Date("2026-03-01T00:00:00.000Z"),
      endsAt: new Date("2026-06-01T00:00:00.000Z"),
    };
    expect(() =>
      assertCouponActivationReady({
        coupon: { startsAt: null, endsAt: null },
        promotion,
      }),
    ).not.toThrow();
    expect(() =>
      assertCouponActivationReady({
        coupon: { startsAt: null, endsAt: null },
        promotion: { ...promotion, triggerType: "automatic" },
      }),
    ).toThrow(/coupon-triggered/i);
    expect(() =>
      assertCouponActivationReady({
        coupon: { startsAt: null, endsAt: null },
        promotion: { ...promotion, status: "draft" },
      }),
    ).toThrow(/active promotion/i);
    expect(() =>
      assertCouponActivationReady({
        coupon: {
          startsAt: new Date("2026-02-01T00:00:00.000Z"),
          endsAt: null,
        },
        promotion,
      }),
    ).toThrow(/startsAt/i);
    expect(() =>
      assertCouponActivationReady({
        coupon: {
          startsAt: null,
          endsAt: new Date("2026-07-01T00:00:00.000Z"),
        },
        promotion,
      }),
    ).toThrow(/endsAt/i);
  });
});

describe("IMP-036F F5 correction — tariff unsafe integers", () => {
  it("H/I/J: rejects unsafe amount/distance/threshold; prior tariff and revision unchanged", async () => {
    await withServiceabilityHarness(async ({ persistence, actors }) => {
      await seedOutletDistanceServiceability(
        persistence,
        actors.brandAdminActor,
        actors.tree.outletA.id,
      );
      const outletId = actors.tree.outletA.id;
      const brandId = actors.tree.brand.id;

      const beforeSeed = await persistence.withContext((ctx) =>
        readOutletDeliveryTariff(ctx, {
          actor: actors.brandAdminActor,
          outletId,
          pathBrandId: brandId,
        }),
      );
      await persistence.transaction((tx) =>
        updateOutletDeliveryTariff(tx, {
          actor: actors.brandAdminActor,
          outletId,
          pathBrandId: brandId,
          expectedTariffConfigRevision: beforeSeed.expectedTariffConfigRevision,
          deliveryFeeBands: [
            { maxDistanceMeters: 7000, amountPaise: 2500 },
            { maxDistanceMeters: 9000, amountPaise: 6000 },
          ],
          freeDeliverySubtotalThresholdPaise: 50_000,
        }),
      );
      const before = await persistence.withContext((ctx) =>
        readOutletDeliveryTariff(ctx, {
          actor: actors.brandAdminActor,
          outletId,
          pathBrandId: brandId,
        }),
      );

      await expect(
        persistence.transaction((tx) =>
          updateOutletDeliveryTariff(tx, {
            actor: actors.brandAdminActor,
            outletId,
            pathBrandId: brandId,
            expectedTariffConfigRevision: before.expectedTariffConfigRevision,
            deliveryFeeBands: [{ maxDistanceMeters: 7000, amountPaise: UNSAFE }],
            freeDeliverySubtotalThresholdPaise: 50_000,
          }),
        ),
      ).rejects.toBeInstanceOf(PricingValidationError);

      await expect(
        persistence.transaction((tx) =>
          updateOutletDeliveryTariff(tx, {
            actor: actors.brandAdminActor,
            outletId,
            pathBrandId: brandId,
            expectedTariffConfigRevision: before.expectedTariffConfigRevision,
            deliveryFeeBands: [{ maxDistanceMeters: UNSAFE, amountPaise: 2500 }],
            freeDeliverySubtotalThresholdPaise: 50_000,
          }),
        ),
      ).rejects.toBeInstanceOf(PricingValidationError);

      await expect(
        persistence.transaction((tx) =>
          updateOutletDeliveryTariff(tx, {
            actor: actors.brandAdminActor,
            outletId,
            pathBrandId: brandId,
            expectedTariffConfigRevision: before.expectedTariffConfigRevision,
            deliveryFeeBands: before.deliveryFeeBands,
            freeDeliverySubtotalThresholdPaise: UNSAFE,
          }),
        ),
      ).rejects.toBeInstanceOf(PricingValidationError);

      const after = await persistence.withContext((ctx) =>
        readOutletDeliveryTariff(ctx, {
          actor: actors.brandAdminActor,
          outletId,
          pathBrandId: brandId,
        }),
      );
      expect(after.expectedTariffConfigRevision).toBe(before.expectedTariffConfigRevision);
      expect(after.deliveryFeeBands).toEqual(before.deliveryFeeBands);
      expect(after.freeDeliverySubtotalThresholdPaise).toBe(before.freeDeliverySubtotalThresholdPaise);

      const charge = await persistence.withContext((ctx) =>
        resolveCustomerDeliveryCharge(ctx, {
          brandId,
          outletId,
          destination: destination(),
          at: AT,
          prePromotionSubtotalPaise: BigInt(10_000),
        }),
      );
      expect(charge?.amountPaise).toBe(BigInt(2500));
      expect(charge?.amountPaise).not.toBe(BigInt(UNSAFE));

      await expect(
        persistence.withContext((ctx) =>
          previewOutletDeliveryTariffConsequence(ctx, {
            actor: actors.brandAdminActor,
            outletId,
            pathBrandId: brandId,
            proposedDeliveryFeeBands: [{ maxDistanceMeters: 7000, amountPaise: UNSAFE }],
            proposedFreeDeliverySubtotalThresholdPaise: 50_000,
          }),
        ),
      ).rejects.toBeInstanceOf(PricingValidationError);
    });
  }, 180_000);
});
