/**
 * IMP-027 Refund PostgreSQL schema / reservation / uniqueness (RF-05, RF-24).
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { requestRefund } from "../../src/server/refund";
import { RefundError } from "../../src/shared/refund";
import { closeTrackedPersistenceHandles } from "./support/cart-fixtures";
import { withRefundReadyHarness } from "./support/refund-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

describe("IMP-027 refund schema", () => {
  it("RF-24 creates refund tables, constraints, and permission keys", async () => {
    await withRefundReadyHarness(async (h) => {
      await h.persistence.withContext(async (ctx) => {
        const tables = await ctx.db.execute(sql`
          select table_name
          from information_schema.tables
          where table_schema = 'app'
            and table_name in ('refunds', 'refund_provider_references', 'refund_provider_observations')
          order by table_name
        `);
        expect(tables.rows.map((row) => row.table_name)).toEqual([
          "refund_provider_observations",
          "refund_provider_references",
          "refunds",
        ]);

        const perms = await ctx.db.execute(sql`
          select key from app.access_permissions
          where key in ('payment.refund', 'payment.refund.read')
          order by key
        `);
        expect(perms.rows.map((row) => row.key)).toEqual([
          "payment.refund",
          "payment.refund.read",
        ]);

        await expect(
          ctx.db.execute(sql`
            insert into app.refunds (
              id, payment_id, amount_paise, currency, status, provider,
              provider_idempotency_key, reason, initiated_by_actor_kind,
              initiated_by_actor_id, authorized_permission, created_at, updated_at, accepted_at
            ) values (
              gen_random_uuid(), ${h.paymentId}::uuid, 0, 'INR', 'ACCEPTED', 'fake',
              'boba_rfnd_zero', 'reason', 'workforce',
              ${h.workforce.supportUser.id}, 'payment.refund', now(), now(), now()
            )
          `),
        ).rejects.toThrow();
      });
    });

    const sqlText = readFileSync(
      path.join(process.cwd(), "drizzle/0019_refund.sql"),
      "utf8",
    );
    expect(sqlText).toContain('"app"."refunds"');
    expect(sqlText).toContain("refunds_provider_idempotency_key_uidx");
    expect(sqlText).toContain("refund_provider_references_provider_kind_value_uidx");
    expect(sqlText).toContain("payment.refund");
  });
});

describe("IMP-027 refund reservation", () => {
  it("RF-04 rejects over-refund and RF-18 rejects fully refunded Payment", async () => {
    await withRefundReadyHarness(async (h) => {
      const captured = h.grandTotalPaise;
      await expect(
        requestRefund(
          h.persistence,
          h.workforce.support,
          {
            paymentId: h.paymentId,
            amountPaise: captured + BigInt(1),
            reason: "over refund",
          },
          { provider: h.provider },
        ),
      ).rejects.toMatchObject({ code: "REFUND_AMOUNT_EXCEEDS_REMAINING" });

      await requestRefund(
        h.persistence,
        h.workforce.support,
        {
          paymentId: h.paymentId,
          amountPaise: captured,
          reason: "full refund",
        },
        { provider: h.provider },
      );

      await expect(
        requestRefund(
          h.persistence,
          h.workforce.support,
          {
            paymentId: h.paymentId,
            amountPaise: BigInt(1),
            reason: "after full",
          },
          { provider: h.provider },
        ),
      ).rejects.toBeInstanceOf(RefundError);
    });
  });
});
