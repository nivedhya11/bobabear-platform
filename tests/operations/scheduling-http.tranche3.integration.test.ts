/**
 * IMP-036I Tranche 3 — Outlet scheduling configuration HTTP.
 *
 * Proves the live Operations routes for scheduling profiles and
 * operating-date exceptions.
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
    CUSTOMER_AUTH_SECRET: "sched-http-customer-auth-secret-32c!",
    CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
    WORKFORCE_AUTH_SECRET: "sched-http-workforce-auth-secret-32c",
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

describe("IMP-036I Tranche 3 Outlet scheduling HTTP", () => {
  it("enforces schedule permissions, lead CAS, closures, and rejects outlet cutoff overrides", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "schd"));
      const managerA = await createEligibleWorkforceUser(persistence);
      const managerB = await createEligibleWorkforceUser(persistence);
      const kitchen = await createEligibleWorkforceUser(persistence);

      await persistence.transaction(async (tx) => {
        const membershipA = await createMembership(tx, {
          workforceUserId: managerA.id,
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
          workforceUserId: managerB.id,
          scope: {
            scopeType: "outlet",
            brandId: tree.brand.id,
            organizationId: tree.orgB.id,
            territoryId: tree.terrB.id,
            outletId: tree.outletB.id,
          },
          status: "active",
        });
        await grantRole(tx, { membershipId: membershipB.id, roleKey: "outlet_manager" });

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
          "scheduling-http",
        );
      });
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Missing test server address");
      const base = `http://127.0.0.1:${address.port}`;
      const outletPath = (outletId: string, suffix: string) =>
        `/api/operations/v1/outlets/${outletId}${suffix}`;

      const headersFor = async (userId: string) => {
        const session = await adapter.createSession(userId);
        return {
          cookie: await signedCookie(session.token),
          origin: workforceAuthConfig().workforce.baseURL.origin,
          "content-type": "application/json",
        };
      };

      try {
        const managerHeaders = await headersFor(managerA.id);
        const otherHeaders = await headersFor(managerB.id);
        const kitchenHeaders = await headersFor(kitchen.id);
        const profilePath = outletPath(tree.outletA.id, "/scheduling-profile");
        const exceptionPath = outletPath(tree.outletA.id, "/operating-date-exceptions");

        let response = await fetch(`${base}${profilePath}`);
        expect([response.status, (await response.json()).code]).toEqual([401, "WORKFORCE_AUTH_REQUIRED"]);

        response = await fetch(`${base}${profilePath}`, { headers: kitchenHeaders });
        expect(response.status).toBe(200);
        let profileBody = await response.json();
        expect(profileBody.configured).toBe(false);
        expect(profileBody.profile).toBeNull();

        response = await fetch(`${base}${profilePath}`, {
          method: "POST",
          headers: kitchenHeaders,
          body: JSON.stringify({
            pickupMinLeadMinutes: 30,
            deliveryMinLeadMinutes: 60,
            expectedRevision: 0,
          }),
        });
        expect([response.status, (await response.json()).code]).toEqual([403, "STORE_UNAUTHORIZED"]);

        response = await fetch(`${base}${profilePath}`, { headers: otherHeaders });
        expect([response.status, (await response.json()).code]).toEqual([403, "STORE_UNAUTHORIZED"]);

        response = await fetch(`${base}${profilePath}`, {
          method: "POST",
          headers: managerHeaders,
          body: JSON.stringify({
            pickupMinLeadMinutes: 30,
            deliveryMinLeadMinutes: 60,
            expectedRevision: 0,
            scheduledCancellationPolicy: { pickupCancellationCutoffMinutes: 10 },
          }),
        });
        expect(response.status).toBe(400);
        const cutoffRejected = await response.json();
        expect(cutoffRejected.code).toBe("STORE_REQUEST_INVALID");
        expect(cutoffRejected.message).toMatch(/Outlet override/);

        response = await fetch(`${base}${profilePath}`, { headers: managerHeaders });
        expect((await response.json()).configured).toBe(false);

        response = await fetch(`${base}${profilePath}`, {
          method: "POST",
          headers: managerHeaders,
          body: JSON.stringify({
            pickupMinLeadMinutes: 0,
            deliveryMinLeadMinutes: 60,
            expectedRevision: 0,
          }),
        });
        expect([response.status, (await response.json()).code]).toEqual([400, "STORE_REQUEST_INVALID"]);

        response = await fetch(`${base}${profilePath}`, {
          method: "POST",
          headers: managerHeaders,
          body: JSON.stringify({
            pickupMinLeadMinutes: 45,
            deliveryMinLeadMinutes: -5,
            expectedRevision: 0,
          }),
        });
        expect(response.status).toBe(400);

        response = await fetch(`${base}${profilePath}`, { headers: managerHeaders });
        expect((await response.json()).profile).toBeNull();

        response = await fetch(`${base}${profilePath}`, {
          method: "POST",
          headers: otherHeaders,
          body: JSON.stringify({
            pickupMinLeadMinutes: 45,
            deliveryMinLeadMinutes: 90,
            expectedRevision: 0,
          }),
        });
        expect([response.status, (await response.json()).code]).toEqual([403, "STORE_UNAUTHORIZED"]);

        response = await fetch(`${base}${profilePath}`, {
          method: "POST",
          headers: managerHeaders,
          body: JSON.stringify({
            pickupMinLeadMinutes: 45,
            deliveryMinLeadMinutes: 90,
            expectedRevision: 0,
          }),
        });
        expect(response.status).toBe(200);
        profileBody = await response.json();
        expect(profileBody.configured).toBe(true);
        expect(profileBody.profile).toMatchObject({
          pickupMinLeadMinutes: 45,
          deliveryMinLeadMinutes: 90,
          revision: "1",
        });

        response = await fetch(`${base}${profilePath}`, {
          method: "POST",
          headers: managerHeaders,
          body: JSON.stringify({
            pickupMinLeadMinutes: 15,
            deliveryMinLeadMinutes: 15,
            expectedRevision: 0,
          }),
        });
        expect([response.status, (await response.json()).code]).toEqual([409, "STORE_CONFLICT"]);

        response = await fetch(`${base}${profilePath}`, { headers: managerHeaders });
        profileBody = await response.json();
        expect(profileBody.profile.pickupMinLeadMinutes).toBe(45);
        expect(profileBody.profile.deliveryMinLeadMinutes).toBe(90);
        expect(profileBody.profile.revision).toBe("1");

        response = await fetch(`${base}${profilePath}`, {
          method: "POST",
          headers: managerHeaders,
          body: JSON.stringify({
            pickupMinLeadMinutes: 60,
            deliveryMinLeadMinutes: 120,
            expectedRevision: 1,
          }),
        });
        expect(response.status).toBe(200);
        profileBody = await response.json();
        expect(profileBody.profile).toMatchObject({
          pickupMinLeadMinutes: 60,
          deliveryMinLeadMinutes: 120,
          revision: "2",
        });

        response = await fetch(`${base}${exceptionPath}`, { headers: kitchenHeaders });
        expect(response.status).toBe(200);
        expect((await response.json()).exceptions).toEqual([]);

        response = await fetch(`${base}${exceptionPath}`, {
          method: "POST",
          headers: kitchenHeaders,
          body: JSON.stringify({ localDate: "2026-12-31", exceptionKind: "CLOSED_FULL_DAY" }),
        });
        expect([response.status, (await response.json()).code]).toEqual([403, "STORE_UNAUTHORIZED"]);

        response = await fetch(`${base}${exceptionPath}`, {
          method: "POST",
          headers: otherHeaders,
          body: JSON.stringify({ localDate: "2026-12-31", exceptionKind: "CLOSED_FULL_DAY" }),
        });
        expect([response.status, (await response.json()).code]).toEqual([403, "STORE_UNAUTHORIZED"]);

        response = await fetch(`${base}${exceptionPath}`, {
          method: "POST",
          headers: managerHeaders,
          body: JSON.stringify({
            localDate: "2026-12-31",
            exceptionKind: "REDUCED_HOURS",
          }),
        });
        expect(response.status).toBe(400);
        expect((await response.json()).message).toMatch(/CLOSED_FULL_DAY/);

        response = await fetch(`${base}${exceptionPath}`, {
          method: "POST",
          headers: managerHeaders,
          body: JSON.stringify({
            localDate: "2026-12-31",
            exceptionKind: "CLOSED_FULL_DAY",
            pickupCancellationCutoffMinutes: 10,
          }),
        });
        expect(response.status).toBe(400);
        expect((await response.json()).message).toMatch(/Outlet override/);

        response = await fetch(`${base}${exceptionPath}`, {
          method: "POST",
          headers: managerHeaders,
          body: JSON.stringify({
            localDate: "2026-12-31",
            exceptionKind: "CLOSED_FULL_DAY",
          }),
        });
        expect(response.status).toBe(200);
        const created = await response.json();
        expect(created.exception).toMatchObject({
          localDate: "2026-12-31",
          exceptionKind: "CLOSED_FULL_DAY",
        });

        response = await fetch(`${base}${exceptionPath}`, {
          method: "POST",
          headers: managerHeaders,
          body: JSON.stringify({
            localDate: "2026-12-31",
            exceptionKind: "CLOSED_FULL_DAY",
          }),
        });
        expect([response.status, (await response.json()).code]).toEqual([409, "STORE_CONFLICT"]);

        response = await fetch(`${base}${outletPath(tree.outletA.id, "/operating-profile")}`, {
          method: "POST",
          headers: managerHeaders,
          body: JSON.stringify({ timezone: "Asia/Kolkata" }),
        });
        expect(response.status).toBe(200);

        const pauseUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        response = await fetch(`${base}${outletPath(tree.outletA.id, "/operating-state/pause")}`, {
          method: "POST",
          headers: managerHeaders,
          body: JSON.stringify({ pausedUntil: pauseUntil }),
        });
        expect(response.status).toBe(200);

        response = await fetch(`${base}${exceptionPath}`, { headers: managerHeaders });
        expect(response.status).toBe(200);
        const exceptions = (await response.json()).exceptions as Array<{
          localDate: string;
          exceptionKind: string;
        }>;
        expect(exceptions).toEqual([
          expect.objectContaining({
            localDate: "2026-12-31",
            exceptionKind: "CLOSED_FULL_DAY",
          }),
        ]);
        expect(exceptions.some((row) => row.localDate !== "2026-12-31")).toBe(false);
      } finally {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
      }
    });
  });
});
