/**
 * IMP-036I Tranche 1 persistence proofs.
 * Real Testcontainers PostgreSQL only.
 */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { MIGRATIONS_SCHEMA, MIGRATIONS_TABLE } from "../../src/platform/database";
import {
  evaluateCheckout,
  prepareCheckoutForPayment,
  setCheckoutDestination,
  setCheckoutFulfilment,
  setCheckoutFulfilmentTiming,
  startCheckout,
} from "../../src/server/checkout";
import { upsertOutletPickupProfile } from "../../src/server/outlet-pickup-profile/repository";
import { getApplicationPersistence } from "../../src/server/persistence";
import {
  insertOutletOperatingDateException,
  loadOutletSchedulingProfile,
  resolveBrandScheduledFulfilmentPolicy,
  saveOutletSchedulingProfile,
  ScheduledFulfilmentError,
  updateBrandScheduledFulfilmentPolicy,
} from "../../src/server/scheduled-fulfilment/foundations";
import {
  adminConnectionInfo,
  applicationConfig,
  closeTrackedPersistenceHandles,
  trackPersistenceHandle,
} from "./support/cart-fixtures";
import { CHECKOUT_PIN, checkoutOpts, withCheckoutReadyHarness } from "./support/checkout-fixtures";
import { configureAlwaysAcceptingOutlet } from "./support/serviceability-fixtures";
import {
  applyMigrations,
  withIsolatedTestDatabase,
  withTestDatabaseClient,
} from "./support/test-database";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

type JournalEntry = Readonly<{ idx: number; tag: string }>;

function loadJournalEntries(): readonly JournalEntry[] {
  const journal = JSON.parse(
    readFileSync(path.join(process.cwd(), "drizzle/meta/_journal.json"), "utf8"),
  ) as { entries: JournalEntry[] };
  return journal.entries;
}

async function applySqlMigrationFile(connectionString: string, tag: string): Promise<void> {
  const sqlPath = path.join(process.cwd(), "drizzle", `${tag}.sql`);
  const raw = readFileSync(sqlPath, "utf8");
  const statements = raw
    .split(/-->\s*statement-breakpoint/)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
  await withTestDatabaseClient(connectionString, async (client) => {
    for (const statement of statements) {
      await client.pool.query(statement);
    }
    const hash = createHash("sha256").update(raw).digest("hex");
    await client.pool.query(`CREATE SCHEMA IF NOT EXISTS ${MIGRATIONS_SCHEMA}`);
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

async function applyMigrationsThrough(connectionString: string, throughIdx: number): Promise<void> {
  for (const entry of loadJournalEntries().filter((entry) => entry.idx <= throughIdx)) {
    await applySqlMigrationFile(connectionString, entry.tag);
  }
}

function tagCode(prefix: string): string {
  return `${prefix}${randomUUID().replace(/-/g, "").slice(0, 8)}`;
}

function orderNumber(): string {
  const alphabet = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
  let body = "";
  for (let index = 0; index < 12; index += 1) {
    body += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `ORD-${body}`;
}

type Seeded = Readonly<{
  brandId: string;
  outletId: string;
  deliveryCheckoutId: string;
  pickupCheckoutId: string;
  deliverySnapshotId: string;
  pickupSnapshotId: string;
  orderId: string;
  deliveryId: string;
}>;

async function seedPreTimingGraph(connectionString: string): Promise<Seeded> {
  const tag = tagCode("i");
  const brandId = randomUUID();
  const orgId = randomUUID();
  const territoryId = randomUUID();
  const legalEntityId = randomUUID();
  const outletId = randomUUID();
  const userId = `mig-036i-${tag}`;
  const pickupUserId = `mig-036i-p-${tag}`;
  const deliveryCartId = randomUUID();
  const pickupCartId = randomUUID();
  const deliveryCheckoutId = randomUUID();
  const pickupCheckoutId = randomUUID();
  const deliverySnapshotId = randomUUID();
  const pickupSnapshotId = randomUUID();
  const orderId = randomUUID();
  const deliveryId = randomUUID();

  await withTestDatabaseClient(connectionString, async (client) => {
    await client.pool.query(
      `INSERT INTO app.brands (id, code, name, status, created_at, updated_at)
       VALUES ($1::uuid, $2, $3, 'active', now(), now())`,
      [brandId, `b-${tag}`, `Brand ${tag}`],
    );
    await client.pool.query(
      `INSERT INTO app.organizations (id, brand_id, code, name, status, created_at, updated_at)
       VALUES ($1::uuid, $2::uuid, $3, $4, 'active', now(), now())`,
      [orgId, brandId, `o-${tag}`, `Org ${tag}`],
    );
    await client.pool.query(
      `INSERT INTO app.territories (id, brand_id, code, name, status, created_at, updated_at)
       VALUES ($1::uuid, $2::uuid, $3, $4, 'active', now(), now())`,
      [territoryId, brandId, `t-${tag}`, `Territory ${tag}`],
    );
    await client.pool.query(
      `INSERT INTO app.legal_entities (
         id, brand_id, organization_id, code, name, status, created_at, updated_at
       ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, 'active', now(), now())`,
      [legalEntityId, brandId, orgId, `le-${tag}`, `LE ${tag}`],
    );
    await client.pool.query(
      `INSERT INTO app.outlets (
         id, brand_id, organization_id, territory_id, legal_entity_id,
         code, name, status, created_at, updated_at
       ) VALUES (
         $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid,
         $6, $7, 'active', now(), now()
       )`,
      [outletId, brandId, orgId, territoryId, legalEntityId, `out-${tag}`, `Outlet ${tag}`],
    );
    await client.pool.query(
      `INSERT INTO app.customer_auth_users (
         id, name, email, email_verified, phone_number, phone_number_verified, created_at, updated_at
       ) VALUES ($1, $2, $3, false, $4, true, now(), now())`,
      [userId, "Mig User", `${tag}@example.com`, `+91981${tag.replace(/\D/g, "").padEnd(7, "1").slice(0, 7)}`],
    );
    await client.pool.query(
      `INSERT INTO app.customer_auth_users (
         id, name, email, email_verified, phone_number, phone_number_verified, created_at, updated_at
       ) VALUES ($1, $2, $3, false, $4, true, now(), now())`,
      [pickupUserId, "Mig Pickup", `p-${tag}@example.com`, `+91982${tag.replace(/\D/g, "").padEnd(7, "2").slice(0, 7)}`],
    );
    await client.pool.query(
      `INSERT INTO app.carts (
         id, brand_id, customer_auth_user_id, revision, created_at, updated_at
       ) VALUES ($1::uuid, $2::uuid, $3, 1, now(), now())`,
      [deliveryCartId, brandId, userId],
    );
    await client.pool.query(
      `INSERT INTO app.carts (
         id, brand_id, customer_auth_user_id, revision, created_at, updated_at
       ) VALUES ($1::uuid, $2::uuid, $3, 1, now(), now())`,
      [pickupCartId, brandId, pickupUserId],
    );
    await client.pool.query(
      `INSERT INTO app.checkouts (
         id, customer_auth_user_id, brand_id, cart_id, source_cart_revision,
         revision, status, expires_at, fulfilment_mode, created_at, updated_at
       ) VALUES (
         $1::uuid, $2, $3::uuid, $4::uuid, 1, 1, 'DRAFT',
         now() + interval '1 hour', 'DELIVERY', now(), now()
       )`,
      [deliveryCheckoutId, userId, brandId, deliveryCartId],
    );
    await client.pool.query(
      `INSERT INTO app.checkouts (
         id, customer_auth_user_id, brand_id, cart_id, source_cart_revision,
         revision, status, expires_at, fulfilment_mode, pickup_outlet_id, created_at, updated_at
       ) VALUES (
         $1::uuid, $2, $3::uuid, $4::uuid, 1, 1, 'DRAFT',
         now() + interval '1 hour', 'PICKUP', $5::uuid, now(), now()
       )`,
      [pickupCheckoutId, pickupUserId, brandId, pickupCartId, outletId],
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
      [deliverySnapshotId, deliveryCheckoutId, outletId],
    );
    await client.pool.query(
      `INSERT INTO app.checkout_snapshots (
         id, checkout_id, checkout_revision, source_cart_revision, selected_outlet_id,
         evaluated_at, currency, fulfilment_mode,
         pickup_display_name, pickup_address_line_1, pickup_city, pickup_state_code,
         pickup_postal_code, pickup_instructions,
         base_paise, modifier_adjustments_paise, bundle_adjustments_paise, charges_paise,
         pre_promotion_subtotal_paise, promotion_discount_paise, taxable_paise, tax_paise,
         grand_total_paise, tax_inclusion_mode, created_at
       ) VALUES (
         $1::uuid, $2::uuid, 1, 1, $3::uuid,
         now(), 'INR', 'PICKUP',
         'Counter', '1 Mall Road', 'Dehradun', 'IN-UT', '248001', 'Ask at counter',
         10000, 0, 0, 0, 10000, 0, 10000, 500, 10500, 'exclusive', now()
       )`,
      [pickupSnapshotId, pickupCheckoutId, outletId],
    );
    await client.pool.query(
      `INSERT INTO app.orders (
         id, order_number, checkout_id, checkout_snapshot_id,
         payment_provenance_kind, status, revision, created_at, updated_at
       ) VALUES (
         $1::uuid, $2, $3::uuid, $4::uuid,
         'NO_PAYMENT_REQUIRED', 'PLACED', 1, now(), now()
       )`,
      [orderId, orderNumber(), deliveryCheckoutId, deliverySnapshotId],
    );
    await client.pool.query(
      `INSERT INTO app.deliveries (
         id, order_id, request_fingerprint, status, revision,
         created_at, updated_at, requested_at
       ) VALUES (
         $1::uuid, $2::uuid, 'fp-historical', 'REQUESTED', 1, now(), now(), now()
       )`,
      [deliveryId, orderId],
    );
  });

  return {
    brandId,
    outletId,
    deliveryCheckoutId,
    pickupCheckoutId,
    deliverySnapshotId,
    pickupSnapshotId,
    orderId,
    deliveryId,
  };
}

async function protectedColumnFingerprint(connectionString: string): Promise<string> {
  return withTestDatabaseClient(connectionString, async (client) => {
    const result = await client.pool.query<{ line: string }>(
      `SELECT table_name || '.' || column_name || ':' || data_type || ':' || is_nullable AS line
       FROM information_schema.columns
       WHERE table_schema = 'app'
         AND table_name IN ('orders', 'deliveries', 'financial_documents', 'refunds')
       ORDER BY table_name, column_name`,
    );
    return result.rows.map((row) => row.line).join("\n");
  });
}

describe("IMP-036I migration 0045 scheduled fulfilment foundations", () => {
  it("empty database reaches the latest schema including timing foundations", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withTestDatabaseClient(database.connectionString, async (client) => {
        const history = await client.pool.query<{ count: string }>(
          `SELECT COUNT(*) AS count FROM ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE}`,
        );
        expect(Number(history.rows[0]?.count)).toBe(loadJournalEntries().length);
        const tables = await client.pool.query<{ table_name: string }>(
          `SELECT table_name FROM information_schema.tables
           WHERE table_schema = 'app'
             AND table_name IN (
               'brand_scheduled_fulfilment_policies',
               'outlet_scheduling_profiles',
               'outlet_operating_date_exceptions'
             )
           ORDER BY table_name`,
        );
        expect(tables.rows.map((row) => row.table_name)).toEqual([
          "brand_scheduled_fulfilment_policies",
          "outlet_operating_date_exceptions",
          "outlet_scheduling_profiles",
        ]);
      });
    });
  });

  it("previous schema migrates historical checkouts and snapshots to ASAP without rewriting orders or deliveries", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrationsThrough(database.connectionString, 44);
      const beforeColumns = await protectedColumnFingerprint(database.connectionString);
      const seeded = await seedPreTimingGraph(database.connectionString);
      await applySqlMigrationFile(
        database.connectionString,
        "0045_imp036i_scheduled_fulfilment_foundations",
      );
      const afterColumns = await protectedColumnFingerprint(database.connectionString);
      expect(afterColumns).toBe(beforeColumns);

      await withTestDatabaseClient(database.connectionString, async (client) => {
        const checkouts = await client.pool.query<{
          id: string;
          fulfilment_timing: string;
          scheduled_window_start_at: Date | null;
          scheduled_window_end_at: Date | null;
        }>(
          `SELECT id::text, fulfilment_timing, scheduled_window_start_at, scheduled_window_end_at
           FROM app.checkouts WHERE id = ANY($1::uuid[])`,
          [[seeded.deliveryCheckoutId, seeded.pickupCheckoutId]],
        );
        expect(checkouts.rows).toHaveLength(2);
        for (const row of checkouts.rows) {
          expect(row.fulfilment_timing).toBe("ASAP");
          expect(row.scheduled_window_start_at).toBeNull();
          expect(row.scheduled_window_end_at).toBeNull();
        }

        const snapshots = await client.pool.query<{
          fulfilment_timing: string;
          scheduled_window_start_at: Date | null;
          scheduled_timezone: string | null;
          scheduled_cancellation_cutoff_minutes: number | null;
          fulfilment_mode: string;
        }>(
          `SELECT fulfilment_timing, scheduled_window_start_at, scheduled_timezone,
                  scheduled_cancellation_cutoff_minutes, fulfilment_mode
           FROM app.checkout_snapshots WHERE id = ANY($1::uuid[])`,
          [[seeded.deliverySnapshotId, seeded.pickupSnapshotId]],
        );
        expect(snapshots.rows.map((row) => row.fulfilment_mode).sort()).toEqual([
          "DELIVERY",
          "PICKUP",
        ]);
        for (const row of snapshots.rows) {
          expect(row.fulfilment_timing).toBe("ASAP");
          expect(row.scheduled_window_start_at).toBeNull();
          expect(row.scheduled_timezone).toBeNull();
          expect(row.scheduled_cancellation_cutoff_minutes).toBeNull();
        }

        const order = await client.pool.query<{ status: string; revision: string }>(
          `SELECT status, revision::text AS revision FROM app.orders WHERE id = $1::uuid`,
          [seeded.orderId],
        );
        expect(order.rows[0]).toEqual({ status: "PLACED", revision: "1" });

        const delivery = await client.pool.query<{ status: string; request_fingerprint: string }>(
          `SELECT status, request_fingerprint FROM app.deliveries WHERE id = $1::uuid`,
          [seeded.deliveryId],
        );
        expect(delivery.rows[0]).toEqual({
          status: "REQUESTED",
          request_fingerprint: "fp-historical",
        });

        const policies = await client.pool.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count FROM app.brand_scheduled_fulfilment_policies`,
        );
        expect(policies.rows[0]?.count).toBe("0");
        const profiles = await client.pool.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count FROM app.outlet_scheduling_profiles`,
        );
        expect(profiles.rows[0]?.count).toBe("0");
      });
    });
  });
});

describe("IMP-036I checkout and snapshot timing constraints", () => {
  it("accepts ASAP and coherent SCHEDULED rows and rejects malformed timing", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const seeded = await seedPreTimingGraph(database.connectionString);
      await withTestDatabaseClient(database.connectionString, async (client) => {
        await expect(
          client.pool.query(
            `UPDATE app.checkouts
             SET scheduled_window_start_at = now(), scheduled_window_end_at = now() + interval '30 minutes'
             WHERE id = $1::uuid`,
            [seeded.deliveryCheckoutId],
          ),
        ).rejects.toThrow(/checkouts_scheduled_window_shape_check/);

        await client.pool.query(
          `UPDATE app.checkouts
           SET fulfilment_timing = 'SCHEDULED',
               scheduled_window_start_at = now(),
               scheduled_window_end_at = now() + interval '30 minutes'
           WHERE id = $1::uuid`,
          [seeded.deliveryCheckoutId],
        );

        await expect(
          client.pool.query(
            `UPDATE app.checkouts
             SET scheduled_window_end_at = scheduled_window_start_at
             WHERE id = $1::uuid`,
            [seeded.deliveryCheckoutId],
          ),
        ).rejects.toThrow(/checkouts_scheduled_window_shape_check/);

        await expect(
          client.pool.query(
            `UPDATE app.checkouts SET fulfilment_timing = 'LATER' WHERE id = $1::uuid`,
            [seeded.pickupCheckoutId],
          ),
        ).rejects.toThrow(/checkouts_fulfilment_timing_check/);

        await client.pool.query(
          `UPDATE app.checkouts
           SET status = 'READY_FOR_PAYMENT', active_snapshot_id = $2::uuid,
               fulfilment_timing = 'ASAP',
               scheduled_window_start_at = NULL, scheduled_window_end_at = NULL
           WHERE id = $1::uuid`,
          [seeded.deliveryCheckoutId, seeded.deliverySnapshotId],
        );
        await expect(
          client.pool.query(
            `UPDATE app.checkouts
             SET fulfilment_timing = 'SCHEDULED',
                 scheduled_window_start_at = NULL,
                 scheduled_window_end_at = NULL
             WHERE id = $1::uuid`,
            [seeded.deliveryCheckoutId],
          ),
        ).rejects.toThrow(/checkouts_scheduled/);

        const scheduledSnapshotId = randomUUID();
        await client.pool.query(
          `INSERT INTO app.checkout_snapshots (
             id, checkout_id, checkout_revision, source_cart_revision, selected_outlet_id,
             evaluated_at, serviceability_evaluated_at, currency, fulfilment_mode, fulfilment_timing,
             scheduled_window_start_at, scheduled_window_end_at, scheduled_timezone,
             scheduled_cancellation_cutoff_minutes,
             destination_kind, recipient_name, recipient_phone, address_line_1,
             city, state_code, postal_code,
             base_paise, modifier_adjustments_paise, bundle_adjustments_paise, charges_paise,
             pre_promotion_subtotal_paise, promotion_discount_paise, taxable_paise, tax_paise,
             grand_total_paise, tax_inclusion_mode, created_at
           ) VALUES (
             $1::uuid, $2::uuid, 2, 1, $3::uuid,
             now(), now(), 'INR', 'DELIVERY', 'SCHEDULED',
             now(), now() + interval '30 minutes', 'Asia/Kolkata', 60,
             'ONE_TIME_ADDRESS', 'Hist Guest', '+919876543210', '1 Mall Road',
             'Dehradun', 'IN-UT', '248001',
             10000, 0, 0, 0, 10000, 0, 10000, 500, 10500, 'exclusive', now()
           )`,
          [scheduledSnapshotId, seeded.deliveryCheckoutId, seeded.outletId],
        );

        const rejections = [
          [`scheduled_timezone = NULL`, "timezone"],
          [`scheduled_cancellation_cutoff_minutes = NULL`, "cutoff"],
          [`scheduled_cancellation_cutoff_minutes = -1`, "below"],
          [`scheduled_cancellation_cutoff_minutes = 241`, "above"],
          [`scheduled_window_end_at = scheduled_window_start_at`, "order"],
        ];
        for (const [assignment] of rejections) {
          await expect(
            client.pool.query(
              `UPDATE app.checkout_snapshots SET ${assignment} WHERE id = $1::uuid`,
              [scheduledSnapshotId],
            ),
          ).rejects.toThrow(/checkout_snapshots_scheduled_timing_shape_check/);
        }

        await expect(
          client.pool.query(
            `UPDATE app.checkout_snapshots
             SET fulfilment_timing = 'ASAP', scheduled_timezone = 'Asia/Kolkata'
             WHERE id = $1::uuid`,
            [seeded.pickupSnapshotId],
          ),
        ).rejects.toThrow(/checkout_snapshots_scheduled_timing_shape_check/);

        await expect(
          client.pool.query(
            `UPDATE app.checkout_snapshots SET fulfilment_timing = 'WINDOW' WHERE id = $1::uuid`,
            [seeded.pickupSnapshotId],
          ),
        ).rejects.toThrow(/checkout_snapshots_fulfilment_timing_check/);
      });
    });
  });
});

describe("IMP-036I scheduling policy, lead profile, and closure persistence", () => {
  it("resolves absent brand policy as product defaults and compare-and-swaps the first explicit row", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const seeded = await seedPreTimingGraph(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      trackPersistenceHandle(persistence);

      const absent = await persistence.withContext((ctx) =>
        resolveBrandScheduledFulfilmentPolicy(ctx, seeded.brandId),
      );
      expect(absent).toMatchObject({
        pickupCancellationCutoffMinutes: 30,
        deliveryCancellationCutoffMinutes: 60,
        revision: BigInt(0),
        source: "PRODUCT_DEFAULT",
      });

      const created = await updateBrandScheduledFulfilmentPolicy(persistence, {
        brandId: seeded.brandId,
        expectedRevision: BigInt(0),
        pickupCancellationCutoffMinutes: 30,
        deliveryCancellationCutoffMinutes: 60,
      });
      expect(created.revision).toBe(BigInt(1));
      expect(created.source).toBe("EXPLICIT_ROW");

      await expect(
        updateBrandScheduledFulfilmentPolicy(persistence, {
          brandId: seeded.brandId,
          expectedRevision: BigInt(0),
          pickupCancellationCutoffMinutes: 15,
          deliveryCancellationCutoffMinutes: 45,
        }),
      ).rejects.toMatchObject({ code: "STALE_REVISION" });

      const next = await updateBrandScheduledFulfilmentPolicy(persistence, {
        brandId: seeded.brandId,
        expectedRevision: BigInt(1),
        pickupCancellationCutoffMinutes: 20,
        deliveryCancellationCutoffMinutes: 90,
      });
      expect(next.revision).toBe(BigInt(2));
      expect(next.pickupCancellationCutoffMinutes).toBe(20);

      await expect(
        updateBrandScheduledFulfilmentPolicy(persistence, {
          brandId: seeded.brandId,
          expectedRevision: BigInt(2),
          pickupCancellationCutoffMinutes: -1,
          deliveryCancellationCutoffMinutes: 60,
        }),
      ).rejects.toMatchObject({ code: "INVALID_INPUT" });
      await expect(
        updateBrandScheduledFulfilmentPolicy(persistence, {
          brandId: seeded.brandId,
          expectedRevision: BigInt(2),
          pickupCancellationCutoffMinutes: 30,
          deliveryCancellationCutoffMinutes: 241,
        }),
      ).rejects.toMatchObject({ code: "INVALID_INPUT" });

      const raced = await Promise.allSettled([
        updateBrandScheduledFulfilmentPolicy(persistence, {
          brandId: seeded.brandId,
          expectedRevision: BigInt(0),
          pickupCancellationCutoffMinutes: 10,
          deliveryCancellationCutoffMinutes: 10,
        }),
        updateBrandScheduledFulfilmentPolicy(persistence, {
          brandId: seeded.brandId,
          expectedRevision: BigInt(2),
          pickupCancellationCutoffMinutes: 40,
          deliveryCancellationCutoffMinutes: 40,
        }),
        updateBrandScheduledFulfilmentPolicy(persistence, {
          brandId: seeded.brandId,
          expectedRevision: BigInt(2),
          pickupCancellationCutoffMinutes: 50,
          deliveryCancellationCutoffMinutes: 50,
        }),
      ]);
      const winners = raced.filter((result) => result.status === "fulfilled");
      const losers = raced.filter((result) => result.status === "rejected");
      expect(winners).toHaveLength(1);
      expect(losers).toHaveLength(2);
      for (const loser of losers) {
        expect((loser as PromiseRejectedResult).reason).toBeInstanceOf(ScheduledFulfilmentError);
        expect((loser as PromiseRejectedResult).reason.code).toBe("STALE_REVISION");
      }
    });
  });

  it("persists outlet lead times without inventing an absent default and rejects non-positive leads", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const seeded = await seedPreTimingGraph(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      trackPersistenceHandle(persistence);

      const absent = await persistence.withContext((ctx) =>
        loadOutletSchedulingProfile(ctx, seeded.outletId),
      );
      expect(absent).toBeNull();

      await expect(
        saveOutletSchedulingProfile(persistence, {
          outletId: seeded.outletId,
          pickupMinLeadMinutes: 0,
          deliveryMinLeadMinutes: 45,
          expectedRevision: BigInt(0),
        }),
      ).rejects.toMatchObject({ code: "INVALID_INPUT" });

      const created = await saveOutletSchedulingProfile(persistence, {
        outletId: seeded.outletId,
        pickupMinLeadMinutes: 30,
        deliveryMinLeadMinutes: 45,
        expectedRevision: BigInt(0),
      });
      expect(created.revision).toBe(BigInt(1));
      expect(created.pickupMinLeadMinutes).toBe(30);
      expect(created.deliveryMinLeadMinutes).toBe(45);

      await expect(
        saveOutletSchedulingProfile(persistence, {
          outletId: seeded.outletId,
          pickupMinLeadMinutes: 15,
          deliveryMinLeadMinutes: 15,
          expectedRevision: BigInt(0),
        }),
      ).rejects.toMatchObject({ code: "STALE_REVISION" });

      const updated = await saveOutletSchedulingProfile(persistence, {
        outletId: seeded.outletId,
        pickupMinLeadMinutes: 20,
        deliveryMinLeadMinutes: 40,
        expectedRevision: BigInt(1),
      });
      expect(updated.revision).toBe(BigInt(2));
    });
  });

  it("accepts CLOSED_FULL_DAY and rejects unsupported or duplicate outlet dates", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const seeded = await seedPreTimingGraph(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      trackPersistenceHandle(persistence);

      const created = await persistence.transaction((tx) =>
        insertOutletOperatingDateException(tx, {
          outletId: seeded.outletId,
          localDate: "2026-10-02",
          exceptionKind: "CLOSED_FULL_DAY",
          note: "Holiday",
        }),
      );
      expect(created.exceptionKind).toBe("CLOSED_FULL_DAY");

      await expect(
        persistence.transaction((tx) =>
          insertOutletOperatingDateException(tx, {
            outletId: seeded.outletId,
            localDate: "2026-10-03",
            exceptionKind: "PARTIAL_DAY",
          }),
        ),
      ).rejects.toMatchObject({ code: "INVALID_INPUT" });

      await expect(
        persistence.transaction((tx) =>
          insertOutletOperatingDateException(tx, {
            outletId: seeded.outletId,
            localDate: "2026-10-02",
            exceptionKind: "CLOSED_FULL_DAY",
          }),
        ),
      ).rejects.toMatchObject({ code: "CONFLICT" });
    });
  });
});

describe("IMP-036I checkout timing mutation", () => {
  it("advances revision and invalidates READY when the selected window changes", async () => {
    await withCheckoutReadyHarness(async ({ persistence, actors, cartId, addressId }) => {
      const opts = checkoutOpts();
      const started = await startCheckout(persistence, actors.customerA, { cartId }, opts);
      const withDest = await setCheckoutDestination(
        persistence,
        actors.customerA,
        {
          checkoutId: started.id,
          expectedCheckoutRevision: started.revision,
          destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
        },
        opts,
      );
      const ready = await evaluateCheckout(
        persistence,
        actors.customerA,
        {
          checkoutId: withDest.id,
          expectedCheckoutRevision: withDest.revision,
        },
        opts,
      );
      expect(ready.checkout.status).toBe("READY_FOR_PAYMENT");
      expect(ready.checkout.fulfilmentTiming).toBe("ASAP");
      expect(ready.snapshot.fulfilmentTiming).toBe("ASAP");
      expect(ready.snapshot.scheduledTimezone).toBeNull();

      const startAt = new Date("2026-10-02T10:00:00.000Z");
      const endAt = new Date("2026-10-02T10:30:00.000Z");
      const scheduled = await setCheckoutFulfilmentTiming(
        persistence,
        actors.customerA,
        {
          checkoutId: ready.checkout.id,
          expectedCheckoutRevision: ready.checkout.revision,
          fulfilmentTiming: "SCHEDULED",
          scheduledWindowStartAt: startAt,
          scheduledWindowEndAt: endAt,
        },
        opts,
      );
      expect(scheduled.status).toBe("DRAFT");
      expect(scheduled.activeSnapshotId).toBeNull();
      expect(scheduled.fulfilmentTiming).toBe("SCHEDULED");
      expect(scheduled.scheduledWindowStartAt?.toISOString()).toBe(startAt.toISOString());
      expect(scheduled.revision).toBe(ready.checkout.revision + BigInt(1));

      await expect(
        setCheckoutFulfilmentTiming(
          persistence,
          actors.customerA,
          {
            checkoutId: scheduled.id,
            expectedCheckoutRevision: scheduled.revision,
            fulfilmentTiming: "ASAP",
            scheduledWindowStartAt: startAt,
            scheduledWindowEndAt: endAt,
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_INVALID_INPUT" });
    });
  });
});

async function snapshotCount(
  persistence: Parameters<typeof evaluateCheckout>[0],
  checkoutId: string,
): Promise<number> {
  const result = await persistence.withContext((ctx) =>
    ctx.db.execute(sql`
      select count(*)::int as n
      from app.checkout_snapshots
      where checkout_id = ${checkoutId}::uuid
    `),
  );
  return Number(result.rows[0]!.n);
}

async function checkoutTimingRow(
  persistence: Parameters<typeof evaluateCheckout>[0],
  checkoutId: string,
): Promise<{
  status: string;
  fulfilmentTiming: string;
  activeSnapshotId: string | null;
  windowStart: Date | null;
  windowEnd: Date | null;
  revision: string;
}> {
  const result = await persistence.withContext((ctx) =>
    ctx.db.execute(sql`
      select status,
             fulfilment_timing,
             active_snapshot_id::text as active_snapshot_id,
             scheduled_window_start_at,
             scheduled_window_end_at,
             revision::text as revision
      from app.checkouts
      where id = ${checkoutId}::uuid
    `),
  );
  const row = result.rows[0]!;
  const asDate = (value: unknown): Date | null => {
    if (value == null) return null;
    return value instanceof Date ? value : new Date(String(value));
  };
  return {
    status: String(row.status),
    fulfilmentTiming: String(row.fulfilment_timing),
    activeSnapshotId: row.active_snapshot_id ? String(row.active_snapshot_id) : null,
    windowStart: asDate(row.scheduled_window_start_at),
    windowEnd: asDate(row.scheduled_window_end_at),
    revision: String(row.revision),
  };
}

describe("IMP-036I tranche 1 scheduled evaluation fails closed", () => {
  it("does not evaluate a SCHEDULED Checkout into an ASAP Snapshot", async () => {
    await withCheckoutReadyHarness(async ({ persistence, actors, cartId, addressId }) => {
      const opts = checkoutOpts();
      const started = await startCheckout(persistence, actors.customerA, { cartId }, opts);
      const withDest = await setCheckoutDestination(
        persistence,
        actors.customerA,
        {
          checkoutId: started.id,
          expectedCheckoutRevision: started.revision,
          destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
        },
        opts,
      );
      const ready = await evaluateCheckout(
        persistence,
        actors.customerA,
        {
          checkoutId: withDest.id,
          expectedCheckoutRevision: withDest.revision,
        },
        opts,
      );
      expect(ready.checkout.status).toBe("READY_FOR_PAYMENT");
      expect(ready.checkout.fulfilmentTiming).toBe("ASAP");
      expect(ready.snapshot.fulfilmentTiming).toBe("ASAP");

      const startAt = new Date("2026-10-02T10:00:00.000Z");
      const endAt = new Date("2026-10-02T10:30:00.000Z");
      const scheduled = await setCheckoutFulfilmentTiming(
        persistence,
        actors.customerA,
        {
          checkoutId: ready.checkout.id,
          expectedCheckoutRevision: ready.checkout.revision,
          fulfilmentTiming: "SCHEDULED",
          scheduledWindowStartAt: startAt,
          scheduledWindowEndAt: endAt,
        },
        opts,
      );
      expect(scheduled.status).toBe("DRAFT");
      expect(scheduled.activeSnapshotId).toBeNull();
      expect(scheduled.revision).toBe(ready.checkout.revision + BigInt(1));
      expect(scheduled.fulfilmentTiming).toBe("SCHEDULED");
      expect(scheduled.scheduledWindowStartAt?.toISOString()).toBe(startAt.toISOString());
      expect(scheduled.scheduledWindowEndAt?.toISOString()).toBe(endAt.toISOString());

      const before = await snapshotCount(persistence, scheduled.id);
      await expect(
        evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: scheduled.id,
            expectedCheckoutRevision: scheduled.revision,
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_STATE_CONFLICT" });

      expect(await snapshotCount(persistence, scheduled.id)).toBe(before);
      const after = await checkoutTimingRow(persistence, scheduled.id);
      expect(after.status).toBe("DRAFT");
      expect(after.activeSnapshotId).toBeNull();
      expect(after.fulfilmentTiming).toBe("SCHEDULED");
      expect(after.windowStart?.toISOString()).toBe(startAt.toISOString());
      expect(after.windowEnd?.toISOString()).toBe(endAt.toISOString());
      expect(after.revision).toBe(scheduled.revision.toString());
    });
  });

  it("rejects payment preparation when Checkout is SCHEDULED and the active Snapshot is ASAP", async () => {
    await withCheckoutReadyHarness(async ({ persistence, actors, cartId, addressId }) => {
      const opts = checkoutOpts();
      const started = await startCheckout(persistence, actors.customerA, { cartId }, opts);
      const withDest = await setCheckoutDestination(
        persistence,
        actors.customerA,
        {
          checkoutId: started.id,
          expectedCheckoutRevision: started.revision,
          destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
        },
        opts,
      );
      const ready = await evaluateCheckout(
        persistence,
        actors.customerA,
        {
          checkoutId: withDest.id,
          expectedCheckoutRevision: withDest.revision,
        },
        opts,
      );
      const startAt = new Date("2026-10-02T11:00:00.000Z");
      const endAt = new Date("2026-10-02T11:30:00.000Z");
      await persistence.withContext((ctx) =>
        ctx.db.execute(sql`
          update app.checkouts
          set fulfilment_timing = 'SCHEDULED',
              scheduled_window_start_at = ${startAt},
              scheduled_window_end_at = ${endAt}
          where id = ${ready.checkout.id}::uuid
        `),
      );
      const before = await snapshotCount(persistence, ready.checkout.id);

      await expect(
        prepareCheckoutForPayment(
          persistence,
          actors.customerA,
          {
            checkoutId: ready.checkout.id,
            expectedCheckoutRevision: ready.checkout.revision,
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_STATE_CONFLICT" });

      expect(await snapshotCount(persistence, ready.checkout.id)).toBe(before);
      const after = await checkoutTimingRow(persistence, ready.checkout.id);
      expect(after.status).not.toBe("READY_FOR_PAYMENT");
      expect(after.fulfilmentTiming).toBe("SCHEDULED");
      expect(after.activeSnapshotId).toBeNull();
      expect(after.windowStart?.toISOString()).toBe(startAt.toISOString());
      expect(after.windowEnd?.toISOString()).toBe(endAt.toISOString());
    });
  });

  it("still evaluates DELIVERY and PICKUP ASAP Checkouts to READY", async () => {
    await withCheckoutReadyHarness(async ({ persistence, actors, cartId, addressId }) => {
      const opts = checkoutOpts();
      const started = await startCheckout(persistence, actors.customerA, { cartId }, opts);
      const withDest = await setCheckoutDestination(
        persistence,
        actors.customerA,
        {
          checkoutId: started.id,
          expectedCheckoutRevision: started.revision,
          destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
        },
        opts,
      );
      const delivery = await evaluateCheckout(
        persistence,
        actors.customerA,
        {
          checkoutId: withDest.id,
          expectedCheckoutRevision: withDest.revision,
        },
        opts,
      );
      expect(delivery.checkout.status).toBe("READY_FOR_PAYMENT");
      expect(delivery.checkout.fulfilmentMode).toBe("DELIVERY");
      expect(delivery.snapshot.fulfilmentTiming).toBe("ASAP");
      expect(delivery.snapshot.scheduledWindowStartAt).toBeNull();
      expect(delivery.snapshot.scheduledWindowEndAt).toBeNull();

      const prepared = await prepareCheckoutForPayment(
        persistence,
        actors.customerA,
        {
          checkoutId: delivery.checkout.id,
          expectedCheckoutRevision: delivery.checkout.revision,
        },
        opts,
      );
      expect(prepared.snapshot.fulfilmentTiming).toBe("ASAP");
      expect(prepared.snapshot.id).toBe(delivery.snapshot.id);
    });

    await withCheckoutReadyHarness(async ({ persistence, actors, cartId }) => {
      const opts = checkoutOpts();
      await configureAlwaysAcceptingOutlet(
        persistence,
        actors.brandAdminActor,
        actors.tree.outletA.id,
      );
      await persistence.transaction(async (tx) => {
        await upsertOutletPickupProfile(tx, {
          outletId: actors.tree.outletA.id,
          enabled: true,
          displayName: "Pickup Counter",
          addressLine1: "12 Mall Road",
          addressLine2: null,
          locality: "Rajpur",
          city: "Dehradun",
          stateCode: "IN-UT",
          postalCode: CHECKOUT_PIN,
          latitude: null,
          longitude: null,
          instructions: "Ask at counter for BOBA order.",
        });
      });
      let checkout = await startCheckout(persistence, actors.customerA, { cartId }, opts);
      checkout = await setCheckoutFulfilment(
        persistence,
        actors.customerA,
        {
          checkoutId: checkout.id,
          expectedCheckoutRevision: checkout.revision,
          fulfilmentMode: "PICKUP",
          pickupOutletId: actors.tree.outletA.id,
        },
        opts,
      );
      const pickup = await evaluateCheckout(
        persistence,
        actors.customerA,
        {
          checkoutId: checkout.id,
          expectedCheckoutRevision: checkout.revision,
        },
        opts,
      );
      expect(pickup.checkout.status).toBe("READY_FOR_PAYMENT");
      expect(pickup.checkout.fulfilmentMode).toBe("PICKUP");
      expect(pickup.snapshot.fulfilmentTiming).toBe("ASAP");
      expect(pickup.snapshot.scheduledWindowStartAt).toBeNull();

      const prepared = await prepareCheckoutForPayment(
        persistence,
        actors.customerA,
        {
          checkoutId: pickup.checkout.id,
          expectedCheckoutRevision: pickup.checkout.revision,
        },
        opts,
      );
      expect(prepared.snapshot.fulfilmentTiming).toBe("ASAP");
      expect(prepared.snapshot.fulfilmentMode).toBe("PICKUP");
    });
  });
});
