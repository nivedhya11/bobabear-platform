/**
 * PostgreSQL integration tests for customer phone OTP authentication
 * (IMP-009). Real Testcontainers PostgreSQL 18 only — every test gets its
 * own isolated, freshly-migrated database. Mirrors
 * `auth-foundation.integration.test.ts`'s (IMP-008) structure.
 *
 * The Better Auth flow tests always send an OTP by calling the local
 * provider's `startVerification` directly (mirroring the real HTTP
 * router's `handleSendOtp` — see `src/server/customer-auth/http/router.ts`)
 * and never call `auth.api.sendPhoneNumberOTP`. Verification always goes
 * through `auth.api.verifyPhoneNumber`, which invokes this realm's
 * `verifyOTP` option callback, which itself delegates to the same
 * provider's `checkVerification` — never Better Auth's own internal OTP
 * storage/comparison (see AGENTS.md's IMP-009 section for the full
 * rationale). Never prints an OTP, phone number, or connection string.
 */
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, inject, it } from "vitest";

import type { WebConfig } from "../../src/platform/config";
import type { E164IndianMobileNumber } from "../../src/shared/customer-auth/phone";
import { createCustomerTemporaryIdentityDeriver, type CustomerPiiHashSecret } from "../../src/server/customer-auth/pii";
import {
  consumeCustomerOtpRateLimit,
  consumeCustomerOtpRateLimits,
  CUSTOMER_OTP_RATE_LIMIT_RULES,
  deleteExpiredCustomerOtpRateLimits,
  hashCustomerOtpIpKey,
  hashCustomerOtpPhoneKey,
} from "../../src/server/customer-auth/rate-limit";
import { createLocalCustomerOtpProviderForTests } from "../../src/server/customer-auth/provider/local";
import { getApplicationPersistence, type Persistence } from "../../src/server/persistence";
import {
  getCustomerAuthRuntime,
  type CustomerPhoneAuthRuntimeDependencies,
} from "../../src/server/auth/customer/runtime";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import { withAuthFoundationRoleFixture } from "./support/auth-foundation-roles";
import { applyMigrations, withIsolatedTestDatabase, withTestDatabaseClient } from "./support/test-database";

const PHONE_A = "+919876543210" as E164IndianMobileNumber;
const PHONE_B = "+919000000001" as E164IndianMobileNumber;
const PHONE_C = "+919111111111" as E164IndianMobileNumber;
const PII_HASH_SECRET = "customer-phone-auth-integration-test-pii-hash-secret-32ch" as CustomerPiiHashSecret;

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
      CUSTOMER_AUTH_SECRET: "customer-phone-integration-test-secret-32-chars-min",
      CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
      WORKFORCE_AUTH_SECRET: "workforce-phone-integration-test-secret-32-chars-mi",
      WORKFORCE_AUTH_BASE_URL: "http://localhost:3100",
    },
    "test",
  );
}

/** A fresh in-process local OTP provider with the test-only capture seam —
 * never a real SMS/network call, never PostgreSQL-backed. `local.ts` is the
 * only module that exports this seam; the public provider boundary
 * (`provider/index.ts`) never re-exports it (see the audit script's check
 * 13 / AGENTS.md's IMP-009 section). */
function testOtpProvider() {
  return createLocalCustomerOtpProviderForTests({ environmentType: "test" });
}

function customerPhoneDependencies(
  otpProvider: ReturnType<typeof testOtpProvider>,
): CustomerPhoneAuthRuntimeDependencies {
  return {
    otpProvider,
    identityDeriver: createCustomerTemporaryIdentityDeriver(PII_HASH_SECRET),
  };
}

const openHandles: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(openHandles.splice(0).map((h) => h.close()));
});

function assertNoSecretsInText(text: string) {
  expect(text).not.toMatch(/customer-phone-integration-test-secret/i);
  expect(text).not.toMatch(/postgresql:\/\//i);
  expect(text).not.toMatch(new RegExp(PHONE_A.replace("+", "\\+")));
}

describe("IMP-009 migration: phone fields, rate-limit table, workforce unchanged", () => {
  it("adds nullable, unique phone_number/phone_number_verified columns only to customer_auth_users", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withTestDatabaseClient(database.connectionString, async (client) => {
        const columns = await client.pool.query<{
          column_name: string;
          is_nullable: string;
          data_type: string;
        }>(
          `SELECT column_name, is_nullable, data_type FROM information_schema.columns
           WHERE table_schema = 'app' AND table_name = 'customer_auth_users'
             AND column_name IN ('phone_number', 'phone_number_verified')
           ORDER BY column_name`,
        );
        expect(columns.rows).toEqual([
          { column_name: "phone_number", is_nullable: "YES", data_type: "text" },
          { column_name: "phone_number_verified", is_nullable: "YES", data_type: "boolean" },
        ]);

        const workforceColumns = await client.pool.query(
          `SELECT column_name FROM information_schema.columns
           WHERE table_schema = 'app' AND table_name = 'workforce_auth_users'
             AND column_name IN ('phone_number', 'phone_number_verified')`,
        );
        expect(workforceColumns.rowCount).toBe(0);
      });
    });
  });

  it("enforces phone_number uniqueness on customer_auth_users", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withTestDatabaseClient(database.connectionString, async (client) => {
        await client.pool.query(
          `insert into app.customer_auth_users (id, name, email, email_verified, phone_number, phone_number_verified, created_at, updated_at)
           values ('cust-phone-1', 'Test', 'a@example.test', false, $1, true, now(), now())`,
          [PHONE_A],
        );
        await expect(
          client.pool.query(
            `insert into app.customer_auth_users (id, name, email, email_verified, phone_number, phone_number_verified, created_at, updated_at)
             values ('cust-phone-2', 'Test 2', 'b@example.test', false, $1, true, now(), now())`,
            [PHONE_A],
          ),
        ).rejects.toThrow();
      });
    });
  });

  it("creates exactly the technical-counter columns on customer_otp_rate_limits — no raw phone/IP/OTP column", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withTestDatabaseClient(database.connectionString, async (client) => {
        const columns = await client.pool.query<{ column_name: string }>(
          `SELECT column_name FROM information_schema.columns
           WHERE table_schema = 'app' AND table_name = 'customer_otp_rate_limits'
           ORDER BY column_name`,
        );
        expect(columns.rows.map((r) => r.column_name)).toEqual([
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

  it("adds no OTP-history table — Better Auth's phone plugin stores no separate verification-code table", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withTestDatabaseClient(database.connectionString, async (client) => {
        const tables = await client.pool.query<{ table_name: string }>(
          `SELECT table_name FROM information_schema.tables WHERE table_schema = 'app' ORDER BY table_name`,
        );
        const names = tables.rows.map((r) => r.table_name);
        expect(names).not.toContain("customer_otp_history");
        expect(names).not.toContain("customer_auth_otps");
        expect(names).not.toContain("phone_number_otps");
        // Tables expected after IMP-004 through IMP-020. Still no OTP-history table.
        expect(names).toEqual([
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
      });
    });
  });

  it("customer_auth_verifications never stores a raw OTP after a real verify flow", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const config = authFoundationConfig();
      const otpProvider = testOtpProvider();
      const runtime = getCustomerAuthRuntime(
        { auth: config.customer, persistence: applicationConfig(database.connectionString) },
        customerPhoneDependencies(otpProvider),
      );
      try {
        const auth = await runtime.getAuth();
        const generatedCode = "123456";
        await otpProvider.startVerification({
          phoneNumber: PHONE_A,
          generatedCode,
          now: new Date(),
          expiresAt: new Date(Date.now() + 5 * 60_000),
        });
        await auth.api.verifyPhoneNumber({
          body: { phoneNumber: PHONE_A, code: generatedCode, disableSession: false, updatePhoneNumber: false },
        });

        await withTestDatabaseClient(database.connectionString, async (client) => {
          const verifications = await client.pool.query<{ value: string; identifier: string }>(
            `select value, identifier from app.customer_auth_verifications`,
          );
          for (const row of verifications.rows) {
            expect(row.value).not.toBe(generatedCode);
            expect(row.identifier).not.toContain(generatedCode);
          }
        });
      } finally {
        await runtime.close();
        await otpProvider.close();
      }
    });
  });
});

describe("IMP-009 application-role privileges", () => {
  it("grants SELECT/INSERT/UPDATE/DELETE on customer_otp_rate_limits and the phone columns, and forbids DDL", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withAuthFoundationRoleFixture(database.databaseName, database.connectionString, async (fixture) => {
        const persistence = getApplicationPersistence(applicationConfig(fixture.applicationConnectionString));
        try {
          await expect(
            persistence.withContext((ctx) =>
              ctx.db.execute(sql`
                insert into app.customer_otp_rate_limits
                  (scope, key_hash, window_started_at, window_seconds, request_count, created_at, updated_at)
                values
                  ('otp_send_phone_60s', repeat('a', 64), now(), 60, 1, now(), now())
              `),
            ),
          ).resolves.toBeDefined();

          await expect(
            persistence.withContext((ctx) =>
              ctx.db.execute(sql`
                update app.customer_auth_users set phone_number = ${PHONE_B}, phone_number_verified = true
                where false
              `),
            ),
          ).resolves.toBeDefined();

          await expect(
            persistence.withContext((ctx) =>
              ctx.db.execute(sql`alter table app.customer_otp_rate_limits add column bogus text`),
            ),
          ).rejects.toThrow();
          await expect(
            persistence.withContext((ctx) => ctx.db.execute(sql`drop table app.customer_otp_rate_limits`)),
          ).rejects.toThrow();
          await expect(
            persistence.withContext((ctx) => ctx.db.execute(sql`truncate table app.customer_otp_rate_limits`)),
          ).rejects.toThrow();
        } finally {
          await persistence.close();
        }
      });
    });
  });
});

describe("IMP-009 rate-limit store: atomic consume, concurrency, cleanup", () => {
  async function withMigratedPersistence<T>(
    fn: (persistence: Persistence) => Promise<T>,
  ): Promise<T> {
    return withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);
      return fn(persistence);
    });
  }

  it("allows requests up to the maximum, then reports limited with a positive retryAfterSeconds", async () => {
    await withMigratedPersistence(async (persistence) => {
      const keyHash = hashCustomerOtpPhoneKey(PII_HASH_SECRET, PHONE_A);
      const rule = CUSTOMER_OTP_RATE_LIMIT_RULES.otp_send_phone_1h; // maximumRequests: 5
      const now = new Date("2025-01-01T00:00:00.000Z");

      for (let i = 0; i < rule.maximumRequests; i += 1) {
        const outcome = await persistence.transaction((tx) =>
          consumeCustomerOtpRateLimit(tx, { rule, keyHash, now }),
        );
        expect(outcome.outcome).toBe("allowed");
      }

      const limited = await persistence.transaction((tx) =>
        consumeCustomerOtpRateLimit(tx, { rule, keyHash, now }),
      );
      expect(limited.outcome).toBe("limited");
      if (limited.outcome === "limited") {
        expect(limited.retryAfterSeconds).toBeGreaterThan(0);
      }
    });
  });

  it("resets the window once it has elapsed", async () => {
    await withMigratedPersistence(async (persistence) => {
      const keyHash = hashCustomerOtpPhoneKey(PII_HASH_SECRET, PHONE_A);
      const rule = CUSTOMER_OTP_RATE_LIMIT_RULES.otp_send_phone_60s; // maximumRequests: 1, window 60s
      const first = new Date("2025-01-01T00:00:00.000Z");

      await expect(
        persistence.transaction((tx) => consumeCustomerOtpRateLimit(tx, { rule, keyHash, now: first })),
      ).resolves.toMatchObject({ outcome: "allowed" });
      await expect(
        persistence.transaction((tx) => consumeCustomerOtpRateLimit(tx, { rule, keyHash, now: first })),
      ).resolves.toMatchObject({ outcome: "limited" });

      const afterWindow = new Date(first.getTime() + 61_000);
      await expect(
        persistence.transaction((tx) => consumeCustomerOtpRateLimit(tx, { rule, keyHash, now: afterWindow })),
      ).resolves.toMatchObject({ outcome: "allowed" });
    });
  });

  it("keeps independent counters for different scopes and different keys", async () => {
    await withMigratedPersistence(async (persistence) => {
      const phoneKeyHashA = hashCustomerOtpPhoneKey(PII_HASH_SECRET, PHONE_A);
      const phoneKeyHashB = hashCustomerOtpPhoneKey(PII_HASH_SECRET, PHONE_B);
      const ipKeyHash = hashCustomerOtpIpKey(PII_HASH_SECRET, "203.0.113.5");
      const now = new Date("2025-01-01T00:00:00.000Z");

      const outcome = await persistence.transaction((tx) =>
        consumeCustomerOtpRateLimits(tx, {
          rules: [
            CUSTOMER_OTP_RATE_LIMIT_RULES.otp_send_phone_60s,
            CUSTOMER_OTP_RATE_LIMIT_RULES.otp_send_ip_10m,
          ],
          keyHashes: {
            otp_send_phone_60s: phoneKeyHashA,
            otp_send_phone_1h: phoneKeyHashA,
            otp_send_ip_10m: ipKeyHash,
            otp_verify_ip_10m: ipKeyHash,
          },
          now,
        }),
      );
      expect(outcome.outcome).toBe("allowed");

      // A different phone under the same IP still has its own phone-scoped
      // counter, independent of phone A's.
      const outcomeB = await persistence.transaction((tx) =>
        consumeCustomerOtpRateLimit(tx, {
          rule: CUSTOMER_OTP_RATE_LIMIT_RULES.otp_send_phone_60s,
          keyHash: phoneKeyHashB,
          now,
        }),
      );
      expect(outcomeB.outcome).toBe("allowed");
    });
  });

  it("never over-admits under concurrent consumption of the same key", async () => {
    await withMigratedPersistence(async (persistence) => {
      const keyHash = hashCustomerOtpPhoneKey(PII_HASH_SECRET, PHONE_C);
      const rule = CUSTOMER_OTP_RATE_LIMIT_RULES.otp_send_phone_1h; // maximumRequests: 5
      const now = new Date("2025-01-01T00:00:00.000Z");

      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          persistence.transaction((tx) => consumeCustomerOtpRateLimit(tx, { rule, keyHash, now })),
        ),
      );

      const allowed = results.filter((r) => r.outcome === "allowed");
      const limited = results.filter((r) => r.outcome === "limited");
      expect(allowed.length).toBe(rule.maximumRequests);
      expect(limited.length).toBe(10 - rule.maximumRequests);

      const finalOutcome = await persistence.withContext((ctx) =>
        ctx.db.execute(sql`select request_count from app.customer_otp_rate_limits where key_hash = ${keyHash}`),
      );
      expect(Number((finalOutcome.rows[0] as { request_count: number }).request_count)).toBe(10);
    });
  });

  it("deleteExpiredCustomerOtpRateLimits removes only rows past their window, bounded by limit", async () => {
    await withMigratedPersistence(async (persistence) => {
      const rule = CUSTOMER_OTP_RATE_LIMIT_RULES.otp_send_phone_60s;
      const oldNow = new Date("2020-01-01T00:00:00.000Z");
      const freshNow = new Date();

      const oldKeyHash = hashCustomerOtpPhoneKey(PII_HASH_SECRET, PHONE_A);
      const freshKeyHash = hashCustomerOtpPhoneKey(PII_HASH_SECRET, PHONE_B);

      await persistence.transaction((tx) =>
        consumeCustomerOtpRateLimit(tx, { rule, keyHash: oldKeyHash, now: oldNow }),
      );
      await persistence.transaction((tx) =>
        consumeCustomerOtpRateLimit(tx, { rule, keyHash: freshKeyHash, now: freshNow }),
      );

      const result = await persistence.withContext((ctx) =>
        deleteExpiredCustomerOtpRateLimits(ctx, new Date(), 500),
      );
      expect(result.deleted).toBe(1);

      const remaining = await persistence.withContext((ctx) =>
        ctx.db.execute(sql`select key_hash from app.customer_otp_rate_limits`),
      );
      expect(remaining.rows).toEqual([{ key_hash: freshKeyHash }]);
    });
  });

  it("never stores a raw phone number or IP address — only 64-character hex key hashes", async () => {
    await withMigratedPersistence(async (persistence) => {
      const rule = CUSTOMER_OTP_RATE_LIMIT_RULES.otp_send_phone_60s;
      await persistence.transaction((tx) =>
        consumeCustomerOtpRateLimit(tx, {
          rule,
          keyHash: hashCustomerOtpPhoneKey(PII_HASH_SECRET, PHONE_A),
          now: new Date(),
        }),
      );

      const rows = await persistence.withContext((ctx) =>
        ctx.db.execute(sql`select key_hash from app.customer_otp_rate_limits`),
      );
      for (const row of rows.rows as Array<{ key_hash: string }>) {
        expect(row.key_hash).toMatch(/^[0-9a-f]{64}$/);
        expect(row.key_hash).not.toContain(PHONE_A.replace("+", ""));
      }
    });
  });
});

describe("IMP-009 Better Auth phone flow with the local provider", () => {
  it("sends via the provider directly (never sendPhoneNumberOTP), verifies, and creates a session", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const config = authFoundationConfig();
      const otpProvider = testOtpProvider();
      const runtime = getCustomerAuthRuntime(
        { auth: config.customer, persistence: applicationConfig(database.connectionString) },
        customerPhoneDependencies(otpProvider),
      );
      try {
        const auth = await runtime.getAuth();

        const now = new Date();
        await otpProvider.startVerification({
          phoneNumber: PHONE_A,
          generatedCode: "654321",
          now,
          expiresAt: new Date(now.getTime() + 5 * 60_000),
        });
        expect(otpProvider.__testOnly_getActiveCode(PHONE_A)).toBe("654321");

        const result = await auth.api.verifyPhoneNumber({
          body: { phoneNumber: PHONE_A, code: "654321", disableSession: false, updatePhoneNumber: false },
        });

        expect(result.status).toBe(true);
        expect(result.token).toBeTruthy();
        expect(result.user).toBeTruthy();

        await withTestDatabaseClient(database.connectionString, async (client) => {
          const users = await client.pool.query<{ phone_number: string; phone_number_verified: boolean }>(
            `select phone_number, phone_number_verified from app.customer_auth_users where id = $1`,
            [result.user!.id],
          );
          expect(users.rows[0]?.phone_number).toBe(PHONE_A);
          expect(users.rows[0]?.phone_number_verified).toBe(true);
        });
      } finally {
        await runtime.close();
        await otpProvider.close();
      }
    });
  });

  it("rejects verification once the local record has been consumed (no replay)", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const config = authFoundationConfig();
      const otpProvider = testOtpProvider();
      const runtime = getCustomerAuthRuntime(
        { auth: config.customer, persistence: applicationConfig(database.connectionString) },
        customerPhoneDependencies(otpProvider),
      );
      try {
        const auth = await runtime.getAuth();
        const now = new Date();
        await otpProvider.startVerification({
          phoneNumber: PHONE_B,
          generatedCode: "111222",
          now,
          expiresAt: new Date(now.getTime() + 5 * 60_000),
        });

        await auth.api.verifyPhoneNumber({
          body: { phoneNumber: PHONE_B, code: "111222", disableSession: false, updatePhoneNumber: false },
        });

        await expect(
          auth.api.verifyPhoneNumber({
            body: { phoneNumber: PHONE_B, code: "111222", disableSession: false, updatePhoneNumber: false },
          }),
        ).rejects.toThrow();
      } finally {
        await runtime.close();
        await otpProvider.close();
      }
    });
  });

  it("does not create a duplicate user when the same verified phone number signs in again", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const config = authFoundationConfig();
      const otpProvider = testOtpProvider();
      const runtime = getCustomerAuthRuntime(
        { auth: config.customer, persistence: applicationConfig(database.connectionString) },
        customerPhoneDependencies(otpProvider),
      );
      try {
        const auth = await runtime.getAuth();

        async function sendAndVerify(code: string) {
          const now = new Date();
          await otpProvider.startVerification({
            phoneNumber: PHONE_C,
            generatedCode: code,
            now,
            expiresAt: new Date(now.getTime() + 5 * 60_000),
          });
          return auth.api.verifyPhoneNumber({
            body: { phoneNumber: PHONE_C, code, disableSession: false, updatePhoneNumber: false },
          });
        }

        const first = await sendAndVerify("222333");
        const second = await sendAndVerify("444555");

        expect(first.user!.id).toBe(second.user!.id);

        await withTestDatabaseClient(database.connectionString, async (client) => {
          const users = await client.pool.query(
            `select count(*)::int as count from app.customer_auth_users where phone_number = $1`,
            [PHONE_C],
          );
          expect((users.rows[0] as { count: number }).count).toBe(1);
        });
      } finally {
        await runtime.close();
        await otpProvider.close();
      }
    });
  });

  it("serializes concurrent first-time verification of the same phone into exactly one user", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const config = authFoundationConfig();
      const otpProvider = testOtpProvider();
      const runtime = getCustomerAuthRuntime(
        { auth: config.customer, persistence: applicationConfig(database.connectionString) },
        customerPhoneDependencies(otpProvider),
      );
      try {
        const auth = await runtime.getAuth();
        const now = new Date();
        const phoneNumber = "+919222222222" as E164IndianMobileNumber;
        await otpProvider.startVerification({
          phoneNumber,
          generatedCode: "999000",
          now,
          expiresAt: new Date(now.getTime() + 5 * 60_000),
        });

        const attempts = await Promise.allSettled(
          Array.from({ length: 3 }, () =>
            auth.api.verifyPhoneNumber({
              body: { phoneNumber, code: "999000", disableSession: false, updatePhoneNumber: false },
            }),
          ),
        );

        const fulfilled = attempts.filter(
          (a): a is PromiseFulfilledResult<Awaited<ReturnType<typeof auth.api.verifyPhoneNumber>>> =>
            a.status === "fulfilled",
        );
        expect(fulfilled.length).toBeGreaterThanOrEqual(1);

        await withTestDatabaseClient(database.connectionString, async (client) => {
          const users = await client.pool.query(
            `select count(*)::int as count from app.customer_auth_users where phone_number = $1`,
            [phoneNumber],
          );
          expect((users.rows[0] as { count: number }).count).toBe(1);
        });
      } finally {
        await runtime.close();
        await otpProvider.close();
      }
    });
  });

  it("signs out and revokes the session", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const config = authFoundationConfig();
      const otpProvider = testOtpProvider();
      const runtime = getCustomerAuthRuntime(
        { auth: config.customer, persistence: applicationConfig(database.connectionString) },
        customerPhoneDependencies(otpProvider),
      );
      try {
        const auth = await runtime.getAuth();
        const now = new Date();
        await otpProvider.startVerification({
          phoneNumber: PHONE_A,
          generatedCode: "777888",
          now,
          expiresAt: new Date(now.getTime() + 5 * 60_000),
        });
        const verifyResult = await auth.api.verifyPhoneNumber({
          body: { phoneNumber: PHONE_A, code: "777888", disableSession: false, updatePhoneNumber: false },
          returnHeaders: true,
        });

        const setCookies = verifyResult.headers.getSetCookie();
        expect(setCookies.length).toBeGreaterThan(0);
        const sessionCookie = setCookies
          .map((c) => c.split(";")[0])
          .find((c) => c.includes("session_token"));
        expect(sessionCookie).toBeTruthy();

        const requestHeaders = new Headers({ cookie: sessionCookie! });
        const sessionBefore = await auth.api.getSession({ headers: requestHeaders });
        expect(sessionBefore?.user.id).toBe(verifyResult.response.user!.id);

        await auth.api.signOut({ headers: requestHeaders });

        const sessionAfter = await auth.api.getSession({ headers: requestHeaders });
        expect(sessionAfter).toBeNull();
      } finally {
        await runtime.close();
        await otpProvider.close();
      }
    });
  });

  it("never leaks the raw OTP, phone number, or a connection string through a thrown error", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const config = authFoundationConfig();
      const otpProvider = testOtpProvider();
      const runtime = getCustomerAuthRuntime(
        { auth: config.customer, persistence: applicationConfig(database.connectionString) },
        customerPhoneDependencies(otpProvider),
      );
      try {
        const auth = await runtime.getAuth();
        try {
          await auth.api.verifyPhoneNumber({
            body: { phoneNumber: PHONE_A, code: "000000", disableSession: false, updatePhoneNumber: false },
          });
          throw new Error("expected verifyPhoneNumber to reject an OTP with no active record");
        } catch (error) {
          const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
          assertNoSecretsInText(text);
        }
      } finally {
        await runtime.close();
        await otpProvider.close();
      }
    });
  });
});

describe("IMP-009 resource cleanup", () => {
  it("closing the customer runtime and the OTP provider is idempotent and safe", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const config = authFoundationConfig();
      const otpProvider = testOtpProvider();
      const runtime = getCustomerAuthRuntime(
        { auth: config.customer, persistence: applicationConfig(database.connectionString) },
        customerPhoneDependencies(otpProvider),
      );
      await runtime.getAuth();
      await runtime.close();
      await runtime.close();
      await otpProvider.close();
      await otpProvider.close();
    });
  });
});
