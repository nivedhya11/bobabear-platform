/**
 * Trusted workforce session resolver tests (IMP-029 / D-372).
 *
 * Proves the shared server-side workforce trust boundary resolves only
 * lifecycle-eligible identities from authoritative Better Auth sessions.
 */
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, inject, it } from "vitest";

import { workforceAuthUsers } from "../../src/platform/database/schema/workforce-auth";
import type { WebConfig } from "../../src/platform/config";
import {
  getWorkforceAuthRuntime,
  resolveTrustedWorkforceAuthIdentity,
  type TrustedWorkforceAuthIdentity,
} from "../../src/server/auth/workforce";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import {
  createWorkforcePrincipalFromTrustedIdentity,
  isWorkforcePrincipal,
} from "../../src/server/access-control/principal";
import { getApplicationPersistence, type Persistence } from "../../src/server/persistence";
import {
  createDisabledWorkforceUser,
  createEligibleWorkforceUser,
  createMfaDisabledWorkforceUser,
  createPasswordChangeRequiredWorkforceUser,
} from "../database/support/access-control-fixtures";
import { applyMigrations, withIsolatedTestDatabase } from "../database/support/test-database";

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
    publicOrigin: "http://localhost:3200",
    logLevel: "warn",
    release: null,
    allowUnsafeAdapters: true,
    databaseSslMode: "disable",
    port: 3000,
    databaseUrl,
  };
}

function authFoundationConfig() {
  return loadAuthFoundationConfig(
    {
      CUSTOMER_AUTH_SECRET: "trusted-workforce-resolver-customer-secret-32-chars",
      CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
      WORKFORCE_AUTH_SECRET: "trusted-workforce-resolver-workforce-secret-32",
      WORKFORCE_AUTH_BASE_URL: "http://localhost:3200",
    },
    "test",
  );
}

type InternalAdapter = {
  createSession: (userId: string) => Promise<{ token: string }>;
  findSession: (
    token: string,
  ) => Promise<{ session: { token: string }; user: { id: string } } | null>;
};

const openHandles: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(openHandles.splice(0).map((h) => h.close()));
});

async function internalAdapterFor(runtime: {
  getAuth: () => Promise<{ $context: Promise<unknown> }>;
}): Promise<InternalAdapter> {
  const auth = await runtime.getAuth();
  const context = (await auth.$context) as { internalAdapter: InternalAdapter };
  return context.internalAdapter;
}

async function withWorkforceResolverHarness<T>(
  callback: (ctx: {
    persistence: Persistence;
    runtime: ReturnType<typeof getWorkforceAuthRuntime>;
  }) => Promise<T>,
): Promise<T> {
  return withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
    await applyMigrations(database.connectionString);
    const persistence = getApplicationPersistence(
      applicationConfig(database.connectionString),
    );
    openHandles.push(persistence);
    const runtime = getWorkforceAuthRuntime({
      auth: authFoundationConfig().workforce,
      persistence: applicationConfig(database.connectionString),
    });
    openHandles.push(runtime);
    return callback({ persistence, runtime });
  });
}

function assertNoScopeAuthority(identity: TrustedWorkforceAuthIdentity): void {
  expect(identity).not.toHaveProperty("roles");
  expect(identity).not.toHaveProperty("permissions");
  expect(identity).not.toHaveProperty("memberships");
  expect(identity).not.toHaveProperty("organization");
  expect(identity).not.toHaveProperty("territory");
  expect(identity).not.toHaveProperty("outlet");
  expect(identity).not.toHaveProperty("scope");
}

describe("IMP-029 trusted workforce session resolver", () => {
  it("A. missing session yields no trusted eligible workforce identity", async () => {
    await withWorkforceResolverHarness(async ({ runtime }) => {
      const identity = await resolveTrustedWorkforceAuthIdentity(runtime, {
        headers: new Headers(),
      });
      expect(identity).toBeNull();
    });
  });

  it("B. session for unknown user does not yield trusted eligible identity", async () => {
    await withWorkforceResolverHarness(async ({ persistence, runtime }) => {
      const user = await createEligibleWorkforceUser(persistence);
      const adapter = await internalAdapterFor(runtime);
      const session = await adapter.createSession(user.id);

      await persistence.withContext(async (ctx) => {
        await ctx.db.delete(workforceAuthUsers).where(eq(workforceAuthUsers.id, user.id));
      });

      const identity = await resolveTrustedWorkforceAuthIdentity(runtime, {
        sessionToken: session.token,
      });
      expect(identity).toBeNull();
    });
  });

  it("C. disabled user does not yield trusted eligible identity", async () => {
    await withWorkforceResolverHarness(async ({ persistence, runtime }) => {
      const user = await createDisabledWorkforceUser(persistence);
      const adapter = await internalAdapterFor(runtime);
      const session = await adapter.createSession(user.id);
      const identity = await resolveTrustedWorkforceAuthIdentity(runtime, {
        sessionToken: session.token,
      });
      expect(identity).toBeNull();
    });
  });

  it("D. password-change-required user does not become eligible principal", async () => {
    await withWorkforceResolverHarness(async ({ persistence, runtime }) => {
      const user = await createPasswordChangeRequiredWorkforceUser(persistence);
      const adapter = await internalAdapterFor(runtime);
      const session = await adapter.createSession(user.id);
      const identity = await resolveTrustedWorkforceAuthIdentity(runtime, {
        sessionToken: session.token,
      });
      expect(identity).toBeNull();
    });
  });

  it("E. MFA-not-enabled user does not become eligible principal", async () => {
    await withWorkforceResolverHarness(async ({ persistence, runtime }) => {
      const user = await createMfaDisabledWorkforceUser(persistence);
      const adapter = await internalAdapterFor(runtime);
      const session = await adapter.createSession(user.id);
      const identity = await resolveTrustedWorkforceAuthIdentity(runtime, {
        sessionToken: session.token,
      });
      expect(identity).toBeNull();
    });
  });

  it("F. fully eligible session resolves trusted identity and WorkforcePrincipal", async () => {
    await withWorkforceResolverHarness(async ({ persistence, runtime }) => {
      const user = await createEligibleWorkforceUser(persistence);
      const adapter = await internalAdapterFor(runtime);
      const session = await adapter.createSession(user.id);

      const fromToken = await resolveTrustedWorkforceAuthIdentity(runtime, {
        sessionToken: session.token,
      });
      expect(fromToken?.workforceUserId).toBe(user.id);
      expect(fromToken?.disabledAt).toBeNull();
      expect(fromToken?.passwordChangeRequired).toBe(false);
      expect(fromToken?.twoFactorEnabled).toBe(true);
      assertNoScopeAuthority(fromToken!);

      const principal = createWorkforcePrincipalFromTrustedIdentity(fromToken!);
      expect(isWorkforcePrincipal(principal)).toBe(true);
      expect(principal.workforceUserId).toBe(user.id);
    });
  });

  it("F2. headers credential path rejects missing session cookies", async () => {
    await withWorkforceResolverHarness(async ({ runtime }) => {
      const identity = await resolveTrustedWorkforceAuthIdentity(runtime, {
        headers: new Headers(),
      });
      expect(identity).toBeNull();
    });
  });

  it("G. identity comes from validated session state, not caller-supplied user id", async () => {
    await withWorkforceResolverHarness(async ({ persistence, runtime }) => {
      const user = await createEligibleWorkforceUser(persistence);
      const adapter = await internalAdapterFor(runtime);
      const session = await adapter.createSession(user.id);

      const identity = await resolveTrustedWorkforceAuthIdentity(runtime, {
        sessionToken: session.token,
      });
      expect(identity?.workforceUserId).toBe(user.id);
      expect(identity?.workforceUserId).not.toBe("caller-supplied-user-id");

      const forged = {
        workforceUserId: "caller-supplied-user-id",
        disabledAt: null,
        passwordChangeRequired: false as const,
        twoFactorEnabled: true as const,
      };
      expect(() => createWorkforcePrincipalFromTrustedIdentity(forged)).not.toThrow();
      expect(isWorkforcePrincipal(forged)).toBe(false);
    });
  });

  it("H. resolver does not mint role/permission/outlet/scope authority", async () => {
    await withWorkforceResolverHarness(async ({ persistence, runtime }) => {
      const user = await createEligibleWorkforceUser(persistence);
      const adapter = await internalAdapterFor(runtime);
      const session = await adapter.createSession(user.id);
      const identity = await resolveTrustedWorkforceAuthIdentity(runtime, {
        sessionToken: session.token,
      });
      expect(identity).not.toBeNull();
      assertNoScopeAuthority(identity!);
      expect(Object.keys(identity!).sort()).toEqual([
        "disabledAt",
        "passwordChangeRequired",
        "twoFactorEnabled",
        "workforceUserId",
      ]);
    });
  });
});
