/**
 * IMP-031 Delivery genuine concurrency tests.
 *
 * Uses dual Persistence handles (two pools) so FOR UPDATE / UNIQUE races are
 * exercised across competing connections.
 */
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import {
  beginBooking,
  createDelivery,
  createFakeDeliveryProvider,
  recordProviderObservation,
} from "../../src/server/delivery";
import { DeliveryError } from "../../src/shared/delivery";
import { closeTrackedPersistenceHandles } from "../database/support/cart-fixtures";
import { secondPersistence } from "../database/support/refund-fixtures";
import { withCompletedPositiveOrderHarness } from "../database/support/order-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

describe("IMP-031 delivery concurrency", () => {
  it("competing active Delivery creates: only one active logical request succeeds", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const other = secondPersistence(h.connectionString);
      const raced = await Promise.allSettled([
        createDelivery(h.persistence, {
          orderId: h.order.id,
          requestFingerprint: "fp-race-a",
        }),
        createDelivery(other, {
          orderId: h.order.id,
          requestFingerprint: "fp-race-b",
        }),
      ]);

      const fulfilled = raced.filter((r) => r.status === "fulfilled");
      const rejected = raced.filter((r) => r.status === "rejected");
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      const err = (rejected[0] as PromiseRejectedResult).reason;
      expect(err).toBeInstanceOf(DeliveryError);
      expect((err as DeliveryError).code).toBe("DELIVERY_ACTIVE_EXISTS");
    });
  });

  it("two beginBooking mutations from same REQUESTED: one transition wins", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const providerA = createFakeDeliveryProvider({ defaultOutcome: "booked" });
      const providerB = createFakeDeliveryProvider({ defaultOutcome: "booked" });
      const other = secondPersistence(h.connectionString);

      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-begin-race",
      });

      const raced = await Promise.allSettled([
        beginBooking(
          h.persistence,
          {
            deliveryId: delivery.id,
            expectedRevision: delivery.revision,
            provider: providerA.name,
          },
          { provider: providerA },
        ),
        beginBooking(
          other,
          {
            deliveryId: delivery.id,
            expectedRevision: delivery.revision,
            provider: providerB.name,
          },
          { provider: providerB },
        ),
      ]);

      const fulfilled = raced.filter((r) => r.status === "fulfilled");
      const rejected = raced.filter((r) => r.status === "rejected");
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      // At most one createBooking should win the reservation race.
      const totalCreates =
        providerA.createBookingCallCount + providerB.createBookingCallCount;
      expect(totalCreates).toBe(1);
    });
  });

  it("duplicate concurrent observation key: one durable observation / max one transition", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({ defaultOutcome: "booked" });
      const other = secondPersistence(h.connectionString);
      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-obs-race",
      });
      const booked = await beginBooking(
        h.persistence,
        {
          deliveryId: delivery.id,
          expectedRevision: delivery.revision,
          provider: provider.name,
        },
        { provider },
      );

      const input = {
        deliveryId: booked.delivery.id,
        expectedRevision: booked.delivery.revision,
        provider: provider.name,
        observationSource: "query" as const,
        observationKey: "concurrent-obs-key",
        normalizedMeaning: "BOOKING_INACTIVE_FAILED" as const,
        failureCode: "LOST",
        failureReason: "Lost package.",
      };

      const raced = await Promise.allSettled([
        recordProviderObservation(h.persistence, input),
        recordProviderObservation(other, input),
      ]);

      const fulfilled = raced.filter(
        (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof recordProviderObservation>>> =>
          r.status === "fulfilled",
      );
      expect(fulfilled.length).toBe(2);
      const applied = fulfilled.filter((r) => r.value.transitionApplied);
      const notApplied = fulfilled.filter((r) => !r.value.transitionApplied);
      expect(applied.length).toBe(1);
      expect(notApplied.length).toBe(1);
      expect(applied[0]!.value.delivery.status).toBe("FAILED");
      expect(notApplied[0]!.value.observation.id).toBe(
        applied[0]!.value.observation.id,
      );
      expect(notApplied[0]!.value.delivery.revision).toBe(
        applied[0]!.value.delivery.revision,
      );
    });
  });

  it("stale revision fails deterministically", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({ defaultOutcome: "booked" });
      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-stale-rev",
      });
      await beginBooking(
        h.persistence,
        {
          deliveryId: delivery.id,
          expectedRevision: delivery.revision,
          provider: provider.name,
        },
        { provider },
      );

      await expect(
        beginBooking(
          h.persistence,
          {
            deliveryId: delivery.id,
            expectedRevision: delivery.revision,
            provider: provider.name,
          },
          { provider },
        ),
      ).rejects.toMatchObject({ code: "DELIVERY_REVISION_CONFLICT" });
    });
  });

  it("distinct observation keys: both durable; at most one Delivery transition", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({ defaultOutcome: "booked" });
      const other = secondPersistence(h.connectionString);
      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-obs-distinct",
      });
      const booked = await beginBooking(
        h.persistence,
        {
          deliveryId: delivery.id,
          expectedRevision: delivery.revision,
          provider: provider.name,
        },
        { provider },
      );

      const base = {
        deliveryId: booked.delivery.id,
        expectedRevision: booked.delivery.revision,
        provider: provider.name,
        observationSource: "query" as const,
        normalizedMeaning: "BOOKING_INACTIVE_FAILED" as const,
        failureCode: "LOST",
        failureReason: "Lost package.",
      };

      const raced = await Promise.allSettled([
        recordProviderObservation(h.persistence, {
          ...base,
          observationKey: "distinct-key-a",
        }),
        recordProviderObservation(other, {
          ...base,
          observationKey: "distinct-key-b",
        }),
      ]);

      const fulfilled = raced.filter(
        (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof recordProviderObservation>>> =>
          r.status === "fulfilled",
      );
      expect(fulfilled.length).toBe(2);
      const applied = fulfilled.filter((r) => r.value.transitionApplied);
      const unapplied = fulfilled.filter((r) => !r.value.transitionApplied);
      expect(applied.length).toBe(1);
      expect(unapplied.length).toBe(1);
      expect(applied[0]!.value.delivery.status).toBe("FAILED");
      expect(unapplied[0]!.value.observation.disposition).toBe(
        "UNAPPLIED_CONFLICT",
      );
      expect(unapplied[0]!.value.observation.id).not.toBe(
        applied[0]!.value.observation.id,
      );
      // Loser returns current Delivery truth after FOR UPDATE (winner's bump),
      // without applying a second transition.
      expect(applied[0]!.value.delivery.revision).toBe(
        booked.delivery.revision + BigInt(1),
      );
      expect(unapplied[0]!.value.delivery.revision).toBe(
        applied[0]!.value.delivery.revision,
      );
      expect(unapplied[0]!.value.transitionApplied).toBe(false);

      const observationCount = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select count(*)::int as n
          from app.delivery_provider_observations
          where delivery_id = ${booked.delivery.id}::uuid
        `);
        return rows.rows[0]?.n as number;
      });
      expect(observationCount).toBe(2);
    });
  });
});
