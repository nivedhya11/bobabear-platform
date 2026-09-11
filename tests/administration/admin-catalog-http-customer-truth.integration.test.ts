/**
 * IMP-036F F2 R7 — Admin HTTP mutation → customer Menu projection proof.
 */
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

import { serializeSignedCookie } from "better-call";
import { afterEach, describe, expect, it } from "vitest";
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
  publishCatalogContentChange,
} from "../../src/server/catalog";
import { catalogContentRevisionsTable } from "../../src/platform/database/schema/catalog";
import { eq } from "drizzle-orm";
import {
  activateMenu,
  activateMenuEntry,
  activateMenuSection,
  createMenu,
  createMenuEntry,
  createMenuSection,
} from "../../src/server/catalog/menu";
import { includeBrandVariant } from "../../src/server/assortment";
import { projectCustomerMenu } from "../../src/server/customer-commerce/menu/project-customer-menu";
import { routeOperationsRequest } from "../../src/server/operations/http/router";
import { getApplicationPersistence } from "../../src/server/persistence";
import {
  activatePriceBook,
  attachDraftVariantPrice,
  createDraftPriceBook,
} from "../../src/server/pricing";
import type { WebConfig } from "../../src/platform/config";
import { TAX_CATEGORY_RESTAURANT_SERVICE_ID } from "../../src/shared/pricing";
import {
  createEligibleWorkforceUser,
  principalFor,
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

const openHandles: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(openHandles.splice(0).map((h) => h.close()));
});

const AT = new Date("2026-09-11T12:00:00.000Z");

describe("IMP-036F F2 R7 — HTTP authoring to customer Menu projection", () => {
  it("customer Menu stays on A after draft B, then resolves B after reviewed publish", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "caf2r7"));
      const brandAdmin = await createEligibleWorkforceUser(persistence);
      await persistence.transaction(async (tx) => {
        const membership = await createMembership(tx, {
          workforceUserId: brandAdmin.id,
          scope: { scopeType: "brand", brandId: tree.brand.id },
          status: "active",
        });
        await grantRole(tx, { membershipId: membership.id, roleKey: "brand_admin" });
      });
      const actor = principalFor(brandAdmin.id);
      const brandId = tree.brand.id;

      const product = await persistence.transaction((tx) =>
        createProduct(tx, {
          actor,
          brandId,
          code: "r7-tea",
          name: "Customer Truth A",
          productKind: "standard",
        }),
      );
      const variant = await persistence.transaction((tx) =>
        createVariant(tx, {
          actor,
          productId: product.id,
          code: "default",
          name: "Default",
          isDefault: true,
          isSelectorVisible: false,
        }),
      );
      await persistence.transaction(async (tx) => {
        await activateVariant(tx, { actor, variantId: variant.id });
        await activateProduct(tx, { actor, productId: product.id });
        const rows = await tx.db
          .select()
          .from(catalogContentRevisionsTable)
          .where(eq(catalogContentRevisionsTable.brandId, brandId))
          .limit(1);
        const expected = rows[0]!.contentRevision;
        await publishCatalogContentChange(tx, {
          actor,
          brandId,
          productId: product.id,
          expectedContentRevision: expected,
        });
        await includeBrandVariant(tx, { actor, brandId, variantId: variant.id });
      });

      const menu = await persistence.transaction((tx) =>
        createMenu(tx, { actor, brandId, code: "r7-menu", name: "R7 Menu" }),
      );
      const section = await persistence.transaction((tx) =>
        createMenuSection(tx, {
          actor,
          brandId,
          menuId: menu.id,
          code: "r7-sec",
          name: "Section",
          position: 0,
        }),
      );
      const entry = await persistence.transaction((tx) =>
        createMenuEntry(tx, {
          actor,
          brandId,
          menuId: menu.id,
          sectionId: section.id,
          productId: product.id,
          position: 0,
          imagePath: "/assets/menu/test.jpeg",
        }),
      );
      await persistence.transaction(async (tx) => {
        await activateMenu(tx, { actor, menuId: menu.id });
        await activateMenuSection(tx, { actor, sectionId: section.id });
        await activateMenuEntry(tx, { actor, entryId: entry.id });
      });

      await persistence.transaction(async (tx) => {
        const book = await createDraftPriceBook(tx, {
          actor,
          brandId,
          scopeType: "brand",
          code: `r7-${randomUUID().slice(0, 8)}`,
          name: "R7 book",
          effectiveFrom: new Date("2026-09-01T00:00:00+05:30"),
          effectiveTo: null,
        });
        await attachDraftVariantPrice(tx, {
          actor,
          priceBookId: book.id,
          brandId,
          variantId: variant.id,
          amountPaise: BigInt(19_900),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
        });
        await activatePriceBook(tx, { actor, priceBookId: book.id, brandId });
      });

      // 2. observe A through customer Menu
      const beforeDraft = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, { brandId, at: AT }),
      );
      expect(beforeDraft.items).toHaveLength(1);
      expect(beforeDraft.items[0]!.name).toBe("Customer Truth A");

      const runtime = getWorkforceAuthRuntime({
        auth: workforceAuthConfig().workforce,
        persistence: applicationConfig(database.connectionString),
      });
      openHandles.push(runtime);
      const auth = await runtime.getAuth();
      const adapter = (await auth.$context as { internalAdapter: InternalAdapter }).internalAdapter;
      const server = createServer((req, res) => {
        void routeOperationsRequest(
          req,
          res,
          {
            runtime,
            persistence,
            trustedOrigin: workforceAuthConfig().workforce.baseURL.origin,
          },
          "catalog-admin-http-r7",
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

      const session = await adapter.createSession(brandAdmin.id);
      const headers = {
        cookie: await signedCookie(session.token),
        origin: workforceAuthConfig().workforce.baseURL.origin,
        "content-type": "application/json",
      };
      const brandPath = `/api/admin/v1/brands/${brandId}/catalog`;

      // 3. F2 Admin HTTP stages Product change B
      const getProd = await fetch(`${base}${brandPath}/products/${product.id}`, { headers });
      const draftRev = (await getProd.json()).product.draftContentRevision;
      const draft = await fetch(`${base}${brandPath}/products/${product.id}/content-draft`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          expectedContentRevision: draftRev,
          name: "Customer Truth B",
        }),
      });
      expect(draft.status).toBe(200);

      // 4. customer surface still resolves A
      const afterDraft = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, { brandId, at: AT }),
      );
      expect(afterDraft.items[0]!.name).toBe("Customer Truth A");

      // 5–6. consequence-preview + publish with reviewed token
      const preview = await fetch(`${base}${brandPath}/products/${product.id}/consequence-preview`, {
        method: "POST",
        headers,
        body: "{}",
      });
      expect(preview.status).toBe(200);
      const previewBody = await preview.json();
      expect(previewBody.preview.wouldChangeCustomerTruth).toBe(true);
      const nameField = previewBody.preview.changes
        .flatMap((c: { changedFields?: Array<{ field: string; proposedValue: unknown }> }) =>
          c.changedFields ?? [],
        )
        .find((f: { field: string }) => f.field === "name");
      expect(nameField.proposedValue).toBe("Customer Truth B");

      const pub = await fetch(`${base}${brandPath}/products/${product.id}/publish`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          expectedContentRevision: previewBody.preview.expectedContentRevision,
        }),
      });
      expect(pub.status).toBe(200);
      expect((await pub.json()).publication.changed).toBe(true);

      // 7. customer surface resolves B
      const afterPublish = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, { brandId, at: AT }),
      );
      expect(afterPublish.items[0]!.name).toBe("Customer Truth B");
    });
  });
});
