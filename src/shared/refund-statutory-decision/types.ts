/**
 * RefundStatutoryDecision domain types (IMP-028 / D-366).
 */
import type {
  RefundStatutoryDecisionStatus,
  RefundStatutoryDisposition,
  RefundStatutoryNoSupplyAuthorityKind,
  RefundStatutoryReversalScope,
} from "./constants";

/**
 * Durable statutory-reversal decision authority for exactly one Refund.
 *
 * PENDING stores no disposition and no sealed RFV/CN/NO_STATUTORY facts.
 * BRANCH_FINALIZED seals operator-assisted branch authority without issuing
 * a FinancialDocument. ISSUED associates exactly one immutable RFV/CN
 * FinancialDocument for REFUND_VOUCHER / CREDIT_NOTE dispositions.
 */
export type RefundStatutoryDecision = Readonly<{
  id: string;
  refundId: string;
  status: RefundStatutoryDecisionStatus;
  disposition: RefundStatutoryDisposition | null;
  logicalIdempotencyKey: string;
  sealedPriorReceiptVoucherId: string | null;
  sealedPriorTaxInvoiceId: string | null;
  sealedSection34QualificationCode: string | null;
  sealedSection34QualificationFacts: string | null;
  sealedReversalScope: RefundStatutoryReversalScope | null;
  sealedReversalAmountPaise: bigint | null;
  sealedAllocationAuthority: string | null;
  sealedNoSupplyAuthorityKind: RefundStatutoryNoSupplyAuthorityKind | null;
  sealedNoStatutoryDocumentReasonCode: string | null;
  sealedNoStatutoryDocumentRationale: string | null;
  sealedReferencedCommercialFactRefs: string | null;
  branchFinalizedAt: Date | null;
  branchFinalizedByActorKind: string | null;
  branchFinalizedByActorId: string | null;
  issuedFinancialDocumentId: string | null;
  issuedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  pendingAt: Date;
}>;
