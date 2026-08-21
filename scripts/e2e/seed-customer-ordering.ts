#!/usr/bin/env -S node --conditions=react-server --import tsx
/**
 * Seed imported menu + commercial prerequisites for IMP-025 E2E.
 * Test/harness only — not a production bootstrap path.
 */
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { sql } from "drizzle-orm";

import { loadConfig, type WorkerConfig } from "../../src/platform/config";
import { bootstrapPlatformSuperAdmin } from "../../src/server/access-control";
import {
  configureOutletOperatingProfile,
  replaceOutletOperatingSchedule,
} from "../../src/server/assortment";
import { bootstrapExistingMenuAssortment } from "../../src/server/assortment/bootstrap";
import { runExistingMenuImport } from "../../src/server/catalog/menu-import/importer";
import {
  createLegalEntity,
  createOrganization,
  createOutlet,
  createTerritory,
} from "../../src/server/organization";
import { getApplicationPersistence } from "../../src/server/persistence";
import type { Persistence } from "../../src/server/persistence/types";
import {
  assignOutletTaxProfile,
  bootstrapExistingMenuPricing,
  createLegalEntityTaxProfile,
} from "../../src/server/pricing";
import {
  addOutletServiceabilityPins,
  setOutletServiceabilityRoutingPriority,
} from "../../src/server/serviceability";
import {
  BOOTSTRAP_PRICE_BOOK_ID,
  CHARGE_DEFINITION_DELIVERY_ID,
  CHARGE_DEFINITION_PACKAGING_ID,
  TAX_CATEGORY_RESTAURANT_SERVICE_ID,
} from "../../src/shared/pricing";
import {
  createEligibleWorkforceUser,
  principalFor,
} from "../../tests/database/support/access-control-fixtures";

const GSTIN_UT = "05AAAAA0000A1Z5";
const CHECKOUT_PIN = "248001";

async function seedAlwaysAcceptingOutlet(
  persistence: Persistence,
  actor: unknown,
  outletId: string,
): Promise<void> {
  await persistence.transaction(async (tx) => {
    await configureOutletOperatingProfile(tx, {
      actor,
      outletId,
      timezone: "Asia/Kolkata",
    });
    await replaceOutletOperatingSchedule(tx, {
      actor,
      outletId,
      intervals: ([0, 1, 2, 3, 4, 5, 6] as const).map((dayOfWeek) => ({
        dayOfWeek,
        startMinute: 0,
        endMinute: 1440,
      })),
    });
  });
}

async function seedServiceablePin(
  persistence: Persistence,
  actor: unknown,
  outletId: string,
  postalCode: string,
): Promise<void> {
  await seedAlwaysAcceptingOutlet(persistence, actor, outletId);
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

async function seedChargePricesOnBook(
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

export async function seedCustomerOrderingCommerce(workerConfig: WorkerConfig): Promise<{
  brandId: string;
  outletId: string;
}> {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const persistence = getApplicationPersistence(workerConfig);
  try {
    const imported = await runExistingMenuImport({
      projectRoot,
      persistence,
      apply: true,
    });
    if (!imported.brandId || imported.outcome === "FAILED") {
      throw new Error("existing-menu import did not apply a brand catalog.");
    }
    const assortment = await bootstrapExistingMenuAssortment({
      projectRoot,
      persistence,
      apply: true,
    });
    if (assortment.outcome === "FAILED") {
      throw new Error("assortment bootstrap failed.");
    }
    const pricing = await bootstrapExistingMenuPricing({
      projectRoot,
      persistence,
      apply: true,
    });
    if (pricing.outcome === "FAILED") {
      throw new Error("pricing bootstrap failed.");
    }

    const psa = await createEligibleWorkforceUser(persistence);
    await bootstrapPlatformSuperAdmin({ persistence, workforceUserId: psa.id });
    const actor = principalFor(psa.id);

    const tree = await persistence.transaction(async (tx) => {
      const org = await createOrganization(tx, {
        brandId: imported.brandId,
        code: "e2e-org",
        name: "E2E Organization",
      });
      const territory = await createTerritory(tx, {
        brandId: imported.brandId,
        code: "e2e-terr",
        name: "E2E Territory",
      });
      const legalEntity = await createLegalEntity(tx, {
        brandId: imported.brandId,
        organizationId: org.id,
        code: "e2e-le",
        name: "E2E Legal Entity",
      });
      const outlet = await createOutlet(tx, {
        brandId: imported.brandId,
        organizationId: org.id,
        territoryId: territory.id,
        legalEntityId: legalEntity.id,
        code: "e2e-outlet",
        name: "E2E Outlet",
      });
      return { org, territory, legalEntity, outlet };
    });

    await seedServiceablePin(persistence, actor, tree.outlet.id, CHECKOUT_PIN);

    await persistence.transaction(async (tx) => {
      const profile = await createLegalEntityTaxProfile(tx, {
        actorWorkforceUserId: null,
        legalEntityId: tree.legalEntity.id,
        brandId: imported.brandId,
        organizationId: tree.org.id,
        stateCode: "05",
        registrationStatus: "registered",
        gstin: GSTIN_UT,
        validFrom: new Date("2026-01-01T00:00:00+05:30"),
      });
      await assignOutletTaxProfile(tx, {
        actorWorkforceUserId: null,
        outletId: tree.outlet.id,
        legalEntityTaxProfileId: profile.id,
        effectiveFrom: new Date("2026-01-01T00:00:00+05:30"),
      });
    });

    await seedChargePricesOnBook(persistence, {
      brandId: imported.brandId,
      priceBookId: pricing.priceBookId ?? BOOTSTRAP_PRICE_BOOK_ID,
      packagingPaise: BigInt(2_000),
      deliveryPaise: BigInt(4_000),
    });

    return { brandId: imported.brandId, outletId: tree.outlet.id };
  } finally {
    await persistence.close();
  }
}

async function main(): Promise<void> {
  const workerConfig = loadConfig({ processKind: "worker", source: process.env });
  const seeded = await seedCustomerOrderingCommerce(workerConfig);
  process.stdout.write(`${JSON.stringify({ ok: true, ...seeded })}\n`);
}

if (process.argv[1] && process.argv[1].includes("seed-customer-ordering")) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "seed failed";
    const stack = error instanceof Error ? error.stack : undefined;
    process.stderr.write(`${JSON.stringify({ ok: false, error: message, stack })}\n`);
    process.exitCode = 1;
  });
}
