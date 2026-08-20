/**
 * IMP-028 D-366 final — atomic RFV/CN FinancialDocument issuance.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import {
  insertNumberingSeries,
  issueFinancialDocument,
  loadFinancialDocument,
} from "../../src/server/financial-document";
import {
  ensureRefundStatutoryDecisionPending,
  finalizeRefundStatutoryDecision,
  issueRefundStatutoryReversal,
  loadRefundStatutoryDecisionById,
} from "../../src/server/refund-statutory-decision";
import { sealRefundStatutoryIssuanceAllocation } from "../../src/server/refund-statutory-issuance-allocation";
import { cancelOrder } from "../../src/server/order";
import { requestRefund } from "../../src/server/refund";
import {
  deriveIndianFinancialYear,
  resolveSignatureRequirementForDocumentType,
  type FinancialDocument,
} from "../../src/shared/financial-document";
import { taxExclusivePaise } from "../../src/shared/pricing/money";
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

function untaxedLines(grand: bigint) {
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

function taxedLines() {
  return [
    {
      lineNumber: 1,
      description: "Sealed source line",
      quantity: 1,
      unitPaise: BigInt(10000),
      discountPaise: BigInt(0),
      chargePaise: BigInt(0),
      taxableValuePaise: BigInt(10000),
      sacCode: "9983",
      taxComponents: [
        {
          taxType: "cgst" as const,
          rateBps: 250,
          taxableAmountPaise: BigInt(10000),
          taxAmountPaise: BigInt(250),
        },
        {
          taxType: "sgst" as const,
          rateBps: 250,
          taxableAmountPaise: BigInt(10000),
          taxAmountPaise: BigInt(250),
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
      reason: "d366 final issuance fixture refund",
    },
    { provider: h.provider, clock: h.clock },
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
      now: h.clock.now(),
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
    | ReturnType<typeof untaxedLines> = taxedLines(),
) {
  const issued = await issueFinancialDocument(
    h.persistence,
    buildIssueCommand(h, {
      documentType,
      lines,
      logicalIssuanceKey: `d366-final-${documentType}-${randomUUID()}`,
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
    now: h.clock.now(),
  };
}

async function seedReversalNumbering(h: FinancialDocumentIssuanceHarness) {
  const financialYear = deriveIndianFinancialYear(h.clock.now());
  const now = h.clock.now();
  return h.persistence.transaction(async (tx) => {
    const refundVoucher = await insertNumberingSeries(tx, {
      legalEntityId: h.legalEntityId,
      documentType: "REFUND_VOUCHER",
      financialYear,
      seriesCode: "RFV26",
      prefix: "RFV/2627/",
      now,
    });
    const creditNote = await insertNumberingSeries(tx, {
      legalEntityId: h.legalEntityId,
      documentType: "CREDIT_NOTE",
      financialYear,
      seriesCode: "CN26",
      prefix: "CN/2627/",
      now,
    });
    return { financialYear, refundVoucher, creditNote };
  });
}

function gstCoherentPartial(doc: FinancialDocument, taxablePaise: bigint) {
  const line = doc.lines[0]!;
  expect(taxablePaise > BigInt(0) && taxablePaise < line.taxableValuePaise).toBe(true);
  const taxComponents = line.taxComponents.map((tax) => ({
    sourceFinancialDocumentTaxComponentId: tax.id,
    allocatedTaxAmountPaise: taxExclusivePaise(taxablePaise, tax.rateBps),
  }));
  const reversalAmountPaise =
    taxablePaise +
    taxComponents.reduce((sum, tax) => sum + tax.allocatedTaxAmountPaise, BigInt(0));
  return {
    lines: [
      {
        sourceFinancialDocumentLineId: line.id,
        allocatedTaxableOrBaseAmountPaise: taxablePaise,
      },
    ],
    taxComponents,
    reversalAmountPaise,
  };
}

async function countTable(h: FinancialDocumentIssuanceHarness, table: string) {
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

async function seriesNextSequence(
  h: FinancialDocumentIssuanceHarness,
  seriesId: string,
) {
  return h.persistence.withContext(async (ctx) => {
    const rows = await ctx.db.execute(sql`
      select next_sequence::text as n
      from app.financial_document_numbering_series
      where id = ${seriesId}::uuid
    `);
    return BigInt(String(rows.rows[0]?.n));
  });
}

async function orphanLineAndTaxCounts(h: FinancialDocumentIssuanceHarness) {
  return h.persistence.withContext(async (ctx) => {
    const lines = await ctx.db.execute(sql`
      select count(*)::int as c
      from app.financial_document_lines l
      left join app.financial_documents d on d.id = l.financial_document_id
      where d.id is null
    `);
    const taxes = await ctx.db.execute(sql`
      select count(*)::int as c
      from app.financial_document_line_tax_components t
      left join app.financial_document_lines l on l.id = t.financial_document_line_id
      where l.id is null
    `);
    return {
      orphanLines: lines.rows[0]!.c as number,
      orphanTaxes: taxes.rows[0]!.c as number,
    };
  });
}

function expectCopiedSourceArithmetic(
  issued: FinancialDocument,
  source: FinancialDocument,
) {
  expect(issued.taxableTotalPaise).toBe(source.taxableTotalPaise);
  expect(issued.taxTotalPaise).toBe(source.taxTotalPaise);
  expect(issued.discountTotalPaise).toBe(source.discountTotalPaise);
  expect(issued.chargeTotalPaise).toBe(source.chargeTotalPaise);
  expect(issued.grandTotalPaise).toBe(source.grandTotalPaise);
  expect(issued.lines).toHaveLength(source.lines.length);
  for (let i = 0; i < source.lines.length; i += 1) {
    const left = issued.lines[i]!;
    const right = source.lines[i]!;
    expect(left.lineNumber).toBe(right.lineNumber);
    expect(left.description).toBe(right.description);
    expect(left.quantity).toBe(right.quantity);
    expect(left.unitPaise).toBe(right.unitPaise);
    expect(left.discountPaise).toBe(right.discountPaise);
    expect(left.chargePaise).toBe(right.chargePaise);
    expect(left.taxableValuePaise).toBe(right.taxableValuePaise);
    expect(left.lineTotalPaise).toBe(right.lineTotalPaise);
    expect(left.sacCode).toBe(right.sacCode);
    expect(left.hsnCode).toBe(right.hsnCode);
    expect(left.taxComponents).toHaveLength(right.taxComponents.length);
    for (let j = 0; j < right.taxComponents.length; j += 1) {
      expect(left.taxComponents[j]!.taxType).toBe(right.taxComponents[j]!.taxType);
      expect(left.taxComponents[j]!.rateBps).toBe(right.taxComponents[j]!.rateBps);
      expect(left.taxComponents[j]!.taxableAmountPaise).toBe(
        right.taxComponents[j]!.taxableAmountPaise,
      );
      expect(left.taxComponents[j]!.taxAmountPaise).toBe(
        right.taxComponents[j]!.taxAmountPaise,
      );
    }
  }
}

function expectCopiedAllocationArithmetic(
  issued: FinancialDocument,
  source: FinancialDocument,
  taxablePaise: bigint,
) {
  const sourceLine = source.lines[0]!;
  expect(issued.lines).toHaveLength(1);
  const line = issued.lines[0]!;
  expect(line.lineNumber).toBe(sourceLine.lineNumber);
  expect(line.description).toBe(sourceLine.description);
  expect(line.quantity).toBe(1);
  expect(line.unitPaise).toBe(taxablePaise);
  expect(line.taxableValuePaise).toBe(taxablePaise);
  expect(line.taxComponents).toHaveLength(sourceLine.taxComponents.length);
  let taxTotal = BigInt(0);
  for (const sourceTax of sourceLine.taxComponents) {
    const issuedTax = line.taxComponents.find(
      (row) => row.taxType === sourceTax.taxType,
    );
    expect(issuedTax).toBeTruthy();
    const expectedTax = taxExclusivePaise(taxablePaise, sourceTax.rateBps);
    expect(issuedTax!.rateBps).toBe(sourceTax.rateBps);
    expect(issuedTax!.taxableAmountPaise).toBe(taxablePaise);
    expect(issuedTax!.taxAmountPaise).toBe(expectedTax);
    taxTotal += expectedTax;
  }
  expect(issued.taxableTotalPaise).toBe(taxablePaise);
  expect(issued.taxTotalPaise).toBe(taxTotal);
  expect(issued.grandTotalPaise).toBe(taxablePaise + taxTotal);
}

describe("IMP-028 D-366 final atomic RFV/CN issuance", () => {
  it("RSI-01 FULL RFV issues exact REFUND_VOUCHER from sealed prior RV", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const series = await seedReversalNumbering(h);
      const rv = await issueTypedDocument(h, "RECEIPT_VOUCHER", taxedLines());
      await cancelHarnessOrder(h);
      const refund = await createProcessedRefund(h, rv.grandTotalPaise);
      const pending = await ensurePending(h, refund.id);
      const finalized = await finalizeRefundStatutoryDecision(h.persistence, {
        ...actor(h),
        decisionId: pending.id,
        disposition: "REFUND_VOUCHER",
        priorReceiptVoucherId: rv.id,
        noSupplyAuthorityKind: "ORDER_CANCELLED",
        reversalScope: "FULL",
      });
      const beforeCommercial = await commercialSnapshot(h, refund.id);
      const beforeSig = await countTable(h, "signature_artifacts");
      const beforeFd = await countTable(h, "financial_documents");

      const result = await issueRefundStatutoryReversal(h.persistence, {
        decisionId: finalized.id,
        now: h.clock.now(),
      });

      expect(result.decision.status).toBe("ISSUED");
      expect(result.decision.disposition).toBe("REFUND_VOUCHER");
      expect(result.financialDocument.documentType).toBe("REFUND_VOUCHER");
      expect(result.financialDocument.logicalIssuanceKey).toBe(
        `refund:${refund.id}:STATUTORY_REVERSAL`,
      );
      expect(result.financialDocument.priorFinancialDocumentId).toBe(rv.id);
      expect(result.financialDocument.priorDocumentType).toBe("RECEIPT_VOUCHER");
      expect(result.financialDocument.refundId).toBe(refund.id);
      expect(result.financialDocument.financialYear).toBe(series.financialYear);
      expectCopiedSourceArithmetic(result.financialDocument, rv);
      expect(result.decision.issuedFinancialDocumentId).toBe(
        result.financialDocument.id,
      );
      expect(result.decision.issuedAt?.getTime()).toBe(
        result.financialDocument.issueAt.getTime(),
      );
      expect(result.decision.issuedAt?.getTime()).toBe(h.clock.now().getTime());
      expect(await countTable(h, "financial_documents")).toBe(beforeFd + 1);
      expect(await countTable(h, "signature_artifacts")).toBe(beforeSig);
      expect(
        resolveSignatureRequirementForDocumentType("REFUND_VOUCHER"),
      ).toBe("REQUIRED");
      expect(await commercialSnapshot(h, refund.id)).toEqual(beforeCommercial);
    });
  });

  it("RSI-02 PARTIAL RFV uses exact Slice 3A allocation arithmetic", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      await seedReversalNumbering(h);
      const rv = await issueTypedDocument(h, "RECEIPT_VOUCHER", taxedLines());
      await cancelHarnessOrder(h);
      const partial = gstCoherentPartial(rv, BigInt(4000));
      const refund = await createProcessedRefund(h, partial.reversalAmountPaise);
      const pending = await ensurePending(h, refund.id);
      const finalized = await finalizeRefundStatutoryDecision(h.persistence, {
        ...actor(h),
        decisionId: pending.id,
        disposition: "REFUND_VOUCHER",
        priorReceiptVoucherId: rv.id,
        noSupplyAuthorityKind: "ORDER_CANCELLED",
        reversalScope: "PARTIAL",
        allocationAuthority: {
          sourceFinancialDocumentId: rv.id,
          allocatedAmountPaise: partial.reversalAmountPaise,
        },
      });
      await sealRefundStatutoryIssuanceAllocation(h.persistence, {
        decisionId: finalized.id,
        lines: partial.lines,
        taxComponents: partial.taxComponents,
      });

      const result = await issueRefundStatutoryReversal(h.persistence, {
        decisionId: finalized.id,
        now: h.clock.now(),
      });

      expect(result.financialDocument.documentType).toBe("REFUND_VOUCHER");
      expectCopiedAllocationArithmetic(result.financialDocument, rv, BigInt(4000));
      expect(result.financialDocument.grandTotalPaise).toBe(
        partial.reversalAmountPaise,
      );
      expect(result.decision.issuedFinancialDocumentId).toBe(
        result.financialDocument.id,
      );
    });
  });

  it("RSI-03 FULL CN issues exact CREDIT_NOTE from sealed prior TI", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      await seedReversalNumbering(h);
      const ti = await issueTypedDocument(h, "TAX_INVOICE", taxedLines());
      const refund = await createProcessedRefund(h, ti.grandTotalPaise);
      const pending = await ensurePending(h, refund.id);
      const finalized = await finalizeRefundStatutoryDecision(h.persistence, {
        ...actor(h),
        decisionId: pending.id,
        disposition: "CREDIT_NOTE",
        priorTaxInvoiceId: ti.id,
        section34QualificationCode: "TAXABLE_VALUE_OR_TAX_EXCEEDS_PAYABLE",
        section34QualificationFacts: { priorTaxInvoiceId: ti.id },
        reversalScope: "FULL",
      });
      const beforeCommercial = await commercialSnapshot(h, refund.id);

      const result = await issueRefundStatutoryReversal(h.persistence, {
        decisionId: finalized.id,
        now: h.clock.now(),
      });

      expect(result.decision.disposition).toBe("CREDIT_NOTE");
      expect(result.financialDocument.documentType).toBe("CREDIT_NOTE");
      expect(result.financialDocument.priorFinancialDocumentId).toBe(ti.id);
      expect(result.financialDocument.priorDocumentType).toBe("TAX_INVOICE");
      expectCopiedSourceArithmetic(result.financialDocument, ti);
      expect(result.decision.issuedFinancialDocumentId).toBe(
        result.financialDocument.id,
      );
      expect(
        resolveSignatureRequirementForDocumentType("CREDIT_NOTE"),
      ).toBe("REQUIRED");
      expect(await commercialSnapshot(h, refund.id)).toEqual(beforeCommercial);
    });
  });

  it("RSI-04 PARTIAL CN uses exact Slice 3A allocation arithmetic", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      await seedReversalNumbering(h);
      const ti = await issueTypedDocument(h, "TAX_INVOICE", taxedLines());
      const partial = gstCoherentPartial(ti, BigInt(4000));
      const refund = await createProcessedRefund(h, partial.reversalAmountPaise);
      const pending = await ensurePending(h, refund.id);
      const finalized = await finalizeRefundStatutoryDecision(h.persistence, {
        ...actor(h),
        decisionId: pending.id,
        disposition: "CREDIT_NOTE",
        priorTaxInvoiceId: ti.id,
        section34QualificationCode: "TAXABLE_VALUE_OR_TAX_EXCEEDS_PAYABLE",
        section34QualificationFacts: { priorTaxInvoiceId: ti.id },
        reversalScope: "PARTIAL",
        allocationAuthority: {
          sourceFinancialDocumentId: ti.id,
          allocatedAmountPaise: partial.reversalAmountPaise,
        },
      });
      await sealRefundStatutoryIssuanceAllocation(h.persistence, {
        decisionId: finalized.id,
        lines: partial.lines,
        taxComponents: partial.taxComponents,
      });

      const result = await issueRefundStatutoryReversal(h.persistence, {
        decisionId: finalized.id,
        now: h.clock.now(),
      });

      expect(result.financialDocument.documentType).toBe("CREDIT_NOTE");
      expectCopiedAllocationArithmetic(result.financialDocument, ti, BigInt(4000));
      expect(result.financialDocument.priorFinancialDocumentId).toBe(ti.id);
    });
  });

  it("RSI-05 PARTIAL without allocation fails closed", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      await seedReversalNumbering(h);
      const rv = await issueTypedDocument(h, "RECEIPT_VOUCHER", taxedLines());
      await cancelHarnessOrder(h);
      const refund = await createProcessedRefund(h, BigInt(4200));
      const pending = await ensurePending(h, refund.id);
      const finalized = await finalizeRefundStatutoryDecision(h.persistence, {
        ...actor(h),
        decisionId: pending.id,
        disposition: "REFUND_VOUCHER",
        priorReceiptVoucherId: rv.id,
        noSupplyAuthorityKind: "ORDER_CANCELLED",
        reversalScope: "PARTIAL",
        allocationAuthority: {
          sourceFinancialDocumentId: rv.id,
          allocatedAmountPaise: BigInt(4200),
        },
      });
      const beforeFd = await countTable(h, "financial_documents");
      await expect(
        issueRefundStatutoryReversal(h.persistence, {
          decisionId: finalized.id,
          now: h.clock.now(),
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_ISSUANCE_ALLOCATION_REQUIRED",
      });
      const reloaded = await h.persistence.withContext((ctx) =>
        loadRefundStatutoryDecisionById(ctx, finalized.id),
      );
      expect(reloaded?.status).toBe("BRANCH_FINALIZED");
      expect(reloaded?.issuedFinancialDocumentId).toBeNull();
      expect(await countTable(h, "financial_documents")).toBe(beforeFd);
    });
  });

  it("RSI-06 RFV/CN prior types are the sealed RV/TI; NSD and PENDING cannot issue", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      await seedReversalNumbering(h);
      const rv = await issueTypedDocument(h, "RECEIPT_VOUCHER", untaxedLines(BigInt(100)));
      await cancelHarnessOrder(h);

      const rfvRefund = await createProcessedRefund(h, BigInt(100));
      const rfvPending = await ensurePending(h, rfvRefund.id);
      await expect(
        issueRefundStatutoryReversal(h.persistence, {
          decisionId: rfvPending.id,
          now: h.clock.now(),
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_DECISION_NOT_ELIGIBLE",
        field: "status",
      });
      const rfvFinal = await finalizeRefundStatutoryDecision(h.persistence, {
        ...actor(h),
        decisionId: rfvPending.id,
        disposition: "REFUND_VOUCHER",
        priorReceiptVoucherId: rv.id,
        noSupplyAuthorityKind: "ORDER_CANCELLED",
        reversalScope: "FULL",
      });
      const rfv = await issueRefundStatutoryReversal(h.persistence, {
        decisionId: rfvFinal.id,
        now: h.clock.now(),
      });
      expect(rfv.financialDocument.priorFinancialDocumentId).toBe(rv.id);
      expect(rfv.financialDocument.priorDocumentType).toBe("RECEIPT_VOUCHER");

      const ti = await issueTypedDocument(h, "TAX_INVOICE", untaxedLines(BigInt(100)));
      expect(rfv.financialDocument.priorFinancialDocumentId).not.toBe(ti.id);

      const cnRefund = await createProcessedRefund(h, BigInt(100));
      const cnPending = await ensurePending(h, cnRefund.id);
      const cnFinal = await finalizeRefundStatutoryDecision(h.persistence, {
        ...actor(h),
        decisionId: cnPending.id,
        disposition: "CREDIT_NOTE",
        priorTaxInvoiceId: ti.id,
        section34QualificationCode: "TAXABLE_VALUE_OR_TAX_EXCEEDS_PAYABLE",
        section34QualificationFacts: { priorTaxInvoiceId: ti.id },
        reversalScope: "FULL",
      });
      const cn = await issueRefundStatutoryReversal(h.persistence, {
        decisionId: cnFinal.id,
        now: h.clock.now(),
      });
      expect(cn.financialDocument.priorFinancialDocumentId).toBe(ti.id);
      expect(cn.financialDocument.priorDocumentType).toBe("TAX_INVOICE");
      expect(cn.financialDocument.priorFinancialDocumentId).not.toBe(rv.id);

      const nsdRefund = await createProcessedRefund(h, BigInt(50));
      const nsdPending = await ensurePending(h, nsdRefund.id);
      const nsd = await finalizeRefundStatutoryDecision(h.persistence, {
        ...actor(h),
        decisionId: nsdPending.id,
        disposition: "NO_STATUTORY_DOCUMENT",
        priorTaxInvoiceId: ti.id,
        noStatutoryDocumentReasonCode:
          "COMMERCIAL_REFUND_NO_GST_STATUTORY_ADJUSTMENT",
        noStatutoryDocumentRationale:
          "Operator cites this processed refund, its payment, and the relevant Tax Invoice as a commercial goodwill adjustment outside RFV/CN issuance.",
        referencedCommercialFactRefs: [
          { kind: "refund", id: nsdRefund.id },
          { kind: "payment", id: h.paymentId! },
          { kind: "financial_document", id: ti.id },
        ],
      });
      const beforeFd = await countTable(h, "financial_documents");
      await expect(
        issueRefundStatutoryReversal(h.persistence, {
          decisionId: nsd.id,
          now: h.clock.now(),
        }),
      ).rejects.toMatchObject({
        code: "REFUND_STATUTORY_DECISION_NOT_ELIGIBLE",
        field: "disposition",
      });
      const nsdReloaded = await h.persistence.withContext((ctx) =>
        loadRefundStatutoryDecisionById(ctx, nsd.id),
      );
      expect(nsdReloaded?.status).toBe("BRANCH_FINALIZED");
      expect(nsdReloaded?.disposition).toBe("NO_STATUTORY_DOCUMENT");
      expect(nsdReloaded?.issuedFinancialDocumentId).toBeNull();
      expect(await countTable(h, "financial_documents")).toBe(beforeFd);
    });
  });

  it("RSI-07 exact retry is idempotent; concurrent equivalent issuance creates one FD/number", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const series = await seedReversalNumbering(h);
      const rv = await issueTypedDocument(h, "RECEIPT_VOUCHER", untaxedLines(BigInt(100)));
      await cancelHarnessOrder(h);
      const refund = await createProcessedRefund(h, BigInt(100));
      const pending = await ensurePending(h, refund.id);
      const finalized = await finalizeRefundStatutoryDecision(h.persistence, {
        ...actor(h),
        decisionId: pending.id,
        disposition: "REFUND_VOUCHER",
        priorReceiptVoucherId: rv.id,
        noSupplyAuthorityKind: "ORDER_CANCELLED",
        reversalScope: "FULL",
      });
      const command = { decisionId: finalized.id, now: h.clock.now() };
      const [a, b] = await Promise.all([
        issueRefundStatutoryReversal(h.persistence, command),
        issueRefundStatutoryReversal(h.persistence, command),
      ]);
      expect(a.financialDocument.id).toBe(b.financialDocument.id);
      expect(a.financialDocument.statutoryDocumentNumber).toBe(
        b.financialDocument.statutoryDocumentNumber,
      );
      expect(a.decision.status).toBe("ISSUED");
      expect(b.decision.status).toBe("ISSUED");
      expect(a.decision.issuedFinancialDocumentId).toBe(a.financialDocument.id);

      const retry = await issueRefundStatutoryReversal(h.persistence, command);
      expect(retry.financialDocument.id).toBe(a.financialDocument.id);
      expect(retry.financialDocument.statutoryDocumentNumber).toBe(
        a.financialDocument.statutoryDocumentNumber,
      );
      expect(retry.decision.issuedFinancialDocumentId).toBe(
        a.financialDocument.id,
      );

      const stats = await h.persistence.withContext(async (ctx) => {
        const docs = await ctx.db.execute(sql`
          select count(*)::int as c
          from app.financial_documents
          where logical_issuance_key = ${`refund:${refund.id}:STATUTORY_REVERSAL`}
        `);
        const decisions = await ctx.db.execute(sql`
          select count(*)::int as c
          from app.refund_statutory_decisions
          where id = ${finalized.id}::uuid
            and status = 'ISSUED'
        `);
        return {
          docs: docs.rows[0]!.c as number,
          issued: decisions.rows[0]!.c as number,
        };
      });
      expect(stats.docs).toBe(1);
      expect(stats.issued).toBe(1);
      expect(await seriesNextSequence(h, series.refundVoucher.id)).toBe(
        a.financialDocument.sequenceNumber + BigInt(1),
      );

      await expect(
        issueFinancialDocument(
          h.persistence,
          buildIssueCommand(h, {
            documentType: "TAX_INVOICE",
            logicalIssuanceKey: `refund:${refund.id}:STATUTORY_REVERSAL`,
            lines: untaxedLines(BigInt(100)),
          }),
        ),
      ).rejects.toMatchObject({ code: "ISSUANCE_IDEMPOTENCY_CONFLICT" });
    });
  });

  it("RSI-08 rollback after FD issuance leaves BRANCH_FINALIZED and reusable numbering", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const series = await seedReversalNumbering(h);
      const rv = await issueTypedDocument(h, "RECEIPT_VOUCHER", taxedLines());
      await cancelHarnessOrder(h);
      const refund = await createProcessedRefund(h, rv.grandTotalPaise);
      const pending = await ensurePending(h, refund.id);
      const finalized = await finalizeRefundStatutoryDecision(h.persistence, {
        ...actor(h),
        decisionId: pending.id,
        disposition: "REFUND_VOUCHER",
        priorReceiptVoucherId: rv.id,
        noSupplyAuthorityKind: "ORDER_CANCELLED",
        reversalScope: "FULL",
      });
      const beforeSeq = await seriesNextSequence(h, series.refundVoucher.id);
      const beforeFd = await countTable(h, "financial_documents");
      const beforeSig = await countTable(h, "signature_artifacts");
      const beforeCommercial = await commercialSnapshot(h, refund.id);

      await expect(
        issueRefundStatutoryReversal(
          h.persistence,
          { decisionId: finalized.id, now: h.clock.now() },
          {
            afterFinancialDocumentIssued: () => {
              throw new Error("forced issuance failure after document");
            },
          },
        ),
      ).rejects.toThrow(/forced issuance failure after document/);

      const reloaded = await h.persistence.withContext((ctx) =>
        loadRefundStatutoryDecisionById(ctx, finalized.id),
      );
      expect(reloaded?.status).toBe("BRANCH_FINALIZED");
      expect(reloaded?.issuedFinancialDocumentId).toBeNull();
      expect(reloaded?.issuedAt).toBeNull();
      expect(await countTable(h, "financial_documents")).toBe(beforeFd);
      expect(await countTable(h, "signature_artifacts")).toBe(beforeSig);
      expect(await seriesNextSequence(h, series.refundVoucher.id)).toBe(beforeSeq);
      const orphans = await orphanLineAndTaxCounts(h);
      expect(orphans.orphanLines).toBe(0);
      expect(orphans.orphanTaxes).toBe(0);
      expect(await commercialSnapshot(h, refund.id)).toEqual(beforeCommercial);

      const success = await issueRefundStatutoryReversal(h.persistence, {
        decisionId: finalized.id,
        now: h.clock.now(),
      });
      expect(success.decision.status).toBe("ISSUED");
      expect(success.financialDocument.sequenceNumber).toBe(beforeSeq);
      expect(success.financialDocument.documentType).toBe("REFUND_VOUCHER");
      expect(
        resolveSignatureRequirementForDocumentType(
          success.financialDocument.documentType,
        ),
      ).toBe("REQUIRED");
      expect(await countTable(h, "signature_artifacts")).toBe(beforeSig);
    });
  });

  it("RSI-09 no API/UI/CLI/signing/IMP-029 bleed in this slice", () => {
    const issueSrc = readFileSync(
      path.join(process.cwd(), "src/server/refund-statutory-decision/issue.ts"),
      "utf8",
    );
    expect(issueSrc).not.toMatch(/src\/app\/api/);
    expect(issueSrc).not.toMatch(/createServer|listen\(/);
    expect(issueSrc).not.toMatch(/queue|worker|scheduler/i);
    expect(issueSrc).not.toMatch(
      /uploadManualSignedPdf|ensurePendingSignatureArtifact/,
    );
    expect(issueSrc).not.toMatch(/IMP-029/);
    expect(issueSrc).not.toMatch(/DSC|eSign|HSM/);
    const journal = readFileSync(
      path.join(process.cwd(), "drizzle/meta/_journal.json"),
      "utf8",
    );
    expect(journal).toContain("0029_refund_statutory_issuance_allocation");
    expect(journal).not.toContain("0030_");
  });
});
