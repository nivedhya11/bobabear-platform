/** Database-backed portal session projection for IMP-036A destinations. */
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
import { resolveAuthorizedDestinations } from "../../src/lib/workforce-hub/destinations";
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
    CUSTOMER_AUTH_SECRET: "portal-session-customer-auth-secret-32c!",
    CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
    WORKFORCE_AUTH_SECRET: "portal-session-workforce-auth-secret-32",
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

const openHandles: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(openHandles.splice(0).map((h) => h.close()));
});

describe("IMP-036A portal session destination projection", () => {
  it("projects capabilities to destinations from canonical assignments", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      const tree = await persistence.transaction((tx) => seedBrandTree(tx));
      const platformAdmin = await createEligibleWorkforceUser(persistence, {
        email: "psa.portal@example.invalid",
      });
      const outletManager = await createEligibleWorkforceUser(persistence, {
        email: "manager.portal@example.invalid",
      });
      const kitchen = await createEligibleWorkforceUser(persistence, {
        email: "kitchen.portal@example.invalid",
      });

      await persistence.transaction(async (tx) => {
        const platformMembership = await createMembership(tx, {
          workforceUserId: platformAdmin.id,
          scope: { scopeType: "platform" },
          status: "active",
        });
        await grantRole(tx, { membershipId: platformMembership.id, roleKey: "platform_super_admin" });

        const managerMembership = await createMembership(tx, {
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
        await grantRole(tx, { membershipId: managerMembership.id, roleKey: "outlet_manager" });

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
          "portal-session-request",
        );
      });
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Missing test server address");
      const base = `http://127.0.0.1:${address.port}`;

      const headersFor = async (userId: string) => {
        const session = await adapter.createSession(userId);
        return {
          cookie: await signedCookie(session.token),
          origin: workforceAuthConfig().workforce.baseURL.origin,
        };
      };

      try {
        const unauth = await fetch(`${base}/api/admin/v1/session`);
        expect(unauth.status).toBe(401);

        const opsUnauth = await fetch(`${base}/api/operations/v1/orders`);
        expect([401, 403]).toContain(opsUnauth.status);

        const psaJson = await (await fetch(`${base}/api/admin/v1/session`, { headers: await headersFor(platformAdmin.id) })).json();
        expect(psaJson.session.capabilities["order.read"]).toBe(true);
        expect(psaJson.session.signedInLabel).toBe(platformAdmin.email);
        expect(psaJson.session.signedInLabel).not.toBe(platformAdmin.id);
        expect(resolveAuthorizedDestinations(psaJson.session.capabilities).map((d) => d.id)).toEqual([
          "operations",
          "administration",
        ]);

        const managerJson = await (await fetch(`${base}/api/admin/v1/session`, { headers: await headersFor(outletManager.id) })).json();
        expect(managerJson.session.capabilities["order.read"]).toBe(true);
        expect(managerJson.session.capabilities["access.membership.read"]).toBe(true);
        expect(managerJson.session.capabilities["access.audit.read"]).toBe(true);
        expect(resolveAuthorizedDestinations(managerJson.session.capabilities).map((d) => d.id)).toEqual([
          "operations",
          "administration",
        ]);

        const kitchenJson = await (await fetch(`${base}/api/admin/v1/session`, { headers: await headersFor(kitchen.id) })).json();
        expect(kitchenJson.session.capabilities["order.read"]).toBe(true);
        expect(kitchenJson.session.capabilities["access.membership.manage"]).toBe(false);
        expect(kitchenJson.session.capabilities["outlet.read"]).toBe(true);
        expect(resolveAuthorizedDestinations(kitchenJson.session.capabilities).some((d) => d.id === "operations")).toBe(
          true,
        );
      } finally {
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
      }
    });
  }, 120_000);
});
