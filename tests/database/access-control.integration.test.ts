/**
 * PostgreSQL integration tests for Organizations / Outlets / RBAC (IMP-011).
 * Real Testcontainers PostgreSQL 18 only — every test gets its own isolated,
 * freshly-migrated database.
 */
import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { afterEach, describe, expect, inject, it } from "vitest";

import type { WebConfig } from "../../src/platform/config";
import {
  PERMISSION_KEYS,
  ROLE_KEYS,
  ROLE_PERMISSION_MAPPINGS,
} from "../../src/shared/access-control";
import {
  AccessControlConflictError,
  AccessControlInvalidTransitionError,
  AccessControlValidationError,
  BootstrapClosedError,
  BootstrapIneligibleError,
  DelegationCeilingError,
  LastPlatformAdminError,
  SelfElevationError,
  authorize,
  bootstrapPlatformSuperAdmin,
  createMembership,
  grantRole,
  insertAccessAuditEvent,
  revokeRole,
  transitionMembership,
} from "../../src/server/access-control";
import { createBrand, createOrganization } from "../../src/server/organization";
import { getApplicationPersistence } from "../../src/server/persistence";
import {
  createDisabledWorkforceUser,
  createEligibleWorkforceUser,
  createMfaDisabledWorkforceUser,
  createPasswordChangeRequiredWorkforceUser,
  principalFor,
  seedBrandTree,
} from "./support/access-control-fixtures";
import { withAccessControlRoleFixture } from "./support/access-control-roles";
import { applyMigrations, withIsolatedTestDatabase } from "./support/test-database";

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

const openHandles: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(openHandles.splice(0).map((h) => h.close()));
});

async function withMigratedPersistence<T>(
  fn: (
    persistence: ReturnType<typeof getApplicationPersistence>,
    database: { databaseName: string; connectionString: string },
  ) => Promise<T>,
): Promise<T> {
  return withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
    await applyMigrations(database.connectionString);
    const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
    openHandles.push(persistence);
    return fn(persistence, database);
  });
}

function assertNoSecrets(text: string) {
  expect(text).not.toMatch(/postgresql:\/\//i);
  expect(text).not.toMatch(/@example\.invalid/i);
}

function errorChainText(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let i = 0; i < 6 && current; i += 1) {
    if (current instanceof Error) {
      parts.push(current.message);
      if ("code" in current && (current as { code?: unknown }).code != null) {
        parts.push(String((current as { code: unknown }).code));
      }
      current = current.cause;
      continue;
    }
    parts.push(String(current));
    break;
  }
  return parts.join("\n");
}

async function expectPermissionDenied(promise: Promise<unknown>): Promise<void> {
  const error = await promise.then(
    () => {
      throw new Error("expected permission denial");
    },
    (e: unknown) => e,
  );
  expect(errorChainText(error)).toMatch(/permission denied|42501/i);
}

describe("IMP-011 migration replay and catalog", () => {
  it("creates access-control tables and seeds 43 permissions / 7 roles / mappings", async () => {
    await withMigratedPersistence(async (persistence) => {
      await persistence.withContext(async (ctx) => {
        const tables = await ctx.db.execute<{ relname: string }>(sql`
          select c.relname
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'app'
            and c.relkind = 'r'
            and c.relname in (
              'brands', 'organizations', 'territories', 'legal_entities', 'outlets',
              'access_permissions', 'access_roles', 'access_role_allowed_scopes',
              'access_role_permissions', 'access_memberships', 'access_role_assignments',
              'access_control_audit_events'
            )
          order by c.relname
        `);
        expect(tables.rows.length).toBe(12);

        const permissions = await ctx.db.execute<{ count: string }>(
          sql`select count(*)::text as count from app.access_permissions`,
        );
        expect(permissions.rows[0]?.count).toBe(String(PERMISSION_KEYS.length));

        const roles = await ctx.db.execute<{ count: string }>(
          sql`select count(*)::text as count from app.access_roles`,
        );
        expect(roles.rows[0]?.count).toBe(String(ROLE_KEYS.length));

        const scopes = await ctx.db.execute<{ count: string }>(
          sql`select count(*)::text as count from app.access_role_allowed_scopes`,
        );
        expect(Number.parseInt(scopes.rows[0]?.count ?? "0", 10)).toBeGreaterThan(0);

        const mappings = await ctx.db.execute<{ count: string }>(
          sql`select count(*)::text as count from app.access_role_permissions`,
        );
        expect(mappings.rows[0]?.count).toBe(String(ROLE_PERMISSION_MAPPINGS.length));

        const seededKeys = await ctx.db.execute<{ key: string }>(
          sql`select key from app.access_permissions order by key`,
        );
        expect(seededKeys.rows.map((r) => r.key).sort()).toEqual([...PERMISSION_KEYS].sort());
      });
    });
  });
});

describe("hierarchy integrity (database FKs)", () => {
  it("rejects cross-brand organization pairing and outlet ancestry mismatches", async () => {
    await withMigratedPersistence(async (persistence) => {
      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "h1"));
      const otherBrand = await persistence.transaction((tx) =>
        createBrand(tx, { code: `other-${randomUUID().slice(0, 8)}`, name: "Other Brand" }),
      );
      const otherOrg = await persistence.transaction((tx) =>
        createOrganization(tx, {
          brandId: otherBrand.id,
          code: "other-org",
          name: "Other Org",
        }),
      );

      await persistence.withContext(async (ctx) => {
        await expect(
          ctx.db.execute(sql`
            insert into app.organizations (id, brand_id, code, name, status, created_at, updated_at)
            values (
              ${randomUUID()}::uuid,
              ${otherBrand.id}::uuid,
              'spoof',
              'Spoof',
              'active',
              now(),
              now()
            )
          `),
        ).resolves.toBeTruthy();

        // Outlet claiming brand A with organization from brand B must fail FK.
        await expect(
          ctx.db.execute(sql`
            insert into app.outlets (
              id, brand_id, organization_id, territory_id, legal_entity_id,
              code, name, status, created_at, updated_at
            ) values (
              ${randomUUID()}::uuid,
              ${tree.brand.id}::uuid,
              ${otherOrg.id}::uuid,
              ${tree.terrA.id}::uuid,
              ${tree.leA.id}::uuid,
              'bad-out',
              'Bad Outlet',
              'active',
              now(),
              now()
            )
          `),
        ).rejects.toThrow();

        // Wrong-org legal entity on outlet must fail FK.
        await expect(
          ctx.db.execute(sql`
            insert into app.outlets (
              id, brand_id, organization_id, territory_id, legal_entity_id,
              code, name, status, created_at, updated_at
            ) values (
              ${randomUUID()}::uuid,
              ${tree.brand.id}::uuid,
              ${tree.orgA.id}::uuid,
              ${tree.terrA.id}::uuid,
              ${tree.leB.id}::uuid,
              'bad-le',
              'Bad LE Outlet',
              'active',
              now(),
              now()
            )
          `),
        ).rejects.toThrow();

        // Legal entity with mismatched brand/org pair.
        await expect(
          ctx.db.execute(sql`
            insert into app.legal_entities (
              id, brand_id, organization_id, code, name, status, created_at, updated_at
            ) values (
              ${randomUUID()}::uuid,
              ${tree.brand.id}::uuid,
              ${otherOrg.id}::uuid,
              'bad-le-row',
              'Bad LE',
              'active',
              now(),
              now()
            )
          `),
        ).rejects.toThrow();
      });
    });
  });
});

describe("shaped application-role privileges", () => {
  it("denies catalog mutation, audit UPDATE/DELETE, and brand DELETE", async () => {
    await withMigratedPersistence(async (_adminPersistence, database) => {
      await withAccessControlRoleFixture(
        database.databaseName,
        database.connectionString,
        async (fixture) => {
          const persistence = getApplicationPersistence(
            applicationConfig(fixture.applicationConnectionString),
          );
          openHandles.push(persistence);

          const brand = await persistence.transaction((tx) =>
            createBrand(tx, { code: `priv-${randomUUID().slice(0, 8)}`, name: "Priv Brand" }),
          );

          await persistence.withContext(async (ctx) => {
            await expectPermissionDenied(
              ctx.db.execute(
                sql`insert into app.access_permissions (key, description, created_at) values ('x.y', 'nope', now())`,
              ),
            );

            await expectPermissionDenied(
              ctx.db.execute(
                sql`update app.access_permissions set description = 'x' where key = 'outlet.read'`,
              ),
            );

            await expectPermissionDenied(
              ctx.db.execute(sql`delete from app.access_permissions where key = 'outlet.read'`),
            );

            const auditId = randomUUID();
            await ctx.db.execute(sql`
              insert into app.access_control_audit_events (
                id, occurred_at, action, target_type, target_id, metadata
              ) values (
                ${auditId}::uuid, now(), 'brand.created', 'brand', ${randomUUID()}, '{}'::jsonb
              )
            `);

            await expectPermissionDenied(
              ctx.db.execute(
                sql`update app.access_control_audit_events set action = 'x' where id = ${auditId}::uuid`,
              ),
            );

            await expectPermissionDenied(
              ctx.db.execute(
                sql`delete from app.access_control_audit_events where id = ${auditId}::uuid`,
              ),
            );

            await expectPermissionDenied(
              ctx.db.execute(sql`delete from app.brands where id = ${brand.id}::uuid`),
            );
          });
        },
      );
    });
  });
});

describe("membership lifecycle", () => {
  it("rejects invalid scope shapes, enforces uniqueness, transitions, and expiration", async () => {
    await withMigratedPersistence(async (persistence) => {
      const user = await createEligibleWorkforceUser(persistence);
      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "m1"));

      await persistence.withContext(async (ctx) => {
        await expect(
          ctx.db.execute(sql`
            insert into app.access_memberships (
              id, workforce_user_id, scope_type, brand_id, organization_id,
              territory_id, outlet_id, status, created_at, updated_at
            ) values (
              ${randomUUID()}::uuid, ${user.id}, 'brand', null, null, null, null,
              'active', now(), now()
            )
          `),
        ).rejects.toThrow();
      });

      const membership = await persistence.transaction((tx) =>
        createMembership(tx, {
          workforceUserId: user.id,
          scope: { scopeType: "brand", brandId: tree.brand.id },
          status: "invited",
        }),
      );
      expect(membership.status).toBe("invited");

      await expect(
        persistence.transaction((tx) =>
          createMembership(tx, {
            workforceUserId: user.id,
            scope: { scopeType: "brand", brandId: tree.brand.id },
            status: "active",
          }),
        ),
      ).rejects.toBeInstanceOf(AccessControlConflictError);

      const activated = await persistence.transaction((tx) =>
        transitionMembership(tx, { membershipId: membership.id, toStatus: "active" }),
      );
      expect(activated.status).toBe("active");

      const suspended = await persistence.transaction((tx) =>
        transitionMembership(tx, { membershipId: membership.id, toStatus: "suspended" }),
      );
      expect(suspended.status).toBe("suspended");

      await persistence.transaction((tx) =>
        transitionMembership(tx, { membershipId: membership.id, toStatus: "active" }),
      );

      const expiredUser = await createEligibleWorkforceUser(persistence);
      const expiredMembership = await persistence.transaction((tx) =>
        createMembership(tx, {
          workforceUserId: expiredUser.id,
          scope: {
            scopeType: "outlet",
            brandId: tree.brand.id,
            organizationId: tree.orgA.id,
            territoryId: tree.terrA.id,
            outletId: tree.outletA.id,
          },
          status: "active",
          expiresAt: new Date("2020-01-01T00:00:00.000Z"),
        }),
      );
      await persistence.transaction((tx) =>
        grantRole(tx, {
          membershipId: expiredMembership.id,
          roleKey: "outlet_manager",
        }),
      );

      const decision = await persistence.withContext((ctx) =>
        authorize(ctx, {
          actor: principalFor(expiredUser.id),
          permission: "outlet.read",
          resource: {
            type: "outlet",
            brandId: tree.brand.id,
            organizationId: tree.orgA.id,
            territoryId: tree.terrA.id,
            outletId: tree.outletA.id,
          },
        }),
      );
      expect(decision).toEqual({ allowed: false, code: "DENIED" });

      await expect(
        persistence.transaction((tx) =>
          transitionMembership(tx, {
            membershipId: expiredMembership.id,
            toStatus: "active",
          }),
        ),
      ).rejects.toBeInstanceOf(AccessControlInvalidTransitionError);
    });
  });
});

describe("role assignment", () => {
  it("rejects invalid scopes, supports revoke and assignment expiry", async () => {
    await withMigratedPersistence(async (persistence) => {
      const user = await createEligibleWorkforceUser(persistence);
      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "r1"));

      const brandMembership = await persistence.transaction((tx) =>
        createMembership(tx, {
          workforceUserId: user.id,
          scope: { scopeType: "brand", brandId: tree.brand.id },
          status: "active",
        }),
      );

      await expect(
        persistence.transaction((tx) =>
          grantRole(tx, {
            membershipId: brandMembership.id,
            roleKey: "platform_super_admin",
          }),
        ),
      ).rejects.toBeInstanceOf(AccessControlValidationError);

      await expect(
        persistence.transaction((tx) =>
          grantRole(tx, {
            membershipId: brandMembership.id,
            roleKey: "outlet_manager",
          }),
        ),
      ).rejects.toBeInstanceOf(AccessControlValidationError);

      const assignment = await persistence.transaction((tx) =>
        grantRole(tx, {
          membershipId: brandMembership.id,
          roleKey: "brand_admin",
        }),
      );

      const allowed = await persistence.withContext((ctx) =>
        authorize(ctx, {
          actor: principalFor(user.id),
          permission: "outlet.read",
          resource: {
            type: "outlet",
            brandId: tree.brand.id,
            organizationId: tree.orgA.id,
            territoryId: tree.terrA.id,
            outletId: tree.outletA.id,
          },
        }),
      );
      expect(allowed).toEqual({ allowed: true, code: "AUTHORIZED" });

      await persistence.transaction((tx) => revokeRole(tx, { assignmentId: assignment.id }));

      const afterRevoke = await persistence.withContext((ctx) =>
        authorize(ctx, {
          actor: principalFor(user.id),
          permission: "outlet.read",
          resource: {
            type: "outlet",
            brandId: tree.brand.id,
            organizationId: tree.orgA.id,
            territoryId: tree.terrA.id,
            outletId: tree.outletA.id,
          },
        }),
      );
      expect(afterRevoke).toEqual({ allowed: false, code: "DENIED" });

      const expiring = await persistence.transaction((tx) =>
        grantRole(tx, {
          membershipId: brandMembership.id,
          roleKey: "brand_admin",
          startsAt: new Date("2020-01-01T00:00:00.000Z"),
          expiresAt: new Date("2020-06-01T00:00:00.000Z"),
        }),
      );
      expect(expiring.expiresAt).not.toBeNull();

      const expiredDecision = await persistence.withContext((ctx) =>
        authorize(ctx, {
          actor: principalFor(user.id),
          permission: "brand.read",
          resource: { type: "brand", brandId: tree.brand.id },
        }),
      );
      expect(expiredDecision).toEqual({ allowed: false, code: "DENIED" });
    });
  });
});

describe("authorize", () => {
  it("denies by default, supports PSA/bootstrap, brand descendants, sibling DENY, multi-role, brand isolation", async () => {
    await withMigratedPersistence(async (persistence) => {
      const stranger = await createEligibleWorkforceUser(persistence);
      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "a1"));
      const tree2 = await persistence.transaction((tx) => seedBrandTree(tx, "a2"));

      const denyDefault = await persistence.withContext((ctx) =>
        authorize(ctx, {
          actor: principalFor(stranger.id),
          permission: "outlet.read",
          resource: {
            type: "outlet",
            brandId: tree.brand.id,
            organizationId: tree.orgA.id,
            territoryId: tree.terrA.id,
            outletId: tree.outletA.id,
          },
        }),
      );
      expect(denyDefault.code).toBe("DENIED");

      const forgedActor = {
        workforceUserId: stranger.id,
        disabledAt: null,
        passwordChangeRequired: false,
        twoFactorEnabled: true,
      };
      const untrusted = await persistence.withContext((ctx) =>
        authorize(ctx, {
          actor: forgedActor,
          permission: "outlet.read",
          resource: {
            type: "outlet",
            brandId: tree.brand.id,
            organizationId: tree.orgA.id,
            territoryId: tree.terrA.id,
            outletId: tree.outletA.id,
          },
        }),
      );
      expect(untrusted.code).toBe("DENIED");

      const psa = await createEligibleWorkforceUser(persistence);
      const boot = await bootstrapPlatformSuperAdmin({
        persistence,
        workforceUserId: psa.id,
      });
      expect(boot.outcome).toBe("bootstrapped");

      const psaDecision = await persistence.withContext((ctx) =>
        authorize(ctx, {
          actor: principalFor(psa.id),
          permission: "brand.create",
          resource: { type: "platform" },
        }),
      );
      expect(psaDecision).toEqual({ allowed: true, code: "AUTHORIZED" });

      const brandAdmin = await createEligibleWorkforceUser(persistence);
      await persistence.transaction(async (tx) => {
        const membership = await createMembership(tx, {
          workforceUserId: brandAdmin.id,
          scope: { scopeType: "brand", brandId: tree.brand.id },
          status: "active",
        });
        await grantRole(tx, { membershipId: membership.id, roleKey: "brand_admin" });
      });

      const brandDescendant = await persistence.withContext((ctx) =>
        authorize(ctx, {
          actor: principalFor(brandAdmin.id),
          permission: "outlet.read",
          resource: {
            type: "outlet",
            brandId: tree.brand.id,
            organizationId: tree.orgB.id,
            territoryId: tree.terrB.id,
            outletId: tree.outletB.id,
          },
        }),
      );
      expect(brandDescendant.code).toBe("AUTHORIZED");

      const brandIsolation = await persistence.withContext((ctx) =>
        authorize(ctx, {
          actor: principalFor(brandAdmin.id),
          permission: "outlet.read",
          resource: {
            type: "outlet",
            brandId: tree2.brand.id,
            organizationId: tree2.orgA.id,
            territoryId: tree2.terrA.id,
            outletId: tree2.outletA.id,
          },
        }),
      );
      expect(brandIsolation.code).toBe("DENIED");

      const manager = await createEligibleWorkforceUser(persistence);
      await persistence.transaction(async (tx) => {
        const membership = await createMembership(tx, {
          workforceUserId: manager.id,
          scope: {
            scopeType: "outlet",
            brandId: tree.brand.id,
            organizationId: tree.orgA.id,
            territoryId: tree.terrA.id,
            outletId: tree.outletA.id,
          },
          status: "active",
        });
        await grantRole(tx, { membershipId: membership.id, roleKey: "outlet_manager" });
      });

      const siblingDeny = await persistence.withContext((ctx) =>
        authorize(ctx, {
          actor: principalFor(manager.id),
          permission: "outlet.read",
          resource: {
            type: "outlet",
            brandId: tree.brand.id,
            organizationId: tree.orgB.id,
            territoryId: tree.terrB.id,
            outletId: tree.outletB.id,
          },
        }),
      );
      expect(siblingDeny.code).toBe("DENIED");

      const exactAllow = await persistence.withContext((ctx) =>
        authorize(ctx, {
          actor: principalFor(manager.id),
          permission: "outlet.update",
          resource: {
            type: "outlet",
            brandId: tree.brand.id,
            organizationId: tree.orgA.id,
            territoryId: tree.terrA.id,
            outletId: tree.outletA.id,
          },
        }),
      );
      expect(exactAllow.code).toBe("AUTHORIZED");

      // Multi-role union: kitchen + support on different scopes.
      const multi = await createEligibleWorkforceUser(persistence);
      await persistence.transaction(async (tx) => {
        const outletMembership = await createMembership(tx, {
          workforceUserId: multi.id,
          scope: {
            scopeType: "outlet",
            brandId: tree.brand.id,
            organizationId: tree.orgA.id,
            territoryId: tree.terrA.id,
            outletId: tree.outletA.id,
          },
          status: "active",
        });
        await grantRole(tx, {
          membershipId: outletMembership.id,
          roleKey: "kitchen_operator",
        });
        const brandMembership = await createMembership(tx, {
          workforceUserId: multi.id,
          scope: { scopeType: "brand", brandId: tree.brand.id },
          status: "active",
        });
        await grantRole(tx, {
          membershipId: brandMembership.id,
          roleKey: "support_refund_operator",
        });
      });

      const kitchenRead = await persistence.withContext((ctx) =>
        authorize(ctx, {
          actor: principalFor(multi.id),
          permission: "outlet.read",
          resource: {
            type: "outlet",
            brandId: tree.brand.id,
            organizationId: tree.orgA.id,
            territoryId: tree.terrA.id,
            outletId: tree.outletA.id,
          },
        }),
      );
      expect(kitchenRead.code).toBe("AUTHORIZED");

      const supportOrgRead = await persistence.withContext((ctx) =>
        authorize(ctx, {
          actor: principalFor(multi.id),
          permission: "organization.read",
          resource: {
            type: "organization",
            brandId: tree.brand.id,
            organizationId: tree.orgB.id,
          },
        }),
      );
      expect(supportOrgRead.code).toBe("AUTHORIZED");
    });
  });
});

describe("administration protections", () => {
  it("enforces delegation ceiling, self-elevation, last PSA, and concurrent last-admin", async () => {
    await withMigratedPersistence(async (persistence) => {
      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "d1"));

      const manager = await createEligibleWorkforceUser(persistence);
      const target = await createEligibleWorkforceUser(persistence);
      await persistence.transaction(async (tx) => {
        const membership = await createMembership(tx, {
          workforceUserId: manager.id,
          scope: {
            scopeType: "outlet",
            brandId: tree.brand.id,
            organizationId: tree.orgA.id,
            territoryId: tree.terrA.id,
            outletId: tree.outletA.id,
          },
          status: "active",
        });
        await grantRole(tx, { membershipId: membership.id, roleKey: "outlet_manager" });
      });

      const targetMembership = await persistence.transaction((tx) =>
        createMembership(tx, {
          workforceUserId: target.id,
          scope: {
            scopeType: "outlet",
            brandId: tree.brand.id,
            organizationId: tree.orgA.id,
            territoryId: tree.terrA.id,
            outletId: tree.outletA.id,
          },
          status: "active",
        }),
      );

      // Delegation ceiling: outlet manager may grant kitchen_operator, but not
      // support_refund_operator (extra read permissions beyond the manager set).
      await expect(
        persistence.transaction((tx) =>
          grantRole(tx, {
            actor: principalFor(manager.id),
            membershipId: targetMembership.id,
            roleKey: "kitchen_operator",
          }),
        ),
      ).resolves.toBeTruthy();

      await expect(
        persistence.transaction((tx) =>
          grantRole(tx, {
            actor: principalFor(manager.id),
            membershipId: targetMembership.id,
            roleKey: "support_refund_operator",
          }),
        ),
      ).rejects.toBeInstanceOf(DelegationCeilingError);

      // Self-elevation
      await expect(
        persistence.transaction((tx) =>
          createMembership(tx, {
            actor: principalFor(manager.id),
            workforceUserId: manager.id,
            scope: {
              scopeType: "outlet",
              brandId: tree.brand.id,
              organizationId: tree.orgB.id,
              territoryId: tree.terrB.id,
              outletId: tree.outletB.id,
            },
            status: "active",
          }),
        ),
      ).rejects.toBeInstanceOf(SelfElevationError);

      // Last PSA protection
      const psa1 = await createEligibleWorkforceUser(persistence);
      const psa2 = await createEligibleWorkforceUser(persistence);
      const boot1 = await bootstrapPlatformSuperAdmin({
        persistence,
        workforceUserId: psa1.id,
      });
      expect(boot1.outcome).toBe("bootstrapped");

      // Second user needs actor-less grant via membership+role after first exists —
      // bootstrap will be closed; create second PSA without bootstrap by direct grant
      // from no-actor path (allowed for tests / system).
      const psa2Membership = await persistence.transaction((tx) =>
        createMembership(tx, {
          workforceUserId: psa2.id,
          scope: { scopeType: "platform" },
          status: "active",
        }),
      );
      const psa2Assignment = await persistence.transaction((tx) =>
        grantRole(tx, {
          membershipId: psa2Membership.id,
          roleKey: "platform_super_admin",
        }),
      );

      await expect(
        persistence.transaction((tx) =>
          revokeRole(tx, { assignmentId: boot1.assignment.id }),
        ),
      ).resolves.toBeTruthy();

      await expect(
        persistence.transaction((tx) =>
          revokeRole(tx, { assignmentId: psa2Assignment.id }),
        ),
      ).rejects.toBeInstanceOf(LastPlatformAdminError);

      // Restore two PSAs for concurrent last-admin race
      const restored = await persistence.transaction((tx) =>
        grantRole(tx, {
          membershipId: boot1.membership.id,
          roleKey: "platform_super_admin",
        }),
      );

      const results = await Promise.allSettled([
        persistence.transaction((tx) => revokeRole(tx, { assignmentId: restored.id })),
        persistence.transaction((tx) => revokeRole(tx, { assignmentId: psa2Assignment.id })),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(LastPlatformAdminError);
    });
  });

  it("rejects self-grant of roles on the actor's own membership", async () => {
    await withMigratedPersistence(async (persistence) => {
      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "se"));
      const actor = await createEligibleWorkforceUser(persistence);
      const membership = await persistence.transaction(async (tx) => {
        const m = await createMembership(tx, {
          workforceUserId: actor.id,
          scope: {
            scopeType: "outlet",
            brandId: tree.brand.id,
            organizationId: tree.orgA.id,
            territoryId: tree.terrA.id,
            outletId: tree.outletA.id,
          },
          status: "active",
        });
        await grantRole(tx, { membershipId: m.id, roleKey: "outlet_manager" });
        return m;
      });

      await expect(
        persistence.transaction((tx) =>
          grantRole(tx, {
            actor: principalFor(actor.id),
            membershipId: membership.id,
            roleKey: "kitchen_operator",
          }),
        ),
      ).rejects.toBeInstanceOf(SelfElevationError);
    });
  });
});

describe("bootstrap", () => {
  it("is idempotent for the same user and BOOTSTRAP_CLOSED for a second user", async () => {
    await withMigratedPersistence(async (persistence) => {
      const first = await createEligibleWorkforceUser(persistence);
      const second = await createEligibleWorkforceUser(persistence);

      const once = await bootstrapPlatformSuperAdmin({
        persistence,
        workforceUserId: first.id,
      });
      expect(once.outcome).toBe("bootstrapped");

      const again = await bootstrapPlatformSuperAdmin({
        persistence,
        workforceUserId: first.id,
      });
      expect(again.outcome).toBe("already_bootstrapped");
      expect(again.membership.id).toBe(once.membership.id);

      await expect(
        bootstrapPlatformSuperAdmin({ persistence, workforceUserId: second.id }),
      ).rejects.toBeInstanceOf(BootstrapClosedError);

      const disabled = await createDisabledWorkforceUser(persistence);
      await expect(
        bootstrapPlatformSuperAdmin({ persistence, workforceUserId: disabled.id }),
      ).rejects.toBeInstanceOf(BootstrapIneligibleError);
    });
  });
});

describe("re-evaluation", () => {
  it("removes permission immediately on role revoke or membership suspend", async () => {
    await withMigratedPersistence(async (persistence) => {
      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "re"));
      const user = await createEligibleWorkforceUser(persistence);

      const { membership, assignment } = await persistence.transaction(async (tx) => {
        const membership = await createMembership(tx, {
          workforceUserId: user.id,
          scope: { scopeType: "brand", brandId: tree.brand.id },
          status: "active",
        });
        const assignment = await grantRole(tx, {
          membershipId: membership.id,
          roleKey: "brand_admin",
        });
        return { membership, assignment };
      });

      const resource = {
        type: "outlet" as const,
        brandId: tree.brand.id,
        organizationId: tree.orgA.id,
        territoryId: tree.terrA.id,
        outletId: tree.outletA.id,
      };

      expect(
        (
          await persistence.withContext((ctx) =>
            authorize(ctx, {
              actor: principalFor(user.id),
              permission: "outlet.read",
              resource,
            }),
          )
        ).code,
      ).toBe("AUTHORIZED");

      await persistence.transaction((tx) => revokeRole(tx, { assignmentId: assignment.id }));
      expect(
        (
          await persistence.withContext((ctx) =>
            authorize(ctx, {
              actor: principalFor(user.id),
              permission: "outlet.read",
              resource,
            }),
          )
        ).code,
      ).toBe("DENIED");

      await persistence.transaction((tx) =>
        grantRole(tx, { membershipId: membership.id, roleKey: "brand_admin" }),
      );
      await persistence.transaction((tx) =>
        transitionMembership(tx, { membershipId: membership.id, toStatus: "suspended" }),
      );
      expect(
        (
          await persistence.withContext((ctx) =>
            authorize(ctx, {
              actor: principalFor(user.id),
              permission: "outlet.read",
              resource,
            }),
          )
        ).code,
      ).toBe("DENIED");

      await persistence.transaction((tx) =>
        transitionMembership(tx, { membershipId: membership.id, toStatus: "active" }),
      );
      expect(
        (
          await persistence.withContext((ctx) =>
            authorize(ctx, {
              actor: principalFor(user.id),
              permission: "outlet.read",
              resource,
            }),
          )
        ).code,
      ).toBe("AUTHORIZED");
    });
  });
});

describe("audit atomicity", () => {
  it("writes audit in the same transaction and rolls back mutation when audit validation fails", async () => {
    await withMigratedPersistence(async (persistence) => {
      const user = await createEligibleWorkforceUser(persistence);

      await persistence.transaction(async (tx) => {
        const membership = await createMembership(tx, {
          workforceUserId: user.id,
          scope: { scopeType: "platform" },
          status: "active",
        });
        const audits = await tx.db.execute<{ count: string }>(sql`
          select count(*)::text as count
          from app.access_control_audit_events
          where target_id = ${membership.id} and action = 'membership.created'
        `);
        expect(audits.rows[0]?.count).toBe("1");
      });

      const before = await persistence.withContext(async (ctx) => {
        const result = await ctx.db.execute<{ count: string }>(
          sql`select count(*)::text as count from app.access_memberships`,
        );
        return Number.parseInt(result.rows[0]?.count ?? "0", 10);
      });

      await expect(
        persistence.transaction(async (tx) => {
          await createMembership(tx, {
            workforceUserId: user.id,
            scope: { scopeType: "platform" },
            status: "invited",
          });
          // Unreachable if uniqueness fires first — use a fresh user for rollback demo.
        }),
      ).rejects.toBeInstanceOf(AccessControlConflictError);

      const other = await createEligibleWorkforceUser(persistence);
      await expect(
        persistence.transaction(async (tx) => {
          await createMembership(tx, {
            workforceUserId: other.id,
            scope: { scopeType: "platform" },
            status: "active",
          });
          await insertAccessAuditEvent(tx, {
            action: "not.a.real.action" as "membership.created",
            targetType: "membership",
            targetId: randomUUID(),
          });
        }),
      ).rejects.toBeInstanceOf(AccessControlValidationError);

      const after = await persistence.withContext(async (ctx) => {
        const result = await ctx.db.execute<{ count: string }>(
          sql`select count(*)::text as count from app.access_memberships where workforce_user_id = ${other.id}`,
        );
        return Number.parseInt(result.rows[0]?.count ?? "0", 10);
      });
      expect(after).toBe(0);
      expect(before).toBeGreaterThanOrEqual(1);
      assertNoSecrets(JSON.stringify({ before, after }));
    });
  });
});
