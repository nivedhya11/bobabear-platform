/**
 * IMP-036I Tranche 3 — customer timing transport and brand/outlet config.
 */
import { afterEach, describe, expect, it } from "vitest";

import { AdministrationError } from "../../src/server/administration/errors";
import {
  adminGetBrandScheduledCancellationPolicy,
  adminUpdateBrandScheduledCancellationPolicy,
} from "../../src/server/administration";
import {
  evaluateCheckout,
  listCheckoutScheduledWindows,
  setCheckoutDestination,
  setCheckoutFulfilment,
  setCustomerCheckoutFulfilmentTiming,
  startCheckout,
} from "../../src/server/checkout";
import { CheckoutError } from "../../src/shared/checkout";
import {
  insertOutletOperatingDateException,
  listOutletOperatingDateExceptions,
  resolveBrandScheduledFulfilmentPolicy,
  saveOutletSchedulingProfile,
  ScheduledFulfilmentError,
} from "../../src/server/scheduled-fulfilment/foundations";
import { closeTrackedPersistenceHandles } from "../database/support/cart-fixtures";
import { seedPickupEligibleOutlet } from "../database/support/order-fixtures";
import {
  checkoutOpts,
  FIXED_NOW,
  withCheckoutReadyHarness,
} from "../database/support/checkout-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

const WINDOW_START = new Date("2026-08-09T12:30:00.000Z");
const WINDOW_END = new Date("2026-08-09T13:00:00.000Z");

describe("IMP-036I tranche 3 surfaces", () => {
  it("returns server windows and rejects a client-manufactured window", async () => {
    await withCheckoutReadyHarness(async (h) => {
      await saveOutletSchedulingProfile(h.persistence, {
        outletId: h.actors.tree.outletA.id,
        pickupMinLeadMinutes: 30,
        deliveryMinLeadMinutes: 30,
        now: FIXED_NOW,
      });
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
      const listed = await listCheckoutScheduledWindows(
        h.persistence,
        h.actors.customerA,
        { checkoutId: withDest.id },
        opts,
      );
      expect(listed.availability).toBe("AVAILABLE");
      expect(listed.windows.length).toBeGreaterThan(0);
      expect(listed.windows.every((window) => window.timeZone === "Asia/Kolkata")).toBe(true);
      const chosen = listed.windows[0]!;

      const scheduled = await setCustomerCheckoutFulfilmentTiming(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: withDest.id,
          expectedCheckoutRevision: withDest.revision,
          fulfilmentTiming: "SCHEDULED",
          scheduledWindowStartAt: new Date(chosen.startAt).toISOString(),
          scheduledWindowEndAt: new Date(chosen.endAt).toISOString(),
        },
        opts,
      );
      const evaluated = await evaluateCheckout(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: scheduled.id,
          expectedCheckoutRevision: scheduled.revision,
        },
        opts,
      );
      expect(evaluated.snapshot.fulfilmentTiming).toBe("SCHEDULED");
      expect(evaluated.snapshot.scheduledCancellationCutoffMinutes).toBe(60);

      await expect(
        setCustomerCheckoutFulfilmentTiming(
          h.persistence,
          h.actors.customerA,
          {
            checkoutId: evaluated.checkout.id,
            expectedCheckoutRevision: evaluated.checkout.revision,
            fulfilmentTiming: "SCHEDULED",
            scheduledWindowStartAt: "1999-01-01T00:00:00.000Z",
            scheduledWindowEndAt: "1999-01-01T00:30:00.000Z",
          },
          opts,
        ),
      ).rejects.toBeInstanceOf(CheckoutError);

      await expect(
        listCheckoutScheduledWindows(
          h.persistence,
          h.actors.customerB,
          { checkoutId: withDest.id },
          opts,
        ),
      ).rejects.toBeInstanceOf(CheckoutError);
    });
  });

  it("returns no times when the outlet profile is absent", async () => {
    await withCheckoutReadyHarness(async (h) => {
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
      const listed = await listCheckoutScheduledWindows(
        h.persistence,
        h.actors.customerA,
        { checkoutId: withDest.id },
        opts,
      );
      expect(listed.availability).toBe("NO_TIMES");
      expect(listed.windows).toEqual([]);
    });
  });

  it("exposes brand cutoff defaults, CAS, and independent range checks", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const brandId = h.actors.tree.brand.id;
      const absent = await adminGetBrandScheduledCancellationPolicy(
        h.persistence,
        h.actors.brandAdminActor,
        brandId,
      );
      expect(absent).toMatchObject({
        pickupCancellationCutoffMinutes: 30,
        deliveryCancellationCutoffMinutes: 60,
        revision: BigInt(0),
        source: "PRODUCT_DEFAULT",
      });

      const first = await adminUpdateBrandScheduledCancellationPolicy(
        h.persistence,
        h.actors.brandAdminActor,
        brandId,
        { expectedRevision: 0, pickupCancellationCutoffMinutes: 0 },
      );
      expect(first.revision).toBe(BigInt(1));
      expect(first.pickupCancellationCutoffMinutes).toBe(0);
      expect(first.deliveryCancellationCutoffMinutes).toBe(60);

      const second = await adminUpdateBrandScheduledCancellationPolicy(
        h.persistence,
        h.actors.brandAdminActor,
        brandId,
        { expectedRevision: 1, deliveryCancellationCutoffMinutes: 240 },
      );
      expect(second.pickupCancellationCutoffMinutes).toBe(0);
      expect(second.deliveryCancellationCutoffMinutes).toBe(240);
      expect(second.revision).toBe(BigInt(2));

      await expect(
        adminUpdateBrandScheduledCancellationPolicy(
          h.persistence,
          h.actors.brandAdminActor,
          brandId,
          { expectedRevision: 1, pickupCancellationCutoffMinutes: 15 },
        ),
      ).rejects.toMatchObject({ code: "ADMIN_CONFLICT" });
      await expect(
        adminUpdateBrandScheduledCancellationPolicy(
          h.persistence,
          h.actors.brandAdminActor,
          brandId,
          { expectedRevision: 2, pickupCancellationCutoffMinutes: -1 },
        ),
      ).rejects.toBeInstanceOf(AdministrationError);
      await expect(
        adminUpdateBrandScheduledCancellationPolicy(
          h.persistence,
          h.actors.brandAdminActor,
          brandId,
          { expectedRevision: 2, deliveryCancellationCutoffMinutes: 241 },
        ),
      ).rejects.toBeInstanceOf(AdministrationError);
      await expect(
        adminUpdateBrandScheduledCancellationPolicy(
          h.persistence,
          h.actors.brandAdminActor,
          h.actors.otherTree.brand.id,
          { expectedRevision: 0, pickupCancellationCutoffMinutes: 10 },
        ),
      ).rejects.toThrow(/Authorization denied/);

      const unchanged = await h.persistence.withContext((context) =>
        resolveBrandScheduledFulfilmentPolicy(context, brandId),
      );
      expect(unchanged.pickupCancellationCutoffMinutes).toBe(0);
      expect(unchanged.deliveryCancellationCutoffMinutes).toBe(240);
    });
  });

  it("saves lead time and a future full-day closure without an outlet cutoff", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const outletId = h.actors.tree.outletA.id;
      await saveOutletSchedulingProfile(h.persistence, {
        outletId,
        pickupMinLeadMinutes: 45,
        deliveryMinLeadMinutes: 90,
        now: FIXED_NOW,
      });
      await expect(
        saveOutletSchedulingProfile(h.persistence, {
          outletId,
          pickupMinLeadMinutes: 0,
          deliveryMinLeadMinutes: 90,
          now: FIXED_NOW,
        }),
      ).rejects.toBeInstanceOf(ScheduledFulfilmentError);
      const saved = await h.persistence.transaction((tx) =>
        insertOutletOperatingDateException(tx, {
          outletId,
          localDate: "2026-09-26",
          exceptionKind: "CLOSED_FULL_DAY",
        }),
      );
      expect(saved.exceptionKind).toBe("CLOSED_FULL_DAY");
      const listed = await h.persistence.withContext((context) =>
        listOutletOperatingDateExceptions(context, outletId),
      );
      expect(listed.map((row) => row.localDate)).toContain("2026-09-26");
    });
  });

  it("lets pickup scheduled checkout proceed without a delivery destination", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const outletId = h.actors.tree.outletA.id;
      await seedPickupEligibleOutlet(h.persistence, h.actors.brandAdminActor, outletId);
      await saveOutletSchedulingProfile(h.persistence, {
        outletId,
        pickupMinLeadMinutes: 30,
        deliveryMinLeadMinutes: 30,
        now: FIXED_NOW,
      });
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
      const listed = await listCheckoutScheduledWindows(
        h.persistence,
        h.actors.customerA,
        { checkoutId: pickup.id },
        opts,
      );
      expect(listed.availability).toBe("AVAILABLE");
      const chosen = listed.windows[0]!;
      const scheduled = await setCustomerCheckoutFulfilmentTiming(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: pickup.id,
          expectedCheckoutRevision: pickup.revision,
          fulfilmentTiming: "SCHEDULED",
          scheduledWindowStartAt: new Date(chosen.startAt).toISOString(),
          scheduledWindowEndAt: new Date(chosen.endAt).toISOString(),
        },
        opts,
      );
      const evaluated = await evaluateCheckout(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: scheduled.id,
          expectedCheckoutRevision: scheduled.revision,
        },
        opts,
      );
      expect(evaluated.snapshot.fulfilmentMode).toBe("PICKUP");
      expect(evaluated.snapshot.destination).toBeNull();
      expect(evaluated.snapshot.scheduledCancellationCutoffMinutes).toBe(30);
      expect(WINDOW_START).toBeInstanceOf(Date);
      expect(WINDOW_END).toBeInstanceOf(Date);
    });
  });
});
