/**
 * Cart PostgreSQL integration tests (IMP-020).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { getApplicationPersistence } from "../../src/server/persistence";
import {
  applicationConfig,
  closeTrackedPersistenceHandles,
  trackPersistenceHandle,
  withCartHarness,
  adminConnectionInfo,
} from "./support/cart-fixtures";
import {
  applyMigrations,
  withIsolatedTestDatabase,
  withTestDatabaseClient,
} from "./support/test-database";

function sha256File(rel: string): string {
  return createHash("sha256")
    .update(readFileSync(path.join(process.cwd(), rel)))
    .digest("hex");
}

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

const PRIOR_MIGRATIONS = [
  "drizzle/0000_database-foundation.sql",
  "drizzle/0001_transactional_outbox_idempotency.sql",
  "drizzle/0002_better_auth_foundation.sql",
  "drizzle/0003_customer_phone_otp_authentication.sql",
  "drizzle/0004_workforce_authentication_mfa.sql",
  "drizzle/0005_organization_outlet_rbac_foundation.sql",
  "drizzle/0006_canonical_catalog_model.sql",
  "drizzle/0007_existing_menu_import.sql",
  "drizzle/0008_assortment_operational_availability.sql",
  "drizzle/0009_pricing_charges_tax.sql",
  "drizzle/0010_promotions_coupons.sql",
  "drizzle/0011_customer_profiles.sql",
  "drizzle/0012_customer_addresses.sql",
  "drizzle/0013_serviceability.sql",
] as const;

describe("IMP-020 cart migration", () => {
  it("seals 0014_cart, keeps 0000–0013 hashes unchanged, allows sealed 0015_checkout, totals 16 migrations", () => {
    const integrity = JSON.parse(
      readFileSync(path.join(process.cwd(), "drizzle/migration-integrity.json"), "utf8"),
    ) as { migrations: Array<{ path: string; sha256: string; tag: string }> };

    for (const rel of PRIOR_MIGRATIONS) {
      const fileHash = sha256File(rel);
      const entry = integrity.migrations.find((m) => m.path === rel);
      expect(entry).toBeDefined();
      expect(entry!.sha256).toBe(fileHash);
    }

    const cart = integrity.migrations.find((m) => m.path === "drizzle/0014_cart.sql");
    expect(cart).toBeDefined();
    expect(cart!.sha256).toBe(sha256File("drizzle/0014_cart.sql"));
    expect(integrity.migrations).toHaveLength(16);
    expect(
      integrity.migrations.find((m) => m.path === "drizzle/0015_checkout.sql"),
    ).toBeDefined();
  });

  it("creates exactly 5 cart tables within 85 app tables", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(
        applicationConfig(database.connectionString),
      );
      trackPersistenceHandle(persistence);

      await persistence.withContext(async (ctx) => {
        const cartTables = await ctx.db.execute(sql`
          select count(*)::text as count
          from information_schema.tables
          where table_schema = 'app'
            and table_name in (
              'carts',
              'cart_lines',
              'cart_line_modifier_selections',
              'cart_line_bundle_selections',
              'cart_line_bundle_modifier_selections'
            )
        `);
        expect(cartTables.rows[0]?.count).toBe("5");

        const appTables = await ctx.db.execute(sql`
          select count(*)::text as count
          from information_schema.tables
          where table_schema = 'app' and table_type = 'BASE TABLE'
        `);
        expect(appTables.rows[0]?.count).toBe("85");
      });
    });
  });
});

describe("IMP-020 cart ownership and constraints", () => {
  it("enforces owner XOR, expiry rules, revision > 0, and quantity positive", async () => {
    await withCartHarness(async ({ persistence, database, actors, catalog }) => {
      const brandId = actors.tree.brand.id;
      const now = new Date("2026-08-09T12:00:00.000Z");
      const verifier =
        "a".repeat(64);

      await persistence.withContext(async (ctx) => {
        // Valid customer cart
        await ctx.db.execute(sql`
          insert into app.carts (
            id, brand_id, customer_auth_user_id, guest_credential_verifier,
            manual_coupon_code, revision, expires_at, created_at, updated_at
          ) values (
            gen_random_uuid(), ${brandId}::uuid, ${actors.customerAId}, null,
            null, 1, null, ${now}, ${now}
          )
        `);

        // Valid guest cart
        await ctx.db.execute(sql`
          insert into app.carts (
            id, brand_id, customer_auth_user_id, guest_credential_verifier,
            manual_coupon_code, revision, expires_at, created_at, updated_at
          ) values (
            gen_random_uuid(), ${brandId}::uuid, null, ${verifier},
            null, 1, ${now}, ${now}, ${now}
          )
        `);

        // Both owners set
        await expect(
          ctx.db.execute(sql`
            insert into app.carts (
              id, brand_id, customer_auth_user_id, guest_credential_verifier,
              revision, expires_at, created_at, updated_at
            ) values (
              gen_random_uuid(), ${brandId}::uuid, ${actors.customerBId}, ${"b".repeat(64)},
              1, null, ${now}, ${now}
            )
          `),
        ).rejects.toThrow();

        // Neither owner
        await expect(
          ctx.db.execute(sql`
            insert into app.carts (
              id, brand_id, customer_auth_user_id, guest_credential_verifier,
              revision, expires_at, created_at, updated_at
            ) values (
              gen_random_uuid(), ${brandId}::uuid, null, null,
              1, null, ${now}, ${now}
            )
          `),
        ).rejects.toThrow();

        // Customer with expires_at
        await expect(
          ctx.db.execute(sql`
            insert into app.carts (
              id, brand_id, customer_auth_user_id, guest_credential_verifier,
              revision, expires_at, created_at, updated_at
            ) values (
              gen_random_uuid(), ${brandId}::uuid, ${actors.customerBId}, null,
              1, ${now}, ${now}, ${now}
            )
          `),
        ).rejects.toThrow();

        // Guest without expires_at
        await expect(
          ctx.db.execute(sql`
            insert into app.carts (
              id, brand_id, customer_auth_user_id, guest_credential_verifier,
              revision, expires_at, created_at, updated_at
            ) values (
              gen_random_uuid(), ${brandId}::uuid, null, ${"c".repeat(64)},
              1, null, ${now}, ${now}
            )
          `),
        ).rejects.toThrow();

        // revision <= 0
        await expect(
          ctx.db.execute(sql`
            insert into app.carts (
              id, brand_id, customer_auth_user_id, guest_credential_verifier,
              revision, expires_at, created_at, updated_at
            ) values (
              gen_random_uuid(), ${brandId}::uuid, ${actors.customerBId}, null,
              0, null, ${now}, ${now}
            )
          `),
        ).rejects.toThrow();

        // quantity <= 0 on line
        const cartId = (
          await ctx.db.execute(sql`
            insert into app.carts (
              id, brand_id, customer_auth_user_id, guest_credential_verifier,
              revision, expires_at, created_at, updated_at
            ) values (
              gen_random_uuid(), ${brandId}::uuid, ${actors.customerBId}, null,
              1, null, ${now}, ${now}
            ) returning id
          `)
        ).rows[0]!.id as string;

        await expect(
          ctx.db.execute(sql`
            insert into app.cart_lines (id, cart_id, variant_id, quantity)
            values (gen_random_uuid(), ${cartId}::uuid, ${catalog.variantId}::uuid, 0)
          `),
        ).rejects.toThrow();
      });

      void database;
    });
  });

  it("enforces customer+brand uniqueness including concurrent insert race", async () => {
    await withCartHarness(async ({ persistence, actors }) => {
      const brandId = actors.tree.brand.id;
      const now = new Date("2026-08-09T12:00:00.000Z");
      const customerId = actors.customerAId;

      const attempts = await Promise.allSettled([
        persistence.withContext((ctx) =>
          ctx.db.execute(sql`
            insert into app.carts (
              id, brand_id, customer_auth_user_id, guest_credential_verifier,
              revision, expires_at, created_at, updated_at
            ) values (
              gen_random_uuid(), ${brandId}::uuid, ${customerId}, null,
              1, null, ${now}, ${now}
            )
          `),
        ),
        persistence.withContext((ctx) =>
          ctx.db.execute(sql`
            insert into app.carts (
              id, brand_id, customer_auth_user_id, guest_credential_verifier,
              revision, expires_at, created_at, updated_at
            ) values (
              gen_random_uuid(), ${brandId}::uuid, ${customerId}, null,
              1, null, ${now}, ${now}
            )
          `),
        ),
      ]);

      const successes = attempts.filter((r) => r.status === "fulfilled");
      const failures = attempts.filter((r) => r.status === "rejected");
      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(1);

      await persistence.withContext(async (ctx) => {
        const count = await ctx.db.execute(sql`
          select count(*)::text as count from app.carts
          where customer_auth_user_id = ${customerId} and brand_id = ${brandId}::uuid
        `);
        expect(count.rows[0]?.count).toBe("1");
      });
    });
  });

  it("enforces guest verifier uniqueness when non-null", async () => {
    await withCartHarness(async ({ persistence, actors }) => {
      const brandId = actors.tree.brand.id;
      const otherBrandId = actors.otherTree.brand.id;
      const now = new Date("2026-08-09T12:00:00.000Z");
      const verifier = "d".repeat(64);

      await persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          insert into app.carts (
            id, brand_id, customer_auth_user_id, guest_credential_verifier,
            revision, expires_at, created_at, updated_at
          ) values (
            gen_random_uuid(), ${brandId}::uuid, null, ${verifier},
            1, ${now}, ${now}, ${now}
          )
        `);
        await expect(
          ctx.db.execute(sql`
            insert into app.carts (
              id, brand_id, customer_auth_user_id, guest_credential_verifier,
              revision, expires_at, created_at, updated_at
            ) values (
              gen_random_uuid(), ${otherBrandId}::uuid, null, ${verifier},
              1, ${now}, ${now}, ${now}
            )
          `),
        ).rejects.toThrow();
      });
    });
  });

  it("has expires_at partial index and forbids outlet/address/price columns", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(
        applicationConfig(database.connectionString),
      );
      trackPersistenceHandle(persistence);

      await persistence.withContext(async (ctx) => {
        const idx = await ctx.db.execute(sql`
          select indexname from pg_indexes
          where schemaname = 'app' and tablename = 'carts'
            and indexname = 'carts_expires_at_idx'
        `);
        expect(idx.rows).toHaveLength(1);

        const cols = await ctx.db.execute(sql`
          select column_name from information_schema.columns
          where table_schema = 'app' and table_name = 'carts'
        `);
        const names = cols.rows.map((r) => String(r.column_name));
        for (const forbidden of [
          "outlet_id",
          "address_id",
          "price",
          "tax",
          "serviceability",
          "quote",
          "grand_total",
          "currency",
        ]) {
          expect(names.some((n) => n.includes(forbidden))).toBe(false);
        }
      });
    });
  });

  it("cascades cart delete to children and RESTRICTs brand/variant/customer deletes", async () => {
    await withCartHarness(async ({ persistence, database, actors, catalog }) => {
      const brandId = actors.tree.brand.id;
      const now = new Date("2026-08-09T12:00:00.000Z");

      let cartId = "";
      let lineId = "";

      await persistence.withContext(async (ctx) => {
        const cart = await ctx.db.execute(sql`
          insert into app.carts (
            id, brand_id, customer_auth_user_id, guest_credential_verifier,
            revision, expires_at, created_at, updated_at
          ) values (
            gen_random_uuid(), ${brandId}::uuid, ${actors.customerAId}, null,
            1, null, ${now}, ${now}
          ) returning id
        `);
        cartId = cart.rows[0]!.id as string;

        const line = await ctx.db.execute(sql`
          insert into app.cart_lines (id, cart_id, variant_id, quantity)
          values (gen_random_uuid(), ${cartId}::uuid, ${catalog.variantId}::uuid, 2)
          returning id
        `);
        lineId = line.rows[0]!.id as string;

        await ctx.db.execute(sql`delete from app.carts where id = ${cartId}::uuid`);

        const lines = await ctx.db.execute(sql`
          select count(*)::text as count from app.cart_lines where id = ${lineId}::uuid
        `);
        expect(lines.rows[0]?.count).toBe("0");
      });

      // RESTRICT: cannot delete customer / variant / brand while cart (and line) remain
      await persistence.withContext(async (ctx) => {
        const cart = await ctx.db.execute(sql`
          insert into app.carts (
            id, brand_id, customer_auth_user_id, guest_credential_verifier,
            revision, expires_at, created_at, updated_at
          ) values (
            gen_random_uuid(), ${brandId}::uuid, ${actors.customerAId}, null,
            1, null, ${now}, ${now}
          ) returning id
        `);
        const remainingCartId = cart.rows[0]!.id as string;
        await ctx.db.execute(sql`
          insert into app.cart_lines (id, cart_id, variant_id, quantity)
          values (gen_random_uuid(), ${remainingCartId}::uuid, ${catalog.variantId}::uuid, 1)
        `);
      });

      await withTestDatabaseClient(database.connectionString, async (client) => {
        await expect(
          client.pool.query(
            `delete from app.customer_auth_users where id = $1`,
            [actors.customerAId],
          ),
        ).rejects.toThrow();

        await expect(
          client.pool.query(
            `delete from app.catalog_variants where id = $1`,
            [catalog.variantId],
          ),
        ).rejects.toThrow();

        await expect(
          client.pool.query(`delete from app.brands where id = $1`, [brandId]),
        ).rejects.toThrow();
      });
    });
  });
});
