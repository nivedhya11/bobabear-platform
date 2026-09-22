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
import {
  adminListAllBrands,
  adminListAllMemberships,
  adminListAllOutlets,
  adminListBrands,
  adminListOutlets,
} from "../../src/server/administration";
import { getWorkforceAuthRuntime, WORKFORCE_AUTH_SESSION_COOKIE_NAME } from "../../src/server/auth/workforce";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import { routeOperationsRequest } from "../../src/server/operations/http/router";
import { getApplicationPersistence } from "../../src/server/persistence";
import {
  createBrand,
  createLegalEntity,
  createOrganization,
  createOutlet,
  createTerritory,
  updateBrand,
} from "../../src/server/organization";
import type { WebConfig } from "../../src/platform/config";
import type { WorkerHealthReporter } from "../../src/platform/observability/worker-health";
import {
  createEligibleWorkforceUser,
  principalFor,
  seedBrandTree,
} from "../database/support/access-control-fixtures";
import { applyMigrations, withIsolatedTestDatabase } from "../database/support/test-database";
import { headersWithAccessMutationStepUp } from "./support/workforce-step-up";

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

/**
 * Ops runtime identity the router threads into both the Ops status route and
 * the Admin overview composition. Omitted by default so existing proofs keep
 * exercising the no-runtime path.
 */
type OpsRuntimeDeps = Readonly<{
  serviceName?: string;
  startedAt?: Date;
  workers?: readonly WorkerHealthReporter[];
}>;

async function withAdminServer(
  databaseUrl: string,
  run: (ctx: {
    request: (path: string, init?: RequestInit) => Promise<Response>;
    headersFor: (userId: string) => Promise<Record<string, string>>;
    withAccessStepUp: (
      userId: string,
      headers: Record<string, string>,
    ) => Promise<Record<string, string>>;
    persistence: ReturnType<typeof getApplicationPersistence>;
  }) => Promise<void>,
  opsRuntime: OpsRuntimeDeps = {},
) {
  const persistence = getApplicationPersistence(applicationConfig(databaseUrl));
  openHandles.push(persistence);
  const runtime = getWorkforceAuthRuntime({
    auth: workforceAuthConfig().workforce,
    persistence: applicationConfig(databaseUrl),
  });
  openHandles.push(runtime);
  const adapter = await adapterFor(runtime);
  const stepUpSecret = workforceAuthConfig().workforce.secret;
  const server = createServer((req, res) => {
    void routeOperationsRequest(
      req,
      res,
      {
        runtime,
        persistence,
        trustedOrigin: workforceAuthConfig().workforce.baseURL.origin,
        stepUpSessionHashSecret: stepUpSecret,
        ...(opsRuntime.serviceName ? { serviceName: opsRuntime.serviceName } : {}),
        ...(opsRuntime.startedAt ? { startedAt: opsRuntime.startedAt } : {}),
        ...(opsRuntime.workers ? { workers: opsRuntime.workers } : {}),
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
      withAccessStepUp: (userId, headers) =>
        headersWithAccessMutationStepUp({
          persistence,
          sessionHashSecret: stepUpSecret,
          workforceUserId: userId,
          headers,
        }),
      persistence,
    });
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

type Persistence = ReturnType<typeof getApplicationPersistence>;

/** Platform-scoped actor holding `platform_super_admin` (unrestricted eligible set). */
async function createPlatformAdmin(
  persistence: Persistence,
): Promise<{ id: string; membershipId: string }> {
  const user = await createEligibleWorkforceUser(persistence);
  const membershipId = await persistence.transaction(async (tx) => {
    const membership = await createMembership(tx, {
      workforceUserId: user.id,
      scope: { scopeType: "platform" },
      status: "active",
    });
    await grantRole(tx, { membershipId: membership.id, roleKey: "platform_super_admin" });
    return membership.id;
  });
  return { id: user.id, membershipId };
}

type OutletBranch = Readonly<{
  brandId: string;
  organizationId: string;
  territoryId: string;
  legalEntityId: string;
}>;

/** Minimal brand → org → territory → legal-entity chain an outlet can hang from. */
async function seedOutletBranch(
  persistence: Persistence,
  label: string,
): Promise<OutletBranch> {
  return persistence.transaction(async (tx) => {
    const brand = await createBrand(tx, { code: `${label}-brand`, name: `Brand ${label}` });
    const organization = await createOrganization(tx, {
      brandId: brand.id,
      code: `${label}-org`,
      name: `Organization ${label}`,
    });
    const territory = await createTerritory(tx, {
      brandId: brand.id,
      code: `${label}-terr`,
      name: `Territory ${label}`,
    });
    const legalEntity = await createLegalEntity(tx, {
      brandId: brand.id,
      organizationId: organization.id,
      code: `${label}-le`,
      name: `Legal Entity ${label}`,
    });
    return {
      brandId: brand.id,
      organizationId: organization.id,
      territoryId: territory.id,
      legalEntityId: legalEntity.id,
    };
  });
}

/** Names are zero-padded so keyset ordering (name, id) is deterministic. */
async function seedOutlets(
  persistence: Persistence,
  branch: OutletBranch,
  label: string,
  count: number,
): Promise<string[]> {
  return persistence.transaction(async (tx) => {
    const created: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const suffix = String(index).padStart(3, "0");
      const outlet = await createOutlet(tx, {
        ...branch,
        code: `${label}-out-${suffix}`,
        name: `${label} Outlet ${suffix}`,
      });
      created.push(outlet.id);
    }
    return created;
  });
}

/** Drain a continuation endpoint the way an honest HTTP client must. */
async function drainHttpPages(
  request: (path: string, init?: RequestInit) => Promise<Response>,
  headers: Record<string, string>,
  path: string,
): Promise<{ items: Array<Record<string, unknown>>; pages: number; firstPageMore: boolean }> {
  const items: Array<Record<string, unknown>> = [];
  let cursor: string | null = null;
  let pages = 0;
  let firstPageMore = false;
  do {
    const separator = path.includes("?") ? "&" : "?";
    const url = cursor === null ? path : `${path}${separator}cursor=${encodeURIComponent(cursor)}`;
    const response = await request(url, { headers });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      items: Array<Record<string, unknown>>;
      more: boolean;
      nextCursor: string | null;
    };
    if (pages === 0) firstPageMore = body.more;
    items.push(...body.items);
    cursor = body.more ? body.nextCursor : null;
    pages += 1;
    if (pages > 25) throw new Error(`continuation did not terminate for ${path}`);
  } while (cursor);
  return { items, pages, firstPageMore };
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
      await withAdminServer(database.connectionString, async ({ request, headersFor, withAccessStepUp, persistence }) => {
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
          headers: await withAccessStepUp(platformAdmin.id, platformHeaders),
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
      await withAdminServer(database.connectionString, async ({ request, headersFor, withAccessStepUp, persistence }) => {
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
          headers: await withAccessStepUp(platformAdmin.id, platformHeaders),
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
      await withAdminServer(database.connectionString, async ({ request, headersFor, withAccessStepUp, persistence }) => {
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
          headers: await withAccessStepUp(platformAdmin.id, platformHeaders),
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
          headers: await withAccessStepUp(platformAdmin.id, platformHeaders),
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

  it("drains eligible brands and outlets past the 50-row page for trusted server callers", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      const admin = await createPlatformAdmin(persistence);
      const principal = principalFor(admin.id);

      const branch = await seedOutletBranch(persistence, "legacy");
      const outletIds = await seedOutlets(persistence, branch, "Legacy", 55);
      await persistence.transaction(async (tx) => {
        for (let index = 0; index < 55; index += 1) {
          const suffix = String(index).padStart(3, "0");
          await createBrand(tx, {
            code: `legacy-brand-${suffix}`,
            name: `Legacy Brand ${suffix}`,
          });
        }
      });

      // Exhaustive trusted-server traversal: the whole eligible set, not one page.
      const allOutlets = await adminListAllOutlets(persistence, principal);
      expect(allOutlets.map((outlet) => outlet.id).sort()).toEqual([...outletIds].sort());
      const allBrands = await adminListAllBrands(persistence, principal);
      // 55 noise brands plus the brand the outlet branch hangs from.
      expect(allBrands).toHaveLength(56);
      expect(new Set(allBrands.map((brand) => brand.id)).size).toBe(56);

      // A single page still reports honestly that more remains.
      const firstOutlets = await adminListOutlets(persistence, principal, {});
      expect(firstOutlets.items).toHaveLength(50);
      expect(firstOutlets.more).toBe(true);
      expect(firstOutlets.nextCursor).toBeTruthy();

      const secondOutlets = await adminListOutlets(persistence, principal, {
        cursor: firstOutlets.nextCursor!,
      });
      expect(secondOutlets.items).toHaveLength(5);
      expect(secondOutlets.more).toBe(false);
      expect(secondOutlets.nextCursor).toBeNull();
      const firstPageIds = new Set(firstOutlets.items.map((outlet) => outlet.id));
      for (const outlet of secondOutlets.items) {
        expect(firstPageIds.has(outlet.id)).toBe(false);
      }
      expect(secondOutlets.items[0]!.name > firstOutlets.items[49]!.name).toBe(true);

      const firstBrands = await adminListBrands(persistence, principal, {});
      expect(firstBrands.items).toHaveLength(50);
      expect(firstBrands.more).toBe(true);
    });
  }, 180_000);

  it("returns only authorized outlets across every page for a brand-scoped actor at scale", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withAdminServer(database.connectionString, async ({ request, headersFor, persistence }) => {
        const platformAdmin = await createPlatformAdmin(persistence);
        const brandActor = await createEligibleWorkforceUser(persistence);

        const authorized = await seedOutletBranch(persistence, "auth");
        const foreignA = await seedOutletBranch(persistence, "foreign-a");
        const foreignB = await seedOutletBranch(persistence, "foreign-b");

        // Brands the actor must never see even though they page ahead of / behind it.
        await persistence.transaction(async (tx) => {
          for (let index = 0; index < 80; index += 1) {
            const suffix = String(index).padStart(3, "0");
            await createBrand(tx, {
              code: `noise-brand-${suffix}`,
              name: `Noise Brand ${suffix}`,
            });
          }
        });

        const authorizedOutletIds = await seedOutlets(persistence, authorized, "Authorized", 55);
        const foreignOutletIds = [
          ...(await seedOutlets(persistence, foreignA, "Foreign A", 30)),
          ...(await seedOutlets(persistence, foreignB, "Foreign B", 30)),
        ];

        await persistence.transaction(async (tx) => {
          const membership = await createMembership(tx, {
            workforceUserId: brandActor.id,
            scope: { scopeType: "brand", brandId: authorized.brandId },
            status: "active",
          });
          await grantRole(tx, { membershipId: membership.id, roleKey: "brand_admin" });
        });

        const actorHeaders = await headersFor(brandActor.id);

        // brand_admin holds brand.read exactly on its own brand — 83 brands exist.
        const brands = await drainHttpPages(
          request,
          actorHeaders,
          "/api/admin/v1/resources/brands",
        );
        expect(brands.items.map((brand) => brand.id)).toEqual([authorized.brandId]);
        expect(brands.pages).toBe(1);
        expect(brands.firstPageMore).toBe(false);

        const outlets = await drainHttpPages(
          request,
          actorHeaders,
          "/api/admin/v1/resources/outlets",
        );
        expect(outlets.firstPageMore).toBe(true);
        expect(outlets.pages).toBeGreaterThan(1);
        const seen = outlets.items.map((outlet) => String(outlet.id));
        expect(new Set(seen).size).toBe(55);
        expect([...seen].sort()).toEqual([...authorizedOutletIds].sort());
        for (const foreign of foreignOutletIds) {
          expect(seen).not.toContain(foreign);
        }

        // The foreign rows are present in the database and filtered by the
        // eligible-set predicate, not simply absent.
        const platformHeaders = await headersFor(platformAdmin.id);
        const everything = await drainHttpPages(
          request,
          platformHeaders,
          "/api/admin/v1/resources/outlets",
        );
        expect(everything.items).toHaveLength(115);
        expect(everything.pages).toBeGreaterThan(2);
      });
    });
  }, 180_000);

  it("composes Admin overview operational health from the Ops runtime dependencies", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);

      // Without runtime deps the projection reports a fresh process and no workers.
      await withAdminServer(database.connectionString, async ({ request, headersFor, persistence }) => {
        const admin = await createPlatformAdmin(persistence);
        const overview = await request("/api/admin/v1/overview", {
          headers: await headersFor(admin.id),
        });
        expect(overview.status).toBe(200);
        const health = (await overview.json()).overview.operationalHealth;
        expect(health.available).toBe(true);
        expect(health.status.workers).toEqual([]);
        expect(health.status.uptimeSeconds).toBeLessThanOrEqual(2);
      });

      const startedAt = new Date(Date.now() - 90_000);
      const snapshot = {
        name: "notifications",
        running: true,
        stopped: false,
        lastTickAt: new Date(Date.now() - 1_000).toISOString(),
      };
      const workers: readonly WorkerHealthReporter[] = [
        { getHealthSnapshot: () => snapshot },
      ];

      await withAdminServer(
        database.connectionString,
        async ({ request, headersFor, persistence }) => {
          const admin = await createPlatformAdmin(persistence);
          const headers = await headersFor(admin.id);

          const opsResponse = await request("/api/operations/v1/operational-status", { headers });
          expect(opsResponse.status).toBe(200);
          const ops = await opsResponse.json();

          const overviewResponse = await request("/api/admin/v1/overview", { headers });
          expect(overviewResponse.status).toBe(200);
          const health = (await overviewResponse.json()).overview.operationalHealth;

          expect(health.available).toBe(true);
          expect(health.status.service).toBe(ops.service);
          expect(health.status.service).toBe("operations");
          // Runtime startedAt is threaded through, so uptime is real, not ~0.
          expect(health.status.uptimeSeconds).toBeGreaterThanOrEqual(80);
          expect(ops.uptimeSeconds).toBeGreaterThanOrEqual(80);
          expect(Math.abs(health.status.uptimeSeconds - ops.uptimeSeconds)).toBeLessThanOrEqual(2);
          expect(health.status.workers).toEqual([snapshot]);
          expect(health.status.workers).toEqual(ops.workers);
          expect(Object.keys(health.status.queues).sort()).toEqual(Object.keys(ops.queues).sort());
          expect(health.status.queues).toEqual(ops.queues);
          expect(health.status.metrics).toBeTruthy();
        },
        { startedAt, workers },
      );
    });
  }, 120_000);

  it("closes empty-set, not-found, illegal-transition, self-deny, stale-revoke, and empty-audit paths", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withAdminServer(database.connectionString, async ({ request, headersFor, withAccessStepUp, persistence }) => {
        const platformAdmin = await createPlatformAdmin(persistence);
        const subject = await createEligibleWorkforceUser(persistence);
        const mover = await createEligibleWorkforceUser(persistence);
        const kitchen = await createEligibleWorkforceUser(persistence);
        let subjectMembershipId = "";
        let moverMembershipId = "";
        const tree = await persistence.transaction(async (tx) => {
          const seeded = await seedBrandTree(tx);
          const outletAScope = {
            scopeType: "outlet" as const,
            brandId: seeded.brand.id,
            organizationId: seeded.orgA.id,
            territoryId: seeded.terrA.id,
            outletId: seeded.outletA.id,
          };
          const outletBScope = {
            scopeType: "outlet" as const,
            brandId: seeded.brand.id,
            organizationId: seeded.orgB.id,
            territoryId: seeded.terrB.id,
            outletId: seeded.outletB.id,
          };
          subjectMembershipId = (
            await createMembership(tx, {
              workforceUserId: subject.id,
              scope: outletAScope,
              status: "active",
            })
          ).id;
          moverMembershipId = (
            await createMembership(tx, {
              workforceUserId: mover.id,
              scope: outletBScope,
              status: "active",
            })
          ).id;
          const kitchenMembership = await createMembership(tx, {
            workforceUserId: kitchen.id,
            scope: outletBScope,
            status: "active",
          });
          await grantRole(tx, {
            membershipId: kitchenMembership.id,
            roleKey: "kitchen_operator",
          });
          return seeded;
        });

        const platformHeaders = await headersFor(platformAdmin.id);
        const kitchenHeaders = await headersFor(kitchen.id);

        // AC-002-06 — authorized request, empty eligible set: kitchen_operator
        // carries no brand.read, so the page is empty and truthfully exhausted.
        const emptyBrands = await request("/api/admin/v1/resources/brands", {
          headers: kitchenHeaders,
        });
        expect(emptyBrands.status).toBe(200);
        const emptyBrandsBody = await emptyBrands.json();
        expect(emptyBrandsBody.items).toEqual([]);
        expect(emptyBrandsBody.more).toBe(false);
        expect(emptyBrandsBody.nextCursor).toBeNull();

        // AC-002-08 — detail not found for every resource kind.
        for (const kind of [
          "brands",
          "organizations",
          "territories",
          "legal-entities",
          "outlets",
        ]) {
          const missing = await request(`/api/admin/v1/resources/${kind}/${randomUUID()}`, {
            headers: platformHeaders,
          });
          expect([kind, missing.status, (await missing.json()).code]).toEqual([
            kind,
            404,
            "ADMIN_NOT_FOUND",
          ]);
        }

        // AC-005-09 — stale revoke: the same assignment cannot be revoked twice.
        const grant = await request(
          `/api/admin/v1/memberships/${subjectMembershipId}/role-assignments`,
          {
            method: "POST",
            headers: await withAccessStepUp(platformAdmin.id, platformHeaders),
            body: JSON.stringify({ roleKey: "kitchen_operator" }),
          },
        );
        expect(grant.status).toBe(200);
        const assignmentId = (await grant.json()).assignment.id as string;
        const firstRevoke = await request(
          `/api/admin/v1/role-assignments/${assignmentId}/revoke`,
          {
            method: "POST",
            headers: await withAccessStepUp(platformAdmin.id, platformHeaders),
            body: JSON.stringify({}),
          },
        );
        expect(firstRevoke.status).toBe(200);
        const staleRevoke = await request(
          `/api/admin/v1/role-assignments/${assignmentId}/revoke`,
          {
            method: "POST",
            headers: await withAccessStepUp(platformAdmin.id, platformHeaders),
            body: JSON.stringify({}),
          },
        );
        expect([staleRevoke.status, (await staleRevoke.json()).code]).toEqual([
          400,
          "ADMIN_REQUEST_INVALID",
        ]);
        const unknownRevoke = await request(
          `/api/admin/v1/role-assignments/${randomUUID()}/revoke`,
          {
            method: "POST",
            headers: await withAccessStepUp(platformAdmin.id, platformHeaders),
            body: JSON.stringify({}),
          },
        );
        expect([unknownRevoke.status, (await unknownRevoke.json()).code]).toEqual([
          404,
          "ADMIN_NOT_FOUND",
        ]);

        // AC-004-10 — illegal transitions are rejected by the domain, not the UI.
        const activeToExpired = await request(
          `/api/admin/v1/memberships/${moverMembershipId}/transition`,
          {
            method: "POST",
            headers: await withAccessStepUp(platformAdmin.id, platformHeaders),
            body: JSON.stringify({ toStatus: "expired" }),
          },
        );
        expect([activeToExpired.status, (await activeToExpired.json()).code]).toEqual([
          400,
          "ADMIN_REQUEST_INVALID",
        ]);

        const revokeMover = await request(
          `/api/admin/v1/memberships/${moverMembershipId}/transition`,
          {
            method: "POST",
            headers: await withAccessStepUp(platformAdmin.id, platformHeaders),
            body: JSON.stringify({ toStatus: "revoked" }),
          },
        );
        expect(revokeMover.status).toBe(200);
        for (const toStatus of ["active", "suspended", "expired"]) {
          const fromTerminal = await request(
            `/api/admin/v1/memberships/${moverMembershipId}/transition`,
            {
              method: "POST",
              headers: await withAccessStepUp(platformAdmin.id, platformHeaders),
              body: JSON.stringify({ toStatus }),
            },
          );
          expect([toStatus, fromTerminal.status, (await fromTerminal.json()).code]).toEqual([
            toStatus,
            400,
            "ADMIN_REQUEST_INVALID",
          ]);
        }

        // AC-004-11 — the actor may not act on their own membership or grants.
        const selfTransition = await request(
          `/api/admin/v1/memberships/${platformAdmin.membershipId}/transition`,
          {
            method: "POST",
            headers: await withAccessStepUp(platformAdmin.id, platformHeaders),
            body: JSON.stringify({ toStatus: "suspended" }),
          },
        );
        expect([selfTransition.status, (await selfTransition.json()).code]).toEqual([
          403,
          "ADMIN_FORBIDDEN",
        ]);

        const selfCreate = await request("/api/admin/v1/memberships", {
          method: "POST",
          headers: await withAccessStepUp(platformAdmin.id, platformHeaders),
          body: JSON.stringify({
            workforceUserId: platformAdmin.id,
            scopeType: "brand",
            brandId: tree.brand.id,
          }),
        });
        expect([selfCreate.status, (await selfCreate.json()).code]).toEqual([
          403,
          "ADMIN_FORBIDDEN",
        ]);

        const selfGrant = await request(
          `/api/admin/v1/memberships/${platformAdmin.membershipId}/role-assignments`,
          {
            method: "POST",
            headers: await withAccessStepUp(platformAdmin.id, platformHeaders),
            body: JSON.stringify({ roleKey: "platform_super_admin" }),
          },
        );
        expect([selfGrant.status, (await selfGrant.json()).code]).toEqual([
          403,
          "ADMIN_FORBIDDEN",
        ]);

        // AC-007-02 — authorized audit reader whose filtered event set is empty.
        const futureFrom = new Date(Date.now() + 86_400_000).toISOString();
        const futureAudit = await request(
          `/api/admin/v1/audit-events?occurredFrom=${encodeURIComponent(futureFrom)}`,
          { headers: platformHeaders },
        );
        expect(futureAudit.status).toBe(200);
        const futureAuditBody = await futureAudit.json();
        expect(futureAuditBody.items).toEqual([]);
        expect(futureAuditBody.more).toBe(false);
        expect(futureAuditBody.nextCursor).toBeNull();

        const unmatchedAudit = await request(
          "/api/admin/v1/audit-events?action=brand.updated",
          { headers: platformHeaders },
        );
        expect(unmatchedAudit.status).toBe(200);
        const unmatchedAuditBody = await unmatchedAudit.json();
        expect(unmatchedAuditBody.items).toEqual([]);
        expect(unmatchedAuditBody.more).toBe(false);
        expect(unmatchedAuditBody.nextCursor).toBeNull();
      });
    });
  }, 180_000);

  it("creates, updates, deactivates, and reactivates hierarchy resources with no hard delete", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withAdminServer(database.connectionString, async ({ request, headersFor, persistence }) => {
        const admin = await createPlatformAdmin(persistence);
        const headers = await headersFor(admin.id);
        const send = async (
          method: "POST" | "PATCH",
          path: string,
          body: Record<string, unknown>,
        ) => {
          const response = await request(path, {
            method,
            headers,
            body: JSON.stringify(body),
          });
          return { status: response.status, body: await response.json() };
        };

        // AC-003-01 — create down the whole hierarchy.
        const brand = await send("POST", "/api/admin/v1/resources/brands", {
          code: "lifecycle-brand",
          name: "Lifecycle Brand",
        });
        expect(brand.status).toBe(200);
        expect(brand.body.item.status).toBe("active");
        expect(brand.body.item.revision).toBe("1");

        const organization = await send("POST", "/api/admin/v1/resources/organizations", {
          brandId: brand.body.item.id,
          code: "lifecycle-org",
          name: "Lifecycle Organization",
        });
        expect(organization.status).toBe(200);

        const territory = await send("POST", "/api/admin/v1/resources/territories", {
          brandId: brand.body.item.id,
          code: "lifecycle-terr",
          name: "Lifecycle Territory",
        });
        expect(territory.status).toBe(200);

        const legalEntity = await send("POST", "/api/admin/v1/resources/legal-entities", {
          brandId: brand.body.item.id,
          organizationId: organization.body.item.id,
          code: "lifecycle-le",
          name: "Lifecycle Legal Entity",
        });
        expect(legalEntity.status).toBe(200);

        const outlet = await send("POST", "/api/admin/v1/resources/outlets", {
          brandId: brand.body.item.id,
          organizationId: organization.body.item.id,
          territoryId: territory.body.item.id,
          legalEntityId: legalEntity.body.item.id,
          code: "lifecycle-out",
          name: "Lifecycle Outlet",
        });
        expect(outlet.status).toBe(200);
        const outletId = outlet.body.item.id as string;
        const outletPath = `/api/admin/v1/resources/outlets/${outletId}`;

        // AC-003-02 — update with the fresh revision.
        const renamed = await send("PATCH", outletPath, {
          name: "Lifecycle Outlet Renamed",
          expectedRevision: outlet.body.item.revision,
        });
        expect(renamed.status).toBe(200);
        expect(renamed.body.item.name).toBe("Lifecycle Outlet Renamed");
        expect(renamed.body.item.revision).toBe("2");

        // AC-003-04 — deactivate is a soft status change...
        const deactivated = await send("PATCH", outletPath, {
          status: "inactive",
          expectedRevision: renamed.body.item.revision,
        });
        expect(deactivated.status).toBe(200);
        expect(deactivated.body.item.status).toBe("inactive");

        // ...and the row is still readable afterwards.
        const afterDeactivate = await request(outletPath, { headers });
        expect(afterDeactivate.status).toBe(200);
        expect((await afterDeactivate.json()).item.status).toBe("inactive");

        // AC-003-03 — reactivate.
        const reactivated = await send("PATCH", outletPath, {
          status: "active",
          expectedRevision: deactivated.body.item.revision,
        });
        expect(reactivated.status).toBe(200);
        expect(reactivated.body.item.status).toBe("active");
        expect(reactivated.body.item.revision).toBe("4");

        // AC-003-06 — validation rejects an empty patch.
        const emptyPatch = await send("PATCH", outletPath, {
          expectedRevision: reactivated.body.item.revision,
        });
        expect([emptyPatch.status, emptyPatch.body.code]).toEqual([
          400,
          "ADMIN_REQUEST_INVALID",
        ]);

        // AC-003-05 — there is no hard-delete surface on any admin write route.
        for (const path of [
          "/api/admin/v1/resources/brands",
          `/api/admin/v1/resources/brands/${brand.body.item.id}`,
          "/api/admin/v1/resources/outlets",
          outletPath,
          "/api/admin/v1/memberships",
          `/api/admin/v1/memberships/${admin.membershipId}`,
        ]) {
          const deleted = await request(path, { method: "DELETE", headers });
          expect([path, deleted.status, (await deleted.json()).code]).toEqual([
            path,
            405,
            "METHOD_NOT_ALLOWED",
          ]);
        }
      });
    });
  }, 180_000);

  it("pages memberships beyond one page and drains them exhaustively server-side", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withAdminServer(database.connectionString, async ({ request, headersFor, persistence }) => {
        const admin = await createPlatformAdmin(persistence);
        const tree = await persistence.transaction((tx) => seedBrandTree(tx));
        const members: string[] = [];
        for (let index = 0; index < 55; index += 1) {
          members.push((await createEligibleWorkforceUser(persistence)).id);
        }
        await persistence.transaction(async (tx) => {
          for (const memberId of members) {
            await createMembership(tx, {
              workforceUserId: memberId,
              scope: {
                scopeType: "outlet",
                brandId: tree.brand.id,
                organizationId: tree.orgA.id,
                territoryId: tree.terrA.id,
                outletId: tree.outletA.id,
              },
              status: "invited",
            });
          }
        });

        const headers = await headersFor(admin.id);
        const drained = await drainHttpPages(request, headers, "/api/admin/v1/memberships");
        expect(drained.firstPageMore).toBe(true);
        expect(drained.pages).toBeGreaterThan(1);
        // 55 outlet memberships plus the platform admin's own membership.
        expect(drained.items).toHaveLength(56);
        expect(new Set(drained.items.map((item) => String(item.id))).size).toBe(56);

        const exhaustive = await adminListAllMemberships(persistence, principalFor(admin.id));
        expect(exhaustive).toHaveLength(56);
        expect(new Set(exhaustive.map((item) => item.id))).toEqual(
          new Set(drained.items.map((item) => String(item.id))),
        );

        // outletId narrows after authorization; it is not an authority input.
        const narrowed = await drainHttpPages(
          request,
          headers,
          `/api/admin/v1/memberships?outletId=${tree.outletA.id}`,
        );
        expect(narrowed.items).toHaveLength(55);
        expect(narrowed.pages).toBeGreaterThan(1);
        for (const item of narrowed.items) {
          expect(item.outletId).toBe(tree.outletA.id);
        }
      });
    });
  }, 180_000);
});
