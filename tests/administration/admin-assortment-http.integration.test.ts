/** IMP-036F F4 — Assortment commercial authoring Admin HTTP. */
import { createServer } from "node:http";

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
import {
  assortmentAvailabilityAuditEventsTable,
  assortmentRulesTable,
} from "../../src/platform/database/schema/assortment";
import * as assortmentReads from "../../src/server/assortment/assortment-reads";
import {
  configureOutletOperatingProfile,
  replaceOutletOperatingSchedule,
  resolveOutletVariantAvailability,
  setVariantAvailability,
} from "../../src/server/assortment";
import { classifyAdminAssortmentRoute } from "../../src/server/operations/http/admin-assortment-routes";
import { routeOperationsRequest } from "../../src/server/operations/http/router";
import { getApplicationPersistence } from "../../src/server/persistence";
import type { WebConfig } from "../../src/platform/config";
import {
  createEligibleWorkforceUser,
  principalFor,
  seedBrandTree,
} from "../database/support/access-control-fixtures";
import { applyMigrations, withIsolatedTestDatabase } from "../database/support/test-database";
import {
  createActiveStandardVariant,
  nowInsideAcceptingWindow,
} from "../assortment-availability/support";
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
      CUSTOMER_AUTH_SECRET: "asst-admin-http-customer-auth-secret32x",
      CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
      WORKFORCE_AUTH_SECRET: "asst-admin-http-workforce-auth-secret",
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

describe("classifyAdminAssortmentRoute", () => {
  it("classifies Brand-scoped Assortment commercial routes", () => {
    const brandId = "11111111-1111-4111-8111-111111111111";
    const variantId = "22222222-2222-4222-8222-222222222222";
    const ruleId = "33333333-3333-4333-8333-333333333333";
    const base = `/api/admin/v1/brands/${brandId}/assortment`;

    expect(classifyAdminAssortmentRoute(`${base}/rules`)).toEqual({
      kind: "list_rules",
      brandId,
    });
    expect(classifyAdminAssortmentRoute(`${base}/variants/${variantId}`)).toEqual({
      kind: "inspect_variant",
      brandId,
      variantId,
    });
    expect(classifyAdminAssortmentRoute(`${base}/consequence-preview`)).toEqual({
      kind: "consequence_preview",
      brandId,
    });
    expect(classifyAdminAssortmentRoute(`${base}/include-variant`)).toEqual({
      kind: "include_variant",
      brandId,
    });
    expect(classifyAdminAssortmentRoute(`${base}/exclude`)).toEqual({
      kind: "exclude",
      brandId,
    });
    expect(classifyAdminAssortmentRoute(`${base}/rules/${ruleId}/retire`)).toEqual({
      kind: "retire_rule",
      brandId,
      ruleId,
    });
    expect(classifyAdminAssortmentRoute(`/api/admin/v1/brands/${brandId}/pricing/price-books`)).toBeNull();
    expect(
      classifyAdminAssortmentRoute(`/api/operations/v1/outlets/${brandId}/assortment`),
    ).toBeNull();
  });
});

describe("IMP-036F F4 Assortment commercial Admin HTTP", () => {
  it("covers inspect, include/exclude/retire, CAS, preview, anti-leak, Origin, and customer truth", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "asf4"));
      const otherTree = await persistence.transaction((tx) => seedBrandTree(tx, "bsf4"));
      const brandAdmin = await createEligibleWorkforceUser(persistence);
      const otherBrandAdmin = await createEligibleWorkforceUser(persistence);
      const outletManager = await createEligibleWorkforceUser(persistence);
      const actor = principalFor(brandAdmin.id);
      const otherActor = principalFor(otherBrandAdmin.id);
      const outletActor = principalFor(outletManager.id);

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
      const catalog = await createActiveStandardVariant(persistence, actor, brandId, "asinc");
      const foreignCatalog = await createActiveStandardVariant(
        persistence,
        otherActor,
        otherTree.brand.id,
        "asfor",
      );
      const modifierCatalog = await seedActiveVariantWithModifier(
        persistence,
        brandId,
        actor,
        "asmod",
      );
      await alwaysAccepting(persistence, actor, tree.outletA.id);
      await alwaysAccepting(persistence, actor, tree.outletB.id);

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
            stepUpSessionHashSecret: workforceAuthConfig().workforce.secret,
          },
          "assortment-admin-http-request",
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

      const brandPath = `/api/admin/v1/brands/${brandId}/assortment`;
      const otherBrandPath = `/api/admin/v1/brands/${otherTree.brand.id}/assortment`;
      const missingVariantId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
      const missingProductId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
      const missingOptionId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
      const missingOutletId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
      const json = async (res: Response) => res.json() as Promise<Record<string, unknown>>;
      const now = nowInsideAcceptingWindow();

      const resolveAt = (variantId: string, outletId: string) =>
        persistence.withContext((ctx) =>
          resolveOutletVariantAvailability(ctx, {
            variantId,
            outletId,
            context: { now },
          }),
        );

      expect(await resolveAt(catalog.variantId, tree.outletA.id)).toMatchObject({
        code: "ASSORTMENT_NOT_INCLUDED",
      });

      {
        const res = await fetch(`${base}${brandPath}/rules`);
        expect(res.status).toBe(401);
        expect(await json(res)).toMatchObject({ ok: false, code: "WORKFORCE_AUTH_REQUIRED" });
      }

      {
        const res = await fetch(`${base}${brandPath}/include-variant`, {
          method: "POST",
          headers: await headersFor(outletManager.id),
          body: JSON.stringify({ variantId: catalog.variantId, expectedRuleRevision: null }),
        });
        expect(res.status).toBe(403);
        expect(await json(res)).toMatchObject({ ok: false, code: "ASSORTMENT_UNAUTHORIZED" });
      }

      {
        const badOrigin = await fetch(`${base}${brandPath}/include-variant`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id, { origin: "http://evil.example" }),
          body: JSON.stringify({ variantId: catalog.variantId, expectedRuleRevision: null }),
        });
        expect(badOrigin.status).toBe(403);
        expect(await json(badOrigin)).toMatchObject({
          ok: false,
          code: "ASSORTMENT_REQUEST_INVALID",
        });
      }

      {
        const forged = await fetch(`${base}${brandPath}/include-variant`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({
            variantId: catalog.variantId,
            expectedRuleRevision: null,
            actor: brandAdmin.id,
            brandId: otherTree.brand.id,
          }),
        });
        expect(forged.status).toBe(400);
        expect(await json(forged)).toMatchObject({ ok: false, code: "ASSORTMENT_REQUEST_INVALID" });
      }

      const previewBefore = await fetch(`${base}${brandPath}/consequence-preview`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({ mutationType: "include_variant", variantId: catalog.variantId }),
      });
      expect(previewBefore.status).toBe(200);
      const previewBeforeBody = await json(previewBefore);
      const preview = previewBeforeBody.preview as Record<string, unknown>;
      expect(preview.expectedRuleRevision).toBeNull();
      expect(preview.availabilityRemainsSeparate).toBe(true);
      expect(preview.wouldChangeAssortmentIntent).toBe(true);
      expect(preview.mutationType).toBe("include_variant");

      const ruleCount = async () =>
        persistence.withContext(async (ctx) => {
          const rows = await ctx.db
            .select({ id: assortmentRulesTable.id })
            .from(assortmentRulesTable)
            .where(eq(assortmentRulesTable.brandId, brandId));
          return rows.length;
        });
      const beforePreviewCount = await ruleCount();

      const includeRes = await fetch(`${base}${brandPath}/include-variant`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          variantId: catalog.variantId,
          expectedRuleRevision: preview.expectedRuleRevision,
        }),
      });
      expect(includeRes.status).toBe(200);
      const includeBody = await json(includeRes);
      const includeRule = includeBody.rule as Record<string, unknown>;
      expect(includeRule.decision).toBe("include");
      expect(includeRule.revision).toBe("1");
      expect(includeRule.status).toBe("active");
      expect(await ruleCount()).toBe(beforePreviewCount + 1);

      expect(await resolveAt(catalog.variantId, tree.outletA.id)).toMatchObject({
        eligible: true,
        code: "AVAILABLE",
      });
      expect(await resolveAt(catalog.variantId, tree.outletB.id)).toMatchObject({
        eligible: true,
        code: "AVAILABLE",
      });

      const listRes = await fetch(`${base}${brandPath}/rules`, {
        headers: await headersFor(brandAdmin.id),
      });
      expect(listRes.status).toBe(200);
      const listBody = await json(listRes);
      expect(Array.isArray(listBody.rules)).toBe(true);
      expect((listBody.rules as Array<Record<string, unknown>>).some((r) => r.id === includeRule.id)).toBe(
        true,
      );

      const inspectRes = await fetch(`${base}${brandPath}/variants/${catalog.variantId}`, {
        headers: await headersFor(brandAdmin.id),
      });
      expect(inspectRes.status).toBe(200);
      const inspection = (await json(inspectRes)).inspection as Record<string, unknown>;
      expect(inspection.availabilityIsSeparate).toBe(true);
      expect((inspection.includeRule as Record<string, unknown>).id).toBe(includeRule.id);

      await persistence.transaction((tx) =>
        setVariantAvailability(tx, {
          actor: outletActor,
          outletId: tree.outletA.id,
          variantId: catalog.variantId,
          state: "temporarily_unavailable",
          unavailableUntil: null,
        }),
      );
      const inspectAfterPause = await fetch(`${base}${brandPath}/variants/${catalog.variantId}`, {
        headers: await headersFor(brandAdmin.id),
      });
      const pausedInspection = (await json(inspectAfterPause)).inspection as Record<string, unknown>;
      expect(pausedInspection.availabilityIsSeparate).toBe(true);
      expect((pausedInspection.includeRule as Record<string, unknown>).decision).toBe("include");
      expect(await resolveAt(catalog.variantId, tree.outletA.id)).toMatchObject({
        code: "VARIANT_TEMPORARILY_UNAVAILABLE",
      });

      await persistence.transaction((tx) =>
        setVariantAvailability(tx, {
          actor: outletActor,
          outletId: tree.outletA.id,
          variantId: catalog.variantId,
          state: "available",
          unavailableUntil: null,
        }),
      );

      const staleInclude = await fetch(`${base}${brandPath}/include-variant`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({ variantId: catalog.variantId, expectedRuleRevision: null }),
      });
      expect(staleInclude.status).toBe(409);
      expect(await json(staleInclude)).toMatchObject({ ok: false, code: "ASSORTMENT_STALE_REVISION" });
      expect(await ruleCount()).toBe(beforePreviewCount + 1);

      const excludePreview = await fetch(`${base}${brandPath}/consequence-preview`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          mutationType: "exclude",
          scopeType: "outlet",
          outletId: tree.outletA.id,
          variantId: catalog.variantId,
        }),
      });
      expect(excludePreview.status).toBe(200);
      const excludePreviewBody = (await json(excludePreview)).preview as Record<string, unknown>;
      expect(excludePreviewBody.expectedRuleRevision).toBeNull();
      expect(excludePreviewBody.wouldChangeAssortmentIntent).toBe(true);

      const excludeRes = await fetch(`${base}${brandPath}/exclude`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          scopeType: "outlet",
          outletId: tree.outletA.id,
          variantId: catalog.variantId,
          expectedRuleRevision: excludePreviewBody.expectedRuleRevision,
        }),
      });
      expect(excludeRes.status).toBe(200);
      const excludeRule = (await json(excludeRes)).rule as Record<string, unknown>;
      expect(excludeRule.decision).toBe("exclude");
      expect(excludeRule.scopeType).toBe("outlet");
      expect(await resolveAt(catalog.variantId, tree.outletA.id)).toMatchObject({
        code: "ASSORTMENT_EXCLUDED_OUTLET",
      });
      expect(await resolveAt(catalog.variantId, tree.outletB.id)).toMatchObject({
        eligible: true,
        code: "AVAILABLE",
      });

      const audits = await persistence.withContext(async (ctx) =>
        ctx.db
          .select()
          .from(assortmentAvailabilityAuditEventsTable)
          .where(
            and(
              eq(assortmentAvailabilityAuditEventsTable.brandId, brandId),
              eq(assortmentAvailabilityAuditEventsTable.actorWorkforceUserId, brandAdmin.id),
            ),
          ),
      );
      expect(audits.some((row) => row.action === "assortment.brand_variant_included")).toBe(true);
      expect(audits.some((row) => row.action === "assortment.rule_excluded")).toBe(true);

      const retirePreview = await fetch(`${base}${brandPath}/consequence-preview`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({ mutationType: "retire_rule", ruleId: excludeRule.id }),
      });
      expect(retirePreview.status).toBe(200);
      const retirePreviewBody = (await json(retirePreview)).preview as Record<string, unknown>;
      expect(retirePreviewBody.expectedRuleRevision).toBe("1");

      const staleRetire = await fetch(`${base}${brandPath}/rules/${excludeRule.id}/retire`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({ expectedRuleRevision: "99" }),
      });
      expect(staleRetire.status).toBe(409);
      expect(await json(staleRetire)).toMatchObject({ ok: false, code: "ASSORTMENT_STALE_REVISION" });
      const stillActive = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db
          .select()
          .from(assortmentRulesTable)
          .where(eq(assortmentRulesTable.id, excludeRule.id as string));
        return rows[0];
      });
      expect(stillActive?.status).toBe("active");
      expect(stillActive?.revision).toBe(BigInt(1));

      const retireRes = await fetch(`${base}${brandPath}/rules/${excludeRule.id}/retire`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({ expectedRuleRevision: retirePreviewBody.expectedRuleRevision }),
      });
      expect(retireRes.status).toBe(200);
      expect(((await json(retireRes)).rule as Record<string, unknown>).status).toBe("retired");
      expect(await resolveAt(catalog.variantId, tree.outletA.id)).toMatchObject({
        eligible: true,
        code: "AVAILABLE",
      });

      async function notFoundPair(path: string, body: Record<string, unknown>) {
        const missing = await fetch(`${base}${path}`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify(body),
        });
        return missing;
      }

      const missingInclude = await notFoundPair(`${brandPath}/include-variant`, {
        variantId: missingVariantId,
        expectedRuleRevision: null,
      });
      const foreignInclude = await notFoundPair(`${brandPath}/include-variant`, {
        variantId: foreignCatalog.variantId,
        expectedRuleRevision: null,
      });
      expect(missingInclude.status).toBe(404);
      expect(foreignInclude.status).toBe(404);
      const missingIncludeBody = await json(missingInclude);
      const foreignIncludeBody = await json(foreignInclude);
      expect(missingIncludeBody.code).toBe("ASSORTMENT_NOT_FOUND");
      expect(foreignIncludeBody.code).toBe(missingIncludeBody.code);
      expect(JSON.stringify(missingIncludeBody)).not.toMatch(/does not exist/i);
      expect(JSON.stringify(foreignIncludeBody)).not.toMatch(otherTree.brand.id);

      const missingProduct = await notFoundPair(`${brandPath}/exclude`, {
        scopeType: "brand",
        productId: missingProductId,
        expectedRuleRevision: null,
      });
      const foreignProduct = await notFoundPair(`${brandPath}/exclude`, {
        scopeType: "brand",
        productId: foreignCatalog.productId,
        expectedRuleRevision: null,
      });
      expect(missingProduct.status).toBe(404);
      expect(foreignProduct.status).toBe(404);
      expect((await json(missingProduct)).code).toBe((await json(foreignProduct)).code);

      const otherModifier = await seedActiveVariantWithModifier(
        persistence,
        otherTree.brand.id,
        otherActor,
        "xfmod",
      );
      const missingModifier = await notFoundPair(`${brandPath}/exclude`, {
        scopeType: "brand",
        modifierOptionId: missingOptionId,
        expectedRuleRevision: null,
      });
      const foreignModifierRes = await notFoundPair(`${brandPath}/exclude`, {
        scopeType: "brand",
        modifierOptionId: otherModifier.modifierOptionId,
        expectedRuleRevision: null,
      });
      expect(missingModifier.status).toBe(404);
      expect(foreignModifierRes.status).toBe(404);
      expect((await json(missingModifier)).code).toBe((await json(foreignModifierRes)).code);
      expect(modifierCatalog.modifierOptionId).toBeTruthy();

      const missingScope = await notFoundPair(`${brandPath}/exclude`, {
        scopeType: "outlet",
        outletId: missingOutletId,
        variantId: catalog.variantId,
        expectedRuleRevision: null,
      });
      const foreignScope = await notFoundPair(`${brandPath}/exclude`, {
        scopeType: "outlet",
        outletId: otherTree.outletA.id,
        variantId: catalog.variantId,
        expectedRuleRevision: null,
      });
      expect(missingScope.status).toBe(404);
      expect(foreignScope.status).toBe(404);
      expect((await json(missingScope)).code).toBe((await json(foreignScope)).code);

      {
        const otherPath = await fetch(`${base}${otherBrandPath}/rules`, {
          headers: await headersFor(brandAdmin.id),
        });
        expect(otherPath.status).toBe(403);
      }

      {
        const storePost = await fetch(
          `${base}/api/operations/v1/outlets/${tree.outletA.id}/assortment`,
          {
            method: "POST",
            headers: await headersFor(brandAdmin.id),
            body: "{}",
          },
        );
        expect(storePost.status).toBe(405);
      }

      {
        const spy = vi.spyOn(assortmentReads, "getEffectiveVariantAssortment").mockRejectedValueOnce(
          new Error('relation "assortment_rules" does not exist — raw db detail'),
        );
        try {
          const boom = await fetch(`${base}${brandPath}/consequence-preview`, {
            method: "POST",
            headers: await headersFor(brandAdmin.id),
            body: JSON.stringify({
              mutationType: "include_variant",
              variantId: catalog.variantId,
            }),
          });
          expect(boom.status).toBe(500);
          const boomBody = await json(boom);
          expect(boomBody).toMatchObject({ ok: false, code: "INTERNAL_ERROR" });
          expect(JSON.stringify(boomBody)).not.toMatch(/does not exist/);
          expect(JSON.stringify(boomBody)).not.toMatch(/assortment_rules/);
        } finally {
          spy.mockRestore();
        }
      }

      expect(
        (
          await fetch(`${base}${brandPath}/rules`, {
            headers: await headersFor(brandAdmin.id),
          })
        ).status,
      ).toBe(200);
    });
  });
});
