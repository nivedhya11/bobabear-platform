/**
 * IMP-036F F5 — Pricing-owned delivery tariff mutation, CAS, auth, and customer effect.
 */
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { AuthorizationError } from "../../src/server/access-control";
import { deliveryProviderCostsTable } from "../../src/platform/database/schema/delivery";
import { pricingTaxAuditEventsTable } from "../../src/platform/database/schema/pricing";
import { outletServiceabilityConfigsTable } from "../../src/platform/database/schema/serviceability";
import { PricingConflictError, PricingValidationError } from "../../src/server/pricing";
import {
  previewOutletDeliveryTariffConsequence,
  readOutletDeliveryTariff,
  updateOutletDeliveryTariff,
} from "../../src/server/pricing/delivery-tariff";
import { resolveCustomerDeliveryCharge } from "../../src/server/pricing/resolve-delivery-charge";
import { getOutletServiceabilityConfiguration } from "../../src/server/serviceability";
import type { CheckoutDestination } from "../../src/shared/checkout";
import {
  closeTrackedPersistenceHandles,
  seedOutletDistanceServiceability,
  TEST_INSIDE_COORDS,
  TEST_SERVICE_ORIGIN,
  withServiceabilityHarness,
} from "../database/support/serviceability-fixtures";

const AT = new Date("2026-09-13T12:00:00.000Z");
const BANDS = [
  { maxDistanceMeters: 7000, amountPaise: 2500 },
  { maxDistanceMeters: 9000, amountPaise: 6000 },
] as const;

function destination(): CheckoutDestination {
  return {
    destinationKind: "ONE_TIME_ADDRESS",
    sourceSavedAddressId: null,
    recipientName: "Tariff Customer",
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

function assertNoDeadlock(result: PromiseSettledResult<unknown>): void {
  if (result.status === "rejected") {
    const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
    expect(message.toLowerCase()).not.toMatch(/deadlock/);
  }
}

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

describe("IMP-036F F5 — Delivery tariff", () => {
  it("Pricing-authorized actors mutate bands/threshold under config revision CAS", async () => {
    await withServiceabilityHarness(async ({ persistence, actors }) => {
      await seedOutletDistanceServiceability(persistence, actors.brandAdminActor, actors.tree.outletA.id);
      const outletId = actors.tree.outletA.id;
      const brandId = actors.tree.brand.id;

      const before = await persistence.withContext((ctx) =>
        readOutletDeliveryTariff(ctx, { actor: actors.brandAdminActor, outletId, pathBrandId: brandId }),
      );
      expect(before.brandId).toBe(brandId);
      expect(before.deliveryFeeBands).toEqual([]);
      const geoBefore = before.geographicServiceability;
      const expected = before.expectedTariffConfigRevision;

      const preview = await persistence.withContext((ctx) =>
        previewOutletDeliveryTariffConsequence(ctx, {
          actor: actors.brandAdminActor,
          outletId,
          pathBrandId: brandId,
          proposedDeliveryFeeBands: BANDS,
          proposedFreeDeliverySubtotalThresholdPaise: 50_000,
        }),
      );
      expect(preview.expectedTariffConfigRevision).toBe(expected);
      expect(preview.wouldChangeCustomerDeliveryPrice).toBe(true);
      expect(preview.geographicServiceabilityUnchanged).toBe(true);
      expect(preview.currentFreeDeliverySubtotalThresholdPaise).toBeNull();
      expect(preview.proposedFreeDeliverySubtotalThresholdPaise).toBe("50000");

      const afterPreview = await persistence.withContext((ctx) =>
        readOutletDeliveryTariff(ctx, { actor: actors.brandAdminActor, outletId, pathBrandId: brandId }),
      );
      expect(afterPreview.expectedTariffConfigRevision).toBe(expected);
      expect(afterPreview.deliveryFeeBands).toEqual([]);

      await expect(
        persistence.transaction((tx) =>
          updateOutletDeliveryTariff(tx, {
            actor: actors.outletManagerActor,
            outletId,
            pathBrandId: brandId,
            expectedTariffConfigRevision: expected,
            deliveryFeeBands: BANDS,
            freeDeliverySubtotalThresholdPaise: null,
          }),
        ),
      ).rejects.toBeInstanceOf(AuthorizationError);

      const afterDenied = await persistence.withContext((ctx) =>
        readOutletDeliveryTariff(ctx, { actor: actors.brandAdminActor, outletId, pathBrandId: brandId }),
      );
      expect(afterDenied.expectedTariffConfigRevision).toBe(expected);
      expect(afterDenied.deliveryFeeBands).toEqual([]);

      const mutated = await persistence.transaction((tx) =>
        updateOutletDeliveryTariff(tx, {
          actor: actors.brandAdminActor,
          outletId,
          pathBrandId: brandId,
          expectedTariffConfigRevision: expected,
          deliveryFeeBands: BANDS,
          freeDeliverySubtotalThresholdPaise: 50_000,
        }),
      );
      expect(mutated.revision).toBe(BigInt(expected) + BigInt(1));

      const after = await persistence.withContext((ctx) =>
        readOutletDeliveryTariff(ctx, { actor: actors.brandAdminActor, outletId, pathBrandId: brandId }),
      );
      expect(after.deliveryFeeBands).toEqual([...BANDS]);
      expect(after.freeDeliverySubtotalThresholdPaise).toBe("50000");
      expect(after.geographicServiceability).toEqual(geoBefore);

      const svc = await getOutletServiceabilityConfiguration(persistence, actors.brandAdminActor, {
        outletId,
      });
      expect(svc.serviceOriginLatitude).toBe(TEST_SERVICE_ORIGIN.latitude);
      expect(svc.serviceOriginLongitude).toBe(TEST_SERVICE_ORIGIN.longitude);
      expect(svc.maxServiceDistanceMeters).toBe(9_000);

      const charge = await persistence.withContext((ctx) =>
        resolveCustomerDeliveryCharge(ctx, {
          brandId,
          outletId,
          destination: destination(),
          at: AT,
          prePromotionSubtotalPaise: BigInt(10_000),
        }),
      );
      expect(charge?.source).toBe("distance_band_policy");
      expect(charge?.amountPaise).toBe(BigInt(2500));

      const free = await persistence.withContext((ctx) =>
        resolveCustomerDeliveryCharge(ctx, {
          brandId,
          outletId,
          destination: destination(),
          at: AT,
          prePromotionSubtotalPaise: BigInt(50_000),
        }),
      );
      expect(free?.amountPaise).toBe(BigInt(0));

      const cleared = await persistence.transaction((tx) =>
        updateOutletDeliveryTariff(tx, {
          actor: actors.brandAdminActor,
          outletId,
          pathBrandId: brandId,
          expectedTariffConfigRevision: after.expectedTariffConfigRevision,
          deliveryFeeBands: BANDS,
          freeDeliverySubtotalThresholdPaise: null,
        }),
      );
      expect(cleared.revision).toBe(mutated.revision + BigInt(1));
      const afterClear = await persistence.withContext((ctx) =>
        resolveCustomerDeliveryCharge(ctx, {
          brandId,
          outletId,
          destination: destination(),
          at: AT,
          prePromotionSubtotalPaise: BigInt(50_000),
        }),
      );
      expect(afterClear?.amountPaise).toBe(BigInt(2500));

      await expect(
        persistence.transaction((tx) =>
          updateOutletDeliveryTariff(tx, {
            actor: actors.brandAdminActor,
            outletId,
            pathBrandId: brandId,
            expectedTariffConfigRevision: after.expectedTariffConfigRevision,
            deliveryFeeBands: [{ maxDistanceMeters: 1000, amountPaise: 100 }],
            freeDeliverySubtotalThresholdPaise: null,
          }),
        ),
      ).rejects.toBeInstanceOf(PricingConflictError);

      const prior = await persistence.withContext((ctx) =>
        readOutletDeliveryTariff(ctx, { actor: actors.brandAdminActor, outletId, pathBrandId: brandId }),
      );
      expect(prior.freeDeliverySubtotalThresholdPaise).toBeNull();
      expect(prior.deliveryFeeBands[0]?.amountPaise).toBe(2500);

      await expect(
        persistence.transaction((tx) =>
          updateOutletDeliveryTariff(tx, {
            actor: actors.brandAdminActor,
            outletId,
            pathBrandId: brandId,
            expectedTariffConfigRevision: prior.expectedTariffConfigRevision,
            deliveryFeeBands: [
              { maxDistanceMeters: 9000, amountPaise: 6000 },
              { maxDistanceMeters: 7000, amountPaise: 2500 },
            ],
            freeDeliverySubtotalThresholdPaise: null,
          }),
        ),
      ).rejects.toBeInstanceOf(PricingValidationError);
      const afterInvalid = await persistence.withContext((ctx) =>
        readOutletDeliveryTariff(ctx, { actor: actors.brandAdminActor, outletId, pathBrandId: brandId }),
      );
      expect(afterInvalid.expectedTariffConfigRevision).toBe(prior.expectedTariffConfigRevision);
      expect(afterInvalid.deliveryFeeBands).toEqual([...BANDS]);

      await expect(
        persistence.withContext((ctx) =>
          readOutletDeliveryTariff(ctx, {
            actor: actors.brandAdminActor,
            outletId: actors.otherTree.outletA.id,
            pathBrandId: brandId,
          }),
        ),
      ).rejects.toMatchObject({ resourceType: "outlet" });

      const missingId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
      await expect(
        persistence.withContext((ctx) =>
          readOutletDeliveryTariff(ctx, {
            actor: actors.brandAdminActor,
            outletId: missingId,
            pathBrandId: brandId,
          }),
        ),
      ).rejects.toMatchObject({ resourceType: "outlet" });

      const providerCount = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db.select({ id: deliveryProviderCostsTable.id }).from(deliveryProviderCostsTable);
        return rows.length;
      });
      expect(providerCount).toBe(0);

      const audits = await persistence.withContext(async (ctx) =>
        ctx.db
          .select()
          .from(pricingTaxAuditEventsTable)
          .where(eq(pricingTaxAuditEventsTable.action, "delivery_tariff.updated")),
      );
      expect(audits.length).toBeGreaterThanOrEqual(2);
      expect(audits[0]?.brandId).toBe(brandId);
      expect(audits[0]?.outletId).toBe(outletId);
      expect(audits[0]?.targetType).toBe("outlet_delivery_tariff");

      const config = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db
          .select()
          .from(outletServiceabilityConfigsTable)
          .where(eq(outletServiceabilityConfigsTable.outletId, outletId));
        return rows[0];
      });
      expect(config?.serviceOriginLatitude).toBe(TEST_SERVICE_ORIGIN.latitude);
      expect(config?.maxServiceDistanceMeters).toBe(9_000);
    });
  }, 120_000);

  it("two concurrent tariff writes with the same expected revision: one success, one stale", async () => {
    await withServiceabilityHarness(async ({ persistence, actors }) => {
      await seedOutletDistanceServiceability(persistence, actors.brandAdminActor, actors.tree.outletA.id);
      const outletId = actors.tree.outletA.id;
      const brandId = actors.tree.brand.id;
      const current = await persistence.withContext((ctx) =>
        readOutletDeliveryTariff(ctx, { actor: actors.brandAdminActor, outletId, pathBrandId: brandId }),
      );

      const first = persistence.transaction((tx) =>
        updateOutletDeliveryTariff(tx, {
          actor: actors.brandAdminActor,
          outletId,
          pathBrandId: brandId,
          expectedTariffConfigRevision: current.expectedTariffConfigRevision,
          deliveryFeeBands: [{ maxDistanceMeters: 4000, amountPaise: 2000 }],
          freeDeliverySubtotalThresholdPaise: null,
        }),
      );
      const second = persistence.transaction((tx) =>
        updateOutletDeliveryTariff(tx, {
          actor: actors.brandAdminActor,
          outletId,
          pathBrandId: brandId,
          expectedTariffConfigRevision: current.expectedTariffConfigRevision,
          deliveryFeeBands: [{ maxDistanceMeters: 5000, amountPaise: 3000 }],
          freeDeliverySubtotalThresholdPaise: null,
        }),
      );
      const settled = await Promise.allSettled([first, second]);
      settled.forEach(assertNoDeadlock);
      const fulfilled = settled.filter((r) => r.status === "fulfilled");
      const rejected = settled.filter((r) => r.status === "rejected");
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(PricingConflictError);
    });
  }, 120_000);
});
