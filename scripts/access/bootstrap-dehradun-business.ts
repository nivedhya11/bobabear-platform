#!/usr/bin/env -S node --conditions=react-server --import tsx
/**
 * Idempotent Founder-staging Dehradun business bootstrap (IMP-036C).
 *
 * Uses a legitimate MFA-enrolled Platform Super Admin principal loaded from
 * the workforce identity tables — never test-fixture forged identity flags.
 *
 * Hierarchy creation goes through Administration use-cases. Serviceability +
 * UAT operating schedule use existing domain authorities. Packaging/delivery
 * charge-price fallback uses the established checkout-fixture amounts because
 * IMP-015 has no charge-price admin API and no Founder-approved distance bands
 * are present.
 *
 * Usage:
 *   npm run staging:bootstrap-dehradun-business -- --actor-id=<workforce-user-id>
 */
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { loadEnvConfig } from "@next/env";
import { sql } from "drizzle-orm";

import { loadConfig } from "../../src/platform/config/load-config";
import {
  adminCreateLegalEntity,
  adminCreateOrganization,
  adminCreateOutlet,
  adminCreateTerritory,
  adminGetBrand,
  adminGetEffectivePermissions,
  adminListLegalEntities,
  adminListMemberships,
  adminListOrganizations,
  adminListOutlets,
  adminListRoleAssignments,
  adminListTerritories,
} from "../../src/server/administration/use-cases";
import {
  configureOutletOperatingProfile,
  findOutletOperatingProfile,
  listOutletOperatingIntervals,
  replaceOutletOperatingSchedule,
} from "../../src/server/assortment/operating";
import { resolveOutletOperatingState } from "../../src/server/assortment/resolve-operating";
import { getApplicationPersistence } from "../../src/server/persistence";
import type { Persistence } from "../../src/server/persistence/types";
import {
  assignOutletTaxProfile,
  createLegalEntityTaxProfile,
} from "../../src/server/pricing";
import {
  getOutletServiceabilityConfiguration,
  setOutletServiceabilityDistancePolicy,
  setOutletServiceabilityRoutingPriority,
} from "../../src/server/serviceability";
import {
  BOOTSTRAP_PRICE_BOOK_ID,
  CHARGE_DEFINITION_DELIVERY_ID,
  CHARGE_DEFINITION_PACKAGING_ID,
  TAX_CATEGORY_RESTAURANT_SERVICE_ID,
} from "../../src/shared/pricing";
import { resolveWorkforcePrincipalFromDatabase } from "./resolve-workforce-principal-from-db";

const CANONICAL_BRAND_ID = "56ff7724-d511-5ef4-b5d5-d629cbfb2388";

const ORG = Object.freeze({ code: "boba-bear", name: "Boba Bear" });
const TERRITORY = Object.freeze({ code: "dehradun", name: "Dehradun" });
const LEGAL_ENTITY = Object.freeze({
  code: "nivedhya11-hospitality",
  name: "Nivedhya11 Hospitality Pvt Ltd",
});
const OUTLET = Object.freeze({
  code: "boba-bear-dehradun",
  name: "Boba Bear, Dehradun",
});

const SERVICE_ORIGIN = Object.freeze({
  latitude: "30.2868286",
  longitude: "77.9991566",
  maxDistanceMeters: 9000,
  routingPriority: 1,
});

/** Established checkout-fixture delivery/packaging fallback (no approved bands). */
const PACKAGING_PAISE = BigInt(2_000);
const DELIVERY_PAISE = BigInt(4_000);

const FULL_WEEK_INTERVALS = ([0, 1, 2, 3, 4, 5, 6] as const).map((dayOfWeek) => ({
  dayOfWeek,
  startMinute: 0,
  endMinute: 1440,
}));

function parseArgs(argv: readonly string[]): Readonly<{ actorId: string }> {
  const map = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token?.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      map.set(key, next);
      i += 1;
    } else {
      map.set(key, "true");
    }
  }
  const actorId = map.get("actor-id");
  if (!actorId) {
    process.stderr.write(
      "Usage: staging:bootstrap-dehradun-business --actor-id <workforce-user-id>\n",
    );
    process.exit(1);
  }
  return Object.freeze({ actorId });
}

function isExpectedUatOperatingConfiguration(
  profile: Awaited<ReturnType<typeof findOutletOperatingProfile>>,
  intervals: Awaited<ReturnType<typeof listOutletOperatingIntervals>>,
): boolean {
  return (
    profile?.timezone === "Asia/Kolkata" &&
    intervals.length === FULL_WEEK_INTERVALS.length &&
    FULL_WEEK_INTERVALS.every((expected) =>
      intervals.some(
        (actual) =>
          actual.dayOfWeek === expected.dayOfWeek &&
          actual.startMinute === expected.startMinute &&
          actual.endMinute === expected.endMinute,
      ),
    )
  );
}

async function ensureChargePriceFallback(
  persistence: Persistence,
  brandId: string,
): Promise<Readonly<{ packagingPaise: string; deliveryPaise: string; source: string }>> {
  const now = new Date("2026-01-01T00:00:00+05:30");
  await persistence.withContext(async (ctx) => {
    await ctx.db.execute(sql`
      insert into app.price_book_charge_prices (
        id, brand_id, price_book_id, charge_definition_id, amount_paise,
        calculation_mode, allow_territory_override, allow_organization_override,
        allow_outlet_override, tax_category_id, created_at
      ) values
        (
          gen_random_uuid(), ${brandId}::uuid, ${BOOTSTRAP_PRICE_BOOK_ID}::uuid,
          ${CHARGE_DEFINITION_PACKAGING_ID}::uuid, ${PACKAGING_PAISE},
          'fixed_per_order', false, false, false,
          ${TAX_CATEGORY_RESTAURANT_SERVICE_ID}::uuid, ${now}
        ),
        (
          gen_random_uuid(), ${brandId}::uuid, ${BOOTSTRAP_PRICE_BOOK_ID}::uuid,
          ${CHARGE_DEFINITION_DELIVERY_ID}::uuid, ${DELIVERY_PAISE},
          'fixed_per_order', false, false, false,
          ${TAX_CATEGORY_RESTAURANT_SERVICE_ID}::uuid, ${now}
        )
      on conflict (price_book_id, charge_definition_id) do nothing
    `);
  });

  const rows = await persistence.withContext(async (ctx) =>
    ctx.db.execute<{ charge_definition_id: string; amount_paise: string }>(sql`
      select charge_definition_id::text, amount_paise::text
      from app.price_book_charge_prices
      where price_book_id = ${BOOTSTRAP_PRICE_BOOK_ID}::uuid
        and charge_definition_id in (
          ${CHARGE_DEFINITION_PACKAGING_ID}::uuid,
          ${CHARGE_DEFINITION_DELIVERY_ID}::uuid
        )
    `),
  );

  const byId = new Map(rows.rows.map((r) => [r.charge_definition_id, r.amount_paise]));
  const packaging = byId.get(CHARGE_DEFINITION_PACKAGING_ID);
  const delivery = byId.get(CHARGE_DEFINITION_DELIVERY_ID);
  if (!packaging || !delivery) {
    throw new Error("price_book_charge_prices packaging/delivery fallback missing after upsert.");
  }
  return Object.freeze({
    packagingPaise: packaging,
    deliveryPaise: delivery,
    source: "price_book_fallback",
  });
}

async function ensureOutletTaxProfile(
  persistence: Persistence,
  args: Readonly<{
    brandId: string;
    organizationId: string;
    legalEntityId: string;
    outletId: string;
    actorWorkforceUserId: string;
  }>,
): Promise<string> {
  const existing = await persistence.withContext(async (ctx) =>
    ctx.db.execute<{ id: string }>(sql`
      select p.id::text as id
      from app.outlet_tax_profiles otp
      inner join app.legal_entity_tax_profiles p
        on p.id = otp.legal_entity_tax_profile_id
      where otp.outlet_id = ${args.outletId}::uuid
        and otp.lifecycle_status = 'active'
      limit 1
    `),
  );
  if (existing.rows[0]?.id) {
    return existing.rows[0].id;
  }

  return persistence.transaction(async (tx) => {
    const profile = await createLegalEntityTaxProfile(tx, {
      actorWorkforceUserId: args.actorWorkforceUserId,
      legalEntityId: args.legalEntityId,
      brandId: args.brandId,
      organizationId: args.organizationId,
      stateCode: "05",
      registrationStatus: "unregistered",
      gstin: null,
      validFrom: new Date("2026-01-01T00:00:00+05:30"),
    });
    await assignOutletTaxProfile(tx, {
      actorWorkforceUserId: args.actorWorkforceUserId,
      outletId: args.outletId,
      legalEntityTaxProfileId: profile.id,
      effectiveFrom: new Date("2026-01-01T00:00:00+05:30"),
    });
    return profile.id;
  });
}

async function main(): Promise<void> {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  loadEnvConfig(projectRoot, true);
  const args = parseArgs(process.argv.slice(2));
  const config = loadConfig({ processKind: "worker", source: process.env });
  const persistence = getApplicationPersistence(config);

  try {
    const actor = await resolveWorkforcePrincipalFromDatabase(persistence, args.actorId);

    const memberships = await adminListMemberships(persistence, actor);
    const platformMembership = memberships.find(
      (m) =>
        m.workforceUserId === args.actorId &&
        m.scopeType === "platform" &&
        m.status === "active",
    );
    if (!platformMembership) {
      throw new Error("Founder identity has no active platform membership.");
    }
    const assignments = await adminListRoleAssignments(
      persistence,
      actor,
      platformMembership.id,
    );
    const psa = assignments.find(
      (a) => a.roleKey === "platform_super_admin" && a.revokedAt === null,
    );
    if (!psa) {
      throw new Error("Founder identity is not an effective Platform Super Admin.");
    }

    const brand = await adminGetBrand(persistence, actor, CANONICAL_BRAND_ID);
    if (brand.code !== "boba-bear" || brand.name !== "BOBA Bear") {
      throw new Error("Canonical BOBA Bear brand identity mismatch.");
    }

    let organization = (await adminListOrganizations(persistence, actor)).find(
      (o) => o.brandId === CANONICAL_BRAND_ID && o.code === ORG.code,
    );
    if (!organization) {
      organization = await adminCreateOrganization(persistence, actor, {
        brandId: CANONICAL_BRAND_ID,
        code: ORG.code,
        name: ORG.name,
      });
    } else if (organization.name !== ORG.name) {
      throw new Error(`Organization ${ORG.code} exists with unexpected name.`);
    }

    let territory = (await adminListTerritories(persistence, actor)).find(
      (t) => t.brandId === CANONICAL_BRAND_ID && t.code === TERRITORY.code,
    );
    if (!territory) {
      territory = await adminCreateTerritory(persistence, actor, {
        brandId: CANONICAL_BRAND_ID,
        code: TERRITORY.code,
        name: TERRITORY.name,
      });
    } else if (territory.name !== TERRITORY.name) {
      throw new Error(`Territory ${TERRITORY.code} exists with unexpected name.`);
    }

    let legalEntity = (await adminListLegalEntities(persistence, actor)).find(
      (e) =>
        e.brandId === CANONICAL_BRAND_ID &&
        e.organizationId === organization!.id &&
        e.code === LEGAL_ENTITY.code,
    );
    if (!legalEntity) {
      legalEntity = await adminCreateLegalEntity(persistence, actor, {
        brandId: CANONICAL_BRAND_ID,
        organizationId: organization.id,
        code: LEGAL_ENTITY.code,
        name: LEGAL_ENTITY.name,
      });
    } else if (legalEntity.name !== LEGAL_ENTITY.name) {
      throw new Error(`Legal entity ${LEGAL_ENTITY.code} exists with unexpected name.`);
    }

    let outlet = (await adminListOutlets(persistence, actor)).find(
      (o) => o.brandId === CANONICAL_BRAND_ID && o.code === OUTLET.code,
    );
    if (!outlet) {
      outlet = await adminCreateOutlet(persistence, actor, {
        brandId: CANONICAL_BRAND_ID,
        organizationId: organization.id,
        territoryId: territory.id,
        legalEntityId: legalEntity.id,
        code: OUTLET.code,
        name: OUTLET.name,
      });
    } else {
      if (outlet.name !== OUTLET.name) {
        throw new Error(`Outlet ${OUTLET.code} exists with unexpected name.`);
      }
      if (
        outlet.organizationId !== organization.id ||
        outlet.territoryId !== territory.id ||
        outlet.legalEntityId !== legalEntity.id
      ) {
        throw new Error(`Outlet ${OUTLET.code} ancestry does not match approved hierarchy.`);
      }
    }

    let serviceability = await getOutletServiceabilityConfiguration(persistence, actor, {
      outletId: outlet.id,
    });
    if (serviceability.routingPriority === null) {
      serviceability = await setOutletServiceabilityRoutingPriority(persistence, actor, {
        outletId: outlet.id,
        routingPriority: SERVICE_ORIGIN.routingPriority,
        expectedRevision: null,
      });
    } else if (serviceability.routingPriority !== SERVICE_ORIGIN.routingPriority) {
      throw new Error("Outlet routing priority conflict with approved staging value 1.");
    }

    const distanceAligned =
      serviceability.serviceOriginLatitude === SERVICE_ORIGIN.latitude &&
      serviceability.serviceOriginLongitude === SERVICE_ORIGIN.longitude &&
      serviceability.maxServiceDistanceMeters === SERVICE_ORIGIN.maxDistanceMeters;
    if (!distanceAligned) {
      serviceability = await setOutletServiceabilityDistancePolicy(persistence, actor, {
        outletId: outlet.id,
        expectedRevision: serviceability.revision,
        serviceOriginLatitude: SERVICE_ORIGIN.latitude,
        serviceOriginLongitude: SERVICE_ORIGIN.longitude,
        maxServiceDistanceMeters: SERVICE_ORIGIN.maxDistanceMeters,
      });
    }

    await persistence.transaction(async (tx) => {
      await configureOutletOperatingProfile(tx, {
        actor,
        outletId: outlet!.id,
        timezone: "Asia/Kolkata",
      });
      await replaceOutletOperatingSchedule(tx, {
        actor,
        outletId: outlet!.id,
        intervals: FULL_WEEK_INTERVALS,
      });
    });

    const profile = await persistence.withContext((ctx) =>
      findOutletOperatingProfile(ctx, outlet!.id),
    );
    const intervals = await persistence.withContext((ctx) =>
      listOutletOperatingIntervals(ctx, outlet!.id),
    );
    const operating = await persistence.withContext((ctx) =>
      resolveOutletOperatingState(ctx, {
        outletId: outlet!.id,
        context: { now: new Date() },
      }),
    );
    if (!isExpectedUatOperatingConfiguration(profile, intervals) || operating.code !== "AVAILABLE") {
      throw new Error("UAT operating configuration did not converge to 24x7 AVAILABLE / accepting.");
    }
    if (profile?.controlState !== "accepting") {
      throw new Error("Outlet control state must be accepting.");
    }

    const taxProfileId = await ensureOutletTaxProfile(persistence, {
      brandId: CANONICAL_BRAND_ID,
      organizationId: organization.id,
      legalEntityId: legalEntity.id,
      outletId: outlet.id,
      actorWorkforceUserId: actor.workforceUserId,
    });

    const deliveryFee = await ensureChargePriceFallback(persistence, CANONICAL_BRAND_ID);

    const capabilities = await adminGetEffectivePermissions(persistence, actor, {
      resourceType: "platform",
    });

    const finalOrgs = await adminListOrganizations(persistence, actor);
    const finalTerritories = await adminListTerritories(persistence, actor);
    const finalLegalEntities = await adminListLegalEntities(persistence, actor);
    const finalOutlets = await adminListOutlets(persistence, actor);

    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          operation: "staging_bootstrap_dehradun_business",
          brand: { id: brand.id, name: brand.name, reused: true },
          organization: { id: organization.id, code: organization.code, name: organization.name },
          territory: { id: territory.id, code: territory.code, name: territory.name },
          legalEntity: { id: legalEntity.id, code: legalEntity.code, name: legalEntity.name },
          outlet: { id: outlet.id, code: outlet.code, name: outlet.name },
          serviceability: {
            routingPriority: serviceability.routingPriority,
            origin: {
              latitude: serviceability.serviceOriginLatitude,
              longitude: serviceability.serviceOriginLongitude,
            },
            maxDistanceMeters: serviceability.maxServiceDistanceMeters,
            revision: serviceability.revision?.toString() ?? null,
          },
          operating: {
            timezone: profile?.timezone ?? null,
            controlState: profile?.controlState ?? null,
            schedule: "7d_00:00-24:00_uat",
            resolver: operating.code,
          },
          taxProfileId,
          deliveryFee,
          platformAdmin: {
            membershipId: platformMembership.id,
            assignmentId: psa.id,
            effectiveScope: "platform",
            capabilities,
          },
          duplicateEntities: {
            organization:
              finalOrgs.filter((o) => o.brandId === CANONICAL_BRAND_ID && o.code === ORG.code)
                .length !== 1,
            territory:
              finalTerritories.filter(
                (t) => t.brandId === CANONICAL_BRAND_ID && t.code === TERRITORY.code,
              ).length !== 1,
            legalEntity:
              finalLegalEntities.filter(
                (e) =>
                  e.brandId === CANONICAL_BRAND_ID &&
                  e.organizationId === organization.id &&
                  e.code === LEGAL_ENTITY.code,
              ).length !== 1,
            outlet:
              finalOutlets.filter((o) => o.brandId === CANONICAL_BRAND_ID && o.code === OUTLET.code)
                .length !== 1,
          },
          bootstrapIdempotent: true,
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    await persistence.close();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : "staging bootstrap failed",
    })}\n`,
  );
  process.exitCode = 1;
});
