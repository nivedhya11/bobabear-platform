/**
 * IMP-031 Delivery application tests — idempotency, booking safety, recovery,
 * observation dedupe, and Order boundary (Boundary C).
 */
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";

import {
  beginBooking,
  cancelDelivery,
  confirmPickup,
  createDelivery,
  createFakeDeliveryProvider,
  failDelivery,
  getDelivery,
  getOrderLifecycleSnapshot,
  recordAssignment,
  recordBookingOutcome,
  recordProofAndDeliver,
  recordProviderCostFact,
  recordProviderObservation,
  reconcileAmbiguousBooking,
} from "../../src/server/delivery";
import { DeliveryError } from "../../src/shared/delivery";
import { closeTrackedPersistenceHandles } from "../database/support/cart-fixtures";
import { withCompletedPositiveOrderHarness } from "../database/support/order-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

describe("IMP-031 delivery create idempotency", () => {
  it("same Order + fingerprint returns one logical Delivery", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const first = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-idem-1",
      });
      const second = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-idem-1",
      });
      expect(second.id).toBe(first.id);
      expect(second.revision).toBe(first.revision);
      expect(second.status).toBe("REQUESTED");
    });
  });

  it("distinct fingerprints cannot both be active for the same Order", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-a",
      });
      await expect(
        createDelivery(h.persistence, {
          orderId: h.order.id,
          requestFingerprint: "fp-b",
        }),
      ).rejects.toMatchObject({ code: "DELIVERY_ACTIVE_EXISTS" });
    });
  });

  it("terminal prior Delivery permits replacement with priorDeliveryId", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const first = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-prior",
      });
      const cancelled = await cancelDelivery(h.persistence, {
        deliveryId: first.id,
        expectedRevision: first.revision,
        cancellationCode: "OPS_CANCEL",
        cancellationReason: "Operator cancelled before booking.",
      });
      expect(cancelled.status).toBe("CANCELLED");

      const replacement = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-replacement",
        priorDeliveryId: cancelled.id,
      });
      expect(replacement.status).toBe("REQUESTED");
      expect(replacement.priorDeliveryId).toBe(cancelled.id);
      expect(replacement.id).not.toBe(cancelled.id);
    });
  });
});

describe("IMP-031 booking safety and recovery", () => {
  it("beginBooking commits UNKNOWN + correlation before provider invocation", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({ defaultOutcome: "booked" });
      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-book-1",
      });
      expect(provider.createBookingCallCount).toBe(0);

      let seenStatusDuringCreate: string | null = null;
      provider.setCreateBookingHook(async () => {
        const mid = await getDelivery(h.persistence, delivery.id);
        seenStatusDuringCreate = mid.status;
      });

      const result = await beginBooking(
        h.persistence,
        {
          deliveryId: delivery.id,
          expectedRevision: delivery.revision,
          provider: provider.name,
        },
        { provider },
      );

      expect(seenStatusDuringCreate).toBe("BOOKING_OUTCOME_UNKNOWN");
      expect(provider.createBookingCallCount).toBe(1);
      expect(result.delivery.status).toBe("BOOKED");
      expect(result.delivery.bookingCorrelationId).toBeTruthy();
      expect(result.delivery.revision).toBe(BigInt(3));
    });
  });

  it("crash after UNKNOWN commit / before provider call recovers via queryBooking only", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({ defaultOutcome: "booked" });
      provider.setCreateBookingHook(async () => {
        throw new Error("simulated crash before provider effect");
      });

      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-crash-before",
      });

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
      ).rejects.toThrow(/simulated crash/);

      const unknown = await getDelivery(h.persistence, delivery.id);
      expect(unknown.status).toBe("BOOKING_OUTCOME_UNKNOWN");
      expect(unknown.bookingCorrelationId).toBeTruthy();
      expect(provider.createBookingCallCount).toBe(1);
      expect(provider.queryBookingCallCount).toBe(0);

      // External effect never landed — clear the failed create attempt and recover.
      provider.clear();
      provider.setDefaultOutcome("failed");
      // Seed nothing: queryBooking returns FAILED for unknown correlation.

      const recovered = await reconcileAmbiguousBooking(
        h.persistence,
        {
          deliveryId: unknown.id,
          expectedRevision: unknown.revision,
        },
        { provider },
      );
      expect(provider.createBookingCallCount).toBe(0);
      expect(provider.queryBookingCallCount).toBe(1);
      expect(recovered.status).toBe("FAILED");
    });
  });

  it("provider effect + response loss recovers to BOOKED via queryBooking", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({ defaultOutcome: "booked" });
      let crashAfterEffect = true;
      provider.setCreateBookingHook(async (input) => {
        // Force the fake to store the booking, then lose the response.
        if (crashAfterEffect) {
          crashAfterEffect = false;
          // Manually create via a nested call path: store by calling through
          // after clearing the hook temporarily.
          provider.setCreateBookingHook(null);
          await provider.createBooking(input);
          throw new Error("response lost after provider effect");
        }
      });

      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-response-loss",
      });

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
      ).rejects.toThrow(/response lost/);

      const unknown = await getDelivery(h.persistence, delivery.id);
      expect(unknown.status).toBe("BOOKING_OUTCOME_UNKNOWN");

      const recovered = await reconcileAmbiguousBooking(
        h.persistence,
        {
          deliveryId: unknown.id,
          expectedRevision: unknown.revision,
        },
        { provider },
      );
      expect(recovered.status).toBe("BOOKED");
      expect(provider.queryBookingCallCount).toBeGreaterThanOrEqual(1);
      // No second create while UNKNOWN after the failed beginBooking attempt.
      expect(provider.createBookingCallCount).toBe(2); // hook path + nested store only
    });
  });

  it("ambiguous reconciliation remains UNKNOWN and never second-creates", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({
        defaultOutcome: "ambiguous",
      });
      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-ambiguous",
      });
      const begun = await beginBooking(
        h.persistence,
        {
          deliveryId: delivery.id,
          expectedRevision: delivery.revision,
          provider: provider.name,
        },
        { provider },
      );
      expect(begun.delivery.status).toBe("BOOKING_OUTCOME_UNKNOWN");
      const createsAfterBegin = provider.createBookingCallCount;

      const still = await reconcileAmbiguousBooking(
        h.persistence,
        {
          deliveryId: begun.delivery.id,
          expectedRevision: begun.delivery.revision,
        },
        { provider },
      );
      expect(still.status).toBe("BOOKING_OUTCOME_UNKNOWN");
      expect(provider.createBookingCallCount).toBe(createsAfterBegin);
      expect(provider.queryBookingCallCount).toBe(1);
    });
  });
});

describe("IMP-031 observation idempotency", () => {
  it("duplicate observationKey applies at most one authoritative transition", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({ defaultOutcome: "booked" });
      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-obs-1",
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
        observationKey: "obs-key-1",
        providerEventId: "evt-1",
        normalizedMeaning: "BOOKING_INACTIVE_FAILED",
        failureCode: "LOST",
        failureReason: "Package lost.",
      });
      expect(first.transitionApplied).toBe(true);
      expect(first.delivery.status).toBe("FAILED");

      const dup = await recordProviderObservation(h.persistence, {
        deliveryId: booked.delivery.id,
        expectedRevision: first.delivery.revision,
        provider: provider.name,
        observationSource: "query",
        observationKey: "obs-key-1",
        providerEventId: "evt-1",
        normalizedMeaning: "BOOKING_INACTIVE_FAILED",
        failureCode: "LOST",
        failureReason: "Package lost.",
      });
      expect(dup.transitionApplied).toBe(false);
      expect(dup.observation.id).toBe(first.observation.id);
      expect(dup.delivery.status).toBe("FAILED");
      expect(dup.delivery.revision).toBe(first.delivery.revision);
    });
  });

  it("duplicate observation without native event id still dedupes on observationKey", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({ defaultOutcome: "booked" });
      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-obs-2",
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
        observationSource: "manual",
        observationKey: "manual-obs-key",
        normalizedMeaning: "BOOKING_INACTIVE_FAILED",
        failureCode: "DAMAGED",
        failureReason: "Damaged in transit.",
      });
      expect(first.transitionApplied).toBe(true);

      const dup = await recordProviderObservation(h.persistence, {
        deliveryId: booked.delivery.id,
        expectedRevision: first.delivery.revision,
        provider: provider.name,
        observationSource: "manual",
        observationKey: "manual-obs-key",
        normalizedMeaning: "BOOKING_INACTIVE_FAILED",
        failureCode: "DAMAGED",
        failureReason: "Damaged in transit.",
      });
      expect(dup.transitionApplied).toBe(false);
      expect(dup.observation.id).toBe(first.observation.id);
    });
  });

  it("conflicting observation remains durable and unapplied", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({ defaultOutcome: "booked" });
      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-obs-conflict",
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
        handoffReference: "handoff-1",
      });

      const conflict = await recordProviderObservation(h.persistence, {
        deliveryId: picked.id,
        expectedRevision: picked.revision,
        provider: provider.name,
        observationSource: "query",
        observationKey: "late-cancel",
        normalizedMeaning: "CANCELLED",
        cancellationCode: "LATE",
        cancellationReason: "Late cancel after pickup.",
      });
      expect(conflict.transitionApplied).toBe(false);
      expect(conflict.observation.disposition).toMatch(/^UNAPPLIED_/);
      expect(conflict.delivery.status).toBe("PICKED_UP");
    });
  });

  it("assignment recording does not advance execution lifecycle", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({ defaultOutcome: "booked" });
      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-assign",
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
      const assigned = await recordAssignment(h.persistence, {
        deliveryId: booked.delivery.id,
        expectedRevision: booked.delivery.revision,
        provider: provider.name,
        assignmentKey: "courier-a",
        courierReference: "c-1",
      });
      expect(assigned.delivery.status).toBe("BOOKED");
      expect(assigned.delivery.revision).toBe(booked.delivery.revision);
    });
  });
});

describe("IMP-031 Order boundary", () => {
  it("Delivery DELIVERED does not mutate Order lifecycle", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({ defaultOutcome: "booked" });
      const orderBefore = await getOrderLifecycleSnapshot(
        h.persistence,
        h.order.id,
      );

      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-order-boundary",
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
        handoffReference: "handoff-boundary",
      });
      const delivered = await recordProofAndDeliver(h.persistence, {
        deliveryId: picked.id,
        expectedRevision: picked.revision,
        proofReference: "proof-boundary",
      });
      expect(delivered.status).toBe("DELIVERED");

      const orderAfter = await getOrderLifecycleSnapshot(
        h.persistence,
        h.order.id,
      );
      expect(orderAfter.status).toBe(orderBefore.status);
      expect(orderAfter.revision).toBe(orderBefore.revision);
      expect(orderAfter.updatedAt.getTime()).toBe(orderBefore.updatedAt.getTime());
      expect(orderAfter.status).not.toBe("FULFILLED");
    });
  });

  it("FAILED / CANCELLED / provider cost do not rewrite Order or Checkout charge", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({ defaultOutcome: "booked" });
      const orderBefore = await getOrderLifecycleSnapshot(
        h.persistence,
        h.order.id,
      );
      const checkoutCharge = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select coalesce(sum(amount_paise), 0)::text as total
          from app.checkout_snapshot_charges
          where snapshot_id = ${h.snapshotId}::uuid
        `);
        return rows.rows[0]?.total as string;
      });

      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-fail-boundary",
      });
      await failDelivery(h.persistence, {
        deliveryId: delivery.id,
        expectedRevision: delivery.revision,
        failureCode: "DISPATCH_FAILED",
        failureReason: "Could not dispatch.",
      });
      await recordProviderCostFact(h.persistence, {
        deliveryId: delivery.id,
        kind: "cancellation",
        amountPaise: BigInt(2500),
        provider: provider.name,
      });

      const orderAfter = await getOrderLifecycleSnapshot(
        h.persistence,
        h.order.id,
      );
      expect(orderAfter.status).toBe(orderBefore.status);
      expect(orderAfter.revision).toBe(orderBefore.revision);

      const checkoutChargeAfter = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select coalesce(sum(amount_paise), 0)::text as total
          from app.checkout_snapshot_charges
          where snapshot_id = ${h.snapshotId}::uuid
        `);
        return rows.rows[0]?.total as string;
      });
      expect(checkoutChargeAfter).toBe(checkoutCharge);
    });
  });
});

describe("IMP-031 direct booking outcome and cancellation rules", () => {
  it("recordBookingOutcome can resolve REQUESTED → BOOKED without UNKNOWN", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-direct-book",
      });
      const correlation = randomUUID();
      const booked = await recordBookingOutcome(h.persistence, {
        deliveryId: delivery.id,
        expectedRevision: delivery.revision,
        evidence: {
          outcome: "BOOKED",
          provider: "fake",
          bookingCorrelationId: correlation,
          externalBookingReference: "ext-1",
          providerStatusCode: "OK",
          providerTimestamp: new Date(),
        },
      });
      expect(booked.status).toBe("BOOKED");
      expect(booked.bookingCorrelationId).toBe(correlation);
    });
  });

  it("rejects cancel after pickup", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({ defaultOutcome: "booked" });
      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-no-cancel",
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
        handoffReference: "handoff-x",
      });
      await expect(
        cancelDelivery(h.persistence, {
          deliveryId: picked.id,
          expectedRevision: picked.revision,
          cancellationCode: "TOO_LATE",
          cancellationReason: "After pickup.",
        }),
      ).rejects.toBeInstanceOf(DeliveryError);
    });
  });
});

describe("IMP-031 safety repair — failure / cancellation / duplicate-booking", () => {
  it("rejects generic failDelivery on BOOKING_OUTCOME_UNKNOWN", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({
        defaultOutcome: "ambiguous",
      });
      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-unk-fail",
      });
      const unknown = await beginBooking(
        h.persistence,
        {
          deliveryId: delivery.id,
          expectedRevision: delivery.revision,
          provider: provider.name,
        },
        { provider },
      );
      expect(unknown.delivery.status).toBe("BOOKING_OUTCOME_UNKNOWN");

      await expect(
        failDelivery(h.persistence, {
          deliveryId: unknown.delivery.id,
          expectedRevision: unknown.delivery.revision,
          failureCode: "CALLER_FAIL",
          failureReason: "Caller-only failure must not terminalize UNKNOWN.",
        }),
      ).rejects.toMatchObject({ code: "DELIVERY_BOOKING_AMBIGUOUS" });

      const still = await getDelivery(h.persistence, unknown.delivery.id);
      expect(still.status).toBe("BOOKING_OUTCOME_UNKNOWN");
    });
  });

  it("rejects generic failDelivery on BOOKED without inactive evidence", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({ defaultOutcome: "booked" });
      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-booked-fail",
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
      expect(booked.delivery.status).toBe("BOOKED");

      await expect(
        failDelivery(h.persistence, {
          deliveryId: booked.delivery.id,
          expectedRevision: booked.delivery.revision,
          failureCode: "CALLER_FAIL",
          failureReason: "Caller-only reason must not fail BOOKED.",
        }),
      ).rejects.toMatchObject({ code: "DELIVERY_STATE_CONFLICT" });

      const still = await getDelivery(h.persistence, booked.delivery.id);
      expect(still.status).toBe("BOOKED");
    });
  });

  it("BOOKED → FAILED via BOOKING_INACTIVE_FAILED observation", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({ defaultOutcome: "booked" });
      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-booked-obs-fail",
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

      const plain = await recordProviderObservation(h.persistence, {
        deliveryId: booked.delivery.id,
        expectedRevision: booked.delivery.revision,
        provider: provider.name,
        observationSource: "query",
        observationKey: "plain-failed",
        normalizedMeaning: "FAILED",
        failureCode: "X",
        failureReason: "Plain FAILED lacks inactive confirmation.",
      });
      expect(plain.transitionApplied).toBe(false);
      expect(plain.observation.disposition).toBe("UNAPPLIED_UNSAFE");
      expect(plain.delivery.status).toBe("BOOKED");

      const applied = await recordProviderObservation(h.persistence, {
        deliveryId: booked.delivery.id,
        expectedRevision: booked.delivery.revision,
        provider: provider.name,
        observationSource: "query",
        observationKey: "inactive-failed",
        normalizedMeaning: "BOOKING_INACTIVE_FAILED",
        failureCode: "PROVIDER_FAIL",
        failureReason: "Booking confirmed inactive and failed.",
      });
      expect(applied.transitionApplied).toBe(true);
      expect(applied.delivery.status).toBe("FAILED");
    });
  });

  it("REQUESTED → CANCELLED without provider I/O", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({ defaultOutcome: "booked" });
      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-cancel-before-book",
      });
      const cancelled = await cancelDelivery(
        h.persistence,
        {
          deliveryId: delivery.id,
          expectedRevision: delivery.revision,
          cancellationCode: "OPS_CANCEL",
          cancellationReason: "Cancelled before booking.",
        },
        { provider },
      );
      expect(cancelled.status).toBe("CANCELLED");
      expect(provider.queryBookingCallCount).toBe(0);
      expect(provider.cancelBookingCallCount).toBe(0);
      expect(provider.createBookingCallCount).toBe(0);
    });
  });

  it("BOOKED cancel requires provider inactivity; caller-only reason is rejected", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({ defaultOutcome: "booked" });
      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-booked-cancel-caller",
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

      // Without provider option, disabled provider blocks unsafe terminalization.
      await expect(
        cancelDelivery(h.persistence, {
          deliveryId: booked.delivery.id,
          expectedRevision: booked.delivery.revision,
          cancellationCode: "CALLER_CANCEL",
          cancellationReason: "Caller-only cancel must not terminalize BOOKED.",
        }),
      ).rejects.toMatchObject({ code: "DELIVERY_PROVIDER_UNAVAILABLE" });

      const still = await getDelivery(h.persistence, booked.delivery.id);
      expect(still.status).toBe("BOOKED");
    });
  });

  it("BOOKED active-booking cancellation uses query then cancelBooking", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({ defaultOutcome: "booked" });
      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-booked-cancel-ok",
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

      const cancelled = await cancelDelivery(
        h.persistence,
        {
          deliveryId: booked.delivery.id,
          expectedRevision: booked.delivery.revision,
          cancellationCode: "OPS_CANCEL",
          cancellationReason: "Operator cancelled active booking.",
        },
        { provider },
      );
      expect(cancelled.status).toBe("CANCELLED");
      expect(provider.queryBookingCallCount).toBe(1);
      expect(provider.cancelBookingCallCount).toBe(1);
      expect(provider.createBookingCallCount).toBe(1);
    });
  });

  it("UNKNOWN with active booking: cancel queries, cancels, then CANCELLED", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({
        defaultOutcome: "ambiguous",
      });
      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-unk-active-cancel",
      });
      const unknown = await beginBooking(
        h.persistence,
        {
          deliveryId: delivery.id,
          expectedRevision: delivery.revision,
          provider: provider.name,
        },
        { provider },
      );
      expect(unknown.delivery.status).toBe("BOOKING_OUTCOME_UNKNOWN");
      provider.setOutcome(unknown.delivery.bookingCorrelationId!, "booked");

      const cancelled = await cancelDelivery(
        h.persistence,
        {
          deliveryId: unknown.delivery.id,
          expectedRevision: unknown.delivery.revision,
          cancellationCode: "OPS_CANCEL",
          cancellationReason: "Cancel while UNKNOWN with active booking.",
        },
        { provider },
      );
      expect(cancelled.status).toBe("CANCELLED");
      expect(provider.queryBookingCallCount).toBe(1);
      expect(provider.cancelBookingCallCount).toBe(1);
      expect(provider.createBookingCallCount).toBe(1);
    });
  });

  it("BOOKED cancel response-loss recovers via query on retry", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({ defaultOutcome: "booked" });
      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-cancel-loss-booked",
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

      provider.setCancelBookingHook(async () => {
        throw new Error("cancel response lost after external effect");
      });

      await expect(
        cancelDelivery(
          h.persistence,
          {
            deliveryId: booked.delivery.id,
            expectedRevision: booked.delivery.revision,
            cancellationCode: "OPS_CANCEL",
            cancellationReason: "First cancel attempt.",
          },
          { provider },
        ),
      ).rejects.toThrow(/cancel response lost/);

      const mid = await getDelivery(h.persistence, booked.delivery.id);
      expect(mid.status).toBe("BOOKED");
      expect(provider.cancelBookingCallCount).toBe(1);

      // Replacement must stay blocked while BOOKED.
      await expect(
        createDelivery(h.persistence, {
          orderId: h.order.id,
          requestFingerprint: "fp-replace-while-booked",
        }),
      ).rejects.toMatchObject({ code: "DELIVERY_ACTIVE_EXISTS" });

      provider.setCancelBookingHook(null);
      const queriesBefore = provider.queryBookingCallCount;
      const cancelsBefore = provider.cancelBookingCallCount;

      const cancelled = await cancelDelivery(
        h.persistence,
        {
          deliveryId: mid.id,
          expectedRevision: mid.revision,
          cancellationCode: "OPS_CANCEL",
          cancellationReason: "Retry after response loss.",
        },
        { provider },
      );
      expect(cancelled.status).toBe("CANCELLED");
      // Retry discovers inactivity via query; no second cancel needed.
      expect(provider.queryBookingCallCount).toBe(queriesBefore + 1);
      expect(provider.cancelBookingCallCount).toBe(cancelsBefore);
    });
  });

  it("UNKNOWN cancel response-loss recovers via query on retry", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({
        defaultOutcome: "ambiguous",
      });
      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-cancel-loss-unk",
      });
      const unknown = await beginBooking(
        h.persistence,
        {
          deliveryId: delivery.id,
          expectedRevision: delivery.revision,
          provider: provider.name,
        },
        { provider },
      );
      provider.setOutcome(unknown.delivery.bookingCorrelationId!, "booked");

      provider.setCancelBookingHook(async () => {
        throw new Error("UNKNOWN cancel response lost");
      });

      await expect(
        cancelDelivery(
          h.persistence,
          {
            deliveryId: unknown.delivery.id,
            expectedRevision: unknown.delivery.revision,
            cancellationCode: "OPS_CANCEL",
            cancellationReason: "First UNKNOWN cancel.",
          },
          { provider },
        ),
      ).rejects.toThrow(/UNKNOWN cancel response lost/);

      const mid = await getDelivery(h.persistence, unknown.delivery.id);
      expect(mid.status).toBe("BOOKING_OUTCOME_UNKNOWN");
      await expect(
        createDelivery(h.persistence, {
          orderId: h.order.id,
          requestFingerprint: "fp-replace-while-unk",
        }),
      ).rejects.toMatchObject({ code: "DELIVERY_ACTIVE_EXISTS" });

      provider.setCancelBookingHook(null);
      const cancelled = await cancelDelivery(
        h.persistence,
        {
          deliveryId: mid.id,
          expectedRevision: mid.revision,
          cancellationCode: "OPS_CANCEL",
          cancellationReason: "Retry UNKNOWN cancel.",
        },
        { provider },
      );
      expect(cancelled.status).toBe("CANCELLED");
      expect(provider.createBookingCallCount).toBe(1);
    });
  });

  it("ambiguous cancel leaves BOOKED / UNKNOWN active", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({ defaultOutcome: "booked" });
      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-ambig-cancel",
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

      // After cancel mutates to cancelled, force ambiguous query path by
      // resetting outcome to ambiguous via hook after cancel — simulate
      // cancel returning AMBIGUOUS by setting outcome ambiguous then having
      // cancelBooking restore ambiguous without confirming inactive.
      provider.setCancelBookingHook(async (input) => {
        provider.setOutcome(input.bookingCorrelationId, "ambiguous");
      });

      await expect(
        cancelDelivery(
          h.persistence,
          {
            deliveryId: booked.delivery.id,
            expectedRevision: booked.delivery.revision,
            cancellationCode: "OPS_CANCEL",
            cancellationReason: "Ambiguous cancel must not fabricate CANCELLED.",
          },
          { provider },
        ),
      ).rejects.toMatchObject({ code: "DELIVERY_BOOKING_AMBIGUOUS" });

      const still = await getDelivery(h.persistence, booked.delivery.id);
      expect(still.status).toBe("BOOKED");
      await expect(
        createDelivery(h.persistence, {
          orderId: h.order.id,
          requestFingerprint: "fp-replace-ambig",
        }),
      ).rejects.toMatchObject({ code: "DELIVERY_ACTIVE_EXISTS" });
    });
  });

  it("duplicate-booking exploit: generic fail/cancel cannot unlock replacement", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({
        defaultOutcome: "ambiguous",
      });
      const deliveryA = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-exploit-a",
      });
      const unknown = await beginBooking(
        h.persistence,
        {
          deliveryId: deliveryA.id,
          expectedRevision: deliveryA.revision,
          provider: provider.name,
        },
        { provider },
      );
      expect(unknown.delivery.status).toBe("BOOKING_OUTCOME_UNKNOWN");
      // Externally active booking remains possible.
      provider.setOutcome(unknown.delivery.bookingCorrelationId!, "booked");
      const createsAfterBegin = provider.createBookingCallCount;

      await expect(
        failDelivery(h.persistence, {
          deliveryId: unknown.delivery.id,
          expectedRevision: unknown.delivery.revision,
          failureCode: "EXPLOIT",
          failureReason: "Must not unlock replacement.",
        }),
      ).rejects.toMatchObject({ code: "DELIVERY_BOOKING_AMBIGUOUS" });

      // Generic cancel without confirmed inactivity (ambiguous cancel path):
      // query finds active, cancel succeeds — that is the valid path.
      // For the exploit, use disabled/no-provider cancel attempt:
      await expect(
        cancelDelivery(h.persistence, {
          deliveryId: unknown.delivery.id,
          expectedRevision: unknown.delivery.revision,
          cancellationCode: "EXPLOIT",
          cancellationReason: "Must not terminalize without evidence.",
        }),
      ).rejects.toMatchObject({ code: "DELIVERY_PROVIDER_UNAVAILABLE" });

      const stillA = await getDelivery(h.persistence, unknown.delivery.id);
      expect(stillA.status).toBe("BOOKING_OUTCOME_UNKNOWN");

      await expect(
        createDelivery(h.persistence, {
          orderId: h.order.id,
          requestFingerprint: "fp-exploit-b",
        }),
      ).rejects.toMatchObject({ code: "DELIVERY_ACTIVE_EXISTS" });

      // beginBooking on a hypothetical replacement cannot happen; prove no
      // second create while A is UNKNOWN.
      expect(provider.createBookingCallCount).toBe(createsAfterBegin);

      // Legitimate replacement only after authoritative inactivity.
      const cancelled = await cancelDelivery(
        h.persistence,
        {
          deliveryId: stillA.id,
          expectedRevision: stillA.revision,
          cancellationCode: "OPS_CANCEL",
          cancellationReason: "Authoritative cancel after evidence.",
        },
        { provider },
      );
      expect(cancelled.status).toBe("CANCELLED");

      const replacement = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-exploit-b",
        priorDeliveryId: cancelled.id,
      });
      expect(replacement.status).toBe("REQUESTED");
      expect(replacement.id).not.toBe(cancelled.id);
    });
  });

  it("UNKNOWN → FAILED only via reconcileAmbiguousBooking query evidence", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({
        defaultOutcome: "ambiguous",
      });
      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-reconcile-fail",
      });
      const unknown = await beginBooking(
        h.persistence,
        {
          deliveryId: delivery.id,
          expectedRevision: delivery.revision,
          provider: provider.name,
        },
        { provider },
      );
      // No external booking — clear stored ambiguous so query returns FAILED.
      const correlation = unknown.delivery.bookingCorrelationId!;
      provider.clear();
      // Preserve call counters baseline after clear.
      expect(provider.createBookingCallCount).toBe(0);

      const failed = await reconcileAmbiguousBooking(
        h.persistence,
        {
          deliveryId: unknown.delivery.id,
          expectedRevision: unknown.delivery.revision,
        },
        { provider },
      );
      expect(failed.status).toBe("FAILED");
      expect(provider.queryBookingCallCount).toBe(1);
      expect(provider.createBookingCallCount).toBe(0);
      expect(correlation).toBeTruthy();
    });
  });
});