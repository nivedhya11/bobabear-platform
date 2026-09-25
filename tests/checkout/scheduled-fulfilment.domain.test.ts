/**
 * IMP-036I Tranche 2 — scheduling eligibility through Checkout evaluation.
 */
import { afterEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";

import { pauseOutlet, replaceOutletOperatingSchedule, setVariantAvailability } from "../../src/server/assortment";
import {
  evaluateCheckout,
  prepareCheckoutForPayment,
  setCheckoutDestination,
  setCheckoutFulfilment,
  setCheckoutFulfilmentTiming,
  startCheckout,
} from "../../src/server/checkout";
import { CheckoutError } from "../../src/shared/checkout";
import { upsertOutletPickupProfile } from "../../src/server/outlet-pickup-profile/repository";
import {
  insertOutletOperatingDateException,
  saveOutletSchedulingProfile,
  updateBrandScheduledFulfilmentPolicy,
} from "../../src/server/scheduled-fulfilment/foundations";
import { closeTrackedPersistenceHandles } from "../database/support/cart-fixtures";
import {
  checkoutOpts,
  FIXED_NOW,
  withCheckoutReadyHarness,
} from "../database/support/checkout-fixtures";
import { seedPickupEligibleOutlet } from "../database/support/order-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

const WINDOW_START = new Date("2026-08-09T12:30:00.000Z");
const WINDOW_END = new Date("2026-08-09T13:00:00.000Z");
const LATER_START = new Date("2026-08-09T13:30:00.000Z");
const LATER_END = new Date("2026-08-09T14:00:00.000Z");

async function allowScheduled(
  persistence: Parameters<typeof saveOutletSchedulingProfile>[0],
  outletId: string,
  pickupMinLeadMinutes = 30,
  deliveryMinLeadMinutes = 30,
) {
  await saveOutletSchedulingProfile(persistence, {
    outletId,
    pickupMinLeadMinutes,
    deliveryMinLeadMinutes,
    now: FIXED_NOW,
  });
}

describe("IMP-036I tranche 2 scheduling eligibility", () => {
  it("seals DELIVERY+SCHEDULED and leaves DELIVERY+ASAP scheduled fields null", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const outletId = h.actors.tree.outletA.id;
      await allowScheduled(h.persistence, outletId);
      const opts = checkoutOpts();
      const started = await startCheckout(
        h.persistence,
        h.actors.customerA,
        { cartId: h.cartId },
        opts,
      );
      const withDest = await setCheckoutDestination(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: started.id,
          expectedCheckoutRevision: started.revision,
          destination: { kind: "SAVED_ADDRESS", savedAddressId: h.addressId },
        },
        opts,
      );
      const asap = await evaluateCheckout(
        h.persistence,
        h.actors.customerA,
        { checkoutId: withDest.id, expectedCheckoutRevision: withDest.revision },
        opts,
      );
      expect(asap.snapshot.fulfilmentTiming).toBe("ASAP");
      expect(asap.snapshot.scheduledWindowStartAt).toBeNull();
      expect(asap.snapshot.scheduledWindowEndAt).toBeNull();
      expect(asap.snapshot.scheduledTimezone).toBeNull();
      expect(asap.snapshot.scheduledCancellationCutoffMinutes).toBeNull();
      expect(asap.snapshot.destination).not.toBeNull();
      expect(asap.snapshot.serviceabilityEvaluatedAt).not.toBeNull();

      const scheduledIntent = await setCheckoutFulfilmentTiming(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: asap.checkout.id,
          expectedCheckoutRevision: asap.checkout.revision,
          fulfilmentTiming: "SCHEDULED",
          scheduledWindowStartAt: WINDOW_START,
          scheduledWindowEndAt: WINDOW_END,
        },
        opts,
      );
      expect(scheduledIntent.status).toBe("DRAFT");
      expect(scheduledIntent.revision).toBe(asap.checkout.revision + BigInt(1));

      const scheduled = await evaluateCheckout(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: scheduledIntent.id,
          expectedCheckoutRevision: scheduledIntent.revision,
        },
        opts,
      );
      expect(scheduled.checkout.status).toBe("READY_FOR_PAYMENT");
      expect(scheduled.snapshot.fulfilmentMode).toBe("DELIVERY");
      expect(scheduled.snapshot.fulfilmentTiming).toBe("SCHEDULED");
      expect(scheduled.snapshot.scheduledWindowStartAt?.toISOString()).toBe(WINDOW_START.toISOString());
      expect(scheduled.snapshot.scheduledWindowEndAt?.toISOString()).toBe(WINDOW_END.toISOString());
      expect(scheduled.snapshot.scheduledTimezone).toBe("Asia/Kolkata");
      expect(scheduled.snapshot.scheduledCancellationCutoffMinutes).toBe(60);
      expect(scheduled.snapshot.selectedOutletId).toBe(outletId);

      const prepared = await prepareCheckoutForPayment(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: scheduled.checkout.id,
          expectedCheckoutRevision: scheduled.checkout.revision,
        },
        opts,
      );
      expect(prepared.snapshot.id).toBe(scheduled.snapshot.id);
      expect(prepared.snapshot.fulfilmentTiming).toBe("SCHEDULED");
    });
  });

  it("seals PICKUP+SCHEDULED without delivery serviceability and keeps PICKUP+ASAP null", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const outletId = h.actors.tree.outletA.id;
      await seedPickupEligibleOutlet(h.persistence, h.actors.brandAdminActor, outletId);
      await allowScheduled(h.persistence, outletId);
      const opts = checkoutOpts();
      const started = await startCheckout(
        h.persistence,
        h.actors.customerA,
        { cartId: h.cartId },
        opts,
      );
      const pickup = await setCheckoutFulfilment(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: started.id,
          expectedCheckoutRevision: started.revision,
          fulfilmentMode: "PICKUP",
          pickupOutletId: outletId,
        },
        opts,
      );
      const asap = await evaluateCheckout(
        h.persistence,
        h.actors.customerA,
        { checkoutId: pickup.id, expectedCheckoutRevision: pickup.revision },
        opts,
      );
      expect(asap.snapshot.fulfilmentMode).toBe("PICKUP");
      expect(asap.snapshot.fulfilmentTiming).toBe("ASAP");
      expect(asap.snapshot.destination).toBeNull();
      expect(asap.snapshot.serviceabilityEvaluatedAt).toBeNull();
      expect(asap.snapshot.scheduledWindowStartAt).toBeNull();
      expect(asap.snapshot.charges.some((charge) => charge.chargeCode === "delivery" && charge.amountPaise > BigInt(0))).toBe(
        false,
      );

      const scheduledIntent = await setCheckoutFulfilmentTiming(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: asap.checkout.id,
          expectedCheckoutRevision: asap.checkout.revision,
          fulfilmentTiming: "SCHEDULED",
          scheduledWindowStartAt: WINDOW_START,
          scheduledWindowEndAt: WINDOW_END,
        },
        opts,
      );
      const scheduled = await evaluateCheckout(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: scheduledIntent.id,
          expectedCheckoutRevision: scheduledIntent.revision,
        },
        opts,
      );
      expect(scheduled.snapshot.fulfilmentTiming).toBe("SCHEDULED");
      expect(scheduled.snapshot.destination).toBeNull();
      expect(scheduled.snapshot.serviceabilityEvaluatedAt).toBeNull();
      expect(scheduled.snapshot.pickupLocation).toBeTruthy();
      expect(scheduled.snapshot.scheduledTimezone).toBe("Asia/Kolkata");
      expect(scheduled.snapshot.scheduledCancellationCutoffMinutes).toBe(30);
      expect(scheduled.snapshot.scheduledWindowStartAt?.toISOString()).toBe(WINDOW_START.toISOString());
    });
  });

  it("fails closed without a scheduling profile and on lead, hours, and closure boundaries", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const outletId = h.actors.tree.outletA.id;
      const opts = checkoutOpts();
      const started = await startCheckout(
        h.persistence,
        h.actors.customerA,
        { cartId: h.cartId },
        opts,
      );
      const withDest = await setCheckoutDestination(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: started.id,
          expectedCheckoutRevision: started.revision,
          destination: { kind: "SAVED_ADDRESS", savedAddressId: h.addressId },
        },
        opts,
      );
      const unconfigured = await setCheckoutFulfilmentTiming(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: withDest.id,
          expectedCheckoutRevision: withDest.revision,
          fulfilmentTiming: "SCHEDULED",
          scheduledWindowStartAt: WINDOW_START,
          scheduledWindowEndAt: WINDOW_END,
        },
        opts,
      );
      await expect(
        evaluateCheckout(
          h.persistence,
          h.actors.customerA,
          {
            checkoutId: unconfigured.id,
            expectedCheckoutRevision: unconfigured.revision,
          },
          opts,
        ),
      ).rejects.toBeInstanceOf(CheckoutError);

      await allowScheduled(h.persistence, outletId, 30, 90);
      await expect(
        evaluateCheckout(
          h.persistence,
          h.actors.customerA,
          {
            checkoutId: unconfigured.id,
            expectedCheckoutRevision: unconfigured.revision,
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_STATE_CONFLICT" });

      const later = await setCheckoutFulfilmentTiming(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: unconfigured.id,
          expectedCheckoutRevision: unconfigured.revision,
          fulfilmentTiming: "SCHEDULED",
          scheduledWindowStartAt: LATER_START,
          scheduledWindowEndAt: LATER_END,
        },
        opts,
      );
      const ready = await evaluateCheckout(
        h.persistence,
        h.actors.customerA,
        { checkoutId: later.id, expectedCheckoutRevision: later.revision },
        opts,
      );
      expect(ready.snapshot.scheduledWindowStartAt?.toISOString()).toBe(LATER_START.toISOString());

      await h.persistence.transaction(async (tx) => {
        await replaceOutletOperatingSchedule(tx, {
          actor: h.actors.brandAdminActor,
          outletId,
          intervals: ([0, 1, 2, 3, 4, 5, 6] as const).map((dayOfWeek) => ({
            dayOfWeek,
            startMinute: 10 * 60,
            endMinute: 12 * 60,
          })),
        });
      });
      await expect(
        prepareCheckoutForPayment(
          h.persistence,
          h.actors.customerA,
          {
            checkoutId: ready.checkout.id,
            expectedCheckoutRevision: ready.checkout.revision,
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_REPRICED" });
    });
  });

  it("invalidates READY on timing changes, stale revision, mode switch, and destination change", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const outletId = h.actors.tree.outletA.id;
      await seedPickupEligibleOutlet(h.persistence, h.actors.brandAdminActor, outletId);
      await allowScheduled(h.persistence, outletId);
      const opts = checkoutOpts();
      const started = await startCheckout(
        h.persistence,
        h.actors.customerA,
        { cartId: h.cartId },
        opts,
      );
      const withDest = await setCheckoutDestination(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: started.id,
          expectedCheckoutRevision: started.revision,
          destination: { kind: "SAVED_ADDRESS", savedAddressId: h.addressId },
        },
        opts,
      );
      const timed = await setCheckoutFulfilmentTiming(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: withDest.id,
          expectedCheckoutRevision: withDest.revision,
          fulfilmentTiming: "SCHEDULED",
          scheduledWindowStartAt: WINDOW_START,
          scheduledWindowEndAt: WINDOW_END,
        },
        opts,
      );
      await expect(
        evaluateCheckout(
          h.persistence,
          h.actors.customerA,
          { checkoutId: timed.id, expectedCheckoutRevision: timed.revision - BigInt(1) },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_CONFLICT" });

      const ready = await evaluateCheckout(
        h.persistence,
        h.actors.customerA,
        { checkoutId: timed.id, expectedCheckoutRevision: timed.revision },
        opts,
      );
      const moved = await setCheckoutFulfilmentTiming(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: ready.checkout.id,
          expectedCheckoutRevision: ready.checkout.revision,
          fulfilmentTiming: "SCHEDULED",
          scheduledWindowStartAt: LATER_START,
          scheduledWindowEndAt: LATER_END,
        },
        opts,
      );
      expect(moved.status).toBe("DRAFT");
      expect(moved.revision).toBe(ready.checkout.revision + BigInt(1));

      const asap = await setCheckoutFulfilmentTiming(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: moved.id,
          expectedCheckoutRevision: moved.revision,
          fulfilmentTiming: "ASAP",
        },
        opts,
      );
      expect(asap.fulfilmentTiming).toBe("ASAP");
      expect(asap.scheduledWindowStartAt).toBeNull();

      const retimed = await setCheckoutFulfilmentTiming(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: asap.id,
          expectedCheckoutRevision: asap.revision,
          fulfilmentTiming: "SCHEDULED",
          scheduledWindowStartAt: WINDOW_START,
          scheduledWindowEndAt: WINDOW_END,
        },
        opts,
      );
      const scheduledReady = await evaluateCheckout(
        h.persistence,
        h.actors.customerA,
        { checkoutId: retimed.id, expectedCheckoutRevision: retimed.revision },
        opts,
      );
      const switched = await setCheckoutFulfilment(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: scheduledReady.checkout.id,
          expectedCheckoutRevision: scheduledReady.checkout.revision,
          fulfilmentMode: "PICKUP",
          pickupOutletId: outletId,
        },
        opts,
      );
      expect(switched.status).toBe("DRAFT");
      expect(switched.fulfilmentMode).toBe("PICKUP");
      expect(switched.fulfilmentTiming).toBe("SCHEDULED");

      const pickupReady = await evaluateCheckout(
        h.persistence,
        h.actors.customerA,
        { checkoutId: switched.id, expectedCheckoutRevision: switched.revision },
        opts,
      );
      expect(pickupReady.snapshot.destination).toBeNull();
      const movedOutlet = await setCheckoutFulfilment(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: pickupReady.checkout.id,
          expectedCheckoutRevision: pickupReady.checkout.revision,
          fulfilmentMode: "PICKUP",
          pickupOutletId: h.actors.tree.outletB.id,
        },
        opts,
      );
      expect(movedOutlet.status).toBe("DRAFT");
      expect(movedOutlet.pickupOutletId).toBe(h.actors.tree.outletB.id);
      expect(movedOutlet.fulfilmentTiming).toBe("SCHEDULED");
      await expect(
        evaluateCheckout(
          h.persistence,
          h.actors.customerA,
          { checkoutId: movedOutlet.id, expectedCheckoutRevision: movedOutlet.revision },
          opts,
        ),
      ).rejects.toMatchObject({ code: "PICKUP_OUTLET_NOT_ELIGIBLE" });
      const backToDelivery = await setCheckoutFulfilment(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: movedOutlet.id,
          expectedCheckoutRevision: movedOutlet.revision,
          fulfilmentMode: "DELIVERY",
        },
        opts,
      );
      const destinationChanged = await setCheckoutDestination(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: backToDelivery.id,
          expectedCheckoutRevision: backToDelivery.revision,
          destination: h.oneTimeDestination,
        },
        opts,
      );
      expect(destinationChanged.revision).toBe(backToDelivery.revision + BigInt(1));
      expect(destinationChanged.status).toBe("DRAFT");
    });
  });

  it("reconfirms when closure, lead, pickup profile, merchandise, or policy changes", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const outletId = h.actors.tree.outletA.id;
      await seedPickupEligibleOutlet(h.persistence, h.actors.brandAdminActor, outletId);
      await allowScheduled(h.persistence, outletId);
      const opts = checkoutOpts();
      const started = await startCheckout(
        h.persistence,
        h.actors.customerA,
        { cartId: h.cartId },
        opts,
      );
      const pickup = await setCheckoutFulfilment(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: started.id,
          expectedCheckoutRevision: started.revision,
          fulfilmentMode: "PICKUP",
          pickupOutletId: outletId,
        },
        opts,
      );
      const timed = await setCheckoutFulfilmentTiming(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: pickup.id,
          expectedCheckoutRevision: pickup.revision,
          fulfilmentTiming: "SCHEDULED",
          scheduledWindowStartAt: WINDOW_START,
          scheduledWindowEndAt: WINDOW_END,
        },
        opts,
      );
      const ready = await evaluateCheckout(
        h.persistence,
        h.actors.customerA,
        { checkoutId: timed.id, expectedCheckoutRevision: timed.revision },
        opts,
      );
      expect(ready.snapshot.scheduledCancellationCutoffMinutes).toBe(30);

      await h.persistence.transaction(async (tx) => {
        await insertOutletOperatingDateException(tx, {
          outletId,
          localDate: "2026-08-09",
          exceptionKind: "CLOSED_FULL_DAY",
          now: FIXED_NOW,
        });
      });
      await expect(
        prepareCheckoutForPayment(
          h.persistence,
          h.actors.customerA,
          {
            checkoutId: ready.checkout.id,
            expectedCheckoutRevision: ready.checkout.revision,
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_REPRICED" });

      await h.persistence.transaction(async (tx) => {
        await tx.db.execute(sql`
          delete from app.outlet_operating_date_exceptions
          where outlet_id = ${outletId}::uuid
        `);
      });
      const again = await evaluateCheckout(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: ready.checkout.id,
          expectedCheckoutRevision: ready.checkout.revision + BigInt(1),
        },
        opts,
      );
      await saveOutletSchedulingProfile(h.persistence, {
        outletId,
        pickupMinLeadMinutes: 240,
        deliveryMinLeadMinutes: 240,
        expectedRevision: BigInt(1),
        now: FIXED_NOW,
      });
      await expect(
        prepareCheckoutForPayment(
          h.persistence,
          h.actors.customerA,
          {
            checkoutId: again.checkout.id,
            expectedCheckoutRevision: again.checkout.revision,
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_REPRICED" });
    });
  });

  it("rejects disabled pickup, paused does not remove a future window, and sold-out merchandise", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const outletId = h.actors.tree.outletA.id;
      await seedPickupEligibleOutlet(h.persistence, h.actors.brandAdminActor, outletId);
      await allowScheduled(h.persistence, outletId, 30, 30);
      const opts = checkoutOpts();
      const started = await startCheckout(
        h.persistence,
        h.actors.customerA,
        { cartId: h.cartId },
        opts,
      );
      const pickup = await setCheckoutFulfilment(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: started.id,
          expectedCheckoutRevision: started.revision,
          fulfilmentMode: "PICKUP",
          pickupOutletId: outletId,
        },
        opts,
      );
      const timed = await setCheckoutFulfilmentTiming(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: pickup.id,
          expectedCheckoutRevision: pickup.revision,
          fulfilmentTiming: "SCHEDULED",
          scheduledWindowStartAt: new Date("2026-08-10T04:30:00.000Z"),
          scheduledWindowEndAt: new Date("2026-08-10T05:00:00.000Z"),
        },
        opts,
      );
      await h.persistence.transaction(async (tx) => {
        await pauseOutlet(tx, { actor: h.actors.brandAdminActor, outletId, pausedUntil: null });
      });
      const pausedStillEligible = await evaluateCheckout(
        h.persistence,
        h.actors.customerA,
        { checkoutId: timed.id, expectedCheckoutRevision: timed.revision },
        opts,
      );
      expect(pausedStillEligible.snapshot.fulfilmentTiming).toBe("SCHEDULED");

      await h.persistence.transaction(async (tx) => {
        await upsertOutletPickupProfile(tx, {
          outletId,
          enabled: false,
          displayName: "Pickup Counter",
          addressLine1: "12 Mall Road",
          addressLine2: null,
          locality: "Rajpur",
          city: "Dehradun",
          stateCode: "IN-UT",
          postalCode: "248001",
          latitude: null,
          longitude: null,
          instructions: "Ask at counter for BOBA order.",
          expectedRevision: 1,
        });
      });
      await expect(
        prepareCheckoutForPayment(
          h.persistence,
          h.actors.customerA,
          {
            checkoutId: pausedStillEligible.checkout.id,
            expectedCheckoutRevision: pausedStillEligible.checkout.revision,
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_REPRICED" });

      await h.persistence.transaction(async (tx) => {
        await upsertOutletPickupProfile(tx, {
          outletId,
          enabled: true,
          displayName: "Pickup Counter",
          addressLine1: "12 Mall Road",
          addressLine2: null,
          locality: "Rajpur",
          city: "Dehradun",
          stateCode: "IN-UT",
          postalCode: "248001",
          latitude: null,
          longitude: null,
          instructions: "Ask at counter for BOBA order.",
          expectedRevision: 2,
        });
      });
      const restored = await evaluateCheckout(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: pausedStillEligible.checkout.id,
          expectedCheckoutRevision: pausedStillEligible.checkout.revision + BigInt(1),
        },
        opts,
      );
      await h.persistence.transaction(async (tx) => {
        await setVariantAvailability(tx, {
          actor: h.actors.brandAdminActor,
          outletId,
          variantId: h.catalog.variantId,
          state: "sold_out",
          unavailableUntil: null,
        });
      });
      await expect(
        prepareCheckoutForPayment(
          h.persistence,
          h.actors.customerA,
          {
            checkoutId: restored.checkout.id,
            expectedCheckoutRevision: restored.checkout.revision,
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_REPRICED" });
    });
  });

  it("reconfirms when Brand cancellation policy changes before payment preparation", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const outletId = h.actors.tree.outletA.id;
      await allowScheduled(h.persistence, outletId);
      const opts = checkoutOpts();
      const started = await startCheckout(
        h.persistence,
        h.actors.customerA,
        { cartId: h.cartId },
        opts,
      );
      const withDest = await setCheckoutDestination(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: started.id,
          expectedCheckoutRevision: started.revision,
          destination: { kind: "SAVED_ADDRESS", savedAddressId: h.addressId },
        },
        opts,
      );
      const timed = await setCheckoutFulfilmentTiming(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: withDest.id,
          expectedCheckoutRevision: withDest.revision,
          fulfilmentTiming: "SCHEDULED",
          scheduledWindowStartAt: WINDOW_START,
          scheduledWindowEndAt: WINDOW_END,
        },
        opts,
      );
      const ready = await evaluateCheckout(
        h.persistence,
        h.actors.customerA,
        { checkoutId: timed.id, expectedCheckoutRevision: timed.revision },
        opts,
      );
      expect(ready.snapshot.scheduledCancellationCutoffMinutes).toBe(60);
      const sealedId = ready.snapshot.id;
      await updateBrandScheduledFulfilmentPolicy(h.persistence, {
        brandId: h.actors.tree.brand.id,
        expectedRevision: BigInt(0),
        pickupCancellationCutoffMinutes: 30,
        deliveryCancellationCutoffMinutes: 90,
        now: FIXED_NOW,
      });
      await expect(
        prepareCheckoutForPayment(
          h.persistence,
          h.actors.customerA,
          {
            checkoutId: ready.checkout.id,
            expectedCheckoutRevision: ready.checkout.revision,
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_REPRICED" });
      const sealed = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
            select fulfilment_timing, scheduled_cancellation_cutoff_minutes
            from app.checkout_snapshots
            where id = ${sealedId}::uuid
          `);
        return rows.rows[0] as
          | { fulfilment_timing: string; scheduled_cancellation_cutoff_minutes: number }
          | undefined;
      });
      expect(sealed?.fulfilment_timing).toBe("SCHEDULED");
      expect(Number(sealed?.scheduled_cancellation_cutoff_minutes)).toBe(60);
    });
  });
});
