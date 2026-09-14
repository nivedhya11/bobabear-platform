/** IMP-036F F6A — commercial inspection / diagnosis / verification Admin HTTP. */
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

import { serializeSignedCookie } from "better-call";
import { afterEach, describe, expect, it, inject, vi } from "vitest";

import type { WorkforcePrincipal } from "../../src/server/access-control";
import { createMembership, grantRole } from "../../src/server/access-control";
import {
  getWorkforceAuthRuntime,
  WORKFORCE_AUTH_SESSION_COOKIE_NAME,
} from "../../src/server/auth/workforce";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import {
  setVariantAvailability,
  configureOutletOperatingProfile,
  replaceOutletOperatingSchedule,
  pauseOutlet,
  resumeOutlet,
} from "../../src/server/assortment";
import {
  activateMenuEntry,
  activateMenuSection,
  createMenu,
  createMenuEntry,
  createMenuSection,
  findMenuById,
  publishMenuRevision,
} from "../../src/server/catalog/menu";
import {
  activatePriceBook,
  attachDraftVariantPrice,
  createDraftPriceBook,
} from "../../src/server/pricing";
import {
  activatePromotion,
  createPromotionDraft,
  setPromotionBenefit,
  setPromotionTargets,
} from "../../src/server/promotions";
import { classifyAdminCommercialRoute } from "../../src/server/operations/http/admin-commercial-routes";
import { routeOperationsRequest } from "../../src/server/operations/http/router";
import { getApplicationPersistence } from "../../src/server/persistence";
import { TAX_CATEGORY_RESTAURANT_SERVICE_ID } from "../../src/shared/pricing";
import type { WebConfig } from "../../src/platform/config";
import {
  createEligibleWorkforceUser,
  principalFor,
  seedBrandTree,
} from "../database/support/access-control-fixtures";
import {
  createActiveStandardVariant,
  includeVariantAtBrand,
} from "../assortment-availability/support";
import { applyMigrations, withIsolatedTestDatabase } from "../database/support/test-database";
import {
  seedOutletDistanceServiceability,
  TEST_INSIDE_COORDS,
  TEST_OUTSIDE_COORDS,
} from "../database/support/serviceability-fixtures";

type InternalAdapter = { createSession: (userId: string) => Promise<{ token: string }> };

function adminConnectionInfo() {
  return {
    connectionString: inject("bobaBearTestAdminConnectionString"),
    host: inject("bobaBearTestAdminHost"),
    port: inject("bobaBearTestAdminPort"),
  };
}

function applicationConfig(databaseUrl: string): WebConfig {
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

function workforceAuthConfig() {
  return loadAuthFoundationConfig(
    {
      CUSTOMER_AUTH_SECRET: "f6a-admin-http-customer-auth-secret32xx",
      CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
      WORKFORCE_AUTH_SECRET: "f6a-admin-http-workforce-auth-secretxx",
      WORKFORCE_AUTH_BASE_URL: "http://localhost:3200",
    },
    "test",
  );
}

async function signedCookie(token: string): Promise<string> {
  const cookie = await serializeSignedCookie(
    WORKFORCE_AUTH_SESSION_COOKIE_NAME,
    token,
    workforceAuthConfig().workforce.secret,
  );
  return cookie.split(";", 1)[0]!;
}

async function adapterFor(runtime: {
  getAuth: () => Promise<{ $context: Promise<unknown> }>;
}): Promise<InternalAdapter> {
  const auth = await runtime.getAuth();
  return ((await auth.$context) as { internalAdapter: InternalAdapter }).internalAdapter;
}

const openHandles: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(openHandles.splice(0).map((h) => h.close()));
});

async function alwaysAccepting(
  persistence: ReturnType<typeof getApplicationPersistence>,
  actor: unknown,
  outletId: string,
): Promise<void> {
  await persistence.transaction(async (tx) => {
    await configureOutletOperatingProfile(tx, { actor, outletId, timezone: "Asia/Kolkata" });
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

async function seedMenuWithImage(
  persistence: ReturnType<typeof getApplicationPersistence>,
  actor: WorkforcePrincipal,
  brandId: string,
  productId: string,
  codePrefix: string,
) {
  const menu = await persistence.transaction((tx) =>
    createMenu(tx, {
      actor,
      brandId,
      code: `${codePrefix}-menu`,
      name: `${codePrefix} Menu`,
    }),
  );
  const section = await persistence.transaction(async (tx) => {
    const current = await findMenuById(tx, menu.id);
    return createMenuSection(tx, {
      actor,
      brandId,
      menuId: menu.id,
      code: `${codePrefix}-sec`,
      name: "Section",
      position: 0,
      expectedMenuRevision: current!.revision,
    });
  });
  const entry = await persistence.transaction(async (tx) => {
    const current = await findMenuById(tx, menu.id);
    return createMenuEntry(tx, {
      actor,
      brandId,
      menuId: menu.id,
      sectionId: section.id,
      productId,
      position: 0,
      imagePath: "/assets/menu/f6a-test.jpeg",
      expectedMenuRevision: current!.revision,
    });
  });
  await persistence.transaction(async (tx) => {
    let current = await findMenuById(tx, menu.id);
    await activateMenuSection(tx, {
      actor,
      sectionId: section.id,
      expectedMenuRevision: current!.revision,
    });
    current = await findMenuById(tx, menu.id);
    await activateMenuEntry(tx, {
      actor,
      entryId: entry.id,
      expectedMenuRevision: current!.revision,
    });
    current = await findMenuById(tx, menu.id);
    await publishMenuRevision(tx, {
      actor,
      menuId: menu.id,
      expectedMenuRevision: current!.revision,
    });
  });
  return { menuId: menu.id, entryId: entry.id };
}

async function seedBrandPrice(
  persistence: ReturnType<typeof getApplicationPersistence>,
  actor: unknown,
  brandId: string,
  variantId: string,
  amountPaise: bigint,
) {
  await persistence.transaction(async (tx) => {
    const book = await createDraftPriceBook(tx, {
      actor,
      brandId,
      scopeType: "brand",
      code: `pb-${randomUUID().slice(0, 8)}`,
      name: "Brand book",
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      effectiveTo: null,
    });
    await attachDraftVariantPrice(tx, {
      actor,
      priceBookId: book.id,
      brandId,
      variantId,
      amountPaise,
      taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
      expectedPriceBookRevision: book.revision,
    });
    await activatePriceBook(tx, {
      actor,
      priceBookId: book.id,
      brandId,
      expectedPriceBookRevision: book.revision + BigInt(1),
    });
  });
}

describe("classifyAdminCommercialRoute", () => {
  it("classifies Brand-scoped commercial composition routes", () => {
    const brandId = "11111111-1111-4111-8111-111111111111";
    const variantId = "22222222-2222-4222-8222-222222222222";
    const outletId = "33333333-3333-4333-8333-333333333333";
    const base = `/api/admin/v1/brands/${brandId}/commercial`;

    expect(classifyAdminCommercialRoute(`${base}/activity`)).toEqual({
      kind: "activity",
      brandId,
    });
    expect(classifyAdminCommercialRoute(`${base}/variants/${variantId}/inspection`)).toEqual({
      kind: "inspection",
      brandId,
      variantId,
    });
    expect(
      classifyAdminCommercialRoute(
        `${base}/variants/${variantId}/outlets/${outletId}/inspection`,
      ),
    ).toEqual({
      kind: "inspection_outlet",
      brandId,
      variantId,
      outletId,
    });
    expect(classifyAdminCommercialRoute(`${base}/variants/${variantId}/diagnosis`)).toEqual({
      kind: "diagnosis",
      brandId,
      variantId,
    });
    expect(classifyAdminCommercialRoute(`${base}/variants/${variantId}/verification`)).toEqual({
      kind: "verification",
      brandId,
      variantId,
    });
    expect(classifyAdminCommercialRoute(`${base}/variants/${variantId}`)).toBeNull();
    expect(classifyAdminCommercialRoute(`/api/commercial/v1/inspection`)).toBeNull();
  });
});

describe("IMP-036F F6A commercial composition Admin HTTP", () => {
  it("covers inspection, diagnosis, verification, activity, auth, and cross-scope safety", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "f6a"));
      const otherTree = await persistence.transaction((tx) => seedBrandTree(tx, "f6b"));
      const brandAdmin = await createEligibleWorkforceUser(persistence);
      const otherBrandAdmin = await createEligibleWorkforceUser(persistence);
      const kitchen = await createEligibleWorkforceUser(persistence);
      const actor = principalFor(brandAdmin.id);
      const otherActor = principalFor(otherBrandAdmin.id);

      await persistence.transaction(async (tx) => {
        const membership = await createMembership(tx, {
          workforceUserId: brandAdmin.id,
          scope: { scopeType: "brand", brandId: tree.brand.id },
          status: "active",
        });
        await grantRole(tx, { membershipId: membership.id, roleKey: "brand_admin" });

        const otherMembership = await createMembership(tx, {
          workforceUserId: otherBrandAdmin.id,
          scope: { scopeType: "brand", brandId: otherTree.brand.id },
          status: "active",
        });
        await grantRole(tx, { membershipId: otherMembership.id, roleKey: "brand_admin" });

        const kitchenMembership = await createMembership(tx, {
          workforceUserId: kitchen.id,
          scope: {
            scopeType: "outlet",
            brandId: tree.brand.id,
            organizationId: tree.orgA.id,
            territoryId: tree.terrA.id,
            outletId: tree.outletA.id,
          },
          status: "active",
        });
        await grantRole(tx, { membershipId: kitchenMembership.id, roleKey: "kitchen_operator" });
      });

      const brandId = tree.brand.id;
      const outletId = tree.outletA.id;
      const catalog = await createActiveStandardVariant(persistence, actor, brandId, "f6a");
      const foreignCatalog = await createActiveStandardVariant(
        persistence,
        otherActor,
        otherTree.brand.id,
        "f6x",
      );
      await includeVariantAtBrand(persistence, actor, brandId, catalog.variantId);
      await seedMenuWithImage(persistence, actor, brandId, catalog.productId, "f6a");
      await seedBrandPrice(persistence, actor, brandId, catalog.variantId, BigInt(19_900));
      await alwaysAccepting(persistence, actor, outletId);
      await seedOutletDistanceServiceability(persistence, actor, outletId);

      await persistence.transaction(async (tx) => {
        const created = await createPromotionDraft(tx, {
          actor,
          brandId,
          code: `f6a${randomUUID().slice(0, 6).toLowerCase()}`,
          displayName: "F6A Promo",
          scopeType: "brand",
          territoryId: null,
          organizationId: null,
          outletId: null,
          triggerType: "automatic",
          stackingPolicy: "exclusive",
          startsAt: new Date("2026-01-01T00:00:00.000Z"),
          endsAt: null,
        });
        let revision = created.revision;
        revision = (
          await setPromotionBenefit(tx, {
            actor,
            promotionId: created.id,
            expectedPromotionRevision: revision,
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
          })
        ).revision;
        for (const role of ["qualifier", "benefit"] as const) {
          revision = (
            await setPromotionTargets(tx, {
              actor,
              promotionId: created.id,
              expectedPromotionRevision: revision,
              targetRole: role,
              targets: [
                {
                  targetRole: role,
                  targetType: "all_merchandise",
                  productId: null,
                  variantId: null,
                  chargeDefinitionId: null,
                },
              ],
            })
          ).revision;
        }
        await activatePromotion(tx, {
          actor,
          promotionId: created.id,
          expectedPromotionRevision: revision,
        });
      });

      const runtime = getWorkforceAuthRuntime({
        auth: workforceAuthConfig().workforce,
        persistence: applicationConfig(database.connectionString),
      });
      openHandles.push(runtime);
      const adapter = await adapterFor(runtime);
      const server = createServer((req, res) => {
        void routeOperationsRequest(
          req,
          res,
          {
            runtime,
            persistence,
            trustedOrigin: "http://localhost:3000",
          },
          req.headers["x-request-id"]?.toString() ?? "f6a-req",
        );
      });
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      openHandles.push({
        close: () =>
          new Promise<void>((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
          }),
      });
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("expected tcp address");
      const base = `http://127.0.0.1:${address.port}`;

      const session = await adapter.createSession(brandAdmin.id);
      const cookie = await signedCookie(session.token);
      const kitchenSession = await adapter.createSession(kitchen.id);
      const kitchenCookie = await signedCookie(kitchenSession.token);

      const commercialBase = `/api/admin/v1/brands/${brandId}/commercial`;
      const variantBase = `${commercialBase}/variants/${catalog.variantId}`;

      // --- Inspection ---
      const inspectionRes = await fetch(
        `${base}${variantBase}/outlets/${outletId}/inspection`,
        { headers: { Cookie: cookie } },
      );
      expect(inspectionRes.status).toBe(200);
      const inspection = (await inspectionRes.json()) as Record<string, unknown>;
      expect(inspection.ok).toBe(true);
      expect(inspection.authoritiesRemainDistinct).toBe(true);
      expect(inspection.diagnosisIsSourceOfTruth).toBe(false);
      const catalogSection = inspection.catalog as { state: string; data: { moneyIsNotFromCatalog: boolean } };
      expect(catalogSection.state).toBe("available");
      expect(catalogSection.data.moneyIsNotFromCatalog).toBe(true);
      const menuSection = inspection.menu as {
        state: string;
        data: { effectivePlacement: { visibility: string } | null };
      };
      expect(menuSection.state).toBe("available");
      expect(menuSection.data.effectivePlacement?.visibility).toBe("visible");
      const media = inspection.mediaReference as {
        state: string;
        data: { imagePath: string | null };
      };
      expect(media.state).toBe("available");
      expect(media.data.imagePath).toBe("/assets/menu/f6a-test.jpeg");
      const assortment = inspection.assortment as {
        data: { availabilityIsSeparate: boolean };
      };
      expect(assortment.data.availabilityIsSeparate).toBe(true);
      const pricing = inspection.pricing as {
        data: { completeness: string; amountPaise: string };
      };
      expect(pricing.data.completeness).toBe("complete");
      expect(pricing.data.amountPaise).toBe("19900");
      const taxCharges = inspection.taxCharges as {
        data: { taxManageExposed: boolean; chargesManageExposed: boolean };
      };
      expect(taxCharges.data.taxManageExposed).toBe(false);
      expect(taxCharges.data.chargesManageExposed).toBe(false);

      // --- Diagnosis happy path ---
      const diagnosisRes = await fetch(`${base}${variantBase}/diagnosis`, {
        method: "POST",
        headers: {
          Cookie: cookie,
          Origin: "http://localhost:3000",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          outletId,
          customerLocation: TEST_INSIDE_COORDS,
        }),
      });
      expect(diagnosisRes.status).toBe(200);
      const diagnosis = (await diagnosisRes.json()) as {
        ok: true;
        diagnosisIsSourceOfTruth: false;
        newSellabilityDomain: false;
        signals: Array<{ key: string; outcome: string; authority: string }>;
      };
      expect(diagnosis.diagnosisIsSourceOfTruth).toBe(false);
      expect(diagnosis.newSellabilityDomain).toBe(false);
      const byKey = Object.fromEntries(diagnosis.signals.map((s) => [s.key, s]));
      expect(byKey.CATALOG_LIFECYCLE?.outcome).toBe("pass");
      expect(byKey.MENU_PLACEMENT?.outcome).toBe("pass");
      expect(byKey.ASSORTMENT?.outcome).toBe("pass");
      expect(byKey.AVAILABILITY?.outcome).toBe("pass");
      expect(byKey.PRICING_COMPLETENESS?.outcome).toBe("pass");
      expect(byKey.PROMOTION_APPLICABILITY?.outcome).toBe("info");
      expect(byKey.SERVICEABILITY?.outcome).toBe("pass");
      expect(byKey.SERVICEABILITY?.authority).toBe("serviceability");

      // Availability blocker remains Availability-only
      await persistence.transaction((tx) =>
        setVariantAvailability(tx, {
          actor,
          outletId,
          variantId: catalog.variantId,
          state: "sold_out",
          unavailableUntil: null,
        }),
      );
      const soldOutDiagnosis = await fetch(`${base}${variantBase}/diagnosis`, {
        method: "POST",
        headers: {
          Cookie: cookie,
          Origin: "http://localhost:3000",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ outletId }),
      });
      const soldOutBody = (await soldOutDiagnosis.json()) as {
        signals: Array<{ key: string; outcome: string; explanation: string }>;
      };
      const soldOutByKey = Object.fromEntries(soldOutBody.signals.map((s) => [s.key, s]));
      expect(soldOutByKey.AVAILABILITY?.outcome).toBe("block");
      expect(soldOutByKey.ASSORTMENT?.outcome).toBe("pass");
      expect(soldOutByKey.CATALOG_LIFECYCLE?.outcome).toBe("pass");
      expect(soldOutByKey.AVAILABILITY?.explanation).toMatch(/Availability/i);

      // Restore availability for verification
      await persistence.transaction((tx) =>
        setVariantAvailability(tx, {
          actor,
          outletId,
          variantId: catalog.variantId,
          state: "available",
          unavailableUntil: null,
        }),
      );

      // Assortment exclusion independent of Availability
      const excludedVariant = await createActiveStandardVariant(
        persistence,
        actor,
        brandId,
        "f6e",
      );
      // no include → assortment blocker
      const excludeDiagnosis = await fetch(
        `${base}${commercialBase}/variants/${excludedVariant.variantId}/diagnosis`,
        {
          method: "POST",
          headers: {
            Cookie: cookie,
            Origin: "http://localhost:3000",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ outletId }),
        },
      );
      expect(excludeDiagnosis.status).toBe(200);
      const excludeBody = (await excludeDiagnosis.json()) as {
        signals: Array<{ key: string; outcome: string; explanation: string }>;
      };
      const excludeByKey = Object.fromEntries(excludeBody.signals.map((s) => [s.key, s]));
      expect(excludeByKey.ASSORTMENT?.outcome).toBe("block");
      expect(excludeByKey.ASSORTMENT?.explanation).toMatch(/Assortment/i);
      expect(excludeByKey.AVAILABILITY?.outcome).toBe("pass");

      // Pricing incompleteness
      const unpriced = await createActiveStandardVariant(persistence, actor, brandId, "f6p");
      await includeVariantAtBrand(persistence, actor, brandId, unpriced.variantId);
      const priceDiagnosis = await fetch(
        `${base}${commercialBase}/variants/${unpriced.variantId}/diagnosis`,
        {
          method: "POST",
          headers: {
            Cookie: cookie,
            Origin: "http://localhost:3000",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ outletId }),
        },
      );
      expect(priceDiagnosis.status).toBe(200);
      const priceBody = (await priceDiagnosis.json()) as {
        signals: Array<{ key: string; outcome: string }>;
      };
      expect(
        Object.fromEntries(priceBody.signals.map((s) => [s.key, s])).PRICING_COMPLETENESS
          ?.outcome,
      ).toBe("block");

      // Operating pause distinct
      await persistence.transaction((tx) =>
        pauseOutlet(tx, { actor, outletId, reasonCode: "f6a-pause" }),
      );
      const pausedDiagnosis = await fetch(`${base}${variantBase}/diagnosis`, {
        method: "POST",
        headers: {
          Cookie: cookie,
          Origin: "http://localhost:3000",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ outletId }),
      });
      const pausedBody = (await pausedDiagnosis.json()) as {
        signals: Array<{ key: string; outcome: string }>;
      };
      const pausedByKey = Object.fromEntries(pausedBody.signals.map((s) => [s.key, s]));
      expect(pausedByKey.OUTLET_OPERATING_STATE?.outcome).toBe("block");
      expect(pausedByKey.AVAILABILITY?.outcome).toBe("pass");

      // Resume for verification
      await persistence.transaction((tx) => resumeOutlet(tx, { actor, outletId }));
      await alwaysAccepting(persistence, actor, outletId);

      // Serviceability non-serviceable distinct from tariff
      const outsideDiagnosis = await fetch(`${base}${variantBase}/diagnosis`, {
        method: "POST",
        headers: {
          Cookie: cookie,
          Origin: "http://localhost:3000",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          outletId,
          customerLocation: TEST_OUTSIDE_COORDS,
        }),
      });
      const outsideBody = (await outsideDiagnosis.json()) as {
        signals: Array<{ key: string; outcome: string; explanation: string }>;
      };
      const outsideByKey = Object.fromEntries(outsideBody.signals.map((s) => [s.key, s]));
      expect(outsideByKey.SERVICEABILITY?.outcome).toBe("block");
      expect(outsideByKey.SERVICEABILITY?.explanation).toMatch(/not delivery tariff/i);

      // --- Verification ---
      const verifyRes = await fetch(`${base}${variantBase}/verification`, {
        method: "POST",
        headers: {
          Cookie: cookie,
          Origin: "http://localhost:3000",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          outletId,
          destinationCoordinates: TEST_INSIDE_COORDS,
          orderSubtotalPaise: "19900",
        }),
      });
      expect(verifyRes.status).toBe(200);
      const verify = (await verifyRes.json()) as {
        ok: true;
        outcome: string;
        formStateTrusted: false;
        realtimePushRequired: false;
        subsequentReadValid: true;
        customerMenu: { state: string; present: boolean; draftNotUsed: true };
        pricing: { state: string; amountPaise: string };
        promotions: { state: string; applicableAutomaticCount: number };
        deliveryTariff: { state: string };
      };
      expect(verify.formStateTrusted).toBe(false);
      expect(verify.realtimePushRequired).toBe(false);
      expect(verify.subsequentReadValid).toBe(true);
      expect(verify.customerMenu.state).toBe("observed");
      expect(verify.customerMenu.present).toBe(true);
      expect(verify.customerMenu.draftNotUsed).toBe(true);
      expect(verify.pricing.state).toBe("observed");
      expect(verify.pricing.amountPaise).toBe("19900");
      expect(verify.promotions.state).toBe("observed");
      expect(verify.promotions.applicableAutomaticCount).toBeGreaterThanOrEqual(1);
      expect(["observed", "error"]).toContain(verify.deliveryTariff.state);
      expect(["VERIFIED_MATCH", "PARTIAL_VERIFICATION"]).toContain(verify.outcome);

      // Retry / subsequent read — no realtime required
      const verifyRetry = await fetch(`${base}${variantBase}/verification`, {
        method: "POST",
        headers: {
          Cookie: cookie,
          Origin: "http://localhost:3000",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ outletId }),
      });
      expect(verifyRetry.status).toBe(200);
      const verifyRetryBody = (await verifyRetry.json()) as {
        subsequentReadValid: true;
        deliveryTariff: { state: string };
      };
      expect(verifyRetryBody.subsequentReadValid).toBe(true);
      expect(verifyRetryBody.deliveryTariff.state).toBe("insufficient_context");

      // --- Activity ---
      const activityRes = await fetch(`${base}${commercialBase}/activity`, {
        headers: { Cookie: cookie },
      });
      expect(activityRes.status).toBe(200);
      const activity = (await activityRes.json()) as {
        ok: true;
        mutableCommercialAuditAuthority: false;
        events: Array<{ domain: string }>;
      };
      expect(activity.mutableCommercialAuditAuthority).toBe(false);
      expect(Array.isArray(activity.events)).toBe(true);

      // --- Auth / invalid / cross-scope ---
      const unauth = await fetch(`${base}${variantBase}/inspection`);
      expect(unauth.status).toBe(401);

      const kitchenInspect = await fetch(`${base}${variantBase}/inspection`, {
        headers: { Cookie: kitchenCookie },
      });
      expect(kitchenInspect.status).toBe(403);

      const invalidBrand = await fetch(
        `http://127.0.0.1:${address.port}/api/admin/v1/brands/not-a-uuid/commercial/activity`,
        { headers: { Cookie: cookie } },
      );
      expect(invalidBrand.status).toBe(400);

      const missingVariant = "00000000-0000-4000-8000-000000000404";
      const missingInspect = await fetch(
        `${base}${commercialBase}/variants/${missingVariant}/inspection`,
        { headers: { Cookie: cookie } },
      );
      const foreignInspect = await fetch(
        `${base}${commercialBase}/variants/${foreignCatalog.variantId}/inspection`,
        { headers: { Cookie: cookie } },
      );
      expect(missingInspect.status).toBe(404);
      expect(foreignInspect.status).toBe(404);
      const missingJson = await missingInspect.json();
      const foreignJson = await foreignInspect.json();
      expect(missingJson.code).toBe(foreignJson.code);

      const foreignOutlet = await fetch(
        `${base}${variantBase}/outlets/${otherTree.outletA.id}/inspection`,
        { headers: { Cookie: cookie } },
      );
      expect(foreignOutlet.status).toBe(404);

      const includeSpy = vi.spyOn(
        await import("../../src/server/assortment/rules"),
        "includeBrandVariant",
      );
      await fetch(`${base}${variantBase}/diagnosis`, {
        method: "POST",
        headers: {
          Cookie: cookie,
          Origin: "http://localhost:3000",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ outletId }),
      });
      expect(includeSpy).not.toHaveBeenCalled();
      includeSpy.mockRestore();
    });
  }, 180_000);
});
