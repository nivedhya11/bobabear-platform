/**
 * IMP-028 D-366 — production PROCESSED → PENDING wiring tests.
 *
 * Proves the Refund operations seam, not merely ensureRefundStatutoryDecisionPending.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { executeRecoverMissingRefundStatutoryDecisionsCli } from "../../scripts/refund/recover-missing-statutory-decisions";
import {
  applyRefundProviderEvidence,
  reconcileRefund,
  requestRefund,
} from "../../src/server/refund";
import { loadRefundStatutoryDecisionByRefundId } from "../../src/server/refund-statutory-decision";
import { FAKE_PAYMENT_SIGNATURE_HEADER } from "../../src/server/payment/provider";
import { isRefundInboxEvidence } from "../../src/server/payment/inbox";
import { closeTrackedPersistenceHandles } from "./support/cart-fixtures";
import { withRefundReadyHarness } from "./support/refund-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

async function countFinancialDocuments(
  persistence: Parameters<Parameters<typeof withRefundReadyHarness>[0]>[0]["persistence"],
): Promise<number> {
  return persistence.withContext(async (ctx) => {
    const rows = await ctx.db.execute(sql`
      select count(*)::int as c from app.financial_documents
    `);
    return rows.rows[0]!.c as number;
  });
}

async function countDecisionsForRefund(
  persistence: Parameters<Parameters<typeof withRefundReadyHarness>[0]>[0]["persistence"],
  refundId: string,
): Promise<number> {
  return persistence.withContext(async (ctx) => {
    const rows = await ctx.db.execute(sql`
      select count(*)::int as c
      from app.refund_statutory_decisions
      where refund_id = ${refundId}::uuid
    `);
    return rows.rows[0]!.c as number;
  });
}

async function loadRefundCommercial(
  persistence: Parameters<Parameters<typeof withRefundReadyHarness>[0]>[0]["persistence"],
  refundId: string,
) {
  return persistence.withContext(async (ctx) => {
    const rows = await ctx.db.execute<{
      status: string;
      payment_status: string;
    }>(sql`
      select r.status, p.status as payment_status
      from app.refunds r
      join app.payments p on p.id = r.payment_id
      where r.id = ${refundId}::uuid
    `);
    return rows.rows[0]!;
  });
}

describe("IMP-028 D-366 production PROCESSED → PENDING wiring", () => {
  it("qualifying Refund PROCESSED through requestRefund ensures PENDING decision", async () => {
    await withRefundReadyHarness(async (h) => {
      const fdBefore = await countFinancialDocuments(h.persistence);
      const result = await requestRefund(
        h.persistence,
        h.workforce.support,
        {
          paymentId: h.paymentId,
          amountPaise: BigInt(100),
          reason: "d366 production processed pending",
        },
        { provider: h.provider },
      );
      expect(result.refund.status).toBe("PROCESSED");

      const decision = await h.persistence.withContext((ctx) =>
        loadRefundStatutoryDecisionByRefundId(ctx, result.refund.id),
      );
      expect(decision).not.toBeNull();
      expect(decision?.status).toBe("PENDING");
      expect(decision?.disposition).toBeNull();
      expect(decision?.issuedFinancialDocumentId).toBeNull();
      expect(await countDecisionsForRefund(h.persistence, result.refund.id)).toBe(1);
      expect(await countFinancialDocuments(h.persistence)).toBe(fdBefore);
    });
  });

  it("repeated production invocation does not duplicate the statutory decision", async () => {
    await withRefundReadyHarness(async (h) => {
      const created = await requestRefund(
        h.persistence,
        h.workforce.support,
        {
          paymentId: h.paymentId,
          amountPaise: BigInt(120),
          reason: "d366 production idempotent",
        },
        { provider: h.provider },
      );
      const first = await h.persistence.withContext((ctx) =>
        loadRefundStatutoryDecisionByRefundId(ctx, created.refund.id),
      );
      expect(first?.status).toBe("PENDING");

      await reconcileRefund(
        h.persistence,
        h.workforce.support,
        { refundId: created.refund.id },
        { provider: h.provider },
      );
      const rawBody = new TextEncoder().encode(
        JSON.stringify({
          family: "refund",
          providerRefundId: created.refund.providerRefundId,
          providerPaymentId: h.providerPaymentId,
          outcome: "processed",
          providerEventId: "evt_d366_repeat",
          amountPaise: 120,
        }),
      );
      const evidence = await h.provider.verifyWebhook({
        rawBody,
        headers: {
          [FAKE_PAYMENT_SIGNATURE_HEADER]: h.provider.computeWebhookSignature(rawBody),
        },
      });
      expect(isRefundInboxEvidence(evidence as never)).toBe(true);
      await applyRefundProviderEvidence(h.persistence, evidence as never);

      const second = await h.persistence.withContext((ctx) =>
        loadRefundStatutoryDecisionByRefundId(ctx, created.refund.id),
      );
      expect(second?.id).toBe(first?.id);
      expect(second?.status).toBe("PENDING");
      expect(await countDecisionsForRefund(h.persistence, created.refund.id)).toBe(1);
      expect((await loadRefundCommercial(h.persistence, created.refund.id)).status).toBe(
        "PROCESSED",
      );
    });
  });

  it("non-PROCESSED refund production paths do not create statutory authority", async () => {
    await withRefundReadyHarness(async (h) => {
      h.provider.setRefundOutcome("failed");
      const failed = await requestRefund(
        h.persistence,
        h.workforce.support,
        {
          paymentId: h.paymentId,
          amountPaise: BigInt(80),
          reason: "d366 production failed",
        },
        { provider: h.provider },
      );
      expect(failed.refund.status).toBe("FAILED");
      expect(
        await h.persistence.withContext((ctx) =>
          loadRefundStatutoryDecisionByRefundId(ctx, failed.refund.id),
        ),
      ).toBeNull();

      h.provider.setRefundOutcome("pending");
      const pending = await requestRefund(
        h.persistence,
        h.workforce.support,
        {
          paymentId: h.paymentId,
          amountPaise: BigInt(90),
          reason: "d366 production pending",
        },
        { provider: h.provider },
      );
      expect(pending.refund.status).toBe("PENDING");
      expect(
        await h.persistence.withContext((ctx) =>
          loadRefundStatutoryDecisionByRefundId(ctx, pending.refund.id),
        ),
      ).toBeNull();

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
            ${h.provider.name}, ${`boba_rfnd_d366_acc_${acceptedId}`},
            'accepted only', 'workforce', ${h.workforce.supportUser.id},
            'payment.refund', now(), now(), now()
          )
        `),
      );
      expect(
        await h.persistence.withContext((ctx) =>
          loadRefundStatutoryDecisionByRefundId(ctx, acceptedId),
        ),
      ).toBeNull();
    });
  });

  it("post-commit gap plus recovery CLI converges idempotently without rewriting Refund", async () => {
    await withRefundReadyHarness(async (h) => {
      const gapId = randomUUID();
      const fdBefore = await countFinancialDocuments(h.persistence);
      await h.persistence.withContext(async (ctx) =>
        ctx.db.execute(sql`
          insert into app.refunds (
            id, payment_id, amount_paise, currency, status, provider,
            provider_idempotency_key, reason, initiated_by_actor_kind,
            initiated_by_actor_id, authorized_permission,
            created_at, updated_at, accepted_at, processed_at
          ) values (
            ${gapId}::uuid, ${h.paymentId}::uuid, 35, 'INR', 'PROCESSED',
            ${h.provider.name}, ${`boba_rfnd_d366_gap_${gapId}`},
            'processed gap', 'workforce', ${h.workforce.supportUser.id},
            'payment.refund', now(), now(), now(), now()
          )
        `),
      );
      expect(
        await h.persistence.withContext((ctx) =>
          loadRefundStatutoryDecisionByRefundId(ctx, gapId),
        ),
      ).toBeNull();

      const scriptSource = readFileSync(
        path.join(
          process.cwd(),
          "scripts/refund/recover-missing-statutory-decisions.ts",
        ),
        "utf8",
      );
      const packageJson = JSON.parse(
        readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
      ) as { scripts: Record<string, string> };
      expect(packageJson.scripts["refund:recover-missing-statutory-decisions"]).toMatch(
        /recover-missing-statutory-decisions\.ts/,
      );
      expect(scriptSource).toMatch(/recoverMissingRefundStatutoryDecisionsBatch/);
      expect(scriptSource).toMatch(/source: process\.env/);

      const firstLines: string[] = [];
      await executeRecoverMissingRefundStatutoryDecisionsCli({
        persistence: h.persistence,
        argv: ["--limit=50"],
        write: (line) => firstLines.push(line),
      });
      const first = JSON.parse(firstLines[0]!) as {
        ok: boolean;
        operation: string;
        ensured: number;
      };
      expect(first.ok).toBe(true);
      expect(first.operation).toBe("recover_missing_refund_statutory_decisions_batch");
      expect(first.ensured).toBeGreaterThanOrEqual(1);

      const decision = await h.persistence.withContext((ctx) =>
        loadRefundStatutoryDecisionByRefundId(ctx, gapId),
      );
      expect(decision?.status).toBe("PENDING");
      expect(decision?.disposition).toBeNull();

      const secondLines: string[] = [];
      await executeRecoverMissingRefundStatutoryDecisionsCli({
        persistence: h.persistence,
        argv: ["--limit=50"],
        write: (line) => secondLines.push(line),
      });
      const second = JSON.parse(secondLines[0]!) as {
        ok: boolean;
        ensured: number;
      };
      expect(second.ok).toBe(true);
      expect(second.ensured).toBe(0);
      expect(await countDecisionsForRefund(h.persistence, gapId)).toBe(1);
      expect((await loadRefundCommercial(h.persistence, gapId)).status).toBe("PROCESSED");
      expect((await loadRefundCommercial(h.persistence, gapId)).payment_status).toBe(
        "SUCCEEDED",
      );
      expect(await countFinancialDocuments(h.persistence)).toBe(fdBefore);
    });
  });
});
