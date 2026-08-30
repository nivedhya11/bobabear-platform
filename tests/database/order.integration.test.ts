/**
 * Order PostgreSQL integration tests (IMP-023) — DB-OR01..DB-OR25.
 */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import {
  closeTrackedPersistenceHandles,
  countOrdersForCheckout,
  deleteOrderRow,
  getOrderRow,
  validOrderNumber,
  withCompletedPositiveOrderHarness,
  withPaymentReadyHarness,
} from "./support/order-fixtures";
import { withTestDatabaseClient } from "./support/test-database";

function sha256File(rel: string): string {
  return createHash("sha256")
    .update(readFileSync(path.join(process.cwd(), rel), "utf8"))
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
  "drizzle/0015_checkout.sql",
  "drizzle/0016_payment.sql",
] as const;

type DbCtx = {
  db: {
    execute: (
      q: ReturnType<typeof sql>,
    ) => Promise<{ rows: Array<Record<string, unknown>> }>;
  };
};

async function insertOrderRaw(
  ctx: DbCtx,
  args: {
    id?: string;
    orderNumber?: string;
    checkoutId: string;
    snapshotId: string;
    paymentProvenanceKind?: string;
    paymentId?: string | null;
    status?: string;
    revision?: number | bigint;
    createdAt?: Date;
    updatedAt?: Date;
    acceptedAt?: Date | null;
    acceptedBy?: string | null;
    fulfilledAt?: Date | null;
    fulfilledBy?: string | null;
    cancelledAt?: Date | null;
    cancelledBy?: string | null;
    cancellationReason?: string | null;
  },
): Promise<string> {
  const id = args.id ?? randomUUID();
  const now = args.createdAt ?? new Date("2026-08-10T12:00:00.000Z");
  const updatedAt = args.updatedAt ?? now;
  await ctx.db.execute(sql`
    insert into app.orders (
      id, order_number, checkout_id, checkout_snapshot_id,
      payment_provenance_kind, payment_id, status, revision,
      created_at, updated_at,
      accepted_at, accepted_by_workforce_user_id,
      fulfilled_at, fulfilled_by_workforce_user_id,
      cancelled_at, cancelled_by_workforce_user_id,
      cancellation_reason_code
    ) values (
      ${id}::uuid,
      ${args.orderNumber ?? validOrderNumber(randomUUID().replace(/-/g, "").slice(0, 12))},
      ${args.checkoutId}::uuid,
      ${args.snapshotId}::uuid,
      ${args.paymentProvenanceKind ?? "PAYMENT"},
      ${args.paymentId === undefined ? null : args.paymentId}::uuid,
      ${args.status ?? "PLACED"},
      ${args.revision ?? 1},
      ${now},
      ${updatedAt},
      ${args.acceptedAt ?? null},
      ${args.acceptedBy ?? null},
      ${args.fulfilledAt ?? null},
      ${args.fulfilledBy ?? null},
      ${args.cancelledAt ?? null},
      ${args.cancelledBy ?? null},
      ${args.cancellationReason ?? null}
    )
  `);
  return id;
}

describe("IMP-023 order migration inventory", () => {
  it("creates app.orders; 57 permissions / 4 order.* keys; prior migrations sealed", async () => {
    const integrity = JSON.parse(
      readFileSync(
        path.join(process.cwd(), "drizzle/migration-integrity.json"),
        "utf8",
      ),
    ) as { migrations: Array<{ path: string; sha256: string }> };

    for (const rel of PRIOR_MIGRATIONS) {
      const entry = integrity.migrations.find((m) => m.path === rel);
      expect(entry).toBeDefined();
      expect(entry!.sha256).toBe(sha256File(rel));
    }

    const orderSql = readFileSync(
      path.join(process.cwd(), "drizzle/0017_order.sql"),
      "utf8",
    );
    expect(orderSql).toContain(`"app"."orders"`);
    expect(orderSql).toContain("order.read");
    expect(orderSql).toContain("order.accept");
    expect(orderSql).toContain("order.fulfil");
    expect(orderSql).toContain("order.cancel");

    const sealed = integrity.migrations.find(
      (m) => m.path === "drizzle/0017_order.sql",
    );
    if (sealed) {
      expect(sealed.sha256).toBe(sha256File("drizzle/0017_order.sql"));
      expect(integrity.migrations).toHaveLength(32);
    }

    await withPaymentReadyHarness(async ({ persistence }) => {
      await persistence.withContext(async (ctx) => {
        const tables = await ctx.db.execute(sql`
          select count(*)::text as count
          from information_schema.tables
          where table_schema = 'app' and table_name = 'orders'
        `);
        expect(tables.rows[0]?.count).toBe("1");

        const appTables = await ctx.db.execute(sql`
          select count(*)::text as count
          from information_schema.tables
          where table_schema = 'app' and table_type = 'BASE TABLE'
        `);
        expect(appTables.rows[0]?.count).toBe("115");

        const perms = await ctx.db.execute(sql`
          select count(*)::text as count from app.access_permissions
        `);
        expect(perms.rows[0]?.count).toBe("57");

        const orderKeys = await ctx.db.execute(sql`
          select key from app.access_permissions
          where key like 'order.%'
          order by key
        `);
        expect(orderKeys.rows.map((r) => r.key)).toEqual([
          "order.accept",
          "order.cancel",
          "order.fulfil",
          "order.read",
        ]);
      });
    });
  });
});

describe("IMP-023 order constraints DB-OR01..DB-OR25", () => {
  it("DB-OR01 invalid Order status", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await deleteOrderRow(h.persistence, h.order.id, h.connectionString);
      await expect(
        h.persistence.withContext((ctx) =>
          insertOrderRaw(ctx, {
            checkoutId: h.checkoutId,
            snapshotId: h.snapshotId,
            paymentId: h.paymentId,
            status: "SHIPPED",
          }),
        ),
      ).rejects.toThrow();
    });
  });

  it("DB-OR02 revision = 0", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await deleteOrderRow(h.persistence, h.order.id, h.connectionString);
      await expect(
        h.persistence.withContext((ctx) =>
          insertOrderRaw(ctx, {
            checkoutId: h.checkoutId,
            snapshotId: h.snapshotId,
            paymentId: h.paymentId,
            revision: 0,
          }),
        ),
      ).rejects.toThrow();
    });
  });

  it("DB-OR03 revision < 0", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await deleteOrderRow(h.persistence, h.order.id, h.connectionString);
      await expect(
        h.persistence.withContext((ctx) =>
          insertOrderRaw(ctx, {
            checkoutId: h.checkoutId,
            snapshotId: h.snapshotId,
            paymentId: h.paymentId,
            revision: -1,
          }),
        ),
      ).rejects.toThrow();
    });
  });

  it("DB-OR04 malformed Order number", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await deleteOrderRow(h.persistence, h.order.id, h.connectionString);
      await expect(
        h.persistence.withContext((ctx) =>
          insertOrderRaw(ctx, {
            checkoutId: h.checkoutId,
            snapshotId: h.snapshotId,
            paymentId: h.paymentId,
            orderNumber: "ORD-ILOVEYOUUUUU", // I,L,O,U forbidden
          }),
        ),
      ).rejects.toThrow();
    });
  });

  it("DB-OR05 duplicate Order number", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const number = h.order.orderNumber;
      await expect(
        h.persistence.withContext((ctx) =>
          insertOrderRaw(ctx, {
            checkoutId: h.checkoutId,
            snapshotId: h.snapshotId,
            paymentId: h.paymentId,
            orderNumber: number,
          }),
        ),
      ).rejects.toThrow();

      // After removing the row, re-insert then prove order_number uniqueness
      // still conflicts when the same number is reused on the same source.
      await deleteOrderRow(h.persistence, h.order.id, h.connectionString);
      await h.persistence.withContext((ctx) =>
        insertOrderRaw(ctx, {
          checkoutId: h.checkoutId,
          snapshotId: h.snapshotId,
          paymentId: h.paymentId,
          orderNumber: number,
        }),
      );
      await expect(
        h.persistence.withContext((ctx) =>
          insertOrderRaw(ctx, {
            checkoutId: h.checkoutId,
            snapshotId: h.snapshotId,
            paymentId: h.paymentId,
            orderNumber: number,
          }),
        ),
      ).rejects.toThrow();
    });
  });

  it("DB-OR06 duplicate Order for same Checkout", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await expect(
        h.persistence.withContext((ctx) =>
          insertOrderRaw(ctx, {
            checkoutId: h.checkoutId,
            snapshotId: h.snapshotId,
            paymentId: h.paymentId,
            orderNumber: validOrderNumber("ZZZZZZZZZZZ1"),
          }),
        ),
      ).rejects.toThrow();
      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(1);
    });
  });

  it("DB-OR07 duplicate Order for same Checkout snapshot", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await expect(
        h.persistence.withContext((ctx) =>
          insertOrderRaw(ctx, {
            checkoutId: h.checkoutId,
            snapshotId: h.snapshotId,
            paymentId: h.paymentId,
            orderNumber: validOrderNumber("ZZZZZZZZZZZ2"),
          }),
        ),
      ).rejects.toThrow();
    });
  });

  it("DB-OR08 same positive Payment financing two Orders", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await expect(
        h.persistence.withContext((ctx) =>
          insertOrderRaw(ctx, {
            checkoutId: h.checkoutId,
            snapshotId: h.snapshotId,
            paymentId: h.paymentId,
            orderNumber: validOrderNumber("ZZZZZZZZZZZ3"),
          }),
        ),
      ).rejects.toThrow();
    });
  });

  it("DB-OR09 Checkout/snapshot ownership mismatch", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await deleteOrderRow(h.persistence, h.order.id, h.connectionString);
      await expect(
        h.persistence.withContext((ctx) =>
          insertOrderRaw(ctx, {
            checkoutId: h.checkoutId,
            snapshotId: randomUUID(),
            paymentId: h.paymentId,
          }),
        ),
      ).rejects.toThrow();
    });
  });

  it("DB-OR10 Payment/snapshot ownership mismatch", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await deleteOrderRow(h.persistence, h.order.id, h.connectionString);
      await expect(
        h.persistence.withContext((ctx) =>
          insertOrderRaw(ctx, {
            checkoutId: h.checkoutId,
            snapshotId: h.snapshotId,
            paymentId: randomUUID(),
          }),
        ),
      ).rejects.toThrow();
    });
  });

  it("DB-OR11 invalid payment_provenance_kind", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await deleteOrderRow(h.persistence, h.order.id, h.connectionString);
      await expect(
        h.persistence.withContext((ctx) =>
          insertOrderRaw(ctx, {
            checkoutId: h.checkoutId,
            snapshotId: h.snapshotId,
            paymentId: h.paymentId,
            paymentProvenanceKind: "CASH",
          }),
        ),
      ).rejects.toThrow();
    });
  });

  it("DB-OR12 PAYMENT + NULL payment_id", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await deleteOrderRow(h.persistence, h.order.id, h.connectionString);
      await expect(
        h.persistence.withContext((ctx) =>
          insertOrderRaw(ctx, {
            checkoutId: h.checkoutId,
            snapshotId: h.snapshotId,
            paymentProvenanceKind: "PAYMENT",
            paymentId: null,
          }),
        ),
      ).rejects.toThrow();
    });
  });

  it("DB-OR13 NO_PAYMENT_REQUIRED + non-NULL payment_id", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await deleteOrderRow(h.persistence, h.order.id, h.connectionString);
      await expect(
        h.persistence.withContext((ctx) =>
          insertOrderRaw(ctx, {
            checkoutId: h.checkoutId,
            snapshotId: h.snapshotId,
            paymentProvenanceKind: "NO_PAYMENT_REQUIRED",
            paymentId: h.paymentId,
          }),
        ),
      ).rejects.toThrow();
    });
  });

  it("DB-OR14 accepted_at without accepted actor", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const now = new Date("2026-08-10T13:00:00.000Z");
      await expect(
        h.persistence.withContext((ctx) =>
          ctx.db.execute(sql`
            update app.orders
            set status = 'ACCEPTED',
                revision = 2,
                updated_at = ${now},
                accepted_at = ${now},
                accepted_by_workforce_user_id = null
            where id = ${h.order.id}::uuid
          `),
        ),
      ).rejects.toThrow();
    });
  });

  it("DB-OR15 accepted actor without accepted_at", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await expect(
        h.persistence.withContext((ctx) =>
          ctx.db.execute(sql`
            update app.orders
            set status = 'ACCEPTED',
                revision = 2,
                updated_at = now(),
                accepted_at = null,
                accepted_by_workforce_user_id = ${h.workforce.outletManagerUser.id}
            where id = ${h.order.id}::uuid
          `),
        ),
      ).rejects.toThrow();
    });
  });

  it("DB-OR16 fulfilled_at without fulfilled actor", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const t0 = new Date("2026-08-10T13:00:00.000Z");
      const t1 = new Date("2026-08-10T14:00:00.000Z");
      await expect(
        h.persistence.withContext((ctx) =>
          ctx.db.execute(sql`
            update app.orders
            set status = 'FULFILLED',
                revision = 3,
                updated_at = ${t1},
                accepted_at = ${t0},
                accepted_by_workforce_user_id = ${h.workforce.outletManagerUser.id},
                fulfilled_at = ${t1},
                fulfilled_by_workforce_user_id = null
            where id = ${h.order.id}::uuid
          `),
        ),
      ).rejects.toThrow();
    });
  });

  it("DB-OR17 partial cancellation provenance", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const t0 = new Date("2026-08-10T13:00:00.000Z");
      await expect(
        h.persistence.withContext((ctx) =>
          ctx.db.execute(sql`
            update app.orders
            set status = 'CANCELLED',
                revision = 2,
                updated_at = ${t0},
                cancelled_at = ${t0},
                cancelled_by_workforce_user_id = ${h.workforce.supportUser.id},
                cancellation_reason_code = null
            where id = ${h.order.id}::uuid
          `),
        ),
      ).rejects.toThrow();
    });
  });

  it("DB-OR18 invalid cancellation reason", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const t0 = new Date("2026-08-10T13:00:00.000Z");
      await expect(
        h.persistence.withContext((ctx) =>
          ctx.db.execute(sql`
            update app.orders
            set status = 'CANCELLED',
                revision = 2,
                updated_at = ${t0},
                cancelled_at = ${t0},
                cancelled_by_workforce_user_id = ${h.workforce.supportUser.id},
                cancellation_reason_code = 'CUSTOMER_CHANGED_MIND'
            where id = ${h.order.id}::uuid
          `),
        ),
      ).rejects.toThrow();
    });
  });

  it("DB-OR19 PLACED with acceptance provenance", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const t0 = new Date("2026-08-10T13:00:00.000Z");
      await expect(
        h.persistence.withContext((ctx) =>
          ctx.db.execute(sql`
            update app.orders
            set accepted_at = ${t0},
                accepted_by_workforce_user_id = ${h.workforce.outletManagerUser.id},
                updated_at = ${t0}
            where id = ${h.order.id}::uuid
          `),
        ),
      ).rejects.toThrow();
    });
  });

  it("DB-OR20 ACCEPTED without acceptance provenance", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await expect(
        h.persistence.withContext((ctx) =>
          ctx.db.execute(sql`
            update app.orders
            set status = 'ACCEPTED',
                revision = 2,
                updated_at = now()
            where id = ${h.order.id}::uuid
          `),
        ),
      ).rejects.toThrow();
    });
  });

  it("DB-OR21 FULFILLED without prior acceptance", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const t0 = new Date("2026-08-10T13:00:00.000Z");
      await expect(
        h.persistence.withContext((ctx) =>
          ctx.db.execute(sql`
            update app.orders
            set status = 'FULFILLED',
                revision = 2,
                updated_at = ${t0},
                fulfilled_at = ${t0},
                fulfilled_by_workforce_user_id = ${h.workforce.kitchenUser.id}
            where id = ${h.order.id}::uuid
          `),
        ),
      ).rejects.toThrow();
    });
  });

  it("DB-OR22 FULFILLED with cancellation provenance", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const t0 = new Date("2026-08-10T13:00:00.000Z");
      const t1 = new Date("2026-08-10T14:00:00.000Z");
      await expect(
        h.persistence.withContext((ctx) =>
          ctx.db.execute(sql`
            update app.orders
            set status = 'FULFILLED',
                revision = 3,
                updated_at = ${t1},
                accepted_at = ${t0},
                accepted_by_workforce_user_id = ${h.workforce.outletManagerUser.id},
                fulfilled_at = ${t1},
                fulfilled_by_workforce_user_id = ${h.workforce.kitchenUser.id},
                cancelled_at = ${t1},
                cancelled_by_workforce_user_id = ${h.workforce.supportUser.id},
                cancellation_reason_code = 'BUSINESS_DECISION'
            where id = ${h.order.id}::uuid
          `),
        ),
      ).rejects.toThrow();
    });
  });

  it("DB-OR23 CANCELLED with fulfilment provenance", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const t0 = new Date("2026-08-10T13:00:00.000Z");
      const t1 = new Date("2026-08-10T14:00:00.000Z");
      await expect(
        h.persistence.withContext((ctx) =>
          ctx.db.execute(sql`
            update app.orders
            set status = 'CANCELLED',
                revision = 3,
                updated_at = ${t1},
                accepted_at = ${t0},
                accepted_by_workforce_user_id = ${h.workforce.outletManagerUser.id},
                fulfilled_at = ${t1},
                fulfilled_by_workforce_user_id = ${h.workforce.kitchenUser.id},
                cancelled_at = ${t1},
                cancelled_by_workforce_user_id = ${h.workforce.supportUser.id},
                cancellation_reason_code = 'BUSINESS_DECISION'
            where id = ${h.order.id}::uuid
          `),
        ),
      ).rejects.toThrow();
    });
  });

  it("DB-OR24 impossible timestamp ordering", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const created = new Date("2026-08-10T12:00:00.000Z");
      const earlier = new Date("2026-08-10T11:00:00.000Z");
      await expect(
        h.persistence.withContext((ctx) =>
          ctx.db.execute(sql`
            update app.orders
            set status = 'ACCEPTED',
                revision = 2,
                created_at = ${created},
                updated_at = ${created},
                accepted_at = ${earlier},
                accepted_by_workforce_user_id = ${h.workforce.outletManagerUser.id}
            where id = ${h.order.id}::uuid
          `),
        ),
      ).rejects.toThrow();
    });
  });

  it("DB-OR25 orphan Checkout/snapshot/Payment/workforce provenance", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await expect(
        h.persistence.withContext((ctx) =>
          insertOrderRaw(ctx, {
            checkoutId: randomUUID(),
            snapshotId: randomUUID(),
            paymentId: randomUUID(),
            orderNumber: validOrderNumber("ORPHAN000001"),
          }),
        ),
      ).rejects.toThrow();

      const t0 = new Date("2026-08-10T13:00:00.000Z");
      await expect(
        h.persistence.withContext((ctx) =>
          ctx.db.execute(sql`
            update app.orders
            set status = 'ACCEPTED',
                revision = 2,
                updated_at = ${t0},
                accepted_at = ${t0},
                accepted_by_workforce_user_id = ${randomUUID()}
            where id = ${h.order.id}::uuid
          `),
        ),
      ).rejects.toThrow();
    });
  });

  it("source deletion cannot cascade-delete historical Orders (RESTRICT)", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await expect(
        withTestDatabaseClient(h.connectionString, async (client) => {
          await client.pool.query(`delete from app.checkouts where id = $1`, [
            h.checkoutId,
          ]);
        }),
      ).rejects.toThrow();

      await expect(
        withTestDatabaseClient(h.connectionString, async (client) => {
          await client.pool.query(
            `delete from app.checkout_snapshots where id = $1`,
            [h.snapshotId],
          );
        }),
      ).rejects.toThrow();

      await expect(
        withTestDatabaseClient(h.connectionString, async (client) => {
          await client.pool.query(`delete from app.payments where id = $1`, [
            h.paymentId,
          ]);
        }),
      ).rejects.toThrow();

      // Accept first so workforce FK is live, then attempt user delete.
      // accepted_at must be >= created_at (wall-clock from payment hook).
      const t0 = new Date(new Date(h.order.createdAt).getTime() + 60_000);
      await h.persistence.withContext((ctx) =>
        ctx.db.execute(sql`
          update app.orders
          set status = 'ACCEPTED',
              revision = 2,
              updated_at = ${t0},
              accepted_at = ${t0},
              accepted_by_workforce_user_id = ${h.workforce.outletManagerUser.id}
          where id = ${h.order.id}::uuid
        `),
      );
      await expect(
        withTestDatabaseClient(h.connectionString, async (client) => {
          await client.pool.query(
            `delete from app.workforce_auth_users where id = $1`,
            [h.workforce.outletManagerUser.id],
          );
        }),
      ).rejects.toThrow();

      const stillThere = await getOrderRow(h.persistence, h.order.id);
      expect(stillThere).not.toBeNull();
      expect(stillThere!.status).toBe("ACCEPTED");
    });
  });
});
