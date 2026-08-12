/**
 * Shared fixtures for Checkout tests (IMP-021).
 */
import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";

import {
  activatePriceBook,
  assignOutletTaxProfile,
  attachDraftVariantPrice,
  createDraftPriceBook,
  createLegalEntityTaxProfile,
} from "../../../src/server/pricing";
import { createOwnAddress } from "../../../src/server/customer-addresses";
import { addCartLine, type CustomerActor } from "../../../src/server/cart";
import {
  addOutletServiceabilityPins,
  setOutletServiceabilityRoutingPriority,
} from "../../../src/server/serviceability";
import {
  CHARGE_DEFINITION_DELIVERY_ID,
  CHARGE_DEFINITION_PACKAGING_ID,
  TAX_CATEGORY_RESTAURANT_SERVICE_ID,
} from "../../../src/shared/pricing";
import type { Persistence } from "../../../src/server/persistence/types";
import { includeVariantAtBrand } from "../../assortment-availability/support";
import {
  configureAlwaysAcceptingOutlet,
} from "./serviceability-fixtures";
import {
  FIXED_NOW,
  closeTrackedPersistenceHandles,
  customerActorFromAuthenticatedSession,
  mutableCartClock,
  seedActiveStandardVariant,
  withCartHarness,
  type CartHarness,
} from "./cart-fixtures";
import {
  customerActor as addressCustomerActor,
  minimalAddressCreateInput,
} from "./customer-addresses-fixtures";

export { FIXED_NOW, closeTrackedPersistenceHandles, mutableCartClock };

/** Controllable clock alias for Checkout TTL tests (same shape as cart). */
export const mutableCheckoutClock = mutableCartClock;

export const CHECKOUT_POLICY = Object.freeze({
  checkoutTtlMs: 15 * 60 * 1000,
});

export const CHECKOUT_PIN = "248001";

const GSTIN_UT = "05AAAAA0000A1Z5";

export function checkoutOpts(clock = { now: () => new Date(FIXED_NOW.getTime()) }) {
  return {
    clock,
    policy: CHECKOUT_POLICY,
  };
}

export async function seedBrandPriceAndTaxForVariant(
  persistence: Persistence,
  args: {
    actor: unknown;
    brandId: string;
    organizationId: string;
    legalEntityId: string;
    outletId: string;
    variantId: string;
    amountPaise?: bigint;
  },
): Promise<{ priceBookId: string }> {
  const amountPaise = args.amountPaise ?? BigInt(10_000);
  return persistence.transaction(async (tx) => {
    const book = await createDraftPriceBook(tx, {
      actor: args.actor,
      brandId: args.brandId,
      scopeType: "brand",
      code: `chk-${randomUUID().slice(0, 8)}`,
      name: "Checkout price book",
      taxInclusionMode: "exclusive",
      effectiveFrom: new Date("2026-01-01T00:00:00+05:30"),
    });
    await attachDraftVariantPrice(tx, {
      actor: args.actor,
      priceBookId: book.id,
      brandId: args.brandId,
      variantId: args.variantId,
      amountPaise,
      taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
    });
    await activatePriceBook(tx, {
      actor: args.actor,
      priceBookId: book.id,
      brandId: args.brandId,
    });

    const profile = await createLegalEntityTaxProfile(tx, {
      actorWorkforceUserId: null,
      legalEntityId: args.legalEntityId,
      brandId: args.brandId,
      organizationId: args.organizationId,
      stateCode: "05",
      registrationStatus: "registered",
      gstin: GSTIN_UT,
      validFrom: new Date("2026-01-01T00:00:00+05:30"),
    });
    await assignOutletTaxProfile(tx, {
      actorWorkforceUserId: null,
      outletId: args.outletId,
      legalEntityTaxProfileId: profile.id,
      effectiveFrom: new Date("2026-01-01T00:00:00+05:30"),
    });
    return { priceBookId: book.id };
  });
}

/** SQL seed — no public charge-price admin API in IMP-015. */
export async function seedChargePricesOnBook(
  persistence: Persistence,
  args: {
    brandId: string;
    priceBookId: string;
    packagingPaise?: bigint;
    deliveryPaise?: bigint;
  },
): Promise<void> {
  const packaging = args.packagingPaise ?? BigInt(2_000);
  const delivery = args.deliveryPaise ?? BigInt(4_000);
  const now = new Date("2026-01-01T00:00:00+05:30");
  await persistence.withContext(async (ctx) => {
    await ctx.db.execute(sql`
      insert into app.price_book_charge_prices (
        id, brand_id, price_book_id, charge_definition_id, amount_paise,
        calculation_mode, allow_territory_override, allow_organization_override,
        allow_outlet_override, tax_category_id, created_at
      ) values
        (
          gen_random_uuid(), ${args.brandId}::uuid, ${args.priceBookId}::uuid,
          ${CHARGE_DEFINITION_PACKAGING_ID}::uuid, ${packaging},
          'fixed_per_order', false, false, false,
          ${TAX_CATEGORY_RESTAURANT_SERVICE_ID}::uuid, ${now}
        ),
        (
          gen_random_uuid(), ${args.brandId}::uuid, ${args.priceBookId}::uuid,
          ${CHARGE_DEFINITION_DELIVERY_ID}::uuid, ${delivery},
          'fixed_per_order', false, false, false,
          ${TAX_CATEGORY_RESTAURANT_SERVICE_ID}::uuid, ${now}
        )
    `);
  });
}

export async function seedModifierDeltaOnBook(
  persistence: Persistence,
  args: {
    brandId: string;
    priceBookId: string;
    variantModifierGroupId: string;
    modifierGroupOptionId: string;
    priceDeltaPaise?: bigint;
  },
): Promise<void> {
  const delta = args.priceDeltaPaise ?? BigInt(0);
  const now = new Date("2026-01-01T00:00:00+05:30");
  await persistence.withContext(async (ctx) => {
    await ctx.db.execute(sql`
      insert into app.price_book_modifier_prices (
        id, brand_id, price_book_id, variant_modifier_group_id,
        modifier_group_option_id, price_delta_paise,
        allow_territory_override, allow_organization_override,
        allow_outlet_override, created_at
      ) values (
        gen_random_uuid(), ${args.brandId}::uuid, ${args.priceBookId}::uuid,
        ${args.variantModifierGroupId}::uuid, ${args.modifierGroupOptionId}::uuid,
        ${delta}, false, false, false, ${now}
      )
    `);
  });
}

export async function seedBundleOptionDeltaOnBook(
  persistence: Persistence,
  args: {
    brandId: string;
    priceBookId: string;
    bundleGroupOptionId: string;
    priceDeltaPaise?: bigint;
  },
): Promise<void> {
  const delta = args.priceDeltaPaise ?? BigInt(0);
  const now = new Date("2026-01-01T00:00:00+05:30");
  await persistence.withContext(async (ctx) => {
    await ctx.db.execute(sql`
      insert into app.price_book_bundle_option_prices (
        id, brand_id, price_book_id, bundle_group_option_id, price_delta_paise,
        allow_territory_override, allow_organization_override,
        allow_outlet_override, created_at
      ) values (
        gen_random_uuid(), ${args.brandId}::uuid, ${args.priceBookId}::uuid,
        ${args.bundleGroupOptionId}::uuid, ${delta},
        false, false, false, ${now}
      )
    `);
  });
}

/** Attach a variant price onto the brand's already-active price book (SQL). */
export async function attachVariantPriceToActiveBrandBook(
  persistence: Persistence,
  args: {
    brandId: string;
    variantId: string;
    amountPaise?: bigint;
  },
): Promise<void> {
  const amountPaise = args.amountPaise ?? BigInt(10_000);
  const now = new Date("2026-01-01T00:00:00+05:30");
  await persistence.withContext(async (ctx) => {
    const book = await ctx.db.execute(sql`
      select id::text as id from app.price_books
      where brand_id = ${args.brandId}::uuid
        and scope_type = 'brand'
        and lifecycle_status = 'active'
      limit 1
    `);
    const priceBookId = book.rows[0]?.id as string | undefined;
    if (!priceBookId) {
      throw new Error("No active brand price book to attach variant price.");
    }
    await ctx.db.execute(sql`
      insert into app.price_book_variant_prices (
        id, brand_id, price_book_id, variant_id, amount_paise,
        floor_paise, ceiling_paise,
        allow_territory_override, allow_organization_override, allow_outlet_override,
        tax_category_id, created_at
      ) values (
        gen_random_uuid(), ${args.brandId}::uuid, ${priceBookId}::uuid,
        ${args.variantId}::uuid, ${amountPaise},
        null, null, false, false, false,
        ${TAX_CATEGORY_RESTAURANT_SERVICE_ID}::uuid, ${now}
      )
    `);
  });
}

export async function seedServiceableOutlet(
  persistence: Persistence,
  actor: unknown,
  outletId: string,
  postalCode: string = CHECKOUT_PIN,
): Promise<void> {
  await configureAlwaysAcceptingOutlet(persistence, actor, outletId);
  await setOutletServiceabilityRoutingPriority(persistence, actor, {
    outletId,
    routingPriority: 1,
    expectedRevision: null,
  });
  await addOutletServiceabilityPins(persistence, actor, {
    outletId,
    postalCodes: [postalCode],
    expectedRevision: BigInt(1),
  });
}

export async function createSavedAddressForCustomer(
  persistence: Persistence,
  customerAuthUserId: string,
  overrides: Parameters<typeof minimalAddressCreateInput>[0] = {},
) {
  return createOwnAddress(
    persistence,
    addressCustomerActor(customerAuthUserId),
    minimalAddressCreateInput({
      postalCode: CHECKOUT_PIN,
      ...overrides,
    }),
  );
}

export type CheckoutReadyHarness = CartHarness &
  Readonly<{
    cartId: string;
    cartRevision: bigint;
    addressId: string;
    oneTimeDestination: Readonly<{
      kind: "ONE_TIME_ADDRESS";
      recipientName: string;
      recipientPhone: string;
      addressLine1: string;
      city: string;
      stateCode: string;
      postalCode: string;
    }>;
  }>;

/**
 * Full commercial-ready harness: non-empty customer cart, assortment,
 * serviceability, pricing+tax, and a saved address for customer A.
 */
export async function withCheckoutReadyHarness<T>(
  fn: (harness: CheckoutReadyHarness) => Promise<T>,
): Promise<T> {
  return withCartHarness(async (harness) => {
    const { persistence, actors, catalog } = harness;
    const brandId = actors.tree.brand.id;
    const access = {
      kind: "customer" as const,
      actor: actors.customerA,
      brandId,
    };

    await includeVariantAtBrand(
      persistence,
      actors.brandAdminActor,
      brandId,
      catalog.variantId,
    );
    await seedServiceableOutlet(
      persistence,
      actors.brandAdminActor,
      actors.tree.outletA.id,
    );
    await seedBrandPriceAndTaxForVariant(persistence, {
      actor: actors.brandAdminActor,
      brandId,
      organizationId: actors.tree.orgA.id,
      legalEntityId: actors.tree.leA.id,
      outletId: actors.tree.outletA.id,
      variantId: catalog.variantId,
      amountPaise: BigInt(10_000),
    });

    const added = await addCartLine(persistence, access, {
      variantId: catalog.variantId,
      quantity: 1,
    });
    const address = await createSavedAddressForCustomer(
      persistence,
      actors.customerAId,
    );

    return fn({
      ...harness,
      cartId: added.cart.id,
      cartRevision: added.cart.revision,
      addressId: address.id,
      oneTimeDestination: Object.freeze({
        kind: "ONE_TIME_ADDRESS" as const,
        recipientName: "One Time Guest",
        recipientPhone: "+919876543210",
        addressLine1: "12 Mall Road",
        city: "Dehradun",
        stateCode: "IN-UT",
        postalCode: CHECKOUT_PIN,
      }),
    });
  });
}

export async function mintCustomerActor(
  connectionString: string,
  customerAuthUserId: string,
): Promise<CustomerActor> {
  return customerActorFromAuthenticatedSession(
    connectionString,
    customerAuthUserId,
  );
}

export { seedActiveStandardVariant, withCartHarness };
