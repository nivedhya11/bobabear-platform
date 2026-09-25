/**
 * IMP-036I Tranche 2 — deterministic Scheduled payment-bind races.
 *
 * Interleavings use barriers inside startPayment / completeZeroPayableCheckout.
 * Sleeps are not the synchronization. A 400ms lock_timeout only proves that a
 * concurrent writer cannot acquire the authority lock while the bind holds it.
 */
import { readFileSync } from "node:fs";

import { eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import {
  checkoutSnapshotsTable,
  checkoutsTable,
} from "../../src/platform/database/schema/checkout";
import { paymentsTable } from "../../src/platform/database/schema/payment";
import {
  evaluateCheckout,
  setCheckoutDestination,
  setCheckoutFulfilment,
  setCheckoutFulfilmentTiming,
  startCheckout,
} from "../../src/server/checkout";
import { completeZeroPayableCheckout, startPayment } from "../../src/server/payment";
import type { PaymentOperationOptions } from "../../src/server/payment";
import {
  insertOutletOperatingDateException,
  resolveBrandScheduledFulfilmentPolicy,
  saveOutletSchedulingProfile,
  updateBrandScheduledFulfilmentPolicy,
} from "../../src/server/scheduled-fulfilment/foundations";
import {
  closeTrackedPersistenceHandles,
  FIXED_NOW,
  openTrackedApplicationPersistence,
} from "../database/support/cart-fixtures";
import { checkoutOpts, withCheckoutReadyHarness } from "../database/support/checkout-fixtures";
import {
  applyCouponToCustomerCart,
  createFakePaymentProvider,
  newIdempotencyKey,
  paymentOpts,
  seedFullDiscountCoupon,
  seedPickupEligibleOutlet,
} from "../database/support/order-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

const WINDOW_START = new Date("2026-08-09T12:30:00.000Z");
const WINDOW_END = new Date("2026-08-09T13:00:00.000Z");
const SOURCE = readFileSync("src/server/payment/operations.ts", "utf8");
type PersistenceHandle = Parameters<typeof startCheckout>[0];

function writerHandle(connectionString: string): PersistenceHandle {
  return openTrackedApplicationPersistence(connectionString);
}

function sqlState(error: unknown): string {
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current && typeof current === "object"; depth += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Za-z]{5}$/.test(code)) return code;
    current = (current as { cause?: unknown }).cause;
  }
  if (error instanceof Error) return `${error.name}:${error.message}`;
  return "UNKNOWN";
}

function withLockTimeout(inner: PersistenceHandle): PersistenceHandle {
  return {
    role: inner.role,
    withContext: (fn) => inner.withContext(fn),
    checkAvailability: () => inner.checkAvailability(),
    close: async () => {},
    transaction: (fn) =>
      inner.transaction(async (tx) => {
        await tx.db.execute(sql`select set_config('lock_timeout', '400', true)`);
        return fn(tx);
      }),
  };
}

async function paymentCount(
  persistence: PersistenceHandle,
  snapshotId: string,
): Promise<number> {
  const rows = await persistence.withContext((ctx) =>
    ctx.db
      .select({ id: paymentsTable.id })
      .from(paymentsTable)
      .where(eq(paymentsTable.checkoutSnapshotId, snapshotId)),
  );
  return rows.length;
}

async function snapshotCutoff(
  persistence: PersistenceHandle,
  snapshotId: string,
): Promise<number | null | undefined> {
  const rows = await persistence.withContext((ctx) =>
    ctx.db
      .select({
        cutoff: checkoutSnapshotsTable.scheduledCancellationCutoffMinutes,
      })
      .from(checkoutSnapshotsTable)
      .where(eq(checkoutSnapshotsTable.id, snapshotId)),
  );
  return rows[0]?.cutoff;
}

async function checkoutStatus(persistence: PersistenceHandle, checkoutId: string) {
  const rows = await persistence.withContext((ctx) =>
    ctx.db
      .select({ status: checkoutsTable.status })
      .from(checkoutsTable)
      .where(eq(checkoutsTable.id, checkoutId)),
  );
  return rows[0]?.status;
}

async function scheduledDeliveryReady(h: {
  persistence: PersistenceHandle;
  actors: {
    customerA: Parameters<typeof startCheckout>[1];
    tree: { outletA: { id: string } };
  };
  cartId: string;
  addressId: string;
}) {
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
  return evaluateCheckout(
    h.persistence,
    h.actors.customerA,
    { checkoutId: timed.id, expectedCheckoutRevision: timed.revision },
    opts,
  );
}

describe("IMP-036I tranche 2 bind boundary", () => {
  it("revalidates inside the bind transaction and keeps provider I/O after it", () => {
    const start = SOURCE.indexOf("export async function startPayment");
    const zero = SOURCE.indexOf("export async function completeZeroPayableCheckout");
    const startBody = SOURCE.slice(start, zero);
    const zeroBody = SOURCE.slice(zero, SOURCE.indexOf("export async function retryPayment"));
    expect(startBody.indexOf("prepareCheckoutForPayment")).toBeGreaterThan(-1);
    expect(startBody.indexOf("beforeBindingTransaction")).toBeGreaterThan(
      startBody.indexOf("prepareCheckoutForPayment"),
    );
    expect(startBody.indexOf("revalidateScheduledBind")).toBeGreaterThan(
      startBody.indexOf("beforeBindingTransaction"),
    );
    expect(startBody.lastIndexOf("executeProviderAfterCommit")).toBeGreaterThan(
      startBody.indexOf("bindOrInvalidate"),
    );
    expect(zeroBody.indexOf("revalidateScheduledBind")).toBeGreaterThan(
      zeroBody.indexOf("prepareCheckoutForPayment"),
    );
    expect(zeroBody.includes("executeProviderAfterCommit")).toBe(false);
  });

  it("refuses a positive Payment when the first policy insert commits before bind", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const ready = await scheduledDeliveryReady(h);
      expect(ready.snapshot.scheduledCancellationCutoffMinutes).toBe(60);
      const before = await h.persistence.withContext((ctx) =>
        resolveBrandScheduledFulfilmentPolicy(ctx, h.actors.tree.brand.id),
      );
      expect(before.source).toBe("PRODUCT_DEFAULT");
      expect(before.revision).toBe(BigInt(0));
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const options: PaymentOperationOptions = {
        ...paymentOpts(provider),
        beforeBindingTransaction: async () => {
          await updateBrandScheduledFulfilmentPolicy(h.persistence, {
            brandId: h.actors.tree.brand.id,
            expectedRevision: BigInt(0),
            pickupCancellationCutoffMinutes: 30,
            deliveryCancellationCutoffMinutes: 90,
            now: FIXED_NOW,
          });
        },
      };
      await expect(
        startPayment(
          h.persistence,
          h.actors.customerA,
          {
            checkoutId: ready.checkout.id,
            expectedCheckoutRevision: ready.checkout.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("race-pos-before"),
          },
          options,
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_REPRICED" });
      expect(await paymentCount(h.persistence, ready.snapshot.id)).toBe(0);
      expect(await checkoutStatus(h.persistence, ready.checkout.id)).toBe("DRAFT");
      const after = await h.persistence.withContext((ctx) =>
        resolveBrandScheduledFulfilmentPolicy(ctx, h.actors.tree.brand.id),
      );
      expect(after.deliveryCancellationCutoffMinutes).toBe(90);
    });
  });

  it("holds the Brand lock so the first policy insert cannot commit during positive bind", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const ready = await scheduledDeliveryReady(h);
      const writer = withLockTimeout(writerHandle(h.database.connectionString));
      let blockedCode: string | undefined;
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const started = await startPayment(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: ready.checkout.id,
          expectedCheckoutRevision: ready.checkout.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("race-pos-lock"),
        },
        {
          ...paymentOpts(provider),
          afterScheduledAuthorityLocked: async () => {
            try {
              await updateBrandScheduledFulfilmentPolicy(writer, {
                brandId: h.actors.tree.brand.id,
                expectedRevision: BigInt(0),
                pickupCancellationCutoffMinutes: 30,
                deliveryCancellationCutoffMinutes: 90,
                now: FIXED_NOW,
              });
              blockedCode = "COMMITTED";
            } catch (error) {
              blockedCode = sqlState(error);
            }
            const current = await writerHandle(h.database.connectionString).withContext(
              (ctx) => resolveBrandScheduledFulfilmentPolicy(ctx, h.actors.tree.brand.id),
            );
            expect(current.revision).toBe(BigInt(0));
            expect(current.deliveryCancellationCutoffMinutes).toBe(60);
          },
        },
      );
      expect(blockedCode).toBe("55P03");
      expect(started.payment.checkoutSnapshotId).toBe(ready.snapshot.id);
      expect(await snapshotCutoff(h.persistence, ready.snapshot.id)).toBe(60);
      await updateBrandScheduledFulfilmentPolicy(h.persistence, {
        brandId: h.actors.tree.brand.id,
        expectedRevision: BigInt(0),
        pickupCancellationCutoffMinutes: 30,
        deliveryCancellationCutoffMinutes: 90,
        now: FIXED_NOW,
      });
      expect(await snapshotCutoff(h.persistence, ready.snapshot.id)).toBe(60);
      const after = await h.persistence.withContext((ctx) =>
        resolveBrandScheduledFulfilmentPolicy(ctx, h.actors.tree.brand.id),
      );
      expect(after.deliveryCancellationCutoffMinutes).toBe(90);
    });
  });

  it("refuses zero-payable when the first policy insert commits before bind", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const outletId = h.actors.tree.outletA.id;
      await seedPickupEligibleOutlet(h.persistence, h.actors.brandAdminActor, outletId);
      await saveOutletSchedulingProfile(h.persistence, {
        outletId,
        pickupMinLeadMinutes: 30,
        deliveryMinLeadMinutes: 30,
        now: FIXED_NOW,
      });
      const coupon = await seedFullDiscountCoupon(
        h.persistence,
        h.actors.tree.brand.id,
        h.actors.brandAdminActor,
      );
      const cart = await applyCouponToCustomerCart(
        h.persistence,
        h.actors.customerA,
        h.actors.tree.brand.id,
        h.cartRevision,
        coupon.canonicalCode,
      );
      const opts = checkoutOpts();
      const started = await startCheckout(
        h.persistence,
        h.actors.customerA,
        { cartId: cart.id },
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
      expect(ready.snapshot.grandTotalPaise).toBe(BigInt(0));
      expect(ready.snapshot.scheduledCancellationCutoffMinutes).toBe(30);
      const provider = createFakePaymentProvider({ defaultOutcome: "succeed" });
      await expect(
        completeZeroPayableCheckout(
          h.persistence,
          h.actors.customerA,
          {
            checkoutId: ready.checkout.id,
            expectedCheckoutRevision: ready.checkout.revision,
            idempotencyKey: newIdempotencyKey("race-zero-before"),
          },
          {
            ...paymentOpts(provider),
            beforeBindingTransaction: async () => {
              await updateBrandScheduledFulfilmentPolicy(h.persistence, {
                brandId: h.actors.tree.brand.id,
                expectedRevision: BigInt(0),
                pickupCancellationCutoffMinutes: 90,
                deliveryCancellationCutoffMinutes: 60,
                now: FIXED_NOW,
              });
            },
          },
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_REPRICED" });
      expect(await checkoutStatus(h.persistence, ready.checkout.id)).toBe("DRAFT");
      expect(await snapshotCutoff(h.persistence, ready.snapshot.id)).toBe(30);
    });
  });

  it("holds the Brand lock so the first policy insert cannot commit during zero-payable bind", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const outletId = h.actors.tree.outletA.id;
      await seedPickupEligibleOutlet(h.persistence, h.actors.brandAdminActor, outletId);
      await saveOutletSchedulingProfile(h.persistence, {
        outletId,
        pickupMinLeadMinutes: 30,
        deliveryMinLeadMinutes: 30,
        now: FIXED_NOW,
      });
      const coupon = await seedFullDiscountCoupon(
        h.persistence,
        h.actors.tree.brand.id,
        h.actors.brandAdminActor,
      );
      const cart = await applyCouponToCustomerCart(
        h.persistence,
        h.actors.customerA,
        h.actors.tree.brand.id,
        h.cartRevision,
        coupon.canonicalCode,
      );
      const opts = checkoutOpts();
      const startedCheckout = await startCheckout(
        h.persistence,
        h.actors.customerA,
        { cartId: cart.id },
        opts,
      );
      const pickup = await setCheckoutFulfilment(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: startedCheckout.id,
          expectedCheckoutRevision: startedCheckout.revision,
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
      const writer = withLockTimeout(writerHandle(h.database.connectionString));
      let blockedCode: string | undefined;
      const provider = createFakePaymentProvider({ defaultOutcome: "succeed" });
      const completed = await completeZeroPayableCheckout(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: ready.checkout.id,
          expectedCheckoutRevision: ready.checkout.revision,
          idempotencyKey: newIdempotencyKey("race-zero-lock"),
        },
        {
          ...paymentOpts(provider),
          afterScheduledAuthorityLocked: async () => {
            try {
              await updateBrandScheduledFulfilmentPolicy(writer, {
                brandId: h.actors.tree.brand.id,
                expectedRevision: BigInt(0),
                pickupCancellationCutoffMinutes: 90,
                deliveryCancellationCutoffMinutes: 60,
                now: FIXED_NOW,
              });
              blockedCode = "COMMITTED";
            } catch (error) {
              blockedCode = sqlState(error);
            }
          },
        },
      );
      expect(blockedCode).toBe("55P03");
      expect(completed.snapshotId).toBe(ready.snapshot.id);
      expect(await snapshotCutoff(h.persistence, ready.snapshot.id)).toBe(30);
      await updateBrandScheduledFulfilmentPolicy(h.persistence, {
        brandId: h.actors.tree.brand.id,
        expectedRevision: BigInt(0),
        pickupCancellationCutoffMinutes: 90,
        deliveryCancellationCutoffMinutes: 60,
        now: FIXED_NOW,
      });
      expect(await snapshotCutoff(h.persistence, ready.snapshot.id)).toBe(30);
    });
  });

  it("refuses bind when CLOSED_FULL_DAY commits before the bind, and blocks that insert while the bind holds the Outlet", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const ready = await scheduledDeliveryReady(h);
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      await expect(
        startPayment(
          h.persistence,
          h.actors.customerA,
          {
            checkoutId: ready.checkout.id,
            expectedCheckoutRevision: ready.checkout.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("race-close-before"),
          },
          {
            ...paymentOpts(provider),
            beforeBindingTransaction: async () => {
              await h.persistence.transaction((tx) =>
                insertOutletOperatingDateException(tx, {
                  outletId: h.actors.tree.outletA.id,
                  localDate: "2026-08-09",
                  exceptionKind: "CLOSED_FULL_DAY",
                  now: FIXED_NOW,
                }),
              );
            },
          },
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_REPRICED" });
      expect(await paymentCount(h.persistence, ready.snapshot.id)).toBe(0);

      await h.persistence.transaction(async (tx) => {
        await tx.db.execute(sql`
          delete from app.outlet_operating_date_exceptions
          where outlet_id = ${h.actors.tree.outletA.id}::uuid
        `);
      });
      const restored = await evaluateCheckout(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: ready.checkout.id,
          expectedCheckoutRevision: ready.checkout.revision + BigInt(1),
        },
        checkoutOpts(),
      );
      const writer = writerHandle(h.database.connectionString);
      let blockedCode: string | undefined;
      const started = await startPayment(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: restored.checkout.id,
          expectedCheckoutRevision: restored.checkout.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("race-close-lock"),
        },
        {
          ...paymentOpts(provider),
          afterScheduledAuthorityLocked: async () => {
            try {
              await writer.transaction(async (tx) => {
                await tx.db.execute(sql`select set_config('lock_timeout', '400', true)`);
                await insertOutletOperatingDateException(tx, {
                  outletId: h.actors.tree.outletA.id,
                  localDate: "2026-08-09",
                  exceptionKind: "CLOSED_FULL_DAY",
                  now: FIXED_NOW,
                });
              });
              blockedCode = "COMMITTED";
            } catch (error) {
              blockedCode = sqlState(error);
            }
          },
        },
      );
      expect(blockedCode).toBe("55P03");
      expect(started.payment.checkoutSnapshotId).toBe(restored.snapshot.id);
      await writer.transaction((tx) =>
        insertOutletOperatingDateException(tx, {
          outletId: h.actors.tree.outletA.id,
          localDate: "2026-08-09",
          exceptionKind: "CLOSED_FULL_DAY",
          now: FIXED_NOW,
        }),
      );
      expect(await snapshotCutoff(h.persistence, restored.snapshot.id)).toBe(60);
      expect(await paymentCount(h.persistence, restored.snapshot.id)).toBe(1);
    });
  });
});
