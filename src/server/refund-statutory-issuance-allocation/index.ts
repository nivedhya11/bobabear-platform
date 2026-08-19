/**
 * Server-only RefundStatutoryIssuanceAllocation boundary
 * (IMP-028 / D-366 Slice 3A).
 *
 * PARTIAL statutory arithmetic seal. No RFV/CN FinancialDocument issuance,
 * no HTTP/CLI, no D-367 signing.
 */
import "server-only";

export {
  RefundStatutoryIssuanceAllocationError,
  buildRefundStatutoryIssuanceAllocationLogicalKey,
} from "../../shared/refund-statutory-issuance-allocation";
export type {
  RefundStatutoryIssuanceAllocation,
  SealRefundStatutoryIssuanceAllocationCommand,
} from "../../shared/refund-statutory-issuance-allocation";

export { sealRefundStatutoryIssuanceAllocation } from "./seal";
export type { SealRefundStatutoryIssuanceAllocationOptions } from "./seal";

export {
  extractPostgresDriverCode,
  findRefundStatutoryIssuanceAllocationByDecisionId,
  insertRefundStatutoryIssuanceAllocation,
  loadRefundStatutoryIssuanceAllocationByDecisionId,
  loadRefundStatutoryIssuanceAllocationChildren,
  lockRefundStatutoryIssuanceAllocationsForSource,
  mapRefundStatutoryIssuanceAllocation,
  newRefundStatutoryIssuanceAllocationId,
  newRefundStatutoryIssuanceAllocationLineId,
  newRefundStatutoryIssuanceAllocationTaxComponentId,
  type RefundStatutoryIssuanceAllocationRow,
} from "./repository";
