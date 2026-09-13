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
