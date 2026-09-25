/**
 * IMP-036H migration proofs (0044_imp036h_fulfilment_mode_pickup).
 * Real Testcontainers PostgreSQL only.
 */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, inject, it } from "vitest";

import { MIGRATIONS_SCHEMA, MIGRATIONS_TABLE } from "../../src/platform/database";
import {
  applyMigrations,
  withIsolatedTestDatabase,
  withTestDatabaseClient,
} from "./support/test-database";

function adminConnectionInfo() {
  return {
    connectionString: inject("bobaBearTestAdminConnectionString"),
    host: inject("bobaBearTestAdminHost"),
    port: inject("bobaBearTestAdminPort"),
  };
}

type JournalEntry = Readonly<{
  idx: number;
  tag: string;
}>;

function loadJournalEntries(): readonly JournalEntry[] {
  const journal = JSON.parse(
    readFileSync(path.join(process.cwd(), "drizzle/meta/_journal.json"), "utf8"),
  ) as { entries: JournalEntry[] };
  return journal.entries;
}

async function applySqlMigrationFile(
  connectionString: string,
  tag: string,
): Promise<void> {
  const sqlPath = path.join(process.cwd(), "drizzle", `${tag}.sql`);
  const raw = readFileSync(sqlPath, "utf8");
  const statements = raw
    .split(/-->\s*statement-breakpoint/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  await withTestDatabaseClient(connectionString, async (client) => {
    for (const statement of statements) {
      await client.pool.query(statement);
    }
    const hash = createHash("sha256").update(raw).digest("hex");
    await client.pool.query(
      `CREATE SCHEMA IF NOT EXISTS ${MIGRATIONS_SCHEMA}`,
    );
    await client.pool.query(`
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `);
    await client.pool.query(
      `INSERT INTO ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} (hash, created_at) VALUES ($1, $2)`,
      [hash, Date.now()],
    );
  });
}

/** Apply journal entries with idx <= throughIdx (inclusive). */
async function applyMigrationsThrough(
  connectionString: string,
  throughIdx: number,
): Promise<void> {
  const entries = loadJournalEntries().filter((e) => e.idx <= throughIdx);
  for (const entry of entries) {
    await applySqlMigrationFile(connectionString, entry.tag);
  }
}

type SeedIds = Readonly<{
  brandId: string;
  outletId: string;
  checkoutId: string;
  snapshotId: string;
}>;

/**
 * Minimal brand→outlet→checkout→snapshot graph using raw SQL so it works
 * both pre-0044 (no fulfilment_mode) and post-0044.
 */
async function seedDeliverySnapshotGraph(
  connectionString: string,
  options: { includeFulfilmentModeColumns: boolean; tag: string },
): Promise<SeedIds> {
  const brandId = randomUUID();
  const orgId = randomUUID();
  const territoryId = randomUUID();
  const legalEntityId = randomUUID();
  const outletId = randomUUID();
  const cartId = randomUUID();
  const checkoutId = randomUUID();
  const snapshotId = randomUUID();
  const userId = `mig-036h-${options.tag}`;

  await withTestDatabaseClient(connectionString, async (client) => {
    await client.pool.query(
      `INSERT INTO app.brands (id, code, name, status, created_at, updated_at)
       VALUES ($1::uuid, $2, $3, 'active', now(), now())`,
      [brandId, `b-${options.tag}`, `Brand ${options.tag}`],
    );
    await client.pool.query(
      `INSERT INTO app.organizations (id, brand_id, code, name, status, created_at, updated_at)
       VALUES ($1::uuid, $2::uuid, $3, $4, 'active', now(), now())`,
      [orgId, brandId, `o-${options.tag}`, `Org ${options.tag}`],
    );
    await client.pool.query(
      `INSERT INTO app.territories (id, brand_id, code, name, status, created_at, updated_at)
       VALUES ($1::uuid, $2::uuid, $3, $4, 'active', now(), now())`,
      [territoryId, brandId, `t-${options.tag}`, `Territory ${options.tag}`],
    );
    await client.pool.query(
      `INSERT INTO app.legal_entities (
         id, brand_id, organization_id, code, name, status, created_at, updated_at
       ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, 'active', now(), now())`,
      [legalEntityId, brandId, orgId, `le-${options.tag}`, `LE ${options.tag}`],
    );
    await client.pool.query(
      `INSERT INTO app.outlets (
         id, brand_id, organization_id, territory_id, legal_entity_id,
         code, name, status, created_at, updated_at
       ) VALUES (
         $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid,
         $6, $7, 'active', now(), now()
       )`,
      [
        outletId,
        brandId,
        orgId,
        territoryId,
        legalEntityId,
        `out-${options.tag}`,
        `Outlet ${options.tag}`,
      ],
    );
    await client.pool.query(
      `INSERT INTO app.customer_auth_users (
         id, name, email, email_verified, phone_number, phone_number_verified, created_at, updated_at
       ) VALUES ($1, $2, $3, false, $4, true, now(), now())`,
      [userId, "Mig User", `${options.tag}@example.com`, `+91999999${options.tag.slice(0, 4).padEnd(4, "0")}`],
    );
    await client.pool.query(
      `INSERT INTO app.carts (
         id, brand_id, customer_auth_user_id, revision, created_at, updated_at
       ) VALUES ($1::uuid, $2::uuid, $3, 1, now(), now())`,
      [cartId, brandId, userId],
    );

    if (options.includeFulfilmentModeColumns) {
      await client.pool.query(
        `INSERT INTO app.checkouts (
           id, customer_auth_user_id, brand_id, cart_id, source_cart_revision,
           revision, status, expires_at, fulfilment_mode, created_at, updated_at
         ) VALUES (
           $1::uuid, $2, $3::uuid, $4::uuid, 1, 1, 'DRAFT',
           now() + interval '1 hour', 'DELIVERY', now(), now()
         )`,
        [checkoutId, userId, brandId, cartId],
      );
      await client.pool.query(
        `INSERT INTO app.checkout_snapshots (
           id, checkout_id, checkout_revision, source_cart_revision, selected_outlet_id,
           evaluated_at, serviceability_evaluated_at, currency, fulfilment_mode,
           destination_kind, recipient_name, recipient_phone, address_line_1,
           city, state_code, postal_code,
           base_paise, modifier_adjustments_paise, bundle_adjustments_paise, charges_paise,
           pre_promotion_subtotal_paise, promotion_discount_paise, taxable_paise, tax_paise,
           grand_total_paise, tax_inclusion_mode, created_at
         ) VALUES (
           $1::uuid, $2::uuid, 1, 1, $3::uuid,
           now(), now(), 'INR', 'DELIVERY',
           'ONE_TIME_ADDRESS', 'Hist Guest', '+919876543210', '1 Mall Road',
           'Dehradun', 'IN-UT', '248001',
           10000, 0, 0, 0, 10000, 0, 10000, 500, 10500, 'exclusive', now()
         )`,
        [snapshotId, checkoutId, outletId],
      );
    } else {
      await client.pool.query(
        `INSERT INTO app.checkouts (
           id, customer_auth_user_id, brand_id, cart_id, source_cart_revision,
           revision, status, expires_at, created_at, updated_at
         ) VALUES (
           $1::uuid, $2, $3::uuid, $4::uuid, 1, 1, 'DRAFT',
           now() + interval '1 hour', now(), now()
         )`,
        [checkoutId, userId, brandId, cartId],
      );
      await client.pool.query(
        `INSERT INTO app.checkout_snapshots (
           id, checkout_id, checkout_revision, source_cart_revision, selected_outlet_id,
           evaluated_at, serviceability_evaluated_at, currency, manual_coupon_code,
           destination_kind, source_saved_address_id,
           recipient_name, recipient_phone, address_line_1, city, state_code, postal_code,
           base_paise, modifier_adjustments_paise, bundle_adjustments_paise, charges_paise,
           pre_promotion_subtotal_paise, promotion_discount_paise, taxable_paise, tax_paise,
           grand_total_paise, tax_inclusion_mode, created_at
         ) VALUES (
           $1::uuid, $2::uuid, 1, 1, $3::uuid,
           now(), now(), 'INR', null,
           'ONE_TIME_ADDRESS', null,
           'Hist Guest', '+919876543210', '1 Mall Road', 'Dehradun', 'IN-UT', '248001',
           10000, 0, 0, 0, 10000, 0, 10000, 500, 10500, 'exclusive', now()
         )`,
        [snapshotId, checkoutId, outletId],
      );
    }
  });

  return { brandId, outletId, checkoutId, snapshotId };
}

describe("IMP-036H migration 0044 fulfilment_mode + pickup", () => {
  it("empty→latest includes 0044, outlet_pickup_profiles, and mode columns", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withTestDatabaseClient(database.connectionString, async (client) => {
        const historyRows = await client.pool.query<{ count: string }>(
          `SELECT COUNT(*) AS count FROM ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE}`,
        );
        expect(Number(historyRows.rows[0]?.count)).toBe(46);

        const tables = await client.pool.query<{ table_name: string }>(
          `SELECT table_name FROM information_schema.tables
           WHERE table_schema = 'app' AND table_name = 'outlet_pickup_profiles'`,
        );
        expect(tables.rows.map((r) => r.table_name)).toEqual([
          "outlet_pickup_profiles",
        ]);

        const checkoutCols = await client.pool.query<{ column_name: string }>(
          `SELECT column_name FROM information_schema.columns
           WHERE table_schema = 'app' AND table_name = 'checkouts'
             AND column_name IN ('fulfilment_mode', 'pickup_outlet_id')
           ORDER BY column_name`,
        );
        expect(checkoutCols.rows.map((r) => r.column_name)).toEqual([
          "fulfilment_mode",
          "pickup_outlet_id",
        ]);

        const snapCols = await client.pool.query<{ column_name: string }>(
          `SELECT column_name FROM information_schema.columns
           WHERE table_schema = 'app' AND table_name = 'checkout_snapshots'
             AND column_name IN (
               'fulfilment_mode',
               'pickup_display_name',
               'pickup_address_line_1',
               'pickup_city',
               'pickup_instructions'
             )
           ORDER BY column_name`,
        );
        expect(snapCols.rows.map((r) => r.column_name)).toEqual([
          "fulfilment_mode",
          "pickup_address_line_1",
          "pickup_city",
          "pickup_display_name",
          "pickup_instructions",
        ]);

        const checks = await client.pool.query<{ constraint_name: string }>(
          `SELECT tc.constraint_name
           FROM information_schema.table_constraints tc
           WHERE tc.table_schema = 'app'
             AND tc.table_name = 'checkout_snapshots'
             AND tc.constraint_type = 'CHECK'
             AND tc.constraint_name IN (
               'checkout_snapshots_delivery_mode_shape_check',
               'checkout_snapshots_pickup_mode_shape_check',
               'checkout_snapshots_fulfilment_mode_check'
             )
           ORDER BY tc.constraint_name`,
        );
        expect(checks.rows.map((r) => r.constraint_name)).toEqual([
          "checkout_snapshots_delivery_mode_shape_check",
          "checkout_snapshots_fulfilment_mode_check",
          "checkout_snapshots_pickup_mode_shape_check",
        ]);
      });
    });
  });

  it("0043→0044 upgrade preserves Delivery snapshot shape and backfills fulfilment_mode", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrationsThrough(database.connectionString, 43);

      await withTestDatabaseClient(database.connectionString, async (client) => {
        const preCols = await client.pool.query<{ column_name: string }>(
          `SELECT column_name FROM information_schema.columns
           WHERE table_schema = 'app' AND table_name = 'checkout_snapshots'
             AND column_name = 'fulfilment_mode'`,
        );
        expect(preCols.rows).toHaveLength(0);
      });

      const seeded = await seedDeliverySnapshotGraph(database.connectionString, {
        includeFulfilmentModeColumns: false,
        tag: "up43",
      });

      await applySqlMigrationFile(
        database.connectionString,
        "0044_imp036h_fulfilment_mode_pickup",
      );

      await withTestDatabaseClient(database.connectionString, async (client) => {
        const after = await client.pool.query<{
          fulfilment_mode: string;
          recipient_name: string;
          selected_outlet_id: string;
          pickup_display_name: string | null;
        }>(
          `SELECT fulfilment_mode, recipient_name,
                  selected_outlet_id::text AS selected_outlet_id,
                  pickup_display_name
           FROM app.checkout_snapshots WHERE id = $1::uuid`,
          [seeded.snapshotId],
        );
        expect(after.rows[0]?.fulfilment_mode).toBe("DELIVERY");
        expect(after.rows[0]?.recipient_name).toBe("Hist Guest");
        expect(after.rows[0]?.pickup_display_name).toBeNull();
        expect(after.rows[0]?.selected_outlet_id).toBe(seeded.outletId);

        const checkoutMode = await client.pool.query<{ fulfilment_mode: string }>(
          `SELECT fulfilment_mode FROM app.checkouts WHERE id = $1::uuid`,
          [seeded.checkoutId],
        );
        expect(checkoutMode.rows[0]?.fulfilment_mode).toBe("DELIVERY");

        const profiles = await client.pool.query<{ exists: boolean }>(
          `SELECT EXISTS (
             SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'app' AND table_name = 'outlet_pickup_profiles'
           ) AS exists`,
        );
        expect(profiles.rows[0]?.exists).toBe(true);
      });
    });
  });

  it("rejects illegal Snapshot shapes via mode CHECKs after 0044", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const seeded = await seedDeliverySnapshotGraph(database.connectionString, {
        includeFulfilmentModeColumns: true,
        tag: "chk4",
      });

      await withTestDatabaseClient(database.connectionString, async (client) => {
        const outletId = seeded.outletId;
        const checkoutId = seeded.checkoutId;
        const now = new Date().toISOString();

        // PICKUP with destination fields — reject.
        await expect(
          client.pool.query(
            `INSERT INTO app.checkout_snapshots (
              id, checkout_id, checkout_revision, source_cart_revision, selected_outlet_id,
              evaluated_at, serviceability_evaluated_at, currency, fulfilment_mode,
              destination_kind, recipient_name, recipient_phone, address_line_1,
              city, state_code, postal_code,
              pickup_display_name, pickup_address_line_1, pickup_city, pickup_state_code,
              pickup_postal_code, pickup_instructions,
              base_paise, modifier_adjustments_paise, bundle_adjustments_paise, charges_paise,
              pre_promotion_subtotal_paise, promotion_discount_paise, taxable_paise, tax_paise,
              grand_total_paise, tax_inclusion_mode, created_at
            ) VALUES (
              gen_random_uuid(), $1::uuid, 2, 1, $2::uuid,
              $3::timestamptz, NULL, 'INR', 'PICKUP',
              'ONE_TIME_ADDRESS', 'Bad', '+919876543210', '1 St',
              'Dehradun', 'IN-UT', '248001',
              'Kitchen', '2 St', 'Dehradun', 'IN-UT', '248001', 'Ask at counter',
              10000, 0, 0, 0, 10000, 0, 10000, 500, 10500, 'exclusive', $3::timestamptz
            )`,
            [checkoutId, outletId, now],
          ),
        ).rejects.toThrow();

        // DELIVERY with pickup fields — reject.
        await expect(
          client.pool.query(
            `INSERT INTO app.checkout_snapshots (
              id, checkout_id, checkout_revision, source_cart_revision, selected_outlet_id,
              evaluated_at, serviceability_evaluated_at, currency, fulfilment_mode,
              destination_kind, recipient_name, recipient_phone, address_line_1,
              city, state_code, postal_code,
              pickup_display_name, pickup_address_line_1, pickup_city, pickup_state_code,
              pickup_postal_code, pickup_instructions,
              base_paise, modifier_adjustments_paise, bundle_adjustments_paise, charges_paise,
              pre_promotion_subtotal_paise, promotion_discount_paise, taxable_paise, tax_paise,
              grand_total_paise, tax_inclusion_mode, created_at
            ) VALUES (
              gen_random_uuid(), $1::uuid, 3, 1, $2::uuid,
              $3::timestamptz, $3::timestamptz, 'INR', 'DELIVERY',
              'ONE_TIME_ADDRESS', 'Ok', '+919876543210', '1 St',
              'Dehradun', 'IN-UT', '248001',
              'Kitchen', '2 St', 'Dehradun', 'IN-UT', '248001', 'Ask at counter',
              10000, 0, 0, 0, 10000, 0, 10000, 500, 10500, 'exclusive', $3::timestamptz
            )`,
            [checkoutId, outletId, now],
          ),
        ).rejects.toThrow();

        // PICKUP missing pickup location — reject.
        await expect(
          client.pool.query(
            `INSERT INTO app.checkout_snapshots (
              id, checkout_id, checkout_revision, source_cart_revision, selected_outlet_id,
              evaluated_at, serviceability_evaluated_at, currency, fulfilment_mode,
              base_paise, modifier_adjustments_paise, bundle_adjustments_paise, charges_paise,
              pre_promotion_subtotal_paise, promotion_discount_paise, taxable_paise, tax_paise,
              grand_total_paise, tax_inclusion_mode, created_at
            ) VALUES (
              gen_random_uuid(), $1::uuid, 4, 1, $2::uuid,
              $3::timestamptz, NULL, 'INR', 'PICKUP',
              10000, 0, 0, 0, 10000, 0, 10000, 500, 10500, 'exclusive', $3::timestamptz
            )`,
            [checkoutId, outletId, now],
          ),
        ).rejects.toThrow();

        // DELIVERY missing destination — reject.
        await expect(
          client.pool.query(
            `INSERT INTO app.checkout_snapshots (
              id, checkout_id, checkout_revision, source_cart_revision, selected_outlet_id,
              evaluated_at, serviceability_evaluated_at, currency, fulfilment_mode,
              base_paise, modifier_adjustments_paise, bundle_adjustments_paise, charges_paise,
              pre_promotion_subtotal_paise, promotion_discount_paise, taxable_paise, tax_paise,
              grand_total_paise, tax_inclusion_mode, created_at
            ) VALUES (
              gen_random_uuid(), $1::uuid, 5, 1, $2::uuid,
              $3::timestamptz, $3::timestamptz, 'INR', 'DELIVERY',
              10000, 0, 0, 0, 10000, 0, 10000, 500, 10500, 'exclusive', $3::timestamptz
            )`,
            [checkoutId, outletId, now],
          ),
        ).rejects.toThrow();

        // Legal PICKUP — must succeed.
        await expect(
          client.pool.query(
            `INSERT INTO app.checkout_snapshots (
              id, checkout_id, checkout_revision, source_cart_revision, selected_outlet_id,
              evaluated_at, serviceability_evaluated_at, currency, fulfilment_mode,
              pickup_display_name, pickup_address_line_1, pickup_city, pickup_state_code,
              pickup_postal_code, pickup_instructions,
              base_paise, modifier_adjustments_paise, bundle_adjustments_paise, charges_paise,
              pre_promotion_subtotal_paise, promotion_discount_paise, taxable_paise, tax_paise,
              grand_total_paise, tax_inclusion_mode, created_at
            ) VALUES (
              gen_random_uuid(), $1::uuid, 6, 1, $2::uuid,
              $3::timestamptz, NULL, 'INR', 'PICKUP',
              'Kitchen Counter', '2 St', 'Dehradun', 'IN-UT', '248001', 'Ask at counter',
              10000, 0, 0, 0, 10000, 0, 10000, 500, 10500, 'exclusive', $3::timestamptz
            )`,
            [checkoutId, outletId, now],
          ),
        ).resolves.toBeTruthy();
      });
    });
  });
});
