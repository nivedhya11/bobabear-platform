/**
 * IMP-028 D-366 Slice 3A — PARTIAL statutory issuance-allocation authority.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { issueFinancialDocument, loadFinancialDocument } from "../../src/server/financial-document";
import {
  ensureRefundStatutoryDecisionPending,
  finalizeRefundStatutoryDecision,
  loadRefundStatutoryDecisionById,
  sealRefundStatutoryDecisionBranch,
} from "../../src/server/refund-statutory-decision";
import {
  sealRefundStatutoryIssuanceAllocation,
} from "../../src/server/refund-statutory-issuance-allocation";
import { cancelOrder } from "../../src/server/order";
import { requestRefund } from "../../src/server/refund";
import { canonicalAllocationAuthorityJson } from "../../src/shared/refund-statutory-decision";
import { RefundStatutoryIssuanceAllocationError } from "../../src/shared/refund-statutory-issuance-allocation";
import type { FinancialDocument } from "../../src/shared/financial-document";
import { closeTrackedPersistenceHandles } from "./support/cart-fixtures";
import {
  buildIssueCommand,
  withFinancialDocumentIssuanceHarness,
  type FinancialDocumentIssuanceHarness,
} from "./support/financial-document-issuance-fixtures";
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

function untaxedLines(grand: bigint) {
  return [
    {
      lineNumber: 1,
      description: "Sealed source line",
      quantity: 1,
      unitPaise: grand,
      discountPaise: 0n,
      chargePaise: 0n,
      taxableValuePaise: grand,
      sacCode: "9983",
      taxComponents: [] as const,
    },
  ];
}

function taxedLines() {
  return [
    {
      lineNumber: 1,
      description: "Sealed source line",
      quantity: 1,
      unitPaise: 10000n,
      discountPaise: 0n,
      chargePaise: 0n,
      taxableValuePaise: 10000n,
      sacCode: "9983",
      taxComponents: [
        {
          taxType: "cgst" as const,
          rateBps: 250,
          taxableAmountPaise: 10000n,
          taxAmountPaise: 250n,
        },
        {
          taxType: "sgst" as const,
          rateBps: 250,
          taxableAmountPaise: 10000n,
          taxAmountPaise: 250n,
        },
      ],
    },
  ];
}

function twoLineCappedFirst() {
  return [
    {
      lineNumber: 1,
      description: "Small first line",
      quantity: 1,
      unitPaise: 100n,
      discountPaise: 0n,
      chargePaise: 0n,
      taxableValuePaise: 100n,
      sacCode: "9983",
      taxComponents: [] as const,
    },
    {
      lineNumber: 2,
      description: "Second taxed line",
      quantity: 1,
      unitPaise: 10000n,
      discountPaise: 0n,
      chargePaise: 0n,
      taxableValuePaise: 10000n,
      sacCode: "9983",
      taxComponents: [
        {
          taxType: "cgst" as const,
          rateBps: 250,
          taxableAmountPaise: 10000n,
          taxAmountPaise: 250n,
        },
        {
          taxType: "sgst" as const,
          rateBps: 250,
          taxableAmountPaise: 10000n,
          taxAmountPaise: 250n,
        },
      ],
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
      reason: "d366 slice3a fixture refund",
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
  documentType: "RECEIPT_VOUCHER" | "TAX_INVOICE",
  lines:
    | ReturnType<typeof taxedLines>
    | ReturnType<typeof twoLineCappedFirst>
    | ReturnType<typeof untaxedLines> = taxedLines(),
) {
  const issued = await issueFinancialDocument(
    h.persistence,
    buildIssueCommand(h, {
      documentType,
      lines,
      logicalIssuanceKey: `d366-s3a-${documentType}-${randomUUID()}`,
    }),
  );
  const loaded = await h.persistence.withContext((ctx) =>
    loadFinancialDocument(ctx, issued.id),
  );
  expect(loaded).toBeTruthy();
  return loaded!;
}

function actor(h: FinancialDocumentIssuanceHarness) {
  return {
    actorKind: "workforce" as const,
    actorId: h.workforce.supportUser.id,
    now: new Date(),
  };
}

async function finalizePartialRfv(
  h: FinancialDocumentIssuanceHarness,
  decisionId: string,
  receiptVoucherId: string,
  amountPaise: bigint,
) {
  return finalizeRefundStatutoryDecision(h.persistence, {
    ...actor(h),
    decisionId,
    disposition: "REFUND_VOUCHER",
    priorReceiptVoucherId: receiptVoucherId,
    noSupplyAuthorityKind: "ORDER_CANCELLED",
    reversalScope: "PARTIAL",
    allocationAuthority: {
      sourceFinancialDocumentId: receiptVoucherId,
      allocatedAmountPaise: amountPaise,
    },
  });
}

async function finalizePartialCn(
  h: FinancialDocumentIssuanceHarness,
  decisionId: string,
  taxInvoiceId: string,
  amountPaise: bigint,
) {
  return finalizeRefundStatutoryDecision(h.persistence, {
    ...actor(h),
    decisionId,
    disposition: "CREDIT_NOTE",
    priorTaxInvoiceId: taxInvoiceId,
    section34QualificationCode: "TAXABLE_VALUE_OR_TAX_EXCEEDS_PAYABLE",
    section34QualificationFacts: { priorTaxInvoiceId: taxInvoiceId },
    reversalScope: "PARTIAL",
    allocationAuthority: {
      sourceFinancialDocumentId: taxInvoiceId,
      allocatedAmountPaise: amountPaise,
    },
  });
}

function cgstOf(doc: FinancialDocument) {
  const tax = doc.lines[0]?.taxComponents.find((row) => row.taxType === "cgst");
  expect(tax).toBeTruthy();
  return tax!;
}

function sgstOf(doc: FinancialDocument) {
  const tax = doc.lines[0]?.taxComponents.find((row) => row.taxType === "sgst");
  expect(tax).toBeTruthy();
  return tax!;
}

function balancedPartial(doc: FinancialDocument, amountPaise: bigint) {
  const line = doc.lines[0]!;
  const cgst = cgstOf(doc);
  const sgst = sgstOf(doc);
  const taxEach = 10n;
  const base = amountPaise - taxEach - taxEach;
  expect(base > 0n).toBe(true);
  return {
    lines: [
      {
        sourceFinancialDocumentLineId: line.id,
        allocatedTaxableOrBaseAmountPaise: base,
      },
    ],
    taxComponents: [
      {
        sourceFinancialDocumentTaxComponentId: cgst.id,
        allocatedTaxAmountPaise: taxEach,
      },
      {
        sourceFinancialDocumentTaxComponentId: sgst.id,
        allocatedTaxAmountPaise: taxEach,
      },
    ],
  };
}

async function countTable(
  h: FinancialDocumentIssuanceHarness,
  table: string,
): Promise<number> {
  return h.persistence.withContext(async (ctx) => {
    const rows = await ctx.db.execute(
      sql.raw(`select count(*)::int as c from app.${table}`),
    );
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
      refund_amount: string;
      payment_status: string;
      order_status: string | null;
    }>(sql`
      select r.status as refund_status,
             r.amount_paise::text as refund_amount,
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

async function preparePartialRfv(
  h: FinancialDocumentIssuanceHarness,
  amountPaise: bigint,
  lines: ReturnType<typeof taxedLines> | ReturnType<typeof twoLineCappedFirst> = taxedLines(),
) {
  const rv = await issueTypedDocument(h, "RECEIPT_VOUCHER", lines);
  await cancelHarnessOrder(h);
  const refund = await createProcessedRefund(h, amountPaise);
  const pending = await ensurePending(h, refund.id);
  const decision = await finalizePartialRfv(h, pending.id, rv.id, amountPaise);
  return { rv, refund, decision };
}

async function preparePartialCn(
  h: FinancialDocumentIssuanceHarness,
  amountPaise: bigint,
) {
  const ti = await issueTypedDocument(h, "TAX_INVOICE");
  const refund = await createProcessedRefund(h, amountPaise);
  const pending = await ensurePending(h, refund.id);
  const decision = await finalizePartialCn(h, pending.id, ti.id, amountPaise);
  return { ti, refund, decision };
}

describe("IMP-028 D-366 Slice 3A PARTIAL issuance allocation", () => {
  it("RSIA-01 migration declares allocation tables, constraints, and immutability triggers", () => {
    const sqlText = readFileSync(
      path.join(process.cwd(), "drizzle/0029_refund_statutory_issuance_allocation.sql"),
      "utf8",
    );
    expect(sqlText).toContain("refund_statutory_issuance_allocations");
    expect(sqlText).toContain("refund_statutory_issuance_allocation_lines");
    expect(sqlText).toContain("refund_statutory_issuance_allocation_tax_components");
    expect(sqlText).toContain("rsia_decision_uidx");
    expect(sqlText).toContain("refund-statutory-decision:");
    expect(sqlText).toContain("ISSUANCE_ALLOCATION");
    expect(sqlText).toContain("forbid_refund_statutory_issuance_allocation_mutation");
    expect(sqlText).toContain("forbid_refund_statutory_issuance_allocation_child_append");
    expect(sqlText).toContain("ON DELETE restrict");
  });

  it("RSIA-02 PARTIAL RFV BRANCH_FINALIZED accepts allocation against exact prior RV", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const { rv, decision } = await preparePartialRfv(h, 100n);
      const beforeFd = await countTable(h, "financial_documents");
      const beforeSig = await countTable(h, "signature_artifacts");
      const allocation = await sealRefundStatutoryIssuanceAllocation(
        h.persistence,
        { decisionId: decision.id, ...balancedPartial(rv, 100n) },
      );
      expect(allocation.refundStatutoryDecisionId).toBe(decision.id);
      expect(allocation.sourceFinancialDocumentId).toBe(rv.id);
      expect(allocation.sourceDocumentType).toBe("RECEIPT_VOUCHER");
      expect(allocation.sealedReversalAmountPaise).toBe(100n);
      expect(allocation.logicalIdempotencyKey).toBe(
        `refund-statutory-decision:${decision.id}:ISSUANCE_ALLOCATION`,
      );
      expect(allocation.lines).toHaveLength(1);
      expect(allocation.taxComponents).toHaveLength(2);
      expect(allocation.taxComponents[0]?.taxRateBps).toBe(250);
      const reloaded = await h.persistence.withContext((ctx) =>
        loadRefundStatutoryDecisionById(ctx, decision.id),
      );
      expect(reloaded?.status).toBe("BRANCH_FINALIZED");
      expect(await countTable(h, "financial_documents")).toBe(beforeFd);
      expect(await countTable(h, "signature_artifacts")).toBe(beforeSig);
    });
  });

  it("RSIA-03 PARTIAL CN BRANCH_FINALIZED accepts allocation against exact prior TI", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const { ti, decision } = await preparePartialCn(h, 100n);
      const allocation = await sealRefundStatutoryIssuanceAllocation(
        h.persistence,
        { decisionId: decision.id, ...balancedPartial(ti, 100n) },
      );
      expect(allocation.sourceFinancialDocumentId).toBe(ti.id);
      expect(allocation.sourceDocumentType).toBe("TAX_INVOICE");
    });
  });

  it("RSIA-04 FULL RFV and FULL CN reject allocation", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const rv = await issueTypedDocument(h, "RECEIPT_VOUCHER", untaxedLines(100n));
      await cancelHarnessOrder(h);
      const refund = await createProcessedRefund(h, rv.grandTotalPaise);
      const pending = await ensurePending(h, refund.id);
      const full = await finalizeRefundStatutoryDecision(h.persistence, {
        ...actor(h),
        decisionId: pending.id,
        disposition: "REFUND_VOUCHER",
        priorReceiptVoucherId: rv.id,
        noSupplyAuthorityKind: "ORDER_CANCELLED",
        reversalScope: "FULL",
      });
      await expect(
        sealRefundStatutoryIssuanceAllocation(h.persistence, {
          decisionId: full.id,
          lines: [
            {
              sourceFinancialDocumentLineId: rv.lines[0]!.id,
              allocatedTaxableOrBaseAmountPaise: 1n,
            },
          ],
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_ISSUANCE_ALLOCATION_NOT_ELIGIBLE",
        field: "reversalScope",
      });
    });
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const ti = await issueTypedDocument(h, "TAX_INVOICE", untaxedLines(100n));
      const refund = await createProcessedRefund(h, ti.grandTotalPaise);
      const pending = await ensurePending(h, refund.id);
      const full = await finalizeRefundStatutoryDecision(h.persistence, {
        ...actor(h),
        decisionId: pending.id,
        disposition: "CREDIT_NOTE",
        priorTaxInvoiceId: ti.id,
        section34QualificationCode: "TAXABLE_VALUE_OR_TAX_EXCEEDS_PAYABLE",
        section34QualificationFacts: { priorTaxInvoiceId: ti.id },
        reversalScope: "FULL",
      });
      await expect(
        sealRefundStatutoryIssuanceAllocation(h.persistence, {
          decisionId: full.id,
          lines: [
            {
              sourceFinancialDocumentLineId: ti.lines[0]!.id,
              allocatedTaxableOrBaseAmountPaise: 1n,
            },
          ],
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_ISSUANCE_ALLOCATION_NOT_ELIGIBLE",
        field: "reversalScope",
      });
    });
  });

  it("RSIA-05 NSD and PENDING reject allocation", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const ti = await issueTypedDocument(h, "TAX_INVOICE");
      const refund = await createProcessedRefund(h, 100n);
      const pending = await ensurePending(h, refund.id);
      await expect(
        sealRefundStatutoryIssuanceAllocation(h.persistence, {
          decisionId: pending.id,
          ...balancedPartial(ti, 100n),
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_ISSUANCE_ALLOCATION_NOT_ELIGIBLE",
        field: "status",
      });
      const nsd = await finalizeRefundStatutoryDecision(h.persistence, {
        ...actor(h),
        decisionId: pending.id,
        disposition: "NO_STATUTORY_DOCUMENT",
        priorTaxInvoiceId: ti.id,
        noStatutoryDocumentReasonCode:
          "COMMERCIAL_REFUND_NO_GST_STATUTORY_ADJUSTMENT",
        noStatutoryDocumentRationale:
          "Operator cites this processed refund, its payment, and the relevant Tax Invoice as a commercial goodwill adjustment outside RFV/CN issuance.",
        referencedCommercialFactRefs: [
          { kind: "refund", id: refund.id },
          { kind: "payment", id: h.paymentId! },
          { kind: "financial_document", id: ti.id },
        ],
      });
      await expect(
        sealRefundStatutoryIssuanceAllocation(h.persistence, {
          decisionId: nsd.id,
          ...balancedPartial(ti, 100n),
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_ISSUANCE_ALLOCATION_NOT_ELIGIBLE",
        field: "disposition",
      });
    });
  });

  it("RSIA-06 foreign, arbitrary, swapped, and mismatched source references are rejected", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const { rv, decision } = await preparePartialRfv(h, 100n);
      const foreign = await issueTypedDocument(h, "TAX_INVOICE");
      const command = balancedPartial(rv, 100n);
      await expect(
        sealRefundStatutoryIssuanceAllocation(h.persistence, {
          decisionId: decision.id,
          lines: [
            {
              sourceFinancialDocumentLineId: foreign.lines[0]!.id,
              allocatedTaxableOrBaseAmountPaise: 80n,
            },
          ],
          taxComponents: command.taxComponents,
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_ISSUANCE_ALLOCATION_INVALID_INPUT",
      });
      await expect(
        sealRefundStatutoryIssuanceAllocation(h.persistence, {
          decisionId: decision.id,
          lines: command.lines,
          taxComponents: [
            {
              sourceFinancialDocumentTaxComponentId: cgstOf(foreign).id,
              allocatedTaxAmountPaise: 10n,
            },
            command.taxComponents[1]!,
          ],
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_ISSUANCE_ALLOCATION_INVALID_INPUT",
      });
      await expect(
        sealRefundStatutoryIssuanceAllocation(h.persistence, {
          decisionId: decision.id,
          lines: [
            {
              sourceFinancialDocumentLineId: randomUUID(),
              allocatedTaxableOrBaseAmountPaise: 80n,
            },
          ],
          taxComponents: command.taxComponents,
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_ISSUANCE_ALLOCATION_INVALID_INPUT",
      });
      await expect(
        sealRefundStatutoryIssuanceAllocation(h.persistence, {
          decisionId: decision.id,
          lines: command.lines,
          taxComponents: [
            {
              ...command.taxComponents[0]!,
              taxRateBps: 9999,
            },
            command.taxComponents[1]!,
          ],
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_ISSUANCE_ALLOCATION_INVALID_INPUT",
      });
    });
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueTypedDocument(h, "RECEIPT_VOUCHER", twoLineCappedFirst());
      await cancelHarnessOrder(h);
      const refund = await createProcessedRefund(h, 100n);
      const pending = await ensurePending(h, refund.id);
      const decision = await finalizePartialRfv(h, pending.id, doc.id, 100n);
      const lineA = doc.lines[0]!;
      const lineB = doc.lines[1]!;
      const cgstB = lineB.taxComponents.find((row) => row.taxType === "cgst")!;
      await expect(
        sealRefundStatutoryIssuanceAllocation(h.persistence, {
          decisionId: decision.id,
          lines: [
            {
              sourceFinancialDocumentLineId: lineA.id,
              allocatedTaxableOrBaseAmountPaise: 80n,
            },
          ],
          taxComponents: [
            {
              sourceFinancialDocumentTaxComponentId: cgstB.id,
              allocatedTaxAmountPaise: 10n,
              sourceFinancialDocumentLineId: lineA.id,
            },
            {
              sourceFinancialDocumentTaxComponentId: lineB.taxComponents.find(
                (row) => row.taxType === "sgst",
              )!.id,
              allocatedTaxAmountPaise: 10n,
            },
          ],
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_ISSUANCE_ALLOCATION_INVALID_INPUT",
      });
    });
  });

  it("RSIA-07 allocation totals must reconcile exactly; under, over, zero, and negative rejected", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const { rv, decision } = await preparePartialRfv(h, 100n);
      const command = balancedPartial(rv, 100n);
      await expect(
        sealRefundStatutoryIssuanceAllocation(h.persistence, {
          decisionId: decision.id,
          lines: [
            {
              sourceFinancialDocumentLineId: command.lines[0]!.sourceFinancialDocumentLineId,
              allocatedTaxableOrBaseAmountPaise: 70n,
            },
          ],
          taxComponents: command.taxComponents,
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_ISSUANCE_ALLOCATION_INVALID_INPUT",
      });
      await expect(
        sealRefundStatutoryIssuanceAllocation(h.persistence, {
          decisionId: decision.id,
          lines: [
            {
              sourceFinancialDocumentLineId: command.lines[0]!.sourceFinancialDocumentLineId,
              allocatedTaxableOrBaseAmountPaise: 90n,
            },
          ],
          taxComponents: command.taxComponents,
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_ISSUANCE_ALLOCATION_INVALID_INPUT",
      });
      await expect(
        sealRefundStatutoryIssuanceAllocation(h.persistence, {
          decisionId: decision.id,
          lines: [
            {
              sourceFinancialDocumentLineId: command.lines[0]!.sourceFinancialDocumentLineId,
              allocatedTaxableOrBaseAmountPaise: 0n,
            },
          ],
        }),
      ).rejects.toBeInstanceOf(RefundStatutoryIssuanceAllocationError);
      await expect(
        sealRefundStatutoryIssuanceAllocation(h.persistence, {
          decisionId: decision.id,
          lines: [
            {
              sourceFinancialDocumentLineId: command.lines[0]!.sourceFinancialDocumentLineId,
              allocatedTaxableOrBaseAmountPaise: -10n,
            },
          ],
        }),
      ).rejects.toBeInstanceOf(RefundStatutoryIssuanceAllocationError);
      const sealed = await sealRefundStatutoryIssuanceAllocation(h.persistence, {
        decisionId: decision.id,
        ...command,
      });
      expect(
        sealed.lines.reduce((sum, line) => sum + line.allocatedTaxableOrBaseAmountPaise, 0n) +
          sealed.taxComponents.reduce((sum, tax) => sum + tax.allocatedTaxAmountPaise, 0n),
      ).toBe(100n);
    });
  });

  it("RSIA-08 per-line and per-tax-component source caps are enforced", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const { rv, decision } = await preparePartialRfv(h, 101n, twoLineCappedFirst());
      const small = rv.lines[0]!;
      await expect(
        sealRefundStatutoryIssuanceAllocation(h.persistence, {
          decisionId: decision.id,
          lines: [
            {
              sourceFinancialDocumentLineId: small.id,
              allocatedTaxableOrBaseAmountPaise: 101n,
            },
          ],
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_ISSUANCE_ALLOCATION_INVALID_INPUT",
      });
    });
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const { rv, decision } = await preparePartialRfv(h, 251n);
      await expect(
        sealRefundStatutoryIssuanceAllocation(h.persistence, {
          decisionId: decision.id,
          taxComponents: [
            {
              sourceFinancialDocumentTaxComponentId: cgstOf(rv).id,
              allocatedTaxAmountPaise: 251n,
            },
          ],
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_ISSUANCE_ALLOCATION_INVALID_INPUT",
      });
    });
  });

  it("RSIA-09 previous sealed allocations count against line and tax-component caps, including cross-decision", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const rv = await issueTypedDocument(h, "RECEIPT_VOUCHER", twoLineCappedFirst());
      await cancelHarnessOrder(h);
      const first = await createProcessedRefund(h, 80n);
      const firstPending = await ensurePending(h, first.id);
      const firstDecision = await finalizePartialRfv(h, firstPending.id, rv.id, 80n);
      await sealRefundStatutoryIssuanceAllocation(h.persistence, {
        decisionId: firstDecision.id,
        lines: [
          {
            sourceFinancialDocumentLineId: rv.lines[0]!.id,
            allocatedTaxableOrBaseAmountPaise: 80n,
          },
        ],
      });
      const second = await createProcessedRefund(h, 30n);
      const secondPending = await ensurePending(h, second.id);
      const secondDecision = await finalizePartialRfv(h, secondPending.id, rv.id, 30n);
      await expect(
        sealRefundStatutoryIssuanceAllocation(h.persistence, {
          decisionId: secondDecision.id,
          lines: [
            {
              sourceFinancialDocumentLineId: rv.lines[0]!.id,
              allocatedTaxableOrBaseAmountPaise: 30n,
            },
          ],
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_ISSUANCE_ALLOCATION_INVALID_INPUT",
      });
    });
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const { rv, decision } = await preparePartialRfv(h, 200n);
      await sealRefundStatutoryIssuanceAllocation(h.persistence, {
        decisionId: decision.id,
        taxComponents: [
          {
            sourceFinancialDocumentTaxComponentId: cgstOf(rv).id,
            allocatedTaxAmountPaise: 200n,
          },
        ],
      });
      const second = await createProcessedRefund(h, 60n);
      const secondPending = await ensurePending(h, second.id);
      const secondDecision = await finalizePartialRfv(h, secondPending.id, rv.id, 60n);
      await expect(
        sealRefundStatutoryIssuanceAllocation(h.persistence, {
          decisionId: secondDecision.id,
          taxComponents: [
            {
              sourceFinancialDocumentTaxComponentId: cgstOf(rv).id,
              allocatedTaxAmountPaise: 60n,
            },
          ],
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_ISSUANCE_ALLOCATION_INVALID_INPUT",
      });
    });
  });

  it("RSIA-10 exact retry and reordered equivalent input return the same allocation; material changes conflict", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const { rv, decision } = await preparePartialRfv(h, 100n);
      const command = balancedPartial(rv, 100n);
      const first = await sealRefundStatutoryIssuanceAllocation(h.persistence, {
        decisionId: decision.id,
        ...command,
      });
      const retry = await sealRefundStatutoryIssuanceAllocation(h.persistence, {
        decisionId: decision.id,
        ...command,
      });
      expect(retry.id).toBe(first.id);
      expect(retry.lines.map((line) => line.id)).toEqual(first.lines.map((line) => line.id));
      const reordered = await sealRefundStatutoryIssuanceAllocation(h.persistence, {
        decisionId: decision.id,
        lines: [...command.lines].reverse(),
        taxComponents: [...command.taxComponents].reverse(),
      });
      expect(reordered.id).toBe(first.id);
      await expect(
        sealRefundStatutoryIssuanceAllocation(h.persistence, {
          decisionId: decision.id,
          lines: [
            {
              sourceFinancialDocumentLineId: command.lines[0]!.sourceFinancialDocumentLineId,
              allocatedTaxableOrBaseAmountPaise: 70n,
            },
          ],
          taxComponents: command.taxComponents,
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_ISSUANCE_ALLOCATION_CONFLICT",
      });
      await expect(
        sealRefundStatutoryIssuanceAllocation(h.persistence, {
          decisionId: decision.id,
          lines: command.lines,
          taxComponents: [
            {
              ...command.taxComponents[0]!,
              allocatedTaxAmountPaise: 5n,
            },
            {
              ...command.taxComponents[1]!,
              allocatedTaxAmountPaise: 15n,
            },
          ],
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_ISSUANCE_ALLOCATION_CONFLICT",
      });
      const foreign = await issueTypedDocument(h, "TAX_INVOICE");
      await expect(
        sealRefundStatutoryIssuanceAllocation(h.persistence, {
          decisionId: decision.id,
          lines: [
            {
              sourceFinancialDocumentLineId: foreign.lines[0]!.id,
              allocatedTaxableOrBaseAmountPaise: 80n,
            },
          ],
          taxComponents: command.taxComponents,
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_ISSUANCE_ALLOCATION_CONFLICT",
      });
    });
  });

  it("RSIA-11 equivalent concurrent allocation converges; conflicting concurrent permits at most one success", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const { rv, decision } = await preparePartialRfv(h, 100n);
      const command = balancedPartial(rv, 100n);
      const [a, b] = await Promise.all([
        sealRefundStatutoryIssuanceAllocation(h.persistence, {
          decisionId: decision.id,
          ...command,
        }),
        sealRefundStatutoryIssuanceAllocation(h.persistence, {
          decisionId: decision.id,
          ...command,
        }),
      ]);
      expect(a.id).toBe(b.id);
      const count = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select count(*)::int as c
          from app.refund_statutory_issuance_allocations
          where refund_statutory_decision_id = ${decision.id}::uuid
        `);
        return rows.rows[0]!.c as number;
      });
      expect(count).toBe(1);
    });
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const { rv, decision } = await preparePartialRfv(h, 100n);
      const command = balancedPartial(rv, 100n);
      const results = await Promise.allSettled([
        sealRefundStatutoryIssuanceAllocation(h.persistence, {
          decisionId: decision.id,
          ...command,
        }),
        sealRefundStatutoryIssuanceAllocation(h.persistence, {
          decisionId: decision.id,
          lines: [
            {
              sourceFinancialDocumentLineId: command.lines[0]!.sourceFinancialDocumentLineId,
              allocatedTaxableOrBaseAmountPaise: 70n,
            },
          ],
          taxComponents: command.taxComponents,
        }),
      ]);
      const ok = results.filter((row) => row.status === "fulfilled");
      const fail = results.filter((row) => row.status === "rejected");
      expect(ok).toHaveLength(1);
      expect(fail).toHaveLength(1);
      const lineCount = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select count(*)::int as c
          from app.refund_statutory_issuance_allocation_lines l
          join app.refund_statutory_issuance_allocations a on a.id = l.allocation_id
          where a.refund_statutory_decision_id = ${decision.id}::uuid
        `);
        return rows.rows[0]!.c as number;
      });
      expect(lineCount).toBe(1);
    });
  });

  it("RSIA-12 concurrent unallocated PARTIAL peers fail closed and cannot exceed the line cap", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const rv = await issueTypedDocument(h, "RECEIPT_VOUCHER", twoLineCappedFirst());
      await cancelHarnessOrder(h);
      const first = await createProcessedRefund(h, 80n);
      const second = await createProcessedRefund(h, 80n);
      const firstPending = await ensurePending(h, first.id);
      const secondPending = await ensurePending(h, second.id);
      const firstDecision = await finalizePartialRfv(h, firstPending.id, rv.id, 80n);
      const secondDecision = await finalizePartialRfv(h, secondPending.id, rv.id, 80n);
      const results = await Promise.allSettled([
        sealRefundStatutoryIssuanceAllocation(h.persistence, {
          decisionId: firstDecision.id,
          lines: [
            {
              sourceFinancialDocumentLineId: rv.lines[0]!.id,
              allocatedTaxableOrBaseAmountPaise: 80n,
            },
          ],
        }),
        sealRefundStatutoryIssuanceAllocation(h.persistence, {
          decisionId: secondDecision.id,
          lines: [
            {
              sourceFinancialDocumentLineId: rv.lines[0]!.id,
              allocatedTaxableOrBaseAmountPaise: 80n,
            },
          ],
        }),
      ]);
      const ok = results.filter((row) => row.status === "fulfilled");
      const fail = results.filter((row) => row.status === "rejected");
      expect(ok).toHaveLength(0);
      expect(fail).toHaveLength(2);
      for (const row of fail) {
        expect(row.status).toBe("rejected");
        if (row.status === "rejected") {
          expect(row.reason).toMatchObject({
            code: "CUMULATIVE_COMPONENT_AUTHORITY_INCOMPLETE",
          });
          expect(row.reason).not.toMatchObject({
            code: "REFUND_STATUTORY_ISSUANCE_ALLOCATION_INVALID_INPUT",
          });
        }
      }
      const used = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select coalesce(sum(l.allocated_taxable_or_base_amount_paise), 0)::bigint as used
          from app.refund_statutory_issuance_allocation_lines l
          where l.source_financial_document_line_id = ${rv.lines[0]!.id}::uuid
        `);
        return BigInt(String(rows.rows[0]!.used));
      });
      expect(used).toBe(0n);
      expect(used <= 100n).toBe(true);
    });
  });

  it("RSIA-13 forced failure after child inserts rolls back parent and children", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const { rv, decision } = await preparePartialRfv(h, 100n);
      await expect(
        sealRefundStatutoryIssuanceAllocation(
          h.persistence,
          { decisionId: decision.id, ...balancedPartial(rv, 100n) },
          {
            afterChildInserts: () => {
              throw new Error("forced Slice 3A persistence failure");
            },
          },
        ),
      ).rejects.toThrow(/forced Slice 3A persistence failure/);
      const leftover = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select
            (select count(*)::int from app.refund_statutory_issuance_allocations
              where refund_statutory_decision_id = ${decision.id}::uuid) as parents,
            (select count(*)::int from app.refund_statutory_issuance_allocation_lines l
              join app.refund_statutory_issuance_allocations a on a.id = l.allocation_id
              where a.refund_statutory_decision_id = ${decision.id}::uuid) as lines,
            (select count(*)::int from app.refund_statutory_issuance_allocation_tax_components t
              join app.refund_statutory_issuance_allocations a on a.id = t.allocation_id
              where a.refund_statutory_decision_id = ${decision.id}::uuid) as taxes
        `);
        return rows.rows[0] as { parents: number; lines: number; taxes: number };
      });
      expect(leftover.parents).toBe(0);
      expect(leftover.lines).toBe(0);
      expect(leftover.taxes).toBe(0);
    });
  });

  it("RSIA-14 sealed allocation parent, lines, and tax components cannot mutate or delete", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const { rv, decision } = await preparePartialRfv(h, 100n);
      const sealed = await sealRefundStatutoryIssuanceAllocation(
        h.persistence,
        { decisionId: decision.id, ...balancedPartial(rv, 100n) },
      );
      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              update app.refund_statutory_issuance_allocations
              set source_document_type = 'TAX_INVOICE'
              where id = ${sealed.id}::uuid
            `),
          ),
        /immutable/i,
      );
      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              update app.refund_statutory_issuance_allocation_lines
              set allocated_taxable_or_base_amount_paise = 1
              where allocation_id = ${sealed.id}::uuid
            `),
          ),
        /immutable/i,
      );
      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              update app.refund_statutory_issuance_allocation_tax_components
              set allocated_tax_amount_paise = 1
              where allocation_id = ${sealed.id}::uuid
            `),
          ),
        /immutable/i,
      );
      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              delete from app.refund_statutory_issuance_allocations
              where id = ${sealed.id}::uuid
            `),
          ),
        /immutable|permission denied|must be owner/i,
      );
      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              delete from app.refund_statutory_decisions
              where id = ${decision.id}::uuid
            `),
          ),
        /cannot be deleted|immutable|permission denied|must be owner/i,
      );
    });
  });

  it("RSIA-15 Slice 3A does not issue FinancialDocument, change decision/Refund/Payment/Order, or sign", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const { rv, refund, decision } = await preparePartialRfv(h, 100n);
      const before = await commercialSnapshot(h, refund.id);
      const beforeFd = await countTable(h, "financial_documents");
      const beforeSig = await countTable(h, "signature_artifacts");
      await sealRefundStatutoryIssuanceAllocation(
        h.persistence,
        { decisionId: decision.id, ...balancedPartial(rv, 100n) },
      );
      expect(await commercialSnapshot(h, refund.id)).toEqual(before);
      expect(await countTable(h, "financial_documents")).toBe(beforeFd);
      expect(await countTable(h, "signature_artifacts")).toBe(beforeSig);
      const still = await h.persistence.withContext((ctx) =>
        loadRefundStatutoryDecisionById(ctx, decision.id),
      );
      expect(still?.status).toBe("BRANCH_FINALIZED");
      expect(still?.issuedFinancialDocumentId).toBeNull();
    });
  });

  it("RSIA-16 remainder amounts stay integer paise with no floating-point split", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const { rv, decision } = await preparePartialRfv(h, 1n);
      const sealed = await sealRefundStatutoryIssuanceAllocation(h.persistence, {
        decisionId: decision.id,
        lines: [
          {
            sourceFinancialDocumentLineId: rv.lines[0]!.id,
            allocatedTaxableOrBaseAmountPaise: 1n,
          },
        ],
      });
      expect(sealed.sealedReversalAmountPaise).toBe(1n);
      expect(sealed.lines[0]?.allocatedTaxableOrBaseAmountPaise).toBe(1n);
      expect(typeof sealed.lines[0]?.allocatedTaxableOrBaseAmountPaise).toBe("bigint");
    });
  });

  it("RSIA-17 other PARTIAL without allocation fails closed and is not treated as zero consumption", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const rv = await issueTypedDocument(h, "RECEIPT_VOUCHER");
      await cancelHarnessOrder(h);
      const first = await createProcessedRefund(h, 80n);
      const second = await createProcessedRefund(h, 30n);
      const firstPending = await ensurePending(h, first.id);
      const secondPending = await ensurePending(h, second.id);
      const firstDecision = await finalizePartialRfv(h, firstPending.id, rv.id, 80n);
      const secondDecision = await finalizePartialRfv(h, secondPending.id, rv.id, 30n);
      const beforeFd = await countTable(h, "financial_documents");
      const beforeSig = await countTable(h, "signature_artifacts");
      await expect(
        sealRefundStatutoryIssuanceAllocation(h.persistence, {
          decisionId: secondDecision.id,
          ...balancedPartial(rv, 30n),
        }),
      ).rejects.toMatchObject({
        code: "CUMULATIVE_COMPONENT_AUTHORITY_INCOMPLETE",
      });
      await expect(
        sealRefundStatutoryIssuanceAllocation(h.persistence, {
          decisionId: firstDecision.id,
          ...balancedPartial(rv, 80n),
        }),
      ).rejects.toMatchObject({
        code: "CUMULATIVE_COMPONENT_AUTHORITY_INCOMPLETE",
      });
      const allocationCount = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select count(*)::int as c
          from app.refund_statutory_issuance_allocations
          where source_financial_document_id = ${rv.id}::uuid
        `);
        return rows.rows[0]!.c as number;
      });
      expect(allocationCount).toBe(0);
      expect(await countTable(h, "financial_documents")).toBe(beforeFd);
      expect(await countTable(h, "signature_artifacts")).toBe(beforeSig);
    });
  });

  it("RSIA-18 current decision may seal; remaining capacity uses actual line and tax consumption", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const { rv, decision } = await preparePartialRfv(h, 80n);
      const first = await sealRefundStatutoryIssuanceAllocation(h.persistence, {
        decisionId: decision.id,
        ...balancedPartial(rv, 80n),
      });
      expect(first.refundStatutoryDecisionId).toBe(decision.id);
      const second = await createProcessedRefund(h, 100n);
      const secondPending = await ensurePending(h, second.id);
      const secondDecision = await finalizePartialRfv(h, secondPending.id, rv.id, 100n);
      const next = await sealRefundStatutoryIssuanceAllocation(h.persistence, {
        decisionId: secondDecision.id,
        ...balancedPartial(rv, 100n),
      });
      expect(next.refundStatutoryDecisionId).toBe(secondDecision.id);
      const lineUsed =
        first.lines[0]!.allocatedTaxableOrBaseAmountPaise +
        next.lines[0]!.allocatedTaxableOrBaseAmountPaise;
      expect(lineUsed <= rv.lines[0]!.taxableValuePaise).toBe(true);
    });
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const rv = await issueTypedDocument(h, "RECEIPT_VOUCHER", twoLineCappedFirst());
      await cancelHarnessOrder(h);
      const first = await createProcessedRefund(h, 80n);
      const firstPending = await ensurePending(h, first.id);
      const firstDecision = await finalizePartialRfv(h, firstPending.id, rv.id, 80n);
      await sealRefundStatutoryIssuanceAllocation(h.persistence, {
        decisionId: firstDecision.id,
        lines: [
          {
            sourceFinancialDocumentLineId: rv.lines[0]!.id,
            allocatedTaxableOrBaseAmountPaise: 80n,
          },
        ],
      });
      const second = await createProcessedRefund(h, 20n);
      const secondPending = await ensurePending(h, second.id);
      const secondDecision = await finalizePartialRfv(h, secondPending.id, rv.id, 20n);
      const remainder = await sealRefundStatutoryIssuanceAllocation(h.persistence, {
        decisionId: secondDecision.id,
        lines: [
          {
            sourceFinancialDocumentLineId: rv.lines[0]!.id,
            allocatedTaxableOrBaseAmountPaise: 20n,
          },
        ],
      });
      expect(remainder.lines[0]?.allocatedTaxableOrBaseAmountPaise).toBe(20n);
    });
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const { rv, decision } = await preparePartialRfv(h, 200n);
      await sealRefundStatutoryIssuanceAllocation(h.persistence, {
        decisionId: decision.id,
        taxComponents: [
          {
            sourceFinancialDocumentTaxComponentId: cgstOf(rv).id,
            allocatedTaxAmountPaise: 200n,
          },
        ],
      });
      const second = await createProcessedRefund(h, 50n);
      const secondPending = await ensurePending(h, second.id);
      const secondDecision = await finalizePartialRfv(h, secondPending.id, rv.id, 50n);
      const remainder = await sealRefundStatutoryIssuanceAllocation(h.persistence, {
        decisionId: secondDecision.id,
        taxComponents: [
          {
            sourceFinancialDocumentTaxComponentId: cgstOf(rv).id,
            allocatedTaxAmountPaise: 50n,
          },
        ],
      });
      expect(remainder.taxComponents[0]?.allocatedTaxAmountPaise).toBe(50n);
    });
  });

  it("RSIA-19 FULL reversal consumes complete source component authority", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const rv = await issueTypedDocument(h, "RECEIPT_VOUCHER", untaxedLines(100n));
      await cancelHarnessOrder(h);
      const fullRefund = await createProcessedRefund(h, rv.grandTotalPaise);
      const fullPending = await ensurePending(h, fullRefund.id);
      await finalizeRefundStatutoryDecision(h.persistence, {
        ...actor(h),
        decisionId: fullPending.id,
        disposition: "REFUND_VOUCHER",
        priorReceiptVoucherId: rv.id,
        noSupplyAuthorityKind: "ORDER_CANCELLED",
        reversalScope: "FULL",
      });
      const partialRefund = await createProcessedRefund(h, 30n);
      const partialPending = await ensurePending(h, partialRefund.id);
      await h.persistence.transaction((tx) =>
        sealRefundStatutoryDecisionBranch(tx, {
          id: partialPending.id,
          now: new Date(),
          actorKind: "workforce",
          actorId: h.workforce.supportUser.id,
          authority: {
            disposition: "REFUND_VOUCHER",
            sealedPriorReceiptVoucherId: rv.id,
            sealedPriorTaxInvoiceId: null,
            sealedSection34QualificationCode: null,
            sealedSection34QualificationFacts: null,
            sealedReversalScope: "PARTIAL",
            sealedReversalAmountPaise: 30n,
            sealedAllocationAuthority: canonicalAllocationAuthorityJson({
              sourceFinancialDocumentId: rv.id,
              allocatedAmountPaise: 30n,
            }),
            sealedNoSupplyAuthorityKind: "ORDER_CANCELLED",
            sealedNoStatutoryDocumentReasonCode: null,
            sealedNoStatutoryDocumentRationale: null,
            sealedReferencedCommercialFactRefs: null,
          },
        }),
      );
      await expect(
        sealRefundStatutoryIssuanceAllocation(h.persistence, {
          decisionId: partialPending.id,
          lines: [
            {
              sourceFinancialDocumentLineId: rv.lines[0]!.id,
              allocatedTaxableOrBaseAmountPaise: 30n,
            },
          ],
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_ISSUANCE_ALLOCATION_INVALID_INPUT",
      });
    });
  });

  it("RSIA-20 concurrent Slice 2 finalization and Slice 3A allocation cannot bypass source caps", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const rv = await issueTypedDocument(h, "RECEIPT_VOUCHER", twoLineCappedFirst());
      await cancelHarnessOrder(h);
      const first = await createProcessedRefund(h, 80n);
      const second = await createProcessedRefund(h, 80n);
      const firstPending = await ensurePending(h, first.id);
      const secondPending = await ensurePending(h, second.id);
      const firstDecision = await finalizePartialRfv(h, firstPending.id, rv.id, 80n);
      const results = await Promise.allSettled([
        sealRefundStatutoryIssuanceAllocation(h.persistence, {
          decisionId: firstDecision.id,
          lines: [
            {
              sourceFinancialDocumentLineId: rv.lines[0]!.id,
              allocatedTaxableOrBaseAmountPaise: 80n,
            },
          ],
        }),
        (async () => {
          await finalizePartialRfv(h, secondPending.id, rv.id, 80n);
          return sealRefundStatutoryIssuanceAllocation(h.persistence, {
            decisionId: secondPending.id,
            lines: [
              {
                sourceFinancialDocumentLineId: rv.lines[0]!.id,
                allocatedTaxableOrBaseAmountPaise: 80n,
              },
            ],
          });
        })(),
      ]);
      const ok = results.filter((row) => row.status === "fulfilled");
      expect(ok.length).toBeLessThanOrEqual(1);
      const used = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select coalesce(sum(l.allocated_taxable_or_base_amount_paise), 0)::bigint as used
          from app.refund_statutory_issuance_allocation_lines l
          where l.source_financial_document_line_id = ${rv.lines[0]!.id}::uuid
        `);
        return BigInt(String(rows.rows[0]!.used));
      });
      expect(used <= 100n).toBe(true);
    });
  });

  it("RSIA-21 NO_STATUTORY_DOCUMENT citing the source does not count as unknown PARTIAL consumption", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const ti = await issueTypedDocument(h, "TAX_INVOICE");
      expect(h.paymentId).toBeTruthy();
      const paymentId = h.paymentId!;
      const nsdRefund = await createProcessedRefund(h, 50n);
      const nsdPending = await ensurePending(h, nsdRefund.id);
      await finalizeRefundStatutoryDecision(h.persistence, {
        ...actor(h),
        decisionId: nsdPending.id,
        disposition: "NO_STATUTORY_DOCUMENT",
        priorTaxInvoiceId: ti.id,
        noStatutoryDocumentReasonCode: "COMMERCIAL_REFUND_NO_GST_STATUTORY_ADJUSTMENT",
        noStatutoryDocumentRationale:
          "Operator cites this processed refund, its payment, and the relevant Tax Invoice as a commercial goodwill adjustment outside RFV/CN issuance.",
        referencedCommercialFactRefs: [
          { kind: "refund", id: nsdRefund.id },
          { kind: "payment", id: paymentId },
          { kind: "financial_document", id: ti.id },
        ],
      });
      const cnRefund = await createProcessedRefund(h, 100n);
      const cnPending = await ensurePending(h, cnRefund.id);
      const cnDecision = await finalizePartialCn(h, cnPending.id, ti.id, 100n);
      const sealed = await sealRefundStatutoryIssuanceAllocation(h.persistence, {
        decisionId: cnDecision.id,
        ...balancedPartial(ti, 100n),
      });
      expect(sealed.sourceFinancialDocumentId).toBe(ti.id);
      expect(sealed.refundStatutoryDecisionId).toBe(cnDecision.id);
    });
  });
});
