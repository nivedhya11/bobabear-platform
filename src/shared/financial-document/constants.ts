/**
 * Financial Document domain constants (IMP-028 / D-365).
 *
 * Statutory types are locked by architecture. TAX_RECEIPT is intentionally absent.
 */

export const FINANCIAL_DOCUMENT_STATUTORY_TYPES = [
  "TAX_INVOICE",
  "BILL_OF_SUPPLY",
  "RECEIPT_VOUCHER",
  "REFUND_VOUCHER",
  "CREDIT_NOTE",
] as const;

export type FinancialDocumentStatutoryType =
  (typeof FINANCIAL_DOCUMENT_STATUTORY_TYPES)[number];

/** Roadmap “Tax Receipt” is projection terminology — never a statutory type. */
export const FORBIDDEN_STATUTORY_TYPE_TAX_RECEIPT = "TAX_RECEIPT" as const;

/**
 * Issued documents are sealed historical truth (ARCH-G16).
 * No DRAFT / mutable workflow states in this foundation.
 */
export const FINANCIAL_DOCUMENT_STATUSES = ["ISSUED"] as const;

export type FinancialDocumentStatus = (typeof FINANCIAL_DOCUMENT_STATUSES)[number];

export const FINANCIAL_DOCUMENT_CURRENCY = "INR" as const;

export const FINANCIAL_DOCUMENT_TAX_TYPES = [
  "cgst",
  "sgst",
  "utgst",
  "igst",
] as const;

export type FinancialDocumentTaxType = (typeof FINANCIAL_DOCUMENT_TAX_TYPES)[number];

export const FINANCIAL_DOCUMENT_REGISTRATION_SCHEMES = [
  "regular",
  "composition",
] as const;

export type FinancialDocumentRegistrationScheme =
  (typeof FINANCIAL_DOCUMENT_REGISTRATION_SCHEMES)[number];

export const FINANCIAL_DOCUMENT_ISSUANCE_POLICIES = [
  "uninvoiced_advance",
  "invoice_at_payment",
] as const;

export type FinancialDocumentIssuancePolicy =
  (typeof FINANCIAL_DOCUMENT_ISSUANCE_POLICIES)[number];

export const FINANCIAL_DOCUMENT_ISSUER_PROFILE_LIFECYCLE_STATUSES = [
  "draft",
  "active",
  "retired",
] as const;

export type FinancialDocumentIssuerProfileLifecycleStatus =
  (typeof FINANCIAL_DOCUMENT_ISSUER_PROFILE_LIFECYCLE_STATUSES)[number];

/** India financial year label, e.g. 2025-26 (April–March). */
export const FINANCIAL_YEAR_PATTERN = /^[0-9]{4}-[0-9]{2}$/;

/**
 * GST Rule 46 / invoice particulars: complete statutory serial (prefix + sequence)
 * must never exceed 16 characters. Sequence is left-padded to at least this width.
 */
export const STATUTORY_DOCUMENT_NUMBER_MAX_LENGTH = 16;
export const STATUTORY_SEQUENCE_PAD_WIDTH = 6;

export const SECTION_34_CREDIT_NOTE_REQUIRES_PRIOR_TAX_INVOICE = true;
export const BILL_OF_SUPPLY_ONLY_CREDIT_NOTE_PROHIBITED = true;

/** D-366 / D-365: REFUND_VOUCHER requires exact prior RECEIPT_VOUCHER. */
export const REFUND_VOUCHER_REQUIRES_PRIOR_RECEIPT_VOUCHER = true;

/**
 * Document types whose verified current rules require a reverse-charge indication.
 * Credit Note is intentionally excluded unless separately proven.
 */
export const REVERSE_CHARGE_INDICATION_REQUIRED_TYPES = [
  "TAX_INVOICE",
  "RECEIPT_VOUCHER",
  "REFUND_VOUCHER",
] as const satisfies readonly FinancialDocumentStatutoryType[];

/**
 * Document types that require sealed recipient name + address under current
 * B2C / voucher applicability (fail closed when missing on new issuance).
 */
export const RECIPIENT_NAME_ADDRESS_REQUIRED_TYPES = [
  "TAX_INVOICE",
  "RECEIPT_VOUCHER",
  "REFUND_VOUCHER",
  "CREDIT_NOTE",
] as const satisfies readonly FinancialDocumentStatutoryType[];

/**
 * Document types whose applicable rules require place-of-supply State name
 * + code when the supply path is inter-State (IGST / differing State codes).
 *
 * Verified mandatory applicability (current C1 scope):
 * - TAX_INVOICE (Rule 46)
 * - RECEIPT_VOUCHER (Rule 50)
 *
 * REFUND_VOUCHER / CREDIT_NOTE: no mandatory State-name issuance gate from
 * Rule 51 / Rule 53(1A) for this correction — optional render projection only.
 * BILL_OF_SUPPLY: BoS State-name applicability not independently proven; not
 * expanded here (pre-correction non-mandatory gate preserved).
 *
 * Intra-State current BOBA projection remains code-only and is unchanged.
 */
export const INTERSTATE_STATE_NAME_REQUIRED_TYPES = [
  "TAX_INVOICE",
  "RECEIPT_VOUCHER",
] as const satisfies readonly FinancialDocumentStatutoryType[];
