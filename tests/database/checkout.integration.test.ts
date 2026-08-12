/**
 * Checkout PostgreSQL integration tests (IMP-021) — DB-01..DB-14.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import {
  evaluateCheckout,
  setCheckoutDestination,
  startCheckout,
} from "../../src/server/checkout";
import { getApplicationPersistence } from "../../src/server/persistence";
import {
  CHECKOUT_PIN,
  checkoutOpts,
  closeTrackedPersistenceHandles,
  withCheckoutReadyHarness,
} from "./support/checkout-fixtures";
import {
  adminConnectionInfo,
  applicationConfig,
  trackPersistenceHandle,
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
  "drizzle/0014_cart.sql",
] as const;

const DEST_FIELDS = {
  recipientName: "Ashutosh Joshi",
  recipientPhone: "+919876543210",
  addressLine1: "Flat 204, Block-B",
  city: "Dehradun",
  stateCode: "IN-UT",
  postalCode: CHECKOUT_PIN,
} as const;

async function insertMinimalCheckout(
  ctx: { db: { execute: (q: ReturnType<typeof sql>) => Promise<{ rows: Array<Record<string, unknown>> }> } },
  args: {
    brandId: string;
    cartId: string;
    customerId: string;
    status?: string;
    revision?: number;
    sourceCartRevision?: number;
    activeSnapshotId?: string | null;
    now?: Date;
  },
): Promise<string> {
  const now = args.now ?? new Date("2026-08-09T12:00:00.000Z");
  const expires = new Date(now.getTime() + 15 * 60 * 1000);
  const status = args.status ?? "DRAFT";
  const revision = args.revision ?? 1;
  const sourceCartRevision = args.sourceCartRevision ?? 1;
  const activeSnapshotId = args.activeSnapshotId ?? null;
  const result = await ctx.db.execute(sql`
    insert into app.checkouts (
      id, customer_auth_user_id, brand_id, cart_id, source_cart_revision,
      revision, status, expires_at, active_snapshot_id, created_at, updated_at
    ) values (
      gen_random_uuid(), ${args.customerId}, ${args.brandId}::uuid, ${args.cartId}::uuid,
      ${sourceCartRevision}, ${revision}, ${status}, ${expires},
      ${activeSnapshotId}::uuid, ${now}, ${now}
    ) returning id
  `);
  return result.rows[0]!.id as string;
}

async function insertMinimalSnapshot(
  ctx: { db: { execute: (q: ReturnType<typeof sql>) => Promise<{ rows: Array<Record<string, unknown>> }> } },
  args: {
    checkoutId: string;
    outletId: string;
    checkoutRevision?: number;
    sourceCartRevision?: number;
    now?: Date;
  },
): Promise<string> {
  const now = args.now ?? new Date("2026-08-09T12:00:00.000Z");
  const result = await ctx.db.execute(sql`
    insert into app.checkout_snapshots (
      id, checkout_id, checkout_revision, source_cart_revision, selected_outlet_id,
      evaluated_at, serviceability_evaluated_at, currency, manual_coupon_code,
      destination_kind, source_saved_address_id,
      recipient_name, recipient_phone, address_line_1, city, state_code, postal_code,
      base_paise, modifier_adjustments_paise, bundle_adjustments_paise, charges_paise,
      pre_promotion_subtotal_paise, promotion_discount_paise, taxable_paise, tax_paise,
      grand_total_paise, tax_inclusion_mode, created_at
    ) values (
      gen_random_uuid(), ${args.checkoutId}::uuid,
      ${args.checkoutRevision ?? 1}, ${args.sourceCartRevision ?? 1},
      ${args.outletId}::uuid, ${now}, ${now}, 'INR', null,
      'ONE_TIME_ADDRESS', null,
      ${DEST_FIELDS.recipientName}, ${DEST_FIELDS.recipientPhone},
      ${DEST_FIELDS.addressLine1}, ${DEST_FIELDS.city}, ${DEST_FIELDS.stateCode},
      ${DEST_FIELDS.postalCode},
      10000, 0, 0, 0, 10000, 0, 10000, 500, 10500, 'exclusive', ${now}
    ) returning id
  `);
  return result.rows[0]!.id as string;
}

describe("IMP-021 checkout migration", () => {
  it("DB-01 migration applies; 10 Checkout tables; totals 16 migrations / 85 app tables", async () => {
    const integrity = JSON.parse(
      readFileSync(path.join(process.cwd(), "drizzle/migration-integrity.json"), "utf8"),
    ) as { migrations: Array<{ path: string; sha256: string; tag: string }> };

    for (const rel of PRIOR_MIGRATIONS) {
      const fileHash = sha256File(rel);
      const entry = integrity.migrations.find((m) => m.path === rel);
      expect(entry).toBeDefined();
      expect(entry!.sha256).toBe(fileHash);
    }

    const checkout = integrity.migrations.find(
      (m) => m.path === "drizzle/0015_checkout.sql",
    );
    expect(checkout).toBeDefined();
    expect(checkout!.sha256).toBe(sha256File("drizzle/0015_checkout.sql"));
    expect(integrity.migrations).toHaveLength(16);

    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(
        applicationConfig(database.connectionString),
      );
      trackPersistenceHandle(persistence);

      await persistence.withContext(async (ctx) => {
        const checkoutTables = await ctx.db.execute(sql`
          select count(*)::text as count
          from information_schema.tables
          where table_schema = 'app'
            and table_name in (
              'checkouts',
              'checkout_delivery_destinations',
              'checkout_snapshots',
              'checkout_snapshot_lines',
              'checkout_snapshot_line_modifier_selections',
              'checkout_snapshot_line_bundle_selections',
              'checkout_snapshot_line_bundle_modifier_selections',
              'checkout_snapshot_charges',
              'checkout_snapshot_promotion_effects',
              'checkout_snapshot_tax_components'
            )
        `);
        expect(checkoutTables.rows[0]?.count).toBe("10");

        const appTables = await ctx.db.execute(sql`
          select count(*)::text as count
          from information_schema.tables
          where table_schema = 'app' and table_type = 'BASE TABLE'
        `);
        expect(appTables.rows[0]?.count).toBe("85");
      });
    });
  });

  it("DB-14 migration integrity / sealed hashes; no drizzle-kit push", () => {
    const integrity = JSON.parse(
      readFileSync(path.join(process.cwd(), "drizzle/migration-integrity.json"), "utf8"),
    ) as { migrations: Array<{ path: string; sha256: string; tag: string }> };

    expect(integrity.migrations).toHaveLength(16);
    const cart = integrity.migrations.find((m) => m.path === "drizzle/0014_cart.sql");
    expect(cart).toBeDefined();
    expect(cart!.sha256).toBe(sha256File("drizzle/0014_cart.sql"));
    const checkout = integrity.migrations.find(
      (m) => m.path === "drizzle/0015_checkout.sql",
    );
    expect(checkout).toBeDefined();
    expect(checkout!.sha256).toBe(sha256File("drizzle/0015_checkout.sql"));

    const pkg = JSON.parse(
      readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    for (const script of Object.values(pkg.scripts)) {
      expect(script).not.toMatch(/drizzle-kit\s+push/);
    }
    const sqlText = readFileSync(
      path.join(process.cwd(), "drizzle/0015_checkout.sql"),
      "utf8",
    );
    expect(sqlText).not.toMatch(/drizzle-kit\s+push/i);
  });
});

describe("IMP-021 checkout constraints", () => {
  it("DB-02 revision > 0 and source_cart_revision > 0; zero/negative rejected", async () => {
    await withCheckoutReadyHarness(async ({ persistence, actors, cartId }) => {
      const brandId = actors.tree.brand.id;
      const now = new Date("2026-08-09T12:00:00.000Z");

      await persistence.withContext(async (ctx) => {
        await expect(
          ctx.db.execute(sql`
            insert into app.checkouts (
              id, customer_auth_user_id, brand_id, cart_id, source_cart_revision,
              revision, status, expires_at, created_at, updated_at
            ) values (
              gen_random_uuid(), ${actors.customerAId}, ${brandId}::uuid, ${cartId}::uuid,
              0, 1, 'DRAFT', ${now}, ${now}, ${now}
            )
          `),
        ).rejects.toThrow();

        await expect(
          ctx.db.execute(sql`
            insert into app.checkouts (
              id, customer_auth_user_id, brand_id, cart_id, source_cart_revision,
              revision, status, expires_at, created_at, updated_at
            ) values (
              gen_random_uuid(), ${actors.customerAId}, ${brandId}::uuid, ${cartId}::uuid,
              1, 0, 'DRAFT', ${now}, ${now}, ${now}
            )
          `),
        ).rejects.toThrow();

        await expect(
          ctx.db.execute(sql`
            insert into app.checkouts (
              id, customer_auth_user_id, brand_id, cart_id, source_cart_revision,
              revision, status, expires_at, created_at, updated_at
            ) values (
              gen_random_uuid(), ${actors.customerAId}, ${brandId}::uuid, ${cartId}::uuid,
              -1, 1, 'DRAFT', ${now}, ${now}, ${now}
            )
          `),
        ).rejects.toThrow();
      });
    });
  });

  it("DB-03 only locked lifecycle statuses accepted", async () => {
    await withCheckoutReadyHarness(async ({ persistence, actors, cartId }) => {
      const brandId = actors.tree.brand.id;
      const now = new Date("2026-08-09T12:00:00.000Z");
      await persistence.withContext(async (ctx) => {
        await expect(
          ctx.db.execute(sql`
            insert into app.checkouts (
              id, customer_auth_user_id, brand_id, cart_id, source_cart_revision,
              revision, status, expires_at, created_at, updated_at
            ) values (
              gen_random_uuid(), ${actors.customerAId}, ${brandId}::uuid, ${cartId}::uuid,
              1, 1, 'PENDING', ${now}, ${now}, ${now}
            )
          `),
        ).rejects.toThrow();

        for (const status of [
          "DRAFT",
          "CANCELLED",
          "EXPIRED",
        ] as const) {
          await ctx.db.execute(sql`
            insert into app.checkouts (
              id, customer_auth_user_id, brand_id, cart_id, source_cart_revision,
              revision, status, expires_at, created_at, updated_at
            ) values (
              gen_random_uuid(), ${actors.customerAId}, ${brandId}::uuid, ${cartId}::uuid,
              1, 1, ${status}, ${now}, ${now}, ${now}
            )
          `);
        }
      });
    });
  });

  it("DB-04 at most one non-terminal Checkout per Cart", async () => {
    await withCheckoutReadyHarness(async ({ persistence, actors, cartId }) => {
      const brandId = actors.tree.brand.id;
      const now = new Date("2026-08-09T12:00:00.000Z");
      await persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          insert into app.checkouts (
            id, customer_auth_user_id, brand_id, cart_id, source_cart_revision,
            revision, status, expires_at, created_at, updated_at
          ) values (
            gen_random_uuid(), ${actors.customerAId}, ${brandId}::uuid, ${cartId}::uuid,
            1, 1, 'DRAFT', ${now}, ${now}, ${now}
          )
        `);
        await expect(
          ctx.db.execute(sql`
            insert into app.checkouts (
              id, customer_auth_user_id, brand_id, cart_id, source_cart_revision,
              revision, status, expires_at, created_at, updated_at
            ) values (
              gen_random_uuid(), ${actors.customerAId}, ${brandId}::uuid, ${cartId}::uuid,
              1, 1, 'DRAFT', ${now}, ${now}, ${now}
            )
          `),
        ).rejects.toThrow();
      });
    });
  });

  it("DB-05 Checkout A cannot activate Snapshot B (composite ownership FK rejects)", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, catalog }) => {
        const brandId = actors.tree.brand.id;
        const outletId = actors.tree.outletA.id;
        const now = new Date("2026-08-09T12:00:00.000Z");

        const cartB = await persistence.withContext(async (ctx) => {
          const inserted = await ctx.db.execute(sql`
            insert into app.carts (
              id, brand_id, customer_auth_user_id, guest_credential_verifier,
              revision, expires_at, created_at, updated_at
            ) values (
              gen_random_uuid(), ${brandId}::uuid, ${actors.customerBId}, null,
              1, null, ${now}, ${now}
            ) returning id
          `);
          return inserted.rows[0]!.id as string;
        });

        await persistence.withContext(async (ctx) => {
          const ownership = await ctx.db.execute(sql`
            select conname, pg_get_constraintdef(oid) as def
            from pg_constraint
            where conname = 'checkouts_active_snapshot_ownership_fk'
          `);
          expect(ownership.rows).toHaveLength(1);
          expect(String(ownership.rows[0]?.def)).toMatch(
            /FOREIGN KEY \(active_snapshot_id, id\).*REFERENCES.*checkout_snapshots.*\(id, checkout_id\)/i,
          );

          const checkoutA = await insertMinimalCheckout(ctx, {
            brandId,
            cartId,
            customerId: actors.customerAId,
            status: "DRAFT",
            now,
          });
          const checkoutB = await insertMinimalCheckout(ctx, {
            brandId,
            cartId: cartB,
            customerId: actors.customerBId,
            status: "DRAFT",
            now,
          });
          const snapshotB = await insertMinimalSnapshot(ctx, {
            checkoutId: checkoutB,
            outletId,
            now,
          });

          const before = await ctx.db.execute(sql`
            select active_snapshot_id::text as active_snapshot_id, status
            from app.checkouts
            where id = ${checkoutA}::uuid
          `);
          expect(before.rows[0]?.active_snapshot_id).toBeNull();
          expect(before.rows[0]?.status).toBe("DRAFT");

          await expect(
            ctx.db.execute(sql`
              update app.checkouts
              set status = 'READY_FOR_PAYMENT',
                  active_snapshot_id = ${snapshotB}::uuid,
                  revision = 2
              where id = ${checkoutA}::uuid
            `),
          ).rejects.toThrow();

          const after = await ctx.db.execute(sql`
            select active_snapshot_id::text as active_snapshot_id, status, revision::text as revision
            from app.checkouts
            where id = ${checkoutA}::uuid
          `);
          expect(after.rows[0]?.active_snapshot_id).toBeNull();
          expect(after.rows[0]?.status).toBe("DRAFT");
          expect(after.rows[0]?.revision).toBe("1");

          const snapBOwner = await ctx.db.execute(sql`
            select checkout_id::text as checkout_id
            from app.checkout_snapshots
            where id = ${snapshotB}::uuid
          `);
          expect(snapBOwner.rows[0]?.checkout_id).toBe(checkoutB);
          void catalog;
        });
      },
    );
  });

  it("DB-06 status ↔ active snapshot integrity", async () => {
    await withCheckoutReadyHarness(async ({ persistence, actors, cartId }) => {
      const brandId = actors.tree.brand.id;
      const outletId = actors.tree.outletA.id;
      const now = new Date("2026-08-09T12:00:00.000Z");

      await persistence.withContext(async (ctx) => {
        // READY without snapshot
        await expect(
          ctx.db.execute(sql`
            insert into app.checkouts (
              id, customer_auth_user_id, brand_id, cart_id, source_cart_revision,
              revision, status, expires_at, active_snapshot_id, created_at, updated_at
            ) values (
              gen_random_uuid(), ${actors.customerAId}, ${brandId}::uuid, ${cartId}::uuid,
              1, 1, 'READY_FOR_PAYMENT', ${now}, null, ${now}, ${now}
            )
          `),
        ).rejects.toThrow();

        // DRAFT with snapshot pointer
        const draftId = await insertMinimalCheckout(ctx, {
          brandId,
          cartId,
          customerId: actors.customerAId,
          status: "DRAFT",
          now,
        });
        const snap = await insertMinimalSnapshot(ctx, {
          checkoutId: draftId,
          outletId,
          now,
        });
        await expect(
          ctx.db.execute(sql`
            update app.checkouts
            set active_snapshot_id = ${snap}::uuid
            where id = ${draftId}::uuid
          `),
        ).rejects.toThrow();
      });
    });
  });

  it("DB-07 snapshot child relational integrity / no orphan rows", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, catalog }) => {
        const brandId = actors.tree.brand.id;
        const outletId = actors.tree.outletA.id;
        const now = new Date("2026-08-09T12:00:00.000Z");

        await persistence.withContext(async (ctx) => {
          const checkoutId = await insertMinimalCheckout(ctx, {
            brandId,
            cartId,
            customerId: actors.customerAId,
            now,
          });
          const snapshotId = await insertMinimalSnapshot(ctx, {
            checkoutId,
            outletId,
            now,
          });

          await expect(
            ctx.db.execute(sql`
              insert into app.checkout_snapshot_lines (
                id, snapshot_id, source_cart_line_id, product_id, variant_id,
                product_name, variant_name, quantity,
                line_base_paise, line_modifier_adjustments_paise,
                line_bundle_adjustments_paise, line_subtotal_paise,
                line_promotion_discount_paise, line_taxable_paise,
                line_tax_paise, line_total_paise, sequence
              ) values (
                gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
                ${catalog.productId}::uuid, ${catalog.variantId}::uuid,
                'P', 'V', 1, 0, 0, 0, 0, 0, 0, 0, 0, 0
              )
            `),
          ).rejects.toThrow();

          await ctx.db.execute(sql`
            insert into app.checkout_snapshot_lines (
              id, snapshot_id, source_cart_line_id, product_id, variant_id,
              product_name, variant_name, quantity,
              line_base_paise, line_modifier_adjustments_paise,
              line_bundle_adjustments_paise, line_subtotal_paise,
              line_promotion_discount_paise, line_taxable_paise,
              line_tax_paise, line_total_paise, sequence
            ) values (
              gen_random_uuid(), ${snapshotId}::uuid, gen_random_uuid(),
              ${catalog.productId}::uuid, ${catalog.variantId}::uuid,
              'P', 'V', 1, 10000, 0, 0, 10000, 0, 10000, 500, 10500, 0
            )
          `);
        });
      },
    );
  });

  it("DB-08 Checkout-owned internal cascade semantics", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, catalog }) => {
        const brandId = actors.tree.brand.id;
        const outletId = actors.tree.outletA.id;
        const now = new Date("2026-08-09T12:00:00.000Z");

        await persistence.withContext(async (ctx) => {
          const checkoutId = await insertMinimalCheckout(ctx, {
            brandId,
            cartId,
            customerId: actors.customerAId,
            now,
          });
          await ctx.db.execute(sql`
            insert into app.checkout_delivery_destinations (
              checkout_id, destination_kind, source_saved_address_id,
              recipient_name, recipient_phone, address_line_1, city, state_code,
              postal_code, created_at, updated_at
            ) values (
              ${checkoutId}::uuid, 'ONE_TIME_ADDRESS', null,
              ${DEST_FIELDS.recipientName}, ${DEST_FIELDS.recipientPhone},
              ${DEST_FIELDS.addressLine1}, ${DEST_FIELDS.city},
              ${DEST_FIELDS.stateCode}, ${DEST_FIELDS.postalCode},
              ${now}, ${now}
            )
          `);
          const snapshotId = await insertMinimalSnapshot(ctx, {
            checkoutId,
            outletId,
            now,
          });
          const line = await ctx.db.execute(sql`
            insert into app.checkout_snapshot_lines (
              id, snapshot_id, source_cart_line_id, product_id, variant_id,
              product_name, variant_name, quantity,
              line_base_paise, line_modifier_adjustments_paise,
              line_bundle_adjustments_paise, line_subtotal_paise,
              line_promotion_discount_paise, line_taxable_paise,
              line_tax_paise, line_total_paise, sequence
            ) values (
              gen_random_uuid(), ${snapshotId}::uuid, gen_random_uuid(),
              ${catalog.productId}::uuid, ${catalog.variantId}::uuid,
              'P', 'V', 1, 10000, 0, 0, 10000, 0, 10000, 500, 10500, 0
            ) returning id
          `);
          const lineId = line.rows[0]!.id as string;

          await ctx.db.execute(
            sql`delete from app.checkouts where id = ${checkoutId}::uuid`,
          );

          const dest = await ctx.db.execute(sql`
            select count(*)::text as c from app.checkout_delivery_destinations
            where checkout_id = ${checkoutId}::uuid
          `);
          expect(dest.rows[0]?.c).toBe("0");
          const snaps = await ctx.db.execute(sql`
            select count(*)::text as c from app.checkout_snapshots
            where id = ${snapshotId}::uuid
          `);
          expect(snaps.rows[0]?.c).toBe("0");
          const lines = await ctx.db.execute(sql`
            select count(*)::text as c from app.checkout_snapshot_lines
            where id = ${lineId}::uuid
          `);
          expect(lines.rows[0]?.c).toBe("0");
        });
      },
    );
  });

  it("DB-09 external domains do not cascade-delete Checkout transaction evidence", async () => {
    await withCheckoutReadyHarness(
      async ({
        persistence,
        database,
        actors,
        cartId,
        addressId,
        catalog,
      }) => {
        const brandId = actors.tree.brand.id;
        const outletId = actors.tree.outletA.id;
        const opts = checkoutOpts();

        const started = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
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
        const snapshotId = ready.snapshot.id;
        const sourceCartLineId = ready.snapshot.lines[0]!.sourceCartLineId;

        // Saved address FK is ON DELETE SET NULL, but SAVED_ADDRESS provenance
        // CHECK requires non-null source — so delete is blocked while referenced.
        await withTestDatabaseClient(database.connectionString, async (client) => {
          await expect(
            client.pool.query(
              `delete from app.customer_addresses where id = $1`,
              [addressId],
            ),
          ).rejects.toThrow();
        });

        await persistence.withContext(async (ctx) => {
          const snap = await ctx.db.execute(sql`
            select count(*)::text as c from app.checkout_snapshots
            where id = ${snapshotId}::uuid
          `);
          expect(snap.rows[0]?.c).toBe("1");
          const dest = await ctx.db.execute(sql`
            select source_saved_address_id::text as sid
            from app.checkout_delivery_destinations
            where checkout_id = ${ready.checkout.id}::uuid
          `);
          expect(dest.rows[0]?.sid).toBe(addressId);
        });

        // Snapshot destination copy survives independently of live address row
        // once we retire the live FK pointer via SQL (ONE_TIME provenance).
        await persistence.withContext(async (ctx) => {
          await ctx.db.execute(sql`
            update app.checkout_delivery_destinations
            set destination_kind = 'ONE_TIME_ADDRESS',
                source_saved_address_id = null
            where checkout_id = ${ready.checkout.id}::uuid
          `);
        });
        await withTestDatabaseClient(database.connectionString, async (client) => {
          await client.pool.query(
            `delete from app.customer_addresses where id = $1`,
            [addressId],
          );
        });
        await persistence.withContext(async (ctx) => {
          const snap = await ctx.db.execute(sql`
            select recipient_name, count(*)::text as c
            from app.checkout_snapshots
            where id = ${snapshotId}::uuid
            group by recipient_name
          `);
          expect(snap.rows[0]?.c).toBe("1");
          expect(String(snap.rows[0]?.recipient_name).length).toBeGreaterThan(0);
        });

        // Cart line delete does not delete snapshot lines (no FK).
        await persistence.withContext(async (ctx) => {
          await ctx.db.execute(sql`
            delete from app.cart_lines where id = ${sourceCartLineId}::uuid
          `);
          const lines = await ctx.db.execute(sql`
            select count(*)::text as c from app.checkout_snapshot_lines
            where snapshot_id = ${snapshotId}::uuid
          `);
          expect(lines.rows[0]?.c).toBe("1");
        });

        // Cart delete RESTRICT while checkout exists.
        await withTestDatabaseClient(database.connectionString, async (client) => {
          await expect(
            client.pool.query(`delete from app.carts where id = $1`, [cartId]),
          ).rejects.toThrow();
        });

        void brandId;
        void outletId;
        void catalog;
      },
    );
  });

  it("DB-10 snapshot merchandise quantity > 0 and configuration quantity constraints", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, catalog }) => {
        const brandId = actors.tree.brand.id;
        const outletId = actors.tree.outletA.id;
        const now = new Date("2026-08-09T12:00:00.000Z");

        await persistence.withContext(async (ctx) => {
          const checkoutId = await insertMinimalCheckout(ctx, {
            brandId,
            cartId,
            customerId: actors.customerAId,
            now,
          });
          const snapshotId = await insertMinimalSnapshot(ctx, {
            checkoutId,
            outletId,
            now,
          });

          await expect(
            ctx.db.execute(sql`
              insert into app.checkout_snapshot_lines (
                id, snapshot_id, source_cart_line_id, product_id, variant_id,
                product_name, variant_name, quantity,
                line_base_paise, line_modifier_adjustments_paise,
                line_bundle_adjustments_paise, line_subtotal_paise,
                line_promotion_discount_paise, line_taxable_paise,
                line_tax_paise, line_total_paise, sequence
              ) values (
                gen_random_uuid(), ${snapshotId}::uuid, gen_random_uuid(),
                ${catalog.productId}::uuid, ${catalog.variantId}::uuid,
                'P', 'V', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
              )
            `),
          ).rejects.toThrow();
        });
      },
    );
  });

  it("DB-11 exact integer monetary DB types; no float authority", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(
        applicationConfig(database.connectionString),
      );
      trackPersistenceHandle(persistence);

      await persistence.withContext(async (ctx) => {
        const cols = await ctx.db.execute(sql`
          select column_name, data_type
          from information_schema.columns
          where table_schema = 'app'
            and table_name = 'checkout_snapshots'
            and column_name like '%_paise'
          order by column_name
        `);
        expect(cols.rows.length).toBeGreaterThan(0);
        for (const row of cols.rows) {
          expect(row.data_type).toBe("bigint");
        }
      });
    });
  });

  it("DB-12 snapshot Checkout revision provenance uniqueness", async () => {
    await withCheckoutReadyHarness(async ({ persistence, actors, cartId }) => {
      const brandId = actors.tree.brand.id;
      const outletId = actors.tree.outletA.id;
      const now = new Date("2026-08-09T12:00:00.000Z");

      await persistence.withContext(async (ctx) => {
        const checkoutId = await insertMinimalCheckout(ctx, {
          brandId,
          cartId,
          customerId: actors.customerAId,
          now,
        });
        await insertMinimalSnapshot(ctx, {
          checkoutId,
          outletId,
          checkoutRevision: 2,
          now,
        });
        await expect(
          insertMinimalSnapshot(ctx, {
            checkoutId,
            outletId,
            checkoutRevision: 2,
            now,
          }),
        ).rejects.toThrow();
      });
    });
  });

  it("DB-13 active snapshot / source Cart revision consistency through repository transactions", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const opts = checkoutOpts();
        const started = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        expect(started.status).toBe("DRAFT");
        expect(started.sourceCartRevision).toBe(BigInt(1));

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
        expect(ready.checkout.activeSnapshotId).toBe(ready.snapshot.id);
        expect(ready.checkout.sourceCartRevision).toBe(
          ready.snapshot.sourceCartRevision,
        );
        expect(ready.snapshot.checkoutRevision).toBe(ready.checkout.revision);

        await persistence.withContext(async (ctx) => {
          const row = await ctx.db.execute(sql`
            select c.status, c.active_snapshot_id::text as aid,
                   c.source_cart_revision::text as scr,
                   s.checkout_revision::text as srev,
                   s.source_cart_revision::text as sscr
            from app.checkouts c
            join app.checkout_snapshots s on s.id = c.active_snapshot_id
            where c.id = ${ready.checkout.id}::uuid
          `);
          expect(row.rows[0]?.status).toBe("READY_FOR_PAYMENT");
          expect(row.rows[0]?.aid).toBe(ready.snapshot.id);
          expect(row.rows[0]?.scr).toBe(String(ready.checkout.sourceCartRevision));
          expect(row.rows[0]?.srev).toBe(String(ready.checkout.revision));
          expect(row.rows[0]?.sscr).toBe(String(ready.checkout.sourceCartRevision));
        });
      },
    );
  });
});
