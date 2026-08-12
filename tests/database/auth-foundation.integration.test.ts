/**
 * PostgreSQL integration tests for the Better Auth foundation (IMP-008).
 * Real Testcontainers PostgreSQL 18 only — every test gets its own
 * isolated, freshly-migrated database. Mirrors
 * `outbox-idempotency-migration.integration.test.ts`'s structure.
 *
 * Session setup uses Better Auth's own public `internalAdapter` operations
 * (via `auth.$context`) — `createUser`/`createSession`/`findSession`/
 * `deleteSession`/`deleteSessions` — never a direct Drizzle insert into the
 * Better Auth tables (see AGENTS.md / IMP-008 spec §25).
 */
import { makeSignature } from "better-auth/crypto";
import { describe, expect, inject, it } from "vitest";

import type { WebConfig } from "../../src/platform/config";
import { createCustomerTemporaryIdentityDeriver, type CustomerPiiHashSecret } from "../../src/server/customer-auth/pii";
import { createCustomerOtpProvider } from "../../src/server/customer-auth/provider";
import { getApplicationPersistence } from "../../src/server/persistence";
import {
  getCustomerAuthRuntime,
  type CustomerPhoneAuthRuntimeDependencies,
} from "../../src/server/auth/customer/runtime";
import { getWorkforceAuthRuntime } from "../../src/server/auth/workforce/runtime";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import {
  CUSTOMER_AUTH_COOKIE_PREFIX,
  WORKFORCE_AUTH_COOKIE_PREFIX,
} from "../../src/server/auth/shared/constants";
import { AuthRuntimeClosedError } from "../../src/server/auth/shared/errors";
import { withAuthFoundationRoleFixture } from "./support/auth-foundation-roles";
import { applyMigrations, withIsolatedTestDatabase, withTestDatabaseClient } from "./support/test-database";

/** Past fixture timestamps — never wait for real session expiry. */
const EXPIRED_SESSION_CREATED_AT = new Date("2020-01-01T00:00:00.000Z");
const EXPIRED_SESSION_EXPIRES_AT = new Date("2020-01-02T00:00:00.000Z");

type InternalAdapter = {
  createUser: (user: Record<string, unknown>) => Promise<{ id: string }>;
  createSession: (
    userId: string,
    dontRememberMe?: boolean,
    override?: Record<string, unknown>,
    overrideAll?: boolean,
  ) => Promise<{ id: string; token: string; userId: string; expiresAt: Date }>;
  findSession: (token: string) => Promise<{ session: { token: string; userId: string; expiresAt: Date } } | null>;
  deleteSession: (token: string) => Promise<void>;
  deleteSessions: (sessionTokens: string | string[]) => Promise<void>;
  deleteUserSessions: (userId: string) => Promise<void>;
};

async function signedSessionCookieHeaders(cookiePrefix: string, token: string, secret: string): Promise<Headers> {
  const cookieName = `${cookiePrefix}.session_token`;
  const signedValue = `${token}.${await makeSignature(token, secret)}`;
  return new Headers({ cookie: `${cookieName}=${signedValue}` });
}

function assertNoSecretsInText(text: string) {
  expect(text).not.toMatch(/customer-integration-test-secret|workforce-integration-test-secret/i);
  expect(text).not.toMatch(/session_token=/i);
  expect(text).not.toMatch(/postgresql:\/\//i);
  expect(text).not.toMatch(/https?:\/\/localhost:\d+/i);
}

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

/** A fresh, real (non-mocked) local OTP provider + identity deriver pair —
 * cheap in-process fakes, never a real SMS/network call. These integration
 * tests never exercise phone OTP itself, only the customer session
 * lifecycle, so a fresh pair per runtime is sufficient. */
function customerPhoneDependencies(): CustomerPhoneAuthRuntimeDependencies {
  return {
    otpProvider: createCustomerOtpProvider({ kind: "local", environmentType: "test" }),
    identityDeriver: createCustomerTemporaryIdentityDeriver(
      "auth-foundation-integration-test-pii-hash-secret-32ch" as CustomerPiiHashSecret,
    ),
  };
}

function authFoundationConfig() {
  return loadAuthFoundationConfig(
    {
      CUSTOMER_AUTH_SECRET: "customer-integration-test-secret-32-chars-minimum",
      CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
      WORKFORCE_AUTH_SECRET: "workforce-integration-test-secret-32-chars-min",
      WORKFORCE_AUTH_BASE_URL: "http://localhost:3100",
    },
    "test",
  );
}

async function internalAdapterFor(runtime: {
  getAuth: () => Promise<{ $context: Promise<unknown> }>;
}): Promise<InternalAdapter> {
  const auth = await runtime.getAuth();
  const context = (await auth.$context) as { internalAdapter: InternalAdapter };
  return context.internalAdapter;
}

describe("IMP-008 migration: tables and realm isolation", () => {
  it("clean replay creates the eight approved Better Auth tables (plus later-slice auth tables)", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withTestDatabaseClient(database.connectionString, async (client) => {
        const tables = await client.pool.query<{ table_name: string }>(
          `SELECT table_name FROM information_schema.tables
           WHERE table_schema = 'app' AND table_name LIKE '%_auth_%' ORDER BY table_name`,
        );
        // IMP-008's eight core tables must remain; IMP-010 adds
        // workforce_auth_two_factors and workforce_auth_rate_limits under the
        // same `%_auth_%` name pattern.
        expect(tables.rows.map((r) => r.table_name)).toEqual([
          "customer_auth_accounts",
          "customer_auth_sessions",
          "customer_auth_users",
          "customer_auth_verifications",
          "workforce_auth_accounts",
          "workforce_auth_rate_limits",
          "workforce_auth_sessions",
          "workforce_auth_two_factors",
          "workforce_auth_users",
          "workforce_auth_verifications",
        ]);
      });
    });
  });

  it("customer session/account foreign keys reference only customer_auth_users", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withTestDatabaseClient(database.connectionString, async (client) => {
        const fks = await client.pool.query<{ table_name: string; foreign_table: string }>(
          `SELECT tc.table_name, ccu.table_name AS foreign_table
           FROM information_schema.table_constraints tc
           JOIN information_schema.constraint_column_usage ccu
             ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
           WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'app'
             AND tc.table_name LIKE 'customer_auth_%'`,
        );
        for (const row of fks.rows) {
          expect(row.foreign_table).toBe("customer_auth_users");
        }
        expect(fks.rows.length).toBeGreaterThan(0);
      });
    });
  });

  it("workforce session/account foreign keys reference only workforce_auth_users", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withTestDatabaseClient(database.connectionString, async (client) => {
        const fks = await client.pool.query<{ table_name: string; foreign_table: string }>(
          `SELECT tc.table_name, ccu.table_name AS foreign_table
           FROM information_schema.table_constraints tc
           JOIN information_schema.constraint_column_usage ccu
             ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
           WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'app'
             AND tc.table_name LIKE 'workforce_auth_%'`,
        );
        for (const row of fks.rows) {
          expect(row.foreign_table).toBe("workforce_auth_users");
        }
        expect(fks.rows.length).toBeGreaterThan(0);
      });
    });
  });

  it("the same synthetic email can exist once in each realm without a uniqueness conflict", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withTestDatabaseClient(database.connectionString, async (client) => {
        await client.pool.query(
          `insert into app.customer_auth_users (id, name, email, email_verified, created_at, updated_at)
           values ('cust-1', 'Test', 'shared@example.test', false, now(), now())`,
        );
        await expect(
          client.pool.query(
            `insert into app.workforce_auth_users (id, name, email, email_verified, created_at, updated_at)
             values ('work-1', 'Test', 'shared@example.test', false, now(), now())`,
          ),
        ).resolves.toBeDefined();
      });
    });
  });
});

describe("IMP-008 application-role privileges", () => {
  it("grants exactly SELECT/INSERT/UPDATE/DELETE on all eight tables, and forbids DDL/role creation", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withAuthFoundationRoleFixture(database.databaseName, database.connectionString, async (fixture) => {
        const persistence = getApplicationPersistence(applicationConfig(fixture.applicationConnectionString));
        try {
          const { sql } = await import("drizzle-orm");

          await expect(
            persistence.withContext((ctx) =>
              ctx.db.execute(sql`
                insert into app.customer_auth_users (id, name, email, email_verified, created_at, updated_at)
                values ('priv-check', 'Priv Check', 'priv-check@example.test', false, now(), now())
              `),
            ),
          ).resolves.toBeDefined();

          await expect(
            persistence.withContext((ctx) => ctx.db.execute(sql`alter table app.customer_auth_users add column bogus text`)),
          ).rejects.toThrow();
          await expect(
            persistence.withContext((ctx) => ctx.db.execute(sql`drop table app.customer_auth_users`)),
          ).rejects.toThrow();
          await expect(
            persistence.withContext((ctx) => ctx.db.execute(sql`create role boba_test_auth_escalation login`)),
          ).rejects.toThrow();
        } finally {
          await persistence.close();
        }
      });
    });
  });
});

describe("IMP-008 customer realm session lifecycle", () => {
  it("creates, retrieves, and revokes a customer session without touching the workforce tables", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const config = authFoundationConfig();
      const runtime = getCustomerAuthRuntime(
        {
          auth: config.customer,
          persistence: applicationConfig(database.connectionString),
        },
        customerPhoneDependencies(),
      );
      try {
        const internalAdapter = await internalAdapterFor(runtime);
        const user = await internalAdapter.createUser({
          email: "customer-user@example.test",
          name: "Customer User",
          emailVerified: false,
        });
        const session = await internalAdapter.createSession(user.id);

        const found = await internalAdapter.findSession(session.token);
        expect(found?.session.userId).toBe(user.id);

        await withTestDatabaseClient(database.connectionString, async (client) => {
          const workforceSessions = await client.pool.query(
            `select 1 from app.workforce_auth_sessions where token = $1`,
            [session.token],
          );
          expect(workforceSessions.rowCount).toBe(0);
        });

        await internalAdapter.deleteSession(session.token);
        const afterRevoke = await internalAdapter.findSession(session.token);
        expect(afterRevoke).toBeNull();
      } finally {
        await runtime.close();
      }
    });
  });

  it("survives runtime close and recreation", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const config = authFoundationConfig();
      const persistenceConfig = applicationConfig(database.connectionString);

      let token: string;
      {
        const runtime = getCustomerAuthRuntime(
          { auth: config.customer, persistence: persistenceConfig },
          customerPhoneDependencies(),
        );
        const internalAdapter = await internalAdapterFor(runtime);
        const user = await internalAdapter.createUser({
          email: "customer-persist@example.test",
          name: "Customer Persist",
          emailVerified: false,
        });
        const session = await internalAdapter.createSession(user.id);
        token = session.token;
        await runtime.close();
      }

      {
        const freshRuntime = getCustomerAuthRuntime(
          { auth: config.customer, persistence: applicationConfig(database.connectionString) },
          customerPhoneDependencies(),
        );
        try {
          const internalAdapter = await internalAdapterFor(freshRuntime);
          const found = await internalAdapter.findSession(token);
          expect(found?.session.token).toBe(token);
        } finally {
          await freshRuntime.close();
        }
      }
    });
  });
});

describe("IMP-008 cross-realm isolation", () => {
  it("a customer session token is not resolvable through the workforce runtime, and vice versa", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const config = authFoundationConfig();
      const persistenceConfig = applicationConfig(database.connectionString);

      const customerRuntime = getCustomerAuthRuntime(
        { auth: config.customer, persistence: persistenceConfig },
        customerPhoneDependencies(),
      );
      const workforceRuntime = getWorkforceAuthRuntime({
        auth: config.workforce,
        persistence: applicationConfig(database.connectionString),
      });

      try {
        const customerAdapter = await internalAdapterFor(customerRuntime);
        const workforceAdapter = await internalAdapterFor(workforceRuntime);

        const customerUser = await customerAdapter.createUser({
          email: "cross-customer@example.test",
          name: "Cross Customer",
          emailVerified: false,
        });
        const customerSession = await customerAdapter.createSession(customerUser.id);

        const workforceUser = await workforceAdapter.createUser({
          email: "cross-workforce@example.test",
          name: "Cross Workforce",
          emailVerified: false,
        });
        const workforceSession = await workforceAdapter.createSession(workforceUser.id);

        await expect(workforceAdapter.findSession(customerSession.token)).resolves.toBeNull();
        await expect(customerAdapter.findSession(workforceSession.token)).resolves.toBeNull();

        // Revoking the customer session must not affect the workforce session.
        await customerAdapter.deleteSession(customerSession.token);
        await expect(workforceAdapter.findSession(workforceSession.token)).resolves.not.toBeNull();
      } finally {
        await customerRuntime.close();
        await workforceRuntime.close();
      }
    });
  });

  it("closing the customer runtime leaves the workforce runtime usable", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const config = authFoundationConfig();

      const customerRuntime = getCustomerAuthRuntime(
        {
          auth: config.customer,
          persistence: applicationConfig(database.connectionString),
        },
        customerPhoneDependencies(),
      );
      const workforceRuntime = getWorkforceAuthRuntime({
        auth: config.workforce,
        persistence: applicationConfig(database.connectionString),
      });

      await customerRuntime.getAuth();
      await workforceRuntime.getAuth();
      await customerRuntime.close();

      try {
        const workforceAdapter = await internalAdapterFor(workforceRuntime);
        const user = await workforceAdapter.createUser({
          email: "after-customer-close@example.test",
          name: "Still Usable",
          emailVerified: false,
        });
        expect(user.id).toBeDefined();
      } finally {
        await workforceRuntime.close();
      }
    });
  });

  it("closing the workforce runtime leaves the customer runtime usable", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const config = authFoundationConfig();

      const customerRuntime = getCustomerAuthRuntime(
        {
          auth: config.customer,
          persistence: applicationConfig(database.connectionString),
        },
        customerPhoneDependencies(),
      );
      const workforceRuntime = getWorkforceAuthRuntime({
        auth: config.workforce,
        persistence: applicationConfig(database.connectionString),
      });

      try {
        const customerAdapter = await internalAdapterFor(customerRuntime);
        await workforceRuntime.getAuth();

        const customerUser = await customerAdapter.createUser({
          email: "customer-after-workforce-close@example.test",
          name: "Customer Survives",
          emailVerified: false,
        });
        const customerSession = await customerAdapter.createSession(customerUser.id);

        await workforceRuntime.close();

        const stillFound = await customerAdapter.findSession(customerSession.token);
        expect(stillFound?.session.userId).toBe(customerUser.id);

        await expect(workforceRuntime.getAuth()).rejects.toBeInstanceOf(AuthRuntimeClosedError);

        const freshWorkforce = getWorkforceAuthRuntime({
          auth: config.workforce,
          persistence: applicationConfig(database.connectionString),
        });
        try {
          const freshAdapter = await internalAdapterFor(freshWorkforce);
          const workforceUser = await freshAdapter.createUser({
            email: "fresh-workforce-after-close@example.test",
            name: "Fresh Workforce",
            emailVerified: false,
          });
          const workforceSession = await freshAdapter.createSession(workforceUser.id);
          const found = await freshAdapter.findSession(workforceSession.token);
          expect(found?.session.userId).toBe(workforceUser.id);
        } finally {
          await freshWorkforce.close();
        }
      } finally {
        await customerRuntime.close();
        // workforceRuntime may already be closed; close is idempotent.
        await workforceRuntime.close();
      }
    });
  });
});

describe("IMP-008 expired session rejection", () => {
  it.each([
    {
      realm: "customer" as const,
      sessionsTable: "customer_auth_sessions",
      cookiePrefix: CUSTOMER_AUTH_COOKIE_PREFIX,
      secretKey: "customer" as const,
      createOwnRuntime: (
        config: ReturnType<typeof authFoundationConfig>,
        databaseUrl: string,
      ) =>
        getCustomerAuthRuntime(
          { auth: config.customer, persistence: applicationConfig(databaseUrl) },
          customerPhoneDependencies(),
        ),
      createOtherRuntime: (
        config: ReturnType<typeof authFoundationConfig>,
        databaseUrl: string,
      ) => getWorkforceAuthRuntime({ auth: config.workforce, persistence: applicationConfig(databaseUrl) }),
    },
    {
      realm: "workforce" as const,
      sessionsTable: "workforce_auth_sessions",
      cookiePrefix: WORKFORCE_AUTH_COOKIE_PREFIX,
      secretKey: "workforce" as const,
      createOwnRuntime: (
        config: ReturnType<typeof authFoundationConfig>,
        databaseUrl: string,
      ) => getWorkforceAuthRuntime({ auth: config.workforce, persistence: applicationConfig(databaseUrl) }),
      createOtherRuntime: (
        config: ReturnType<typeof authFoundationConfig>,
        databaseUrl: string,
      ) =>
        getCustomerAuthRuntime(
          { auth: config.customer, persistence: applicationConfig(databaseUrl) },
          customerPhoneDependencies(),
        ),
    },
  ])(
    "rejects an already-expired $realm session as inactive",
    async ({ realm, sessionsTable, cookiePrefix, secretKey, createOwnRuntime, createOtherRuntime }) => {
      await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
        await applyMigrations(database.connectionString);
        const config = authFoundationConfig();
        const ownRuntime = createOwnRuntime(config, database.connectionString);
        const otherRuntime = createOtherRuntime(config, database.connectionString);

        try {
          const ownAdapter = await internalAdapterFor(ownRuntime);
          const otherAdapter = await internalAdapterFor(otherRuntime);
          const auth = await ownRuntime.getAuth();

          const user = await ownAdapter.createUser({
            email: `expired-${realm}@example.test`,
            name: `Expired ${realm}`,
            emailVerified: false,
          });

          // Deterministic past timestamps via Better Auth createSession overrideAll —
          // does not change the production seven-day session policy.
          const session = await ownAdapter.createSession(
            user.id,
            false,
            {
              expiresAt: EXPIRED_SESSION_EXPIRES_AT,
              createdAt: EXPIRED_SESSION_CREATED_AT,
              updatedAt: EXPIRED_SESSION_CREATED_AT,
            },
            true,
          );

          await withTestDatabaseClient(database.connectionString, async (client) => {
            const before = await client.pool.query<{ expires_at: Date }>(
              `select expires_at from app.${sessionsTable} where token = $1`,
              [session.token],
            );
            expect(before.rowCount).toBe(1);
            expect(before.rows[0]?.expires_at.getTime()).toBe(EXPIRED_SESSION_EXPIRES_AT.getTime());
          });

          const headers = await signedSessionCookieHeaders(
            cookiePrefix,
            session.token,
            config[secretKey].secret,
          );

          let activeSession: unknown;
          try {
            activeSession = await auth.api.getSession({ headers });
          } catch (error) {
            assertNoSecretsInText(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
            throw error;
          }

          expect(activeSession).toBeNull();
          await expect(otherAdapter.findSession(session.token)).resolves.toBeNull();

          // Better Auth 1.6.25 getSession deletes expired database sessions on lookup.
          await withTestDatabaseClient(database.connectionString, async (client) => {
            const after = await client.pool.query(
              `select 1 from app.${sessionsTable} where token = $1`,
              [session.token],
            );
            expect(after.rowCount).toBe(0);
          });
        } finally {
          await ownRuntime.close();
          await otherRuntime.close();
        }
      });
    },
  );
});

describe("IMP-008 revoke-all sessions for one user", () => {
  it("deleteUserSessions revokes all sessions for one customer user without affecting another customer or workforce", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const config = authFoundationConfig();

      const customerRuntime = getCustomerAuthRuntime(
        {
          auth: config.customer,
          persistence: applicationConfig(database.connectionString),
        },
        customerPhoneDependencies(),
      );
      const workforceRuntime = getWorkforceAuthRuntime({
        auth: config.workforce,
        persistence: applicationConfig(database.connectionString),
      });

      try {
        const customerAdapter = await internalAdapterFor(customerRuntime);
        const workforceAdapter = await internalAdapterFor(workforceRuntime);

        const targetUser = await customerAdapter.createUser({
          email: "revoke-target@example.test",
          name: "Revoke Target",
          emailVerified: false,
        });
        const otherUser = await customerAdapter.createUser({
          email: "revoke-other@example.test",
          name: "Revoke Other",
          emailVerified: false,
        });
        const workforceUser = await workforceAdapter.createUser({
          email: "revoke-workforce@example.test",
          name: "Revoke Workforce",
          emailVerified: false,
        });

        const targetSessionA = await customerAdapter.createSession(targetUser.id);
        const targetSessionB = await customerAdapter.createSession(targetUser.id);
        const otherSession = await customerAdapter.createSession(otherUser.id);
        const workforceSession = await workforceAdapter.createSession(workforceUser.id);

        await expect(customerAdapter.findSession(targetSessionA.token)).resolves.not.toBeNull();
        await expect(customerAdapter.findSession(targetSessionB.token)).resolves.not.toBeNull();

        // Better Auth 1.6.25 revoke-all for one user (not deleteSessions-by-token-list).
        await customerAdapter.deleteUserSessions(targetUser.id);

        await expect(customerAdapter.findSession(targetSessionA.token)).resolves.toBeNull();
        await expect(customerAdapter.findSession(targetSessionB.token)).resolves.toBeNull();
        await expect(customerAdapter.findSession(otherSession.token)).resolves.not.toBeNull();
        await expect(workforceAdapter.findSession(workforceSession.token)).resolves.not.toBeNull();
      } finally {
        await customerRuntime.close();
        await workforceRuntime.close();
      }
    });
  });
});
