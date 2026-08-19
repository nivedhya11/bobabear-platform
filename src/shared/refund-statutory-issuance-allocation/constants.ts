/**
 * RefundStatutoryIssuanceAllocation domain constants (IMP-028 / D-366 Slice 3A).
 *
 * Separate PARTIAL statutory arithmetic authority. Does not classify
 * RFV/CN/NSD branches and does not issue FinancialDocument.
 */

export const REFUND_STATUTORY_ISSUANCE_ALLOCATION_PURPOSE =
  "ISSUANCE_ALLOCATION" as const;

export const REFUND_STATUTORY_ISSUANCE_ALLOCATION_LOGICAL_KEY_PREFIX =
  "refund-statutory-decision:" as const;

export const REFUND_STATUTORY_ISSUANCE_ALLOCATION_SOURCE_DOCUMENT_TYPES = [
  "RECEIPT_VOUCHER",
  "TAX_INVOICE",
] as const;

export type RefundStatutoryIssuanceAllocationSourceDocumentType =
  (typeof REFUND_STATUTORY_ISSUANCE_ALLOCATION_SOURCE_DOCUMENT_TYPES)[number];
