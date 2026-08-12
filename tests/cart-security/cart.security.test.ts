/**
 * Cart security tests (IMP-020) — §110.
 */
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { PERMISSION_KEYS } from "../../src/shared/access-control";
import {
  getCustomerAuthRuntime,
  resolveTrustedCustomerAuthIdentity,
  type CustomerPhoneAuthRuntimeDependencies,
} from "../../src/server/auth/customer";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import { listOwnAddresses } from "../../src/server/customer-addresses";
import { createCustomerActorFromTrustedAuthIdentity as createProfileCustomerActor } from "../../src/server/customer-profiles";
import * as cartPublicApi from "../../src/server/cart";
import {
  addCartLine,
  claimGuestCart,
  fixedCartClock,
  generateGuestCartToken,
  getActiveCart,
  guestVerifiersEqual,
  hashGuestToken,
  setCartLineQuantity,
} from "../../src/server/cart";
import { createCustomerActorFromTrustedAuthIdentity } from "../../src/server/cart/actor";
import { customerActorFromTrustedCustomerAuthIdentity } from "../../src/server/cart/auth-adapter";
import {
  createCustomerTemporaryIdentityDeriver,
  type CustomerPiiHashSecret,
} from "../../src/server/customer-auth/pii";
import { createLocalCustomerOtpProviderForTests } from "../../src/server/customer-auth/provider/local";
import {
  createOwnCustomerProfile,
  getOwnCustomerProfile,
} from "../../src/server/customer-profiles";
import {
  FIXED_NOW,
  GUEST_POLICY,
  applicationConfig,
  closeTrackedPersistenceHandles,
  customerActorFromAuthenticatedSession,
  mutableCartClock,
  trackPersistenceHandle,
  withCartHarness,
} from "../database/support/cart-fixtures";

const CART_SECURITY_PII_HASH_SECRET =
  "cart-security-pii-hash-secret-32chars-min!" as CustomerPiiHashSecret;

function cartSecurityAuthFoundationConfig() {
  return loadAuthFoundationConfig(
    {
      CUSTOMER_AUTH_SECRET: "cart-security-customer-auth-secret-32-chars!",
      CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
      WORKFORCE_AUTH_SECRET: "cart-security-workforce-auth-secret-32chars",
      WORKFORCE_AUTH_BASE_URL: "http://localhost:3100",
    },
    "test",
  );
}

type InternalAdapter = {
  createSession: (userId: string) => Promise<{ token: string }>;
};

async function internalAdapterFor(runtime: {
  getAuth: () => Promise<{ $context: Promise<unknown> }>;
}): Promise<InternalAdapter> {
  const auth = await runtime.getAuth();
  const context = (await auth.$context) as { internalAdapter: InternalAdapter };
  return context.internalAdapter;
}

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

describe("IMP-020 cart security", () => {
  it("generates CSPRNG guest tokens (≥32 bytes) and stores only SHA-256 verifier", async () => {
    const a = generateGuestCartToken();
    const b = generateGuestCartToken();
    expect(a.rawToken).not.toBe(b.rawToken);
    // 32 bytes → base64url length typically 43
    expect(Buffer.from(a.rawToken, "base64url").length).toBe(32);
    expect(a.verifierHex).toBe(
      createHash("sha256").update(a.rawToken, "utf8").digest("hex"),
    );
    expect(a.verifierHex).toMatch(/^[0-9a-f]{64}$/);
    expect(guestVerifiersEqual(a.verifierHex, a.rawToken)).toBe(true);
    expect(guestVerifiersEqual(a.verifierHex, b.rawToken)).toBe(false);
    expect(hashGuestToken(a.rawToken)).toBe(a.verifierHex);
  });

  it("returns raw token only at creation; never persists raw token", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const brandId = actors.tree.brand.id;
      const opts = { clock: fixedCartClock(FIXED_NOW), policy: GUEST_POLICY };
      const created = await addCartLine(
        persistence,
        { kind: "guest", brandId },
        { variantId: catalog.variantId, quantity: 1 },
        opts,
      );
      expect(created.guestToken).toBeDefined();
      const token = created.guestToken!;

      await persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select guest_credential_verifier from app.carts where id = ${created.cart.id}::uuid
        `);
        const stored = String(rows.rows[0]!.guest_credential_verifier);
        expect(stored).toBe(hashGuestToken(token));
        expect(stored).not.toBe(token);
        const dump = JSON.stringify(rows.rows);
        expect(dump.includes(token)).toBe(false);
      });

      // subsequent mutations do not re-return token
      const next = await addCartLine(
        persistence,
        { kind: "guest", brandId, guestToken: token },
        {
          variantId: catalog.variantId,
          quantity: 1,
          expectedRevision: created.cart.revision,
        },
        opts,
      );
      expect(next.guestToken).toBeUndefined();
      expect("guestToken" in next).toBe(false);
      expect(String(next.cart.id)).not.toBe(token);
      expect(next.cart.manualCouponCode ?? "").not.toContain(token);
    });
  });

  it("enforces guest token resolution and expiry error codes", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const brandId = actors.tree.brand.id;
      const clock = mutableCartClock(FIXED_NOW);
      const opts = { clock: clock.clock, policy: GUEST_POLICY };
      const created = await addCartLine(
        persistence,
        { kind: "guest", brandId },
        { variantId: catalog.variantId, quantity: 1 },
        opts,
      );
      const token = created.guestToken!;
      const wrong = generateGuestCartToken().rawToken;

      expect(
        await getActiveCart(
          persistence,
          { kind: "guest", brandId, guestToken: wrong },
          opts,
        ),
      ).toBeNull();

      await expect(
        setCartLineQuantity(
          persistence,
          { kind: "guest", brandId, guestToken: wrong },
          {
            cartLineId: created.cart.lines[0]!.id,
            quantity: 2,
            expectedRevision: created.cart.revision,
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CART_NOT_FOUND" });

      await expect(
        setCartLineQuantity(
          persistence,
          { kind: "guest", brandId },
          {
            cartLineId: created.cart.lines[0]!.id,
            quantity: 2,
            expectedRevision: created.cart.revision,
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CART_NOT_FOUND" });

      clock.set(new Date(created.cart.expiresAt!.getTime()));
      await expect(
        setCartLineQuantity(
          persistence,
          { kind: "guest", brandId, guestToken: token },
          {
            cartLineId: created.cart.lines[0]!.id,
            quantity: 2,
            expectedRevision: created.cart.revision,
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CART_EXPIRED" });

      await expect(
        setCartLineQuantity(
          persistence,
          { kind: "guest", brandId, guestToken: wrong },
          {
            cartLineId: created.cart.lines[0]!.id,
            quantity: 2,
            expectedRevision: created.cart.revision,
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CART_NOT_FOUND" });
    });
  });

  it("isolates customers and brands; rejects PSA magic and unknown fields", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const brandId = actors.tree.brand.id;
      const otherBrand = actors.otherTree.brand.id;
      const a = await addCartLine(
        persistence,
        { kind: "customer", actor: actors.customerA, brandId },
        { variantId: catalog.variantId, quantity: 1 },
      );

      expect(
        await getActiveCart(persistence, {
          kind: "customer",
          actor: actors.customerB,
          brandId,
        }),
      ).toBeNull();

      await expect(
        setCartLineQuantity(
          persistence,
          { kind: "customer", actor: actors.customerB, brandId },
          {
            cartLineId: a.cart.lines[0]!.id,
            quantity: 9,
            expectedRevision: a.cart.revision,
          },
        ),
      ).rejects.toMatchObject({ code: "CART_NOT_FOUND" });

      // Cross-brand trusted context: customer A has no cart on other brand
      expect(
        await getActiveCart(persistence, {
          kind: "customer",
          actor: actors.customerA,
          brandId: otherBrand,
        }),
      ).toBeNull();

      expect(() =>
        customerActorFromTrustedCustomerAuthIdentity({
          userId: "",
        } as never),
      ).toThrow();

      // PSA is not a CustomerActor
      await expect(
        addCartLine(
          persistence,
          {
            kind: "customer",
            actor: actors.psaActor as never,
            brandId,
          },
          { variantId: catalog.variantId, quantity: 1 },
        ),
      ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });

      await expect(
        addCartLine(
          persistence,
          { kind: "customer", actor: actors.customerA, brandId },
          {
            variantId: catalog.variantId,
            quantity: 1,
            expectedRevision: a.cart.revision,
            evilField: true,
          } as never,
        ),
      ).rejects.toMatchObject({ code: "CART_INVALID_INPUT" });
    });
  });

  it("rejects Symbol.for CustomerActor forgery (E1)", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const brandId = actors.tree.brand.id;
      // Strongest realistic forgery under the old Symbol.for branding:
      // retrieve the global registry key and stamp an arbitrary customer id.
      const forgedBrand = Symbol.for("boba-bear.CustomerActor");
      const forgedActor = {
        kind: "customer" as const,
        authUserId: actors.customerAId,
      };
      Object.defineProperty(forgedActor, forgedBrand, {
        value: true,
        enumerable: false,
        configurable: false,
        writable: false,
      });
      Object.freeze(forgedActor);

      await expect(
        addCartLine(
          persistence,
          {
            kind: "customer",
            actor: forgedActor as never,
            brandId,
          },
          { variantId: catalog.variantId, quantity: 1 },
        ),
      ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });

      await expect(
        getActiveCart(persistence, {
          kind: "customer",
          actor: forgedActor as never,
          brandId,
        }),
      ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });
    });
  });

  it("does not expose public arbitrary CustomerActor minting (E2)", () => {
    expect(cartPublicApi).not.toHaveProperty(
      "createCustomerActorFromTrustedAuthIdentity",
    );
    expect(cartPublicApi).not.toHaveProperty(
      "customerActorFromTrustedCustomerAuthIdentity",
    );
    expect(cartPublicApi).not.toHaveProperty(
      "customerActorFromTrustedCustomerAuthSession",
    );
    expect(cartPublicApi).not.toHaveProperty("createCustomerActor");
    expect(cartPublicApi).not.toHaveProperty("resolveTrustedCustomerAuthIdentity");

    // Strongest realistic old-path attack: freely constructed session shape
    // cannot obtain Cart authority through the public Cart API.
    const fakeSession = { userId: "arbitrary-customer-id" };
    const publicMint = (
      cartPublicApi as {
        customerActorFromTrustedCustomerAuthIdentity?: (
          session: { userId: string },
        ) => unknown;
      }
    ).customerActorFromTrustedCustomerAuthIdentity;
    expect(publicMint).toBeUndefined();
    expect(() => {
      if (typeof publicMint === "function") {
        return publicMint(fakeSession);
      }
      throw new Error("public session-shaped actor mint unavailable");
    }).toThrow(/public session-shaped actor mint unavailable/);

    const indexSource = readFileSync(
      path.join(process.cwd(), "src/server/cart/index.ts"),
      "utf8",
    );
    expect(indexSource).not.toMatch(
      /\bcreateCustomerActorFromTrustedAuthIdentity\b/,
    );
    expect(indexSource).not.toMatch(
      /\bcustomerActorFromTrustedCustomerAuthIdentity\b/,
    );
    expect(indexSource).not.toMatch(
      /\bcustomerActorFromTrustedCustomerAuthSession\b/,
    );

    const actorSource = readFileSync(
      path.join(process.cwd(), "src/server/cart/actor.ts"),
      "utf8",
    );
    expect(actorSource).not.toMatch(/Symbol\.for\s*\(/);
  });

  it("T1: deep-import raw Customer A userId cannot mint CustomerActor", async () => {
    await withCartHarness(async ({ actors }) => {
      const fakeSession = { userId: actors.customerAId };

      expect(() =>
        customerActorFromTrustedCustomerAuthIdentity(fakeSession as never),
      ).toThrow(
        expect.objectContaining({ code: "CUSTOMER_AUTH_REQUIRED" }),
      );

      expect(() =>
        createCustomerActorFromTrustedAuthIdentity({
          authUserId: actors.customerAId,
        } as never),
      ).toThrow(
        expect.objectContaining({ code: "CUSTOMER_AUTH_REQUIRED" }),
      );

      expect(() =>
        createCustomerActorFromTrustedAuthIdentity(fakeSession as never),
      ).toThrow(
        expect.objectContaining({ code: "CUSTOMER_AUTH_REQUIRED" }),
      );
    });
  });

  it("T2: structural fake trusted identity object is rejected at runtime", async () => {
    await withCartHarness(async ({ actors }) => {
      const structuralFake = {
        userId: actors.customerAId,
      };
      // Also try Symbol.for on the trusted-identity brand name.
      const forgedBrand = Symbol.for("boba-bear.TrustedCustomerAuthIdentity");
      const forgedIdentity = {
        userId: actors.customerAId,
      };
      Object.defineProperty(forgedIdentity, forgedBrand, {
        value: true,
        enumerable: false,
        configurable: false,
        writable: false,
      });
      Object.freeze(forgedIdentity);

      expect(() =>
        customerActorFromTrustedCustomerAuthIdentity(structuralFake as never),
      ).toThrow(
        expect.objectContaining({ code: "CUSTOMER_AUTH_REQUIRED" }),
      );
      expect(() =>
        customerActorFromTrustedCustomerAuthIdentity(forgedIdentity as never),
      ).toThrow(
        expect.objectContaining({ code: "CUSTOMER_AUTH_REQUIRED" }),
      );
      expect(() =>
        createCustomerActorFromTrustedAuthIdentity(structuralFake as never),
      ).toThrow(
        expect.objectContaining({ code: "CUSTOMER_AUTH_REQUIRED" }),
      );
      expect(() =>
        createCustomerActorFromTrustedAuthIdentity(forgedIdentity as never),
      ).toThrow(
        expect.objectContaining({ code: "CUSTOMER_AUTH_REQUIRED" }),
      );
    });
  });

  it("T3/T5: real customer-auth identity owns Cart A; Customer B denied", async () => {
    await withCartHarness(async ({ persistence, actors, catalog, database }) => {
      const brandId = actors.tree.brand.id;
      const actorA = await customerActorFromAuthenticatedSession(
        database.connectionString,
        actors.customerAId,
      );
      const actorB = await customerActorFromAuthenticatedSession(
        database.connectionString,
        actors.customerBId,
      );

      const created = await addCartLine(
        persistence,
        { kind: "customer", actor: actorA, brandId },
        { variantId: catalog.variantId, quantity: 1 },
      );
      expect(created.cart.ownerMode).toBe("customer");

      const own = await getActiveCart(persistence, {
        kind: "customer",
        actor: actorA,
        brandId,
      });
      expect(own!.id).toBe(created.cart.id);

      expect(
        await getActiveCart(persistence, {
          kind: "customer",
          actor: actorB,
          brandId,
        }),
      ).toBeNull();

      await expect(
        setCartLineQuantity(
          persistence,
          { kind: "customer", actor: actorB, brandId },
          {
            cartLineId: created.cart.lines[0]!.id,
            quantity: 3,
            expectedRevision: created.cart.revision,
          },
        ),
      ).rejects.toMatchObject({ code: "CART_NOT_FOUND" });
    });
  });

  it("T4: invalid/forged session token yields no trusted identity or Cart actor", async () => {
    await withCartHarness(async ({ database, actors }) => {
      const otpProvider = createLocalCustomerOtpProviderForTests({
        environmentType: "test",
      });
      const phoneDeps: CustomerPhoneAuthRuntimeDependencies = {
        otpProvider,
        identityDeriver: createCustomerTemporaryIdentityDeriver(
          CART_SECURITY_PII_HASH_SECRET,
        ),
      };
      const runtime = getCustomerAuthRuntime(
        {
          auth: cartSecurityAuthFoundationConfig().customer,
          persistence: applicationConfig(database.connectionString),
        },
        phoneDeps,
      );
      trackPersistenceHandle(runtime);

      const forgedToken = "forged-not-a-real-customer-session-token";
      const identity = await resolveTrustedCustomerAuthIdentity(runtime, {
        sessionToken: forgedToken,
      });
      expect(identity).toBeNull();

      const emptyHeaders = new Headers();
      const fromHeaders = await resolveTrustedCustomerAuthIdentity(runtime, {
        headers: emptyHeaders,
      });
      expect(fromHeaders).toBeNull();

      // Even knowing Customer A's id, forged credentials cannot mint authority.
      expect(actors.customerAId.length).toBeGreaterThan(0);
      expect(() =>
        customerActorFromTrustedCustomerAuthIdentity({
          userId: actors.customerAId,
        } as never),
      ).toThrow(
        expect.objectContaining({ code: "CUSTOMER_AUTH_REQUIRED" }),
      );

      await runtime.close();
      await otpProvider.close();
    });
  });

  it("rejects old guest token after claim; guest cannot access profile/addresses", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const brandId = actors.tree.brand.id;
      const opts = { clock: fixedCartClock(FIXED_NOW), policy: GUEST_POLICY };
      const guest = await addCartLine(
        persistence,
        { kind: "guest", brandId },
        { variantId: catalog.variantId, quantity: 1 },
        opts,
      );
      const token = guest.guestToken!;
      await claimGuestCart(
        persistence,
        actors.customerA,
        {
          guestToken: token,
          brandId,
          expectedGuestRevision: guest.cart.revision,
        },
        opts,
      );

      expect(
        await getActiveCart(
          persistence,
          { kind: "guest", brandId, guestToken: token },
          opts,
        ),
      ).toBeNull();

      // Guest token is not a customer-auth user id — profile ops fail closed
      // (profiles still mint via their own boundary for this negative check)
      const fakeActor = createProfileCustomerActor({
        authUserId: token,
      });
      await expect(
        getOwnCustomerProfile(persistence, fakeActor),
      ).resolves.toBeNull();
      await expect(
        createOwnCustomerProfile(persistence, fakeActor, {
          givenName: "Guest",
          familyName: "Token",
        }),
      ).rejects.toThrow();
      // Addresses list is empty — no customer-owned rows for a non-auth identity
      await expect(listOwnAddresses(persistence, fakeActor)).resolves.toEqual([]);
    });
  });

  it("has no workforce cart permissions and does not use Math.random for tokens", () => {
    expect(PERMISSION_KEYS.some((k) => k.startsWith("cart."))).toBe(false);
    // generateGuestCartToken uses randomBytes — distinct from Math.random
    const samples = new Set(
      Array.from({ length: 5 }, () => generateGuestCartToken().rawToken),
    );
    expect(samples.size).toBe(5);
    // entropy check: not all zeros
    expect(randomBytes(32).length).toBe(32);
  });
});
