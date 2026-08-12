/**
 * Shared fixtures for Cart tests (IMP-020).
 */
import { randomBytes, randomUUID } from "node:crypto";

import { inject } from "vitest";

import type { WebConfig } from "../../../src/platform/config";
import {
  bootstrapPlatformSuperAdmin,
  createMembership,
  grantRole,
} from "../../../src/server/access-control";
import {
  activateBundleGroup,
  activateBundleOption,
  activateModifierGroup,
  activateModifierGroupOption,
  activateModifierOption,
  activateProduct,
  activateVariant,
  activateVariantModifierGroup,
  addBundleOption,
  addModifierOptionToGroup,
  applyModifierGroupToVariant,
  createBundleGroup,
  createModifierGroup,
  createModifierOption,
  createProduct,
  createVariant,
} from "../../../src/server/catalog";
import {
  getCustomerAuthRuntime,
  resolveTrustedCustomerAuthIdentity,
  type CustomerPhoneAuthRuntimeDependencies,
} from "../../../src/server/auth/customer";
import { loadAuthFoundationConfig } from "../../../src/server/auth/shared/config";
import type { CustomerActor } from "../../../src/server/cart";
import { customerActorFromTrustedCustomerAuthIdentity } from "../../../src/server/cart/auth-adapter";
import {
  createCustomerTemporaryIdentityDeriver,
  type CustomerPiiHashSecret,
} from "../../../src/server/customer-auth/pii";
import { createLocalCustomerOtpProviderForTests } from "../../../src/server/customer-auth/provider/local";
import { getApplicationPersistence } from "../../../src/server/persistence";
import type { Persistence } from "../../../src/server/persistence/types";
import {
  activateCoupon,
  activatePromotion,
  createCouponDraft,
  createPromotionDraft,
  setPromotionBenefit,
  setPromotionTargets,
} from "../../../src/server/promotions";
import {
  createEligibleWorkforceUser,
  principalFor,
  seedBrandTree,
  type SeededBrandTree,
  type WorkforceUserFixture,
} from "./access-control-fixtures";
import { insertCustomerAuthUser } from "./customer-profiles-fixtures";
import { applyMigrations, withIsolatedTestDatabase, withTestDatabaseClient } from "./test-database";

export const GUEST_POLICY = Object.freeze({ guestCartTtlMs: 3_600_000 });
export const FIXED_NOW = new Date("2026-08-09T12:00:00.000Z");

const CART_FIXTURE_PII_HASH_SECRET =
  "cart-fixture-pii-hash-secret-32chars-min!!" as CustomerPiiHashSecret;

function cartFixtureAuthFoundationConfig() {
  return loadAuthFoundationConfig(
    {
      CUSTOMER_AUTH_SECRET: "cart-fixture-customer-auth-secret-32-chars!",
      CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
      WORKFORCE_AUTH_SECRET: "cart-fixture-workforce-auth-secret-32-chars",
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

export function adminConnectionInfo() {
  return {
    connectionString: inject("bobaBearTestAdminConnectionString"),
    host: inject("bobaBearTestAdminHost"),
    port: inject("bobaBearTestAdminPort"),
  };
}

export function applicationConfig(databaseUrl: string): WebConfig {
  return {
    environment: "test",
    processKind: "web",
    publicOrigin: "http://localhost:3000",
    logLevel: "warn",
    release: null,
    allowUnsafeAdapters: true,
    databaseSslMode: "disable",
    port: 3000,
    databaseUrl,
  };
}

const openHandles: Array<{ close(): Promise<void> }> = [];

export function trackPersistenceHandle(handle: { close(): Promise<void> }): void {
  openHandles.push(handle);
}

export async function closeTrackedPersistenceHandles(): Promise<void> {
  await Promise.all(openHandles.splice(0).map((h) => h.close()));
}

export function uniqueCode(prefix: string): string {
  return `${prefix}-${randomBytes(3).toString("hex")}`;
}

/**
 * Mint a Cart CustomerActor only via real customer-auth session validation
 * (createSession → resolveTrustedCustomerAuthIdentity → auth-adapter).
 * A raw user id alone cannot produce Cart authority.
 */
export async function customerActorFromAuthenticatedSession(
  connectionString: string,
  customerAuthUserId: string,
): Promise<CustomerActor> {
  const otpProvider = createLocalCustomerOtpProviderForTests({
    environmentType: "test",
  });
  const phoneDeps: CustomerPhoneAuthRuntimeDependencies = {
    otpProvider,
    identityDeriver: createCustomerTemporaryIdentityDeriver(
      CART_FIXTURE_PII_HASH_SECRET,
    ),
  };
  const runtime = getCustomerAuthRuntime(
    {
      auth: cartFixtureAuthFoundationConfig().customer,
      persistence: applicationConfig(connectionString),
    },
    phoneDeps,
  );
  try {
    const adapter = await internalAdapterFor(runtime);
    const session = await adapter.createSession(customerAuthUserId);
    const identity = await resolveTrustedCustomerAuthIdentity(runtime, {
      sessionToken: session.token,
    });
    if (!identity) {
      throw new Error("customer-auth session validation failed in cart fixture");
    }
    return customerActorFromTrustedCustomerAuthIdentity(identity);
  } finally {
    await runtime.close();
    await otpProvider.close();
  }
}

/** Controllable clock for guest TTL tests (no sleeps). */
export function mutableCartClock(start: Date = FIXED_NOW): {
  clock: { now(): Date };
  set(instant: Date): void;
  advance(ms: number): void;
  instant(): Date;
} {
  let current = new Date(start.getTime());
  return {
    clock: {
      now(): Date {
        return new Date(current.getTime());
      },
    },
    set(instant: Date) {
      current = new Date(instant.getTime());
    },
    advance(ms: number) {
      current = new Date(current.getTime() + ms);
    },
    instant() {
      return new Date(current.getTime());
    },
  };
}

export async function seedCustomerAuthUser(
  connectionString: string,
  id: string,
  email = `${id}@example.test`,
  phone: string | null = null,
): Promise<void> {
  await withTestDatabaseClient(connectionString, async (client) => {
    await insertCustomerAuthUser(
      (query, params) => client.pool.query(query, params),
      id,
      email,
      phone,
    );
  });
}

export type ActiveStandardVariant = Readonly<{
  productId: string;
  variantId: string;
}>;

export async function seedActiveStandardVariant(
  persistence: Persistence,
  brandId: string,
  actor: unknown,
  codePrefix = "cart",
): Promise<ActiveStandardVariant> {
  return persistence.transaction(async (tx) => {
    const product = await createProduct(tx, {
      actor,
      brandId,
      code: uniqueCode(`${codePrefix}-p`),
      name: `${codePrefix} Product`,
      productKind: "standard",
    });
    const variant = await createVariant(tx, {
      actor,
      productId: product.id,
      code: "default",
      name: "Default",
      isDefault: true,
      isSelectorVisible: false,
    });
    await activateVariant(tx, { actor, variantId: variant.id });
    await activateProduct(tx, { actor, productId: product.id });
    return { productId: product.id, variantId: variant.id };
  });
}

export type ActiveVariantWithModifier = Readonly<{
  productId: string;
  variantId: string;
  variantModifierGroupId: string;
  modifierGroupOptionId: string;
  modifierGroupId: string;
  modifierOptionId: string;
}>;

export async function seedActiveVariantWithModifier(
  persistence: Persistence,
  brandId: string,
  actor: unknown,
  codePrefix = "mod",
): Promise<ActiveVariantWithModifier> {
  return persistence.transaction(async (tx) => {
    const product = await createProduct(tx, {
      actor,
      brandId,
      code: uniqueCode(`${codePrefix}-p`),
      name: `${codePrefix} Product`,
      productKind: "standard",
    });
    const variant = await createVariant(tx, {
      actor,
      productId: product.id,
      code: "default",
      name: "Default",
      isDefault: true,
      isSelectorVisible: false,
    });
    const group = await createModifierGroup(tx, {
      actor,
      brandId,
      code: uniqueCode(`${codePrefix}-g`),
      name: "Toppings",
    });
    const option = await createModifierOption(tx, {
      actor,
      brandId,
      code: uniqueCode(`${codePrefix}-o`),
      name: "Pearl",
    });
    const binding = await addModifierOptionToGroup(tx, {
      actor,
      modifierGroupId: group.id,
      modifierOptionId: option.id,
      minQuantity: 0,
      maxQuantity: 3,
      defaultQuantity: 0,
    });
    const vmg = await applyModifierGroupToVariant(tx, {
      actor,
      variantId: variant.id,
      modifierGroupId: group.id,
      minTotalQuantity: 0,
      maxTotalQuantity: 3,
    });
    await activateModifierOption(tx, { actor, modifierOptionId: option.id });
    await activateModifierGroupOption(tx, {
      actor,
      modifierGroupOptionId: binding.id,
    });
    await activateModifierGroup(tx, { actor, modifierGroupId: group.id });
    await activateVariantModifierGroup(tx, {
      actor,
      variantModifierGroupId: vmg.id,
    });
    await activateVariant(tx, { actor, variantId: variant.id });
    await activateProduct(tx, { actor, productId: product.id });
    return {
      productId: product.id,
      variantId: variant.id,
      variantModifierGroupId: vmg.id,
      modifierGroupOptionId: binding.id,
      modifierGroupId: group.id,
      modifierOptionId: option.id,
    };
  });
}

export type ActiveBundleWithComponent = Readonly<{
  bundleProductId: string;
  bundleVariantId: string;
  bundleGroupId: string;
  bundleGroupOptionId: string;
  componentProductId: string;
  componentVariantId: string;
  componentVariantModifierGroupId?: string;
  componentModifierGroupOptionId?: string;
}>;

export async function seedActiveBundleWithComponent(
  persistence: Persistence,
  brandId: string,
  actor: unknown,
  options: { withNestedModifier?: boolean; codePrefix?: string } = {},
): Promise<ActiveBundleWithComponent> {
  const codePrefix = options.codePrefix ?? "bun";
  const withNested = options.withNestedModifier === true;

  let component: ActiveStandardVariant | ActiveVariantWithModifier;
  if (withNested) {
    component = await seedActiveVariantWithModifier(
      persistence,
      brandId,
      actor,
      `${codePrefix}-c`,
    );
  } else {
    component = await seedActiveStandardVariant(
      persistence,
      brandId,
      actor,
      `${codePrefix}-c`,
    );
  }

  return persistence.transaction(async (tx) => {
    const bundleProduct = await createProduct(tx, {
      actor,
      brandId,
      code: uniqueCode(`${codePrefix}-bp`),
      name: `${codePrefix} Bundle`,
      productKind: "bundle",
    });
    const bundleVariant = await createVariant(tx, {
      actor,
      productId: bundleProduct.id,
      code: "default",
      name: "Default",
      isDefault: true,
      isSelectorVisible: false,
    });
    const group = await createBundleGroup(tx, {
      actor,
      bundleVariantId: bundleVariant.id,
      code: uniqueCode(`${codePrefix}-bg`),
      name: "Choose",
      minSelections: 1,
      maxSelections: 1,
      position: 0,
    });
    const option = await addBundleOption(tx, {
      actor,
      bundleGroupId: group.id,
      componentVariantId: component.variantId,
      quantity: 1,
      isDefault: true,
      position: 0,
    });
    await activateBundleOption(tx, { actor, bundleGroupOptionId: option.id });
    await activateBundleGroup(tx, { actor, bundleGroupId: group.id });
    await activateVariant(tx, { actor, variantId: bundleVariant.id });
    await activateProduct(tx, { actor, productId: bundleProduct.id });

    const nested =
      withNested && "variantModifierGroupId" in component
        ? {
            componentVariantModifierGroupId: component.variantModifierGroupId,
            componentModifierGroupOptionId: component.modifierGroupOptionId,
          }
        : {};

    return {
      bundleProductId: bundleProduct.id,
      bundleVariantId: bundleVariant.id,
      bundleGroupId: group.id,
      bundleGroupOptionId: option.id,
      componentProductId: component.productId,
      componentVariantId: component.variantId,
      ...nested,
    };
  });
}

export async function seedRecognizedCoupon(
  persistence: Persistence,
  brandId: string,
  actor: unknown,
  canonicalCode: string,
  options: { activate?: boolean } = {},
): Promise<{ promotionId: string; couponId: string; canonicalCode: string }> {
  return persistence.transaction(async (tx) => {
    const created = await createPromotionDraft(tx, {
      actor,
      brandId,
      code: uniqueCode("promo"),
      displayName: "Cart Coupon Promo",
      scopeType: "brand",
      territoryId: null,
      organizationId: null,
      outletId: null,
      triggerType: "coupon",
      stackingPolicy: "exclusive",
      startsAt: new Date("2026-01-01T00:00:00Z"),
      endsAt: null,
    });
    await setPromotionBenefit(tx, {
      actor,
      promotionId: created.id,
      benefit: {
        benefitType: "percentage_discount",
        percentageBps: 1000,
        fixedAmountPaise: null,
        maximumDiscountPaise: null,
        buyQuantity: null,
        getQuantity: null,
        repeatable: null,
        maximumRewardQuantity: null,
        includeModifiers: false,
        includeBundleDeltas: false,
      },
    });
    await setPromotionTargets(tx, {
      actor,
      promotionId: created.id,
      targetRole: "qualifier",
      targets: [
        {
          targetRole: "qualifier",
          targetType: "all_merchandise",
          productId: null,
          variantId: null,
          chargeDefinitionId: null,
        },
      ],
    });
    await setPromotionTargets(tx, {
      actor,
      promotionId: created.id,
      targetRole: "benefit",
      targets: [
        {
          targetRole: "benefit",
          targetType: "all_merchandise",
          productId: null,
          variantId: null,
          chargeDefinitionId: null,
        },
      ],
    });
    await activatePromotion(tx, { actor, promotionId: created.id });
    const coupon = await createCouponDraft(tx, {
      actor,
      promotionId: created.id,
      origin: "manual",
      canonicalCode,
    });
    if (options.activate !== false) {
      await activateCoupon(tx, { actor, couponId: coupon.id });
    }
    return {
      promotionId: created.id,
      couponId: coupon.id,
      canonicalCode: coupon.canonicalCode,
    };
  });
}

export type CartHarnessActors = Readonly<{
  tree: SeededBrandTree;
  otherTree: SeededBrandTree;
  psa: WorkforceUserFixture;
  brandAdmin: WorkforceUserFixture;
  psaActor: ReturnType<typeof principalFor>;
  brandAdminActor: ReturnType<typeof principalFor>;
  customerAId: string;
  customerBId: string;
  customerA: CustomerActor;
  customerB: CustomerActor;
}>;

export type CartHarness = Readonly<{
  persistence: Persistence;
  database: { connectionString: string; databaseName: string };
  actors: CartHarnessActors;
  catalog: ActiveStandardVariant;
}>;

/**
 * Migrated DB + brand trees + customer auth users A/B + brand admin +
 * one active standard variant ready to add.
 */
export async function withCartHarness<T>(
  fn: (harness: CartHarness) => Promise<T>,
  options: { seedSecondBrand?: boolean } = {},
): Promise<T> {
  return withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
    await applyMigrations(database.connectionString);
    const persistence = getApplicationPersistence(
      applicationConfig(database.connectionString),
    );
    trackPersistenceHandle(persistence);

    const tree = await persistence.transaction((tx) => seedBrandTree(tx, "crt"));
    const otherTree = await persistence.transaction((tx) =>
      seedBrandTree(tx, options.seedSecondBrand === false ? "crx" : "crx"),
    );

    const psa = await createEligibleWorkforceUser(persistence);
    await bootstrapPlatformSuperAdmin({ persistence, workforceUserId: psa.id });
    const psaActor = principalFor(psa.id);

    const brandAdmin = await createEligibleWorkforceUser(persistence);
    await persistence.transaction(async (tx) => {
      const membership = await createMembership(tx, {
        workforceUserId: brandAdmin.id,
        scope: { scopeType: "brand", brandId: tree.brand.id },
        status: "active",
      });
      await grantRole(tx, {
        membershipId: membership.id,
        roleKey: "brand_admin",
      });
    });
    const brandAdminActor = principalFor(brandAdmin.id);

    const customerAId = `cust-a-${randomUUID().slice(0, 8)}`;
    const customerBId = `cust-b-${randomUUID().slice(0, 8)}`;
    await seedCustomerAuthUser(database.connectionString, customerAId);
    await seedCustomerAuthUser(database.connectionString, customerBId);

    const customerA = await customerActorFromAuthenticatedSession(
      database.connectionString,
      customerAId,
    );
    const customerB = await customerActorFromAuthenticatedSession(
      database.connectionString,
      customerBId,
    );

    const catalog = await seedActiveStandardVariant(
      persistence,
      tree.brand.id,
      brandAdminActor,
      "std",
    );

    return fn({
      persistence,
      database,
      actors: {
        tree,
        otherTree,
        psa,
        brandAdmin,
        psaActor,
        brandAdminActor,
        customerAId,
        customerBId,
        customerA,
        customerB,
      },
      catalog,
    });
  });
}
