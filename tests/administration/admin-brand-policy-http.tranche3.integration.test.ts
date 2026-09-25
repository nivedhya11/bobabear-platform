/**
 * IMP-036I Tranche 3 — Brand Scheduled-policy Administration HTTP.
 *
 * Proves the live Brand resource route, including mixed-patch rejection
 * before either policy or Brand mutation.
 */
import { createServer } from "node:http";

import { serializeSignedCookie } from "better-call";
import { afterEach, describe, expect, it } from "vitest";
import { inject } from "vitest";

import { createMembership, grantRole } from "../../src/server/access-control";
import { getWorkforceAuthRuntime, WORKFORCE_AUTH_SESSION_COOKIE_NAME } from "../../src/server/auth/workforce";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
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
  return loadAuthFoundationConfig({
    CUSTOMER_AUTH_SECRET: "brand-policy-http-customer-secret-32ch",
    CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
    WORKFORCE_AUTH_SECRET: "brand-policy-http-workforce-secret-32",
    WORKFORCE_AUTH_BASE_URL: "http://localhost:3200",
  }, "test");
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
  await Promise.all(openHandles.splice(0).map((handle) => handle.close()));
});

describe("IMP-036I Tranche 3 Brand Scheduled-policy HTTP", () => {
  it("rejects mixed Brand and policy writes before either mutation", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "bpol"));
      const otherTree = await persistence.transaction((tx) => seedBrandTree(tx, "bpo2"));
      const brandAdmin = await createEligibleWorkforceUser(persistence);
      const kitchen = await createEligibleWorkforceUser(persistence);

      await persistence.transaction(async (tx) => {
        const brandMembership = await createMembership(tx, {
          workforceUserId: brandAdmin.id,
          scope: { scopeType: "brand", brandId: tree.brand.id },
          status: "active",
        });
        await grantRole(tx, { membershipId: brandMembership.id, roleKey: "brand_admin" });

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
          "brand-policy-http",
        );
      });
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Missing test server address");
      const base = `http://127.0.0.1:${address.port}`;
      const brandPath = `/api/admin/v1/resources/brands/${tree.brand.id}`;
      const otherBrandPath = `/api/admin/v1/resources/brands/${otherTree.brand.id}`;
      const outletPath = `/api/admin/v1/resources/outlets/${tree.outletA.id}`;

      const headersFor = async (userId: string) => {
        const session = await adapter.createSession(userId);
        return {
          cookie: await signedCookie(session.token),
          origin: workforceAuthConfig().workforce.baseURL.origin,
          "content-type": "application/json",
        };
      };

      const readBrand = async (path: string, headers: Record<string, string>) => {
        const response = await fetch(`${base}${path}`, { headers });
        return { status: response.status, body: await response.json() };
      };

      try {
        const adminHeaders = await headersFor(brandAdmin.id);
        const kitchenHeaders = await headersFor(kitchen.id);

        let response = await fetch(`${base}${brandPath}`);
        expect([response.status, (await response.json()).code]).toEqual([401, "WORKFORCE_AUTH_REQUIRED"]);

        const denied = await readBrand(brandPath, kitchenHeaders);
        expect([denied.status, denied.body.code]).toEqual([403, "ADMIN_UNAUTHORIZED"]);

        const cross = await readBrand(otherBrandPath, adminHeaders);
        expect([cross.status, cross.body.code]).toEqual([403, "ADMIN_UNAUTHORIZED"]);

        const initial = await readBrand(brandPath, adminHeaders);
        expect(initial.status).toBe(200);
        expect(initial.body.scheduledCancellationPolicy).toMatchObject({
          pickupCancellationCutoffMinutes: 30,
          deliveryCancellationCutoffMinutes: 60,
          revision: "0",
          source: "PRODUCT_DEFAULT",
        });
        const initialName = initial.body.item.name as string;
        const initialBrandRevision = initial.body.item.revision as string;
        const initialPolicy = JSON.stringify(initial.body.scheduledCancellationPolicy);

        const outletBefore = await readBrand(outletPath, adminHeaders);
        expect(outletBefore.status).toBe(200);
        expect(outletBefore.body).not.toHaveProperty("scheduledCancellationPolicy");
        const outletName = outletBefore.body.item.name as string;

        response = await fetch(`${base}${outletPath}`, {
          method: "PATCH",
          headers: adminHeaders,
          body: JSON.stringify({
            name: "Outlet cutoff must not land",
            expectedRevision: outletBefore.body.item.revision,
            scheduledCancellationPolicy: {
              expectedRevision: 0,
              pickupCancellationCutoffMinutes: 10,
            },
          }),
        });
        expect(response.status).toBe(400);
        const outletRejected = await response.json();
        expect(outletRejected.code).toBe("ADMIN_REQUEST_INVALID");
        expect(outletRejected.message).toMatch(/Outlet override is not available/);

        const outletAfter = await readBrand(outletPath, adminHeaders);
        expect(outletAfter.body.item.name).toBe(outletName);
        expect(outletAfter.body).not.toHaveProperty("scheduledCancellationPolicy");
        const stillDefault = await readBrand(brandPath, adminHeaders);
        expect(JSON.stringify(stillDefault.body.scheduledCancellationPolicy)).toBe(initialPolicy);

        const mixedInvalidBrand = await fetch(`${base}${brandPath}`, {
          method: "PATCH",
          headers: adminHeaders,
          body: JSON.stringify({
            status: "archived",
            expectedRevision: initialBrandRevision,
            scheduledCancellationPolicy: {
              expectedRevision: 0,
              pickupCancellationCutoffMinutes: 15,
            },
          }),
        });
        expect(mixedInvalidBrand.status).toBe(400);
        const mixedInvalidBody = await mixedInvalidBrand.json();
        expect(mixedInvalidBody.code).toBe("ADMIN_REQUEST_INVALID");
        expect(mixedInvalidBody.message).toMatch(/separate requests/);

        const mixedStaleBrand = await fetch(`${base}${brandPath}`, {
          method: "PATCH",
          headers: adminHeaders,
          body: JSON.stringify({
            name: "Stale brand must not apply",
            expectedRevision: "999",
            scheduledCancellationPolicy: {
              expectedRevision: 0,
              deliveryCancellationCutoffMinutes: 90,
            },
          }),
        });
        expect(mixedStaleBrand.status).toBe(400);
        expect((await mixedStaleBrand.json()).code).toBe("ADMIN_REQUEST_INVALID");

        let afterMixed = await readBrand(brandPath, adminHeaders);
        expect(afterMixed.body.item.name).toBe(initialName);
        expect(JSON.stringify(afterMixed.body.scheduledCancellationPolicy)).toBe(initialPolicy);

        response = await fetch(`${base}${brandPath}`, {
          method: "PATCH",
          headers: adminHeaders,
          body: JSON.stringify({
            scheduledCancellationPolicy: {
              expectedRevision: 0,
              pickupCancellationCutoffMinutes: 0,
            },
          }),
        });
        expect(response.status).toBe(200);
        let policyBody = await response.json();
        expect(policyBody.scheduledCancellationPolicy).toMatchObject({
          pickupCancellationCutoffMinutes: 0,
          deliveryCancellationCutoffMinutes: 60,
          revision: "1",
          source: "EXPLICIT_ROW",
        });
        expect(policyBody.item.name).toBe(initialName);

        response = await fetch(`${base}${brandPath}`, {
          method: "PATCH",
          headers: adminHeaders,
          body: JSON.stringify({
            scheduledCancellationPolicy: {
              expectedRevision: 1,
              deliveryCancellationCutoffMinutes: 240,
            },
          }),
        });
        expect(response.status).toBe(200);
        policyBody = await response.json();
        expect(policyBody.scheduledCancellationPolicy).toMatchObject({
          pickupCancellationCutoffMinutes: 0,
          deliveryCancellationCutoffMinutes: 240,
          revision: "2",
        });
        const explicitPolicy = JSON.stringify(policyBody.scheduledCancellationPolicy);

        const below = await fetch(`${base}${brandPath}`, {
          method: "PATCH",
          headers: adminHeaders,
          body: JSON.stringify({
            scheduledCancellationPolicy: {
              expectedRevision: 2,
              pickupCancellationCutoffMinutes: -1,
            },
          }),
        });
        expect(below.status).toBe(400);
        expect((await below.json()).code).toBe("ADMIN_REQUEST_INVALID");

        const above = await fetch(`${base}${brandPath}`, {
          method: "PATCH",
          headers: adminHeaders,
          body: JSON.stringify({
            scheduledCancellationPolicy: {
              expectedRevision: 2,
              deliveryCancellationCutoffMinutes: 241,
            },
          }),
        });
        expect(above.status).toBe(400);
        expect((await above.json()).code).toBe("ADMIN_REQUEST_INVALID");

        const stalePolicy = await fetch(`${base}${brandPath}`, {
          method: "PATCH",
          headers: adminHeaders,
          body: JSON.stringify({
            scheduledCancellationPolicy: {
              expectedRevision: 1,
              pickupCancellationCutoffMinutes: 15,
            },
          }),
        });
        expect(stalePolicy.status).toBe(409);
        expect((await stalePolicy.json()).code).toBe("ADMIN_CONFLICT");

        afterMixed = await readBrand(brandPath, adminHeaders);
        expect(JSON.stringify(afterMixed.body.scheduledCancellationPolicy)).toBe(explicitPolicy);

        const mixedStalePolicy = await fetch(`${base}${brandPath}`, {
          method: "PATCH",
          headers: adminHeaders,
          body: JSON.stringify({
            name: "Mixed stale policy must not rename",
            expectedRevision: initialBrandRevision,
            scheduledCancellationPolicy: {
              expectedRevision: 0,
              pickupCancellationCutoffMinutes: 20,
            },
          }),
        });
        expect(mixedStalePolicy.status).toBe(400);
        expect((await mixedStalePolicy.json()).message).toMatch(/separate requests/);

        afterMixed = await readBrand(brandPath, adminHeaders);
        expect(afterMixed.body.item.name).toBe(initialName);
        expect(JSON.stringify(afterMixed.body.scheduledCancellationPolicy)).toBe(explicitPolicy);

        const crossPatch = await fetch(`${base}${otherBrandPath}`, {
          method: "PATCH",
          headers: adminHeaders,
          body: JSON.stringify({
            scheduledCancellationPolicy: {
              expectedRevision: 0,
              pickupCancellationCutoffMinutes: 10,
            },
          }),
        });
        expect(crossPatch.status).toBe(403);
        expect((await crossPatch.json()).code).toBe("ADMIN_UNAUTHORIZED");

        response = await fetch(`${base}${brandPath}`, {
          method: "PATCH",
          headers: adminHeaders,
          body: JSON.stringify({
            name: "Brand only rename",
            expectedRevision: initialBrandRevision,
          }),
        });
        expect(response.status).toBe(200);
        const renamed = await response.json();
        expect(renamed.item.name).toBe("Brand only rename");
        expect(JSON.stringify(renamed.scheduledCancellationPolicy)).toBe(explicitPolicy);

        const kitchenPatch = await fetch(`${base}${brandPath}`, {
          method: "PATCH",
          headers: kitchenHeaders,
          body: JSON.stringify({
            scheduledCancellationPolicy: {
              expectedRevision: 2,
              pickupCancellationCutoffMinutes: 5,
            },
          }),
        });
        expect(kitchenPatch.status).toBe(403);
        expect((await kitchenPatch.json()).code).toBe("ADMIN_UNAUTHORIZED");

        const finalRead = await readBrand(brandPath, adminHeaders);
        expect(finalRead.body.item.name).toBe("Brand only rename");
        expect(JSON.stringify(finalRead.body.scheduledCancellationPolicy)).toBe(explicitPolicy);
      } finally {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
      }
    });
  });
});
