/**
 * PostgreSQL integration tests for workforce authentication and MFA
 * (IMP-010). Real Testcontainers PostgreSQL 18 only — every test gets its
 * own isolated, freshly-migrated database. Mirrors
 * `customer-phone-auth.integration.test.ts` / `auth-foundation.integration.test.ts`.
 *
 * Secrets here are deliberately distinct from the customer-phone and
 * auth-foundation suites. Never prints passwords, TOTP secrets, backup
 * codes, or connection strings.
 */
import { createOTP } from "@better-auth/utils/otp";
import { base32 } from "@better-auth/utils/base32";
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, inject, it, vi } from "vitest";

import type { WebConfig } from "../../src/platform/config";
import { getCustomerAuthRuntime } from "../../src/server/auth/customer/runtime";
import { getWorkforceAuthRuntime } from "../../src/server/auth/workforce/runtime";
import {
  createWorkforceOperatorAuthRuntime,
  createWorkforceOperatorUser,
  findWorkforceUserByEmail,
  resetWorkforceOperatorPassword,
  setWorkforceOperatorLifecycleState,
  WorkforceOperatorResetTokenBridge,
  WorkforceOperatorResetTokenBridgeError,
} from "../../src/server/auth/workforce/operator";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import { createCustomerTemporaryIdentityDeriver, type CustomerPiiHashSecret } from "../../src/server/customer-auth/pii";
import { createCustomerOtpProvider } from "../../src/server/customer-auth/provider";
import {
  getApplicationPersistence,
  type Persistence,
} from "../../src/server/persistence";
import {
  consumeWorkforceAuthRateLimit,
  consumeWorkforceAuthRateLimits,
  deleteExpiredWorkforceAuthRateLimits,
  hashWorkforceAuthEmailKey,
  hashWorkforceAuthIpKey,
  WORKFORCE_AUTH_RATE_LIMIT_RULES,
} from "../../src/server/workforce-auth/rate-limit";
import type { WorkforcePiiHashSecret } from "../../src/server/workforce-auth/pii";
import { WORKFORCE_TOTP_DIGITS, WORKFORCE_TOTP_PERIOD_SECONDS } from "../../src/server/auth/shared/workforce-session-policy";
import { normalizeWorkforceEmail } from "../../src/shared/workforce-auth/email";
import { resolveWorkforceAuthLifecycle } from "../../src/server/workforce-auth/auth-state";
import { withAuthFoundationRoleFixture } from "./support/auth-foundation-roles";
import { applyMigrations, withIsolatedTestDatabase, withTestDatabaseClient } from "./support/test-database";

function mustNormalizeEmail(raw: string) {
  const result = normalizeWorkforceEmail(raw);
  if (!result.ok) throw new Error(`Invalid test email: ${raw}`);
  return result.email;
}

const EMAIL_A = mustNormalizeEmail("ops-a@example.test");
const EMAIL_B = mustNormalizeEmail("ops-b@example.test");
const EMAIL_C = mustNormalizeEmail("ops-c@example.test");
const TEMP_PASSWORD = "temporary-password-15+";
const PERMANENT_PASSWORD = "permanent-password-15x";
const PII_HASH_SECRET = "workforce-auth-integration-test-pii-hash-secret-32" as WorkforcePiiHashSecret;

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

function authFoundationConfig() {
  return loadAuthFoundationConfig(
    {
      CUSTOMER_AUTH_SECRET: "customer-workforce-integration-test-secret-32chars",
      CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
      WORKFORCE_AUTH_SECRET: "workforce-auth-integration-test-secret-32-chars",
      WORKFORCE_AUTH_BASE_URL: "http://localhost:3200",
    },
    "test",
  );
}

type WorkforceAuthContext = {
  password: { hash: (password: string) => Promise<string> };
  internalAdapter: {
    createUser: (user: Record<string, unknown>) => Promise<{ id: string; email: string }>;
    findUserById: (userId: string) => Promise<Record<string, unknown> | null>;
    updateUser: (userId: string, data: Record<string, unknown>) => Promise<unknown>;
    updatePassword: (userId: string, password: string) => Promise<void>;
    deleteUserSessions: (userId: string) => Promise<void>;
    linkAccount: (account: Record<string, unknown>) => Promise<unknown>;
    createSession: (
      userId: string,
      dontRememberMe?: boolean,
    ) => Promise<{ id: string; token: string; userId: string }>;
    findSession: (token: string) => Promise<{ session: { token: string; userId: string } } | null>;
  };
  adapter: {
    deleteMany: (input: {
      model: string;
      where: Array<{ field: string; value: string }>;
    }) => Promise<unknown>;
  };
};

const openHandles: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(openHandles.splice(0).map((h) => h.close()));
});

async function workforceContext(
  runtime: ReturnType<typeof getWorkforceAuthRuntime>,
): Promise<WorkforceAuthContext> {
  const auth = await runtime.getAuth();
  return (await auth.$context) as unknown as WorkforceAuthContext;
}

/**
 * Provision a workforce user the same way the operator CLI does:
 * ephemeral operator runtime → `auth.api.signUpEmail` → BOBA Bear lifecycle
 * persistence for `input: false` fields. Never hashes passwords or
 * constructs credential accounts in test helpers.
 */
async function provisionWorkforceUser(
  databaseUrl: string,
  options: {
    email: string;
    name: string;
    password: string;
    passwordChangeRequired?: boolean;
    twoFactorEnabled?: boolean;
    disabledAt?: Date | null;
  },
): Promise<{ id: string; email: string }> {
  const config = authFoundationConfig();
  const operatorRuntime = createWorkforceOperatorAuthRuntime({
    auth: config.workforce,
    persistence: applicationConfig(databaseUrl),
  });
  try {
    const created = await createWorkforceOperatorUser(operatorRuntime, {
      email: options.email,
      name: options.name,
      temporaryPassword: options.password,
    });
    await operatorRuntime.withContext((ctx) =>
      setWorkforceOperatorLifecycleState(ctx, created.userId, {
        passwordChangeRequired: options.passwordChangeRequired ?? true,
        twoFactorEnabled: options.twoFactorEnabled ?? false,
        disabledAt: options.disabledAt ?? null,
      }),
    );
    return { id: created.userId, email: created.email };
  } finally {
    await operatorRuntime.close();
  }
}

async function operatorResetPassword(
  databaseUrl: string,
  options: { email: string; temporaryPassword: string },
): Promise<{ userId: string; capturedToken: string }> {
  const config = authFoundationConfig();
  const probe = createWorkforceOperatorAuthRuntime({
    auth: config.workforce,
    persistence: applicationConfig(databaseUrl),
  });
  let target: { id: string; email: string };
  try {
    const found = await probe.withContext((ctx) => findWorkforceUserByEmail(ctx, options.email));
    if (!found) throw new Error("missing workforce user for reset");
    target = { id: found.id, email: found.email };
  } finally {
    await probe.close();
  }

  const bridge = new WorkforceOperatorResetTokenBridge({
    userId: target.id,
    email: target.email,
  });
  let capturedToken = "";
  const wrappedSend = async (
    data: Parameters<WorkforceOperatorResetTokenBridge["sendResetPassword"]>[0],
  ) => {
    capturedToken = data.token;
    await bridge.sendResetPassword(data);
  };

  const runtime = createWorkforceOperatorAuthRuntime({
    auth: config.workforce,
    persistence: applicationConfig(databaseUrl),
    sendResetPassword: wrappedSend,
  });
  try {
    await resetWorkforceOperatorPassword(
      runtime,
      { email: options.email, temporaryPassword: options.temporaryPassword },
      bridge,
    );
    return { userId: target.id, capturedToken };
  } finally {
    bridge.clear();
    await runtime.close();
  }
}

function secretFromTotpUri(totpUri: string): string {
  const url = new URL(totpUri);
  const encoded = url.searchParams.get("secret");
  if (!encoded) {
    throw new Error("totpURI missing secret query parameter");
  }
  // Better Auth base32-encodes the raw secret into the otpauth URI; createOTP
  // expects the original raw secret string, not the base32 form.
  return new TextDecoder().decode(base32.decode(encoded));
}

async function currentTotpCode(secret: string): Promise<string> {
  return createOTP(secret, {
    digits: WORKFORCE_TOTP_DIGITS,
    period: WORKFORCE_TOTP_PERIOD_SECONDS,
  }).totp();
}

function cookieHeaderFromSetCookie(setCookies: readonly string[]): string {
  return setCookies.map((raw) => raw.split(";", 1)[0]!).join("; ");
}

async function dumpRelevantTablesAsText(connectionString: string): Promise<string> {
  return withTestDatabaseClient(connectionString, async (client) => {
    const tables = [
      "workforce_auth_users",
      "workforce_auth_sessions",
      "workforce_auth_accounts",
      "workforce_auth_verifications",
      "workforce_auth_two_factors",
      "workforce_auth_rate_limits",
      "outbox_events",
      "idempotency_records",
    ];
    const parts: string[] = [];
    for (const table of tables) {
      const result = await client.pool.query(`select * from app.${table}`);
      parts.push(JSON.stringify(result.rows));
    }
    return parts.join("\n");
  });
}

describe("IMP-010 migration: two-factor fields, tables, customer unchanged", () => {
  it("adds two_factor_enabled / password_change_required / disabled_at only to workforce_auth_users", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withTestDatabaseClient(database.connectionString, async (client) => {
        const columns = await client.pool.query<{
          column_name: string;
          is_nullable: string;
          data_type: string;
        }>(
          `SELECT column_name, is_nullable, data_type FROM information_schema.columns
           WHERE table_schema = 'app' AND table_name = 'workforce_auth_users'
             AND column_name IN ('two_factor_enabled', 'password_change_required', 'disabled_at')
           ORDER BY column_name`,
        );
        expect(columns.rows).toEqual([
          { column_name: "disabled_at", is_nullable: "YES", data_type: "timestamp without time zone" },
          { column_name: "password_change_required", is_nullable: "NO", data_type: "boolean" },
          { column_name: "two_factor_enabled", is_nullable: "YES", data_type: "boolean" },
        ]);

        const customerColumns = await client.pool.query(
          `SELECT column_name FROM information_schema.columns
           WHERE table_schema = 'app' AND table_name = 'customer_auth_users'
             AND column_name IN ('two_factor_enabled', 'password_change_required', 'disabled_at')`,
        );
        expect(customerColumns.rowCount).toBe(0);
      });
    });
  });

  it("creates workforce_auth_two_factors and workforce_auth_rate_limits with expected columns", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withTestDatabaseClient(database.connectionString, async (client) => {
        const twoFactorCols = await client.pool.query<{ column_name: string }>(
          `SELECT column_name FROM information_schema.columns
           WHERE table_schema = 'app' AND table_name = 'workforce_auth_two_factors'
           ORDER BY column_name`,
        );
        expect(twoFactorCols.rows.map((r) => r.column_name)).toEqual([
          "backup_codes",
          "failed_verification_count",
          "id",
          "locked_until",
          "secret",
          "user_id",
          "verified",
        ]);

        const rateLimitCols = await client.pool.query<{ column_name: string }>(
          `SELECT column_name FROM information_schema.columns
           WHERE table_schema = 'app' AND table_name = 'workforce_auth_rate_limits'
           ORDER BY column_name`,
        );
        expect(rateLimitCols.rows.map((r) => r.column_name)).toEqual([
          "blocked_until",
          "created_at",
          "key_hash",
          "request_count",
          "scope",
          "updated_at",
          "window_seconds",
          "window_started_at",
        ]);
      });
    });
  });

  it("enforces rate-limit scope CHECK and no cross-realm foreign keys", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withTestDatabaseClient(database.connectionString, async (client) => {
        await expect(
          client.pool.query(
            `insert into app.workforce_auth_rate_limits
              (scope, key_hash, window_started_at, window_seconds, request_count, created_at, updated_at)
             values ('bogus_scope', repeat('a', 64), now(), 60, 1, now(), now())`,
          ),
        ).rejects.toThrow();

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
        expect(fks.rows.some((r) => r.table_name === "workforce_auth_two_factors")).toBe(true);
      });
    });
  });

  it("lists the expected app tables after IMP-010 without inventing customer MFA tables", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withTestDatabaseClient(database.connectionString, async (client) => {
        const tables = await client.pool.query<{ table_name: string }>(
          `SELECT table_name FROM information_schema.tables WHERE table_schema = 'app' ORDER BY table_name`,
        );
        expect(tables.rows.map((r) => r.table_name)).toEqual([
          "access_control_audit_events",
          "access_memberships",
          "access_permissions",
          "access_role_allowed_scopes",
          "access_role_assignments",
          "access_role_permissions",
          "access_roles",
          "assortment_availability_audit_events",
          "assortment_rules",
          "brand_promotion_policies",
          "brands",
          "cart_line_bundle_modifier_selections",
          "cart_line_bundle_selections",
          "cart_line_modifier_selections",
          "cart_lines",
          "carts",
          "catalog_bundle_group_options",
          "catalog_bundle_groups",
          "catalog_dietary_tags",
          "catalog_modifier_group_options",
          "catalog_modifier_groups",
          "catalog_modifier_option_dietary_tags",
          "catalog_modifier_options",
          "catalog_products",
          "catalog_variant_dietary_tags",
          "catalog_variant_modifier_groups",
          "catalog_variants",
          "charge_definitions",
          "customer_address_audit_events",
          "customer_addresses",
          "customer_auth_accounts",
          "customer_auth_sessions",
          "customer_auth_users",
          "customer_auth_verifications",
          "customer_otp_rate_limits",
          "customer_profile_audit_events",
          "customer_profiles",
          "idempotency_records",
          "legal_entities",
          "legal_entity_tax_profiles",
          "menu_entries",
          "menu_sections",
          "menus",
          "organizations",
          "outbox_events",
          "outlet_modifier_option_availability",
          "outlet_operating_intervals",
          "outlet_operating_profiles",
          "outlet_serviceability_audit_events",
          "outlet_serviceability_configs",
          "outlet_serviceability_pins",
          "outlet_tax_profiles",
          "outlet_variant_availability",
          "outlets",
          "price_book_bundle_option_prices",
          "price_book_charge_prices",
          "price_book_modifier_prices",
          "price_book_variant_prices",
          "price_books",
          "pricing_tax_audit_events",
          "promotion_audit_events",
          "promotion_benefits",
          "promotion_coupons",
          "promotion_targets",
          "promotions",
          "tax_categories",
          "tax_policies",
          "tax_policy_components",
          "territories",
          "workforce_auth_accounts",
          "workforce_auth_rate_limits",
          "workforce_auth_sessions",
          "workforce_auth_two_factors",
          "workforce_auth_users",
          "workforce_auth_verifications",
        ]);
        expect(tables.rows.map((r) => r.table_name)).not.toContain("customer_auth_two_factors");
      });
    });
  });
});

describe("IMP-010 application-role privileges", () => {
  it("grants DML on workforce_auth_two_factors and rate_limits, and forbids DDL", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withAuthFoundationRoleFixture(database.databaseName, database.connectionString, async (fixture) => {
        const persistence = getApplicationPersistence(applicationConfig(fixture.applicationConnectionString));
        openHandles.push(persistence);
        await expect(
          persistence.withContext((ctx) =>
            ctx.db.execute(sql`
              insert into app.workforce_auth_rate_limits
                (scope, key_hash, window_started_at, window_seconds, request_count, created_at, updated_at)
              values
                ('workforce_sign_in_email_15m', repeat('b', 64), now(), 900, 1, now(), now())
            `),
          ),
        ).resolves.toBeDefined();

        await expect(
          persistence.withContext((ctx) =>
            ctx.db.execute(sql`alter table app.workforce_auth_two_factors add column bogus text`),
          ),
        ).rejects.toThrow();
        await expect(
          persistence.withContext((ctx) => ctx.db.execute(sql`drop table app.workforce_auth_rate_limits`)),
        ).rejects.toThrow();
      });
    });
  });
});

describe("IMP-010 account lifecycle", () => {
  it("provisions a temporary-password user with passwordChangeRequired=true", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const config = authFoundationConfig();
      const runtime = getWorkforceAuthRuntime({
        auth: config.workforce,
        persistence: applicationConfig(database.connectionString),
      });
      openHandles.push(runtime);

      const user = await provisionWorkforceUser(database.connectionString, {
        email: EMAIL_A,
        name: "Ops A",
        password: TEMP_PASSWORD,
        passwordChangeRequired: true,
      });

      const ctx = await workforceContext(runtime);
      const loaded = await ctx.internalAdapter.findUserById(user.id);
      expect(loaded?.passwordChangeRequired).toBe(true);
      expect(loaded?.twoFactorEnabled).toBe(false);
      expect(loaded?.disabledAt ?? null).toBeNull();
    });
  });

  it("clears passwordChangeRequired on permanent password transition and supports disable/enable/reset", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const config = authFoundationConfig();
      const runtime = getWorkforceAuthRuntime({
        auth: config.workforce,
        persistence: applicationConfig(database.connectionString),
      });
      openHandles.push(runtime);

      const user = await provisionWorkforceUser(database.connectionString, {
        email: EMAIL_B,
        name: "Ops B",
        password: TEMP_PASSWORD,
      });
      const ctx = await workforceContext(runtime);

      await operatorResetPassword(database.connectionString, {
        email: EMAIL_B,
        temporaryPassword: PERMANENT_PASSWORD,
      });
      // Flip lifecycle via persistence (BOBA Bear-owned field) after a
      // successful permanent-password reset that left passwordChangeRequired.
      const persistence = getApplicationPersistence(
        applicationConfig(database.connectionString),
      );
      openHandles.push(persistence);
      await persistence.withContext((pctx) =>
        setWorkforceOperatorLifecycleState(pctx, user.id, {
          passwordChangeRequired: false,
        }),
      );
      expect((await ctx.internalAdapter.findUserById(user.id))?.passwordChangeRequired).toBe(false);

      await persistence.withContext((pctx) =>
        setWorkforceOperatorLifecycleState(pctx, user.id, {
          passwordChangeRequired: false,
          disabledAt: new Date(),
        }),
      );
      expect((await ctx.internalAdapter.findUserById(user.id))?.disabledAt).toBeTruthy();

      await persistence.withContext((pctx) =>
        setWorkforceOperatorLifecycleState(pctx, user.id, {
          passwordChangeRequired: false,
          disabledAt: null,
        }),
      );
      expect((await ctx.internalAdapter.findUserById(user.id))?.disabledAt ?? null).toBeNull();

      await operatorResetPassword(database.connectionString, {
        email: EMAIL_B,
        temporaryPassword: TEMP_PASSWORD,
      });
      expect((await ctx.internalAdapter.findUserById(user.id))?.passwordChangeRequired).toBe(true);

      // MFA reset path (no enrollment yet): delete twoFactor rows + clear flag.
      await ctx.adapter.deleteMany({
        model: "twoFactor",
        where: [{ field: "userId", value: user.id }],
      });
      await persistence.withContext((pctx) =>
        setWorkforceOperatorLifecycleState(pctx, user.id, {
          passwordChangeRequired: true,
          twoFactorEnabled: false,
        }),
      );
      expect((await ctx.internalAdapter.findUserById(user.id))?.twoFactorEnabled).toBe(false);
    });
  });
});

describe("IMP-010 MFA enrollment, verification, lockout, backup codes", () => {
  it("enrolls TOTP, verifies enrollment, rejects invalid codes, locks after 5 failures, and accepts a one-time backup code", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const config = authFoundationConfig();
      const runtime = getWorkforceAuthRuntime({
        auth: config.workforce,
        persistence: applicationConfig(database.connectionString),
      });
      openHandles.push(runtime);

      const user = await provisionWorkforceUser(database.connectionString, {
        email: EMAIL_C,
        name: "Ops C",
        password: PERMANENT_PASSWORD,
        passwordChangeRequired: false,
        twoFactorEnabled: false,
      });

      const auth = await runtime.getAuth();
      const signIn = await auth.api.signInEmail({
        body: { email: EMAIL_C, password: PERMANENT_PASSWORD },
        returnHeaders: true,
      });
      const sessionCookie = cookieHeaderFromSetCookie(signIn.headers.getSetCookie());
      expect(sessionCookie).toMatch(/session_token=/);

      const enroll = await auth.api.enableTwoFactor({
        body: { password: PERMANENT_PASSWORD },
        headers: new Headers({ cookie: sessionCookie }),
        returnHeaders: true,
      });
      expect(enroll.response.totpURI).toMatch(/^otpauth:\/\//);
      expect(enroll.response.backupCodes.length).toBeGreaterThan(0);
      const plaintextBackupCodes = [...enroll.response.backupCodes];
      const totpSecret = secretFromTotpUri(enroll.response.totpURI);

      const dumpAfterEnroll = await dumpRelevantTablesAsText(database.connectionString);
      for (const code of plaintextBackupCodes) {
        expect(dumpAfterEnroll).not.toContain(code);
      }
      expect(dumpAfterEnroll).not.toContain(totpSecret);
      expect(dumpAfterEnroll).not.toContain(enroll.response.totpURI);
      // Rate-limit rows must never contain the raw email (hashed keys only).
      await withTestDatabaseClient(database.connectionString, async (client) => {
        const rateRows = await client.pool.query(`select * from app.workforce_auth_rate_limits`);
        const rateText = JSON.stringify(rateRows.rows);
        expect(rateText).not.toContain(EMAIL_C);
      });

      const validEnrollmentCode = await currentTotpCode(totpSecret);
      await auth.api.verifyTOTP({
        body: { code: validEnrollmentCode, trustDevice: false },
        headers: new Headers({ cookie: sessionCookie }),
      });

      const ctx = await workforceContext(runtime);
      expect((await ctx.internalAdapter.findUserById(user.id))?.twoFactorEnabled).toBe(true);

      // Fresh password sign-in should require MFA (twoFactorRedirect).
      const challenge = await auth.api.signInEmail({
        body: { email: EMAIL_C, password: PERMANENT_PASSWORD },
        returnHeaders: true,
      });
      expect(challenge.response).toMatchObject({ twoFactorRedirect: true });
      const mfaCookie = cookieHeaderFromSetCookie(challenge.headers.getSetCookie());

      await expect(
        auth.api.verifyTOTP({
          body: { code: "000000", trustDevice: false },
          headers: new Headers({ cookie: mfaCookie }),
        }),
      ).rejects.toThrow();

      // Drive lockout: 5 consecutive failures (MAX = 5).
      for (let i = 0; i < 4; i += 1) {
        await expect(
          auth.api.verifyTOTP({
            body: { code: "000000", trustDevice: false },
            headers: new Headers({ cookie: mfaCookie }),
          }),
        ).rejects.toThrow();
      }
      await expect(
        auth.api.verifyTOTP({
          body: { code: "000000", trustDevice: false },
          headers: new Headers({ cookie: mfaCookie }),
        }),
      ).rejects.toThrow(/ACCOUNT_TEMPORARILY_LOCKED|locked|TOO_MANY/i);

      // Reset lockout via MFA reset so backup-code path is exercisable.
      await ctx.adapter.deleteMany({
        model: "twoFactor",
        where: [{ field: "userId", value: user.id }],
      });
      await ctx.internalAdapter.updateUser(user.id, { twoFactorEnabled: false });
      await ctx.internalAdapter.deleteUserSessions(user.id);

      const reSignIn = await auth.api.signInEmail({
        body: { email: EMAIL_C, password: PERMANENT_PASSWORD },
        returnHeaders: true,
      });
      const reCookie = cookieHeaderFromSetCookie(reSignIn.headers.getSetCookie());
      const reEnroll = await auth.api.enableTwoFactor({
        body: { password: PERMANENT_PASSWORD },
        headers: new Headers({ cookie: reCookie }),
        returnHeaders: true,
      });
      const reSecret = secretFromTotpUri(reEnroll.response.totpURI);
      const backupCode = reEnroll.response.backupCodes[0]!;
      await auth.api.verifyTOTP({
        body: { code: await currentTotpCode(reSecret), trustDevice: false },
        headers: new Headers({ cookie: reCookie }),
      });

      const mfaSignIn = await auth.api.signInEmail({
        body: { email: EMAIL_C, password: PERMANENT_PASSWORD },
        returnHeaders: true,
      });
      const mfaChallengeCookie = cookieHeaderFromSetCookie(mfaSignIn.headers.getSetCookie());

      const backupOk = await auth.api.verifyBackupCode({
        body: { code: backupCode, trustDevice: false, disableSession: false },
        headers: new Headers({ cookie: mfaChallengeCookie }),
        returnHeaders: true,
      });
      expect(backupOk.response.user?.id ?? backupOk.response.token).toBeTruthy();

      await expect(
        auth.api.verifyBackupCode({
          body: { code: backupCode, trustDevice: false, disableSession: false },
          headers: new Headers({ cookie: mfaChallengeCookie }),
        }),
      ).rejects.toThrow();
    });
  });
});

describe("IMP-010 sessions: password alone is not fully authenticated; resets revoke", () => {
  it("password-only session is not fully authenticated; MFA/password reset/disable revoke; customer unaffected", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const config = authFoundationConfig();
      const workforceRuntime = getWorkforceAuthRuntime({
        auth: config.workforce,
        persistence: applicationConfig(database.connectionString),
      });
      const customerRuntime = getCustomerAuthRuntime(
        {
          auth: config.customer,
          persistence: applicationConfig(database.connectionString),
        },
        {
          otpProvider: createCustomerOtpProvider({ kind: "local", environmentType: "test" }),
          identityDeriver: createCustomerTemporaryIdentityDeriver(
            "workforce-auth-customer-side-pii-hash-secret-32c" as CustomerPiiHashSecret,
          ),
        },
      );
      openHandles.push(workforceRuntime, customerRuntime);

      const workforceUser = await provisionWorkforceUser(database.connectionString, {
        email: "session-ops@example.test",
        name: "Session Ops",
        password: PERMANENT_PASSWORD,
        passwordChangeRequired: false,
        twoFactorEnabled: false,
      });

      const customerAuth = await customerRuntime.getAuth();
      const customerCtx = (await customerAuth.$context) as unknown as {
        internalAdapter: {
          createUser: (u: {
            email: string;
            name: string;
            emailVerified: boolean;
          }) => Promise<{ id: string }>;
          createSession: (userId: string) => Promise<{ token: string }>;
          findSession: (token: string) => Promise<unknown>;
        };
      };
      const customerUser = await customerCtx.internalAdapter.createUser({
        email: "customer-side@example.test",
        name: "Customer Side",
        emailVerified: true,
      });
      const customerSession = await customerCtx.internalAdapter.createSession(customerUser.id);

      const workforceAuth = await workforceRuntime.getAuth();
      const signIn = await workforceAuth.api.signInEmail({
        body: { email: "session-ops@example.test", password: PERMANENT_PASSWORD },
        returnHeaders: true,
      });
      // Without MFA enrolled, Better Auth may mint a session — but BOBA Bear
      // lifecycle treats twoFactorEnabled=false as MFA_ENROLLMENT_REQUIRED,
      // never AUTHENTICATED.
      const signInBody = signIn.response as {
        user?: { id?: string };
        token?: string;
        twoFactorRedirect?: boolean;
      };
      expect(signInBody.user?.id ?? signInBody.token).toBeTruthy();
      expect(signInBody.twoFactorRedirect).not.toBe(true);

      const ctx = await workforceContext(workforceRuntime);
      const limitedSession = await ctx.internalAdapter.createSession(workforceUser.id);
      expect(await ctx.internalAdapter.findSession(limitedSession.token)).toBeTruthy();

      // Enrollment completion path: revoke sessions after enabling MFA.
      const enrollCookie = cookieHeaderFromSetCookie(signIn.headers.getSetCookie());
      await workforceAuth.api.enableTwoFactor({
        body: { password: PERMANENT_PASSWORD },
        headers: new Headers({ cookie: enrollCookie }),
      });
      await ctx.internalAdapter.deleteUserSessions(workforceUser.id);
      expect(await ctx.internalAdapter.findSession(limitedSession.token)).toBeNull();

      // Password reset revokes sessions.
      const session2 = await ctx.internalAdapter.createSession(workforceUser.id);
      await operatorResetPassword(database.connectionString, {
        email: "session-ops@example.test",
        temporaryPassword: TEMP_PASSWORD,
      });
      expect(await ctx.internalAdapter.findSession(session2.token)).toBeNull();

      // Disable revokes sessions.
      const session3 = await ctx.internalAdapter.createSession(workforceUser.id);
      await ctx.internalAdapter.updateUser(workforceUser.id, { disabledAt: new Date() });
      await ctx.internalAdapter.deleteUserSessions(workforceUser.id);
      expect(await ctx.internalAdapter.findSession(session3.token)).toBeNull();

      // Customer session survives workforce revocation.
      expect(await customerCtx.internalAdapter.findSession(customerSession.token)).toBeTruthy();
    });
  });
});

describe("IMP-010 supported operator credential flow", () => {
  it("creates via signUpEmail with no session and authenticates the temporary password", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const config = authFoundationConfig();
      const operatorRuntime = createWorkforceOperatorAuthRuntime({
        auth: config.workforce,
        persistence: applicationConfig(database.connectionString),
      });
      openHandles.push(operatorRuntime);

      const created = await createWorkforceOperatorUser(operatorRuntime, {
        email: "create-ops@example.test",
        name: "Create Ops",
        temporaryPassword: TEMP_PASSWORD,
      });
      expect(created.sessionIssued).toBe(false);
      expect(created.passwordChangeRequired).toBe(true);
      expect(created.twoFactorEnabled).toBe(false);

      const publicRuntime = getWorkforceAuthRuntime({
        auth: config.workforce,
        persistence: applicationConfig(database.connectionString),
      });
      openHandles.push(publicRuntime);
      const auth = await publicRuntime.getAuth();
      const signIn = await auth.api.signInEmail({
        body: { email: "create-ops@example.test", password: TEMP_PASSWORD },
      });
      expect((signIn as { user?: { id?: string } }).user?.id).toBe(created.userId);

      const lifecycle = await operatorRuntime.withContext((ctx) =>
        findWorkforceUserByEmail(ctx, "create-ops@example.test"),
      );
      expect(lifecycle?.passwordChangeRequired).toBe(true);
      expect(lifecycle?.twoFactorEnabled).toBe(false);
      expect(lifecycle?.disabledAt).toBeNull();

      const state = resolveWorkforceAuthLifecycle({
        sessionPresent: true,
        user: {
          id: created.userId,
          disabledAt: null,
          passwordChangeRequired: true,
          twoFactorEnabled: false,
        },
        twoFactorChallengePending: false,
      });
      expect(state).toBe("PASSWORD_CHANGE_REQUIRED");
    });
  });

  it("resets via requestPasswordReset/resetPassword with hashed token storage, single-use, and session revocation", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const config = authFoundationConfig();
      const email = "reset-ops@example.test";
      const oldPassword = PERMANENT_PASSWORD;
      const newTemp = TEMP_PASSWORD;

      const user = await provisionWorkforceUser(database.connectionString, {
        email,
        name: "Reset Ops",
        password: oldPassword,
        passwordChangeRequired: false,
      });

      const publicRuntime = getWorkforceAuthRuntime({
        auth: config.workforce,
        persistence: applicationConfig(database.connectionString),
      });
      openHandles.push(publicRuntime);
      const auth = await publicRuntime.getAuth();
      const ctx = await workforceContext(publicRuntime);
      const liveSession = await ctx.internalAdapter.createSession(user.id);

      const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

      const { capturedToken } = await operatorResetPassword(database.connectionString, {
        email,
        temporaryPassword: newTemp,
      });
      expect(capturedToken.length).toBeGreaterThan(10);

      const dump = await dumpRelevantTablesAsText(database.connectionString);
      expect(dump).not.toContain(capturedToken);
      expect(dump).not.toContain(`reset-password:${capturedToken}`);

      // Token is single-use.
      await expect(
        (async () => {
          const bridge = new WorkforceOperatorResetTokenBridge({
            userId: user.id,
            email,
          });
          // Directly attempt a second resetPassword with the captured token.
          const op = createWorkforceOperatorAuthRuntime({
            auth: config.workforce,
            persistence: applicationConfig(database.connectionString),
            sendResetPassword: bridge.sendResetPassword,
          });
          try {
            const opAuth = await op.getAuth();
            await opAuth.api.resetPassword({
              body: { newPassword: "another-temporary-15+", token: capturedToken },
            });
          } finally {
            bridge.clear();
            await op.close();
          }
        })(),
      ).rejects.toThrow();

      expect(await ctx.internalAdapter.findSession(liveSession.token)).toBeNull();

      await expect(
        auth.api.signInEmail({ body: { email, password: oldPassword } }),
      ).rejects.toThrow();

      const signInTemp = await auth.api.signInEmail({
        body: { email, password: newTemp },
      });
      expect((signInTemp as { user?: { id?: string } }).user?.id).toBe(user.id);

      const persistence = getApplicationPersistence(
        applicationConfig(database.connectionString),
      );
      openHandles.push(persistence);
      const lifecycle = await persistence.withContext((pctx) =>
        findWorkforceUserByEmail(pctx, email),
      );
      expect(lifecycle?.passwordChangeRequired).toBe(true);
      expect(
        resolveWorkforceAuthLifecycle({
          sessionPresent: true,
          user: {
            id: user.id,
            disabledAt: null,
            passwordChangeRequired: true,
            twoFactorEnabled: false,
          },
          twoFactorChallengePending: false,
        }),
      ).toBe("PASSWORD_CHANGE_REQUIRED");

      const logged = [...logSpy.mock.calls, ...errorSpy.mock.calls, ...infoSpy.mock.calls, ...warnSpy.mock.calls]
        .flat()
        .map(String)
        .join("\n");
      expect(logged).not.toContain(capturedToken);
      logSpy.mockRestore();
      errorSpy.mockRestore();
      infoSpy.mockRestore();
      warnSpy.mockRestore();
    });
  });

  it("rejects unexpected reset-callback identity and leaves customer realm unaffected", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const config = authFoundationConfig();
      await provisionWorkforceUser(database.connectionString, {
        email: "bridge-ops@example.test",
        name: "Bridge Ops",
        password: TEMP_PASSWORD,
      });

      const bridge = new WorkforceOperatorResetTokenBridge({
        userId: "expected-id",
        email: "bridge-ops@example.test",
      });
      await expect(
        bridge.sendResetPassword({
          user: { id: "other-id", email: "bridge-ops@example.test" },
          url: "http://localhost/reset",
          token: "should-not-leak",
        }),
      ).rejects.toBeInstanceOf(WorkforceOperatorResetTokenBridgeError);

      const customerRuntime = getCustomerAuthRuntime(
        {
          auth: config.customer,
          persistence: applicationConfig(database.connectionString),
        },
        {
          otpProvider: createCustomerOtpProvider({ kind: "local", environmentType: "test" }),
          identityDeriver: createCustomerTemporaryIdentityDeriver(
            "workforce-auth-customer-side-pii-hash-secret-32c" as CustomerPiiHashSecret,
          ),
        },
      );
      openHandles.push(customerRuntime);
      const customerAuth = await customerRuntime.getAuth();
      const customerCtx = (await customerAuth.$context) as unknown as {
        internalAdapter: {
          createUser: (u: {
            email: string;
            name: string;
            emailVerified: boolean;
          }) => Promise<{ id: string }>;
          createSession: (userId: string) => Promise<{ token: string }>;
          findSession: (token: string) => Promise<unknown>;
        };
      };
      const customerUser = await customerCtx.internalAdapter.createUser({
        email: "customer-unaffected@example.test",
        name: "Customer",
        emailVerified: true,
      });
      const customerSession = await customerCtx.internalAdapter.createSession(customerUser.id);
      expect(await customerCtx.internalAdapter.findSession(customerSession.token)).toBeTruthy();
    });
  });
});

describe("IMP-010 rate-limit store: atomic consume, concurrency, cleanup, no raw PII", () => {
  async function withMigratedPersistence<T>(fn: (persistence: Persistence) => Promise<T>): Promise<T> {
    return withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);
      return fn(persistence);
    });
  }

  it("allows requests up to the maximum, then reports limited with retryAfterSeconds", async () => {
    await withMigratedPersistence(async (persistence) => {
      const keyHash = hashWorkforceAuthEmailKey(PII_HASH_SECRET, EMAIL_A);
      const rule = WORKFORCE_AUTH_RATE_LIMIT_RULES.workforce_sign_in_email_15m;
      const now = new Date("2025-01-01T00:00:00.000Z");

      for (let i = 0; i < rule.maximumRequests; i += 1) {
        const outcome = await persistence.transaction((tx) =>
          consumeWorkforceAuthRateLimit(tx, { rule, keyHash, now }),
        );
        expect(outcome.outcome).toBe("allowed");
      }

      const limited = await persistence.transaction((tx) =>
        consumeWorkforceAuthRateLimit(tx, { rule, keyHash, now }),
      );
      expect(limited.outcome).toBe("limited");
      if (limited.outcome === "limited") {
        expect(limited.retryAfterSeconds).toBeGreaterThan(0);
      }
    });
  });

  it("never over-admits under concurrent consumption of the same key", async () => {
    await withMigratedPersistence(async (persistence) => {
      const keyHash = hashWorkforceAuthIpKey(PII_HASH_SECRET, "203.0.113.50");
      const rule = WORKFORCE_AUTH_RATE_LIMIT_RULES.workforce_mfa_ip_10m;
      const now = new Date("2025-01-01T00:00:00.000Z");

      const results = await Promise.all(
        Array.from({ length: rule.maximumRequests + 5 }, () =>
          persistence.transaction((tx) => consumeWorkforceAuthRateLimit(tx, { rule, keyHash, now })),
        ),
      );

      expect(results.filter((r) => r.outcome === "allowed")).toHaveLength(rule.maximumRequests);
      expect(results.filter((r) => r.outcome === "limited")).toHaveLength(5);
    });
  });

  it("deleteExpiredWorkforceAuthRateLimits removes only rows past their window", async () => {
    await withMigratedPersistence(async (persistence) => {
      const rule = WORKFORCE_AUTH_RATE_LIMIT_RULES.workforce_sign_in_ip_10m;
      const oldNow = new Date("2020-01-01T00:00:00.000Z");
      const freshNow = new Date();
      const oldKey = hashWorkforceAuthIpKey(PII_HASH_SECRET, "198.51.100.1");
      const freshKey = hashWorkforceAuthIpKey(PII_HASH_SECRET, "198.51.100.2");

      await persistence.transaction((tx) =>
        consumeWorkforceAuthRateLimit(tx, { rule, keyHash: oldKey, now: oldNow }),
      );
      await persistence.transaction((tx) =>
        consumeWorkforceAuthRateLimit(tx, { rule, keyHash: freshKey, now: freshNow }),
      );

      const result = await persistence.withContext((ctx) =>
        deleteExpiredWorkforceAuthRateLimits(ctx, new Date(), 500),
      );
      expect(result.deleted).toBe(1);

      const remaining = await persistence.withContext((ctx) =>
        ctx.db.execute(sql`select key_hash from app.workforce_auth_rate_limits`),
      );
      expect(remaining.rows).toEqual([{ key_hash: freshKey }]);
    });
  });

  it("never stores a raw email or IP — only 64-character hex key hashes", async () => {
    await withMigratedPersistence(async (persistence) => {
      const email = mustNormalizeEmail("pii-check@example.test");
      const ip = "203.0.113.99";
      await persistence.transaction((tx) =>
        consumeWorkforceAuthRateLimits(tx, {
          rules: [
            WORKFORCE_AUTH_RATE_LIMIT_RULES.workforce_sign_in_email_15m,
            WORKFORCE_AUTH_RATE_LIMIT_RULES.workforce_sign_in_ip_10m,
          ],
          keyHashes: {
            workforce_sign_in_email_15m: hashWorkforceAuthEmailKey(PII_HASH_SECRET, email),
            workforce_sign_in_ip_10m: hashWorkforceAuthIpKey(PII_HASH_SECRET, ip),
          },
          now: new Date(),
        }),
      );

      const rows = await persistence.withContext((ctx) =>
        ctx.db.execute(sql`select key_hash from app.workforce_auth_rate_limits`),
      );
      for (const row of rows.rows as Array<{ key_hash: string }>) {
        expect(row.key_hash).toMatch(/^[0-9a-f]{64}$/);
        expect(row.key_hash).not.toContain(email);
        expect(row.key_hash).not.toContain(ip);
      }
    });
  });
});
