/**
 * Manual-assisted RefundStatutoryDecision branch finalization
 * (IMP-028 / D-366 Slice 2).
 *
 * PENDING → BRANCH_FINALIZED. Does not issue FinancialDocument, does not
 * sign, does not infer RFV/CN/NO_STATUTORY_DOCUMENT from missing facts,
 * and does not mutate Refund / Payment / Order.
 */
import { and, eq, inArray, or } from "drizzle-orm";

import { financialDocumentsTable } from "../../platform/database/schema/financial-document";
import { refundStatutoryDecisionsTable } from "../../platform/database/schema/refund-statutory-decision";
import {
  canonicalAllocationAuthorityJson,
  canonicalCommercialFactRefsJson,
  canonicalJson,
  parseFinalizeRefundStatutoryDecisionCommand,
  RefundStatutoryDecisionError,
  sealedBranchAuthorityEquals,
  sealedBranchAuthorityFromDecision,
  type FinalizeRefundStatutoryDecisionCommand,
  type ParsedFinalizeRefundStatutoryDecisionCommand,
  type RefundStatutoryCommercialFactRef,
  type RefundStatutoryDecision,
  type SealedBranchAuthority,
} from "../../shared/refund-statutory-decision";
import { findOrderById } from "../order/repository";
import { findPaymentById } from "../payment/repository";
import type {
  Persistence,
  PersistenceTransactionContext,
} from "../persistence/types";
import { findRefundById, type RefundRow } from "../refund/repository";
import {
  lockRefundStatutoryDecisionForUpdate,
  mapRefundStatutoryDecisionRow,
  sealRefundStatutoryDecisionBranch,
  type RefundStatutoryDecisionRow,
} from "./repository";

type FinancialDocumentLockRow = Readonly<{
  id: string;
  documentType: string;
  legalEntityId: string;
  paymentId: string | null;
  checkoutId: string | null;
  checkoutSnapshotId: string | null;
  orderId: string | null;
  grandTotalPaise: bigint;
  statutoryDocumentNumber: string;
}>;

function invalid(message: string, field: string): never {
  throw new RefundStatutoryDecisionError(
    "REFUND_STATUTORY_DECISION_INVALID_INPUT",
    message,
    { field },
  );
}

function conflict(message: string): never {
  throw new RefundStatutoryDecisionError(
    "REFUND_STATUTORY_DECISION_IDEMPOTENCY_CONFLICT",
    message,
    { field: "disposition" },
  );
}

export async function finalizeRefundStatutoryDecision(
  persistence: Persistence,
  command: FinalizeRefundStatutoryDecisionCommand,
): Promise<RefundStatutoryDecision> {
  const parsed = parseFinalizeRefundStatutoryDecisionCommand(command);
  return persistence.transaction((tx) =>
    finalizeRefundStatutoryDecisionInTransaction(tx, parsed),
  );
}

async function finalizeRefundStatutoryDecisionInTransaction(
  tx: PersistenceTransactionContext,
  command: ParsedFinalizeRefundStatutoryDecisionCommand,
): Promise<RefundStatutoryDecision> {
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

  const refund = await findRefundById(tx, decision.refundId);
  if (!refund) {
    throw new RefundStatutoryDecisionError(
      "REFUND_NOT_FOUND",
      `Refund not found: ${decision.refundId}`,
      { field: "refundId" },
    );
  }
  if (refund.status !== "PROCESSED") {
    throw new RefundStatutoryDecisionError(
      "REFUND_NOT_PROCESSED",
      `RefundStatutoryDecision finalization requires Refund PROCESSED (got ${refund.status}).`,
      { field: "refundId" },
    );
  }

  if (decision.status === "PENDING") {
    const authority = await validatePendingFinalization(tx, decision, refund, command);
    return sealRefundStatutoryDecisionBranch(tx, {
      id: decision.id,
      now: command.now,
      actorKind: command.actorKind,
      actorId: command.actorId,
      authority,
    });
  }

  if (decision.status !== "BRANCH_FINALIZED" && decision.status !== "ISSUED") {
    invalid(
      `RefundStatutoryDecision status ${decision.status} cannot be finalized.`,
      "decisionId",
    );
  }

  const existing = sealedBranchAuthorityFromDecision(
    mapRefundStatutoryDecisionRow(decision),
  );
  if (!existing) {
    invalid("Sealed RefundStatutoryDecision is missing disposition.", "decisionId");
  }
  const projected = projectSealedAuthorityFromCommand(command, refund);
  if (!sealedBranchAuthorityEquals(existing, projected)) {
    conflict(
      "RefundStatutoryDecision is already sealed with different branch authority.",
    );
  }
  return mapRefundStatutoryDecisionRow(decision);
}

function projectSealedAuthorityFromCommand(
  command: ParsedFinalizeRefundStatutoryDecisionCommand,
  refund: RefundRow,
): SealedBranchAuthority {
  if (command.disposition === "NO_STATUTORY_DOCUMENT") {
    return Object.freeze({
      disposition: "NO_STATUTORY_DOCUMENT",
      sealedPriorReceiptVoucherId: null,
      sealedPriorTaxInvoiceId: command.priorTaxInvoiceId,
      sealedSection34QualificationCode: null,
      sealedSection34QualificationFacts: null,
      sealedReversalScope: null,
      sealedReversalAmountPaise: null,
      sealedAllocationAuthority: null,
      sealedNoSupplyAuthorityKind: null,
      sealedNoStatutoryDocumentReasonCode: command.noStatutoryDocumentReasonCode,
      sealedNoStatutoryDocumentRationale: command.noStatutoryDocumentRationale,
      sealedReferencedCommercialFactRefs: canonicalCommercialFactRefsJson(
        command.referencedCommercialFactRefs,
      ),
    });
  }

  const priorId =
    command.disposition === "REFUND_VOUCHER"
      ? command.priorReceiptVoucherId
      : command.priorTaxInvoiceId;
  const allocationJson =
    command.reversalScope === "PARTIAL" && command.allocationAuthority
      ? canonicalAllocationAuthorityJson(command.allocationAuthority)
      : null;

  return Object.freeze({
    disposition: command.disposition,
    sealedPriorReceiptVoucherId:
      command.disposition === "REFUND_VOUCHER" ? command.priorReceiptVoucherId : null,
    sealedPriorTaxInvoiceId:
      command.disposition === "CREDIT_NOTE" ? command.priorTaxInvoiceId : null,
    sealedSection34QualificationCode:
      command.disposition === "CREDIT_NOTE"
        ? command.section34QualificationCode
        : null,
    sealedSection34QualificationFacts:
      command.disposition === "CREDIT_NOTE"
        ? canonicalJson(command.section34QualificationFacts)
        : null,
    sealedReversalScope: command.reversalScope,
    sealedReversalAmountPaise: refund.amountPaise,
    sealedAllocationAuthority: allocationJson,
    sealedNoSupplyAuthorityKind:
      command.disposition === "REFUND_VOUCHER" ? "ORDER_CANCELLED" : null,
    sealedNoStatutoryDocumentReasonCode: null,
    sealedNoStatutoryDocumentRationale: null,
    sealedReferencedCommercialFactRefs: canonicalCommercialFactRefsJson(
      commercialRefsForReversal(refund, priorId),
    ),
  });
}

function commercialRefsForReversal(
  refund: RefundRow,
  priorFinancialDocumentId: string,
): readonly RefundStatutoryCommercialFactRef[] {
  const refs: RefundStatutoryCommercialFactRef[] = [
    { kind: "refund", id: refund.id },
    { kind: "payment", id: refund.paymentId },
    { kind: "financial_document", id: priorFinancialDocumentId },
  ];
  if (refund.checkoutId) {
    refs.push({ kind: "checkout", id: refund.checkoutId });
  }
  if (refund.orderId) {
    refs.push({ kind: "order", id: refund.orderId });
  }
  return refs;
}

async function validatePendingFinalization(
  tx: PersistenceTransactionContext,
  _decision: RefundStatutoryDecisionRow,
  refund: RefundRow,
  command: ParsedFinalizeRefundStatutoryDecisionCommand,
): Promise<SealedBranchAuthority> {
  if (command.disposition === "NO_STATUTORY_DOCUMENT") {
    const prior = await lockAndLoadPriorDocument(
      tx,
      command.priorTaxInvoiceId,
      "priorTaxInvoiceId",
    );
    if (prior.documentType !== "TAX_INVOICE") {
      invalid(
        `NO_STATUTORY_DOCUMENT requires an exact TAX_INVOICE (got ${prior.documentType}).`,
        "priorTaxInvoiceId",
      );
    }
    assertSameCommercialGraph(refund, prior, "priorTaxInvoiceId");
    await assertNsdCitedFactsExist(
      tx,
      refund,
      command.referencedCommercialFactRefs,
      command.priorTaxInvoiceId,
    );
    return projectSealedAuthorityFromCommand(command, refund);
  }

  const allocation =
    command.reversalScope === "PARTIAL" ? command.allocationAuthority : null;
  if (command.reversalScope === "PARTIAL") {
    if (!allocation) {
      invalid(
        "PARTIAL reversal requires explicit write-once allocation authority.",
        "allocationAuthority",
      );
    }
    if (allocation.allocatedAmountPaise !== refund.amountPaise) {
      invalid(
        "PARTIAL allocation must reconcile exactly to the Refund amount.",
        "allocationAuthority",
      );
    }
  }

  if (command.disposition === "REFUND_VOUCHER") {
    if (
      command.reversalScope === "PARTIAL" &&
      allocation!.sourceFinancialDocumentId !== command.priorReceiptVoucherId
    ) {
      invalid(
        "PARTIAL allocation source must be the sealed prior Receipt Voucher.",
        "allocationAuthority",
      );
    }
    const prior = await lockAndLoadPriorDocument(
      tx,
      command.priorReceiptVoucherId,
      "priorReceiptVoucherId",
    );
    if (prior.documentType !== "RECEIPT_VOUCHER") {
      invalid(
        `REFUND_VOUCHER prior document must be RECEIPT_VOUCHER (got ${prior.documentType}).`,
        "priorReceiptVoucherId",
      );
    }
    assertSameCommercialGraph(refund, prior, "priorReceiptVoucherId");
    await assertNoSupplyOrderCancelled(tx, refund);
    await assertNoApplicableTaxInvoice(tx, refund, prior.legalEntityId);
    await assertReversalAmountAndCap(tx, refund, prior, command.reversalScope, prior.id);
    return projectSealedAuthorityFromCommand(command, refund);
  }

  if (
    command.reversalScope === "PARTIAL" &&
    allocation!.sourceFinancialDocumentId !== command.priorTaxInvoiceId
  ) {
    invalid(
      "PARTIAL allocation source must be the sealed prior Tax Invoice.",
      "allocationAuthority",
    );
  }
  const prior = await lockAndLoadPriorDocument(
    tx,
    command.priorTaxInvoiceId,
    "priorTaxInvoiceId",
  );
  if (prior.documentType === "BILL_OF_SUPPLY") {
    invalid(
      "BILL_OF_SUPPLY is not Section 34 Credit Note prior authority.",
      "priorTaxInvoiceId",
    );
  }
  if (prior.documentType !== "TAX_INVOICE") {
    invalid(
      `CREDIT_NOTE prior document must be TAX_INVOICE (got ${prior.documentType}).`,
      "priorTaxInvoiceId",
    );
  }
  assertSameCommercialGraph(refund, prior, "priorTaxInvoiceId");
  if (command.section34QualificationCode === refund.reason.trim()) {
    invalid(
      "Section 34 qualification must not be inferred from Refund.reason.",
      "section34QualificationCode",
    );
  }
  if (
    refund.operatorNote &&
    command.section34QualificationCode === refund.operatorNote.trim()
  ) {
    invalid(
      "Section 34 qualification must not be inferred from Refund.operatorNote.",
      "section34QualificationCode",
    );
  }
  const facts = command.section34QualificationFacts;
  if (
    typeof facts.statutoryDocumentNumber === "string" &&
    facts.statutoryDocumentNumber !== prior.statutoryDocumentNumber
  ) {
    invalid(
      "Section 34 qualification facts must match the loaded prior Tax Invoice.",
      "section34QualificationFacts",
    );
  }
  await assertReversalAmountAndCap(tx, refund, prior, command.reversalScope, prior.id);
  return projectSealedAuthorityFromCommand(command, refund);
}

async function lockAndLoadPriorDocument(
  tx: PersistenceTransactionContext,
  documentId: string,
  field: string,
): Promise<FinancialDocumentLockRow> {
  const rows = await tx.db
    .select({
      id: financialDocumentsTable.id,
      documentType: financialDocumentsTable.documentType,
      legalEntityId: financialDocumentsTable.legalEntityId,
      paymentId: financialDocumentsTable.paymentId,
      checkoutId: financialDocumentsTable.checkoutId,
      checkoutSnapshotId: financialDocumentsTable.checkoutSnapshotId,
      orderId: financialDocumentsTable.orderId,
      grandTotalPaise: financialDocumentsTable.grandTotalPaise,
      statutoryDocumentNumber: financialDocumentsTable.statutoryDocumentNumber,
    })
    .from(financialDocumentsTable)
    .where(eq(financialDocumentsTable.id, documentId))
    .for("update")
    .limit(1);
  const row = rows[0];
  if (!row) {
    invalid(`Prior Financial Document not found: ${documentId}`, field);
  }
  return row;
}

function assertSameCommercialGraph(
  refund: RefundRow,
  document: FinancialDocumentLockRow,
  field: string,
): void {
  const paymentMatch =
    document.paymentId != null && document.paymentId === refund.paymentId;
  const checkoutMatch =
    document.checkoutId != null &&
    refund.checkoutId != null &&
    document.checkoutId === refund.checkoutId &&
    document.checkoutSnapshotId != null &&
    refund.checkoutSnapshotId != null &&
    document.checkoutSnapshotId === refund.checkoutSnapshotId;
  const orderMatch =
    document.orderId != null &&
    refund.orderId != null &&
    document.orderId === refund.orderId;
  if (!paymentMatch && !checkoutMatch && !orderMatch) {
    invalid(
      "Prior Financial Document is not on the Refund commercial graph.",
      field,
    );
  }
  if (document.paymentId && document.paymentId !== refund.paymentId) {
    invalid("Prior Financial Document Payment does not match the Refund.", field);
  }
  if (
    document.checkoutId &&
    refund.checkoutId &&
    document.checkoutId !== refund.checkoutId
  ) {
    invalid("Prior Financial Document Checkout does not match the Refund.", field);
  }
  if (
    document.checkoutSnapshotId &&
    refund.checkoutSnapshotId &&
    document.checkoutSnapshotId !== refund.checkoutSnapshotId
  ) {
    invalid(
      "Prior Financial Document Checkout Snapshot does not match the Refund.",
      field,
    );
  }
  if (document.orderId && refund.orderId && document.orderId !== refund.orderId) {
    invalid("Prior Financial Document Order does not match the Refund.", field);
  }
}

async function assertNoSupplyOrderCancelled(
  tx: PersistenceTransactionContext,
  refund: RefundRow,
): Promise<void> {
  if (!refund.orderId) {
    invalid(
      "REFUND_VOUCHER requires durable Order.status=CANCELLED no-supply authority; pre-Order automatic RFV is fail-closed.",
      "noSupplyAuthorityKind",
    );
  }
  const order = await findOrderById(tx, refund.orderId);
  if (!order) {
    invalid(
      "REFUND_VOUCHER no-supply authority requires the Refund Order to exist and be CANCELLED.",
      "noSupplyAuthorityKind",
    );
  }
  if (order.status !== "CANCELLED") {
    invalid(
      `REFUND_VOUCHER no-supply authority requires Order.status=CANCELLED (got ${order.status}).`,
      "noSupplyAuthorityKind",
    );
  }
}

async function assertNoApplicableTaxInvoice(
  tx: PersistenceTransactionContext,
  refund: RefundRow,
  legalEntityId: string,
): Promise<void> {
  const graph = commercialGraphPredicates(refund);
  const rows = await tx.db
    .select({
      id: financialDocumentsTable.id,
      legalEntityId: financialDocumentsTable.legalEntityId,
    })
    .from(financialDocumentsTable)
    .where(
      and(eq(financialDocumentsTable.documentType, "TAX_INVOICE"), graph),
    );
  if (rows.length === 0) {
    return;
  }
  const mismatched = rows.find((row) => row.legalEntityId !== legalEntityId);
  if (mismatched) {
    invalid(
      "Applicable Tax Invoice legal entity is inconsistent with the Receipt Voucher graph.",
      "priorReceiptVoucherId",
    );
  }
  invalid(
    "REFUND_VOUCHER is forbidden because an applicable TAX_INVOICE exists on the commercial graph.",
    "priorReceiptVoucherId",
  );
}

function commercialGraphPredicates(refund: RefundRow) {
  const clauses = [eq(financialDocumentsTable.paymentId, refund.paymentId)];
  if (refund.checkoutId) {
    clauses.push(eq(financialDocumentsTable.checkoutId, refund.checkoutId));
  }
  if (refund.orderId) {
    clauses.push(eq(financialDocumentsTable.orderId, refund.orderId));
  }
  return or(...clauses)!;
}

async function assertReversalAmountAndCap(
  tx: PersistenceTransactionContext,
  refund: RefundRow,
  source: FinancialDocumentLockRow,
  reversalScope: "FULL" | "PARTIAL",
  sourceDocumentId: string,
): Promise<void> {
  const amount = refund.amountPaise;
  if (amount <= BigInt(0)) {
    invalid("Refund amount must be a positive integer.", "refundId");
  }
  if (reversalScope === "FULL") {
    if (amount !== source.grandTotalPaise) {
      invalid(
        "FULL reversal requires the Refund amount to equal the prior document grand total.",
        "reversalScope",
      );
    }
  } else if (amount >= source.grandTotalPaise) {
    invalid(
      "PARTIAL reversal amount must be less than the prior document grand total.",
      "reversalScope",
    );
  }

  const prior = await tx.db
    .select({
      id: refundStatutoryDecisionsTable.id,
      amount: refundStatutoryDecisionsTable.sealedReversalAmountPaise,
    })
    .from(refundStatutoryDecisionsTable)
    .where(
      and(
        inArray(refundStatutoryDecisionsTable.status, [
          "BRANCH_FINALIZED",
          "ISSUED",
        ]),
        or(
          eq(
            refundStatutoryDecisionsTable.sealedPriorReceiptVoucherId,
            sourceDocumentId,
          ),
          eq(
            refundStatutoryDecisionsTable.sealedPriorTaxInvoiceId,
            sourceDocumentId,
          ),
        ),
      ),
    );

  let used = BigInt(0);
  for (const row of prior) {
    used += row.amount ?? BigInt(0);
  }
  if (reversalScope === "FULL" && used !== BigInt(0)) {
    invalid(
      "FULL reversal requires no prior sealed statutory reversals against the source document.",
      "reversalScope",
    );
  }
  if (used + amount > source.grandTotalPaise) {
    invalid(
      "Cumulative statutory reversal would exceed the authoritative source amount.",
      "allocationAuthority",
    );
  }
}

async function assertNsdCitedFactsExist(
  tx: PersistenceTransactionContext,
  refund: RefundRow,
  refs: readonly RefundStatutoryCommercialFactRef[],
  priorTaxInvoiceId: string,
): Promise<void> {
  const citedRefund = refs.find((ref) => ref.kind === "refund");
  if (!citedRefund || citedRefund.id !== refund.id) {
    invalid(
      "NO_STATUTORY_DOCUMENT must cite the Refund being finalized.",
      "referencedCommercialFactRefs",
    );
  }
  const citesTaxInvoice = refs.some(
    (ref) =>
      ref.kind === "financial_document" && ref.id === priorTaxInvoiceId,
  );
  if (!citesTaxInvoice) {
    invalid(
      "NO_STATUTORY_DOCUMENT durable fact refs must cite the relevant Tax Invoice.",
      "referencedCommercialFactRefs",
    );
  }

  for (const ref of refs) {
    if (ref.kind === "refund") {
      if (ref.id !== refund.id) {
        invalid(
          "Cited Refund does not match the decision Refund.",
          "referencedCommercialFactRefs",
        );
      }
      continue;
    }
    if (ref.kind === "payment") {
      const payment = await findPaymentById(tx, ref.id);
      if (!payment) {
        invalid("Cited Payment does not exist.", "referencedCommercialFactRefs");
      }
      if (payment.id !== refund.paymentId) {
        invalid(
          "Cited Payment is not the Refund Payment.",
          "referencedCommercialFactRefs",
        );
      }
      continue;
    }
    if (ref.kind === "checkout") {
      if (!refund.checkoutId || ref.id !== refund.checkoutId) {
        invalid(
          "Cited Checkout is not on the Refund commercial graph.",
          "referencedCommercialFactRefs",
        );
      }
      continue;
    }
    if (ref.kind === "order") {
      if (!refund.orderId || ref.id !== refund.orderId) {
        invalid(
          "Cited Order is not on the Refund commercial graph.",
          "referencedCommercialFactRefs",
        );
      }
      const order = await findOrderById(tx, ref.id);
      if (!order) {
        invalid("Cited Order does not exist.", "referencedCommercialFactRefs");
      }
      continue;
    }
    const docs = await tx.db
      .select({
        id: financialDocumentsTable.id,
        documentType: financialDocumentsTable.documentType,
        paymentId: financialDocumentsTable.paymentId,
        checkoutId: financialDocumentsTable.checkoutId,
        orderId: financialDocumentsTable.orderId,
      })
      .from(financialDocumentsTable)
      .where(eq(financialDocumentsTable.id, ref.id))
      .limit(1);
    const document = docs[0];
    if (!document) {
      invalid(
        "Cited Financial Document does not exist.",
        "referencedCommercialFactRefs",
      );
    }
    if (ref.id === priorTaxInvoiceId && document.documentType !== "TAX_INVOICE") {
      invalid(
        "Cited relevant Tax Invoice must resolve to document type TAX_INVOICE.",
        "referencedCommercialFactRefs",
      );
    }
    if (document.paymentId && document.paymentId !== refund.paymentId) {
      invalid(
        "Cited Financial Document is not on the Refund commercial graph.",
        "referencedCommercialFactRefs",
      );
    }
    if (
      document.checkoutId &&
      refund.checkoutId &&
      document.checkoutId !== refund.checkoutId
    ) {
      invalid(
        "Cited Financial Document is not on the Refund commercial graph.",
        "referencedCommercialFactRefs",
      );
    }
    if (document.orderId && refund.orderId && document.orderId !== refund.orderId) {
      invalid(
        "Cited Financial Document is not on the Refund commercial graph.",
        "referencedCommercialFactRefs",
      );
    }
  }
}
