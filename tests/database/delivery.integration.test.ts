/**
 * IMP-031 Delivery database integration — constraints, FKs, uniqueness,
 * revision persistence, and provider-cost isolation from Checkout charges.
 */
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";

import {
  beginBooking,
  beginReturn,
  advanceReturn,
  createDelivery,
  createFakeDeliveryProvider,
  failDelivery,
  recordProofAndDeliver,
  confirmPickup,
  recordProviderCostFact,
  recordProviderObservation,
} from "../../src/server/delivery";
import {
  deliveriesTable,
  deliveryProviderObservationsTable,
} from "../../src/platform/database/schema/delivery";
import { closeTrackedPersistenceHandles } from "./support/cart-fixtures";
import { withCompletedPositiveOrderHarness } from "./support/order-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

describe("IMP-031 delivery database foundation", () => {
  it("persists lifecycle + revision and enforces status CHECK", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({ defaultOutcome: "booked" });
      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-db-lifecycle",
      });
      expect(delivery.revision).toBe(BigInt(1));

      const booked = await beginBooking(
        h.persistence,
        {
          deliveryId: delivery.id,
          expectedRevision: delivery.revision,
          provider: provider.name,
        },
        { provider },
      );
      expect(booked.delivery.status).toBe("BOOKED");
      expect(booked.delivery.revision).toBe(BigInt(3));

      await expect(
        h.persistence.transaction(async (tx) => {
          await tx.db
            .update(deliveriesTable)
            .set({ status: "NOT_A_STATUS" })
            .where(sql`${deliveriesTable.id} = ${delivery.id}::uuid`);
        }),
      ).rejects.toThrow();
    });
  });

  it("enforces one-active partial UNIQUE, fingerprint UNIQUE, and correlation UNIQUE", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const first = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-db-unique",
      });

      await expect(
        h.persistence.transaction(async (tx) => {
          await tx.db.insert(deliveriesTable).values({
            id: randomUUID(),
            orderId: h.order.id,
            priorDeliveryId: null,
            requestFingerprint: "fp-db-unique-other",
            status: "REQUESTED",
            revision: BigInt(1),
            bookingCorrelationId: null,
            externalBookingReference: null,
            provider: null,
            handoffReference: null,
            proofReference: null,
            failureCode: null,
            failureReason: null,
            cancellationCode: null,
            cancellationReason: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            requestedAt: new Date(),
            bookingOutcomeUnknownAt: null,
            bookedAt: null,
            pickedUpAt: null,
            deliveredAt: null,
            failedAt: null,
            cancelledAt: null,
          });
        }),
      ).rejects.toThrow();

      await expect(
        h.persistence.transaction(async (tx) => {
          await tx.db.insert(deliveriesTable).values({
            id: randomUUID(),
            orderId: h.order.id,
            priorDeliveryId: null,
            requestFingerprint: "fp-db-unique",
            status: "CANCELLED",
            revision: BigInt(1),
            bookingCorrelationId: null,
            externalBookingReference: null,
            provider: null,
            handoffReference: null,
            proofReference: null,
            failureCode: null,
            failureReason: null,
            cancellationCode: "X",
            cancellationReason: "dup fingerprint",
            createdAt: new Date(),
            updatedAt: new Date(),
            requestedAt: new Date(),
            bookingOutcomeUnknownAt: null,
            bookedAt: null,
            pickedUpAt: null,
            deliveredAt: null,
            failedAt: null,
            cancelledAt: new Date(),
          });
        }),
      ).rejects.toThrow();

      const correlation = randomUUID();
      await failDelivery(h.persistence, {
        deliveryId: first.id,
        expectedRevision: first.revision,
        failureCode: "X",
        failureReason: "force terminal",
      });

      // Set correlation on terminal row, then try to reuse on a replacement.
      await h.persistence.transaction(async (tx) => {
        await tx.db
          .update(deliveriesTable)
          .set({ bookingCorrelationId: correlation })
          .where(sql`${deliveriesTable.id} = ${first.id}::uuid`);
      });

      const second = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-db-unique-2",
        priorDeliveryId: first.id,
      });

      await expect(
        h.persistence.transaction(async (tx) => {
          await tx.db
            .update(deliveriesTable)
            .set({
              status: "BOOKING_OUTCOME_UNKNOWN",
              revision: BigInt(2),
              bookingCorrelationId: correlation,
              bookingOutcomeUnknownAt: new Date(),
              updatedAt: new Date(),
              provider: "fake",
            })
            .where(sql`${deliveriesTable.id} = ${second.id}::uuid`);
        }),
      ).rejects.toThrow();
    });
  });

  it("enforces observation_key UNIQUE and return-active UNIQUE", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({ defaultOutcome: "booked" });
      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-db-obs",
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
      const first = await recordProviderObservation(h.persistence, {
        deliveryId: booked.delivery.id,
        expectedRevision: booked.delivery.revision,
        provider: provider.name,
        observationSource: "query",
        observationKey: "db-obs-key",
        normalizedMeaning: "BOOKING_INACTIVE_FAILED",
        failureCode: "X",
        failureReason: "failed",
      });
      expect(first.transitionApplied).toBe(true);

      await expect(
        h.persistence.transaction(async (tx) => {
          await tx.db.insert(deliveryProviderObservationsTable).values({
            id: randomUUID(),
            deliveryId: booked.delivery.id,
            provider: provider.name,
            observationSource: "query",
            observationKey: "db-obs-key",
            providerEventId: null,
            normalizedMeaning: "BOOKING_INACTIVE_FAILED",
            disposition: "APPLIED",
            payloadDigest: null,
            observedAt: new Date(),
            createdAt: new Date(),
          });
        }),
      ).rejects.toThrow();

      const ret = await beginReturn(h.persistence, {
        deliveryId: first.delivery.id,
        reason: "Customer rejected",
        returnDestination: "outlet",
        hadCourierCustody: true,
      });
      expect(ret.status).toBe("RETURN_REQUESTED");

      await expect(
        beginReturn(h.persistence, {
          deliveryId: first.delivery.id,
          reason: "Second return",
          returnDestination: "outlet",
          hadCourierCustody: true,
        }),
      ).rejects.toMatchObject({ code: "DELIVERY_RETURN_ACTIVE_EXISTS" });

      await advanceReturn(h.persistence, {
        returnId: ret.id,
        toStatus: "RETURNING",
      });
      const returned = await advanceReturn(h.persistence, {
        returnId: ret.id,
        toStatus: "RETURNED",
      });
      expect(returned.status).toBe("RETURNED");
    });
  });

  it("provider-cost facts do not mutate Checkout customer delivery charge", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const before = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select id::text as id, amount_paise::text as amount
          from app.checkout_snapshot_charges
          where snapshot_id = ${h.snapshotId}::uuid
          order by id
        `);
        return rows.rows;
      });

      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-db-cost",
      });
      await recordProviderCostFact(h.persistence, {
        deliveryId: delivery.id,
        kind: "estimated",
        amountPaise: BigInt(9999),
        provider: "fake",
      });
      await recordProviderCostFact(h.persistence, {
        deliveryId: delivery.id,
        kind: "final",
        amountPaise: BigInt(1111),
        provider: "fake",
      });

      const after = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select id::text as id, amount_paise::text as amount
          from app.checkout_snapshot_charges
          where snapshot_id = ${h.snapshotId}::uuid
          order by id
        `);
        return rows.rows;
      });
      expect(after).toEqual(before);

      const costs = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select kind, amount_paise::text as amount
          from app.delivery_provider_costs
          where delivery_id = ${delivery.id}::uuid
          order by created_at
        `);
        return rows.rows;
      });
      expect(costs).toEqual([
        { kind: "estimated", amount: "9999" },
        { kind: "final", amount: "1111" },
      ]);
    });
  });

  it("Delivery DELIVERED leaves Order row unchanged (DB-backed)", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({ defaultOutcome: "booked" });
      const before = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select status, revision::text as revision, updated_at
          from app.orders where id = ${h.order.id}::uuid
        `);
        return rows.rows[0];
      });

      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-db-order-boundary",
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
      const picked = await confirmPickup(h.persistence, {
        deliveryId: booked.delivery.id,
        expectedRevision: booked.delivery.revision,
        handoffReference: "handoff-db",
      });
      await recordProofAndDeliver(h.persistence, {
        deliveryId: picked.id,
        expectedRevision: picked.revision,
        proofReference: "proof-db",
      });

      const after = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select status, revision::text as revision, updated_at
          from app.orders where id = ${h.order.id}::uuid
        `);
        return rows.rows[0];
      });
      expect(after).toEqual(before);
      expect(after?.status).not.toBe("FULFILLED");
    });
  });

  it("rejects deliveries FK to missing Order", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await expect(
        h.persistence.transaction(async (tx) => {
          await tx.db.insert(deliveriesTable).values({
            id: randomUUID(),
            orderId: randomUUID(),
            priorDeliveryId: null,
            requestFingerprint: "fp-missing-order",
            status: "REQUESTED",
            revision: BigInt(1),
            bookingCorrelationId: null,
            externalBookingReference: null,
            provider: null,
            handoffReference: null,
            proofReference: null,
            failureCode: null,
            failureReason: null,
            cancellationCode: null,
            cancellationReason: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            requestedAt: new Date(),
            bookingOutcomeUnknownAt: null,
            bookedAt: null,
            pickedUpAt: null,
            deliveredAt: null,
            failedAt: null,
            cancelledAt: null,
          });
        }),
      ).rejects.toThrow();
    });
  });
});
