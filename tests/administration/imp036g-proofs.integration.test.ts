/** IMP-036G focused administration proofs. */
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

import { serializeSignedCookie } from "better-call";
import { afterEach, describe, expect, it } from "vitest";
import { inject } from "vitest";

import {
  createMembership,
  grantRole,
  insertAccessAuditEvent,
} from "../../src/server/access-control";
import { getWorkforceAuthRuntime, WORKFORCE_AUTH_SESSION_COOKIE_NAME } from "../../src/server/auth/workforce";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import { routeOperationsRequest } from "../../src/server/operations/http/router";
import { getApplicationPersistence } from "../../src/server/persistence";
import { createBrand, updateBrand } from "../../src/server/organization";
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
    CUSTOMER_AUTH_SECRET: "admin-036g-customer-auth-secret-32chars!",
    CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
    WORKFORCE_AUTH_SECRET: "admin-036g-workforce-auth-secret-32char",
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

async function withAdminServer(
  databaseUrl: string,
  run: (ctx: {
    request: (path: string, init?: RequestInit) => Promise<Response>;
    headersFor: (userId: string) => Promise<Record<string, string>>;
    persistence: ReturnType<typeof getApplicationPersistence>;
  }) => Promise<void>,
) {
  const persistence = getApplicationPersistence(applicationConfig(databaseUrl));
  openHandles.push(persistence);
  const runtime = getWorkforceAuthRuntime({
    auth: workforceAuthConfig().workforce,
    persistence: applicationConfig(databaseUrl),
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
      "admin-036g-request",
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing test server address");
  const base = `http://127.0.0.1:${address.port}`;
  try {
    await run({
      request: (path, init) => fetch(`${base}${path}`, init),
      headersFor: async (userId) => {
        const session = await adapter.createSession(userId);
        return {
          cookie: await signedCookie(session.token),
          origin: workforceAuthConfig().workforce.baseURL.origin,
          "content-type": "application/json",
        };
      },
      persistence,
    });
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

describe("IMP-036G administration proofs", () => {
  it("pages brands beyond 50 with continuation and never falsely exhausts", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withAdminServer(database.connectionString, async ({ request, headersFor, persistence }) => {
        const platformAdmin = await createEligibleWorkforceUser(persistence);
        await persistence.transaction(async (tx) => {
          const platformMembership = await createMembership(tx, {
            workforceUserId: platformAdmin.id,
            scope: { scopeType: "platform" },
            status: "active",
          });
          await grantRole(tx, { membershipId: platformMembership.id, roleKey: "platform_super_admin" });
          for (let i = 0; i < 55; i += 1) {
            await createBrand(tx, {
              code: `brand-${String(i).padStart(3, "0")}`,
              name: `Brand ${String(i).padStart(3, "0")}`,
              actorWorkforceUserId: platformAdmin.id,
            });
          }
        });

        const headers = await headersFor(platformAdmin.id);
        const first = await request("/api/admin/v1/resources/brands", { headers });
        expect(first.status).toBe(200);
        const firstBody = await first.json();
        expect(firstBody.more).toBe(true);
        expect(firstBody.nextCursor).toBeTruthy();
        expect(firstBody.items).toHaveLength(50);

        const second = await request(
          `/api/admin/v1/resources/brands?cursor=${encodeURIComponent(firstBody.nextCursor)}`,
          { headers },
        );
        expect(second.status).toBe(200);
        const secondBody = await second.json();
        expect(secondBody.items.length).toBeGreaterThan(0);
        expect(secondBody.items[0].id).not.toBe(firstBody.items[0].id);
      });
    });
  }, 120_000);

  it("rejects stale hierarchy CAS updates with ADMIN_CONFLICT", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withAdminServer(database.connectionString, async ({ request, headersFor, persistence }) => {
        const platformAdmin = await createEligibleWorkforceUser(persistence);
        const tree = await persistence.transaction(async (tx) => {
          const platformMembership = await createMembership(tx, {
            workforceUserId: platformAdmin.id,
            scope: { scopeType: "platform" },
            status: "active",
          });
          await grantRole(tx, { membershipId: platformMembership.id, roleKey: "platform_super_admin" });
          return seedBrandTree(tx);
        });

        const headers = await headersFor(platformAdmin.id);
        const stale = await request(`/api/admin/v1/resources/brands/${tree.brand.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ name: "Stale name", expectedRevision: "999" }),
        });
        expect([stale.status, (await stale.json()).code]).toEqual([409, "ADMIN_CONFLICT"]);

        const ok = await request(`/api/admin/v1/resources/brands/${tree.brand.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            name: "Fresh name",
            expectedRevision: tree.brand.revision.toString(10),
          }),
        });
        expect(ok.status).toBe(200);
        expect((await ok.json()).item.revision).toBe("2");
      });
    });
  }, 120_000);

  it("supports concurrent CAS where only one writer wins", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);
      const tree = await persistence.transaction((tx) => seedBrandTree(tx));
      const expected = tree.brand.revision;
      const results = await Promise.allSettled([
        persistence.transaction((tx) =>
          updateBrand(tx, {
            brandId: tree.brand.id,
            expectedRevision: expected,
            name: "Writer A",
          }),
        ),
        persistence.transaction((tx) =>
          updateBrand(tx, {
            brandId: tree.brand.id,
            expectedRevision: expected,
            name: "Writer B",
          }),
        ),
      ]);
      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
    });
  }, 120_000);

  it("filters audit server-side and supports managed-subject EP + expire + overview ops auth", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withAdminServer(database.connectionString, async ({ request, headersFor, persistence }) => {
        const platformAdmin = await createEligibleWorkforceUser(persistence);
        const subject = await createEligibleWorkforceUser(persistence);
        let invitedMembershipId = "";
        const tree = await persistence.transaction(async (tx) => {
          const platformMembership = await createMembership(tx, {
            workforceUserId: platformAdmin.id,
            scope: { scopeType: "platform" },
            status: "active",
          });
          await grantRole(tx, { membershipId: platformMembership.id, roleKey: "platform_super_admin" });
          const seeded = await seedBrandTree(tx);
          const invited = await createMembership(tx, {
            workforceUserId: subject.id,
            scope: {
              scopeType: "outlet",
              brandId: seeded.brand.id,
              organizationId: seeded.orgA.id,
              territoryId: seeded.terrA.id,
              outletId: seeded.outletA.id,
            },
            status: "invited",
          });
          invitedMembershipId = invited.id;
          return seeded;
        });

        const platformHeaders = await headersFor(platformAdmin.id);

        // Expire invited → expired
        const expire = await request(`/api/admin/v1/memberships/${invitedMembershipId}/transition`, {
          method: "POST",
          headers: platformHeaders,
          body: JSON.stringify({ toStatus: "expired" }),
        });
        expect(expire.status).toBe(200);
        expect((await expire.json()).membership.status).toBe("expired");

        // Managed-subject EP
        const ep = await request(
          `/api/admin/v1/effective-permissions?membershipId=${invitedMembershipId}&resourceType=outlet&brandId=${tree.brand.id}&organizationId=${tree.orgA.id}&territoryId=${tree.terrA.id}&outletId=${tree.outletA.id}`,
          { headers: platformHeaders },
        );
        expect(ep.status).toBe(200);
        const epBody = await ep.json();
        expect(epBody.subject.membershipId).toBe(invitedMembershipId);
        expect(epBody.subject.workforceUserId).toBe(subject.id);
        expect(epBody.subject.memberLabel).toBeTruthy();
        expect(epBody.subject.memberLabel).not.toBe(platformAdmin.id);
        expect(Array.isArray(epBody.permissions)).toBe(true);

        // Audit filter by actor
        const audit = await request(
          `/api/admin/v1/audit-events?actorWorkforceUserId=${encodeURIComponent(platformAdmin.id)}`,
          { headers: platformHeaders },
        );
        expect(audit.status).toBe(200);
        const auditBody = await audit.json();
        expect(auditBody.more === true || auditBody.more === false).toBe(true);
        for (const event of auditBody.items as Array<{ actorWorkforceUserId: string | null }>) {
          expect(event.actorWorkforceUserId).toBe(platformAdmin.id);
        }

        // Audit filters: action + occurredFrom/To
        const now = Date.now();
        const actionAudit = await request(
          `/api/admin/v1/audit-events?action=${encodeURIComponent("membership.expired")}&occurredFrom=${encodeURIComponent(new Date(now - 60_000).toISOString())}&occurredTo=${encodeURIComponent(new Date(now + 60_000).toISOString())}`,
          { headers: platformHeaders },
        );
        expect(actionAudit.status).toBe(200);
        const actionBody = await actionAudit.json();
        expect(actionBody.items.length).toBeGreaterThan(0);
        for (const event of actionBody.items as Array<{ action: string; occurredAt: string }>) {
          expect(event.action).toBe("membership.expired");
          const at = Date.parse(event.occurredAt);
          expect(at).toBeGreaterThanOrEqual(now - 60_000);
          expect(at).toBeLessThanOrEqual(now + 60_000);
        }

        // Overview ops health: authenticated member without order.read → unauthorized
        const noOpsUser = await createEligibleWorkforceUser(persistence);
        await persistence.transaction(async (tx) => {
          await createMembership(tx, {
            workforceUserId: noOpsUser.id,
            scope: {
              scopeType: "outlet",
              brandId: tree.brand.id,
              organizationId: tree.orgA.id,
              territoryId: tree.terrA.id,
              outletId: tree.outletA.id,
            },
            status: "active",
          });
        });
        const noOpsHeaders = await headersFor(noOpsUser.id);
        const noOpsOverview = await request("/api/admin/v1/overview", { headers: noOpsHeaders });
        expect(noOpsOverview.status).toBe(200);
        const noOpsBody = await noOpsOverview.json();
        expect(noOpsBody.overview.operationalHealth.available).toBe(false);
        expect(noOpsBody.overview.operationalHealth.reason).toBe("unauthorized");

        const overview = await request("/api/admin/v1/overview", { headers: platformHeaders });
        expect(overview.status).toBe(200);
        const overviewBody = await overview.json();
        expect(overviewBody.overview.hierarchy.brands.count).toBeGreaterThan(0);
        expect(overviewBody.overview.operationalHealth.available).toBe(true);
        expect(overviewBody.overview.operationalHealth.status.service).toBe("operations");
        expect(overviewBody.overview.operationalHealth.status.queues).toBeTruthy();
        expect(randomUUID().length).toBeGreaterThan(0);
      });
    });
  }, 120_000);

  it("pages audit beyond 200 matching authorized events", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withAdminServer(database.connectionString, async ({ request, headersFor, persistence }) => {
        const platformAdmin = await createEligibleWorkforceUser(persistence);
        await persistence.transaction(async (tx) => {
          const platformMembership = await createMembership(tx, {
            workforceUserId: platformAdmin.id,
            scope: { scopeType: "platform" },
            status: "active",
          });
          await grantRole(tx, { membershipId: platformMembership.id, roleKey: "platform_super_admin" });
          const base = Date.now();
          for (let i = 0; i < 210; i += 1) {
            await insertAccessAuditEvent(tx, {
              actorWorkforceUserId: platformAdmin.id,
              action: "membership.created",
              targetType: "membership",
              targetId: `audit-scale-${i}`,
              scopeType: "platform",
              occurredAt: new Date(base - i * 1000),
              metadata: { i },
            });
          }
        });

        const headers = await headersFor(platformAdmin.id);
        let cursor: string | null = null;
        let seen = 0;
        let pages = 0;
        do {
          const path =
            cursor === null
              ? "/api/admin/v1/audit-events?action=membership.created"
              : `/api/admin/v1/audit-events?action=membership.created&cursor=${encodeURIComponent(cursor)}`;
          const response = await request(path, { headers });
          expect(response.status).toBe(200);
          const body = (await response.json()) as {
            items: unknown[];
            more: boolean;
            nextCursor: string | null;
          };
          expect(body.items.length).toBeGreaterThan(0);
          seen += body.items.length;
          cursor = body.more ? body.nextCursor : null;
          pages += 1;
          if (pages > 20) throw new Error("audit pagination did not terminate");
        } while (cursor);

        expect(seen).toBeGreaterThanOrEqual(210);
        expect(pages).toBeGreaterThan(1);
      });
    });
  }, 180_000);

  it("rejects managed-subject EP negatives and proves post-grant permission change", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withAdminServer(database.connectionString, async ({ request, headersFor, persistence }) => {
        const platformAdmin = await createEligibleWorkforceUser(persistence);
        const subject = await createEligibleWorkforceUser(persistence);
        const outsider = await createEligibleWorkforceUser(persistence);
        let membershipId = "";
        const tree = await persistence.transaction(async (tx) => {
          const platformMembership = await createMembership(tx, {
            workforceUserId: platformAdmin.id,
            scope: { scopeType: "platform" },
            status: "active",
          });
          await grantRole(tx, { membershipId: platformMembership.id, roleKey: "platform_super_admin" });
          const seeded = await seedBrandTree(tx);
          const membership = await createMembership(tx, {
            workforceUserId: subject.id,
            scope: {
              scopeType: "outlet",
              brandId: seeded.brand.id,
              organizationId: seeded.orgA.id,
              territoryId: seeded.terrA.id,
              outletId: seeded.outletA.id,
            },
            status: "active",
          });
          membershipId = membership.id;
          return seeded;
        });

        const platformHeaders = await headersFor(platformAdmin.id);
        const outsiderHeaders = await headersFor(outsider.id);

        const unauthorized = await request(
          `/api/admin/v1/effective-permissions?membershipId=${membershipId}&resourceType=outlet&brandId=${tree.brand.id}&organizationId=${tree.orgA.id}&territoryId=${tree.terrA.id}&outletId=${tree.outletA.id}`,
          { headers: outsiderHeaders },
        );
        expect([unauthorized.status, (await unauthorized.json()).code]).toEqual([
          403,
          "ADMIN_UNAUTHORIZED",
        ]);

        const invalidId = await request(
          `/api/admin/v1/effective-permissions?membershipId=${randomUUID()}&resourceType=outlet&brandId=${tree.brand.id}&organizationId=${tree.orgA.id}&territoryId=${tree.terrA.id}&outletId=${tree.outletA.id}`,
          { headers: platformHeaders },
        );
        expect([invalidId.status, (await invalidId.json()).code]).toEqual([404, "ADMIN_NOT_FOUND"]);

        const before = await request(
          `/api/admin/v1/effective-permissions?membershipId=${membershipId}&resourceType=outlet&brandId=${tree.brand.id}&organizationId=${tree.orgA.id}&territoryId=${tree.terrA.id}&outletId=${tree.outletA.id}`,
          { headers: platformHeaders },
        );
        expect(before.status).toBe(200);
        const beforeBody = await before.json();
        expect(beforeBody.subject.workforceUserId).toBe(subject.id);
        expect(beforeBody.subject.workforceUserId).not.toBe(platformAdmin.id);
        expect(beforeBody.subject.memberLabel).toBeTruthy();
        expect(beforeBody.permissions).not.toContain("order.read");

        const grant = await request(`/api/admin/v1/memberships/${membershipId}/role-assignments`, {
          method: "POST",
          headers: platformHeaders,
          body: JSON.stringify({ roleKey: "kitchen_operator" }),
        });
        expect(grant.status).toBe(200);

        const after = await request(
          `/api/admin/v1/effective-permissions?membershipId=${membershipId}&resourceType=outlet&brandId=${tree.brand.id}&organizationId=${tree.orgA.id}&territoryId=${tree.terrA.id}&outletId=${tree.outletA.id}`,
          { headers: platformHeaders },
        );
        expect(after.status).toBe(200);
        const afterBody = await after.json();
        expect(afterBody.subject.workforceUserId).toBe(subject.id);
        expect(afterBody.permissions).toContain("order.read");
      });
    });
  }, 120_000);

  it("protects GJ-PERMITTED-OUTLET-ACCESS continuity within ceiling and denies cross-scope", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withAdminServer(database.connectionString, async ({ request, headersFor, persistence }) => {
        const platformAdmin = await createEligibleWorkforceUser(persistence);
        const member = await createEligibleWorkforceUser(persistence);
        let membershipId = "";
        const tree = await persistence.transaction(async (tx) => {
          const platformMembership = await createMembership(tx, {
            workforceUserId: platformAdmin.id,
            scope: { scopeType: "platform" },
            status: "active",
          });
          await grantRole(tx, { membershipId: platformMembership.id, roleKey: "platform_super_admin" });
          return seedBrandTree(tx);
        });

        const platformHeaders = await headersFor(platformAdmin.id);
        const create = await request("/api/admin/v1/memberships", {
          method: "POST",
          headers: platformHeaders,
          body: JSON.stringify({
            workforceUserId: member.id,
            scopeType: "outlet",
            brandId: tree.brand.id,
            organizationId: tree.orgA.id,
            territoryId: tree.terrA.id,
            outletId: tree.outletA.id,
            status: "active",
          }),
        });
        expect(create.status).toBe(200);
        membershipId = (await create.json()).membership.id as string;

        const grant = await request(`/api/admin/v1/memberships/${membershipId}/role-assignments`, {
          method: "POST",
          headers: platformHeaders,
          body: JSON.stringify({ roleKey: "kitchen_operator" }),
        });
        expect(grant.status).toBe(200);

        const permitted = await request(
          `/api/admin/v1/effective-permissions?membershipId=${membershipId}&resourceType=outlet&brandId=${tree.brand.id}&organizationId=${tree.orgA.id}&territoryId=${tree.terrA.id}&outletId=${tree.outletA.id}`,
          { headers: platformHeaders },
        );
        expect(permitted.status).toBe(200);
        expect((await permitted.json()).permissions).toContain("order.read");

        const cross = await request(
          `/api/admin/v1/effective-permissions?membershipId=${membershipId}&resourceType=outlet&brandId=${tree.brand.id}&organizationId=${tree.orgB.id}&territoryId=${tree.terrB.id}&outletId=${tree.outletB.id}`,
          { headers: platformHeaders },
        );
        expect(cross.status).toBe(200);
        expect((await cross.json()).permissions).not.toContain("order.read");
      });
    });
  }, 120_000);

  it("rejects stale organization CAS updates via the same hierarchy path as brands", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withAdminServer(database.connectionString, async ({ request, headersFor, persistence }) => {
        const platformAdmin = await createEligibleWorkforceUser(persistence);
        const tree = await persistence.transaction(async (tx) => {
          const platformMembership = await createMembership(tx, {
            workforceUserId: platformAdmin.id,
            scope: { scopeType: "platform" },
            status: "active",
          });
          await grantRole(tx, { membershipId: platformMembership.id, roleKey: "platform_super_admin" });
          return seedBrandTree(tx);
        });

        const headers = await headersFor(platformAdmin.id);
        const stale = await request(`/api/admin/v1/resources/organizations/${tree.orgA.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ name: "Stale org", expectedRevision: "999" }),
        });
        expect([stale.status, (await stale.json()).code]).toEqual([409, "ADMIN_CONFLICT"]);

        const ok = await request(`/api/admin/v1/resources/organizations/${tree.orgA.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            name: "Fresh org",
            expectedRevision: tree.orgA.revision.toString(10),
          }),
        });
        expect(ok.status).toBe(200);
        expect((await ok.json()).item.revision).toBe("2");
      });
    });
  }, 120_000);
});
