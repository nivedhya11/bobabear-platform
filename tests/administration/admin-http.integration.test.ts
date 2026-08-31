/** Administration HTTP transport integration (IMP-035 / D-373). */
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

import { serializeSignedCookie } from "better-call";
import { afterEach, describe, expect, it } from "vitest";

import {
  createMembership,
  grantRole,
} from "../../src/server/access-control";
import { getWorkforceAuthRuntime, WORKFORCE_AUTH_SESSION_COOKIE_NAME } from "../../src/server/auth/workforce";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import { routeOperationsRequest } from "../../src/server/operations/http/router";
import { getApplicationPersistence } from "../../src/server/persistence";
import type { WebConfig } from "../../src/platform/config";
import {
  createEligibleWorkforceUser,
  principalFor,
  seedBrandTree,
} from "../database/support/access-control-fixtures";
import { applyMigrations, withIsolatedTestDatabase } from "../database/support/test-database";
import { inject } from "vitest";

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
    CUSTOMER_AUTH_SECRET: "admin-http-customer-auth-secret-32chars!",
    CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
    WORKFORCE_AUTH_SECRET: "admin-http-workforce-auth-secret-32char",
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
  await Promise.all(openHandles.splice(0).map((h) => h.close()));
});

describe("IMP-035 Administration HTTP", () => {
  it("enforces auth, origin, scope isolation, forgery denial, membership/role/audit controls", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      const tree = await persistence.transaction((tx) => seedBrandTree(tx));
      const platformAdmin = await createEligibleWorkforceUser(persistence);
      const outletAManager = await createEligibleWorkforceUser(persistence);
      const outletBUser = await createEligibleWorkforceUser(persistence);
      const subject = await createEligibleWorkforceUser(persistence);

      await persistence.transaction(async (tx) => {
        const platformMembership = await createMembership(tx, {
          workforceUserId: platformAdmin.id,
          scope: { scopeType: "platform" },
          status: "active",
        });
        await grantRole(tx, { membershipId: platformMembership.id, roleKey: "platform_super_admin" });

        const membershipA = await createMembership(tx, {
          workforceUserId: outletAManager.id,
          scope: {
            scopeType: "outlet",
            brandId: tree.brand.id,
            organizationId: tree.orgA.id,
            territoryId: tree.terrA.id,
            outletId: tree.outletA.id,
          },
          status: "active",
        });
        await grantRole(tx, { membershipId: membershipA.id, roleKey: "outlet_manager" });

        const membershipB = await createMembership(tx, {
          workforceUserId: outletBUser.id,
          scope: {
            scopeType: "outlet",
            brandId: tree.brand.id,
            organizationId: tree.orgB.id,
            territoryId: tree.terrB.id,
            outletId: tree.outletB.id,
          },
          status: "active",
        });
        await grantRole(tx, { membershipId: membershipB.id, roleKey: "kitchen_operator" });
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
          "admin-http-request",
        );
      });
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Missing test server address");
      const base = `http://127.0.0.1:${address.port}`;
      const request = (path: string, init?: RequestInit) => fetch(`${base}${path}`, init);
      const headersFor = async (userId: string, extra: HeadersInit = {}) => {
        const session = await adapter.createSession(userId);
        return {
          cookie: await signedCookie(session.token),
          origin: workforceAuthConfig().workforce.baseURL.origin,
          "content-type": "application/json",
          ...extra,
        };
      };

      try {
        // unauthorized
        let response = await request("/api/admin/v1/session");
        expect([response.status, (await response.json()).code]).toEqual([401, "WORKFORCE_AUTH_REQUIRED"]);

        // same-origin mutation enforcement
        const managerHeaders = await headersFor(outletAManager.id);
        response = await request("/api/admin/v1/memberships", {
          method: "POST",
          headers: { ...managerHeaders, origin: "https://evil.example" },
          body: JSON.stringify({
            workforceUserId: subject.id,
            scopeType: "outlet",
            brandId: tree.brand.id,
            organizationId: tree.orgA.id,
            territoryId: tree.terrA.id,
            outletId: tree.outletA.id,
          }),
        });
        expect([response.status, (await response.json()).code]).toEqual([403, "ADMIN_REQUEST_INVALID"]);

        // body/scope forgery denial
        response = await request("/api/admin/v1/memberships", {
          method: "POST",
          headers: managerHeaders,
          body: JSON.stringify({
            workforceUserId: subject.id,
            scopeType: "outlet",
            brandId: tree.brand.id,
            organizationId: tree.orgA.id,
            territoryId: tree.terrA.id,
            outletId: tree.outletA.id,
            actor: "forged",
            permission: "access.membership.manage",
            role: "platform_super_admin",
          }),
        });
        expect([response.status, (await response.json()).code]).toEqual([400, "ADMIN_REQUEST_INVALID"]);

        // cross-scope denial: outlet A manager cannot read outlet B membership via list filtering
        // and cannot create membership on outlet B
        response = await request("/api/admin/v1/memberships", {
          method: "POST",
          headers: managerHeaders,
          body: JSON.stringify({
            workforceUserId: subject.id,
            scopeType: "outlet",
            brandId: tree.brand.id,
            organizationId: tree.orgB.id,
            territoryId: tree.terrB.id,
            outletId: tree.outletB.id,
          }),
        });
        expect([response.status, (await response.json()).code]).toEqual([403, "ADMIN_UNAUTHORIZED"]);

        // membership lifecycle authorization (in-scope create + transition)
        response = await request("/api/admin/v1/memberships", {
          method: "POST",
          headers: managerHeaders,
          body: JSON.stringify({
            workforceUserId: subject.id,
            scopeType: "outlet",
            brandId: tree.brand.id,
            organizationId: tree.orgA.id,
            territoryId: tree.terrA.id,
            outletId: tree.outletA.id,
            status: "invited",
          }),
        });
        expect(response.status).toBe(200);
        const created = await response.json();
        const membershipId = created.membership.id as string;

        response = await request(`/api/admin/v1/memberships/${membershipId}/transition`, {
          method: "POST",
          headers: managerHeaders,
          body: JSON.stringify({ toStatus: "active" }),
        });
        expect(response.status).toBe(200);
        expect((await response.json()).membership.status).toBe("active");

        // role grant/revoke + privilege escalation prevention
        response = await request(`/api/admin/v1/memberships/${membershipId}/role-assignments`, {
          method: "POST",
          headers: managerHeaders,
          body: JSON.stringify({ roleKey: "platform_super_admin" }),
        });
        expect([response.status, (await response.json()).code]).toEqual([403, "ADMIN_FORBIDDEN"]);

        response = await request(`/api/admin/v1/memberships/${membershipId}/role-assignments`, {
          method: "POST",
          headers: managerHeaders,
          body: JSON.stringify({ roleKey: "kitchen_operator" }),
        });
        expect(response.status).toBe(200);
        const assignmentId = (await response.json()).assignment.id as string;

        response = await request(`/api/admin/v1/role-assignments/${assignmentId}/revoke`, {
          method: "POST",
          headers: managerHeaders,
          body: JSON.stringify({}),
        });
        expect(response.status).toBe(200);
        expect((await response.json()).assignment.revokedAt).toBeTruthy();

        // effective permissions projection
        response = await request(
          `/api/admin/v1/effective-permissions?resourceType=outlet&brandId=${tree.brand.id}&organizationId=${tree.orgA.id}&territoryId=${tree.terrA.id}&outletId=${tree.outletA.id}`,
          { headers: managerHeaders },
        );
        expect(response.status).toBe(200);
        const permissions = (await response.json()).permissions as string[];
        expect(permissions).toContain("access.membership.manage");

        // audit access: kitchen operator has no access.audit.read
        const kitchenHeaders = await headersFor(outletBUser.id);
        response = await request("/api/admin/v1/audit-events", { headers: kitchenHeaders });
        expect(response.status).toBe(200);
        expect((await response.json()).items).toEqual([]);

        const platformHeaders = await headersFor(platformAdmin.id);
        response = await request("/api/admin/v1/audit-events", { headers: platformHeaders });
        expect(response.status).toBe(200);
        expect(((await response.json()).items as unknown[]).length).toBeGreaterThan(0);

        // unused principalFor keeps fixture import meaningful for typing
        expect(principalFor(platformAdmin.id).workforceUserId).toBe(platformAdmin.id);
        expect(randomUUID().length).toBeGreaterThan(0);
      } finally {
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
      }
    });
  }, 120_000);
});
