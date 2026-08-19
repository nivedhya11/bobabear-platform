/**
 * Financial Document domain validation (IMP-028 / D-365 / C1 compliance).
 */
import {
  BILL_OF_SUPPLY_ONLY_CREDIT_NOTE_PROHIBITED,
  FINANCIAL_DOCUMENT_STATUTORY_TYPES,
  FINANCIAL_YEAR_PATTERN,
  FORBIDDEN_STATUTORY_TYPE_TAX_RECEIPT,
  INTERSTATE_STATE_NAME_REQUIRED_TYPES,
  RECIPIENT_NAME_ADDRESS_REQUIRED_TYPES,
  REFUND_VOUCHER_REQUIRES_PRIOR_RECEIPT_VOUCHER,
  REVERSE_CHARGE_INDICATION_REQUIRED_TYPES,
  SECTION_34_CREDIT_NOTE_REQUIRES_PRIOR_TAX_INVOICE,
  STATUTORY_DOCUMENT_NUMBER_MAX_LENGTH,
  STATUTORY_SEQUENCE_PAD_WIDTH,
  type FinancialDocumentStatutoryType,
} from "./constants";
import { FinancialDocumentError } from "./errors";
import { resolveGstStateNameFromCode } from "./gst-state-codes";

export function isFinancialDocumentStatutoryType(
  value: string,
): value is FinancialDocumentStatutoryType {
  return (FINANCIAL_DOCUMENT_STATUTORY_TYPES as readonly string[]).includes(value);
}

export function assertFinancialDocumentStatutoryType(
  value: string,
): FinancialDocumentStatutoryType {
  if (value === FORBIDDEN_STATUTORY_TYPE_TAX_RECEIPT) {
    throw new FinancialDocumentError(
      "TAX_RECEIPT_FORBIDDEN",
      "TAX_RECEIPT is not a statutory Financial Document type (roadmap Tax Receipt is projection terminology only).",
    );
  }
  if (!isFinancialDocumentStatutoryType(value)) {
    throw new FinancialDocumentError(
      "INVALID_STATUTORY_TYPE",
      `Unsupported Financial Document statutory type: ${value}`,
    );
  }
  return value;
}

export function assertFinancialYear(value: string): string {
  if (!FINANCIAL_YEAR_PATTERN.test(value)) {
    throw new FinancialDocumentError(
      "INVALID_FINANCIAL_YEAR",
      `Financial year must match YYYY-YY (got ${value})`,
    );
  }
  return value;
}

/**
 * Section 34 Credit Note requires prior TAX_INVOICE(S) only.
 * Bill of Supply must never satisfy that precondition.
 */
export function assertCreditNotePriorLinkage(input: {
  documentType: FinancialDocumentStatutoryType;
  priorFinancialDocumentId: string | null | undefined;
  priorDocumentType: FinancialDocumentStatutoryType | null | undefined;
}): void {
  if (input.documentType !== "CREDIT_NOTE") {
    return;
  }

  if (!SECTION_34_CREDIT_NOTE_REQUIRES_PRIOR_TAX_INVOICE) {
    return;
  }

  if (!input.priorFinancialDocumentId) {
    throw new FinancialDocumentError(
      "CREDIT_NOTE_REQUIRES_PRIOR_TAX_INVOICE",
      "CREDIT_NOTE requires a prior Financial Document identity (Section 34 Tax Invoice).",
    );
  }

  if (input.priorDocumentType === "BILL_OF_SUPPLY") {
    if (BILL_OF_SUPPLY_ONLY_CREDIT_NOTE_PROHIBITED) {
      throw new FinancialDocumentError(
        "BILL_OF_SUPPLY_CREDIT_NOTE_PROHIBITED",
        "Automatic Section 34 Credit Note against Bill of Supply is prohibited.",
      );
    }
  }

  if (input.priorDocumentType !== "TAX_INVOICE") {
    throw new FinancialDocumentError(
      "CREDIT_NOTE_REQUIRES_PRIOR_TAX_INVOICE",
      "CREDIT_NOTE prior document must be TAX_INVOICE (not Bill of Supply or other types).",
    );
  }
}

/**
 * D-366 / D-365: REFUND_VOUCHER requires exact prior RECEIPT_VOUCHER.
 */
export function assertRefundVoucherPriorLinkage(input: {
  documentType: FinancialDocumentStatutoryType;
  priorFinancialDocumentId: string | null | undefined;
  priorDocumentType: FinancialDocumentStatutoryType | null | undefined;
}): void {
  if (input.documentType !== "REFUND_VOUCHER") {
    return;
  }

  if (!REFUND_VOUCHER_REQUIRES_PRIOR_RECEIPT_VOUCHER) {
    return;
  }

  if (!input.priorFinancialDocumentId) {
    throw new FinancialDocumentError(
      "REFUND_VOUCHER_REQUIRES_PRIOR_RECEIPT_VOUCHER",
      "REFUND_VOUCHER requires a prior RECEIPT_VOUCHER identity.",
    );
  }

  if (input.priorDocumentType !== "RECEIPT_VOUCHER") {
    throw new FinancialDocumentError(
      "REFUND_VOUCHER_REQUIRES_PRIOR_RECEIPT_VOUCHER",
      "REFUND_VOUCHER prior document must be RECEIPT_VOUCHER.",
    );
  }
}

export function documentRequiresReverseChargeIndication(
  documentType: FinancialDocumentStatutoryType,
): boolean {
  return (REVERSE_CHARGE_INDICATION_REQUIRED_TYPES as readonly string[]).includes(
    documentType,
  );
}

export function documentRequiresRecipientNameAddress(
  documentType: FinancialDocumentStatutoryType,
): boolean {
  return (RECIPIENT_NAME_ADDRESS_REQUIRED_TYPES as readonly string[]).includes(
    documentType,
  );
}

/**
 * Type-aware recipient name/address gate for new issuance.
 * Does not invent GSTIN capture (B2C boundary retained).
 */
export function assertRecipientParticularsForIssuance(input: {
  documentType: FinancialDocumentStatutoryType;
  recipientDisplayName: string | null | undefined;
  recipientAddress: string | null | undefined;
}): void {
  if (!documentRequiresRecipientNameAddress(input.documentType)) {
    return;
  }
  const name =
    typeof input.recipientDisplayName === "string"
      ? input.recipientDisplayName.trim()
      : "";
  const address =
    typeof input.recipientAddress === "string" ? input.recipientAddress.trim() : "";
  if (!name) {
    throw new FinancialDocumentError(
      "RECIPIENT_PARTICULARS_REQUIRED",
      `${input.documentType} issuance requires sealed recipient display name.`,
    );
  }
  if (!address) {
    throw new FinancialDocumentError(
      "RECIPIENT_PARTICULARS_REQUIRED",
      `${input.documentType} issuance requires sealed recipient address.`,
    );
  }
}

/**
 * Fail closed when reverse-charge indication is required but profile authority
 * does not seal an explicit boolean (never infer from tax amounts/rates).
 */
export function assertReverseChargeAuthorityForIssuance(input: {
  documentType: FinancialDocumentStatutoryType;
  reverseChargeApplicable: boolean | null | undefined;
}): void {
  if (!documentRequiresReverseChargeIndication(input.documentType)) {
    return;
  }
  if (typeof input.reverseChargeApplicable !== "boolean") {
    throw new FinancialDocumentError(
      "REVERSE_CHARGE_AUTHORITY_REQUIRED",
      `${input.documentType} issuance requires explicit reverseChargeApplicable on the locked effective issuer profile.`,
    );
  }
}

export function documentRequiresInterStateStateNameParticular(
  documentType: FinancialDocumentStatutoryType,
): boolean {
  return (INTERSTATE_STATE_NAME_REQUIRED_TYPES as readonly string[]).includes(
    documentType,
  );
}

/**
 * Whether the sealed supplier / place-of-supply / tax-component facts describe
 * an inter-State supply path. Does not invent place of supply from tax type alone
 * when codes are absent — callers must still supply complete POS authority.
 */
export function isInterStatePlaceOfSupplyPath(input: {
  supplierStateCode: string | null | undefined;
  placeOfSupplyStateCode: string | null | undefined;
  lineTaxTypes: readonly string[];
}): boolean {
  const hasIgst = input.lineTaxTypes.some((t) => t === "igst");
  if (hasIgst) {
    return true;
  }
  const supplier = input.supplierStateCode ?? null;
  const pos = input.placeOfSupplyStateCode ?? null;
  return Boolean(supplier && pos && supplier !== pos);
}

/**
 * Inter-State / IGST issuance gate (D-365 restored capability).
 *
 * - Intra-State CGST+SGST/UTGST path: unchanged (no State-name particular gate).
 * - Inter-State / pure-IGST path: when the document type's applicable rules
 *   require the State-name particular (TAX_INVOICE / RECEIPT_VOUCHER), require a
 *   sealed GST State code that maps to a known local registry State name before
 *   numbering.
 * - REFUND_VOUCHER / CREDIT_NOTE: no mandatory State-name issuance gate from
 *   this requirement (optional render projection only).
 * - Structural IGST + identical supplier/POS codes: fail closed.
 * - Missing / unmapped required State authority: fail closed (no blanket IGST ban).
 */
export function assertSupportedPlaceOfSupplyPath(input: {
  documentType: FinancialDocumentStatutoryType;
  supplierStateCode: string | null | undefined;
  placeOfSupplyStateCode: string | null | undefined;
  lineTaxTypes: readonly string[];
}): void {
  const hasIgst = input.lineTaxTypes.some((t) => t === "igst");
  const supplier = input.supplierStateCode ?? null;
  const pos = input.placeOfSupplyStateCode ?? null;

  if (hasIgst && supplier && pos && supplier === pos) {
    throw new FinancialDocumentError(
      "UNSUPPORTED_INTER_STATE_PARTICULARS",
      "IGST tax components are incompatible with identical supplier and place-of-supply state codes.",
    );
  }

  if (
    !isInterStatePlaceOfSupplyPath({
      supplierStateCode: supplier,
      placeOfSupplyStateCode: pos,
      lineTaxTypes: input.lineTaxTypes,
    })
  ) {
    return;
  }

  if (!documentRequiresInterStateStateNameParticular(input.documentType)) {
    return;
  }

  const stateName = resolveGstStateNameFromCode(pos);
  if (!stateName) {
    throw new FinancialDocumentError(
      "UNSUPPORTED_INTER_STATE_PARTICULARS",
      `${input.documentType} inter-State issuance requires a sealed place-of-supply GST State code with a known statutory State name.`,
    );
  }
}

export function assertStatutoryDocumentNumberLength(statutoryDocumentNumber: string): string {
  if (typeof statutoryDocumentNumber !== "string" || statutoryDocumentNumber.trim().length === 0) {
    throw new FinancialDocumentError(
      "STATUTORY_NUMBER_INVALID",
      "Statutory document number must be a non-empty string.",
    );
  }
  if (statutoryDocumentNumber.length > STATUTORY_DOCUMENT_NUMBER_MAX_LENGTH) {
    throw new FinancialDocumentError(
      "STATUTORY_NUMBER_INVALID",
      `Statutory document number exceeds ${STATUTORY_DOCUMENT_NUMBER_MAX_LENGTH} characters (got ${statutoryDocumentNumber.length}: ${statutoryDocumentNumber}).`,
    );
  }
  return statutoryDocumentNumber;
}

/**
 * Exact formatting formula: prefix + sequence left-padded to STATUTORY_SEQUENCE_PAD_WIDTH.
 * FY uniqueness lives in series scope / prefix convention — not appended here.
 */
export function formatStatutoryDocumentNumber(
  prefix: string,
  sequenceNumber: bigint,
): string {
  if (typeof prefix !== "string" || prefix.length === 0) {
    throw new FinancialDocumentError(
      "STATUTORY_NUMBER_INVALID",
      "Numbering series prefix must be a non-empty string.",
    );
  }
  if (sequenceNumber < 1n) {
    throw new FinancialDocumentError(
      "STATUTORY_NUMBER_INVALID",
      `Sequence number must be >= 1 (got ${sequenceNumber.toString()}).`,
    );
  }
  const padded = sequenceNumber.toString().padStart(STATUTORY_SEQUENCE_PAD_WIDTH, "0");
  const formatted = `${prefix}${padded}`;
  return assertStatutoryDocumentNumberLength(formatted);
}

/**
 * Validate that a series configuration can produce a legal number for the
 * given next sequence without truncating or inventing a new format.
 */
export function assertNumberingSeriesProducesValidStatutoryNumber(
  prefix: string,
  nextSequence: bigint,
): void {
  formatStatutoryDocumentNumber(prefix, nextSequence);
}
