/**
 * RefundStatutoryIssuanceAllocation domain types (IMP-028 / D-366 Slice 3A).
 */
import type { RefundStatutoryIssuanceAllocationSourceDocumentType } from "./constants";

export type RefundStatutoryIssuanceAllocationLine = Readonly<{
  id: string;
  allocationId: string;
  sourceFinancialDocumentLineId: string;
  allocatedTaxableOrBaseAmountPaise: bigint;
}>;

export type RefundStatutoryIssuanceAllocationTaxComponent = Readonly<{
  id: string;
  allocationId: string;
  sourceFinancialDocumentTaxComponentId: string;
  sourceFinancialDocumentLineId: string;
  taxType: string;
  taxRateBps: number;
  allocatedTaxAmountPaise: bigint;
}>;

/**
 * Immutable PARTIAL statutory issuance-allocation authority.
 * Does not issue FinancialDocument and does not mutate RefundStatutoryDecision.
 */
export type RefundStatutoryIssuanceAllocation = Readonly<{
  id: string;
  refundStatutoryDecisionId: string;
  logicalIdempotencyKey: string;
  sourceFinancialDocumentId: string;
  sourceDocumentType: RefundStatutoryIssuanceAllocationSourceDocumentType;
  sealedReversalAmountPaise: bigint;
  createdAt: Date;
  lines: readonly RefundStatutoryIssuanceAllocationLine[];
  taxComponents: readonly RefundStatutoryIssuanceAllocationTaxComponent[];
}>;
