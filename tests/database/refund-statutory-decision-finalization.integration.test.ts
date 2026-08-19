/**
 * IMP-028 D-366 Slice 2 — manual-assisted statutory branch finalization.
 */
import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import {
  ensureRefundStatutoryDecisionPending,
  finalizeRefundStatutoryDecision,
  loadRefundStatutoryDecisionByRefundId,
} from "../../src/server/refund-statutory-decision";
import { issueFinancialDocument } from "../../src/server/financial-document";
import { cancelOrder } from "../../src/server/order";
import { requestRefund } from "../../src/server/refund";
import { RefundStatutoryDecisionError } from "../../src/shared/refund-statutory-decision";
import { closeTrackedPersistenceHandles } from "./support/cart-fixtures";
import {
  buildIssueCommand,
  withFinancialDocumentIssuanceHarness,
  type FinancialDocumentIssuanceHarness,
} from "./support/financial-document-issuance-fixtures";
import {
  addCartLine,
  type CustomerActor,
} from "../../src/server/cart";
import { startPayment } from "../../src/server/payment";
import { createSavedAddressForCustomer } from "./support/checkout-fixtures";
import {
  bringCheckoutToReady,
  createFakePaymentProvider,
  newIdempotencyKey,
  paymentOpts,
  verifyAndProcessWebhook,
} from "./support/payment-fixtures";
import { ensureProviderPaymentReference } from "./support/refund-fixtures";

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

function totalLines(grand: bigint) {
  return [
    {
      lineNumber: 1,
      description: "Sealed source line",
      quantity: 1,
      unitPaise: grand,
      discountPaise: BigInt(0),
      chargePaise: BigInt(0),
      taxableValuePaise: grand,
      sacCode: "9983",
      taxComponents: [] as const,
    },
  ];
}

async function prepareRefundHarness(h: FinancialDocumentIssuanceHarness) {
  await ensureProviderPaymentReference(h);
  h.provider.setRefundOutcome("processed");
}

async function createProcessedRefund(
  h: FinancialDocumentIssuanceHarness,
  amountPaise: bigint,
) {
  await prepareRefundHarness(h);
  const result = await requestRefund(
    h.persistence,
    h.workforce.support,
    {
      paymentId: h.paymentId,
      amountPaise,
      reason: "d366 slice2 fixture refund",
    },
    { provider: h.provider },
  );
  expect(result.refund.status).toBe("PROCESSED");
  return result.refund;
}

async function ensurePending(
  h: FinancialDocumentIssuanceHarness,
  refundId: string,
) {
  return h.persistence.transaction((tx) =>
    ensureRefundStatutoryDecisionPending(tx, {
      refundId,
      now: new Date(),
    }),
  );
}

async function cancelHarnessOrder(h: FinancialDocumentIssuanceHarness) {
  await cancelOrder(h.persistence, h.workforce.outletManager, {
    orderId: h.order.id,
    expectedOrderRevision: h.order.revision,
    cancellationReasonCode: "CUSTOMER_REQUESTED",
  });
}

async function issueTypedDocument(
  h: FinancialDocumentIssuanceHarness,
  documentType:
    | "RECEIPT_VOUCHER"
    | "TAX_INVOICE"
    | "BILL_OF_SUPPLY",
  grandTotalPaise: bigint,
  overrides: Parameters<typeof buildIssueCommand>[1] = {},
) {
  return issueFinancialDocument(
    h.persistence,
    buildIssueCommand(h, {
      documentType,
      lines: totalLines(grandTotalPaise),
      logicalIssuanceKey: `d366-${documentType}-${randomUUID()}`,
      ...overrides,
    }),
  );
}

async function countFinancialDocuments(h: FinancialDocumentIssuanceHarness) {
  return h.persistence.withContext(async (ctx) => {
    const rows = await ctx.db.execute(sql`
      select count(*)::int as c from app.financial_documents
    `);
    return rows.rows[0]!.c as number;
  });
}

async function commercialSnapshot(
  h: FinancialDocumentIssuanceHarness,
  refundId: string,
) {
  return h.persistence.withContext(async (ctx) => {
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
      where r.id = ${refundId}::uuid
    `);
    return rows.rows[0]!;
  });
}

function actor(h: FinancialDocumentIssuanceHarness) {
  return {
    actorKind: "workforce" as const,
    actorId: h.workforce.supportUser.id,
    now: new Date(),
  };
}

function paymentIdOf(h: FinancialDocumentIssuanceHarness): string {
  if (!h.paymentId) {
    throw new Error("Finalization harness requires a Payment id.");
  }
  return h.paymentId;
}

const CANONICAL_SECTION34 = "TAXABLE_VALUE_OR_TAX_EXCEEDS_PAYABLE" as const;
const CANONICAL_NSD_REASON =
  "COMMERCIAL_REFUND_NO_GST_STATUTORY_ADJUSTMENT" as const;

function nsdRefs(
  refundId: string,
  paymentId: string,
  taxInvoiceId: string,
) {
  return [
    { kind: "refund" as const, id: refundId },
    { kind: "payment" as const, id: paymentId },
    { kind: "financial_document" as const, id: taxInvoiceId },
  ];
}

function nsdCommand(
  h: FinancialDocumentIssuanceHarness,
  decisionId: string,
  refundId: string,
  taxInvoiceId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    ...actor(h),
    decisionId,
    disposition: "NO_STATUTORY_DOCUMENT" as const,
    priorTaxInvoiceId: taxInvoiceId,
    noStatutoryDocumentReasonCode: CANONICAL_NSD_REASON,
    noStatutoryDocumentRationale:
      "Operator cites this processed refund, its payment, and the relevant Tax Invoice as a commercial goodwill adjustment outside RFV/CN issuance.",
    referencedCommercialFactRefs: nsdRefs(
      refundId,
      paymentIdOf(h),
      taxInvoiceId,
    ),
    ...overrides,
  };
}

function cnCommand(
  h: FinancialDocumentIssuanceHarness,
  decisionId: string,
  taxInvoiceId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    ...actor(h),
    decisionId,
    disposition: "CREDIT_NOTE" as const,
    priorTaxInvoiceId: taxInvoiceId,
    section34QualificationCode: CANONICAL_SECTION34,
    section34QualificationFacts: { priorTaxInvoiceId: taxInvoiceId },
    reversalScope: "FULL" as const,
    ...overrides,
  };
}

async function completeSecondCustomerOrder(h: FinancialDocumentIssuanceHarness) {
  const variantId = await h.persistence.withContext(async (ctx) => {
    const r = await ctx.db.execute(sql`
      select variant_id::text as id
      from app.checkout_snapshot_lines
      where snapshot_id = ${h.checkoutSnapshotId}::uuid
      limit 1
    `);
    return r.rows[0]!.id as string;
  });
  const actorB = h.actors.customerB as CustomerActor;
  const added = await addCartLine(
    h.persistence,
    { kind: "customer", actor: actorB, brandId: h.brandId },
    { variantId, quantity: 1 },
  );
  const address = await createSavedAddressForCustomer(
    h.persistence,
    h.actors.customerBId,
  );
  const ready = await bringCheckoutToReady(
    h.persistence,
    actorB,
    added.cart.id,
    address.id,
  );
  const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
  const opts = paymentOpts(provider);
  const started = await startPayment(
    h.persistence,
    actorB,
    {
      checkoutId: ready.checkoutId,
      expectedCheckoutRevision: ready.revision,
      paymentMethodIntent: "upi",
      idempotencyKey: newIdempotencyKey("d366-b"),
    },
    opts,
  );
  await verifyAndProcessWebhook(
    h.persistence,
    provider,
    {
      executionIdentity: started.attempt.providerExecutionIdentity,
      outcome: "succeed",
      amountPaise: started.payment.expectedAmountPaise,
    },
    opts,
  );
  const order = await h.persistence.withContext(async (ctx) => {
    const r = await ctx.db.execute<{
      id: string;
      checkoutId: string;
      checkoutSnapshotId: string;
      paymentId: string;
    }>(sql`
      select id::text as id,
             checkout_id::text as "checkoutId",
             checkout_snapshot_id::text as "checkoutSnapshotId",
             payment_id::text as "paymentId"
      from app.orders
      where checkout_id = ${ready.checkoutId}::uuid
      limit 1
    `);
    return r.rows[0]!;
  });
  return order;
}

describe("IMP-028 D-366 Slice 2 branch finalization", () => {
  it("RSD-F01 valid RFV branch finalization", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const rv = await issueTypedDocument(h, "RECEIPT_VOUCHER", BigInt(100));
      await cancelHarnessOrder(h);
      const refund = await createProcessedRefund(h, BigInt(100));
      const pending = await ensurePending(h, refund.id);
      const beforeFd = await countFinancialDocuments(h);

      const sealed = await finalizeRefundStatutoryDecision(h.persistence, {
        ...actor(h),
        decisionId: pending.id,
        disposition: "REFUND_VOUCHER",
        priorReceiptVoucherId: rv.id,
        noSupplyAuthorityKind: "ORDER_CANCELLED",
        reversalScope: "FULL",
      });

      expect(sealed.status).toBe("BRANCH_FINALIZED");
      expect(sealed.disposition).toBe("REFUND_VOUCHER");
      expect(sealed.sealedPriorReceiptVoucherId).toBe(rv.id);
      expect(sealed.sealedNoSupplyAuthorityKind).toBe("ORDER_CANCELLED");
      expect(sealed.sealedReversalScope).toBe("FULL");
      expect(sealed.sealedReversalAmountPaise).toBe(BigInt(100));
      expect(sealed.issuedFinancialDocumentId).toBeNull();
      expect(await countFinancialDocuments(h)).toBe(beforeFd);
    });
  });

  it("RSD-F02 RFV rejects non-RV prior document", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const ti = await issueTypedDocument(h, "TAX_INVOICE", BigInt(100));
      await cancelHarnessOrder(h);
      const refund = await createProcessedRefund(h, BigInt(100));
      const pending = await ensurePending(h, refund.id);
      await expect(
        finalizeRefundStatutoryDecision(h.persistence, {
          ...actor(h),
          decisionId: pending.id,
          disposition: "REFUND_VOUCHER",
          priorReceiptVoucherId: ti.id,
          noSupplyAuthorityKind: "ORDER_CANCELLED",
          reversalScope: "FULL",
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_DECISION_INVALID_INPUT",
        field: "priorReceiptVoucherId",
      });
    });
  });

  it("RSD-F03 RFV rejects arbitrary unrelated RV", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const other = await completeSecondCustomerOrder(h);
      const unrelatedRv = await issueTypedDocument(h, "RECEIPT_VOUCHER", BigInt(100), {
        paymentId: other.paymentId,
        checkoutId: other.checkoutId,
        checkoutSnapshotId: other.checkoutSnapshotId,
        orderId: other.id,
      });
      await cancelHarnessOrder(h);
      const refund = await createProcessedRefund(h, BigInt(100));
      const pending = await ensurePending(h, refund.id);
      await expect(
        finalizeRefundStatutoryDecision(h.persistence, {
          ...actor(h),
          decisionId: pending.id,
          disposition: "REFUND_VOUCHER",
          priorReceiptVoucherId: unrelatedRv.id,
          noSupplyAuthorityKind: "ORDER_CANCELLED",
          reversalScope: "FULL",
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_DECISION_INVALID_INPUT",
        field: "priorReceiptVoucherId",
      });
    });
  });

  it("RSD-F04 RFV rejects missing positive no-supply authority", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const rv = await issueTypedDocument(h, "RECEIPT_VOUCHER", BigInt(100));
      const refund = await createProcessedRefund(h, BigInt(100));
      const pending = await ensurePending(h, refund.id);
      await expect(
        finalizeRefundStatutoryDecision(h.persistence, {
          ...actor(h),
          decisionId: pending.id,
          disposition: "REFUND_VOUCHER",
          priorReceiptVoucherId: rv.id,
          noSupplyAuthorityKind: "ORDER_CANCELLED",
          reversalScope: "FULL",
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_DECISION_INVALID_INPUT",
        field: "noSupplyAuthorityKind",
      });
    });
  });

  it("RSD-F05 RFV rejects applicable TI where D-366 forbids RFV", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const rv = await issueTypedDocument(h, "RECEIPT_VOUCHER", BigInt(100));
      await issueTypedDocument(h, "TAX_INVOICE", BigInt(100));
      await cancelHarnessOrder(h);
      const refund = await createProcessedRefund(h, BigInt(100));
      const pending = await ensurePending(h, refund.id);
      await expect(
        finalizeRefundStatutoryDecision(h.persistence, {
          ...actor(h),
          decisionId: pending.id,
          disposition: "REFUND_VOUCHER",
          priorReceiptVoucherId: rv.id,
          noSupplyAuthorityKind: "ORDER_CANCELLED",
          reversalScope: "FULL",
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_DECISION_INVALID_INPUT",
        field: "priorReceiptVoucherId",
      });
    });
  });

  it("RSD-F06 valid CN branch finalization", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const ti = await issueTypedDocument(h, "TAX_INVOICE", BigInt(100));
      const refund = await createProcessedRefund(h, BigInt(100));
      const pending = await ensurePending(h, refund.id);
      const sealed = await finalizeRefundStatutoryDecision(h.persistence, {
        ...actor(h),
        decisionId: pending.id,
        disposition: "CREDIT_NOTE",
        priorTaxInvoiceId: ti.id,
        section34QualificationCode: "TAXABLE_VALUE_OR_TAX_EXCEEDS_PAYABLE",
        section34QualificationFacts: { priorTaxInvoiceId: ti.id },
        reversalScope: "FULL",
      });
      expect(sealed.status).toBe("BRANCH_FINALIZED");
      expect(sealed.disposition).toBe("CREDIT_NOTE");
      expect(sealed.sealedPriorTaxInvoiceId).toBe(ti.id);
      expect(sealed.sealedSection34QualificationCode).toBe(
        "TAXABLE_VALUE_OR_TAX_EXCEEDS_PAYABLE",
      );
      expect(sealed.issuedFinancialDocumentId).toBeNull();
    });
  });

  it("RSD-F07 CN rejects non-TI prior document", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const rv = await issueTypedDocument(h, "RECEIPT_VOUCHER", BigInt(100));
      const refund = await createProcessedRefund(h, BigInt(100));
      const pending = await ensurePending(h, refund.id);
      await expect(
        finalizeRefundStatutoryDecision(h.persistence, {
          ...actor(h),
          decisionId: pending.id,
          disposition: "CREDIT_NOTE",
          priorTaxInvoiceId: rv.id,
          section34QualificationCode: "TAXABLE_VALUE_OR_TAX_EXCEEDS_PAYABLE",
          section34QualificationFacts: { priorTaxInvoiceId: rv.id },
          reversalScope: "FULL",
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_DECISION_INVALID_INPUT",
        field: "priorTaxInvoiceId",
      });
    });
  });

  it("RSD-F08 CN rejects unrelated TI", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const other = await completeSecondCustomerOrder(h);
      const unrelatedTi = await issueTypedDocument(h, "TAX_INVOICE", BigInt(100), {
        paymentId: other.paymentId,
        checkoutId: other.checkoutId,
        checkoutSnapshotId: other.checkoutSnapshotId,
        orderId: other.id,
      });
      const refund = await createProcessedRefund(h, BigInt(100));
      const pending = await ensurePending(h, refund.id);
      await expect(
        finalizeRefundStatutoryDecision(h.persistence, {
          ...actor(h),
          decisionId: pending.id,
          disposition: "CREDIT_NOTE",
          priorTaxInvoiceId: unrelatedTi.id,
          section34QualificationCode: "TAXABLE_VALUE_OR_TAX_EXCEEDS_PAYABLE",
          section34QualificationFacts: { priorTaxInvoiceId: unrelatedTi.id },
          reversalScope: "FULL",
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_DECISION_INVALID_INPUT",
        field: "priorTaxInvoiceId",
      });
    });
  });

  it("RSD-F09 CN rejects missing/invalid structured Section 34 authority", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const ti = await issueTypedDocument(h, "TAX_INVOICE", BigInt(100));
      const refund = await createProcessedRefund(h, BigInt(100));
      const pending = await ensurePending(h, refund.id);
      await expect(
        finalizeRefundStatutoryDecision(h.persistence, {
          ...actor(h),
          decisionId: pending.id,
          disposition: "CREDIT_NOTE",
          priorTaxInvoiceId: ti.id,
          section34QualificationCode: "true",
          section34QualificationFacts: { priorTaxInvoiceId: ti.id },
          reversalScope: "FULL",
        }),
      ).rejects.toBeInstanceOf(RefundStatutoryDecisionError);
      await expect(
        finalizeRefundStatutoryDecision(h.persistence, {
          ...actor(h),
          decisionId: pending.id,
          disposition: "CREDIT_NOTE",
          priorTaxInvoiceId: ti.id,
          section34QualificationCode: "TAXABLE_VALUE_OR_TAX_EXCEEDS_PAYABLE",
          section34QualificationFacts: { qualified: true },
          reversalScope: "FULL",
        }),
      ).rejects.toBeInstanceOf(RefundStatutoryDecisionError);
    });
  });

  it("RSD-F10 BoS does not qualify as CN prior authority", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const bos = await issueTypedDocument(h, "BILL_OF_SUPPLY", BigInt(100));
      const refund = await createProcessedRefund(h, BigInt(100));
      const pending = await ensurePending(h, refund.id);
      await expect(
        finalizeRefundStatutoryDecision(h.persistence, {
          ...actor(h),
          decisionId: pending.id,
          disposition: "CREDIT_NOTE",
          priorTaxInvoiceId: bos.id,
          section34QualificationCode: "TAXABLE_VALUE_OR_TAX_EXCEEDS_PAYABLE",
          section34QualificationFacts: { priorTaxInvoiceId: bos.id },
          reversalScope: "FULL",
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_DECISION_INVALID_INPUT",
        field: "priorTaxInvoiceId",
      });
    });
  });

  it("RSD-F11 valid NO_STATUTORY_DOCUMENT positive finalization", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const ti = await issueTypedDocument(h, "TAX_INVOICE", BigInt(100));
      const refund = await createProcessedRefund(h, BigInt(100));
      const pending = await ensurePending(h, refund.id);
      const beforeFd = await countFinancialDocuments(h);
      const sealed = await finalizeRefundStatutoryDecision(
        h.persistence,
        nsdCommand(h, pending.id, refund.id, ti.id),
      );
      expect(sealed.status).toBe("BRANCH_FINALIZED");
      expect(sealed.disposition).toBe("NO_STATUTORY_DOCUMENT");
      expect(sealed.issuedFinancialDocumentId).toBeNull();
      expect(sealed.sealedPriorReceiptVoucherId).toBeNull();
      expect(sealed.sealedPriorTaxInvoiceId).toBe(ti.id);
      expect(sealed.sealedNoStatutoryDocumentReasonCode).toBe(
        CANONICAL_NSD_REASON,
      );
      expect(await countFinancialDocuments(h)).toBe(beforeFd);
    });
  });

  it("RSD-F12 absence-only NO_DOCUMENT inference is impossible", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const ti = await issueTypedDocument(h, "TAX_INVOICE", BigInt(100));
      const refund = await createProcessedRefund(h, BigInt(100));
      const pending = await ensurePending(h, refund.id);
      await expect(
        finalizeRefundStatutoryDecision(
          h.persistence,
          nsdCommand(h, pending.id, refund.id, ti.id, {
            noStatutoryDocumentRationale:
              "No matching RFV/CN evidence was found",
          }),
        ),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_DECISION_INVALID_INPUT",
        field: "noStatutoryDocumentRationale",
      });
      const still = await h.persistence.withContext((ctx) =>
        loadRefundStatutoryDecisionByRefundId(ctx, refund.id),
      );
      expect(still?.status).toBe("PENDING");
      expect(still?.disposition).toBeNull();
    });
  });

  it("RSD-F13 invalid/non-PROCESSED Refund finalization rejected", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
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
            ${h.provider.name}, ${`boba_rfnd_f13_${acceptedId}`},
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
      ).rejects.toMatchObject({ code: "REFUND_NOT_PROCESSED" });

      const decisionId = randomUUID();
      await h.persistence.withContext(async (ctx) =>
        ctx.db.execute(sql`
          insert into app.refund_statutory_decisions (
            id, refund_id, status, disposition, logical_idempotency_key,
            created_at, updated_at, pending_at
          ) values (
            ${decisionId}::uuid, ${acceptedId}::uuid, 'PENDING', null,
            ${`refund:${acceptedId}:STATUTORY_REVERSAL`},
            now(), now(), now()
          )
        `),
      );
      await expect(
        finalizeRefundStatutoryDecision(
          h.persistence,
          nsdCommand(h, decisionId, acceptedId, randomUUID()),
        ),
      ).rejects.toMatchObject({ code: "REFUND_NOT_PROCESSED" });
    });
  });

  it("RSD-F14 exact retry is idempotent", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const rv = await issueTypedDocument(h, "RECEIPT_VOUCHER", BigInt(100));
      await cancelHarnessOrder(h);
      const refund = await createProcessedRefund(h, BigInt(100));
      const pending = await ensurePending(h, refund.id);
      const command = {
        ...actor(h),
        decisionId: pending.id,
        disposition: "REFUND_VOUCHER" as const,
        priorReceiptVoucherId: rv.id,
        noSupplyAuthorityKind: "ORDER_CANCELLED" as const,
        reversalScope: "FULL" as const,
      };
      const first = await finalizeRefundStatutoryDecision(h.persistence, command);
      const second = await finalizeRefundStatutoryDecision(h.persistence, command);
      expect(second.id).toBe(first.id);
      expect(second.disposition).toBe("REFUND_VOUCHER");
      expect(second.sealedPriorReceiptVoucherId).toBe(rv.id);
      expect(second.branchFinalizedAt?.toISOString()).toBe(
        first.branchFinalizedAt?.toISOString(),
      );
    });
  });

  it("RSD-F15 conflicting retry is rejected", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const rv = await issueTypedDocument(h, "RECEIPT_VOUCHER", BigInt(100));
      await cancelHarnessOrder(h);
      const refund = await createProcessedRefund(h, BigInt(100));
      const pending = await ensurePending(h, refund.id);
      await finalizeRefundStatutoryDecision(h.persistence, {
        ...actor(h),
        decisionId: pending.id,
        disposition: "REFUND_VOUCHER",
        priorReceiptVoucherId: rv.id,
        noSupplyAuthorityKind: "ORDER_CANCELLED",
        reversalScope: "FULL",
      });
      await expect(
        finalizeRefundStatutoryDecision(
          h.persistence,
          nsdCommand(h, pending.id, refund.id, randomUUID()),
        ),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_DECISION_IDEMPOTENCY_CONFLICT",
      });
    });
  });

  it("RSD-F16 concurrent equivalent finalization is safe", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const rv = await issueTypedDocument(h, "RECEIPT_VOUCHER", BigInt(100));
      await cancelHarnessOrder(h);
      const refund = await createProcessedRefund(h, BigInt(100));
      const pending = await ensurePending(h, refund.id);
      const command = {
        ...actor(h),
        decisionId: pending.id,
        disposition: "REFUND_VOUCHER" as const,
        priorReceiptVoucherId: rv.id,
        noSupplyAuthorityKind: "ORDER_CANCELLED" as const,
        reversalScope: "FULL" as const,
      };
      const [a, b] = await Promise.all([
        finalizeRefundStatutoryDecision(h.persistence, command),
        finalizeRefundStatutoryDecision(h.persistence, command),
      ]);
      expect(a.id).toBe(b.id);
      expect(a.disposition).toBe("REFUND_VOUCHER");
      expect(b.sealedPriorReceiptVoucherId).toBe(a.sealedPriorReceiptVoucherId);
      const count = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select count(*)::int as c
          from app.refund_statutory_decisions
          where refund_id = ${refund.id}::uuid
        `);
        return rows.rows[0]!.c as number;
      });
      expect(count).toBe(1);
    });
  });

  it("RSD-F17 concurrent conflicting branches permit at most one", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const ti = await issueTypedDocument(h, "TAX_INVOICE", BigInt(100));
      const refund = await createProcessedRefund(h, BigInt(100));
      const pending = await ensurePending(h, refund.id);
      const results = await Promise.allSettled([
        finalizeRefundStatutoryDecision(
          h.persistence,
          cnCommand(h, pending.id, ti.id, {
            section34QualificationCode: "TAXABLE_VALUE_OR_TAX_EXCEEDS_PAYABLE",
          }),
        ),
        finalizeRefundStatutoryDecision(
          h.persistence,
          cnCommand(h, pending.id, ti.id, {
            section34QualificationCode: "GOODS_RETURNED_BY_RECIPIENT",
          }),
        ),
      ]);
      const ok = results.filter((row) => row.status === "fulfilled");
      const fail = results.filter((row) => row.status === "rejected");
      expect(ok).toHaveLength(1);
      expect(fail).toHaveLength(1);
      const winner = (ok[0] as PromiseFulfilledResult<
        Awaited<ReturnType<typeof finalizeRefundStatutoryDecision>>
      >).value;
      expect(winner.disposition).toBe("CREDIT_NOTE");
      expect([
        "TAXABLE_VALUE_OR_TAX_EXCEEDS_PAYABLE",
        "GOODS_RETURNED_BY_RECIPIENT",
      ]).toContain(winner.sealedSection34QualificationCode);
      expect(winner.sealedPriorTaxInvoiceId).toBe(ti.id);
    });
  });

  it("RSD-F18 PARTIAL explicit allocation is required", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const rv = await issueTypedDocument(h, "RECEIPT_VOUCHER", BigInt(500));
      await cancelHarnessOrder(h);
      const refund = await createProcessedRefund(h, BigInt(100));
      const pending = await ensurePending(h, refund.id);
      await expect(
        finalizeRefundStatutoryDecision(h.persistence, {
          ...actor(h),
          decisionId: pending.id,
          disposition: "REFUND_VOUCHER",
          priorReceiptVoucherId: rv.id,
          noSupplyAuthorityKind: "ORDER_CANCELLED",
          reversalScope: "PARTIAL",
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_DECISION_INVALID_INPUT",
        field: "allocationAuthority",
      });
      const sealed = await finalizeRefundStatutoryDecision(h.persistence, {
        ...actor(h),
        decisionId: pending.id,
        disposition: "REFUND_VOUCHER",
        priorReceiptVoucherId: rv.id,
        noSupplyAuthorityKind: "ORDER_CANCELLED",
        reversalScope: "PARTIAL",
        allocationAuthority: {
          sourceFinancialDocumentId: rv.id,
          allocatedAmountPaise: BigInt(100),
        },
      });
      expect(sealed.sealedReversalScope).toBe("PARTIAL");
      expect(sealed.sealedAllocationAuthority).toContain(rv.id);
    });
  });

  it("RSD-F19 reversal cumulative cap cannot be exceeded", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const rv = await issueTypedDocument(h, "RECEIPT_VOUCHER", BigInt(200));
      await cancelHarnessOrder(h);
      const firstRefund = await createProcessedRefund(h, BigInt(150));
      const firstPending = await ensurePending(h, firstRefund.id);
      await finalizeRefundStatutoryDecision(h.persistence, {
        ...actor(h),
        decisionId: firstPending.id,
        disposition: "REFUND_VOUCHER",
        priorReceiptVoucherId: rv.id,
        noSupplyAuthorityKind: "ORDER_CANCELLED",
        reversalScope: "PARTIAL",
        allocationAuthority: {
          sourceFinancialDocumentId: rv.id,
          allocatedAmountPaise: BigInt(150),
        },
      });
      const secondRefund = await createProcessedRefund(h, BigInt(60));
      const secondPending = await ensurePending(h, secondRefund.id);
      await expect(
        finalizeRefundStatutoryDecision(h.persistence, {
          ...actor(h),
          decisionId: secondPending.id,
          disposition: "REFUND_VOUCHER",
          priorReceiptVoucherId: rv.id,
          noSupplyAuthorityKind: "ORDER_CANCELLED",
          reversalScope: "PARTIAL",
          allocationAuthority: {
            sourceFinancialDocumentId: rv.id,
            allocatedAmountPaise: BigInt(60),
          },
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_DECISION_INVALID_INPUT",
      });
    });
  });

  it("RSD-F20 sealed finalized authority is immutable", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const ti = await issueTypedDocument(h, "TAX_INVOICE", BigInt(100));
      const refund = await createProcessedRefund(h, BigInt(100));
      const pending = await ensurePending(h, refund.id);
      const sealed = await finalizeRefundStatutoryDecision(
        h.persistence,
        nsdCommand(h, pending.id, refund.id, ti.id),
      );
      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              update app.refund_statutory_decisions
              set sealed_no_statutory_document_rationale = 'mutated'
              where id = ${sealed.id}::uuid
            `),
          ),
        /immutable/i,
      );
    });
  });

  it("RSD-F21 no FinancialDocument is created during Slice 2 finalization", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const ti = await issueTypedDocument(h, "TAX_INVOICE", BigInt(100));
      const refund = await createProcessedRefund(h, BigInt(100));
      const pending = await ensurePending(h, refund.id);
      const beforeFd = await countFinancialDocuments(h);
      await finalizeRefundStatutoryDecision(h.persistence, {
        ...actor(h),
        decisionId: pending.id,
        disposition: "CREDIT_NOTE",
        priorTaxInvoiceId: ti.id,
        section34QualificationCode: "TAXABLE_VALUE_OR_TAX_EXCEEDS_PAYABLE",
        section34QualificationFacts: { priorTaxInvoiceId: ti.id },
        reversalScope: "FULL",
      });
      expect(await countFinancialDocuments(h)).toBe(beforeFd);
    });
  });

  it("RSD-F22 Refund/Payment/Order remain unchanged", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const rv = await issueTypedDocument(h, "RECEIPT_VOUCHER", BigInt(100));
      await cancelHarnessOrder(h);
      const refund = await createProcessedRefund(h, BigInt(100));
      const pending = await ensurePending(h, refund.id);
      const before = await commercialSnapshot(h, refund.id);
      await finalizeRefundStatutoryDecision(h.persistence, {
        ...actor(h),
        decisionId: pending.id,
        disposition: "REFUND_VOUCHER",
        priorReceiptVoucherId: rv.id,
        noSupplyAuthorityKind: "ORDER_CANCELLED",
        reversalScope: "FULL",
      });
      expect(await commercialSnapshot(h, refund.id)).toEqual(before);
      expect(before.refund_status).toBe("PROCESSED");
      expect(before.order_status).toBe("CANCELLED");
    });
  });

  it("RSD-F23 concurrent ensure-PENDING closes Slice-1 residual", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const refund = await createProcessedRefund(h, BigInt(100));
      const [a, b] = await Promise.all([
        h.persistence.transaction((tx) =>
          ensureRefundStatutoryDecisionPending(tx, {
            refundId: refund.id,
            now: new Date(),
          }),
        ),
        h.persistence.transaction((tx) =>
          ensureRefundStatutoryDecisionPending(tx, {
            refundId: refund.id,
            now: new Date(),
          }),
        ),
      ]);
      expect(a.id).toBe(b.id);
      expect(a.status).toBe("PENDING");
      expect(b.disposition).toBeNull();
      const count = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select count(*)::int as c
          from app.refund_statutory_decisions
          where refund_id = ${refund.id}::uuid
        `);
        return rows.rows[0]!.c as number;
      });
      expect(count).toBe(1);
    });
  });

  it("RSD-F24 bounded Section 34 codes accepted; unknown/arbitrary/empty rejected", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const ti = await issueTypedDocument(h, "TAX_INVOICE", BigInt(100));
      for (const code of [
        "TAXABLE_VALUE_OR_TAX_EXCEEDS_PAYABLE",
        "GOODS_RETURNED_BY_RECIPIENT",
        "GOODS_OR_SERVICES_DEFICIENT",
      ] as const) {
        const refund = await createProcessedRefund(h, BigInt(10));
        const pending = await ensurePending(h, refund.id);
        const sealed = await finalizeRefundStatutoryDecision(
          h.persistence,
          cnCommand(h, pending.id, ti.id, {
            section34QualificationCode: code,
            reversalScope: "PARTIAL",
            allocationAuthority: {
              sourceFinancialDocumentId: ti.id,
              allocatedAmountPaise: BigInt(10),
            },
          }),
        );
        expect(sealed.sealedSection34QualificationCode).toBe(code);
      }

      const refund = await createProcessedRefund(h, BigInt(10));
      const pending = await ensurePending(h, refund.id);
      for (const code of ["OTHER", "CUSTOMER_REFUND", "MANAGER_APPROVED", "arbitrary", ""]) {
        await expect(
          finalizeRefundStatutoryDecision(
            h.persistence,
            cnCommand(h, pending.id, ti.id, {
              section34QualificationCode: code,
              reversalScope: "PARTIAL",
              allocationAuthority: {
                sourceFinancialDocumentId: ti.id,
                allocatedAmountPaise: BigInt(10),
              },
            }),
          ),
        ).rejects.toMatchObject({
          code: "REFUND_STATUTORY_DECISION_INVALID_INPUT",
          field: "section34QualificationCode",
        });
      }
    });
  });

  it("RSD-F25 TI existence alone does not qualify CN without Section 34 authority", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      await issueTypedDocument(h, "TAX_INVOICE", BigInt(100));
      const refund = await createProcessedRefund(h, BigInt(100));
      const pending = await ensurePending(h, refund.id);
      await expect(
        finalizeRefundStatutoryDecision(h.persistence, {
          ...actor(h),
          decisionId: pending.id,
          disposition: "CREDIT_NOTE",
          reversalScope: "FULL",
        }),
      ).rejects.toBeInstanceOf(RefundStatutoryDecisionError);
    });
  });

  it("RSD-F26 bounded NSD succeeds; unknown reason / incomplete authority rejected", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const ti = await issueTypedDocument(h, "TAX_INVOICE", BigInt(100));
      const refund = await createProcessedRefund(h, BigInt(100));
      const pending = await ensurePending(h, refund.id);

      await expect(
        finalizeRefundStatutoryDecision(
          h.persistence,
          nsdCommand(h, pending.id, refund.id, ti.id, {
            noStatutoryDocumentReasonCode: "UNKNOWN_REASON",
          }),
        ),
      ).rejects.toMatchObject({
        field: "noStatutoryDocumentReasonCode",
      });

      await expect(
        finalizeRefundStatutoryDecision(
          h.persistence,
          nsdCommand(h, pending.id, refund.id, ti.id, {
            noStatutoryDocumentReasonCode: "",
          }),
        ),
      ).rejects.toMatchObject({
        field: "noStatutoryDocumentReasonCode",
      });

      await expect(
        finalizeRefundStatutoryDecision(h.persistence, {
          ...actor(h),
          decisionId: pending.id,
          disposition: "NO_STATUTORY_DOCUMENT",
          priorTaxInvoiceId: ti.id,
          noStatutoryDocumentReasonCode: CANONICAL_NSD_REASON,
          noStatutoryDocumentRationale:
            "Operator cites this processed refund and Tax Invoice as commercial goodwill outside RFV/CN.",
          referencedCommercialFactRefs: [
            { kind: "refund", id: refund.id },
            { kind: "payment", id: paymentIdOf(h) },
          ],
        }),
      ).rejects.toMatchObject({
        field: "referencedCommercialFactRefs",
      });

      await expect(
        finalizeRefundStatutoryDecision(
          h.persistence,
          nsdCommand(h, pending.id, refund.id, ti.id, {
            noStatutoryDocumentRationale: undefined,
          }),
        ),
      ).rejects.toMatchObject({
        field: "noStatutoryDocumentRationale",
      });

      const other = await completeSecondCustomerOrder(h);
      const unrelatedTi = await issueTypedDocument(h, "TAX_INVOICE", BigInt(100), {
        paymentId: other.paymentId,
        checkoutId: other.checkoutId,
        checkoutSnapshotId: other.checkoutSnapshotId,
        orderId: other.id,
      });
      await expect(
        finalizeRefundStatutoryDecision(
          h.persistence,
          nsdCommand(h, pending.id, refund.id, unrelatedTi.id),
        ),
      ).rejects.toMatchObject({
        field: "priorTaxInvoiceId",
      });

      const sealed = await finalizeRefundStatutoryDecision(
        h.persistence,
        nsdCommand(h, pending.id, refund.id, ti.id),
      );
      expect(sealed.disposition).toBe("NO_STATUTORY_DOCUMENT");
      expect(sealed.sealedNoStatutoryDocumentReasonCode).toBe(CANONICAL_NSD_REASON);
      expect(sealed.sealedPriorTaxInvoiceId).toBe(ti.id);
      expect(sealed.issuedFinancialDocumentId).toBeNull();
    });
  });

  it("RSD-F27 RFV/CN validation failure does not become NSD", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const rv = await issueTypedDocument(h, "RECEIPT_VOUCHER", BigInt(100));
      // Order not cancelled → RFV fails; decision remains PENDING (not NSD).
      const refund = await createProcessedRefund(h, BigInt(100));
      const pending = await ensurePending(h, refund.id);
      await expect(
        finalizeRefundStatutoryDecision(h.persistence, {
          ...actor(h),
          decisionId: pending.id,
          disposition: "REFUND_VOUCHER",
          priorReceiptVoucherId: rv.id,
          noSupplyAuthorityKind: "ORDER_CANCELLED",
          reversalScope: "FULL",
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_DECISION_INVALID_INPUT",
      });
      const still = await h.persistence.withContext((ctx) =>
        loadRefundStatutoryDecisionByRefundId(ctx, refund.id),
      );
      expect(still?.status).toBe("PENDING");
      expect(still?.disposition).toBeNull();
    });
  });

  it("RSD-F28 exact bounded CN/NSD retry idempotent; authority change conflicts", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const ti = await issueTypedDocument(h, "TAX_INVOICE", BigInt(100));
      const refund = await createProcessedRefund(h, BigInt(100));
      const pending = await ensurePending(h, refund.id);
      const command = cnCommand(h, pending.id, ti.id);
      const first = await finalizeRefundStatutoryDecision(h.persistence, command);
      const second = await finalizeRefundStatutoryDecision(h.persistence, command);
      expect(second.id).toBe(first.id);
      expect(second.sealedSection34QualificationCode).toBe(
        first.sealedSection34QualificationCode,
      );
      await expect(
        finalizeRefundStatutoryDecision(
          h.persistence,
          cnCommand(h, pending.id, ti.id, {
            section34QualificationCode: "GOODS_RETURNED_BY_RECIPIENT",
          }),
        ),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_DECISION_IDEMPOTENCY_CONFLICT",
      });
      await expect(
        finalizeRefundStatutoryDecision(
          h.persistence,
          cnCommand(h, pending.id, ti.id, {
            section34QualificationFacts: {
              priorTaxInvoiceId: ti.id,
              note: "changed facts",
            },
          }),
        ),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_DECISION_IDEMPOTENCY_CONFLICT",
      });
    });

    await withFinancialDocumentIssuanceHarness(async (h) => {
      const ti = await issueTypedDocument(h, "TAX_INVOICE", BigInt(100));
      const refund = await createProcessedRefund(h, BigInt(100));
      const pending = await ensurePending(h, refund.id);
      const command = nsdCommand(h, pending.id, refund.id, ti.id);
      const first = await finalizeRefundStatutoryDecision(h.persistence, command);
      const second = await finalizeRefundStatutoryDecision(h.persistence, command);
      expect(second.id).toBe(first.id);
      await expect(
        finalizeRefundStatutoryDecision(
          h.persistence,
          nsdCommand(h, pending.id, refund.id, ti.id, {
            noStatutoryDocumentRationale:
              "Different sealed operator rationale for the same commercial goodwill NSD.",
          }),
        ),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_DECISION_IDEMPOTENCY_CONFLICT",
      });
    });
  });

  it("RSD-F29 DB rejects invalid Section34/NSD persistence combinations", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const ti = await issueTypedDocument(h, "TAX_INVOICE", BigInt(100));
      const refund = await createProcessedRefund(h, BigInt(100));
      const key = `refund:${refund.id}:STATUTORY_REVERSAL`;

      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              insert into app.refund_statutory_decisions (
                id, refund_id, status, disposition, logical_idempotency_key,
                sealed_prior_tax_invoice_id,
                sealed_section34_qualification_code,
                sealed_section34_qualification_facts,
                sealed_reversal_scope, sealed_reversal_amount_paise,
                branch_finalized_at, branch_finalized_by_actor_kind,
                branch_finalized_by_actor_id,
                created_at, updated_at, pending_at
              ) values (
                gen_random_uuid(), ${refund.id}::uuid, 'BRANCH_FINALIZED',
                'CREDIT_NOTE', ${key},
                ${ti.id}::uuid,
                'OTHER',
                ${JSON.stringify({ priorTaxInvoiceId: ti.id })},
                'FULL', 100,
                now(), 'workforce', ${h.workforce.supportUser.id},
                now(), now(), now()
              )
            `),
          ),
        /section34_code|credit_note_branch|check constraint|23514/i,
      );

      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              insert into app.refund_statutory_decisions (
                id, refund_id, status, disposition, logical_idempotency_key,
                sealed_prior_tax_invoice_id,
                sealed_no_statutory_document_reason_code,
                sealed_no_statutory_document_rationale,
                sealed_referenced_commercial_fact_refs,
                branch_finalized_at, branch_finalized_by_actor_kind,
                branch_finalized_by_actor_id,
                created_at, updated_at, pending_at
              ) values (
                gen_random_uuid(), ${refund.id}::uuid, 'BRANCH_FINALIZED',
                'NO_STATUTORY_DOCUMENT', ${key},
                ${ti.id}::uuid,
                'OTHER_REASON',
                'Operator positive commercial goodwill rationale',
                ${JSON.stringify([{ kind: "refund", id: refund.id }])},
                now(), 'workforce', ${h.workforce.supportUser.id},
                now(), now(), now()
              )
            `),
          ),
        /nsd_reason|no_statutory_document|check constraint|23514/i,
      );

      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              insert into app.refund_statutory_decisions (
                id, refund_id, status, disposition, logical_idempotency_key,
                sealed_prior_tax_invoice_id,
                sealed_section34_qualification_code,
                sealed_section34_qualification_facts,
                sealed_reversal_scope, sealed_reversal_amount_paise,
                sealed_no_statutory_document_reason_code,
                branch_finalized_at, branch_finalized_by_actor_kind,
                branch_finalized_by_actor_id,
                created_at, updated_at, pending_at
              ) values (
                gen_random_uuid(), ${refund.id}::uuid, 'BRANCH_FINALIZED',
                'CREDIT_NOTE', ${key},
                ${ti.id}::uuid,
                'TAXABLE_VALUE_OR_TAX_EXCEEDS_PAYABLE',
                ${JSON.stringify({ priorTaxInvoiceId: ti.id })},
                'FULL', 100,
                'COMMERCIAL_REFUND_NO_GST_STATUTORY_ADJUSTMENT',
                now(), 'workforce', ${h.workforce.supportUser.id},
                now(), now(), now()
              )
            `),
          ),
        /nsd_reason_only|credit_note_branch|check constraint|23514/i,
      );

      // Valid PENDING remains legal.
      const pending = await ensurePending(h, refund.id);
      expect(pending.status).toBe("PENDING");
      expect(pending.disposition).toBeNull();
    });
  });
});
