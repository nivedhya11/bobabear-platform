/**
 * Cart concurrency tests (IMP-020) — §112 all 20 races.
 */
import { afterEach, describe, expect, it } from "vitest";

import {
  addCartLine,
  applyCartCoupon,
  claimGuestCart,
  clearCart,
  evaluateCart,
  fixedCartClock,
  getActiveCart,
  reconcileGuestCartWithCustomer,
  removeCartCoupon,
  removeCartLine,
  setCartLineQuantity,
  updateCartLineConfiguration,
} from "../../src/server/cart";
import {
  FIXED_NOW,
  GUEST_POLICY,
  closeTrackedPersistenceHandles,
  seedActiveStandardVariant,
  seedRecognizedCoupon,
  withCartHarness,
} from "../database/support/cart-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

const opts = {
  clock: fixedCartClock(FIXED_NOW),
  policy: GUEST_POLICY,
};

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

describe("IMP-020 cart concurrency races", () => {
  it("race-01-addLine-vs-addLine-same-configuration", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const access = {
        kind: "customer" as const,
        actor: actors.customerA,
        brandId: actors.tree.brand.id,
      };
      const base = await addCartLine(persistence, access, {
        variantId: catalog.variantId,
        quantity: 1,
      }, opts);
      const rev = base.cart.revision;
      const results = await Promise.allSettled([
        addCartLine(persistence, access, {
          variantId: catalog.variantId,
          quantity: 1,
          expectedRevision: rev,
        }, opts),
        addCartLine(persistence, access, {
          variantId: catalog.variantId,
          quantity: 1,
          expectedRevision: rev,
        }, opts),
      ]);
      const { ok, fail } = settled(results);
      expect(ok).toHaveLength(1);
      expect(fail).toHaveLength(1);
      const cart = await getActiveCart(persistence, access, opts);
      expect(cart!.lines).toHaveLength(1);
      expect(cart!.lines[0]!.quantity).toBe(2);
      expect(cart!.revision).toBe(rev + BigInt(1));
    });
  });

  it("race-02-addLine-vs-addLine-different-configuration", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const access = {
        kind: "customer" as const,
        actor: actors.customerA,
        brandId: actors.tree.brand.id,
      };
      const other = await seedActiveStandardVariant(
        persistence,
        actors.tree.brand.id,
        actors.brandAdminActor,
        "r2",
      );
      const base = await addCartLine(persistence, access, {
        variantId: catalog.variantId,
        quantity: 1,
      }, opts);
      const rev = base.cart.revision;
      const results = await Promise.allSettled([
        addCartLine(persistence, access, {
          variantId: catalog.variantId,
          quantity: 1,
          expectedRevision: rev,
        }, opts),
        addCartLine(persistence, access, {
          variantId: other.variantId,
          quantity: 1,
          expectedRevision: rev,
        }, opts),
      ]);
      const { ok, fail } = settled(results);
      expect(ok).toHaveLength(1);
      expect(fail).toHaveLength(1);
      const cart = await getActiveCart(persistence, access, opts);
      expect(cart!.revision).toBe(rev + BigInt(1));
      expect(cart!.lines.length).toBeGreaterThanOrEqual(1);
      expect(cart!.lines.length).toBeLessThanOrEqual(2);
    });
  });

  it("race-03-addLine-vs-setQuantity", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const access = {
        kind: "customer" as const,
        actor: actors.customerA,
        brandId: actors.tree.brand.id,
      };
      const base = await addCartLine(persistence, access, {
        variantId: catalog.variantId,
        quantity: 1,
      }, opts);
      const rev = base.cart.revision;
      const lineId = base.cart.lines[0]!.id;
      const results = await Promise.allSettled([
        addCartLine(persistence, access, {
          variantId: catalog.variantId,
          quantity: 1,
          expectedRevision: rev,
        }, opts),
        setCartLineQuantity(persistence, access, {
          cartLineId: lineId,
          quantity: 5,
          expectedRevision: rev,
        }, opts),
      ]);
      expect(settled(results).ok).toHaveLength(1);
      expect(settled(results).fail).toHaveLength(1);
      const cart = await getActiveCart(persistence, access, opts);
      expect(cart!.revision).toBe(rev + BigInt(1));
    });
  });

  it("race-04-setQuantity-vs-setQuantity", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const access = {
        kind: "customer" as const,
        actor: actors.customerA,
        brandId: actors.tree.brand.id,
      };
      const base = await addCartLine(persistence, access, {
        variantId: catalog.variantId,
        quantity: 1,
      }, opts);
      const rev = base.cart.revision;
      const lineId = base.cart.lines[0]!.id;
      const results = await Promise.allSettled([
        setCartLineQuantity(persistence, access, {
          cartLineId: lineId,
          quantity: 3,
          expectedRevision: rev,
        }, opts),
        setCartLineQuantity(persistence, access, {
          cartLineId: lineId,
          quantity: 7,
          expectedRevision: rev,
        }, opts),
      ]);
      expect(settled(results).ok).toHaveLength(1);
      expect(settled(results).fail).toHaveLength(1);
      const cart = await getActiveCart(persistence, access, opts);
      expect([3, 7]).toContain(cart!.lines[0]!.quantity);
      expect(cart!.revision).toBe(rev + BigInt(1));
    });
  });

  it("race-05-setQuantity-vs-removeLine", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const access = {
        kind: "customer" as const,
        actor: actors.customerA,
        brandId: actors.tree.brand.id,
      };
      const base = await addCartLine(persistence, access, {
        variantId: catalog.variantId,
        quantity: 2,
      }, opts);
      const rev = base.cart.revision;
      const lineId = base.cart.lines[0]!.id;
      const results = await Promise.allSettled([
        setCartLineQuantity(persistence, access, {
          cartLineId: lineId,
          quantity: 4,
          expectedRevision: rev,
        }, opts),
        removeCartLine(persistence, access, {
          cartLineId: lineId,
          expectedRevision: rev,
        }, opts),
      ]);
      expect(settled(results).ok).toHaveLength(1);
      expect(settled(results).fail).toHaveLength(1);
    });
  });

  it("race-06-editConfiguration-vs-removeLine", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const access = {
        kind: "customer" as const,
        actor: actors.customerA,
        brandId: actors.tree.brand.id,
      };
      const other = await seedActiveStandardVariant(
        persistence,
        actors.tree.brand.id,
        actors.brandAdminActor,
        "r6",
      );
      const base = await addCartLine(persistence, access, {
        variantId: catalog.variantId,
        quantity: 1,
      }, opts);
      const rev = base.cart.revision;
      const lineId = base.cart.lines[0]!.id;
      const results = await Promise.allSettled([
        updateCartLineConfiguration(persistence, access, {
          cartLineId: lineId,
          variantId: other.variantId,
          expectedRevision: rev,
        }, opts),
        removeCartLine(persistence, access, {
          cartLineId: lineId,
          expectedRevision: rev,
        }, opts),
      ]);
      expect(settled(results).ok).toHaveLength(1);
      expect(settled(results).fail).toHaveLength(1);
    });
  });

  it("race-07-editConfiguration-vs-editConfiguration", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const access = {
        kind: "customer" as const,
        actor: actors.customerA,
        brandId: actors.tree.brand.id,
      };
      const a = await seedActiveStandardVariant(
        persistence,
        actors.tree.brand.id,
        actors.brandAdminActor,
        "r7a",
      );
      const b = await seedActiveStandardVariant(
        persistence,
        actors.tree.brand.id,
        actors.brandAdminActor,
        "r7b",
      );
      const base = await addCartLine(persistence, access, {
        variantId: catalog.variantId,
        quantity: 1,
      }, opts);
      const rev = base.cart.revision;
      const lineId = base.cart.lines[0]!.id;
      const results = await Promise.allSettled([
        updateCartLineConfiguration(persistence, access, {
          cartLineId: lineId,
          variantId: a.variantId,
          expectedRevision: rev,
        }, opts),
        updateCartLineConfiguration(persistence, access, {
          cartLineId: lineId,
          variantId: b.variantId,
          expectedRevision: rev,
        }, opts),
      ]);
      expect(settled(results).ok).toHaveLength(1);
      expect(settled(results).fail).toHaveLength(1);
    });
  });

  it("race-08-edit-causing-coalesce-vs-mutation-of-target-line", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const access = {
        kind: "customer" as const,
        actor: actors.customerA,
        brandId: actors.tree.brand.id,
      };
      const other = await seedActiveStandardVariant(
        persistence,
        actors.tree.brand.id,
        actors.brandAdminActor,
        "r8",
      );
      let cart = (
        await addCartLine(persistence, access, {
          variantId: catalog.variantId,
          quantity: 1,
        }, opts)
      ).cart;
      cart = (
        await addCartLine(persistence, access, {
          variantId: other.variantId,
          quantity: 1,
          expectedRevision: cart.revision,
        }, opts)
      ).cart;
      const rev = cart.revision;
      const plain = cart.lines.find((l) => l.variantId === catalog.variantId)!;
      const alt = cart.lines.find((l) => l.variantId === other.variantId)!;
      const results = await Promise.allSettled([
        updateCartLineConfiguration(persistence, access, {
          cartLineId: alt.id,
          variantId: catalog.variantId,
          expectedRevision: rev,
        }, opts),
        setCartLineQuantity(persistence, access, {
          cartLineId: plain.id,
          quantity: 9,
          expectedRevision: rev,
        }, opts),
      ]);
      expect(settled(results).ok).toHaveLength(1);
      expect(settled(results).fail).toHaveLength(1);
      const final = await getActiveCart(persistence, access, opts);
      expect(final!.lines.every((l) => l.quantity > 0)).toBe(true);
    });
  });

  it("race-09-clearCart-vs-addLine", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const access = {
        kind: "customer" as const,
        actor: actors.customerA,
        brandId: actors.tree.brand.id,
      };
      const base = await addCartLine(persistence, access, {
        variantId: catalog.variantId,
        quantity: 1,
      }, opts);
      const rev = base.cart.revision;
      const results = await Promise.allSettled([
        clearCart(persistence, access, { expectedRevision: rev }, opts),
        addCartLine(persistence, access, {
          variantId: catalog.variantId,
          quantity: 1,
          expectedRevision: rev,
        }, opts),
      ]);
      expect(settled(results).ok).toHaveLength(1);
      expect(settled(results).fail).toHaveLength(1);
    });
  });

  it("race-10-clearCart-vs-applyCoupon", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const access = {
        kind: "customer" as const,
        actor: actors.customerA,
        brandId: actors.tree.brand.id,
      };
      const coupon = await seedRecognizedCoupon(
        persistence,
        actors.tree.brand.id,
        actors.brandAdminActor,
        "RACE10CPN",
      );
      const base = await addCartLine(persistence, access, {
        variantId: catalog.variantId,
        quantity: 1,
      }, opts);
      const rev = base.cart.revision;
      const results = await Promise.allSettled([
        clearCart(persistence, access, { expectedRevision: rev }, opts),
        applyCartCoupon(persistence, access, {
          couponCode: coupon.canonicalCode,
          expectedRevision: rev,
        }, opts),
      ]);
      expect(settled(results).ok).toHaveLength(1);
      expect(settled(results).fail).toHaveLength(1);
    });
  });

  it("race-11-applyCoupon-vs-removeCoupon", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const access = {
        kind: "customer" as const,
        actor: actors.customerA,
        brandId: actors.tree.brand.id,
      };
      const coupon = await seedRecognizedCoupon(
        persistence,
        actors.tree.brand.id,
        actors.brandAdminActor,
        "RACE11CPN",
      );
      let cart = (
        await addCartLine(persistence, access, {
          variantId: catalog.variantId,
          quantity: 1,
        }, opts)
      ).cart;
      cart = await applyCartCoupon(persistence, access, {
        couponCode: coupon.canonicalCode,
        expectedRevision: cart.revision,
      }, opts);
      const rev = cart.revision;
      const other = await seedRecognizedCoupon(
        persistence,
        actors.tree.brand.id,
        actors.brandAdminActor,
        "RACE11B",
      );
      const results = await Promise.allSettled([
        applyCartCoupon(persistence, access, {
          couponCode: other.canonicalCode,
          expectedRevision: rev,
        }, opts),
        removeCartCoupon(persistence, access, { expectedRevision: rev }, opts),
      ]);
      expect(settled(results).ok).toHaveLength(1);
      expect(settled(results).fail).toHaveLength(1);
    });
  });

  it("race-12-applyCoupon-vs-addLine", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const access = {
        kind: "customer" as const,
        actor: actors.customerA,
        brandId: actors.tree.brand.id,
      };
      const coupon = await seedRecognizedCoupon(
        persistence,
        actors.tree.brand.id,
        actors.brandAdminActor,
        "RACE12CPN",
      );
      const base = await addCartLine(persistence, access, {
        variantId: catalog.variantId,
        quantity: 1,
      }, opts);
      const rev = base.cart.revision;
      const results = await Promise.allSettled([
        applyCartCoupon(persistence, access, {
          couponCode: coupon.canonicalCode,
          expectedRevision: rev,
        }, opts),
        addCartLine(persistence, access, {
          variantId: catalog.variantId,
          quantity: 1,
          expectedRevision: rev,
        }, opts),
      ]);
      expect(settled(results).ok).toHaveLength(1);
      expect(settled(results).fail).toHaveLength(1);
    });
  });

  it("race-13-customer-first-Cart-create-vs-first-Cart-create", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const access = {
        kind: "customer" as const,
        actor: actors.customerA,
        brandId: actors.tree.brand.id,
      };
      const results = await Promise.allSettled([
        addCartLine(persistence, access, {
          variantId: catalog.variantId,
          quantity: 1,
        }, opts),
        addCartLine(persistence, access, {
          variantId: catalog.variantId,
          quantity: 2,
        }, opts),
      ]);
      const { ok, fail } = settled(results);
      expect(ok).toHaveLength(1);
      expect(fail).toHaveLength(1);
      const cart = await getActiveCart(persistence, access, opts);
      expect(cart).not.toBeNull();
      expect(cart!.lines).toHaveLength(1);
    });
  });

  it("race-14-guest-claim-vs-customer-first-Cart-creation", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const brandId = actors.tree.brand.id;
      const guest = await addCartLine(
        persistence,
        { kind: "guest", brandId },
        { variantId: catalog.variantId, quantity: 1 },
        opts,
      );
      const results = await Promise.allSettled([
        claimGuestCart(
          persistence,
          actors.customerA,
          {
            guestToken: guest.guestToken!,
            brandId,
            expectedGuestRevision: guest.cart.revision,
          },
          opts,
        ),
        addCartLine(
          persistence,
          { kind: "customer", actor: actors.customerA, brandId },
          { variantId: catalog.variantId, quantity: 1 },
          opts,
        ),
      ]);
      const { ok, fail } = settled(results);
      expect(ok.length).toBeGreaterThanOrEqual(1);
      expect(fail.length).toBeGreaterThanOrEqual(1);
      const customerCart = await getActiveCart(
        persistence,
        { kind: "customer", actor: actors.customerA, brandId },
        opts,
      );
      expect(customerCart).not.toBeNull();
      // At most one customer cart
      await persistence.withContext(async (ctx) => {
        const { sql } = await import("drizzle-orm");
        const count = await ctx.db.execute(sql`
          select count(*)::text as c from app.carts
          where customer_auth_user_id = ${actors.customerAId}
            and brand_id = ${brandId}::uuid
        `);
        expect(count.rows[0]?.c).toBe("1");
      });
    });
  });

  it("race-15-guest-reconciliation-vs-customer-Cart-mutation", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const brandId = actors.tree.brand.id;
      const customer = (
        await addCartLine(
          persistence,
          { kind: "customer", actor: actors.customerA, brandId },
          { variantId: catalog.variantId, quantity: 1 },
          opts,
        )
      ).cart;
      const guest = await addCartLine(
        persistence,
        { kind: "guest", brandId },
        { variantId: catalog.variantId, quantity: 1 },
        opts,
      );
      const rev = customer.revision;
      const results = await Promise.allSettled([
        reconcileGuestCartWithCustomer(
          persistence,
          actors.customerA,
          {
            guestToken: guest.guestToken!,
            brandId,
            expectedGuestRevision: guest.cart.revision,
            expectedCustomerRevision: rev,
          },
          opts,
        ),
        setCartLineQuantity(
          persistence,
          { kind: "customer", actor: actors.customerA, brandId },
          {
            cartLineId: customer.lines[0]!.id,
            quantity: 5,
            expectedRevision: rev,
          },
          opts,
        ),
      ]);
      expect(settled(results).ok).toHaveLength(1);
      expect(settled(results).fail).toHaveLength(1);
    });
  });

  it("race-16-two-guest-reconciliations-into-same-customer-Cart", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const brandId = actors.tree.brand.id;
      const customer = (
        await addCartLine(
          persistence,
          { kind: "customer", actor: actors.customerA, brandId },
          { variantId: catalog.variantId, quantity: 1 },
          opts,
        )
      ).cart;
      const g1 = await addCartLine(
        persistence,
        { kind: "guest", brandId },
        { variantId: catalog.variantId, quantity: 1 },
        opts,
      );
      // Second guest needs different verifier — use other brand then... guest verifier is globally unique but brand scoped lookup
      // Create second guest on same brand with different token
      const g2 = await addCartLine(
        persistence,
        { kind: "guest", brandId },
        { variantId: catalog.variantId, quantity: 1 },
        opts,
      );
      const results = await Promise.allSettled([
        reconcileGuestCartWithCustomer(
          persistence,
          actors.customerA,
          {
            guestToken: g1.guestToken!,
            brandId,
            expectedGuestRevision: g1.cart.revision,
            expectedCustomerRevision: customer.revision,
          },
          opts,
        ),
        reconcileGuestCartWithCustomer(
          persistence,
          actors.customerA,
          {
            guestToken: g2.guestToken!,
            brandId,
            expectedGuestRevision: g2.cart.revision,
            expectedCustomerRevision: customer.revision,
          },
          opts,
        ),
      ]);
      expect(settled(results).ok).toHaveLength(1);
      expect(settled(results).fail).toHaveLength(1);
    });
  });

  it("race-17-claim-reconcile-vs-guest-expiry-boundary", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const brandId = actors.tree.brand.id;
      const { mutableCartClock } = await import("../database/support/cart-fixtures");
      const clock = mutableCartClock(FIXED_NOW);
      const localOpts = { clock: clock.clock, policy: GUEST_POLICY };
      const guest = await addCartLine(
        persistence,
        { kind: "guest", brandId },
        { variantId: catalog.variantId, quantity: 1 },
        localOpts,
      );
      // Advance to exact expiry
      clock.set(new Date(guest.cart.expiresAt!.getTime()));
      const results = await Promise.allSettled([
        claimGuestCart(
          persistence,
          actors.customerA,
          {
            guestToken: guest.guestToken!,
            brandId,
            expectedGuestRevision: guest.cart.revision,
          },
          localOpts,
        ),
        addCartLine(
          persistence,
          { kind: "guest", brandId, guestToken: guest.guestToken! },
          {
            variantId: catalog.variantId,
            quantity: 1,
            expectedRevision: guest.cart.revision,
          },
          localOpts,
        ),
      ]);
      // Both should fail as expired (now >= expiresAt)
      expect(settled(results).ok).toHaveLength(0);
      expect(settled(results).fail).toHaveLength(2);
      for (const f of settled(results).fail) {
        expect((f.reason as { code?: string }).code).toBe("CART_EXPIRED");
      }
    });
  });

  it("race-18-evaluation-vs-line-mutation", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const access = {
        kind: "customer" as const,
        actor: actors.customerA,
        brandId: actors.tree.brand.id,
      };
      const base = await addCartLine(persistence, access, {
        variantId: catalog.variantId,
        quantity: 1,
      }, opts);
      const rev = base.cart.revision;
      const results = await Promise.allSettled([
        evaluateCart(persistence, access, {}, { clock: opts.clock }),
        setCartLineQuantity(persistence, access, {
          cartLineId: base.cart.lines[0]!.id,
          quantity: 3,
          expectedRevision: rev,
        }, opts),
      ]);
      const { ok } = settled(results);
      expect(ok.length).toBeGreaterThanOrEqual(1);
      // Evaluation may succeed alongside mutation; if both ok, evaluation saw N or N+1
      const evalResult = results.find(
        (r) => r.status === "fulfilled" && "status" in (r.value as object),
      );
      if (evalResult && evalResult.status === "fulfilled") {
        const ev = evalResult.value as { cartRevision: bigint };
        expect([rev, rev + BigInt(1)]).toContain(ev.cartRevision);
      }
      const cart = await getActiveCart(persistence, access, opts);
      expect(cart!.lines[0]!.quantity === 1 || cart!.lines[0]!.quantity === 3).toBe(
        true,
      );
    });
  });

  it("race-19-evaluation-vs-clearCart", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const access = {
        kind: "customer" as const,
        actor: actors.customerA,
        brandId: actors.tree.brand.id,
      };
      const base = await addCartLine(persistence, access, {
        variantId: catalog.variantId,
        quantity: 1,
      }, opts);
      const rev = base.cart.revision;
      const results = await Promise.allSettled([
        evaluateCart(persistence, access, {}, { clock: opts.clock }),
        clearCart(persistence, access, { expectedRevision: rev }, opts),
      ]);
      const evalResult = results.find(
        (r) => r.status === "fulfilled" && "cartRevision" in (r.value as object),
      );
      if (evalResult && evalResult.status === "fulfilled") {
        const ev = evalResult.value as { cartRevision: bigint };
        // Evaluation observes a complete aggregate at revision N or N+1 — never mixed.
        expect([rev, rev + BigInt(1)]).toContain(ev.cartRevision);
      }
      const cart = await getActiveCart(persistence, access, opts);
      expect(cart).not.toBeNull();
      // Clear either won or conflicted; cart is coherent
      expect(cart!.revision === rev || cart!.revision === rev + BigInt(1)).toBe(true);
    });
  });

  it("race-20-different-Cart-independence", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const a = {
        kind: "customer" as const,
        actor: actors.customerA,
        brandId: actors.tree.brand.id,
      };
      const b = {
        kind: "customer" as const,
        actor: actors.customerB,
        brandId: actors.tree.brand.id,
      };
      const ca = await addCartLine(persistence, a, {
        variantId: catalog.variantId,
        quantity: 1,
      }, opts);
      const cb = await addCartLine(persistence, b, {
        variantId: catalog.variantId,
        quantity: 1,
      }, opts);
      const results = await Promise.allSettled([
        setCartLineQuantity(persistence, a, {
          cartLineId: ca.cart.lines[0]!.id,
          quantity: 4,
          expectedRevision: ca.cart.revision,
        }, opts),
        setCartLineQuantity(persistence, b, {
          cartLineId: cb.cart.lines[0]!.id,
          quantity: 6,
          expectedRevision: cb.cart.revision,
        }, opts),
      ]);
      expect(settled(results).ok).toHaveLength(2);
      const fa = await getActiveCart(persistence, a, opts);
      const fb = await getActiveCart(persistence, b, opts);
      expect(fa!.lines[0]!.quantity).toBe(4);
      expect(fb!.lines[0]!.quantity).toBe(6);
    });
  });
});
