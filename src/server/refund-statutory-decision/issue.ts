/**
 * Atomic BRANCH_FINALIZED → ISSUED RFV/CN issuance
 * (IMP-028 / D-366 final).
 *
 * Issues FinancialDocument + statutory number + decision ISSUED in one
 * PostgreSQL transaction via existing D-365 issueFinancialDocument.
 * Does not reclassify, infer GST policy, sign, or mutate Refund/Payment/Order.
 */
import {
  FINANCIAL_DOCUMENT_TAX_TYPES,
  deriveIndianFinancialYear,
  type FinancialDocument,
  type FinancialDocumentStatutoryType,
  type FinancialDocumentTaxType,
  type IssueFinancialDocumentCommand,
  type IssueFinancialDocumentLineCommand,
} from "../../shared/financial-document";
import {
  parseIssueRefundStatutoryReversalCommand,
  RefundStatutoryDecisionError,
  type IssueRefundStatutoryReversalCommand,
  type IssueRefundStatutoryReversalResult,
} from "../../shared/refund-statutory-decision";
import type { RefundStatutoryIssuanceAllocation } from "../../shared/refund-statutory-issuance-allocation";
import {
  issueFinancialDocument,
  loadFinancialDocument,
  resolveNumberingSeriesForScope,
} from "../financial-document";
import type {
  Persistence,
  PersistenceTransactionContext,
} from "../persistence/types";
import { loadRefundStatutoryIssuanceAllocationByDecisionId } from "../refund-statutory-issuance-allocation/repository";
import {
  lockRefundStatutoryDecisionForUpdate,
  mapRefundStatutoryDecisionRow,
  sealRefundStatutoryDecisionIssued,
  type RefundStatutoryDecisionRow,
} from "./repository";

export type IssueRefundStatutoryReversalOptions = Readonly<{
  /**
   * Test-only seam: invoked after FinancialDocument issuance and before
   * decision ISSUED seal, inside the same PostgreSQL transaction.
   */
  afterFinancialDocumentIssued?: (
    document: FinancialDocument,
  ) => Promise<void> | void;
}>;

function invalid(message: string, field: string): never {
  throw new RefundStatutoryDecisionError(
    "REFUND_STATUTORY_DECISION_INVALID_INPUT",
    message,
    { field },
  );
}

function notEligible(message: string, field: string): never {
  throw new RefundStatutoryDecisionError(
    "REFUND_STATUTORY_DECISION_NOT_ELIGIBLE",
    message,
    { field },
  );
}

function conflict(message: string): never {
  throw new RefundStatutoryDecisionError(
    "REFUND_STATUTORY_DECISION_IDEMPOTENCY_CONFLICT",
    message,
    { field: "decisionId" },
  );
}

function assertTaxType(value: string): FinancialDocumentTaxType {
  if (!(FINANCIAL_DOCUMENT_TAX_TYPES as readonly string[]).includes(value)) {
    invalid(`Unsupported sealed allocation tax type: ${value}`, "allocation");
  }
  return value as FinancialDocumentTaxType;
}

function expectedDocumentType(
  disposition: string,
): "REFUND_VOUCHER" | "CREDIT_NOTE" {
  if (disposition === "REFUND_VOUCHER") return "REFUND_VOUCHER";
  if (disposition === "CREDIT_NOTE") return "CREDIT_NOTE";
  notEligible(
    `Disposition ${disposition} cannot issue a statutory reversal FinancialDocument.`,
    "disposition",
  );
}

function expectedPriorType(
  documentType: "REFUND_VOUCHER" | "CREDIT_NOTE",
): "RECEIPT_VOUCHER" | "TAX_INVOICE" {
  return documentType === "REFUND_VOUCHER" ? "RECEIPT_VOUCHER" : "TAX_INVOICE";
}

function sealedPriorId(
  decision: RefundStatutoryDecisionRow,
  documentType: "REFUND_VOUCHER" | "CREDIT_NOTE",
): string {
  const priorId =
    documentType === "REFUND_VOUCHER"
      ? decision.sealedPriorReceiptVoucherId
      : decision.sealedPriorTaxInvoiceId;
  if (!priorId) {
    invalid(
      "RefundStatutoryDecision is missing sealed prior FinancialDocument identity.",
      "decisionId",
    );
  }
  return priorId;
}

function linesFromSealedSource(
  source: FinancialDocument,
): IssueFinancialDocumentLineCommand[] {
  return source.lines.map((line) => ({
    lineNumber: line.lineNumber,
    description: line.description,
    quantity: line.quantity,
    unitPaise: line.unitPaise,
    discountPaise: line.discountPaise,
    chargePaise: line.chargePaise,
    taxableValuePaise: line.taxableValuePaise,
    sacCode: line.sacCode,
    hsnCode: line.hsnCode,
    historicalCatalogItemId: line.historicalCatalogItemId,
    taxComponents: line.taxComponents.map((tax) => ({
      taxType: tax.taxType,
      rateBps: tax.rateBps,
      taxableAmountPaise: tax.taxableAmountPaise,
      taxAmountPaise: tax.taxAmountPaise,
    })),
  }));
}

function linesFromSealedAllocation(
  source: FinancialDocument,
  allocation: RefundStatutoryIssuanceAllocation,
): IssueFinancialDocumentLineCommand[] {
  if (allocation.sourceFinancialDocumentId !== source.id) {
    invalid(
      "Sealed PARTIAL allocation source FinancialDocument does not match sealed prior authority.",
      "allocation",
    );
  }
  const sourceById = new Map(source.lines.map((line) => [line.id, line]));
  const allocatedByLine = new Map(
    allocation.lines.map((line) => [line.sourceFinancialDocumentLineId, line]),
  );
  const taxesByLine = new Map<
    string,
    RefundStatutoryIssuanceAllocation["taxComponents"]
  >();
  for (const tax of allocation.taxComponents) {
    const existing = taxesByLine.get(tax.sourceFinancialDocumentLineId);
    if (existing) {
      taxesByLine.set(tax.sourceFinancialDocumentLineId, [...existing, tax]);
    } else {
      taxesByLine.set(tax.sourceFinancialDocumentLineId, [tax]);
    }
  }

  for (const lineId of taxesByLine.keys()) {
    if (!allocatedByLine.has(lineId)) {
      invalid(
        "PARTIAL allocation tax components require a sealed taxable allocation on the same source line.",
        "allocation",
      );
    }
  }

  const commands: IssueFinancialDocumentLineCommand[] = [];
  const orderedSource = [...source.lines].sort(
    (left, right) => left.lineNumber - right.lineNumber,
  );
  for (const sourceLine of orderedSource) {
    const allocated = allocatedByLine.get(sourceLine.id);
    if (!allocated) {
      continue;
    }
    if (!sourceById.has(sourceLine.id)) {
      invalid(
        "PARTIAL allocation line does not belong to the sealed source FinancialDocument.",
        "allocation",
      );
    }
    const taxes = taxesByLine.get(sourceLine.id) ?? [];
    commands.push({
      lineNumber: sourceLine.lineNumber,
      description: sourceLine.description,
      quantity: 1,
      unitPaise: allocated.allocatedTaxableOrBaseAmountPaise,
      discountPaise: BigInt(0),
      chargePaise: BigInt(0),
      taxableValuePaise: allocated.allocatedTaxableOrBaseAmountPaise,
      sacCode: sourceLine.sacCode,
      hsnCode: sourceLine.hsnCode,
      historicalCatalogItemId: sourceLine.historicalCatalogItemId,
      taxComponents: taxes.map((tax) => ({
        taxType: assertTaxType(tax.taxType),
        rateBps: tax.taxRateBps,
        taxableAmountPaise: allocated.allocatedTaxableOrBaseAmountPaise,
        taxAmountPaise: tax.allocatedTaxAmountPaise,
      })),
    });
  }
  if (commands.length === 0) {
    invalid(
      "PARTIAL allocation did not yield any FinancialDocument lines.",
      "allocation",
    );
  }
  return commands;
}

async function returnIssued(
  tx: PersistenceTransactionContext,
  decision: RefundStatutoryDecisionRow,
  expectedType: FinancialDocumentStatutoryType,
): Promise<IssueRefundStatutoryReversalResult> {
  if (!decision.issuedFinancialDocumentId) {
    conflict(
      "ISSUED RefundStatutoryDecision is missing issued FinancialDocument identity.",
    );
  }
  const document = await loadFinancialDocument(
    tx,
    decision.issuedFinancialDocumentId,
  );
  if (!document) {
    conflict(
      `ISSUED RefundStatutoryDecision references missing FinancialDocument ${decision.issuedFinancialDocumentId}.`,
    );
  }
  if (document.documentType !== expectedType) {
    conflict(
      `ISSUED RefundStatutoryDecision references FinancialDocument type ${document.documentType}, expected ${expectedType}.`,
    );
  }
  if (document.id !== decision.issuedFinancialDocumentId) {
    conflict(
      "ISSUED RefundStatutoryDecision does not reference the loaded FinancialDocument.",
    );
  }
  return Object.freeze({
    decision: mapRefundStatutoryDecisionRow(decision),
    financialDocument: document,
  });
}

async function issueRefundStatutoryReversalInTransaction(
  persistence: Persistence,
  tx: PersistenceTransactionContext,
  command: { decisionId: string; now: Date },
  options: IssueRefundStatutoryReversalOptions,
): Promise<IssueRefundStatutoryReversalResult> {
  const decision = await lockRefundStatutoryDecisionForUpdate(
    tx,
    command.decisionId,
  );
  if (!decision) {
    throw new RefundStatutoryDecisionError(
      "REFUND_STATUTORY_DECISION_NOT_FOUND",
      `RefundStatutoryDecision not found: ${command.decisionId}`,
      { field: "decisionId" },
    );
  }

  if (decision.status === "PENDING") {
    notEligible(
      "RefundStatutoryDecision PENDING cannot issue a statutory reversal FinancialDocument.",
      "status",
    );
  }

  if (decision.disposition === "NO_STATUTORY_DOCUMENT") {
    notEligible(
      "NO_STATUTORY_DOCUMENT is terminal BRANCH_FINALIZED and cannot issue a FinancialDocument.",
      "disposition",
    );
  }

  const documentType = expectedDocumentType(decision.disposition ?? "");
  const priorType = expectedPriorType(documentType);

  if (decision.status === "ISSUED") {
    return returnIssued(tx, decision, documentType);
  }

  if (decision.status !== "BRANCH_FINALIZED") {
    notEligible(
      `RefundStatutoryDecision status ${decision.status} cannot issue a statutory reversal FinancialDocument.`,
      "status",
    );
  }

  const priorId = sealedPriorId(decision, documentType);
  const source = await loadFinancialDocument(tx, priorId);
  if (!source) {
    invalid(
      `Sealed prior FinancialDocument not found: ${priorId}`,
      "decisionId",
    );
  }
  if (source.documentType !== priorType) {
    invalid(
      `Sealed prior FinancialDocument type ${source.documentType} does not match ${priorType} required by ${documentType}.`,
      "decisionId",
    );
  }

  const reversalScope = decision.sealedReversalScope;
  const sealedReversalAmountPaise = decision.sealedReversalAmountPaise;
  if (reversalScope !== "FULL" && reversalScope !== "PARTIAL") {
    invalid("RefundStatutoryDecision is missing sealed reversal scope.", "reversalScope");
  }
  if (sealedReversalAmountPaise == null || sealedReversalAmountPaise <= BigInt(0)) {
    invalid(
      "RefundStatutoryDecision is missing sealed reversal amount.",
      "sealedReversalAmountPaise",
    );
  }

  let lines: IssueFinancialDocumentLineCommand[];
  if (reversalScope === "FULL") {
    if (source.grandTotalPaise !== sealedReversalAmountPaise) {
      invalid(
        "FULL reversal amount does not match sealed source FinancialDocument grand total.",
        "sealedReversalAmountPaise",
      );
    }
    lines = linesFromSealedSource(source);
  } else {
    const allocation = await loadRefundStatutoryIssuanceAllocationByDecisionId(
      tx,
      decision.id,
    );
    if (!allocation) {
      throw new RefundStatutoryDecisionError(
        "REFUND_STATUTORY_ISSUANCE_ALLOCATION_REQUIRED",
        "PARTIAL RFV/CN issuance requires the accepted sealed RefundStatutoryIssuanceAllocation.",
        { field: "allocation" },
      );
    }
    if (allocation.sourceFinancialDocumentId !== source.id) {
      invalid(
        "Sealed PARTIAL allocation is not against the sealed prior FinancialDocument.",
        "allocation",
      );
    }
    if (allocation.sealedReversalAmountPaise !== sealedReversalAmountPaise) {
      invalid(
        "Sealed PARTIAL allocation amount does not match sealed reversal amount.",
        "allocation",
      );
    }
    if (
      allocation.sourceDocumentType !== priorType
    ) {
      invalid(
        `Sealed PARTIAL allocation source type ${allocation.sourceDocumentType} does not match ${priorType}.`,
        "allocation",
      );
    }
    lines = linesFromSealedAllocation(source, allocation);
  }

  const issueAt = command.now;
  const financialYear = deriveIndianFinancialYear(issueAt);
  const series = await resolveNumberingSeriesForScope(tx, {
    legalEntityId: source.legalEntityId,
    documentType,
    financialYear,
  });

  const issueCommand: IssueFinancialDocumentCommand = {
    logicalIssuanceKey: decision.logicalIdempotencyKey,
    documentType,
    legalEntityId: source.legalEntityId,
    financialYear,
    numberingSeriesId: series.id,
    issueAt,
    lines,
    taxableTotalPaise: reversalScope === "FULL" ? source.taxableTotalPaise : undefined,
    taxTotalPaise: reversalScope === "FULL" ? source.taxTotalPaise : undefined,
    discountTotalPaise: reversalScope === "FULL" ? source.discountTotalPaise : undefined,
    chargeTotalPaise: reversalScope === "FULL" ? source.chargeTotalPaise : undefined,
    grandTotalPaise: sealedReversalAmountPaise,
    placeOfSupplyStateCode: source.placeOfSupplyStateCode,
    checkoutId: source.checkoutId,
    checkoutSnapshotId: source.checkoutSnapshotId,
    paymentId: source.paymentId,
    refundId: decision.refundId,
    orderId: source.orderId,
    priorFinancialDocumentId: source.id,
    recipientDisplayName: source.recipientDisplayName,
    recipientPhoneE164: source.recipientPhoneE164,
    recipientAddress: source.recipientAddress,
  };

  const document = await issueFinancialDocument(persistence, issueCommand, {
    transactionContext: tx,
  });

  if (document.documentType !== documentType) {
    conflict(
      `Issued FinancialDocument type ${document.documentType} does not match ${documentType}.`,
    );
  }
  if (document.priorFinancialDocumentId !== source.id) {
    conflict(
      "Issued FinancialDocument prior authority does not match sealed source FinancialDocument.",
    );
  }
  if (document.priorDocumentType !== priorType) {
    conflict(
      `Issued FinancialDocument prior type ${document.priorDocumentType} does not match ${priorType}.`,
    );
  }
  if (document.grandTotalPaise !== sealedReversalAmountPaise) {
    invalid(
      "Issued FinancialDocument grand total does not match sealed reversal amount.",
      "allocation",
    );
  }

  if (options.afterFinancialDocumentIssued) {
    await options.afterFinancialDocumentIssued(document);
  }

  const issued = await sealRefundStatutoryDecisionIssued(tx, {
    id: decision.id,
    issuedFinancialDocumentId: document.id,
    issuedAt: document.issueAt,
  });

  return Object.freeze({
    decision: issued,
    financialDocument: document,
  });
}

/**
 * Issue RFV/CN for a BRANCH_FINALIZED RefundStatutoryDecision atomically
 * with statutory numbering. Idempotent on exact retry of an ISSUED decision.
 */
export async function issueRefundStatutoryReversal(
  persistence: Persistence,
  command: IssueRefundStatutoryReversalCommand,
  options: IssueRefundStatutoryReversalOptions = {},
): Promise<IssueRefundStatutoryReversalResult> {
  const parsed = parseIssueRefundStatutoryReversalCommand(command);
  return persistence.transaction((tx) =>
    issueRefundStatutoryReversalInTransaction(persistence, tx, parsed, options),
  );
}
