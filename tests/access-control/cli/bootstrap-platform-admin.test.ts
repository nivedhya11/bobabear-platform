/**
 * Bootstrap Platform Super Admin function tests (IMP-011).
 * Uses Testcontainers via vitest.database.config.mts — not the CLI process.
 */
import { afterEach, describe, expect, inject, it } from "vitest";

import type { WebConfig } from "../../../src/platform/config";
import {
  BootstrapClosedError,
  BootstrapIneligibleError,
  bootstrapPlatformSuperAdmin,
} from "../../../src/server/access-control";
import { getApplicationPersistence } from "../../../src/server/persistence";
import {
  createDisabledWorkforceUser,
  createEligibleWorkforceUser,
  createMfaDisabledWorkforceUser,
  createPasswordChangeRequiredWorkforceUser,
} from "../../database/support/access-control-fixtures";
import { applyMigrations, withIsolatedTestDatabase } from "../../database/support/test-database";

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
  fn: (persistence: ReturnType<typeof getApplicationPersistence>) => Promise<T>,
): Promise<T> {
  return withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
    await applyMigrations(database.connectionString);
    const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
    openHandles.push(persistence);
    return fn(persistence);
  });
}

describe("bootstrapPlatformSuperAdmin", () => {
  it("succeeds for an eligible MFA-enabled workforce user", async () => {
    await withMigratedPersistence(async (persistence) => {
      const user = await createEligibleWorkforceUser(persistence);
      const result = await bootstrapPlatformSuperAdmin({
        persistence,
        workforceUserId: user.id,
      });
      expect(result.outcome).toBe("bootstrapped");
      expect(result.assignment.roleKey).toBe("platform_super_admin");
      expect(result.membership.scopeType).toBe("platform");
      expect(result.membership.status).toBe("active");
    });
  });

  it("rejects disabled, password-change-required, and MFA-not-enabled users", async () => {
    await withMigratedPersistence(async (persistence) => {
      const disabled = await createDisabledWorkforceUser(persistence);
      await expect(
        bootstrapPlatformSuperAdmin({ persistence, workforceUserId: disabled.id }),
      ).rejects.toBeInstanceOf(BootstrapIneligibleError);

      const pcr = await createPasswordChangeRequiredWorkforceUser(persistence);
      await expect(
        bootstrapPlatformSuperAdmin({ persistence, workforceUserId: pcr.id }),
      ).rejects.toBeInstanceOf(BootstrapIneligibleError);

      const noMfa = await createMfaDisabledWorkforceUser(persistence);
      await expect(
        bootstrapPlatformSuperAdmin({ persistence, workforceUserId: noMfa.id }),
      ).rejects.toBeInstanceOf(BootstrapIneligibleError);
    });
  });

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
      expect(again.assignment.id).toBe(once.assignment.id);

      await expect(
        bootstrapPlatformSuperAdmin({ persistence, workforceUserId: second.id }),
      ).rejects.toBeInstanceOf(BootstrapClosedError);

      const closed = new BootstrapClosedError();
      expect(JSON.stringify(closed.toSafeJSON())).not.toMatch(/postgresql:\/\//i);
      expect(JSON.stringify(closed.toSafeJSON())).not.toMatch(/@example\.invalid/i);
    });
  });
});
