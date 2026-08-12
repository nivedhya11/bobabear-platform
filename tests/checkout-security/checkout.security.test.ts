/**
 * Checkout security tests (IMP-021) — exactly S01–S24.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import {
  getCustomerAuthRuntime,
  isTrustedCustomerAuthIdentity,
  resolveTrustedCustomerAuthIdentity,
  type CustomerPhoneAuthRuntimeDependencies,
} from "../../src/server/auth/customer";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import { addCartLine } from "../../src/server/cart";
import { createCustomerActorFromTrustedAuthIdentity } from "../../src/server/cart/actor";
import { customerActorFromTrustedCustomerAuthIdentity } from "../../src/server/cart/auth-adapter";
import {
  cancelCheckout,
  evaluateCheckout,
  getActiveCheckout,
  prepareCheckoutForPayment,
  setCheckoutDestination,
  startCheckout,
  type CustomerActor,
} from "../../src/server/checkout";
import * as checkoutPublicApi from "../../src/server/checkout";
import * as checkoutRepository from "../../src/server/checkout/repository";
import {
  createCustomerTemporaryIdentityDeriver,
  type CustomerPiiHashSecret,
} from "../../src/server/customer-auth/pii";
import { createLocalCustomerOtpProviderForTests } from "../../src/server/customer-auth/provider/local";
import { removeOutletServiceabilityPins } from "../../src/server/serviceability";
import {
  applicationConfig,
  trackPersistenceHandle,
} from "../database/support/cart-fixtures";
import {
  CHECKOUT_POLICY,
  FIXED_NOW,
  checkoutOpts,
  closeTrackedPersistenceHandles,
  createSavedAddressForCustomer,
  mintCustomerActor,
  mutableCartClock,
  withCheckoutReadyHarness,
} from "../database/support/checkout-fixtures";

const CHECKOUT_SECURITY_PII_HASH_SECRET =
  "checkout-security-pii-hash-secret-32chars!" as CustomerPiiHashSecret;

function checkoutSecurityAuthFoundationConfig() {
  return loadAuthFoundationConfig(
    {
      CUSTOMER_AUTH_SECRET: "checkout-security-customer-auth-secret-32chars!",
      CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
      WORKFORCE_AUTH_SECRET: "checkout-security-workforce-auth-secret-32chars",
      WORKFORCE_AUTH_BASE_URL: "http://localhost:3100",
    },
    "test",
  );
}

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

const opts = checkoutOpts();

async function startDraftWithDestination(
  persistence: Parameters<typeof startCheckout>[0],
  actor: CustomerActor,
  cartId: string,
  addressId: string,
) {
  const draft = await startCheckout(persistence, actor, { cartId }, opts);
  return setCheckoutDestination(
    persistence,
    actor,
    {
      checkoutId: draft.id,
      expectedCheckoutRevision: draft.revision,
      destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
    },
    opts,
  );
}

describe("IMP-021 checkout security S01–S24", () => {
  it("S01 unauthenticated plain object / null actor cannot start", async () => {
    await withCheckoutReadyHarness(async ({ persistence, cartId }) => {
      await expect(
        startCheckout(persistence, null, { cartId }, opts),
      ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });

      await expect(
        startCheckout(
          persistence,
          { kind: "customer", authUserId: "nobody" },
          { cartId },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });
    });
  });

  it("S02 Customer B cannot getActiveCheckout Customer A's", async () => {
    await withCheckoutReadyHarness(async ({ persistence, actors, cartId }) => {
      const started = await startCheckout(
        persistence,
        actors.customerA,
        { cartId },
        opts,
      );
      expect(
        await getActiveCheckout(
          persistence,
          actors.customerB,
          { checkoutId: started.id },
          opts,
        ),
      ).toBeNull();
      expect(
        await getActiveCheckout(
          persistence,
          actors.customerB,
          { cartId },
          opts,
        ),
      ).toBeNull();
    });
  });

  it("S03 Customer B cannot mutate Customer A's Checkout", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const draft = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        await expect(
          setCheckoutDestination(
            persistence,
            actors.customerB,
            {
              checkoutId: draft.id,
              expectedCheckoutRevision: draft.revision,
              destination: {
                kind: "SAVED_ADDRESS",
                savedAddressId: addressId,
              },
            },
            opts,
          ),
        ).rejects.toMatchObject({ code: "CHECKOUT_NOT_FOUND" });
        await expect(
          cancelCheckout(
            persistence,
            actors.customerB,
            {
              checkoutId: draft.id,
              expectedCheckoutRevision: draft.revision,
            },
            opts,
          ),
        ).rejects.toMatchObject({ code: "CHECKOUT_NOT_FOUND" });
      },
    );
  });

  it("S04 Customer A cannot start Checkout from Customer B Cart", async () => {
    await withCheckoutReadyHarness(async ({ persistence, actors, catalog }) => {
      const brandId = actors.tree.brand.id;
      const bCart = await addCartLine(
        persistence,
        { kind: "customer", actor: actors.customerB, brandId },
        { variantId: catalog.variantId, quantity: 1 },
      );
      await expect(
        startCheckout(
          persistence,
          actors.customerA,
          { cartId: bCart.cart.id },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_NOT_FOUND" });
    });
  });

  it("S05 Customer A cannot use Customer B saved address (non-leaking)", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId }) => {
        const bAddress = await createSavedAddressForCustomer(
          persistence,
          actors.customerBId,
          {
            recipientName: "Secret B Recipient",
            recipientPhone: "+919811122233",
            addressLine1: "99 Hidden Lane B",
          },
        );
        const draft = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        try {
          await setCheckoutDestination(
            persistence,
            actors.customerA,
            {
              checkoutId: draft.id,
              expectedCheckoutRevision: draft.revision,
              destination: {
                kind: "SAVED_ADDRESS",
                savedAddressId: bAddress.id,
              },
            },
            opts,
          );
          expect.fail("expected cross-customer address denial");
        } catch (error) {
          expect(error).toMatchObject({
            code: "CHECKOUT_INVALID_INPUT",
            field: "savedAddressId",
          });
          const message = String((error as Error).message);
          const safe =
            typeof (error as { toSafeJSON?: () => unknown }).toSafeJSON ===
            "function"
              ? JSON.stringify(
                  (error as { toSafeJSON: () => unknown }).toSafeJSON(),
                )
              : message;
          expect(message).not.toContain("Secret B Recipient");
          expect(message).not.toContain("99 Hidden Lane B");
          expect(message).not.toContain("+919811122233");
          expect(safe).not.toContain("Secret B Recipient");
          expect(safe).not.toContain("99 Hidden Lane B");
        }
      },
    );
  });

  it("S06 caller-supplied customerAuthUserId rejected on start/destination", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        await expect(
          startCheckout(
            persistence,
            actors.customerA,
            {
              cartId,
              customerAuthUserId: actors.customerBId,
            } as never,
            opts,
          ),
        ).rejects.toMatchObject({ code: "CHECKOUT_INVALID_INPUT" });

        const draft = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        await expect(
          setCheckoutDestination(
            persistence,
            actors.customerA,
            {
              checkoutId: draft.id,
              expectedCheckoutRevision: draft.revision,
              customerAuthUserId: actors.customerBId,
              destination: {
                kind: "SAVED_ADDRESS",
                savedAddressId: addressId,
              },
            } as never,
            opts,
          ),
        ).rejects.toMatchObject({ code: "CHECKOUT_INVALID_INPUT" });
      },
    );
  });

  it("S07 Brand/owner fields rejected", async () => {
    await withCheckoutReadyHarness(async ({ persistence, actors, cartId }) => {
      await expect(
        startCheckout(
          persistence,
          actors.customerA,
          {
            cartId,
            brandId: actors.tree.brand.id,
            ownerCustomerAuthUserId: actors.customerAId,
          } as never,
          opts,
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_INVALID_INPUT" });
    });
  });

  it("S08 selectedOutletId rejected", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const draft = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        await expect(
          setCheckoutDestination(
            persistence,
            actors.customerA,
            {
              checkoutId: draft.id,
              expectedCheckoutRevision: draft.revision,
              selectedOutletId: actors.tree.outletA.id,
              destination: {
                kind: "SAVED_ADDRESS",
                savedAddressId: addressId,
              },
            } as never,
            opts,
          ),
        ).rejects.toMatchObject({ code: "CHECKOUT_INVALID_INPUT" });

        const withDest = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: draft.id,
            expectedCheckoutRevision: draft.revision,
            destination: {
              kind: "SAVED_ADDRESS",
              savedAddressId: addressId,
            },
          },
          opts,
        );
        await expect(
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: withDest.id,
              expectedCheckoutRevision: withDest.revision,
              selectedOutletId: actors.tree.outletA.id,
            } as never,
            opts,
          ),
        ).rejects.toMatchObject({ code: "CHECKOUT_INVALID_INPUT" });
      },
    );
  });

  it("S09 price/money/tax/discount fields rejected", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const withDest = await startDraftWithDestination(
          persistence,
          actors.customerA,
          cartId,
          addressId,
        );
        await expect(
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: withDest.id,
              expectedCheckoutRevision: withDest.revision,
              grandTotalPaise: BigInt(1),
              taxPaise: BigInt(1),
              promotionDiscountPaise: BigInt(1),
            } as never,
            opts,
          ),
        ).rejects.toMatchObject({ code: "CHECKOUT_INVALID_INPUT" });
      },
    );
  });

  it("S10 status/activeSnapshotId rejected", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const withDest = await startDraftWithDestination(
          persistence,
          actors.customerA,
          cartId,
          addressId,
        );
        await expect(
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: withDest.id,
              expectedCheckoutRevision: withDest.revision,
              status: "READY_FOR_PAYMENT",
              activeSnapshotId: "00000000-0000-4000-8000-000000000099",
            } as never,
            opts,
          ),
        ).rejects.toMatchObject({ code: "CHECKOUT_INVALID_INPUT" });
      },
    );
  });

  it("S11 old inactive snapshot cannot be reactivated via domain; prepare uses active_snapshot_id", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        expect(checkoutPublicApi).not.toHaveProperty("setActiveSnapshot");
        expect(checkoutPublicApi).not.toHaveProperty("setActiveSnapshotId");
        expect(checkoutRepository).not.toHaveProperty("setActiveSnapshot");
        expect(checkoutRepository).not.toHaveProperty("setActiveSnapshotId");

        let checkout = await startDraftWithDestination(
          persistence,
          actors.customerA,
          cartId,
          addressId,
        );
        const first = await evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: checkout.id,
            expectedCheckoutRevision: checkout.revision,
          },
          opts,
        );
        const s1 = first.snapshot.id;
        expect(first.checkout.activeSnapshotId).toBe(s1);

        // Destination change demotes READY → DRAFT and clears active pointer.
        checkout = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: first.checkout.id,
            expectedCheckoutRevision: first.checkout.revision,
            destination: {
              kind: "ONE_TIME_ADDRESS",
              recipientName: "Rebuild Guest",
              recipientPhone: "+919876543210",
              addressLine1: "1 Rebuild Road",
              city: "Dehradun",
              stateCode: "IN-UT",
              postalCode: "248001",
            },
          },
          opts,
        );
        expect(checkout.status).toBe("DRAFT");
        expect(checkout.activeSnapshotId).toBeNull();

        const second = await evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: checkout.id,
            expectedCheckoutRevision: checkout.revision,
          },
          opts,
        );
        const s2 = second.snapshot.id;
        expect(s2).not.toBe(s1);
        expect(second.checkout.activeSnapshotId).toBe(s2);

        // No domain helper reactivates S1; prepare only loads active_snapshot_id.
        const prepared = await prepareCheckoutForPayment(
          persistence,
          actors.customerA,
          {
            checkoutId: second.checkout.id,
            expectedCheckoutRevision: second.checkout.revision,
          },
          opts,
        );
        expect(prepared.snapshot.id).toBe(s2);
        expect(prepared.snapshot.id).not.toBe(s1);

        await persistence.withContext(async (ctx) => {
          // Inactive S1 still exists but is not active.
          const rows = await ctx.db.execute(sql`
            select id from app.checkout_snapshots
            where checkout_id = ${second.checkout.id}::uuid
            order by created_at asc
          `);
          expect(rows.rows.length).toBeGreaterThanOrEqual(2);
          expect(rows.rows.some((r) => String(r.id) === s1)).toBe(true);
        });
      },
    );
  });

  it("S12 snapshot of Checkout B cannot attach to A — composite ownership FK rejects", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, catalog, cartId, addressId }) => {
        expect(checkoutRepository).not.toHaveProperty("setActiveSnapshotId");
        const brandId = actors.tree.brand.id;

        const cartB = await addCartLine(
          persistence,
          { kind: "customer", actor: actors.customerB, brandId },
          { variantId: catalog.variantId, quantity: 1 },
        );
        const addressB = await createSavedAddressForCustomer(
          persistence,
          actors.customerBId,
        );
        const draftB = await startDraftWithDestination(
          persistence,
          actors.customerB,
          cartB.cart.id,
          addressB.id,
        );
        const readyB = await evaluateCheckout(
          persistence,
          actors.customerB,
          {
            checkoutId: draftB.id,
            expectedCheckoutRevision: draftB.revision,
          },
          opts,
        );

        const draftA = await startDraftWithDestination(
          persistence,
          actors.customerA,
          cartId,
          addressId,
        );
        const readyA = await evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: draftA.id,
            expectedCheckoutRevision: draftA.revision,
          },
          opts,
        );

        const snapshotABefore = readyA.checkout.activeSnapshotId;
        expect(snapshotABefore).toBeTruthy();
        expect(readyB.snapshot.id).not.toBe(snapshotABefore);

        await persistence.withContext(async (ctx) => {
          await expect(
            ctx.db.execute(sql`
              update app.checkouts
              set active_snapshot_id = ${readyB.snapshot.id}::uuid
              where id = ${readyA.checkout.id}::uuid
            `),
          ).rejects.toThrow();
        });

        await persistence.withContext(async (ctx) => {
          const row = await ctx.db.execute(sql`
            select active_snapshot_id::text as active_snapshot_id
            from app.checkouts
            where id = ${readyA.checkout.id}::uuid
          `);
          expect(row.rows[0]!.active_snapshot_id).toBe(snapshotABefore);

          const snapB = await ctx.db.execute(sql`
            select checkout_id::text as checkout_id
            from app.checkout_snapshots
            where id = ${readyB.snapshot.id}::uuid
          `);
          expect(snapB.rows[0]!.checkout_id).toBe(readyB.checkout.id);
          expect(snapB.rows[0]!.checkout_id).not.toBe(readyA.checkout.id);
        });

        await expect(
          prepareCheckoutForPayment(
            persistence,
            actors.customerB,
            {
              checkoutId: readyA.checkout.id,
              expectedCheckoutRevision: readyA.checkout.revision,
            },
            opts,
          ),
        ).rejects.toMatchObject({ code: "CHECKOUT_NOT_FOUND" });
      },
    );
  });

  it("S13 stale expectedCheckoutRevision → CHECKOUT_CONFLICT", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const draft = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: draft.id,
            expectedCheckoutRevision: draft.revision,
            destination: {
              kind: "SAVED_ADDRESS",
              savedAddressId: addressId,
            },
          },
          opts,
        );
        await expect(
          setCheckoutDestination(
            persistence,
            actors.customerA,
            {
              checkoutId: draft.id,
              expectedCheckoutRevision: draft.revision,
              destination: {
                kind: "ONE_TIME_ADDRESS",
                recipientName: "Stale",
                recipientPhone: "+919876543210",
                addressLine1: "1 Stale St",
                city: "Dehradun",
                stateCode: "IN-UT",
                postalCode: "248001",
              },
            },
            opts,
          ),
        ).rejects.toMatchObject({ code: "CHECKOUT_CONFLICT" });
      },
    );
  });

  it("S14 terminal Checkout mutation rejected", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const withDest = await startDraftWithDestination(
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
        expect(cancelled.status).toBe("CANCELLED");
        await expect(
          setCheckoutDestination(
            persistence,
            actors.customerA,
            {
              checkoutId: cancelled.id,
              expectedCheckoutRevision: cancelled.revision,
              destination: {
                kind: "SAVED_ADDRESS",
                savedAddressId: addressId,
              },
            },
            opts,
          ),
        ).rejects.toMatchObject({ code: "CHECKOUT_STATE_CONFLICT" });
        await expect(
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: cancelled.id,
              expectedCheckoutRevision: cancelled.revision,
            },
            opts,
          ),
        ).rejects.toMatchObject({ code: "CHECKOUT_STATE_CONFLICT" });
      },
    );
  });

  it("S15 exact expiry: now < / == / > expiresAt with controllable clock", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const clock = mutableCartClock(FIXED_NOW);
        const localOpts = {
          clock: clock.clock,
          policy: CHECKOUT_POLICY,
        };

        // now < expiresAt → mutation allowed
        let draft = await startDraftWithDestination(
          persistence,
          actors.customerA,
          cartId,
          addressId,
        );
        clock.set(new Date(draft.expiresAt.getTime() - 1));
        draft = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: draft.id,
            expectedCheckoutRevision: draft.revision,
            destination: {
              kind: "ONE_TIME_ADDRESS",
              recipientName: "Before Expiry",
              recipientPhone: "+919876543210",
              addressLine1: "1 Before St",
              city: "Dehradun",
              stateCode: "IN-UT",
              postalCode: "248001",
            },
          },
          localOpts,
        );
        expect(draft.status).toBe("DRAFT");

        // now == expiresAt → expired
        clock.set(new Date(draft.expiresAt.getTime()));
        await expect(
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: draft.id,
              expectedCheckoutRevision: draft.revision,
            },
            localOpts,
          ),
        ).rejects.toMatchObject({ code: "CHECKOUT_EXPIRED" });

        // now > expiresAt → still expired
        clock.set(new Date(draft.expiresAt.getTime() + 1_000));
        await expect(
          cancelCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: draft.id,
              expectedCheckoutRevision: draft.revision,
            },
            localOpts,
          ),
        ).rejects.toMatchObject({ code: "CHECKOUT_EXPIRED" });
      },
    );
  });

  it("S16 expired Checkout cannot be revived", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const clock = mutableCartClock(FIXED_NOW);
        const localOpts = { clock: clock.clock, policy: CHECKOUT_POLICY };
        const withDest = await startDraftWithDestination(
          persistence,
          actors.customerA,
          cartId,
          addressId,
        );
        clock.set(new Date(withDest.expiresAt.getTime()));
        await expect(
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: withDest.id,
              expectedCheckoutRevision: withDest.revision,
            },
            localOpts,
          ),
        ).rejects.toMatchObject({ code: "CHECKOUT_EXPIRED" });
        await expect(
          cancelCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: withDest.id,
              expectedCheckoutRevision: withDest.revision,
            },
            localOpts,
          ),
        ).rejects.toMatchObject({ code: "CHECKOUT_EXPIRED" });

        // Active lookup treats logically expired as absent
        expect(
          await getActiveCheckout(
            persistence,
            actors.customerA,
            { checkoutId: withDest.id },
            localOpts,
          ),
        ).toBeNull();
      },
    );
  });

  it("S17 structural fake CustomerActor without brand → CUSTOMER_AUTH_REQUIRED", async () => {
    await withCheckoutReadyHarness(async ({ persistence, cartId }) => {
      const fake = { kind: "customer" as const, authUserId: "cust-fake" };
      await expect(
        startCheckout(persistence, fake, { cartId }, opts),
      ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });
    });
  });

  it("S18 raw customer ID deep-import cannot mint Checkout authority", async () => {
    await withCheckoutReadyHarness(async ({ actors }) => {
      expect(() =>
        createCustomerActorFromTrustedAuthIdentity({
          authUserId: actors.customerAId,
        } as never),
      ).toThrow(expect.objectContaining({ code: "CUSTOMER_AUTH_REQUIRED" }));

      expect(() =>
        customerActorFromTrustedCustomerAuthIdentity({
          userId: actors.customerAId,
        } as never),
      ).toThrow(expect.objectContaining({ code: "CUSTOMER_AUTH_REQUIRED" }));

      const structural = { userId: actors.customerAId };
      expect(isTrustedCustomerAuthIdentity(structural)).toBe(false);
      expect(() =>
        customerActorFromTrustedCustomerAuthIdentity(structural as never),
      ).toThrow(expect.objectContaining({ code: "CUSTOMER_AUTH_REQUIRED" }));

      expect(checkoutPublicApi).not.toHaveProperty(
        "createCustomerActorFromTrustedAuthIdentity",
      );
      expect(checkoutPublicApi).not.toHaveProperty(
        "customerActorFromTrustedCustomerAuthIdentity",
      );
      const indexSource = readFileSync(
        path.join(process.cwd(), "src/server/checkout/index.ts"),
        "utf8",
      );
      expect(indexSource).not.toMatch(
        /\bcreateCustomerActorFromTrustedAuthIdentity\b/,
      );
    });
  });

  it("S19 forged session token → resolveTrustedCustomerAuthIdentity null → cannot mint actor", async () => {
    await withCheckoutReadyHarness(async ({ database, actors }) => {
      const otpProvider = createLocalCustomerOtpProviderForTests({
        environmentType: "test",
      });
      const phoneDeps: CustomerPhoneAuthRuntimeDependencies = {
        otpProvider,
        identityDeriver: createCustomerTemporaryIdentityDeriver(
          CHECKOUT_SECURITY_PII_HASH_SECRET,
        ),
      };
      const runtime = getCustomerAuthRuntime(
        {
          auth: checkoutSecurityAuthFoundationConfig().customer,
          persistence: applicationConfig(database.connectionString),
        },
        phoneDeps,
      );
      trackPersistenceHandle(runtime);

      const identity = await resolveTrustedCustomerAuthIdentity(runtime, {
        sessionToken: "forged-not-a-real-customer-session-token",
      });
      expect(identity).toBeNull();
      expect(actors.customerAId.length).toBeGreaterThan(0);
      expect(() =>
        customerActorFromTrustedCustomerAuthIdentity({
          userId: actors.customerAId,
        } as never),
      ).toThrow(expect.objectContaining({ code: "CUSTOMER_AUTH_REQUIRED" }));

      await runtime.close();
      await otpProvider.close();
    });
  });

  it("S20 valid authenticated Customer A succeeds start", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, database }) => {
        const actor = await mintCustomerActor(
          database.connectionString,
          actors.customerAId,
        );
        const started = await startCheckout(
          persistence,
          actor,
          { cartId },
          opts,
        );
        expect(started.status).toBe("DRAFT");
        expect(started.cartId).toBe(cartId);
      },
    );
  });

  it("S21 dependency failure not permissive (broken serviceability → not READY)", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const withDest = await startDraftWithDestination(
          persistence,
          actors.customerA,
          cartId,
          addressId,
        );
        await removeOutletServiceabilityPins(
          persistence,
          actors.brandAdminActor,
          {
            outletId: actors.tree.outletA.id,
            postalCodes: ["248001"],
            expectedRevision: BigInt(2),
          },
        );
        await expect(
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: withDest.id,
              expectedCheckoutRevision: withDest.revision,
            },
            opts,
          ),
        ).rejects.toMatchObject({
          code: expect.stringMatching(
            /^CHECKOUT_(NOT_SERVICEABLE|SERVICEABILITY_|DEPENDENCY_|TAX_|PRICE_)/,
          ),
        });
        const after = await getActiveCheckout(
          persistence,
          actors.customerA,
          { checkoutId: withDest.id },
          opts,
        );
        expect(after!.status).toBe("DRAFT");
        expect(after!.activeSnapshotId).toBeNull();
      },
    );
  });

  it("S22 cross-customer failure messages do not leak destination/PII/prices", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId, oneTimeDestination }) => {
        const withDest = await startDraftWithDestination(
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
        const secretTotal = String(ready.snapshot.grandTotalPaise);
        const secretPhone = oneTimeDestination.recipientPhone;

        try {
          await setCheckoutDestination(
            persistence,
            actors.customerB,
            {
              checkoutId: ready.checkout.id,
              expectedCheckoutRevision: ready.checkout.revision,
              destination: { ...oneTimeDestination },
            },
            opts,
          );
          expect.fail("expected denial");
        } catch (error) {
          expect(error).toMatchObject({ code: "CHECKOUT_NOT_FOUND" });
          const message = String((error as Error).message);
          const safe = JSON.stringify(
            (error as { toSafeJSON: () => unknown }).toSafeJSON(),
          );
          expect(message).not.toContain(secretTotal);
          expect(safe).not.toContain(secretTotal);
          expect(message).not.toContain(secretPhone);
          expect(safe).not.toContain(addressId);
          expect(message.toLowerCase()).not.toContain("dehradun");
        }
      },
    );
  });

  it("S23 BIGINT revision beyond Number.MAX_SAFE_INTEGER remains exact", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const draft = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        const huge = BigInt(Number.MAX_SAFE_INTEGER) + BigInt(42);
        await persistence.withContext(async (ctx) => {
          await ctx.db.execute(sql`
            update app.checkouts
            set revision = ${huge.toString()}::bigint
            where id = ${draft.id}::uuid
          `);
        });
        const updated = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: draft.id,
            expectedCheckoutRevision: huge,
            destination: {
              kind: "SAVED_ADDRESS",
              savedAddressId: addressId,
            },
          },
          opts,
        );
        expect(updated.revision).toBe(huge + BigInt(1));
        expect(typeof updated.revision).toBe("bigint");
      },
    );
  });

  it("S24 unknown/__proto__/constructor/prototype fields fail closed via parse-input", async () => {
    await withCheckoutReadyHarness(async ({ persistence, actors, cartId }) => {
      const withProto = { cartId };
      Object.defineProperty(withProto, "__proto__", {
        value: { polluted: true },
        enumerable: true,
        configurable: true,
        writable: true,
      });
      for (const bad of [
        withProto,
        { cartId, ["__proto__"]: { polluted: true } },
        { cartId, constructor: { name: "Evil" } },
        { cartId, prototype: {} },
        { cartId, unknownField: true },
      ]) {
        await expect(
          startCheckout(persistence, actors.customerA, bad, opts),
        ).rejects.toMatchObject({ code: "CHECKOUT_INVALID_INPUT" });
      }
    });
  });

});
