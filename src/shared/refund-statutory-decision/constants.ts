/**
 * RefundStatutoryDecision domain constants (IMP-028 / D-366).
 *
 * Separate statutory-reversal decision authority layered on Refund (D-364)
 * and Financial Document (D-365). Does not invent branch classification.
 */

export const REFUND_STATUTORY_DECISION_STATUSES = [
  "PENDING",
  "BRANCH_FINALIZED",
  "ISSUED",
] as const;

export type RefundStatutoryDecisionStatus =
  (typeof REFUND_STATUTORY_DECISION_STATUSES)[number];

/**
 * Final dispositions only. PENDING always stores disposition = null.
 * Never infer NO_STATUTORY_DOCUMENT from missing evidence.
 */
export const REFUND_STATUTORY_DISPOSITIONS = [
  "NO_STATUTORY_DOCUMENT",
  "REFUND_VOUCHER",
  "CREDIT_NOTE",
] as const;

export type RefundStatutoryDisposition =
  (typeof REFUND_STATUTORY_DISPOSITIONS)[number];

export const REFUND_STATUTORY_REVERSAL_SCOPES = ["FULL", "PARTIAL"] as const;

export type RefundStatutoryReversalScope =
  (typeof REFUND_STATUTORY_REVERSAL_SCOPES)[number];

/**
 * Current automatic durable no-supply authority kinds (D-366).
 * Absence of Order/TI is not positive authority and is not listed here.
 */
export const REFUND_STATUTORY_NO_SUPPLY_AUTHORITY_KINDS = [
  "ORDER_CANCELLED",
] as const;

export type RefundStatutoryNoSupplyAuthorityKind =
  (typeof REFUND_STATUTORY_NO_SUPPLY_AUTHORITY_KINDS)[number];

/**
 * BOBA internal canonical Section 34 qualification vocabulary for CREDIT_NOTE.
 * Operators must choose exactly one; arbitrary strings are rejected.
 */
export const REFUND_STATUTORY_SECTION34_QUALIFICATION_CODES = [
  "TAXABLE_VALUE_OR_TAX_EXCEEDS_PAYABLE",
  "GOODS_RETURNED_BY_RECIPIENT",
  "GOODS_OR_SERVICES_DEFICIENT",
] as const;

export type RefundStatutorySection34QualificationCode =
  (typeof REFUND_STATUTORY_SECTION34_QUALIFICATION_CODES)[number];

/**
 * MVP-bounded NO_STATUTORY_DOCUMENT reason vocabulary.
 * Exactly one product reason is authorized.
 */
export const REFUND_STATUTORY_NO_STATUTORY_DOCUMENT_REASON_CODES = [
  "COMMERCIAL_REFUND_NO_GST_STATUTORY_ADJUSTMENT",
] as const;

export type RefundStatutoryNoStatutoryDocumentReasonCode =
  (typeof REFUND_STATUTORY_NO_STATUTORY_DOCUMENT_REASON_CODES)[number];

export const REFUND_STATUTORY_REVERSAL_PURPOSE = "STATUTORY_REVERSAL" as const;

export const REFUND_STATUTORY_LOGICAL_KEY_PREFIX = "refund:" as const;

/**
 * Durable commercial/statutory identities an operator may cite.
 * Absence of RFV/CN evidence is not a kind and must not be inferred.
 */
export const REFUND_STATUTORY_COMMERCIAL_FACT_REF_KINDS = [
  "checkout",
  "financial_document",
  "order",
  "payment",
  "refund",
] as const;

export type RefundStatutoryCommercialFactRefKind =
  (typeof REFUND_STATUTORY_COMMERCIAL_FACT_REF_KINDS)[number];
