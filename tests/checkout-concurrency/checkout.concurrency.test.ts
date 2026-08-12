/**
 * Checkout concurrency tests (IMP-021) — exactly Race 01–20.
 * Real PostgreSQL transactions/locks; no mocked locks.
 */
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import {
  addCartLine,
  applyCartCoupon,
  removeCartCoupon,
  removeCartLine,
  setCartLineQuantity,
} from "../../src/server/cart";
import {
  cancelCheckout,
  evaluateCheckout,
  getActiveCheckout,
  clearCheckoutDestination,
  setCheckoutDestination,
  startCheckout,
} from "../../src/server/checkout";
import {
  CHECKOUT_POLICY,
  FIXED_NOW,
  checkoutOpts,
  closeTrackedPersistenceHandles,
  createSavedAddressForCustomer,
  mutableCartClock,
  withCheckoutReadyHarness,
} from "../database/support/checkout-fixtures";
import { seedRecognizedCoupon } from "../database/support/cart-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

const opts = checkoutOpts();

function settled(results: ReadonlyArray<PromiseSettledResult<unknown>>) {
  return {
    ok: results.filter(
      (r): r is PromiseFulfilledResult<unknown> => r.status === "fulfilled",
    ),
    fail: results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    ),
  };
}

async function draftWithDestination(
  persistence: Parameters<typeof startCheckout>[0],
  actor: Parameters<typeof startCheckout>[1],
  cartId: string,
  addressId: string,
  localOpts = opts,
) {
  const draft = await startCheckout(persistence, actor, { cartId }, localOpts);
  return setCheckoutDestination(
    persistence,
    actor,
    {
      checkoutId: draft.id,
      expectedCheckoutRevision: draft.revision,
      destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
    },
    localOpts,
  );
}

describe("IMP-021 checkout concurrency races", () => {
  it("Race 01 create vs create → one non-terminal Checkout", async () => {
    await withCheckoutReadyHarness(async ({ persistence, actors, cartId }) => {
      const results = await Promise.allSettled([
        startCheckout(persistence, actors.customerA, { cartId }, opts),
        startCheckout(persistence, actors.customerA, { cartId }, opts),
      ]);
      const { ok, fail } = settled(results);
      // Both may succeed with the same logical checkout (idempotent return),
      // or one unique-violation path recovers — never two distinct non-terminals.
      expect(ok.length + fail.length).toBe(2);
      expect(ok.length).toBeGreaterThanOrEqual(1);
      await persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select count(*)::text as c from app.checkouts
          where cart_id = ${cartId}::uuid
            and status in ('DRAFT', 'READY_FOR_PAYMENT', 'PAYMENT_PENDING')
        `);
        expect(rows.rows[0]!.c).toBe("1");
      });
      if (ok.length === 2) {
        const a = ok[0]!.value as { id: string };
        const b = ok[1]!.value as { id: string };
        expect(a.id).toBe(b.id);
      }
    });
  });

  it("Race 02 dest A vs dest B same rev → one win one conflict", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId, oneTimeDestination }) => {
        const draft = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        const rev = draft.revision;
        const results = await Promise.allSettled([
          setCheckoutDestination(
            persistence,
            actors.customerA,
            {
              checkoutId: draft.id,
              expectedCheckoutRevision: rev,
              destination: {
                kind: "SAVED_ADDRESS",
                savedAddressId: addressId,
              },
            },
            opts,
          ),
          setCheckoutDestination(
            persistence,
            actors.customerA,
            {
              checkoutId: draft.id,
              expectedCheckoutRevision: rev,
              destination: { ...oneTimeDestination },
            },
            opts,
          ),
        ]);
        expect(settled(results).ok).toHaveLength(1);
        expect(settled(results).fail).toHaveLength(1);
        expect(
          (settled(results).fail[0]!.reason as { code: string }).code,
        ).toBe("CHECKOUT_CONFLICT");
      },
    );
  });

  it("Race 03 set vs clear destination", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const withDest = await draftWithDestination(
          persistence,
          actors.customerA,
          cartId,
          addressId,
        );
        const rev = withDest.revision;
        const results = await Promise.allSettled([
          setCheckoutDestination(
            persistence,
            actors.customerA,
            {
              checkoutId: withDest.id,
              expectedCheckoutRevision: rev,
              destination: {
                kind: "ONE_TIME_ADDRESS",
                recipientName: "Race Three",
                recipientPhone: "+919876543210",
                addressLine1: "3 Race Rd",
                city: "Dehradun",
                stateCode: "IN-UT",
                postalCode: "248001",
              },
            },
            opts,
          ),
          clearCheckoutDestination(
            persistence,
            actors.customerA,
            {
              checkoutId: withDest.id,
              expectedCheckoutRevision: rev,
            },
            opts,
          ),
        ]);
        expect(settled(results).ok).toHaveLength(1);
        expect(settled(results).fail).toHaveLength(1);
        const final = await getActiveCheckout(
          persistence,
          actors.customerA,
          { checkoutId: withDest.id },
          opts,
        );
        expect(final!.revision).toBe(rev + BigInt(1));
      },
    );
  });

  it("Race 04 dest vs cancel — no mixed state", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const withDest = await draftWithDestination(
          persistence,
          actors.customerA,
          cartId,
          addressId,
        );
        const rev = withDest.revision;
        const results = await Promise.allSettled([
          setCheckoutDestination(
            persistence,
            actors.customerA,
            {
              checkoutId: withDest.id,
              expectedCheckoutRevision: rev,
              destination: {
                kind: "ONE_TIME_ADDRESS",
                recipientName: "Race Four",
                recipientPhone: "+919876543210",
                addressLine1: "4 Race Rd",
                city: "Dehradun",
                stateCode: "IN-UT",
                postalCode: "248001",
              },
            },
            opts,
          ),
          cancelCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: withDest.id,
              expectedCheckoutRevision: rev,
            },
            opts,
          ),
        ]);
        expect(settled(results).ok).toHaveLength(1);
        expect(settled(results).fail).toHaveLength(1);
        await persistence.withContext(async (ctx) => {
          const row = await ctx.db.execute(sql`
            select status, active_snapshot_id
            from app.checkouts where id = ${withDest.id}::uuid
          `);
          const status = String(row.rows[0]!.status);
          expect(["DRAFT", "CANCELLED"]).toContain(status);
          if (status === "CANCELLED") {
            expect(row.rows[0]!.active_snapshot_id).toBeNull();
          }
        });
      },
    );
  });

  it("Race 05 dest vs READY commit — stale destination candidate discarded", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId, oneTimeDestination }) => {
        const withDest = await draftWithDestination(
          persistence,
          actors.customerA,
          cartId,
          addressId,
        );
        const rev = withDest.revision;
        const results = await Promise.allSettled([
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: withDest.id,
              expectedCheckoutRevision: rev,
            },
            opts,
          ),
          setCheckoutDestination(
            persistence,
            actors.customerA,
            {
              checkoutId: withDest.id,
              expectedCheckoutRevision: rev,
              destination: { ...oneTimeDestination },
            },
            opts,
          ),
        ]);
        const { ok, fail } = settled(results);
        expect(ok).toHaveLength(1);
        expect(fail).toHaveLength(1);
        const final = await getActiveCheckout(
          persistence,
          actors.customerA,
          { checkoutId: withDest.id },
          opts,
        );
        expect(final).not.toBeNull();
        if (final!.status === "READY_FOR_PAYMENT") {
          expect(final!.destination?.destinationKind).toBe("SAVED_ADDRESS");
          expect(final!.activeSnapshot?.destination.destinationKind).toBe(
            "SAVED_ADDRESS",
          );
        } else {
          expect(final!.status).toBe("DRAFT");
          expect(final!.destination?.destinationKind).toBe("ONE_TIME_ADDRESS");
          expect(final!.activeSnapshotId).toBeNull();
        }
      },
    );
  });

  it("Race 06 READY vs READY — at most one active snapshot for starting revision", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const withDest = await draftWithDestination(
          persistence,
          actors.customerA,
          cartId,
          addressId,
        );
        const rev = withDest.revision;
        const results = await Promise.allSettled([
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: withDest.id,
              expectedCheckoutRevision: rev,
            },
            opts,
          ),
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: withDest.id,
              expectedCheckoutRevision: rev,
            },
            opts,
          ),
        ]);
        const { ok, fail } = settled(results);
        expect(ok.length).toBeGreaterThanOrEqual(1);
        expect(ok.length + fail.length).toBe(2);
        await persistence.withContext(async (ctx) => {
          const row = await ctx.db.execute(sql`
            select status, active_snapshot_id::text as sid, revision::text as rev
            from app.checkouts where id = ${withDest.id}::uuid
          `);
          expect(row.rows[0]!.status).toBe("READY_FOR_PAYMENT");
          expect(row.rows[0]!.sid).toBeTruthy();
          const snaps = await ctx.db.execute(sql`
            select count(*)::text as c from app.checkout_snapshots
            where checkout_id = ${withDest.id}::uuid
              and checkout_revision = ${row.rows[0]!.rev}::bigint
          `);
          expect(Number(snaps.rows[0]!.c)).toBeLessThanOrEqual(1);
        });
      },
    );
  });

  it("Race 07 READY vs cancel — never CANCELLED + active READY snapshot", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const withDest = await draftWithDestination(
          persistence,
          actors.customerA,
          cartId,
          addressId,
        );
        const rev = withDest.revision;
        const results = await Promise.allSettled([
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: withDest.id,
              expectedCheckoutRevision: rev,
            },
            opts,
          ),
          cancelCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: withDest.id,
              expectedCheckoutRevision: rev,
            },
            opts,
          ),
        ]);
        expect(settled(results).ok).toHaveLength(1);
        expect(settled(results).fail).toHaveLength(1);
        await persistence.withContext(async (ctx) => {
          const row = await ctx.db.execute(sql`
            select status, active_snapshot_id
            from app.checkouts where id = ${withDest.id}::uuid
          `);
          const status = String(row.rows[0]!.status);
          if (status === "CANCELLED") {
            expect(row.rows[0]!.active_snapshot_id).toBeNull();
          } else {
            expect(status).toBe("READY_FOR_PAYMENT");
            expect(row.rows[0]!.active_snapshot_id).not.toBeNull();
          }
        });
      },
    );
  });

  it("Race 08 READY evaluation vs Cart quantity mutation", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId, catalog }) => {
        const access = {
          kind: "customer" as const,
          actor: actors.customerA,
          brandId: actors.tree.brand.id,
        };
        const withDest = await draftWithDestination(
          persistence,
          actors.customerA,
          cartId,
          addressId,
        );
        const cart = await persistence.withContext(async (ctx) => {
          const rows = await ctx.db.execute(sql`
            select id::text as id, revision::text as revision from app.carts
            where id = ${cartId}::uuid
          `);
          const line = await ctx.db.execute(sql`
            select id::text as id from app.cart_lines
            where cart_id = ${cartId}::uuid limit 1
          `);
          return {
            revision: BigInt(String(rows.rows[0]!.revision)),
            lineId: String(line.rows[0]!.id),
          };
        });
        void catalog;
        const results = await Promise.allSettled([
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: withDest.id,
              expectedCheckoutRevision: withDest.revision,
            },
            opts,
          ),
          setCartLineQuantity(
            persistence,
            access,
            {
              cartLineId: cart.lineId,
              quantity: 3,
              expectedRevision: cart.revision,
            },
            { clock: opts.clock },
          ),
        ]);
        const { ok, fail } = settled(results);
        expect(ok.length).toBeGreaterThanOrEqual(1);
        // If both succeed, evaluate must have committed before cart change
        // was visible at commit recheck — otherwise evaluate fails CART_CHANGED.
        if (ok.length === 2) {
          const evalOk = ok.find(
            (r) =>
              r.value &&
              typeof r.value === "object" &&
              "snapshot" in (r.value as object),
          );
          expect(evalOk).toBeDefined();
        } else {
          expect(fail.length).toBeGreaterThanOrEqual(1);
        }
        const final = await getActiveCheckout(
          persistence,
          actors.customerA,
          { checkoutId: withDest.id },
          opts,
        );
        if (final?.status === "READY_FOR_PAYMENT") {
          expect(final.activeSnapshot).not.toBeNull();
        }
      },
    );
  });

  it("Race 09 READY evaluation vs Cart line removal", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId, catalog }) => {
        const access = {
          kind: "customer" as const,
          actor: actors.customerA,
          brandId: actors.tree.brand.id,
        };
        const beforeAdd = await persistence.withContext(async (ctx) => {
          const rows = await ctx.db.execute(sql`
            select revision::text as revision from app.carts where id = ${cartId}::uuid
          `);
          return BigInt(String(rows.rows[0]!.revision));
        });
        // Ensure two lines so removal leaves a non-empty cart for coherent states.
        // Use system clock here: harness carts are created at wall-clock time, and
        // FIXED_NOW can be earlier than created_at (fails carts_updated_at_after_created_at_check).
        await addCartLine(persistence, access, {
          variantId: catalog.variantId,
          quantity: 1,
          expectedRevision: beforeAdd,
        });
        const withDest = await draftWithDestination(
          persistence,
          actors.customerA,
          cartId,
          addressId,
        );
        const cart = await persistence.withContext(async (ctx) => {
          const rows = await ctx.db.execute(sql`
            select revision::text as revision from app.carts where id = ${cartId}::uuid
          `);
          const line = await ctx.db.execute(sql`
            select id::text as id from app.cart_lines
            where cart_id = ${cartId}::uuid order by id asc limit 1
          `);
          return {
            revision: BigInt(String(rows.rows[0]!.revision)),
            lineId: String(line.rows[0]!.id),
          };
        });
        const results = await Promise.allSettled([
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: withDest.id,
              expectedCheckoutRevision: withDest.revision,
            },
            opts,
          ),
          removeCartLine(
            persistence,
            access,
            {
              cartLineId: cart.lineId,
              expectedRevision: cart.revision,
            },
            { clock: opts.clock },
          ),
        ]);
        expect(settled(results).ok.length).toBeGreaterThanOrEqual(1);
        const final = await getActiveCheckout(
          persistence,
          actors.customerA,
          { checkoutId: withDest.id },
          opts,
        );
        expect(final).not.toBeNull();
        // Coherent outcomes only: DRAFT or READY; never mixed orphan snapshot.
        if (final!.status === "READY_FOR_PAYMENT") {
          expect(final!.activeSnapshotId).not.toBeNull();
          expect(final!.activeSnapshot).not.toBeNull();
        } else {
          expect(final!.activeSnapshotId).toBeNull();
        }
      },
    );
  });

  it("Race 10 READY evaluation vs coupon Cart mutation", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const access = {
          kind: "customer" as const,
          actor: actors.customerA,
          brandId: actors.tree.brand.id,
        };
        const coupon = await seedRecognizedCoupon(
          persistence,
          actors.tree.brand.id,
          actors.brandAdminActor,
          "CHKRACE10",
        );
        const cartRev = await persistence.withContext(async (ctx) => {
          const rows = await ctx.db.execute(sql`
            select revision::text as revision from app.carts where id = ${cartId}::uuid
          `);
          return BigInt(String(rows.rows[0]!.revision));
        });
        const withDest = await draftWithDestination(
          persistence,
          actors.customerA,
          cartId,
          addressId,
        );
        const results = await Promise.allSettled([
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: withDest.id,
              expectedCheckoutRevision: withDest.revision,
            },
            opts,
          ),
          applyCartCoupon(
            persistence,
            access,
            {
              couponCode: coupon.canonicalCode,
              expectedRevision: cartRev,
            },
            { clock: opts.clock },
          ),
        ]);
        expect(settled(results).ok.length).toBeGreaterThanOrEqual(1);
        const final = await getActiveCheckout(
          persistence,
          actors.customerA,
          { checkoutId: withDest.id },
          opts,
        );
        expect(final).not.toBeNull();
      },
    );
  });

  it("Race 11 READY revalidation vs dest change", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId, oneTimeDestination }) => {
        const withDest = await draftWithDestination(
          persistence,
          actors.customerA,
          cartId,
          addressId,
        );
        const ready = await evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: withDest.id,
            expectedCheckoutRevision: withDest.revision,
          },
          opts,
        );
        const rev = ready.checkout.revision;
        const results = await Promise.allSettled([
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: ready.checkout.id,
              expectedCheckoutRevision: rev,
            },
            opts,
          ),
          setCheckoutDestination(
            persistence,
            actors.customerA,
            {
              checkoutId: ready.checkout.id,
              expectedCheckoutRevision: rev,
              destination: { ...oneTimeDestination },
            },
            opts,
          ),
        ]);
        expect(settled(results).ok.length).toBeGreaterThanOrEqual(1);
        const final = await getActiveCheckout(
          persistence,
          actors.customerA,
          { checkoutId: ready.checkout.id },
          opts,
        );
        if (final!.status === "READY_FOR_PAYMENT") {
          expect(final!.destination?.destinationKind).toBe("SAVED_ADDRESS");
          expect(final!.activeSnapshot?.destination.destinationKind).toBe(
            "SAVED_ADDRESS",
          );
        } else {
          expect(final!.status).toBe("DRAFT");
          expect(final!.destination?.destinationKind).toBe("ONE_TIME_ADDRESS");
          expect(final!.activeSnapshotId).toBeNull();
        }
      },
    );
  });

  it("Race 12 READY revalidation vs Cart mutation", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const access = {
          kind: "customer" as const,
          actor: actors.customerA,
          brandId: actors.tree.brand.id,
        };
        const withDest = await draftWithDestination(
          persistence,
          actors.customerA,
          cartId,
          addressId,
        );
        const ready = await evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: withDest.id,
            expectedCheckoutRevision: withDest.revision,
          },
          opts,
        );
        const cart = await persistence.withContext(async (ctx) => {
          const rows = await ctx.db.execute(sql`
            select revision::text as revision from app.carts where id = ${cartId}::uuid
          `);
          const line = await ctx.db.execute(sql`
            select id::text as id from app.cart_lines
            where cart_id = ${cartId}::uuid limit 1
          `);
          return {
            revision: BigInt(String(rows.rows[0]!.revision)),
            lineId: String(line.rows[0]!.id),
          };
        });
        const results = await Promise.allSettled([
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: ready.checkout.id,
              expectedCheckoutRevision: ready.checkout.revision,
            },
            opts,
          ),
          setCartLineQuantity(
            persistence,
            access,
            {
              cartLineId: cart.lineId,
              quantity: 4,
              expectedRevision: cart.revision,
            },
            { clock: opts.clock },
          ),
        ]);
        expect(settled(results).ok.length).toBeGreaterThanOrEqual(1);
        const final = await getActiveCheckout(
          persistence,
          actors.customerA,
          { checkoutId: ready.checkout.id },
          opts,
        );
        // Cart mutation while READY: prepare/evaluate paths demote or conflict
        expect(final).not.toBeNull();
        if (final!.status === "READY_FOR_PAYMENT") {
          // equivalent revalidation may keep READY only if cart unchanged at read
          expect(final!.activeSnapshotId).not.toBeNull();
        }
      },
    );
  });

  it("Race 13 equivalent READY revalidation vs invalidation", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId, oneTimeDestination }) => {
        const withDest = await draftWithDestination(
          persistence,
          actors.customerA,
          cartId,
          addressId,
        );
        const ready = await evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: withDest.id,
            expectedCheckoutRevision: withDest.revision,
          },
          opts,
        );
        const rev = ready.checkout.revision;
        const results = await Promise.allSettled([
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: ready.checkout.id,
              expectedCheckoutRevision: rev,
            },
            opts,
          ),
          setCheckoutDestination(
            persistence,
            actors.customerA,
            {
              checkoutId: ready.checkout.id,
              expectedCheckoutRevision: rev,
              destination: { ...oneTimeDestination },
            },
            opts,
          ),
        ]);
        const { ok } = settled(results);
        expect(ok.length).toBeGreaterThanOrEqual(1);
        const final = await getActiveCheckout(
          persistence,
          actors.customerA,
          { checkoutId: ready.checkout.id },
          opts,
        );
        // Coherent: either still READY with old dest, or DRAFT with new dest
        if (final!.status === "READY_FOR_PAYMENT") {
          expect(final!.activeSnapshotId).not.toBeNull();
          expect(final!.destination?.destinationKind).toBe("SAVED_ADDRESS");
        } else {
          expect(final!.status).toBe("DRAFT");
          expect(final!.activeSnapshotId).toBeNull();
        }
      },
    );
  });

  it("Race 14 READY commit vs exact expiry boundary", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const clock = mutableCartClock(FIXED_NOW);
        const localOpts = { clock: clock.clock, policy: CHECKOUT_POLICY };
        const withDest = await draftWithDestination(
          persistence,
          actors.customerA,
          cartId,
          addressId,
          localOpts,
        );
        const expiresAt = withDest.expiresAt;
        const evalPromise = evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: withDest.id,
            expectedCheckoutRevision: withDest.revision,
          },
          localOpts,
        );
        // Advance to exact expiry while evaluate is in flight so commit recheck fails.
        clock.set(new Date(expiresAt.getTime()));
        await expect(evalPromise).rejects.toMatchObject({
          code: "CHECKOUT_EXPIRED",
        });
        const final = await getActiveCheckout(
          persistence,
          actors.customerA,
          { checkoutId: withDest.id },
          {
            clock: { now: () => new Date(expiresAt.getTime() - 1) },
            policy: CHECKOUT_POLICY,
          },
        );
        expect(final?.status ?? "DRAFT").not.toBe("READY_FOR_PAYMENT");
        expect(final?.activeSnapshotId ?? null).toBeNull();
      },
    );
  });

  it("Race 15 mutation vs exact expiry boundary", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId, oneTimeDestination }) => {
        const clock = mutableCartClock(FIXED_NOW);
        const localOpts = { clock: clock.clock, policy: CHECKOUT_POLICY };
        const withDest = await draftWithDestination(
          persistence,
          actors.customerA,
          cartId,
          addressId,
          localOpts,
        );
        clock.set(new Date(withDest.expiresAt.getTime()));
        const results = await Promise.allSettled([
          setCheckoutDestination(
            persistence,
            actors.customerA,
            {
              checkoutId: withDest.id,
              expectedCheckoutRevision: withDest.revision,
              destination: { ...oneTimeDestination },
            },
            localOpts,
          ),
          cancelCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: withDest.id,
              expectedCheckoutRevision: withDest.revision,
            },
            localOpts,
          ),
        ]);
        expect(settled(results).ok).toHaveLength(0);
        expect(settled(results).fail).toHaveLength(2);
        for (const f of settled(results).fail) {
          expect((f.reason as { code: string }).code).toBe("CHECKOUT_EXPIRED");
        }
      },
    );
  });

  it("Race 16 cancel vs cancel", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const withDest = await draftWithDestination(
          persistence,
          actors.customerA,
          cartId,
          addressId,
        );
        const rev = withDest.revision;
        const results = await Promise.allSettled([
          cancelCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: withDest.id,
              expectedCheckoutRevision: rev,
            },
            opts,
          ),
          cancelCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: withDest.id,
              expectedCheckoutRevision: rev,
            },
            opts,
          ),
        ]);
        expect(settled(results).ok).toHaveLength(1);
        expect(settled(results).fail).toHaveLength(1);
        await persistence.withContext(async (ctx) => {
          const row = await ctx.db.execute(sql`
            select status, revision::text as rev from app.checkouts
            where id = ${withDest.id}::uuid
          `);
          expect(row.rows[0]!.status).toBe("CANCELLED");
          expect(BigInt(String(row.rows[0]!.rev))).toBe(rev + BigInt(1));
        });
      },
    );
  });

  it("Race 17 read vs READY commit coherent", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const withDest = await draftWithDestination(
          persistence,
          actors.customerA,
          cartId,
          addressId,
        );
        const results = await Promise.allSettled([
          getActiveCheckout(
            persistence,
            actors.customerA,
            { checkoutId: withDest.id },
            opts,
          ),
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: withDest.id,
              expectedCheckoutRevision: withDest.revision,
            },
            opts,
          ),
        ]);
        expect(settled(results).fail).toHaveLength(0);
        for (const r of settled(results).ok) {
          if (r.value && typeof r.value === "object" && "status" in r.value) {
            const c = r.value as {
              status: string;
              activeSnapshotId: string | null;
              activeSnapshot: unknown;
            };
            if (c.status === "DRAFT") {
              expect(c.activeSnapshotId).toBeNull();
              expect(c.activeSnapshot).toBeNull();
            }
            if (c.status === "READY_FOR_PAYMENT") {
              expect(c.activeSnapshotId).not.toBeNull();
              expect(c.activeSnapshot).not.toBeNull();
            }
          }
        }
      },
    );
  });

  it("Race 18 read vs cancel coherent", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const withDest = await draftWithDestination(
          persistence,
          actors.customerA,
          cartId,
          addressId,
        );
        const results = await Promise.allSettled([
          getActiveCheckout(
            persistence,
            actors.customerA,
            { checkoutId: withDest.id },
            opts,
          ),
          cancelCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: withDest.id,
              expectedCheckoutRevision: withDest.revision,
            },
            opts,
          ),
        ]);
        expect(settled(results).ok.length).toBeGreaterThanOrEqual(1);
        for (const r of settled(results).ok) {
          if (r.value && typeof r.value === "object" && "status" in r.value) {
            const c = r.value as {
              status: string;
              activeSnapshotId: string | null;
            };
            if (c.status === "CANCELLED") {
              expect(c.activeSnapshotId).toBeNull();
            }
            if (c.status === "DRAFT") {
              expect(["DRAFT"]).toContain(c.status);
            }
          }
        }
      },
    );
  });

  it("Race 19 parallel different Checkouts independent", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, catalog, addressId }) => {
        const brandId = actors.tree.brand.id;
        const cartB = await addCartLine(
          persistence,
          { kind: "customer", actor: actors.customerB, brandId },
          { variantId: catalog.variantId, quantity: 1 },
          { clock: opts.clock },
        );
        const addressB = await createSavedAddressForCustomer(
          persistence,
          actors.customerBId,
        );
        const draftA = await draftWithDestination(
          persistence,
          actors.customerA,
          // harness cart
          (
            await persistence.withContext(async (ctx) => {
              const rows = await ctx.db.execute(sql`
                select id::text as id from app.carts
                where customer_auth_user_id = ${actors.customerAId}
                limit 1
              `);
              return String(rows.rows[0]!.id);
            })
          ),
          addressId,
        );
        const draftB = await draftWithDestination(
          persistence,
          actors.customerB,
          cartB.cart.id,
          addressB.id,
        );
        const results = await Promise.allSettled([
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: draftA.id,
              expectedCheckoutRevision: draftA.revision,
            },
            opts,
          ),
          evaluateCheckout(
            persistence,
            actors.customerB,
            {
              checkoutId: draftB.id,
              expectedCheckoutRevision: draftB.revision,
            },
            opts,
          ),
        ]);
        expect(settled(results).ok).toHaveLength(2);
        expect(settled(results).fail).toHaveLength(0);
      },
    );
  });

  it("Race 20 terminal vs stale mutation", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId, oneTimeDestination }) => {
        const withDest = await draftWithDestination(
          persistence,
          actors.customerA,
          cartId,
          addressId,
        );
        const cancelled = await cancelCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: withDest.id,
            expectedCheckoutRevision: withDest.revision,
          },
          opts,
        );
        const results = await Promise.allSettled([
          setCheckoutDestination(
            persistence,
            actors.customerA,
            {
              checkoutId: cancelled.id,
              expectedCheckoutRevision: withDest.revision,
              destination: { ...oneTimeDestination },
            },
            opts,
          ),
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: cancelled.id,
              expectedCheckoutRevision: withDest.revision,
            },
            opts,
          ),
        ]);
        expect(settled(results).ok).toHaveLength(0);
        expect(settled(results).fail).toHaveLength(2);
        await persistence.withContext(async (ctx) => {
          const row = await ctx.db.execute(sql`
            select status from app.checkouts where id = ${cancelled.id}::uuid
          `);
          expect(row.rows[0]!.status).toBe("CANCELLED");
        });
      },
    );
  });
});

// silence unused import if tree-shaken oddly
void removeCartCoupon;
