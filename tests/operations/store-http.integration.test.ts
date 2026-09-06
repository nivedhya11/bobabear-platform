/** Store Operations HTTP transport integration (IMP-036E). */
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

import { serializeSignedCookie } from "better-call";
import { afterEach, describe, expect, it } from "vitest";
import { inject } from "vitest";

import {
  createMembership,
  grantRole,
} from "../../src/server/access-control";
import { getWorkforceAuthRuntime, WORKFORCE_AUTH_SESSION_COOKIE_NAME } from "../../src/server/auth/workforce";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import {
  configureOutletOperatingProfile,
  includeBrandVariant,
  replaceOutletOperatingSchedule,
} from "../../src/server/assortment";
import { routeOperationsRequest } from "../../src/server/operations/http/router";
import { getApplicationPersistence } from "../../src/server/persistence";
import { setOutletServiceabilityRoutingPriority } from "../../src/server/serviceability";
import type { WebConfig } from "../../src/platform/config";
import {
  createEligibleWorkforceUser,
  principalFor,
  seedBrandTree,
} from "../database/support/access-control-fixtures";
import { applyMigrations, withIsolatedTestDatabase } from "../database/support/test-database";
import { createActiveStandardVariant } from "../assortment-availability/support";
import {
  TEST_SERVICE_ORIGIN,
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
  return loadAuthFoundationConfig({
    CUSTOMER_AUTH_SECRET: "store-http-customer-auth-secret-32chars!",
    CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
    WORKFORCE_AUTH_SECRET: "store-http-workforce-auth-secret-32char",
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

describe("IMP-036E Store Operations HTTP", () => {
  it("enforces auth, origin, scope, assortment boundary, availability, operating, hours, serviceability, and team", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "stoe"));
      const platformAdmin = await createEligibleWorkforceUser(persistence);
      const outletAManager = await createEligibleWorkforceUser(persistence);
      const outletBManager = await createEligibleWorkforceUser(persistence);
      const brandAdmin = await createEligibleWorkforceUser(persistence);
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
          workforceUserId: outletBManager.id,
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

        const brandMembership = await createMembership(tx, {
          workforceUserId: brandAdmin.id,
          scope: { scopeType: "brand", brandId: tree.brand.id },
          status: "active",
        });
        await grantRole(tx, { membershipId: brandMembership.id, roleKey: "brand_admin" });
      });

      const psaActor = principalFor(platformAdmin.id);

      const catalog = await createActiveStandardVariant(
        persistence,
        psaActor,
        tree.brand.id,
        "stoe",
      );
      await persistence.transaction((tx) =>
        includeBrandVariant(tx, {
          actor: psaActor,
          brandId: tree.brand.id,
          variantId: catalog.variantId,
        }),
      );

      await persistence.transaction(async (tx) => {
        await configureOutletOperatingProfile(tx, {
          actor: psaActor,
          outletId: tree.outletA.id,
          timezone: "Asia/Kolkata",
        });
        await replaceOutletOperatingSchedule(tx, {
          actor: psaActor,
          outletId: tree.outletA.id,
          intervals: [
            { dayOfWeek: 1, startMinute: 600, endMinute: 900 },
            { dayOfWeek: 2, startMinute: 600, endMinute: 900 },
          ],
        });
      });

      await setOutletServiceabilityRoutingPriority(persistence, psaActor, {
        outletId: tree.outletA.id,
        routingPriority: 1,
        expectedRevision: null,
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
          "store-http-request",
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

      const outletPath = (outletId: string, suffix: string) =>
        `/api/operations/v1/outlets/${outletId}${suffix}`;

      try {
        // --- AUTH ---
        let response = await request(outletPath(tree.outletA.id, "/capabilities"));
        expect([response.status, (await response.json()).code]).toEqual([401, "WORKFORCE_AUTH_REQUIRED"]);

        response = await request(outletPath(tree.outletA.id, "/operating-state/pause"), {
          method: "POST",
          headers: {
            origin: workforceAuthConfig().workforce.baseURL.origin,
            "content-type": "application/json",
          },
          body: "{}",
        });
        expect([response.status, (await response.json()).code]).toEqual([401, "WORKFORCE_AUTH_REQUIRED"]);

        // --- ORIGIN ---
        const managerHeaders = await headersFor(outletAManager.id);
        response = await request(outletPath(tree.outletA.id, "/operating-state/pause"), {
          method: "POST",
          headers: { ...managerHeaders, origin: "https://evil.example" },
          body: "{}",
        });
        expect([response.status, (await response.json()).code]).toEqual([403, "STORE_REQUEST_INVALID"]);

        // --- SCOPE ---
        response = await request(outletPath(tree.outletB.id, "/capabilities"), {
          headers: managerHeaders,
        });
        if (response.status === 200) {
          const caps = (await response.json()).capabilities as Record<string, boolean>;
          expect(caps["availability.read"]).toBe(false);
          expect(caps["outlet.operating_state.read"]).toBe(false);
          expect(caps["outlet.operating_state.pause"]).toBe(false);
        } else {
          expect([403, 404]).toContain(response.status);
        }

        response = await request(outletPath(tree.outletB.id, "/availability"), {
          headers: managerHeaders,
        });
        expect([response.status, (await response.json()).code]).toEqual([403, "STORE_UNAUTHORIZED"]);

        response = await request(outletPath(tree.outletB.id, "/operating-state"), {
          headers: managerHeaders,
        });
        expect([response.status, (await response.json()).code]).toEqual([403, "STORE_UNAUTHORIZED"]);

        response = await request(outletPath(tree.outletB.id, "/operating-state/pause"), {
          method: "POST",
          headers: managerHeaders,
          body: "{}",
        });
        expect([response.status, (await response.json()).code]).toEqual([403, "STORE_UNAUTHORIZED"]);

        // --- CAPABILITIES + SESSION (global caps ≠ resource authority) ---
        response = await request(outletPath(tree.outletA.id, "/capabilities"), {
          headers: managerHeaders,
        });
        expect(response.status).toBe(200);
        const managerCaps = (await response.json()).capabilities as Record<string, boolean>;
        expect(managerCaps["outlet.operating_state.pause"]).toBe(true);
        expect(managerCaps["outlet.operating_state.suspend"]).toBe(false);
        expect(managerCaps["assortment.read"]).toBe(false);
        expect(managerCaps["assortment.manage"]).toBe(false);

        response = await request("/api/admin/v1/session", { headers: managerHeaders });
        expect(response.status).toBe(200);
        const sessionCaps = (await response.json()).session.capabilities as Record<string, boolean>;
        expect(sessionCaps["availability.read"]).toBe(true);

        response = await request(outletPath(tree.outletB.id, "/capabilities"), {
          headers: managerHeaders,
        });
        expect(response.status).toBe(200);
        const siblingCaps = (await response.json()).capabilities as Record<string, boolean>;
        expect(siblingCaps["availability.read"]).toBe(false);

        // --- FOUNDER A / ASSORTMENT ---
        const platformHeaders = await headersFor(platformAdmin.id);
        response = await request(outletPath(tree.outletA.id, "/assortment"), {
          headers: platformHeaders,
        });
        expect(response.status).toBe(200);
        const assortmentBody = await response.json();
        expect(assortmentBody.ok).toBe(true);
        expect(assortmentBody.brandId).toBe(tree.brand.id);
        expect(Array.isArray(assortmentBody.items)).toBe(true);

        const brandHeaders = await headersFor(brandAdmin.id);
        response = await request(outletPath(tree.outletA.id, "/assortment"), {
          headers: brandHeaders,
        });
        expect(response.status).toBe(200);

        response = await request(outletPath(tree.outletA.id, "/assortment"), {
          headers: managerHeaders,
        });
        expect([response.status, (await response.json()).code]).toEqual([403, "STORE_UNAUTHORIZED"]);

        response = await request(outletPath(tree.outletA.id, "/assortment"), {
          method: "POST",
          headers: platformHeaders,
          body: "{}",
        });
        expect([405, 404]).toContain(response.status);

        // --- AVAILABILITY ---
        response = await request(outletPath(tree.outletA.id, "/availability"), {
          headers: managerHeaders,
        });
        expect(response.status).toBe(200);
        const availabilityList = await response.json();
        expect(availabilityList.ok).toBe(true);
        expect(Array.isArray(availabilityList.items)).toBe(true);
        expect(
          (availabilityList.items as Array<{ id: string }>).some((i) => i.id === catalog.variantId),
        ).toBe(true);

        response = await request(
          outletPath(tree.outletA.id, `/availability/variants/${catalog.variantId}`),
          {
            method: "POST",
            headers: managerHeaders,
            body: JSON.stringify({ state: "temporarily_unavailable", unavailableUntil: null }),
          },
        );
        expect(response.status).toBe(200);
        expect((await response.json()).availability.effectiveState).toBe("temporarily_unavailable");

        response = await request(
          outletPath(tree.outletB.id, `/availability/variants/${catalog.variantId}`),
          {
            method: "POST",
            headers: managerHeaders,
            body: JSON.stringify({ state: "available" }),
          },
        );
        expect([response.status, (await response.json()).code]).toEqual([403, "STORE_UNAUTHORIZED"]);

        response = await request(outletPath(tree.outletA.id, "/availability"), {
          method: "POST",
          headers: managerHeaders,
          body: JSON.stringify({ state: "sold_out" }),
        });
        expect([404, 405]).toContain(response.status);

        const unknownModifierId = randomUUID();
        response = await request(
          outletPath(tree.outletA.id, `/availability/modifier-options/${unknownModifierId}`),
          { headers: managerHeaders },
        );
        // Domain synthesizes default availability when no row exists; must not 500.
        expect(response.status).not.toBe(500);
        if (response.status === 404) {
          expect((await response.json()).code).toBe("STORE_NOT_FOUND");
        } else {
          expect(response.status).toBe(200);
          expect((await response.json()).ok).toBe(true);
        }

        // --- OPERATING ---
        response = await request(outletPath(tree.outletA.id, "/operating-state"), {
          headers: managerHeaders,
        });
        expect(response.status).toBe(200);
        const operating = await response.json();
        expect(operating.ok).toBe(true);
        expect(operating.timezone).toBe("Asia/Kolkata");

        response = await request(outletPath(tree.outletA.id, "/operating-state/pause"), {
          method: "POST",
          headers: managerHeaders,
          body: "{}",
        });
        expect(response.status).toBe(200);
        expect((await response.json()).profile.controlState).toBe("paused");

        response = await request(outletPath(tree.outletA.id, "/operating-state/resume"), {
          method: "POST",
          headers: managerHeaders,
          body: "{}",
        });
        expect(response.status).toBe(200);
        expect((await response.json()).profile.controlState).toBe("accepting");

        response = await request(outletPath(tree.outletA.id, "/operating-state/suspend"), {
          method: "POST",
          headers: managerHeaders,
          body: "{}",
        });
        expect([response.status, (await response.json()).code]).toEqual([403, "STORE_UNAUTHORIZED"]);

        response = await request(outletPath(tree.outletA.id, "/operating-state/suspend"), {
          method: "POST",
          headers: platformHeaders,
          body: "{}",
        });
        expect(response.status).toBe(200);
        expect((await response.json()).profile.controlState).toBe("suspended");

        response = await request(outletPath(tree.outletA.id, "/operating-state/unsuspend"), {
          method: "POST",
          headers: platformHeaders,
          body: "{}",
        });
        expect(response.status).toBe(200);

        response = await request("/api/operations/v1/operational-status");
        expect([response.status, (await response.json()).code]).toEqual([401, "WORKFORCE_AUTH_REQUIRED"]);

        response = await request("/api/operations/v1/operational-status", {
          headers: platformHeaders,
        });
        expect(response.status).toBe(200);
        const statusBody = await response.json();
        expect(statusBody.service).toBe("operations");
        expect(statusBody.controlState).toBeUndefined();

        // --- HOURS ---
        response = await request(outletPath(tree.outletA.id, "/operating-profile"), {
          method: "POST",
          headers: managerHeaders,
          body: JSON.stringify({ timezone: "Not/A_Real_Zone" }),
        });
        expect([response.status, (await response.json()).code]).toEqual([400, "STORE_REQUEST_INVALID"]);

        response = await request(outletPath(tree.outletA.id, "/operating-schedule"), {
          method: "POST",
          headers: managerHeaders,
          body: JSON.stringify({
            intervals: [
              { dayOfWeek: 1, startMinute: 600, endMinute: 800 },
              { dayOfWeek: 1, startMinute: 700, endMinute: 900 },
            ],
          }),
        });
        expect([response.status, (await response.json()).code]).toEqual([400, "STORE_REQUEST_INVALID"]);

        response = await request(outletPath(tree.outletA.id, "/operating-schedule"), {
          method: "POST",
          headers: managerHeaders,
          body: JSON.stringify({ intervals: [] }),
        });
        expect([response.status, (await response.json()).code]).toEqual([400, "STORE_REQUEST_INVALID"]);

        // Closed Sunday (day 0 absent) is valid.
        response = await request(outletPath(tree.outletA.id, "/operating-schedule"), {
          method: "POST",
          headers: managerHeaders,
          body: JSON.stringify({
            intervals: [
              { dayOfWeek: 1, startMinute: 600, endMinute: 1200 },
              { dayOfWeek: 2, startMinute: 600, endMinute: 1200 },
              { dayOfWeek: 3, startMinute: 600, endMinute: 1200 },
              { dayOfWeek: 4, startMinute: 600, endMinute: 1200 },
              { dayOfWeek: 5, startMinute: 600, endMinute: 1200 },
              { dayOfWeek: 6, startMinute: 600, endMinute: 1200 },
            ],
          }),
        });
        expect(response.status).toBe(200);
        const schedule = await response.json();
        expect(schedule.intervals).toHaveLength(6);
        expect(
          (schedule.intervals as Array<{ dayOfWeek: number }>).some((i) => i.dayOfWeek === 0),
        ).toBe(false);

        response = await request(outletPath(tree.outletB.id, "/operating-schedule"), {
          method: "POST",
          headers: managerHeaders,
          body: JSON.stringify({
            intervals: [{ dayOfWeek: 1, startMinute: 600, endMinute: 900 }],
          }),
        });
        expect([response.status, (await response.json()).code]).toEqual([403, "STORE_UNAUTHORIZED"]);

        // --- SERVICEABILITY ---
        response = await request(outletPath(tree.outletA.id, "/serviceability"), {
          headers: managerHeaders,
        });
        expect(response.status).toBe(200);
        const svc = (await response.json()).serviceability as {
          revision: string | null;
          routingPriorityConfigured: boolean;
        };
        expect(svc.routingPriorityConfigured).toBe(true);
        expect(svc.revision).toBeTruthy();

        response = await request(outletPath(tree.outletA.id, "/serviceability/distance-policy"), {
          method: "POST",
          headers: managerHeaders,
          body: JSON.stringify({
            expectedRevision: svc.revision,
            serviceOriginLatitude: TEST_SERVICE_ORIGIN.latitude,
            serviceOriginLongitude: TEST_SERVICE_ORIGIN.longitude,
            maxServiceDistanceMeters: 9_000,
          }),
        });
        expect(response.status).toBe(200);
        const updatedSvc = (await response.json()).serviceability as {
          revision: string;
          maxServiceDistanceMeters: number;
          configured: boolean;
        };
        expect(updatedSvc.configured).toBe(true);
        expect(updatedSvc.maxServiceDistanceMeters).toBe(9_000);

        response = await request(outletPath(tree.outletA.id, "/serviceability/distance-policy"), {
          method: "POST",
          headers: managerHeaders,
          body: JSON.stringify({
            expectedRevision: svc.revision,
            serviceOriginLatitude: TEST_SERVICE_ORIGIN.latitude,
            serviceOriginLongitude: TEST_SERVICE_ORIGIN.longitude,
            maxServiceDistanceMeters: 8_000,
          }),
        });
        expect(response.status).toBe(409);
        expect((await response.json()).code).toBe("SERVICEABILITY_CONFIGURATION_CONFLICT");

        response = await request(outletPath(tree.outletA.id, "/serviceability/pins"), {
          method: "POST",
          headers: managerHeaders,
          body: JSON.stringify({ postalCodes: ["248001"], expectedRevision: updatedSvc.revision }),
        });
        expect(response.status).toBe(404);

        response = await request(
          outletPath(tree.outletA.id, "/serviceability/routing-priority"),
          {
            method: "POST",
            headers: managerHeaders,
            body: JSON.stringify({ routingPriority: 2, expectedRevision: updatedSvc.revision }),
          },
        );
        expect(response.status).toBe(404);

        // --- TEAM (admin memberships reuse) ---
        response = await request(
          `/api/admin/v1/memberships?outletId=${tree.outletA.id}`,
          { headers: managerHeaders },
        );
        expect(response.status).toBe(200);
        const membershipsA = (await response.json()).items as Array<{
          outletId: string | null;
          scopeType: string;
          workforceUserId: string;
        }>;
        expect(membershipsA.length).toBeGreaterThan(0);
        expect(membershipsA.every((m) => m.scopeType === "outlet" && m.outletId === tree.outletA.id)).toBe(
          true,
        );
        expect(membershipsA.some((m) => m.outletId === tree.outletB.id)).toBe(false);

        const siblingHeaders = await headersFor(outletBManager.id);
        response = await request(
          `/api/admin/v1/memberships?outletId=${tree.outletA.id}`,
          { headers: siblingHeaders },
        );
        expect([response.status, (await response.json()).code]).toEqual([403, "ADMIN_UNAUTHORIZED"]);

        response = await request(
          `/api/admin/v1/memberships?outletId=${tree.outletA.id}&foo=bar`,
          { headers: managerHeaders },
        );
        expect([response.status, (await response.json()).code]).toEqual([400, "ADMIN_REQUEST_INVALID"]);

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
      } finally {
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
      }
    });
  }, 120_000);
});
