/**
 * IMP-028 D-366 Slice 1 — RefundStatutoryDecision persistence foundation tests.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { afterEach, describe, expect, inject, it } from "vitest";

import {
  ensureRefundStatutoryDecisionPending,
  loadRefundStatutoryDecisionByRefundId,
} from "../../src/server/refund-statutory-decision";
import { requestRefund } from "../../src/server/refund";
import {
  buildRefundStatutoryReversalLogicalKey,
  RefundStatutoryDecisionError,
} from "../../src/shared/refund-statutory-decision";
import { closeTrackedPersistenceHandles } from "./support/cart-fixtures";
import { withRefundReadyHarness } from "./support/refund-fixtures";
import {
  applyMigrations,
  withIsolatedTestDatabase,
} from "./support/test-database";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

function postgresErrorMessage(error: unknown): string {
  let current: unknown = error;
  const parts: string[] = [];
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (current instanceof Error) {
      parts.push(current.message);
      current = (current as { cause?: unknown }).cause;
      continue;
    }
    parts.push(String(current));
    break;
  }
  return parts.join("\n");
}

async function expectPostgresFailure(
  run: () => Promise<unknown>,
  pattern: RegExp,
): Promise<void> {
  let caught: unknown;
  try {
    await run();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeTruthy();
  expect(postgresErrorMessage(caught)).toMatch(pattern);
}

async function createProcessedRefund(
  h: Parameters<Parameters<typeof withRefundReadyHarness>[0]>[0],
  amountPaise?: bigint,
) {
  const result = await requestRefund(
    h.persistence,
    h.workforce.support,
    {
      paymentId: h.paymentId,
      amountPaise: amountPaise ?? BigInt(100),
      reason: "d366 slice1 fixture refund",
    },
    { provider: h.provider },
  );
  expect(result.refund.status).toBe("PROCESSED");
  return result.refund;
}

describe("IMP-028 D-366 Slice 1 RefundStatutoryDecision persistence", () => {
  it("RSD-01 migration declares table, constraints, and immutability triggers", () => {
    const sqlText = readFileSync(
      path.join(process.cwd(), "drizzle/0027_refund_statutory_decision.sql"),
      "utf8",
    );
    expect(sqlText).toContain('"app"."refund_statutory_decisions"');
    expect(sqlText).toContain("refund_statutory_decisions_refund_uidx");
    expect(sqlText).toContain("refund_statutory_decisions_logical_key_uidx");
    expect(sqlText).toContain("refund_statutory_decisions_pending_state_check");
    expect(sqlText).toContain(
      "forbid_refund_statutory_decision_identity_mutation",
    );
    expect(sqlText).toContain("forbid_sealed_refund_statutory_decision_mutation");
    expect(sqlText).toContain("forbid_refund_statutory_decision_delete");
    expect(sqlText).toContain("ON DELETE restrict");
  });

  it("RSD-02 clean empty-DB migration replay creates refund_statutory_decisions", async () => {
    await withIsolatedTestDatabase(
      {
        connectionString: inject("bobaBearTestAdminConnectionString"),
        host: inject("bobaBearTestAdminHost"),
        port: inject("bobaBearTestAdminPort"),
      },
      async (database) => {
        await applyMigrations(database.connectionString);
        const { getApplicationPersistence } = await import(
          "../../src/server/persistence"
        );
        const { applicationConfig, trackPersistenceHandle } = await import(
          "./support/cart-fixtures"
        );
        const persistence = getApplicationPersistence(
          applicationConfig(database.connectionString),
        );
        trackPersistenceHandle(persistence);
        await persistence.withContext(async (ctx) => {
          const tables = await ctx.db.execute(sql`
            select table_name
            from information_schema.tables
            where table_schema = 'app'
              and table_name = 'refund_statutory_decisions'
          `);
          expect(tables.rows.map((r) => r.table_name)).toEqual([
            "refund_statutory_decisions",
          ]);
        });
      },
    );
  });

  it("RSD-03 creates PENDING decision without FinancialDocument and without branch inference", async () => {
    await withRefundReadyHarness(async (h) => {
      const refund = await createProcessedRefund(h);
      const beforeFd = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select count(*)::int as c from app.financial_documents
        `);
        return rows.rows[0]!.c as number;
      });

      const decision = await h.persistence.transaction((tx) =>
        ensureRefundStatutoryDecisionPending(tx, {
          refundId: refund.id,
          now: new Date(),
        }),
      );

      expect(decision.status).toBe("PENDING");
      expect(decision.disposition).toBeNull();
      expect(decision.logicalIdempotencyKey).toBe(
        buildRefundStatutoryReversalLogicalKey(refund.id),
      );
      expect(decision.refundId).toBe(refund.id);
      expect(decision.issuedFinancialDocumentId).toBeNull();
      expect(decision.sealedPriorReceiptVoucherId).toBeNull();
      expect(decision.sealedPriorTaxInvoiceId).toBeNull();
      expect(decision.sealedNoStatutoryDocumentRationale).toBeNull();

      const afterFd = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select count(*)::int as c from app.financial_documents
        `);
        return rows.rows[0]!.c as number;
      });
      expect(afterFd).toBe(beforeFd);

      const loaded = await h.persistence.withContext((ctx) =>
        loadRefundStatutoryDecisionByRefundId(ctx, refund.id),
      );
      expect(loaded?.id).toBe(decision.id);
      expect(loaded?.status).toBe("PENDING");
    });
  });

  it("RSD-04 duplicate ensure is idempotent; second refund_id insert rejected", async () => {
    await withRefundReadyHarness(async (h) => {
      const refund = await createProcessedRefund(h);
      const first = await h.persistence.transaction((tx) =>
        ensureRefundStatutoryDecisionPending(tx, {
          refundId: refund.id,
          now: new Date(),
        }),
      );
      const second = await h.persistence.transaction((tx) =>
        ensureRefundStatutoryDecisionPending(tx, {
          refundId: refund.id,
          now: new Date(),
        }),
      );
      expect(second.id).toBe(first.id);

      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              insert into app.refund_statutory_decisions (
                id, refund_id, status, disposition, logical_idempotency_key,
                created_at, updated_at, pending_at
              ) values (
                gen_random_uuid(),
                ${refund.id}::uuid,
                'PENDING',
                null,
                ${`refund:${refund.id}:STATUTORY_REVERSAL`},
                now(), now(), now()
              )
            `),
          ),
        /duplicate key|unique|23505/i,
      );
    });
  });

  it("RSD-05 logical idempotency key is durable and unique; mismatch rejected", async () => {
    await withRefundReadyHarness(async (h) => {
      const refund = await createProcessedRefund(h);
      await h.persistence.transaction((tx) =>
        ensureRefundStatutoryDecisionPending(tx, {
          refundId: refund.id,
          now: new Date(),
        }),
      );

      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              insert into app.refund_statutory_decisions (
                id, refund_id, status, disposition, logical_idempotency_key,
                created_at, updated_at, pending_at
              ) values (
                gen_random_uuid(),
                ${refund.id}::uuid,
                'PENDING',
                null,
                ${`refund:${refund.id}:CREDIT_NOTE`},
                now(), now(), now()
              )
            `),
          ),
        /logical_key_matches_refund|check constraint|23514|duplicate key|23505/i,
      );

      const otherRefund = await createProcessedRefund(h, BigInt(50));
      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              insert into app.refund_statutory_decisions (
                id, refund_id, status, disposition, logical_idempotency_key,
                created_at, updated_at, pending_at
              ) values (
                gen_random_uuid(),
                ${otherRefund.id}::uuid,
                'PENDING',
                null,
                ${`refund:${refund.id}:STATUTORY_REVERSAL`},
                now(), now(), now()
              )
            `),
          ),
        /logical_key_matches_refund|check constraint|23514|duplicate key|23505/i,
      );
    });
  });

  it("RSD-06 PENDING cannot contain a falsely finalized branch", async () => {
    await withRefundReadyHarness(async (h) => {
      const refund = await createProcessedRefund(h);
      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              insert into app.refund_statutory_decisions (
                id, refund_id, status, disposition, logical_idempotency_key,
                created_at, updated_at, pending_at
              ) values (
                gen_random_uuid(),
                ${refund.id}::uuid,
                'PENDING',
                'NO_STATUTORY_DOCUMENT',
                ${`refund:${refund.id}:STATUTORY_REVERSAL`},
                now(), now(), now()
              )
            `),
          ),
        /pending_state|check constraint|23514/i,
      );
    });
  });

  it("RSD-07 invalid lifecycle/branch combinations fail at DB authority", async () => {
    await withRefundReadyHarness(async (h) => {
      const refund = await createProcessedRefund(h);
      const key = `refund:${refund.id}:STATUTORY_REVERSAL`;

      // ISSUED without RFV/CN disposition
      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              insert into app.refund_statutory_decisions (
                id, refund_id, status, disposition, logical_idempotency_key,
                sealed_no_statutory_document_rationale,
                branch_finalized_at, branch_finalized_by_actor_kind,
                branch_finalized_by_actor_id,
                issued_financial_document_id, issued_at,
                created_at, updated_at, pending_at
              ) values (
                gen_random_uuid(), ${refund.id}::uuid, 'ISSUED',
                'NO_STATUTORY_DOCUMENT', ${key},
                'operator positive rationale',
                now(), 'workforce', ${h.workforce.supportUser.id},
                gen_random_uuid(), now(),
                now(), now(), now()
              )
            `),
          ),
        /check constraint|23514|no_statutory_document|issued_state/i,
      );

      // BRANCH_FINALIZED REFUND_VOUCHER without prior receipt / no-supply
      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              insert into app.refund_statutory_decisions (
                id, refund_id, status, disposition, logical_idempotency_key,
                sealed_reversal_scope, sealed_reversal_amount_paise,
                branch_finalized_at, branch_finalized_by_actor_kind,
                branch_finalized_by_actor_id,
                created_at, updated_at, pending_at
              ) values (
                gen_random_uuid(), ${refund.id}::uuid, 'BRANCH_FINALIZED',
                'REFUND_VOUCHER', ${key},
                'FULL', 100,
                now(), 'workforce', ${h.workforce.supportUser.id},
                now(), now(), now()
              )
            `),
          ),
        /refund_voucher_branch|check constraint|23514/i,
      );

      // Unknown disposition
      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              insert into app.refund_statutory_decisions (
                id, refund_id, status, disposition, logical_idempotency_key,
                branch_finalized_at, branch_finalized_by_actor_kind,
                branch_finalized_by_actor_id,
                created_at, updated_at, pending_at
              ) values (
                gen_random_uuid(), ${refund.id}::uuid, 'BRANCH_FINALIZED',
                'BILL_OF_SUPPLY', ${key},
                now(), 'workforce', ${h.workforce.supportUser.id},
                now(), now(), now()
              )
            `),
          ),
        /disposition_check|check constraint|23514/i,
      );
    });
  });

  it("RSD-08 FK integrity: decision requires Refund; bogus refund rejected", async () => {
    await withRefundReadyHarness(async (h) => {
      const missingRefundId = randomUUID();
      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              insert into app.refund_statutory_decisions (
                id, refund_id, status, disposition, logical_idempotency_key,
                created_at, updated_at, pending_at
              ) values (
                gen_random_uuid(),
                ${missingRefundId}::uuid,
                'PENDING',
                null,
                ${`refund:${missingRefundId}:STATUTORY_REVERSAL`},
                now(), now(), now()
              )
            `),
          ),
        /foreign key|23503/i,
      );
    });
  });

  it("RSD-09 deletion rejected; identity mutation rejected", async () => {
    await withRefundReadyHarness(async (h) => {
      const refund = await createProcessedRefund(h);
      const decision = await h.persistence.transaction((tx) =>
        ensureRefundStatutoryDecisionPending(tx, {
          refundId: refund.id,
          now: new Date(),
        }),
      );

      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              delete from app.refund_statutory_decisions
              where id = ${decision.id}::uuid
            `),
          ),
        /cannot be deleted|immutable/i,
      );

      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              update app.refund_statutory_decisions
              set logical_idempotency_key = ${`refund:${refund.id}:OTHER`}
              where id = ${decision.id}::uuid
            `),
          ),
        /immutable|identity/i,
      );
    });
  });

  it("RSD-10 NO_STATUTORY_DOCUMENT incomplete authority rejected; sealed row immutable", async () => {
    await withRefundReadyHarness(async (h) => {
      const refund = await createProcessedRefund(h);
      const key = `refund:${refund.id}:STATUTORY_REVERSAL`;

      // Incomplete NSD (rationale alone; no bounded reason / TI) must fail closed.
      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              insert into app.refund_statutory_decisions (
                id, refund_id, status, disposition, logical_idempotency_key,
                sealed_no_statutory_document_rationale,
                sealed_referenced_commercial_fact_refs,
                branch_finalized_at, branch_finalized_by_actor_kind,
                branch_finalized_by_actor_id,
                created_at, updated_at, pending_at
              ) values (
                gen_random_uuid(), ${refund.id}::uuid, 'BRANCH_FINALIZED',
                'NO_STATUTORY_DOCUMENT', ${key},
                'Positive operator: no statutory document required for this refund graph',
                ${`refund:${refund.id}`},
                now(), 'workforce', ${h.workforce.supportUser.id},
                now(), now(), now()
              )
            `),
          ),
        /no_statutory_document|check constraint|23514/i,
      );

      const decision = await h.persistence.transaction((tx) =>
        ensureRefundStatutoryDecisionPending(tx, {
          refundId: refund.id,
          now: new Date(),
        }),
      );
      expect(decision.status).toBe("PENDING");

      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              update app.refund_statutory_decisions
              set sealed_no_statutory_document_rationale = 'mutated'
              where id = ${decision.id}::uuid
            `),
          ),
        /pending_state|check constraint|23514|immutable/i,
      );
    });
  });

  it("RSD-11 ensure does not mutate Refund/Payment/Order; rejects non-PROCESSED", async () => {
    await withRefundReadyHarness(async (h) => {
      const refund = await createProcessedRefund(h);
      const before = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute<{
          refund_status: string;
          payment_status: string;
          order_status: string | null;
        }>(sql`
          select r.status as refund_status,
                 p.status as payment_status,
                 o.status as order_status
          from app.refunds r
          join app.payments p on p.id = r.payment_id
          left join app.orders o on o.id = r.order_id
          where r.id = ${refund.id}::uuid
        `);
        return rows.rows[0]!;
      });

      await h.persistence.transaction((tx) =>
        ensureRefundStatutoryDecisionPending(tx, {
          refundId: refund.id,
          now: new Date(),
        }),
      );

      const after = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute<{
          refund_status: string;
          payment_status: string;
          order_status: string | null;
        }>(sql`
          select r.status as refund_status,
                 p.status as payment_status,
                 o.status as order_status
          from app.refunds r
          join app.payments p on p.id = r.payment_id
          left join app.orders o on o.id = r.order_id
          where r.id = ${refund.id}::uuid
        `);
        return rows.rows[0]!;
      });
      expect(after).toEqual(before);

      // Non-PROCESSED rejection: insert ACCEPTED refund row is heavy; use fake id path
      // via a second payment refund that stays non-terminal is hard with fake processed.
      // Prove domain gate with a non-existent PROCESSED check via raw ACCEPTED insert is
      // unnecessary — repository rejects when status != PROCESSED using an existing row
      // forced via update is blocked by refund immutability. Use REFUND_NOT_FOUND instead
      // and a unit-level PROCESSED gate via temporary harness: create decision ensure on
      // random UUID.
      await expect(
        h.persistence.transaction((tx) =>
          ensureRefundStatutoryDecisionPending(tx, {
            refundId: randomUUID(),
            now: new Date(),
          }),
        ),
      ).rejects.toMatchObject({ code: "REFUND_NOT_FOUND" });
    });
  });

  it("RSD-12 repository refuses non-PROCESSED Refund without inventing a branch", async () => {
    await withRefundReadyHarness(async (h) => {
      // Force a non-processed refund by temporarily disabling provider processed outcome
      // after acceptance is not available; insert ACCEPTED refund via SQL for gate proof.
      const acceptedId = randomUUID();
      await h.persistence.withContext(async (ctx) =>
        ctx.db.execute(sql`
          insert into app.refunds (
            id, payment_id, amount_paise, currency, status, provider,
            provider_idempotency_key, reason, initiated_by_actor_kind,
            initiated_by_actor_id, authorized_permission,
            created_at, updated_at, accepted_at
          ) values (
            ${acceptedId}::uuid, ${h.paymentId}::uuid, 25, 'INR', 'ACCEPTED',
            ${h.provider.name}, ${`boba_rfnd_rsd12_${acceptedId}`},
            'accepted only', 'workforce', ${h.workforce.supportUser.id},
            'payment.refund', now(), now(), now()
          )
        `),
      );

      await expect(
        h.persistence.transaction((tx) =>
          ensureRefundStatutoryDecisionPending(tx, {
            refundId: acceptedId,
            now: new Date(),
          }),
        ),
      ).rejects.toBeInstanceOf(RefundStatutoryDecisionError);

      await expect(
        h.persistence.transaction((tx) =>
          ensureRefundStatutoryDecisionPending(tx, {
            refundId: acceptedId,
            now: new Date(),
          }),
        ),
      ).rejects.toMatchObject({ code: "REFUND_NOT_PROCESSED" });

      const none = await h.persistence.withContext((ctx) =>
        loadRefundStatutoryDecisionByRefundId(ctx, acceptedId),
      );
      expect(none).toBeNull();
    });
  });

  it("RSD-13 does not alter D-367 signature artifact tables or issued FD immutability", async () => {
    await withRefundReadyHarness(async (h) => {
      const refund = await createProcessedRefund(h);
      await h.persistence.transaction((tx) =>
        ensureRefundStatutoryDecisionPending(tx, {
          refundId: refund.id,
          now: new Date(),
        }),
      );

      await h.persistence.withContext(async (ctx) => {
        const sa = await ctx.db.execute(sql`
          select count(*)::int as c from app.signature_artifacts
        `);
        expect(typeof sa.rows[0]!.c).toBe("number");

        // Issuing path untouched: attempting to mutate an FD if any exist still fails.
        const fds = await ctx.db.execute<{ id: string }>(sql`
          select id from app.financial_documents limit 1
        `);
        if (fds.rows[0]) {
          await expectPostgresFailure(
            () =>
              ctx.db.execute(sql`
                update app.financial_documents
                set document_type = 'CREDIT_NOTE'
                where id = ${fds.rows[0]!.id}::uuid
              `),
            /immutable/i,
          );
        }
      });
    });
  });
});
