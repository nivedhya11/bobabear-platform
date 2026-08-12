/**
 * Cart ↔ customer-auth integration tests (IMP-020) — §111.
 *
 * Trusted CustomerActor is obtained only via the internal auth-adapter after a
 * real customer-auth session (or harness fixture that uses that same boundary).
 * The Cart public barrel does not mint actors from arbitrary user ids.
 */
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import {
  getCustomerAuthRuntime,
  resolveTrustedCustomerAuthIdentity,
  type CustomerPhoneAuthRuntimeDependencies,
} from "../../src/server/auth/customer";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import {
  addCartLine,
  applyCartCoupon,
  claimGuestCart,
  fixedCartClock,
  getActiveCart,
  reconcileGuestCartWithCustomer,
} from "../../src/server/cart";
import { customerActorFromTrustedCustomerAuthIdentity } from "../../src/server/cart/auth-adapter";
import {
  createCustomerTemporaryIdentityDeriver,
  type CustomerPiiHashSecret,
} from "../../src/server/customer-auth/pii";
import { createLocalCustomerOtpProviderForTests } from "../../src/server/customer-auth/provider/local";
import {
  FIXED_NOW,
  GUEST_POLICY,
  applicationConfig,
  closeTrackedPersistenceHandles,
  customerActorFromAuthenticatedSession,
  seedRecognizedCoupon,
  trackPersistenceHandle,
  withCartHarness,
} from "../database/support/cart-fixtures";

const CART_AUTH_PII_HASH_SECRET =
  "cart-auth-integration-pii-hash-secret-32chars!" as CustomerPiiHashSecret;

function cartAuthFoundationConfig() {
  return loadAuthFoundationConfig(
    {
      CUSTOMER_AUTH_SECRET: "cart-auth-integration-customer-secret-32-chars!",
      CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
      WORKFORCE_AUTH_SECRET: "cart-auth-integration-workforce-secret-32-chars",
      WORKFORCE_AUTH_BASE_URL: "http://localhost:3100",
    },
    "test",
  );
}

type InternalAdapter = {
  createUser: (data: {
    email: string;
    name: string;
    emailVerified: boolean;
  }) => Promise<{ id: string }>;
  createSession: (userId: string) => Promise<{ token: string }>;
  findSession: (
    token: string,
  ) => Promise<{ session: { token: string }; user: { id: string } } | null>;
};

async function internalAdapterFor(runtime: {
  getAuth: () => Promise<{ $context: Promise<unknown> }>;
}): Promise<InternalAdapter> {
  const auth = await runtime.getAuth();
  const context = (await auth.$context) as { internalAdapter: InternalAdapter };
  return context.internalAdapter;
}

/** Persistence wrapper that injects a transaction infrastructure failure. */
function withInjectedTransactionFailure(
  persistence: Parameters<typeof reconcileGuestCartWithCustomer>[0],
): Parameters<typeof reconcileGuestCartWithCustomer>[0] {
  return {
    role: persistence.role,
    withContext: (fn) => persistence.withContext(fn),
    checkAvailability: () => persistence.checkAvailability(),
    close: () => persistence.close(),
    transaction: async () => {
      throw new Error("injected cart reconcile infrastructure failure");
    },
  };
}

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

describe("IMP-020 cart auth integration", () => {
  it("authenticated customer-auth session → trusted adapter → Customer A Cart", async () => {
    await withCartHarness(async ({ persistence, actors, catalog, database }) => {
      const brandId = actors.tree.brand.id;
      const authPersistenceConfig = applicationConfig(database.connectionString);
      const otpProvider = createLocalCustomerOtpProviderForTests({
        environmentType: "test",
      });
      const phoneDeps: CustomerPhoneAuthRuntimeDependencies = {
        otpProvider,
        identityDeriver: createCustomerTemporaryIdentityDeriver(
          CART_AUTH_PII_HASH_SECRET,
        ),
      };
      const runtime = getCustomerAuthRuntime(
        {
          auth: cartAuthFoundationConfig().customer,
          persistence: authPersistenceConfig,
        },
        phoneDeps,
      );
      trackPersistenceHandle(runtime);

      const adapter = await internalAdapterFor(runtime);
      // Authenticate: create + resolve a real customer-auth session for Customer A.
      const session = await adapter.createSession(actors.customerAId);
      const found = await adapter.findSession(session.token);
      expect(found?.user.id).toBe(actors.customerAId);

      const identity = await resolveTrustedCustomerAuthIdentity(runtime, {
        sessionToken: session.token,
      });
      expect(identity?.userId).toBe(actors.customerAId);
      // Trusted auth boundary (not Cart public barrel) after session validation.
      const actor = customerActorFromTrustedCustomerAuthIdentity(identity);

      const created = await addCartLine(
        persistence,
        { kind: "customer", actor, brandId },
        { variantId: catalog.variantId, quantity: 1 },
      );
      expect(created.cart.ownerMode).toBe("customer");

      const own = await getActiveCart(persistence, {
        kind: "customer",
        actor,
        brandId,
      });
      expect(own!.id).toBe(created.cart.id);

      // Customer B (separate trusted identity) cannot access Customer A.
      const sessionB = await adapter.createSession(actors.customerBId);
      const identityB = await resolveTrustedCustomerAuthIdentity(runtime, {
        sessionToken: sessionB.token,
      });
      const actorB = customerActorFromTrustedCustomerAuthIdentity(identityB);
      expect(
        await getActiveCart(persistence, {
          kind: "customer",
          actor: actorB,
          brandId,
        }),
      ).toBeNull();
    });
  });

  it("claims guest cart after trusted customer authentication", async () => {
    await withCartHarness(async ({ persistence, actors, catalog, database }) => {
      const brandId = actors.tree.brand.id;
      const opts = { clock: fixedCartClock(FIXED_NOW), policy: GUEST_POLICY };

      const guest = await addCartLine(
        persistence,
        { kind: "guest", brandId },
        { variantId: catalog.variantId, quantity: 2 },
        opts,
      );
      expect(guest.guestToken).toBeDefined();

      // Successful auth boundary → trusted identity via session validation
      const actor = await customerActorFromAuthenticatedSession(
        database.connectionString,
        actors.customerAId,
      );

      const claimed = await claimGuestCart(
        persistence,
        actor,
        {
          guestToken: guest.guestToken!,
          brandId,
          expectedGuestRevision: guest.cart.revision,
        },
        opts,
      );
      expect(claimed.ownerMode).toBe("customer");
      expect(claimed.id).toBe(guest.cart.id);

      expect(
        await getActiveCart(
          persistence,
          { kind: "guest", brandId, guestToken: guest.guestToken! },
          opts,
        ),
      ).toBeNull();

      const sameBrand = await getActiveCart(
        persistence,
        { kind: "customer", actor, brandId },
        opts,
      );
      expect(sameBrand!.id).toBe(claimed.id);

      // Same customer, conceptual second session/device
      const actorAgain = await customerActorFromAuthenticatedSession(
        database.connectionString,
        actors.customerAId,
      );
      const acrossSession = await getActiveCart(
        persistence,
        { kind: "customer", actor: actorAgain, brandId },
        opts,
      );
      expect(acrossSession!.id).toBe(claimed.id);
    });
  });

  it("reconciles two carts after auth; auth remains valid on conflict/failure", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const brandId = actors.tree.brand.id;
      const opts = { clock: fixedCartClock(FIXED_NOW), policy: GUEST_POLICY };
      const actor = actors.customerA;
      const couponA = await seedRecognizedCoupon(
        persistence,
        brandId,
        actors.brandAdminActor,
        "AUTHKEEPA",
      );
      const couponB = await seedRecognizedCoupon(
        persistence,
        brandId,
        actors.brandAdminActor,
        "AUTHKEEPB",
      );

      // Existing customer cart (already "logged in")
      let customer = (
        await addCartLine(
          persistence,
          { kind: "customer", actor, brandId },
          { variantId: catalog.variantId, quantity: 1 },
          opts,
        )
      ).cart;
      customer = await applyCartCoupon(
        persistence,
        { kind: "customer", actor, brandId },
        { couponCode: couponA.canonicalCode, expectedRevision: customer.revision },
        opts,
      );

      // Guest cart before login
      const guestCreated = await addCartLine(
        persistence,
        { kind: "guest", brandId },
        { variantId: catalog.variantId, quantity: 1 },
        opts,
      );
      const guest = await applyCartCoupon(
        persistence,
        { kind: "guest", brandId, guestToken: guestCreated.guestToken! },
        {
          couponCode: couponB.canonicalCode,
          expectedRevision: guestCreated.cart.revision,
        },
        opts,
      );

      // Auth success then reconciliation conflict
      await expect(
        reconcileGuestCartWithCustomer(
          persistence,
          actor,
          {
            guestToken: guestCreated.guestToken!,
            brandId,
            expectedGuestRevision: guest.revision,
            expectedCustomerRevision: customer.revision,
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CART_RECONCILIATION_CONFLICT" });

      // Auth identity still resolves the customer cart
      expect(
        await getActiveCart(
          persistence,
          { kind: "customer", actor, brandId },
          opts,
        ),
      ).not.toBeNull();

      // Auth success remains valid when reconcile DB operation fails (stale revision)
      await expect(
        reconcileGuestCartWithCustomer(
          persistence,
          actor,
          {
            guestToken: guestCreated.guestToken!,
            brandId,
            expectedGuestRevision: guest.revision,
            expectedCustomerRevision: BigInt(999),
            resolution: "KEEP_CUSTOMER",
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CART_CONFLICT" });

      expect(
        await getActiveCart(
          persistence,
          { kind: "customer", actor, brandId },
          opts,
        ),
      ).not.toBeNull();

      // Injected infrastructure failure on reconcile must not invalidate auth identity
      const broken = withInjectedTransactionFailure(persistence);
      await expect(
        reconcileGuestCartWithCustomer(
          broken,
          actor,
          {
            guestToken: guestCreated.guestToken!,
            brandId,
            expectedGuestRevision: guest.revision,
            expectedCustomerRevision: customer.revision,
            resolution: "KEEP_CUSTOMER",
          },
          opts,
        ),
      ).rejects.toThrow(/injected cart reconcile infrastructure failure/);

      expect(
        await getActiveCart(
          persistence,
          { kind: "customer", actor, brandId },
          opts,
        ),
      ).not.toBeNull();

      // Guest credential + authenticated session coexist until successful merge
      expect(
        await getActiveCart(
          persistence,
          { kind: "guest", brandId, guestToken: guestCreated.guestToken! },
          opts,
        ),
      ).not.toBeNull();

      const merged = await reconcileGuestCartWithCustomer(
        persistence,
        actor,
        {
          guestToken: guestCreated.guestToken!,
          brandId,
          expectedGuestRevision: guest.revision,
          expectedCustomerRevision: customer.revision,
          resolution: "KEEP_CUSTOMER",
        },
        opts,
      );
      expect(merged.ownerMode).toBe("customer");
      expect(
        await getActiveCart(
          persistence,
          { kind: "guest", brandId, guestToken: guestCreated.guestToken! },
          opts,
        ),
      ).toBeNull();
    });
  });

  it("logout does not downgrade customer cart into guest cart", async () => {
    await withCartHarness(async ({ persistence, actors, catalog, database }) => {
      const brandId = actors.tree.brand.id;
      const actor = actors.customerA;
      const created = await addCartLine(
        persistence,
        { kind: "customer", actor, brandId },
        { variantId: catalog.variantId, quantity: 1 },
      );

      // Simulate logout: drop actor reference; cart remains customer-owned in DB.
      // A fresh authenticated session for the same customer still sees it.
      const actorAgain = await customerActorFromAuthenticatedSession(
        database.connectionString,
        actors.customerAId,
      );
      const afterLogout = await getActiveCart(persistence, {
        kind: "customer",
        actor: actorAgain,
        brandId,
      });
      expect(afterLogout!.ownerMode).toBe("customer");
      expect(afterLogout!.id).toBe(created.cart.id);
      expect(afterLogout!.expiresAt).toBeNull();

      await persistence.withContext(async (ctx) => {
        const row = await ctx.db.execute(sql`
          select customer_auth_user_id, guest_credential_verifier, expires_at
          from app.carts where id = ${created.cart.id}::uuid
        `);
        expect(row.rows[0]!.customer_auth_user_id).toBe(actors.customerAId);
        expect(row.rows[0]!.guest_credential_verifier).toBeNull();
        expect(row.rows[0]!.expires_at).toBeNull();
      });
    });
  });
});
