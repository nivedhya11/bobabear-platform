/** IMP-036F F3B — Menu commercial authoring Admin HTTP. */
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";

import { serializeSignedCookie } from "better-call";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { inject } from "vitest";

import { createMembership, grantRole } from "../../src/server/access-control";
import {
  getWorkforceAuthRuntime,
  WORKFORCE_AUTH_SESSION_COOKIE_NAME,
} from "../../src/server/auth/workforce";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import {
  activateProduct,
  activateVariant,
  createProduct,
  createVariant,
} from "../../src/server/catalog";
import {
  createMenu,
  findMenuById,
  previewMenuPublication,
} from "../../src/server/catalog/menu";
import * as menuValidation from "../../src/server/catalog/menu/validation";
import { projectCustomerMenu } from "../../src/server/customer-commerce/menu/project-customer-menu";
import { routeOperationsRequest } from "../../src/server/operations/http/router";
import { classifyAdminMenuRoute } from "../../src/server/operations/http/admin-menu-routes";
import { getApplicationPersistence } from "../../src/server/persistence";
import { menuMutationAuditEventsTable } from "../../src/platform/database/schema/menu";
import type { WebConfig } from "../../src/platform/config";
import {
  activatePriceBook,
  attachDraftVariantPrice,
  createDraftPriceBook,
} from "../../src/server/pricing";
import { TAX_CATEGORY_RESTAURANT_SERVICE_ID } from "../../src/shared/pricing";
import {
  createEligibleWorkforceUser,
  principalFor,
  seedBrandTree,
} from "../database/support/access-control-fixtures";
import {
  applyMigrations,
  withIsolatedTestDatabase,
  withTestDatabaseClient,
} from "../database/support/test-database";
import { publishProductEnvelope } from "../catalog/support";

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
      CUSTOMER_AUTH_SECRET: "menu-admin-http-customer-auth-secret32xx",
      CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
      WORKFORCE_AUTH_SECRET: "menu-admin-http-workforce-auth-secret",
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

const AT = new Date("2026-09-11T12:00:00.000Z");

describe("classifyAdminMenuRoute", () => {
  it("classifies Brand-scoped Menu commercial routes", () => {
    const brandId = "11111111-1111-4111-8111-111111111111";
    const menuId = "22222222-2222-4222-8222-222222222222";
    const sectionId = "33333333-3333-4333-8333-333333333333";
    const entryId = "44444444-4444-4444-8444-444444444444";
    const base = `/api/admin/v1/brands/${brandId}/menus`;

    expect(classifyAdminMenuRoute(base)).toEqual({ kind: "list_menus", brandId });
    expect(classifyAdminMenuRoute(`${base}/${menuId}`)).toEqual({
      kind: "get_menu",
      brandId,
      menuId,
    });
    expect(classifyAdminMenuRoute(`${base}/${menuId}/sections`)).toEqual({
      kind: "create_section",
      brandId,
      menuId,
    });
    expect(classifyAdminMenuRoute(`${base}/${menuId}/sections/reorder`)).toEqual({
      kind: "reorder_sections",
      brandId,
      menuId,
    });
    expect(classifyAdminMenuRoute(`${base}/${menuId}/sections/${sectionId}/content-draft`)).toEqual({
      kind: "section_content_draft",
      brandId,
      menuId,
      sectionId,
    });
    expect(
      classifyAdminMenuRoute(`${base}/${menuId}/sections/${sectionId}/entries/reorder`),
    ).toEqual({
      kind: "reorder_entries",
      brandId,
      menuId,
      sectionId,
    });
    expect(classifyAdminMenuRoute(`${base}/${menuId}/entries/${entryId}/display-draft`)).toEqual({
      kind: "entry_display_draft",
      brandId,
      menuId,
      entryId,
    });
    expect(classifyAdminMenuRoute(`${base}/${menuId}/consequence-preview`)).toEqual({
      kind: "consequence_preview",
      brandId,
      menuId,
    });
    expect(classifyAdminMenuRoute(`${base}/${menuId}/publish`)).toEqual({
      kind: "publish",
      brandId,
      menuId,
    });
    expect(classifyAdminMenuRoute(`/api/admin/v1/brands/${brandId}/catalog/products`)).toBeNull();
  });
});

describe("IMP-036F F3B Menu commercial Admin HTTP", () => {
  it("covers inspection, authoring, CAS, preview/publish, anti-leak, Origin, and customer truth", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "maf3"));
      const otherTree = await persistence.transaction((tx) => seedBrandTree(tx, "mbf3"));
      const brandAdmin = await createEligibleWorkforceUser(persistence);
      const otherBrandAdmin = await createEligibleWorkforceUser(persistence);
      const outletManager = await createEligibleWorkforceUser(persistence);
      const actor = principalFor(brandAdmin.id);

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
      const otherBrandId = otherTree.brand.id;

      // Seed published priced products for placement + customer projection.
      const products: Array<{ productId: string; variantId: string; code: string }> = [];
      for (const spec of [
        { code: "m-prod-a", name: "Menu Product A" },
        { code: "m-prod-b", name: "Menu Product B" },
        { code: "m-prod-c", name: "Menu Product C" },
      ]) {
        const product = await persistence.transaction((tx) =>
          createProduct(tx, {
            actor,
            brandId,
            code: spec.code,
            name: spec.name,
            productKind: "standard",
          }),
        );
        const variant = await persistence.transaction((tx) =>
          createVariant(tx, {
            actor,
            productId: product.id,
            code: "default",
            name: "Regular",
            isDefault: true,
            isSelectorVisible: false,
          }),
        );
        await persistence.transaction(async (tx) => {
          await activateVariant(tx, { actor, variantId: variant.id });
          await activateProduct(tx, { actor, productId: product.id });
          await publishProductEnvelope(tx, { actor, brandId, productId: product.id });
        });
        products.push({ productId: product.id, variantId: variant.id, code: spec.code });
      }
      await persistence.transaction(async (tx) => {
        const book = await createDraftPriceBook(tx, {
          actor,
          brandId,
          scopeType: "brand",
          code: `pb-${randomUUID().slice(0, 8)}`,
          name: "Brand book",
          effectiveFrom: new Date("2026-09-01T00:00:00+05:30"),
          effectiveTo: null,
        });
        for (const row of products) {
          await attachDraftVariantPrice(tx, {
            actor,
            priceBookId: book.id,
            brandId,
            variantId: row.variantId,
            amountPaise: BigInt(17_900),
            taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          });
        }
        await activatePriceBook(tx, { actor, priceBookId: book.id, brandId });
      });

      // Other-brand menu for anti-leak.
      const otherActor = principalFor(otherBrandAdmin.id);
      const foreignMenu = await persistence.transaction((tx) =>
        createMenu(tx, {
          actor: otherActor,
          brandId: otherBrandId,
          code: "foreign-menu",
          name: "Foreign Menu",
        }),
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
          "menu-admin-http-request",
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

      const brandPath = `/api/admin/v1/brands/${brandId}/menus`;
      const otherBrandPath = `/api/admin/v1/brands/${otherBrandId}/menus`;
      const missingMenuId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
      const missingSectionId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
      const missingEntryId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

      const json = async (res: Response) => res.json() as Promise<Record<string, unknown>>;

      // --- unauthenticated ---
      {
        const res = await fetch(`${base}${brandPath}`);
        expect(res.status).toBe(401);
        expect(await json(res)).toMatchObject({ ok: false, code: "WORKFORCE_AUTH_REQUIRED" });
      }

      // --- unauthorized read (outlet manager lacks menu.read) ---
      {
        const res = await fetch(`${base}${brandPath}`, {
          headers: await headersFor(outletManager.id),
        });
        expect(res.status).toBe(403);
        expect(await json(res)).toMatchObject({ ok: false, code: "MENU_UNAUTHORIZED" });
      }

      // --- Origin protection on mutations ---
      {
        const badOrigin = await fetch(`${base}${brandPath}`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id, { origin: "http://evil.example" }),
          body: JSON.stringify({ code: "x", name: "X" }),
        });
        expect(badOrigin.status).toBe(403);
        expect(await json(badOrigin)).toMatchObject({ ok: false, code: "MENU_REQUEST_INVALID" });
      }

      // --- create menu (does not expose customer truth) ---
      const createRes = await fetch(`${base}${brandPath}`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({ code: "primary-menu", name: "Primary Menu" }),
      });
      expect(createRes.status).toBe(200);
      const createBody = await json(createRes);
      expect(createBody.ok).toBe(true);
      const menu = createBody.menu as Record<string, unknown>;
      const menuId = menu.id as string;
      expect(menu.lifecycleStatus).toBe("draft");
      expect(menu.effectiveMenuVersionId).toBeNull();
      expect(menu.revision).toBe("1");

      await expect(
        persistence.withContext((ctx) => projectCustomerMenu(ctx, { brandId, at: AT })),
      ).rejects.toMatchObject({ code: "MENU_UNAVAILABLE" });

      // --- unauthorized create ---
      {
        const res = await fetch(`${base}${brandPath}`, {
          method: "POST",
          headers: await headersFor(outletManager.id),
          body: JSON.stringify({ code: "denied", name: "Denied" }),
        });
        expect(res.status).toBe(403);
      }

      // --- forged authority fields ---
      {
        const res = await fetch(`${base}${brandPath}`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({
            code: "forged",
            name: "Forged",
            brandId: otherBrandId,
            actor: brandAdmin.id,
            permission: "menu.manage",
          }),
        });
        expect(res.status).toBe(400);
        expect(await json(res)).toMatchObject({ ok: false, code: "MENU_REQUEST_INVALID" });
      }

      // --- list menus ---
      {
        const res = await fetch(`${base}${brandPath}`, {
          headers: await headersFor(brandAdmin.id),
        });
        expect(res.status).toBe(200);
        const body = await json(res);
        expect(body.ok).toBe(true);
        const menus = body.menus as Array<Record<string, unknown>>;
        expect(menus.some((m) => m.id === menuId)).toBe(true);
        expect(menus.find((m) => m.id === menuId)).toMatchObject({
          hasEffectiveVersion: false,
          hasDraftVersion: false,
          revision: "1",
        });
      }

      // --- anti-leak: foreign vs missing menu ---
      {
        const missing = await fetch(`${base}${brandPath}/${missingMenuId}`, {
          headers: await headersFor(brandAdmin.id),
        });
        const foreign = await fetch(`${base}${brandPath}/${foreignMenu.id}`, {
          headers: await headersFor(brandAdmin.id),
        });
        expect(missing.status).toBe(404);
        expect(foreign.status).toBe(404);
        const missingBody = await json(missing);
        const foreignBody = await json(foreign);
        expect(missingBody).toMatchObject({ ok: false, code: "MENU_NOT_FOUND" });
        expect(foreignBody).toMatchObject({ ok: false, code: "MENU_NOT_FOUND" });
        expect(JSON.stringify(foreignBody)).not.toMatch(/foreign-menu/i);
        expect(JSON.stringify(foreignBody)).not.toContain(otherBrandId);
      }

      // --- GET inspection unaffected by Origin ---
      {
        const res = await fetch(`${base}${brandPath}/${menuId}`, {
          headers: await headersFor(brandAdmin.id, { origin: "http://evil.example" }),
        });
        expect(res.status).toBe(200);
      }

      let revision = "1";
      const rev = async () => {
        const detail = await fetch(`${base}${brandPath}/${menuId}`, {
          headers: await headersFor(brandAdmin.id),
        });
        const body = await json(detail);
        revision = (body.menu as Record<string, unknown>).revision as string;
        return revision;
      };

      // --- create root + child sections ---
      const rootRes = await fetch(`${base}${brandPath}/${menuId}/sections`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          code: "root",
          name: "Root",
          position: 0,
          expectedMenuRevision: revision,
        }),
      });
      expect(rootRes.status).toBe(200);
      const root = ((await json(rootRes)).section as Record<string, unknown>);
      const rootId = root.id as string;
      await rev();

      const childRes = await fetch(`${base}${brandPath}/${menuId}/sections`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          code: "child",
          name: "Child",
          parentSectionId: rootId,
          position: 0,
          expectedMenuRevision: revision,
        }),
      });
      expect(childRes.status).toBe(200);
      const child = ((await json(childRes)).section as Record<string, unknown>);
      const childId = child.id as string;
      await rev();

      const root2Res = await fetch(`${base}${brandPath}/${menuId}/sections`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          code: "root-b",
          name: "Root B",
          position: 1,
          expectedMenuRevision: revision,
        }),
      });
      expect(root2Res.status).toBe(200);
      const root2Id = ((await json(root2Res)).section as Record<string, unknown>).id as string;
      await rev();

      // --- section content draft ---
      {
        const res = await fetch(`${base}${brandPath}/${menuId}/sections/${rootId}/content-draft`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({
            name: "Root Renamed",
            description: "Root desc",
            expectedMenuRevision: revision,
          }),
        });
        expect(res.status).toBe(200);
        await rev();
      }

      // --- stale section mutation ---
      {
        const stale = await fetch(
          `${base}${brandPath}/${menuId}/sections/${rootId}/content-draft`,
          {
            method: "POST",
            headers: await headersFor(brandAdmin.id),
            body: JSON.stringify({ name: "Stale", expectedMenuRevision: "1" }),
          },
        );
        expect(stale.status).toBe(409);
        expect(await json(stale)).toMatchObject({ ok: false, code: "MENU_STALE_REVISION" });
      }

      // --- foreign section anti-leak ---
      {
        const missing = await fetch(
          `${base}${brandPath}/${menuId}/sections/${missingSectionId}/content-draft`,
          {
            method: "POST",
            headers: await headersFor(brandAdmin.id),
            body: JSON.stringify({ name: "X", expectedMenuRevision: revision }),
          },
        );
        expect(missing.status).toBe(404);
        expect(await json(missing)).toMatchObject({ ok: false, code: "MENU_NOT_FOUND" });
      }

      // --- activate sections ---
      for (const sectionId of [rootId, childId, root2Id]) {
        const res = await fetch(`${base}${brandPath}/${menuId}/sections/${sectionId}/activate`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({ expectedMenuRevision: revision }),
        });
        expect(res.status).toBe(200);
        await rev();
      }

      // --- place products ---
      const entryARes = await fetch(`${base}${brandPath}/${menuId}/entries`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          sectionId: rootId,
          productId: products[0]!.productId,
          position: 0,
          displayName: "Override A",
          displayDescription: "Desc A",
          expectedMenuRevision: revision,
        }),
      });
      expect(entryARes.status).toBe(200);
      const entryA = ((await json(entryARes)).entry as Record<string, unknown>);
      const entryAId = entryA.id as string;
      await rev();

      // imagePath mutation not exposed
      {
        const res = await fetch(`${base}${brandPath}/${menuId}/entries`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({
            sectionId: rootId,
            productId: products[1]!.productId,
            imagePath: "/assets/x.jpeg",
            expectedMenuRevision: revision,
          }),
        });
        expect(res.status).toBe(400);
        expect(await json(res)).toMatchObject({ ok: false, code: "MENU_REQUEST_INVALID" });
      }

      const entryBRes = await fetch(`${base}${brandPath}/${menuId}/entries`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          sectionId: childId,
          productId: products[1]!.productId,
          position: 0,
          expectedMenuRevision: revision,
        }),
      });
      expect(entryBRes.status).toBe(200);
      const entryBId = ((await json(entryBRes)).entry as Record<string, unknown>).id as string;
      await rev();

      const entryCRes = await fetch(`${base}${brandPath}/${menuId}/entries`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          sectionId: rootId,
          productId: products[2]!.productId,
          position: 1,
          expectedMenuRevision: revision,
        }),
      });
      expect(entryCRes.status).toBe(200);
      const entryCId = ((await json(entryCRes)).entry as Record<string, unknown>).id as string;
      await rev();

      // activate entries
      for (const entryId of [entryAId, entryBId, entryCId]) {
        const res = await fetch(`${base}${brandPath}/${menuId}/entries/${entryId}/activate`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({ expectedMenuRevision: revision }),
        });
        expect(res.status).toBe(200);
        await rev();
      }

      // display overrides
      {
        const res = await fetch(
          `${base}${brandPath}/${menuId}/entries/${entryAId}/display-draft`,
          {
            method: "POST",
            headers: await headersFor(brandAdmin.id),
            body: JSON.stringify({
              displayName: "Override A2",
              displayDescription: "Desc A2",
              expectedMenuRevision: revision,
            }),
          },
        );
        expect(res.status).toBe(200);
        await rev();
      }
      {
        const res = await fetch(
          `${base}${brandPath}/${menuId}/entries/${entryAId}/display-draft`,
          {
            method: "POST",
            headers: await headersFor(brandAdmin.id),
            body: JSON.stringify({
              imagePath: "/assets/nope.jpeg",
              expectedMenuRevision: revision,
            }),
          },
        );
        expect(res.status).toBe(400);
      }

      // move entry
      {
        const res = await fetch(`${base}${brandPath}/${menuId}/entries/${entryCId}/move`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({
            targetSectionId: childId,
            position: 1,
            expectedMenuRevision: revision,
          }),
        });
        expect(res.status).toBe(200);
        await rev();
      }

      // reorder entries within section
      {
        const res = await fetch(
          `${base}${brandPath}/${menuId}/sections/${childId}/entries/reorder`,
          {
            method: "POST",
            headers: await headersFor(brandAdmin.id),
            body: JSON.stringify({
              orderedEntryIds: [entryCId, entryBId],
              expectedMenuRevision: revision,
            }),
          },
        );
        expect(res.status).toBe(200);
        await rev();
      }

      // root reorder (other parent's order unchanged)
      {
        const before = await json(
          await fetch(`${base}${brandPath}/${menuId}`, {
            headers: await headersFor(brandAdmin.id),
          }),
        );
        const draftBefore = before.draft as {
          sections: Array<{ id: string; parentSectionId: string | null; position: number }>;
        };
        const childPosBefore = draftBefore.sections.find((s) => s.id === childId)!.position;

        const res = await fetch(`${base}${brandPath}/${menuId}/sections/reorder`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({
            parentSectionId: null,
            orderedSectionIds: [root2Id, rootId],
            expectedMenuRevision: revision,
          }),
        });
        expect(res.status).toBe(200);
        await rev();

        const after = await json(
          await fetch(`${base}${brandPath}/${menuId}`, {
            headers: await headersFor(brandAdmin.id),
          }),
        );
        const draftAfter = after.draft as {
          sections: Array<{ id: string; parentSectionId: string | null; position: number }>;
        };
        expect(draftAfter.sections.find((s) => s.id === root2Id)!.position).toBe(0);
        expect(draftAfter.sections.find((s) => s.id === rootId)!.position).toBe(1);
        expect(draftAfter.sections.find((s) => s.id === childId)!.position).toBe(childPosBefore);
      }

      // child reorder
      {
        const child2Res = await fetch(`${base}${brandPath}/${menuId}/sections`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({
            code: "child-b",
            name: "Child B",
            parentSectionId: rootId,
            position: 1,
            expectedMenuRevision: revision,
          }),
        });
        expect(child2Res.status).toBe(200);
        const child2Id = ((await json(child2Res)).section as Record<string, unknown>).id as string;
        await rev();
        await fetch(`${base}${brandPath}/${menuId}/sections/${child2Id}/activate`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({ expectedMenuRevision: revision }),
        });
        await rev();

        const res = await fetch(`${base}${brandPath}/${menuId}/sections/reorder`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({
            parentSectionId: rootId,
            orderedSectionIds: [child2Id, childId],
            expectedMenuRevision: revision,
          }),
        });
        expect(res.status).toBe(200);
        await rev();
      }

      // entry lifecycle retire staging (retired→active is not a supported transition)
      {
        const retire = await fetch(`${base}${brandPath}/${menuId}/entries/${entryCId}/retire`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({ expectedMenuRevision: revision }),
        });
        expect(retire.status).toBe(200);
        await rev();
        const detail = await json(
          await fetch(`${base}${brandPath}/${menuId}`, {
            headers: await headersFor(brandAdmin.id),
          }),
        );
        const draft = detail.draft as {
          entries: Array<{ id: string; lifecycleStatus: string }>;
        };
        expect(draft.entries.find((e) => e.id === entryCId)?.lifecycleStatus).toBe("retired");
      }

      // foreign entry anti-leak + stale entry
      {
        const missing = await fetch(
          `${base}${brandPath}/${menuId}/entries/${missingEntryId}/move`,
          {
            method: "POST",
            headers: await headersFor(brandAdmin.id),
            body: JSON.stringify({
              targetSectionId: rootId,
              expectedMenuRevision: revision,
            }),
          },
        );
        expect(missing.status).toBe(404);

        const stale = await fetch(`${base}${brandPath}/${menuId}/entries/${entryAId}/move`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({
            targetSectionId: rootId,
            expectedMenuRevision: "1",
          }),
        });
        expect(stale.status).toBe(409);
        expect(await json(stale)).toMatchObject({ ok: false, code: "MENU_STALE_REVISION" });
      }

      // --- detail: effective null, draft explicit, draftDiffers ---
      {
        const res = await fetch(`${base}${brandPath}/${menuId}`, {
          headers: await headersFor(brandAdmin.id),
        });
        const body = await json(res);
        expect(body.effective).toBeNull();
        expect(body.draft).toBeTruthy();
        expect(body.draftDiffersFromEffective).toBe(true);
        const draft = body.draft as {
          entries: Array<{ id: string; imagePath: string | null; displayName: string | null }>;
        };
        // imagePath read-only may be null (never mutated via HTTP)
        expect(draft.entries.find((e) => e.id === entryAId)?.displayName).toBe("Override A2");
      }

      // draft invisible to customer before publish
      await expect(
        persistence.withContext((ctx) => projectCustomerMenu(ctx, { brandId, at: AT })),
      ).rejects.toMatchObject({ code: "MENU_UNAVAILABLE" });

      // --- preview requires manage ---
      {
        const res = await fetch(`${base}${brandPath}/${menuId}/consequence-preview`, {
          method: "POST",
          headers: await headersFor(outletManager.id),
          body: "{}",
        });
        expect(res.status).toBe(403);
      }

      // --- consequence preview structured ---
      const previewRes = await fetch(`${base}${brandPath}/${menuId}/consequence-preview`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: "{}",
      });
      expect(previewRes.status).toBe(200);
      const previewBody = await json(previewRes);
      const preview = previewBody.preview as Record<string, unknown>;
      expect(preview.expectedMenuRevision).toBe(revision);
      expect(preview.wouldChangeCustomerTruth).toBe(true);
      expect(preview.draftDiffersFromEffective).toBe(true);
      expect(preview.validationOk).toBe(true);
      expect(preview.hasPendingDraft).toBe(true);
      const changes = preview.changes as {
        sections: { added: string[] };
        entries: { added: string[]; moved: string[]; reordered: string[]; displayNameChanged: string[] };
      };
      expect(changes.sections.added.length).toBeGreaterThan(0);
      expect(changes.entries.added.length).toBeGreaterThan(0);
      expect(preview.activeMenuEffect).toMatchObject({
        targetBecomesActive: true,
      });

      // preview does not publish
      await expect(
        persistence.withContext((ctx) => projectCustomerMenu(ctx, { brandId, at: AT })),
      ).rejects.toMatchObject({ code: "MENU_UNAVAILABLE" });

      // validate route
      {
        const res = await fetch(`${base}${brandPath}/${menuId}/validate`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: "{}",
        });
        expect(res.status).toBe(200);
        expect((await json(res)).validation).toMatchObject({ validationOk: true });
      }

      // --- first cutover publish ---
      const publishRes = await fetch(`${base}${brandPath}/${menuId}/publish`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({ expectedMenuRevision: preview.expectedMenuRevision }),
      });
      expect(publishRes.status).toBe(200);
      const publication = ((await json(publishRes)).publication as Record<string, unknown>);
      expect(publication.changed).toBe(true);
      expect(publication.effectiveMenuVersionId).toBeTruthy();
      expect(typeof publication.menuRevision).toBe("string");

      const customerAfter = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, { brandId, at: AT }),
      );
      expect(customerAfter.menuId).toBe(menuId);
      expect(customerAfter.sections.length).toBeGreaterThan(0);

      // audit actor attribution
      const audits = await persistence.withContext((ctx) =>
        ctx.db
          .select()
          .from(menuMutationAuditEventsTable)
          .where(eq(menuMutationAuditEventsTable.menuId, menuId)),
      );
      expect(audits.some((a) => a.action === "menu.published")).toBe(true);
      expect(audits.some((a) => a.actorWorkforceUserId === brandAdmin.id)).toBe(true);

      await rev();

      // --- draft edit after publish: customer still A until publish ---
      const beforeName = customerAfter.items.find(
        (i) => i.productId === products[0]!.productId,
      )?.name;

      {
        const res = await fetch(
          `${base}${brandPath}/${menuId}/entries/${entryAId}/display-draft`,
          {
            method: "POST",
            headers: await headersFor(brandAdmin.id),
            body: JSON.stringify({
              displayName: "Customer Sees Later",
              expectedMenuRevision: revision,
            }),
          },
        );
        expect(res.status).toBe(200);
        await rev();
      }

      const midCustomer = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, { brandId, at: AT }),
      );
      const midName = midCustomer.items.find(
        (i) => i.productId === products[0]!.productId,
      )?.name;
      expect(midName).toBe(beforeName);
      expect(midName).not.toBe("Customer Sees Later");

      const preview2 = await json(
        await fetch(`${base}${brandPath}/${menuId}/consequence-preview`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: "{}",
        }),
      );
      const p2 = preview2.preview as Record<string, unknown>;
      expect(p2.draftDiffersFromEffective).toBe(true);
      expect(p2.wouldChangeCustomerTruth).toBe(true);
      expect(
        ((p2.changes as { entries: { displayNameChanged: string[] } }).entries
          .displayNameChanged ?? []).includes(entryAId),
      ).toBe(true);

      // stale publish
      {
        const stale = await fetch(`${base}${brandPath}/${menuId}/publish`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({ expectedMenuRevision: "1" }),
        });
        expect(stale.status).toBe(409);
        expect(await json(stale)).toMatchObject({ ok: false, code: "MENU_STALE_REVISION" });
        const still = await persistence.withContext((ctx) =>
          projectCustomerMenu(ctx, { brandId, at: AT }),
        );
        expect(
          still.items.find((i) => i.productId === products[0]!.productId)?.name,
        ).toBe(beforeName);
      }

      // valid publish → customer B
      let lastEffectiveId: string | null = null;
      {
        const res = await fetch(`${base}${brandPath}/${menuId}/publish`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({ expectedMenuRevision: p2.expectedMenuRevision }),
        });
        expect(res.status).toBe(200);
        const pub2 = ((await json(res)).publication as Record<string, unknown>);
        expect(pub2.changed).toBe(true);
        lastEffectiveId = pub2.effectiveMenuVersionId as string;
      }
      const afterCustomer = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, { brandId, at: AT }),
      );
      expect(
        afterCustomer.items.find((i) => i.productId === products[0]!.productId)?.name,
      ).toBe("Customer Sees Later");

      await rev();

      // --- no-op publish ---
      {
        const noDraftPreview = await json(
          await fetch(`${base}${brandPath}/${menuId}/consequence-preview`, {
            method: "POST",
            headers: await headersFor(brandAdmin.id),
            body: "{}",
          }),
        );
        expect((noDraftPreview.preview as Record<string, unknown>).hasPendingDraft).toBe(false);
        expect((noDraftPreview.preview as Record<string, unknown>).validationOk).toBe(false);
        const menuAfterPreview = await persistence.withContext((ctx) =>
          findMenuById(ctx, menuId),
        );
        expect(menuAfterPreview!.draftMenuVersionId).toBeNull();
        expect(menuAfterPreview!.revision.toString(10)).toBe(revision);

        // Create draft identical to effective by rewriting the current display override.
        const touch = await fetch(
          `${base}${brandPath}/${menuId}/entries/${entryAId}/display-draft`,
          {
            method: "POST",
            headers: await headersFor(brandAdmin.id),
            body: JSON.stringify({
              displayName: "Customer Sees Later",
              expectedMenuRevision: revision,
            }),
          },
        );
        expect(touch.status).toBe(200);
        await rev();
        const noopPreview = await json(
          await fetch(`${base}${brandPath}/${menuId}/consequence-preview`, {
            method: "POST",
            headers: await headersFor(brandAdmin.id),
            body: "{}",
          }),
        );
        const noopPub = await fetch(`${base}${brandPath}/${menuId}/publish`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({
            expectedMenuRevision: (noopPreview.preview as Record<string, unknown>)
              .expectedMenuRevision,
          }),
        });
        expect(noopPub.status).toBe(200);
        const noopBody = ((await json(noopPub)).publication as Record<string, unknown>);
        expect(noopBody.changed).toBe(false);
        expect(noopBody.menuRevision).toBe(
          (noopPreview.preview as Record<string, unknown>).expectedMenuRevision,
        );
        const afterNoop = await persistence.withContext((ctx) => findMenuById(ctx, menuId));
        expect(afterNoop!.effectiveMenuVersionId).toBe(lastEffectiveId);
      }

      // --- unexpected preview error → safe 500 ---
      {
        // force a draft so assertMenuGraphReady is invoked
        await rev();
        const menuNow = await persistence.withContext((ctx) => findMenuById(ctx, menuId));
        if (!menuNow!.draftMenuVersionId) {
          await fetch(`${base}${brandPath}/${menuId}/entries/${entryAId}/display-draft`, {
            method: "POST",
            headers: await headersFor(brandAdmin.id),
            body: JSON.stringify({
              displayName: "Force Draft",
              expectedMenuRevision: revision,
            }),
          });
          await rev();
        }
        const spy = vi
          .spyOn(menuValidation, "assertMenuGraphReady")
          .mockRejectedValueOnce(
            new Error('relation "menu_entry_versions" does not exist — raw db detail'),
          );
        try {
          const boom = await fetch(`${base}${brandPath}/${menuId}/consequence-preview`, {
            method: "POST",
            headers: await headersFor(brandAdmin.id),
            body: "{}",
          });
          expect(boom.status).toBe(500);
          const boomBody = await json(boom);
          expect(boomBody).toMatchObject({ ok: false, code: "INTERNAL_ERROR" });
          expect(JSON.stringify(boomBody)).not.toMatch(/does not exist/);
          expect(JSON.stringify(boomBody)).not.toMatch(/menu_entry_versions/);
        } finally {
          spy.mockRestore();
        }
      }

      // path Brand authorized first: other brand path denied for our actor
      {
        const res = await fetch(`${base}${otherBrandPath}`, {
          headers: await headersFor(brandAdmin.id),
        });
        expect(res.status).toBe(403);
      }

      // GET still works without mutation Origin issues already proven
      expect(
        (
          await fetch(`${base}${brandPath}/${menuId}`, {
            headers: await headersFor(brandAdmin.id),
          })
        ).status,
      ).toBe(200);
    });
  });

  it("one-active Menu preserved through Admin HTTP publish (no activateMenu route)", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "m1a"));
      const brandAdmin = await createEligibleWorkforceUser(persistence);
      const actor = principalFor(brandAdmin.id);
      await persistence.transaction(async (tx) => {
        const membership = await createMembership(tx, {
          workforceUserId: brandAdmin.id,
          scope: { scopeType: "brand", brandId: tree.brand.id },
          status: "active",
        });
        await grantRole(tx, { membershipId: membership.id, roleKey: "brand_admin" });
      });
      const brandId = tree.brand.id;

      const product = await persistence.transaction((tx) =>
        createProduct(tx, {
          actor,
          brandId,
          code: "one-a",
          name: "One A",
          productKind: "standard",
        }),
      );
      const variant = await persistence.transaction((tx) =>
        createVariant(tx, {
          actor,
          productId: product.id,
          code: "default",
          name: "Regular",
          isDefault: true,
          isSelectorVisible: false,
        }),
      );
      await persistence.transaction(async (tx) => {
        await activateVariant(tx, { actor, variantId: variant.id });
        await activateProduct(tx, { actor, productId: product.id });
        await publishProductEnvelope(tx, { actor, brandId, productId: product.id });
      });

      const productB = await persistence.transaction((tx) =>
        createProduct(tx, {
          actor,
          brandId,
          code: "one-b",
          name: "One B",
          productKind: "standard",
        }),
      );
      const variantB = await persistence.transaction((tx) =>
        createVariant(tx, {
          actor,
          productId: productB.id,
          code: "default",
          name: "Regular",
          isDefault: true,
          isSelectorVisible: false,
        }),
      );
      await persistence.transaction(async (tx) => {
        await activateVariant(tx, { actor, variantId: variantB.id });
        await activateProduct(tx, { actor, productId: productB.id });
        await publishProductEnvelope(tx, { actor, brandId, productId: productB.id });
      });

      await persistence.transaction(async (tx) => {
        const book = await createDraftPriceBook(tx, {
          actor,
          brandId,
          scopeType: "brand",
          code: `pb-${randomUUID().slice(0, 8)}`,
          name: "Book",
          effectiveFrom: new Date("2026-09-01T00:00:00+05:30"),
          effectiveTo: null,
        });
        await attachDraftVariantPrice(tx, {
          actor,
          priceBookId: book.id,
          brandId,
          variantId: variant.id,
          amountPaise: BigInt(10_000),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
        });
        await attachDraftVariantPrice(tx, {
          actor,
          priceBookId: book.id,
          brandId,
          variantId: variantB.id,
          amountPaise: BigInt(11_000),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
        });
        await activatePriceBook(tx, { actor, priceBookId: book.id, brandId });
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
          "menu-admin-one-active",
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

      const headersFor = async (userId: string) => {
        const session = await adapter.createSession(userId);
        return {
          cookie: await signedCookie(session.token),
          origin: workforceAuthConfig().workforce.baseURL.origin,
          "content-type": "application/json",
        };
      };
      const brandPath = `/api/admin/v1/brands/${brandId}/menus`;
      const json = async (res: Response) => res.json() as Promise<Record<string, unknown>>;

      async function readRevision(menuId: string): Promise<string> {
        const detail = await json(
          await fetch(`${base}${brandPath}/${menuId}`, {
            headers: await headersFor(brandAdmin.id),
          }),
        );
        return (detail.menu as Record<string, unknown>).revision as string;
      }

      async function authorAndPublish(
        code: string,
        productId: string,
      ): Promise<{ menuId: string }> {
        const create = await json(
          await fetch(`${base}${brandPath}`, {
            method: "POST",
            headers: await headersFor(brandAdmin.id),
            body: JSON.stringify({ code, name: code }),
          }),
        );
        const menuId = (create.menu as Record<string, unknown>).id as string;
        let revision = (create.menu as Record<string, unknown>).revision as string;

        const section = await json(
          await fetch(`${base}${brandPath}/${menuId}/sections`, {
            method: "POST",
            headers: await headersFor(brandAdmin.id),
            body: JSON.stringify({
              code: `${code}-s`,
              name: "S",
              expectedMenuRevision: revision,
            }),
          }),
        );
        const sectionId = (section.section as Record<string, unknown>).id as string;
        revision = await readRevision(menuId);

        await fetch(`${base}${brandPath}/${menuId}/sections/${sectionId}/activate`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({ expectedMenuRevision: revision }),
        });
        revision = await readRevision(menuId);

        const entry = await json(
          await fetch(`${base}${brandPath}/${menuId}/entries`, {
            method: "POST",
            headers: await headersFor(brandAdmin.id),
            body: JSON.stringify({
              sectionId,
              productId,
              expectedMenuRevision: revision,
            }),
          }),
        );
        const entryId = (entry.entry as Record<string, unknown>).id as string;
        revision = await readRevision(menuId);

        await fetch(`${base}${brandPath}/${menuId}/entries/${entryId}/activate`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id),
          body: JSON.stringify({ expectedMenuRevision: revision }),
        });
        revision = await readRevision(menuId);

        const preview = await json(
          await fetch(`${base}${brandPath}/${menuId}/consequence-preview`, {
            method: "POST",
            headers: await headersFor(brandAdmin.id),
            body: "{}",
          }),
        );
        const pub = await json(
          await fetch(`${base}${brandPath}/${menuId}/publish`, {
            method: "POST",
            headers: await headersFor(brandAdmin.id),
            body: JSON.stringify({
              expectedMenuRevision: (preview.preview as Record<string, unknown>)
                .expectedMenuRevision,
            }),
          }),
        );
        expect((pub.publication as Record<string, unknown>).changed).toBe(true);
        return { menuId };
      }

      const menuA = await authorAndPublish("menu-a", product.id);
      const customerA = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, { brandId, at: AT }),
      );
      expect(customerA.menuId).toBe(menuA.menuId);

      const menuB = await authorAndPublish("menu-b", productB.id);
      const customerB = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, { brandId, at: AT }),
      );
      expect(customerB.menuId).toBe(menuB.menuId);

      const list = await json(
        await fetch(`${base}${brandPath}`, { headers: await headersFor(brandAdmin.id) }),
      );
      const menus = list.menus as Array<Record<string, unknown>>;
      const active = menus.filter((m) => m.lifecycleStatus === "active");
      expect(active).toHaveLength(1);
      expect(active[0]!.id).toBe(menuB.menuId);
      expect(menus.find((m) => m.id === menuA.menuId)?.lifecycleStatus).toBe("retired");

      // No activateMenu HTTP surface
      expect(classifyAdminMenuRoute(`${brandPath}/${menuA.menuId}/activate`)).toBeNull();
    });
  });

  it("consequence-preview requires menu.manage; inspection remains menu.read", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withTestDatabaseClient(database.connectionString, async (admin) => {
        await admin.pool.query(
          `delete from app.access_role_permissions
           where role_key = 'brand_admin' and permission_key = 'menu.manage'`,
        );
      });

      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);
      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "mrd"));
      const brandAdmin = await createEligibleWorkforceUser(persistence);
      await persistence.transaction(async (tx) => {
        const membership = await createMembership(tx, {
          workforceUserId: brandAdmin.id,
          scope: { scopeType: "brand", brandId: tree.brand.id },
          status: "active",
        });
        await grantRole(tx, { membershipId: membership.id, roleKey: "brand_admin" });
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
          "menu-admin-read-only",
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

      const headersFor = async (userId: string) => {
        const session = await adapter.createSession(userId);
        return {
          cookie: await signedCookie(session.token),
          origin: workforceAuthConfig().workforce.baseURL.origin,
          "content-type": "application/json",
        };
      };

      const brandPath = `/api/admin/v1/brands/${tree.brand.id}/menus`;
      const placeholder = "00000000-0000-4000-8000-000000000001";

      const inspect = await fetch(`${base}${brandPath}`, {
        headers: await headersFor(brandAdmin.id),
      });
      expect(inspect.status).toBe(200);

      const preview = await fetch(`${base}${brandPath}/${placeholder}/consequence-preview`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: "{}",
      });
      expect(preview.status).toBe(403);
      expect(await preview.json()).toMatchObject({ ok: false, code: "MENU_UNAUTHORIZED" });
    });
  });

  it("domain preview with no pending draft does not create draft", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);
      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "mnd"));
      const brandAdmin = await createEligibleWorkforceUser(persistence);
      const actor = principalFor(brandAdmin.id);
      await persistence.transaction(async (tx) => {
        const membership = await createMembership(tx, {
          workforceUserId: brandAdmin.id,
          scope: { scopeType: "brand", brandId: tree.brand.id },
          status: "active",
        });
        await grantRole(tx, { membershipId: membership.id, roleKey: "brand_admin" });
      });

      const menu = await persistence.transaction((tx) =>
        createMenu(tx, {
          actor,
          brandId: tree.brand.id,
          code: "no-draft",
          name: "No Draft",
        }),
      );
      const preview = await persistence.transaction((tx) =>
        previewMenuPublication(tx, { actor, menuId: menu.id }),
      );
      expect(preview.hasPendingDraft).toBe(false);
      expect(preview.draftMenuVersionId).toBeNull();
      expect(preview.validationOk).toBe(false);

      const after = await persistence.withContext((ctx) => findMenuById(ctx, menu.id));
      expect(after!.draftMenuVersionId).toBeNull();
      expect(after!.revision).toBe(menu.revision);

      const audits = await persistence.withContext((ctx) =>
        ctx.db
          .select()
          .from(menuMutationAuditEventsTable)
          .where(eq(menuMutationAuditEventsTable.menuId, menu.id)),
      );
      expect(audits.some((a) => a.action === "menu.version_draft_created")).toBe(false);
    });
  });
});
