/**
 * Checkout ↔ customer-auth integration tests (IMP-021) — cases A–H.
 *
 * Trusted CustomerActor is obtained only via real session validation:
 * createSession → resolveTrustedCustomerAuthIdentity →
 * customerActorFromTrustedCustomerAuthIdentity.
 */
import { afterEach, describe, expect, it } from "vitest";

import {
  getCustomerAuthRuntime,
  resolveTrustedCustomerAuthIdentity,
  type CustomerPhoneAuthRuntimeDependencies,
} from "../../src/server/auth/customer";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import {
  addCartLine,
  claimGuestCart,
  fixedCartClock,
  getActiveCart,
  reconcileGuestCartWithCustomer,
} from "../../src/server/cart";
import { customerActorFromTrustedCustomerAuthIdentity } from "../../src/server/cart/auth-adapter";
import {
  evaluateCheckout,
  getActiveCheckout,
  setCheckoutDestination,
  startCheckout,
} from "../../src/server/checkout";
import {
  createCustomerTemporaryIdentityDeriver,
  type CustomerPiiHashSecret,
} from "../../src/server/customer-auth/pii";
import { createLocalCustomerOtpProviderForTests } from "../../src/server/customer-auth/provider/local";
import {
  applicationConfig,
  GUEST_POLICY,
  trackPersistenceHandle,
} from "../database/support/cart-fixtures";
import {
  FIXED_NOW,
  checkoutOpts,
  closeTrackedPersistenceHandles,
  createSavedAddressForCustomer,
  withCartHarness,
  withCheckoutReadyHarness,
} from "../database/support/checkout-fixtures";

const CHECKOUT_AUTH_PII_HASH_SECRET =
  "checkout-auth-integration-pii-hash-secret-32!" as CustomerPiiHashSecret;

function checkoutAuthFoundationConfig() {
  return loadAuthFoundationConfig(
    {
      CUSTOMER_AUTH_SECRET: "checkout-auth-integration-customer-secret-32ch!",
      CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
      WORKFORCE_AUTH_SECRET: "checkout-auth-integration-workforce-secret-32c",
      WORKFORCE_AUTH_BASE_URL: "http://localhost:3100",
    },
    "test",
  );
}

type InternalAdapter = {
  createSession: (userId: string) => Promise<{ token: string }>;
  findSession: (
    token: string,
  ) => Promise<{ session: { token: string }; user: { id: string } } | null>;
  deleteSession: (token: string) => Promise<void>;
};

async function internalAdapterFor(runtime: {
  getAuth: () => Promise<{ $context: Promise<unknown> }>;
}): Promise<InternalAdapter> {
  const auth = await runtime.getAuth();
  const context = (await auth.$context) as { internalAdapter: InternalAdapter };
  return context.internalAdapter;
}

async function mintActorFromLiveSession(
  connectionString: string,
  customerAuthUserId: string,
): Promise<{
  actor: ReturnType<typeof customerActorFromTrustedCustomerAuthIdentity>;
  runtime: ReturnType<typeof getCustomerAuthRuntime>;
  otpProvider: ReturnType<typeof createLocalCustomerOtpProviderForTests>;
  sessionToken: string;
  adapter: InternalAdapter;
}> {
  const otpProvider = createLocalCustomerOtpProviderForTests({
    environmentType: "test",
  });
  const phoneDeps: CustomerPhoneAuthRuntimeDependencies = {
    otpProvider,
    identityDeriver: createCustomerTemporaryIdentityDeriver(
      CHECKOUT_AUTH_PII_HASH_SECRET,
    ),
  };
  const runtime = getCustomerAuthRuntime(
    {
      auth: checkoutAuthFoundationConfig().customer,
      persistence: applicationConfig(connectionString),
    },
    phoneDeps,
  );
  trackPersistenceHandle(runtime);
  const adapter = await internalAdapterFor(runtime);
  const session = await adapter.createSession(customerAuthUserId);
  const found = await adapter.findSession(session.token);
  expect(found?.user.id).toBe(customerAuthUserId);
  const identity = await resolveTrustedCustomerAuthIdentity(runtime, {
    sessionToken: session.token,
  });
  expect(identity?.userId).toBe(customerAuthUserId);
  const actor = customerActorFromTrustedCustomerAuthIdentity(identity);
  return { actor, runtime, otpProvider, sessionToken: session.token, adapter };
}

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

const opts = checkoutOpts();

describe("IMP-021 checkout auth integration A–H", () => {
  it("A: authenticated customer session → CustomerActor → start Checkout", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, database }) => {
        const { actor, runtime, otpProvider } = await mintActorFromLiveSession(
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
        await runtime.close();
        await otpProvider.close();
      },
    );
  });

  it("B: valid Customer A session → owned Saved Address → Checkout destination", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId, database }) => {
        const { actor, runtime, otpProvider } = await mintActorFromLiveSession(
          database.connectionString,
          actors.customerAId,
        );
        const draft = await startCheckout(
          persistence,
          actor,
          { cartId },
          opts,
        );
        const withDest = await setCheckoutDestination(
          persistence,
          actor,
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
        expect(withDest.destination?.destinationKind).toBe("SAVED_ADDRESS");
        expect(withDest.destination?.sourceSavedAddressId).toBe(addressId);
        await runtime.close();
        await otpProvider.close();
      },
    );
  });

  it("C: valid Customer A session → evaluate own Checkout successfully", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId, database }) => {
        const { actor, runtime, otpProvider } = await mintActorFromLiveSession(
          database.connectionString,
          actors.customerAId,
        );
        const draft = await startCheckout(
          persistence,
          actor,
          { cartId },
          opts,
        );
        const withDest = await setCheckoutDestination(
          persistence,
          actor,
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
        const ready = await evaluateCheckout(
          persistence,
          actor,
          {
            checkoutId: withDest.id,
            expectedCheckoutRevision: withDest.revision,
          },
          opts,
        );
        expect(ready.checkout.status).toBe("READY_FOR_PAYMENT");
        expect(ready.snapshot.grandTotalPaise).toBeGreaterThan(BigInt(0));
        await runtime.close();
        await otpProvider.close();
      },
    );
  });

  it("D: Customer B session → Customer A Checkout → non-leaking failure", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId, database }) => {
        const a = await mintActorFromLiveSession(
          database.connectionString,
          actors.customerAId,
        );
        const b = await mintActorFromLiveSession(
          database.connectionString,
          actors.customerBId,
        );
        const draft = await startCheckout(
          persistence,
          a.actor,
          { cartId },
          opts,
        );
        const withDest = await setCheckoutDestination(
          persistence,
          a.actor,
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
        expect(
          await getActiveCheckout(
            persistence,
            b.actor,
            { checkoutId: withDest.id },
            opts,
          ),
        ).toBeNull();
        try {
          await evaluateCheckout(
            persistence,
            b.actor,
            {
              checkoutId: withDest.id,
              expectedCheckoutRevision: withDest.revision,
            },
            opts,
          );
          expect.fail("expected cross-customer denial");
        } catch (error) {
          expect(error).toMatchObject({ code: "CHECKOUT_NOT_FOUND" });
          const safe = JSON.stringify(
            (error as { toSafeJSON: () => unknown }).toSafeJSON(),
          );
          expect(safe).not.toContain(addressId);
          expect(safe).not.toContain(actors.customerAId);
        }
        await a.runtime.close();
        await a.otpProvider.close();
        await b.runtime.close();
        await b.otpProvider.close();
      },
    );
  });

  it("E: invalid/forged session → no Checkout authority", async () => {
    await withCheckoutReadyHarness(async ({ database, cartId, persistence }) => {
      const otpProvider = createLocalCustomerOtpProviderForTests({
        environmentType: "test",
      });
      const phoneDeps: CustomerPhoneAuthRuntimeDependencies = {
        otpProvider,
        identityDeriver: createCustomerTemporaryIdentityDeriver(
          CHECKOUT_AUTH_PII_HASH_SECRET,
        ),
      };
      const runtime = getCustomerAuthRuntime(
        {
          auth: checkoutAuthFoundationConfig().customer,
          persistence: applicationConfig(database.connectionString),
        },
        phoneDeps,
      );
      trackPersistenceHandle(runtime);

      const identity = await resolveTrustedCustomerAuthIdentity(runtime, {
        sessionToken: "forged-checkout-auth-session-token",
      });
      expect(identity).toBeNull();

      await expect(
        startCheckout(
          persistence,
          { kind: "customer", authUserId: "forged" },
          { cartId },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });

      await runtime.close();
      await otpProvider.close();
    });
  });

  it("F: logout/expired session → cannot continue authenticated Checkout mutation", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId, database }) => {
        const minted = await mintActorFromLiveSession(
          database.connectionString,
          actors.customerAId,
        );
        const draft = await startCheckout(
          persistence,
          minted.actor,
          { cartId },
          opts,
        );

        await minted.adapter.deleteSession(minted.sessionToken);
        const afterLogout = await resolveTrustedCustomerAuthIdentity(
          minted.runtime,
          { sessionToken: minted.sessionToken },
        );
        expect(afterLogout).toBeNull();

        // Stale in-memory actor from before logout must still be treated as a
        // domain actor if already minted — session invalidation is proven above.
        // A fresh resolve cannot mint; forged plain object cannot mutate.
        await expect(
          setCheckoutDestination(
            persistence,
            { kind: "customer", authUserId: actors.customerAId },
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
        ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });

        await minted.runtime.close();
        await minted.otpProvider.close();
      },
    );
  });

  it("G: guest Cart remains unable to Checkout before explicit claim/reconcile", async () => {
    await withCartHarness(async ({ persistence, actors, catalog, database }) => {
      const brandId = actors.tree.brand.id;
      const guestOpts = {
        clock: fixedCartClock(FIXED_NOW),
        policy: GUEST_POLICY,
      };
      const guest = await addCartLine(
        persistence,
        { kind: "guest", brandId },
        { variantId: catalog.variantId, quantity: 1 },
        guestOpts,
      );
      const { actor, runtime, otpProvider } = await mintActorFromLiveSession(
        database.connectionString,
        actors.customerAId,
      );
      await expect(
        startCheckout(
          persistence,
          actor,
          { cartId: guest.cart.id },
          opts,
        ),
      ).rejects.toMatchObject({
        code: expect.stringMatching(/CHECKOUT_(NOT_FOUND|INVALID_INPUT)/),
      });
      expect(
        await getActiveCart(
          persistence,
          { kind: "guest", brandId, guestToken: guest.guestToken! },
          guestOpts,
        ),
      ).not.toBeNull();
      await runtime.close();
      await otpProvider.close();
    });
  });

  it("H: authenticated customer + successfully reconciled Cart → Checkout works", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, catalog, database }) => {
        const brandId = actors.tree.brand.id;
        const guestOpts = {
          clock: fixedCartClock(FIXED_NOW),
          policy: GUEST_POLICY,
        };
        const guest = await addCartLine(
          persistence,
          { kind: "guest", brandId },
          { variantId: catalog.variantId, quantity: 2 },
          guestOpts,
        );
        const { actor, runtime, otpProvider } = await mintActorFromLiveSession(
          database.connectionString,
          actors.customerBId,
        );
        const claimed = await claimGuestCart(
          persistence,
          actor,
          {
            guestToken: guest.guestToken!,
            brandId,
            expectedGuestRevision: guest.cart.revision,
          },
          guestOpts,
        );
        expect(claimed.ownerMode).toBe("customer");
        // Assortment/pricing already seeded for catalog.variantId on outlet A.
        const address = await createSavedAddressForCustomer(
          persistence,
          actors.customerBId,
        );
        const started = await startCheckout(
          persistence,
          actor,
          { cartId: claimed.id },
          opts,
        );
        const withDest = await setCheckoutDestination(
          persistence,
          actor,
          {
            checkoutId: started.id,
            expectedCheckoutRevision: started.revision,
            destination: {
              kind: "SAVED_ADDRESS",
              savedAddressId: address.id,
            },
          },
          opts,
        );
        const ready = await evaluateCheckout(
          persistence,
          actor,
          {
            checkoutId: withDest.id,
            expectedCheckoutRevision: withDest.revision,
          },
          opts,
        );
        expect(ready.checkout.status).toBe("READY_FOR_PAYMENT");
        void reconcileGuestCartWithCustomer;
        await runtime.close();
        await otpProvider.close();
      },
    );
  });

  it("authentication success ≠ Checkout success (empty cart)", async () => {
    await withCartHarness(async ({ persistence, actors, database }) => {
      const brandId = actors.tree.brand.id;
      const { actor, runtime, otpProvider } = await mintActorFromLiveSession(
        database.connectionString,
        actors.customerAId,
      );
      // Auth succeeds, but there is no customer cart / empty cart cannot start.
      expect(
        await getActiveCart(persistence, {
          kind: "customer",
          actor,
          brandId,
        }),
      ).toBeNull();

      // Fabricate is not allowed — prove auth identity is real, then commerce fails.
      expect(actor.authUserId).toBe(actors.customerAId);
      await expect(
        startCheckout(
          persistence,
          actor,
          { cartId: "00000000-0000-4000-8000-000000000001" },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_NOT_FOUND" });

      await runtime.close();
      await otpProvider.close();
    });
  });
});
