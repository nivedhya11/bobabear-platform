/** IMP-036F F4 — Pricing commercial authoring Admin HTTP. */
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

import { serializeSignedCookie } from "better-call";
import { and, eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { inject } from "vitest";

import { createMembership, grantRole } from "../../src/server/access-control";
import {
  getWorkforceAuthRuntime,
  WORKFORCE_AUTH_SESSION_COOKIE_NAME,
} from "../../src/server/auth/workforce";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import { pricingTaxAuditEventsTable } from "../../src/platform/database/schema/pricing";
import { classifyAdminPricingRoute } from "../../src/server/operations/http/admin-pricing-routes";
import { routeOperationsRequest } from "../../src/server/operations/http/router";
import { getApplicationPersistence } from "../../src/server/persistence";
import {
  PricingResolutionError,
  resolveBrandVariantPrice,
} from "../../src/server/pricing";
import * as resolvePrice from "../../src/server/pricing/resolve-price";
import { TAX_CATEGORY_RESTAURANT_SERVICE_ID } from "../../src/shared/pricing";
import type { WebConfig } from "../../src/platform/config";
import {
  createEligibleWorkforceUser,
  principalFor,
  seedBrandTree,
} from "../database/support/access-control-fixtures";
import { applyMigrations, withIsolatedTestDatabase } from "../database/support/test-database";
import { createActiveStandardVariant } from "../assortment-availability/support";
import { seedActiveVariantWithModifier } from "../database/support/cart-fixtures";

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
      CUSTOMER_AUTH_SECRET: "price-admin-http-customer-auth-secret32",
      CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
      WORKFORCE_AUTH_SECRET: "price-admin-http-workforce-auth-secret",
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

const AT = new Date("2026-09-11T12:00:00.000Z");
const EFFECTIVE_FROM = new Date("2026-09-01T00:00:00+05:30").toISOString();

describe("classifyAdminPricingRoute", () => {
  it("classifies Brand-scoped Pricing commercial routes", () => {
    const brandId = "11111111-1111-4111-8111-111111111111";
    const priceBookId = "22222222-2222-4222-8222-222222222222";
    const base = `/api/admin/v1/brands/${brandId}/pricing`;

    expect(classifyAdminPricingRoute(`${base}/price-books`)).toEqual({
      kind: "list_price_books",
      brandId,
    });
    expect(classifyAdminPricingRoute(`${base}/price-books/${priceBookId}`)).toEqual({
      kind: "get_price_book",
      brandId,
      priceBookId,
    });
    expect(classifyAdminPricingRoute(`${base}/price-books/${priceBookId}/variant-prices`)).toEqual({
      kind: "attach_variant_price",
      brandId,
      priceBookId,
    });
    expect(classifyAdminPricingRoute(`${base}/price-books/${priceBookId}/modifier-prices`)).toEqual({
      kind: "attach_modifier_price",
      brandId,
      priceBookId,
    });
    expect(
      classifyAdminPricingRoute(`${base}/price-books/${priceBookId}/consequence-preview`),
    ).toEqual({
      kind: "consequence_preview",
      brandId,
      priceBookId,
    });
    expect(classifyAdminPricingRoute(`${base}/price-books/${priceBookId}/activate`)).toEqual({
      kind: "activate",
      brandId,
      priceBookId,
    });
    expect(classifyAdminPricingRoute(`/api/admin/v1/brands/${brandId}/assortment/rules`)).toBeNull();
  });
});

describe("IMP-036F F4 Pricing commercial Admin HTTP", () => {
  it("covers draft authoring, aggregate CAS, preview, activation, anti-leak, Origin, and customer truth", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "prf4"));
      const otherTree = await persistence.transaction((tx) => seedBrandTree(tx, "qrf4"));
      const brandAdmin = await createEligibleWorkforceUser(persistence);
      const otherBrandAdmin = await createEligibleWorkforceUser(persistence);
      const outletManager = await createEligibleWorkforceUser(persistence);
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

        const outletMembership = await createMembership(tx, {
          workforceUserId: outletManager.id,
          scope: {
            scopeType: "outlet",
            brandId: tree.brand.id,
            organizationId: tree.orgA.id,
            territoryId: tree.terrA.id,
            outletId: tree.outletA.id,
          },
          status: "active",
        });
        await grantRole(tx, { membershipId: outletMembership.id, roleKey: "outlet_manager" });
      });

      const brandId = tree.brand.id;
      const catalog = await seedActiveVariantWithModifier(persistence, brandId, actor, "prmod");
      const otherCatalog = await createActiveStandardVariant(
        persistence,
        otherActor,
        otherTree.brand.id,
        "prfor",
      );

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
            trustedOrigin: workforceAuthConfig().workforce.baseURL.origin,
          },
          "pricing-admin-http-request",
        );
      });
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Missing test server address");
      const base = `http://127.0.0.1:${address.port}`;
      openHandles.push({
        close: () =>
          new Promise<void>((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
          }),
      });

      const headersFor = async (userId: string, extra: HeadersInit = {}) => {
        const session = await adapter.createSession(userId);
        return {
          cookie: await signedCookie(session.token),
          origin: workforceAuthConfig().workforce.baseURL.origin,
          "content-type": "application/json",
          ...extra,
        };
      };

      const brandPath = `/api/admin/v1/brands/${brandId}/pricing`;
      const otherBrandPath = `/api/admin/v1/brands/${otherTree.brand.id}/pricing`;
      const missingBookId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
      const missingVariantId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
      const json = async (res: Response) => res.json() as Promise<Record<string, unknown>>;

      const customerPrice = async (variantId: string) => {
        try {
          return await persistence.withContext((ctx) =>
            resolveBrandVariantPrice(ctx, { brandId, variantId, at: AT }),
          );
        } catch (error) {
          if (error instanceof PricingResolutionError) return error;
          throw error;
        }
      };

      expect(await customerPrice(catalog.variantId)).toMatchObject({
        pricingErrorCode: "PRICE_MISSING",
      });

      {
        const res = await fetch(`${base}${brandPath}/price-books`);
        expect(res.status).toBe(401);
      }

      {
        const res = await fetch(`${base}${brandPath}/price-books`, {
          method: "POST",
          headers: await headersFor(outletManager.id),
          body: JSON.stringify({
            scopeType: "brand",
            code: "denied",
            name: "Denied",
            effectiveFrom: EFFECTIVE_FROM,
          }),
        });
        expect(res.status).toBe(403);
        expect(await json(res)).toMatchObject({ ok: false, code: "PRICING_UNAUTHORIZED" });
      }

      {
        const badOrigin = await fetch(`${base}${brandPath}/price-books`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id, { origin: "http://evil.example" }),
          body: JSON.stringify({
            scopeType: "brand",
            code: "evil",
            name: "Evil",
            effectiveFrom: EFFECTIVE_FROM,
          }),
        });
        expect(badOrigin.status).toBe(403);
        expect(await json(badOrigin)).toMatchObject({ ok: false, code: "PRICING_REQUEST_INVALID" });
      }

      {
        const forged = await fetch(`${base}${brandPath}/price-books`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({
            scopeType: "brand",
            code: "forged",
            name: "Forged",
            effectiveFrom: EFFECTIVE_FROM,
            actor: brandAdmin.id,
            brandId: otherTree.brand.id,
          }),
        });
        expect(forged.status).toBe(400);
        expect(await json(forged)).toMatchObject({ ok: false, code: "PRICING_REQUEST_INVALID" });
      }

      const createRes = await fetch(`${base}${brandPath}/price-books`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          scopeType: "brand",
          code: `brand-${randomUUID().slice(0, 8)}`,
          name: "Brand book",
          taxInclusionMode: "exclusive",
          effectiveFrom: EFFECTIVE_FROM,
          effectiveTo: null,
          currency: "INR",
        }),
      });
      expect(createRes.status).toBe(200);
      const created = ((await json(createRes)).priceBook as Record<string, unknown>);
      const priceBookId = created.id as string;
      expect(created.revision).toBe("1");
      expect(await customerPrice(catalog.variantId)).toMatchObject({
        pricingErrorCode: "PRICE_MISSING",
      });

      const listRes = await fetch(`${base}${brandPath}/price-books`, {
        headers: await headersFor(brandAdmin.id),
      });
      expect(listRes.status).toBe(200);
      expect(
        ((await json(listRes)).priceBooks as Array<Record<string, unknown>>).some(
          (row) => row.id === priceBookId,
        ),
      ).toBe(true);

      const bookPath = `${base}${brandPath}/price-books/${priceBookId}`;

      const attachVariant = await fetch(`${bookPath}/variant-prices`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          variantId: catalog.variantId,
          amountPaise: "17900",
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: "1",
        }),
      });
      expect(attachVariant.status).toBe(200);
      expect((await json(attachVariant)).priceBookRevision).toBe("2");
      expect(await customerPrice(catalog.variantId)).toMatchObject({
        pricingErrorCode: "PRICE_MISSING",
      });

      const attachModifier = await fetch(`${bookPath}/modifier-prices`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          variantModifierGroupId: catalog.variantModifierGroupId,
          modifierGroupOptionId: catalog.modifierGroupOptionId,
          priceDeltaPaise: "1500",
          expectedPriceBookRevision: "2",
        }),
      });
      expect(attachModifier.status).toBe(200);
      expect((await json(attachModifier)).priceBookRevision).toBe("3");

      const staleAttach = await fetch(`${bookPath}/variant-prices`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          variantId: catalog.variantId,
          amountPaise: "19900",
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: "1",
        }),
      });
      expect(staleAttach.status).toBe(409);
      expect(await json(staleAttach)).toMatchObject({
        ok: false,
        code: "PRICE_BOOK_STALE_REVISION",
      });

      for (const payload of [
        { amountPaise: -1 },
        { amountPaise: 12.5 },
        { amountPaise: "12.5" },
        { amountPaise: "NaN" },
        { amountPaise: Number.MAX_SAFE_INTEGER + 1 },
        { currency: "USD", amountPaise: "100" },
        { taxCategoryId: missingBookId, amountPaise: "100" },
      ]) {
        const invalid = await fetch(`${bookPath}/variant-prices`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({
            variantId: catalog.variantId,
            taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
            expectedPriceBookRevision: "3",
            ...payload,
          }),
        });
        expect(invalid.status).toBe(400);
        expect(await json(invalid)).toMatchObject({ ok: false, code: "PRICING_REQUEST_INVALID" });
      }

      const previewRes = await fetch(`${bookPath}/consequence-preview`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: "{}",
      });
      expect(previewRes.status).toBe(200);
      const preview = (await json(previewRes)).preview as Record<string, unknown>;
      expect(preview.expectedPriceBookRevision).toBe("3");
      expect(preview.wouldChangeCustomerPricing).toBe(true);
      expect(preview.currency).toBe("INR");
      expect(Array.isArray(preview.variantPriceChanges)).toBe(true);
      expect(Array.isArray(preview.modifierPriceChanges)).toBe(true);

      {
        const previewDenied = await fetch(`${bookPath}/consequence-preview`, {
          method: "POST",
          headers: await headersFor(outletManager.id),
          body: "{}",
        });
        expect(previewDenied.status).toBe(403);
      }

      const activateRes = await fetch(`${bookPath}/activate`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({ expectedPriceBookRevision: preview.expectedPriceBookRevision }),
      });
      expect(activateRes.status).toBe(200);
      expect((await json(activateRes)).revision).toBe("4");

      const live = await customerPrice(catalog.variantId);
      expect(live).toMatchObject({ amountPaise: BigInt(17_900) });

      const detailRes = await fetch(`${bookPath}`, {
        headers: await headersFor(brandAdmin.id),
      });
      expect(detailRes.status).toBe(200);
      const inspection = (await json(detailRes)).inspection as Record<string, unknown>;
      const priceBook = inspection.priceBook as Record<string, unknown>;
      expect(priceBook.lifecycleStatus).toBe("active");
      expect(priceBook.revision).toBe("4");
      expect((inspection.variantPrices as unknown[]).length).toBe(1);
      expect((inspection.modifierPrices as unknown[]).length).toBe(1);

      const audits = await persistence.withContext(async (ctx) =>
        ctx.db
          .select()
          .from(pricingTaxAuditEventsTable)
          .where(
            and(
              eq(pricingTaxAuditEventsTable.brandId, brandId),
              eq(pricingTaxAuditEventsTable.actorWorkforceUserId, brandAdmin.id),
            ),
          ),
      );
      expect(audits.some((row) => row.action === "price_book.created")).toBe(true);
      expect(audits.some((row) => row.action === "price_book.variant_price_attached")).toBe(true);
      expect(audits.some((row) => row.action === "price_book.modifier_price_attached")).toBe(true);
      expect(audits.some((row) => row.action === "price_book.activated")).toBe(true);

      const nextCreate = await fetch(`${base}${brandPath}/price-books`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          scopeType: "brand",
          code: `brand-${randomUUID().slice(0, 8)}`,
          name: "Overlapping book",
          effectiveFrom: EFFECTIVE_FROM,
        }),
      });
      const nextBook = ((await json(nextCreate)).priceBook as Record<string, unknown>);
      const nextPath = `${base}${brandPath}/price-books/${nextBook.id as string}`;
      const overlapAttach = await fetch(`${nextPath}/variant-prices`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          variantId: catalog.variantId,
          amountPaise: "19900",
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: nextBook.revision,
        }),
      });
      expect(overlapAttach.status).toBe(200);
      const overlapActivate = await fetch(`${nextPath}/activate`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({ expectedPriceBookRevision: "2" }),
      });
      expect(overlapActivate.status).toBe(409);
      expect(await json(overlapActivate)).toMatchObject({ ok: false, code: "PRICE_BOOK_OVERLAP" });
      expect(await customerPrice(catalog.variantId)).toMatchObject({ amountPaise: BigInt(17_900) });

      const staleBookCreate = await fetch(`${base}${brandPath}/price-books`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          scopeType: "brand",
          code: `brand-${randomUUID().slice(0, 8)}`,
          name: "Stale activate candidate",
          effectiveFrom: new Date("2027-01-01T00:00:00+05:30").toISOString(),
        }),
      });
      const staleBook = ((await json(staleBookCreate)).priceBook as Record<string, unknown>);
      const stalePath = `${base}${brandPath}/price-books/${staleBook.id as string}`;
      const previewStale = await fetch(`${stalePath}/consequence-preview`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: "{}",
      });
      const staleExpected = ((await json(previewStale)).preview as Record<string, unknown>)
        .expectedPriceBookRevision;
      await fetch(`${stalePath}/variant-prices`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          variantId: catalog.variantId,
          amountPaise: "21000",
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: staleExpected,
        }),
      });
      const staleActivate = await fetch(`${stalePath}/activate`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({ expectedPriceBookRevision: staleExpected }),
      });
      expect(staleActivate.status).toBe(409);
      expect(await json(staleActivate)).toMatchObject({
        ok: false,
        code: "PRICE_BOOK_STALE_REVISION",
      });
      expect(await customerPrice(catalog.variantId)).toMatchObject({ amountPaise: BigInt(17_900) });

      const missingBook = await fetch(`${base}${brandPath}/price-books/${missingBookId}`, {
        headers: await headersFor(brandAdmin.id),
      });
      const foreignCreate = await fetch(`${base}${otherBrandPath}/price-books`, {
        method: "POST",
        headers: await headersFor(otherBrandAdmin.id),
        body: JSON.stringify({
          scopeType: "brand",
          code: `brand-${randomUUID().slice(0, 8)}`,
          name: "Foreign",
          effectiveFrom: EFFECTIVE_FROM,
        }),
      });
      const foreignBook = ((await json(foreignCreate)).priceBook as Record<string, unknown>);
      const foreignBookGet = await fetch(`${base}${brandPath}/price-books/${foreignBook.id as string}`, {
        headers: await headersFor(brandAdmin.id),
      });
      expect(missingBook.status).toBe(404);
      expect(foreignBookGet.status).toBe(404);
      expect((await json(missingBook)).code).toBe((await json(foreignBookGet)).code);

      const missingVariant = await fetch(`${bookPath}/variant-prices`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          variantId: missingVariantId,
          amountPaise: "100",
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: "4",
        }),
      });
      const foreignVariant = await fetch(`${bookPath}/variant-prices`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          variantId: otherCatalog.variantId,
          amountPaise: "100",
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: "4",
        }),
      });
      expect(missingVariant.status).toBe(409);
      expect(foreignVariant.status).toBe(409);
      // Active book cannot attach; use a fresh draft for foreign-vs-missing variant.
      const draftForRefs = await fetch(`${base}${brandPath}/price-books`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          scopeType: "brand",
          code: `brand-${randomUUID().slice(0, 8)}`,
          name: "Ref draft",
          effectiveFrom: new Date("2028-01-01T00:00:00+05:30").toISOString(),
        }),
      });
      const refBook = ((await json(draftForRefs)).priceBook as Record<string, unknown>);
      const refPath = `${base}${brandPath}/price-books/${refBook.id as string}`;
      const missingVar = await fetch(`${refPath}/variant-prices`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          variantId: missingVariantId,
          amountPaise: "100",
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: refBook.revision,
        }),
      });
      const foreignVar = await fetch(`${refPath}/variant-prices`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          variantId: otherCatalog.variantId,
          amountPaise: "100",
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: refBook.revision,
        }),
      });
      expect(missingVar.status).toBe(404);
      expect(foreignVar.status).toBe(404);
      expect((await json(missingVar)).code).toBe((await json(foreignVar)).code);

      const otherModifier = await seedActiveVariantWithModifier(
        persistence,
        otherTree.brand.id,
        otherActor,
        "xfpm",
      );
      const missingMod = await fetch(`${refPath}/modifier-prices`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          variantModifierGroupId: missingVariantId,
          modifierGroupOptionId: missingBookId,
          priceDeltaPaise: "100",
          expectedPriceBookRevision: refBook.revision,
        }),
      });
      const foreignMod = await fetch(`${refPath}/modifier-prices`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          variantModifierGroupId: otherModifier.variantModifierGroupId,
          modifierGroupOptionId: otherModifier.modifierGroupOptionId,
          priceDeltaPaise: "100",
          expectedPriceBookRevision: refBook.revision,
        }),
      });
      expect(missingMod.status).toBe(404);
      expect(foreignMod.status).toBe(404);
      expect((await json(missingMod)).code).toBe((await json(foreignMod)).code);

      {
        const otherPath = await fetch(`${base}${otherBrandPath}/price-books`, {
          headers: await headersFor(brandAdmin.id),
        });
        expect(otherPath.status).toBe(403);
      }

      {
        const spy = vi.spyOn(resolvePrice, "resolveBrandVariantPrice").mockRejectedValueOnce(
          new Error('relation "price_books" does not exist — raw db detail'),
        );
        try {
          const boom = await fetch(`${bookPath}/consequence-preview`, {
            method: "POST",
            headers: await headersFor(brandAdmin.id),
            body: "{}",
          });
          expect(boom.status).toBe(500);
          const boomBody = await json(boom);
          expect(boomBody).toMatchObject({ ok: false, code: "INTERNAL_ERROR" });
          expect(JSON.stringify(boomBody)).not.toMatch(/does not exist/);
          expect(JSON.stringify(boomBody)).not.toMatch(/price_books/);
        } finally {
          spy.mockRestore();
        }
      }
    });
  });
});
