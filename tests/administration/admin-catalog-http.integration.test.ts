/** IMP-036F F2 — Catalog commercial authoring Admin HTTP. */
import { createServer } from "node:http";

import { serializeSignedCookie } from "better-call";
import { and, eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { inject } from "vitest";

import { createMembership, grantRole } from "../../src/server/access-control";
import {
  getWorkforceAuthRuntime,
  WORKFORCE_AUTH_SESSION_COOKIE_NAME,
} from "../../src/server/auth/workforce";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import { loadEffectiveProductContent } from "../../src/server/catalog/revisions";
import { findProductById } from "../../src/server/catalog";
import { catalogMutationAuditEventsTable } from "../../src/platform/database/schema/catalog";
import { routeOperationsRequest } from "../../src/server/operations/http/router";
import { getApplicationPersistence } from "../../src/server/persistence";
import type { WebConfig } from "../../src/platform/config";
import {
  createEligibleWorkforceUser,
  seedBrandTree,
} from "../database/support/access-control-fixtures";
import { applyMigrations, withIsolatedTestDatabase } from "../database/support/test-database";

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
      CUSTOMER_AUTH_SECRET: "catalog-admin-http-customer-auth-secret32",
      CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
      WORKFORCE_AUTH_SECRET: "catalog-admin-http-workforce-auth-secr",
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
  return (await auth.$context as { internalAdapter: InternalAdapter }).internalAdapter;
}

const openHandles: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(openHandles.splice(0).map((h) => h.close()));
});

describe("IMP-036F F2 Catalog commercial Admin HTTP", () => {
  it("covers inspection, draft authoring, associations, lifecycle, preview/publish, auth, and customer truth", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "caf2"));
      const otherTree = await persistence.transaction((tx) => seedBrandTree(tx, "cbf2"));
      const brandAdmin = await createEligibleWorkforceUser(persistence);
      const otherBrandAdmin = await createEligibleWorkforceUser(persistence);
      const outletManager = await createEligibleWorkforceUser(persistence);

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
          "catalog-admin-http-request",
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

      const brandPath = `/api/admin/v1/brands/${tree.brand.id}/catalog`;
      const otherBrandPath = `/api/admin/v1/brands/${otherTree.brand.id}/catalog`;

      // --- unauthenticated ---
      {
        const res = await fetch(`${base}${brandPath}/products`);
        expect(res.status).toBe(401);
        expect(await res.json()).toMatchObject({ ok: false, code: "WORKFORCE_AUTH_REQUIRED" });
      }

      // --- unauthorized inspection (outlet manager lacks catalog.read) ---
      {
        const res = await fetch(`${base}${brandPath}/products`, {
          headers: await headersFor(outletManager.id),
        });
        expect(res.status).toBe(403);
        expect(await res.json()).toMatchObject({ ok: false, code: "CATALOG_UNAUTHORIZED" });
      }

      // --- cross-brand inspection denied ---
      {
        const res = await fetch(`${base}${otherBrandPath}/products`, {
          headers: await headersFor(brandAdmin.id),
        });
        expect(res.status).toBe(403);
        expect(await res.json()).toMatchObject({ ok: false, code: "CATALOG_UNAUTHORIZED" });
      }

      // --- authorized empty inspection ---
      {
        const res = await fetch(`${base}${brandPath}/products`, {
          headers: await headersFor(brandAdmin.id),
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.products).toEqual([]);
      }

      // --- CSRF/origin on mutation ---
      {
        const res = await fetch(`${base}${brandPath}/products`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id, { origin: "http://evil.example" }),
          body: JSON.stringify({
            code: "P1",
            name: "Evil",
            productKind: "standard",
          }),
        });
        expect(res.status).toBe(403);
        expect(await res.json()).toMatchObject({ ok: false, code: "CATALOG_REQUEST_INVALID" });
      }

      // --- forged brandId in body rejected ---
      {
        const res = await fetch(`${base}${brandPath}/products`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({
            code: "P_FORGE",
            name: "Forge",
            productKind: "standard",
            brandId: otherTree.brand.id,
          }),
        });
        expect(res.status).toBe(400);
        expect(await res.json()).toMatchObject({ ok: false, code: "CATALOG_REQUEST_INVALID" });
      }

      // --- unauthorized mutation ---
      {
        const res = await fetch(`${base}${brandPath}/products`, {
          method: "POST",
          headers: await headersFor(outletManager.id),
          body: JSON.stringify({
            code: "P_UNAUTH",
            name: "Nope",
            productKind: "standard",
          }),
        });
        expect(res.status).toBe(403);
        expect(await res.json()).toMatchObject({ ok: false, code: "CATALOG_UNAUTHORIZED" });
      }

      // --- create Product ---
      let productId = "";
      {
        const res = await fetch(`${base}${brandPath}/products`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({
            code: "MILK_TEA",
            name: "Milk Tea A",
            productKind: "standard",
          }),
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.product.code).toBe("milk_tea");
        expect(body.product.lifecycleStatus).toBe("draft");
        expect(body.product.name).toBe("Milk Tea A");
        productId = body.product.id;
      }

      // --- uniqueness conflict ---
      {
        const res = await fetch(`${base}${brandPath}/products`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({
            code: "milk_tea",
            name: "Dup",
            productKind: "standard",
          }),
        });
        expect(res.status).toBe(409);
        expect(await res.json()).toMatchObject({ ok: false, code: "CATALOG_CONFLICT" });
      }

      // --- create Variant ---
      let variantId = "";
      {
        const res = await fetch(`${base}${brandPath}/products/${productId}/variants`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({
            code: "REG",
            name: "Regular",
            isDefault: true,
          }),
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.variant.productId).toBe(productId);
        variantId = body.variant.id;
      }

      // --- activate product+variant then publish baseline customer truth ---
      {
        const actV = await fetch(`${base}${brandPath}/variants/${variantId}/activate`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: "{}",
        });
        expect(actV.status).toBe(200);
        const actP = await fetch(`${base}${brandPath}/products/${productId}/activate`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: "{}",
        });
        expect(actP.status).toBe(200);
      }

      let expectedContentRevision = "";
      {
        const preview = await fetch(
          `${base}${brandPath}/products/${productId}/consequence-preview`,
          {
            method: "POST",
            headers: await headersFor(brandAdmin.id),
            body: "{}",
          },
        );
        expect(preview.status).toBe(200);
        const body = await preview.json();
        expect(body.ok).toBe(true);
        expect(body.preview.expectedContentRevision).toMatch(/^\d+$/);
        expect(body.preview.wouldChangeCustomerTruth).toBe(true);
        expectedContentRevision = body.preview.expectedContentRevision;
      }

      {
        const pub = await fetch(`${base}${brandPath}/products/${productId}/publish`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({ expectedContentRevision }),
        });
        expect(pub.status).toBe(200);
        const body = await pub.json();
        expect(body.ok).toBe(true);
        expect(body.publication.changed).toBe(true);
      }

      // customer truth = A
      await persistence.withContext(async (ctx) => {
        const product = await findProductById(ctx, productId);
        expect(product?.name).toBe("Milk Tea A");
        const effective = await loadEffectiveProductContent(ctx, product!);
        expect(effective?.name).toBe("Milk Tea A");
      });

      // --- inspection exposes graph + draft/revision context ---
      {
        const res = await fetch(`${base}${brandPath}/products/${productId}/graph`, {
          headers: await headersFor(brandAdmin.id),
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.graph.product.name).toBe("Milk Tea A");
        expect(body.graph.product.effectiveContentRevision).toBeTruthy();
        expect(body.graph.variants).toHaveLength(1);
      }

      // --- Product draft edit (entity draft CAS) ---
      let productDraftRevision = "";
      {
        const res = await fetch(`${base}${brandPath}/products/${productId}`, {
          headers: await headersFor(brandAdmin.id),
        });
        const body = await res.json();
        productDraftRevision = body.product.draftContentRevision;
      }
      {
        const res = await fetch(`${base}${brandPath}/products/${productId}/content-draft`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({
            expectedContentRevision: productDraftRevision,
            name: "Milk Tea B",
          }),
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.draft.name).toBe("Milk Tea B");
      }

      // admin draft shows B; customer effective still A
      await persistence.withContext(async (ctx) => {
        const product = await findProductById(ctx, productId);
        expect(product?.name).toBe("Milk Tea B");
        const effective = await loadEffectiveProductContent(ctx, product!);
        expect(effective?.name).toBe("Milk Tea A");
      });

      // --- Variant draft edit ---
      let variantDraftRevision = "";
      {
        const graph = await fetch(`${base}${brandPath}/products/${productId}/graph`, {
          headers: await headersFor(brandAdmin.id),
        });
        const body = await graph.json();
        variantDraftRevision = body.graph.variants[0].draftContentRevision;
      }
      {
        const res = await fetch(`${base}${brandPath}/variants/${variantId}/content-draft`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({
            expectedContentRevision: variantDraftRevision,
            name: "Regular Plus",
          }),
        });
        expect(res.status).toBe(200);
        expect((await res.json()).draft.name).toBe("Regular Plus");
      }

      // --- modifier association staging ---
      let modifierGroupId = "";
      let modifierOptionId = "";
      let groupOptionId = "";
      let vmgId = "";
      {
        const g = await fetch(`${base}${brandPath}/modifier-groups`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({ code: "TOP", name: "Toppings" }),
        });
        expect(g.status).toBe(200);
        modifierGroupId = (await g.json()).modifierGroup.id;

        const o = await fetch(`${base}${brandPath}/modifier-options`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({ code: "PEARL", name: "Pearl" }),
        });
        expect(o.status).toBe(200);
        modifierOptionId = (await o.json()).modifierOption.id;

        const bind = await fetch(
          `${base}${brandPath}/modifier-groups/${modifierGroupId}/options`,
          {
            method: "POST",
            headers: await headersFor(brandAdmin.id),
            body: JSON.stringify({
              modifierOptionId,
              maxQuantity: 2,
              minQuantity: 0,
              defaultQuantity: 0,
              position: 0,
            }),
          },
        );
        expect(bind.status).toBe(200);
        groupOptionId = (await bind.json()).modifierGroupOption.id;

        const apply = await fetch(
          `${base}${brandPath}/variants/${variantId}/modifier-groups`,
          {
            method: "POST",
            headers: await headersFor(brandAdmin.id),
            body: JSON.stringify({
              modifierGroupId,
              maxTotalQuantity: 2,
              minTotalQuantity: 0,
              position: 0,
            }),
          },
        );
        expect(apply.status).toBe(200);
        vmgId = (await apply.json()).variantModifierGroup.id;
      }

      // invalid missing modifier prerequisite
      {
        const res = await fetch(
          `${base}${brandPath}/modifier-groups/${modifierGroupId}/options`,
          {
            method: "POST",
            headers: await headersFor(brandAdmin.id),
            body: JSON.stringify({
              modifierOptionId: "00000000-0000-4000-8000-000000000099",
              maxQuantity: 1,
            }),
          },
        );
        expect(res.status).toBe(404);
        expect(await res.json()).toMatchObject({ ok: false, code: "CATALOG_NOT_FOUND" });
      }

      // activate modifier structures (staged; customer unchanged until publish)
      for (const path of [
        `${brandPath}/modifier-groups/${modifierGroupId}/activate`,
        `${brandPath}/modifier-options/${modifierOptionId}/activate`,
        `${brandPath}/modifier-group-options/${groupOptionId}/activate`,
        `${brandPath}/variant-modifier-groups/${vmgId}/activate`,
      ]) {
        const res = await fetch(`${base}${path}`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: "{}",
        });
        expect(res.status).toBe(200);
      }

      // staged association visible in admin graph
      {
        const res = await fetch(`${base}${brandPath}/products/${productId}/graph`, {
          headers: await headersFor(brandAdmin.id),
        });
        const body = await res.json();
        expect(body.graph.modifierGroups).toHaveLength(1);
        expect(body.graph.variantModifierGroups).toHaveLength(1);
      }

      // customer product truth still A before publish of content+associations
      await persistence.withContext(async (ctx) => {
        const product = await findProductById(ctx, productId);
        const effective = await loadEffectiveProductContent(ctx, product!);
        expect(effective?.name).toBe("Milk Tea A");
      });

      // --- lifecycle: illegal transition ---
      {
        const res = await fetch(`${base}${brandPath}/products/${productId}/activate`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: "{}",
        });
        expect(res.status).toBe(409);
        expect(await res.json()).toMatchObject({ ok: false, code: "CATALOG_INVALID_STATE" });
      }

      // --- preview returns authoritative expectedContentRevision ---
      {
        const preview = await fetch(
          `${base}${brandPath}/products/${productId}/consequence-preview`,
          {
            method: "POST",
            headers: await headersFor(brandAdmin.id),
            body: "{}",
          },
        );
        expect(preview.status).toBe(200);
        const body = await preview.json();
        expect(body.preview.expectedContentRevision).toMatch(/^\d+$/);
        expect(body.preview.wouldChangeCustomerTruth).toBe(true);
        expect(body.preview.changes.length).toBeGreaterThan(0);
        expectedContentRevision = body.preview.expectedContentRevision;
      }

      // intervening draft invalidates reviewed revision
      {
        const prod = await fetch(`${base}${brandPath}/products/${productId}`, {
          headers: await headersFor(brandAdmin.id),
        });
        const draftRev = (await prod.json()).product.draftContentRevision;
        const edit = await fetch(`${base}${brandPath}/products/${productId}/content-draft`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({
            expectedContentRevision: draftRev,
            name: "Milk Tea B2",
          }),
        });
        expect(edit.status).toBe(200);
      }

      // stale publish → 409, zero customer effect
      {
        const pub = await fetch(`${base}${brandPath}/products/${productId}/publish`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({ expectedContentRevision }),
        });
        expect(pub.status).toBe(409);
        expect(await pub.json()).toMatchObject({ ok: false, code: "CATALOG_CONFLICT" });
      }
      await persistence.withContext(async (ctx) => {
        const product = await findProductById(ctx, productId);
        const effective = await loadEffectiveProductContent(ctx, product!);
        expect(effective?.name).toBe("Milk Tea A");
      });

      // reload preview + valid publish → customer truth B2
      {
        const preview = await fetch(
          `${base}${brandPath}/products/${productId}/consequence-preview`,
          {
            method: "POST",
            headers: await headersFor(brandAdmin.id),
            body: "{}",
          },
        );
        const body = await preview.json();
        expectedContentRevision = body.preview.expectedContentRevision;
        const beforePublished = await persistence.withContext(async (ctx) => {
          const rows = await ctx.db
            .select()
            .from(catalogMutationAuditEventsTable)
            .where(
              and(
                eq(catalogMutationAuditEventsTable.brandId, tree.brand.id),
                eq(catalogMutationAuditEventsTable.action, "catalog.content_published"),
              ),
            );
          return rows.length;
        });

        const pub = await fetch(`${base}${brandPath}/products/${productId}/publish`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({ expectedContentRevision }),
        });
        expect(pub.status).toBe(200);
        const pubBody = await pub.json();
        expect(pubBody.publication.changed).toBe(true);

        await persistence.withContext(async (ctx) => {
          const product = await findProductById(ctx, productId);
          const effective = await loadEffectiveProductContent(ctx, product!);
          expect(effective?.name).toBe("Milk Tea B2");

          const audits = await ctx.db
            .select()
            .from(catalogMutationAuditEventsTable)
            .where(
              and(
                eq(catalogMutationAuditEventsTable.brandId, tree.brand.id),
                eq(catalogMutationAuditEventsTable.action, "catalog.content_published"),
              ),
            );
          expect(audits.length).toBe(beforePublished + 1);
          expect(audits.some((a) => a.actorWorkforceUserId === brandAdmin.id)).toBe(true);
        });
      }

      // unchanged / no-op publish
      {
        const preview = await fetch(
          `${base}${brandPath}/products/${productId}/consequence-preview`,
          {
            method: "POST",
            headers: await headersFor(brandAdmin.id),
            body: "{}",
          },
        );
        const rev = (await preview.json()).preview.expectedContentRevision;
        const beforePublished = await persistence.withContext(async (ctx) => {
          const rows = await ctx.db
            .select()
            .from(catalogMutationAuditEventsTable)
            .where(
              and(
                eq(catalogMutationAuditEventsTable.brandId, tree.brand.id),
                eq(catalogMutationAuditEventsTable.action, "catalog.content_published"),
              ),
            );
          return rows.length;
        });
        const pub = await fetch(`${base}${brandPath}/products/${productId}/publish`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({ expectedContentRevision: rev }),
        });
        expect(pub.status).toBe(200);
        const body = await pub.json();
        expect(body.publication.changed).toBe(false);
        await persistence.withContext(async (ctx) => {
          const rows = await ctx.db
            .select()
            .from(catalogMutationAuditEventsTable)
            .where(
              and(
                eq(catalogMutationAuditEventsTable.brandId, tree.brand.id),
                eq(catalogMutationAuditEventsTable.action, "catalog.content_published"),
              ),
            );
          expect(rows.length).toBe(beforePublished);
        });
      }

      // stage retirement of product — customer unchanged until publish
      {
        const retire = await fetch(`${base}${brandPath}/products/${productId}/retire`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: "{}",
        });
        expect(retire.status).toBe(200);
        await persistence.withContext(async (ctx) => {
          const product = await findProductById(ctx, productId);
          expect(product?.lifecycleStatus).toBe("retired");
          const effective = await loadEffectiveProductContent(ctx, product!);
          expect(effective?.name).toBe("Milk Tea B2");
        });

        const preview = await fetch(
          `${base}${brandPath}/products/${productId}/consequence-preview`,
          {
            method: "POST",
            headers: await headersFor(brandAdmin.id),
            body: "{}",
          },
        );
        const rev = (await preview.json()).preview.expectedContentRevision;
        const pub = await fetch(`${base}${brandPath}/products/${productId}/publish`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({ expectedContentRevision: rev }),
        });
        expect(pub.status).toBe(200);
        expect((await pub.json()).publication.changed).toBe(true);
        await persistence.withContext(async (ctx) => {
          const product = await findProductById(ctx, productId);
          const effective = await loadEffectiveProductContent(ctx, product!);
          expect(effective).toBeNull();
        });
      }

      // cross-brand mutation denied (other brand admin cannot mutate our brand)
      {
        const res = await fetch(`${base}${brandPath}/products`, {
          method: "POST",
          headers: await headersFor(otherBrandAdmin.id),
          body: JSON.stringify({
            code: "X",
            name: "X",
            productKind: "standard",
          }),
        });
        expect(res.status).toBe(403);
        expect(await res.json()).toMatchObject({ ok: false, code: "CATALOG_UNAUTHORIZED" });
      }
    });
  });
});
