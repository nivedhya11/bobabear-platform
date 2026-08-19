/**
 * Financial Document render-model projection (IMP-028 Slice 3 / D-365 / ARCH-G16).
 *
 * Financial Document = authority.
 * Render model = deterministic projection of sealed facts only.
 *
 * This module performs no menu/catalog, issuer, recipient, tax-policy,
 * Payment, Refund, or Order lookups.
 *
 * When public prior-document facts are rendered, the referenced immutable
 * prior Financial Document must be supplied by the caller and identity-bound
 * to document.priorFinancialDocumentId. The renderer never loads it.
 */
import {
  FINANCIAL_DOCUMENT_STATUTORY_TYPES,
  type FinancialDocumentRegistrationScheme,
  type FinancialDocumentStatutoryType,
  type FinancialDocumentTaxType,
} from "./constants";
import { FinancialDocumentError } from "./errors";
import {
  formatInrPaise,
  formatIssueDateTimeUtc,
  formatIssueDateUtc,
  formatRateBps,
  formatRegistrationSchemeLabel,
  formatStatutoryDocumentTitle,
  formatTaxComponentLabel,
} from "./format";
import type { FinancialDocument } from "./types";
import { resolveGstStateNameFromCode } from "./gst-state-codes";
import {
  documentRequiresReverseChargeIndication,
  isInterStatePlaceOfSupplyPath,
} from "./validate";

/**
 * Immutable authority dependencies required for deterministic rendering
 * when facts are not sealed on the current Financial Document alone.
 *
 * Distinct from presentation options — these are Financial Document
 * authorities, not styling/layout knobs.
 */
export type FinancialDocumentRenderAuthorityDependencies = Readonly<{
  /**
   * Referenced immutable prior Financial Document. Required when the current
   * document carries priorFinancialDocumentId and public prior number/date
   * are part of the rendered representation (CREDIT_NOTE).
   */
  priorFinancialDocument?: FinancialDocument;
}>;

export type FinancialDocumentRenderTaxComponent = Readonly<{
  taxType: FinancialDocumentTaxType;
  label: string;
  rateBps: number;
  rateDisplay: string;
  taxableAmountPaise: bigint;
  taxableAmountDisplay: string;
  taxAmountPaise: bigint;
  taxAmountDisplay: string;
}>;

export type FinancialDocumentRenderLine = Readonly<{
  lineNumber: number;
  description: string;
  quantity: number;
  unitPaise: bigint;
  unitDisplay: string;
  discountPaise: bigint;
  discountDisplay: string;
  chargePaise: bigint;
  chargeDisplay: string;
  taxableValuePaise: bigint;
  taxableValueDisplay: string;
  lineTotalPaise: bigint;
  lineTotalDisplay: string;
  sacCode: string | null;
  hsnCode: string | null;
  taxComponents: readonly FinancialDocumentRenderTaxComponent[];
}>;

export type FinancialDocumentRenderModel = Readonly<{
  documentType: FinancialDocumentStatutoryType;
  statutoryTitle: string;
  statutoryDocumentNumber: string;
  issueAt: Date;
  issueDateDisplay: string;
  issueDateTimeDisplay: string;
  financialYear: string;
  currency: "INR";
  supplier: Readonly<{
    legalName: string;
    gstin: string | null;
    registeredAddress: string | null;
    stateCode: string | null;
    registrationScheme: FinancialDocumentRegistrationScheme | null;
    registrationSchemeDisplay: string | null;
  }>;
  recipient: Readonly<{
    displayName: string | null;
    phoneE164: string | null;
    address: string | null;
  }>;
  lines: readonly FinancialDocumentRenderLine[];
  tax: Readonly<{
    placeOfSupplyStateCode: string | null;
    placeOfSupplyStateName: string | null;
    reverseChargeApplicable: boolean | null;
    reverseChargeDisplay: string | null;
    components: readonly FinancialDocumentRenderTaxComponent[];
  }>;
  totals: Readonly<{
    taxableTotalPaise: bigint;
    taxableTotalDisplay: string;
    discountTotalPaise: bigint;
    discountTotalDisplay: string;
    chargeTotalPaise: bigint;
    chargeTotalDisplay: string;
    taxTotalPaise: bigint;
    taxTotalDisplay: string;
    grandTotalPaise: bigint;
    grandTotalDisplay: string;
  }>;
  priorDocument: Readonly<{
    documentType: FinancialDocumentStatutoryType;
    documentTypeDisplay: string;
    statutoryDocumentNumber: string;
    issueDateDisplay: string;
  }> | null;
}>;

function requireNonEmpty(
  value: string | null | undefined,
  fact: string,
  documentType: FinancialDocumentStatutoryType,
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new FinancialDocumentError(
      "RENDERING_FAILED",
      `Missing mandatory sealed rendering fact '${fact}' for ${documentType}.`,
    );
  }
  return value.trim();
}

function assertStatutoryType(
  value: string,
): FinancialDocumentStatutoryType {
  if (!(FINANCIAL_DOCUMENT_STATUTORY_TYPES as readonly string[]).includes(value)) {
    throw new FinancialDocumentError(
      "RENDERING_FAILED",
      `Cannot render unsupported statutory type: ${value}`,
    );
  }
  return value as FinancialDocumentStatutoryType;
}

function mapTaxComponent(input: {
  taxType: FinancialDocumentTaxType;
  rateBps: number;
  taxableAmountPaise: bigint;
  taxAmountPaise: bigint;
}): FinancialDocumentRenderTaxComponent {
  return Object.freeze({
    taxType: input.taxType,
    label: formatTaxComponentLabel(input.taxType),
    rateBps: input.rateBps,
    rateDisplay: formatRateBps(input.rateBps),
    taxableAmountPaise: input.taxableAmountPaise,
    taxableAmountDisplay: formatInrPaise(input.taxableAmountPaise),
    taxAmountPaise: input.taxAmountPaise,
    taxAmountDisplay: formatInrPaise(input.taxAmountPaise),
  });
}

/**
 * Bind and project prior Financial Document public facts.
 *
 * Identity and type must match the current document's sealed prior linkage.
 * No incomplete prior public reference is emitted.
 */
function projectPriorDocument(
  document: FinancialDocument,
  authority: FinancialDocumentRenderAuthorityDependencies | undefined,
): FinancialDocumentRenderModel["priorDocument"] {
  const priorId = document.priorFinancialDocumentId;
  const priorType = document.priorDocumentType;
  const priorAuthority = authority?.priorFinancialDocument;

  // No sealed prior relationship → no prior projection.
  // Do not accept an unbound prior authority as statutory input.
  if (!priorId && !priorType) {
    if (priorAuthority) {
      throw new FinancialDocumentError(
        "RENDERING_FAILED",
        "priorFinancialDocument was supplied but the current document has no sealed priorFinancialDocumentId.",
      );
    }
    return null;
  }

  if (!priorId || !priorType) {
    throw new FinancialDocumentError(
      "RENDERING_AUTHORITY_GAP",
      "Sealed priorFinancialDocumentId and priorDocumentType must both be present when a prior relationship exists.",
    );
  }

  // CREDIT_NOTE Section 34: prior must be TAX_INVOICE (sealed + supplied).
  if (document.documentType === "CREDIT_NOTE" && priorType !== "TAX_INVOICE") {
    throw new FinancialDocumentError(
      "RENDERING_FAILED",
      `CREDIT_NOTE prior document type must be TAX_INVOICE (got ${priorType}).`,
    );
  }

  // REFUND_VOUCHER: prior must be RECEIPT_VOUCHER (sealed + supplied).
  if (document.documentType === "REFUND_VOUCHER" && priorType !== "RECEIPT_VOUCHER") {
    throw new FinancialDocumentError(
      "RENDERING_FAILED",
      `REFUND_VOUCHER prior document type must be RECEIPT_VOUCHER (got ${priorType}).`,
    );
  }

  // Public prior number/date are not sealed on the current document.
  // Rendering them requires the identity-bound immutable prior authority.
  if (!priorAuthority) {
    throw new FinancialDocumentError(
      "RENDERING_AUTHORITY_GAP",
      "Referenced immutable prior Financial Document authority is required to render prior public document number and issue date.",
    );
  }

  if (priorAuthority.id !== priorId) {
    throw new FinancialDocumentError(
      "RENDERING_AUTHORITY_GAP",
      "priorFinancialDocument.id does not match current document priorFinancialDocumentId.",
    );
  }

  if (priorAuthority.documentType !== priorType) {
    throw new FinancialDocumentError(
      "RENDERING_FAILED",
      "priorFinancialDocument.documentType does not match current document priorDocumentType.",
    );
  }

  if (document.documentType === "CREDIT_NOTE" && priorAuthority.documentType !== "TAX_INVOICE") {
    throw new FinancialDocumentError(
      "RENDERING_FAILED",
      `CREDIT_NOTE prior Financial Document must be TAX_INVOICE (got ${priorAuthority.documentType}).`,
    );
  }

  if (
    document.documentType === "REFUND_VOUCHER" &&
    priorAuthority.documentType !== "RECEIPT_VOUCHER"
  ) {
    throw new FinancialDocumentError(
      "RENDERING_FAILED",
      `REFUND_VOUCHER prior Financial Document must be RECEIPT_VOUCHER (got ${priorAuthority.documentType}).`,
    );
  }

  if (priorAuthority.status !== "ISSUED") {
    throw new FinancialDocumentError(
      "RENDERING_FAILED",
      `Prior Financial Document must be ISSUED (got ${priorAuthority.status}).`,
    );
  }

  const priorNumber = requireNonEmpty(
    priorAuthority.statutoryDocumentNumber,
    "priorFinancialDocument.statutoryDocumentNumber",
    document.documentType,
  );

  if (
    !(priorAuthority.issueAt instanceof Date) ||
    Number.isNaN(priorAuthority.issueAt.getTime())
  ) {
    throw new FinancialDocumentError(
      "RENDERING_FAILED",
      "Missing mandatory sealed rendering fact 'priorFinancialDocument.issueAt'.",
    );
  }

  return Object.freeze({
    documentType: priorType,
    documentTypeDisplay: formatStatutoryDocumentTitle(priorType),
    statutoryDocumentNumber: priorNumber,
    issueDateDisplay: formatIssueDateUtc(priorAuthority.issueAt),
  });
}

/**
 * Project an issued Financial Document into a deterministic render model.
 * Displays sealed arithmetic only — never recomputes totals from live config.
 */
export function projectFinancialDocumentRenderModel(
  document: FinancialDocument,
  authority: FinancialDocumentRenderAuthorityDependencies = {},
): FinancialDocumentRenderModel {
  const documentType = assertStatutoryType(document.documentType);

  if (document.status !== "ISSUED") {
    throw new FinancialDocumentError(
      "RENDERING_FAILED",
      `Only ISSUED Financial Documents may be rendered (got ${document.status}).`,
    );
  }

  const statutoryDocumentNumber = requireNonEmpty(
    document.statutoryDocumentNumber,
    "statutoryDocumentNumber",
    documentType,
  );
  const financialYear = requireNonEmpty(
    document.financialYear,
    "financialYear",
    documentType,
  );

  if (document.currency !== "INR") {
    throw new FinancialDocumentError(
      "RENDERING_FAILED",
      `Unsupported currency for rendering: ${String(document.currency)}`,
    );
  }

  if (!(document.issueAt instanceof Date) || Number.isNaN(document.issueAt.getTime())) {
    throw new FinancialDocumentError(
      "RENDERING_FAILED",
      "Missing mandatory sealed rendering fact 'issueAt'.",
    );
  }

  if (!document.lines || document.lines.length === 0) {
    throw new FinancialDocumentError(
      "RENDERING_FAILED",
      "Missing mandatory sealed rendering fact 'lines' (at least one line required).",
    );
  }

  // Supplier legal name is mandatory statutory identity for all rendered types.
  const resolvedSupplierName = requireNonEmpty(
    document.supplierGstLegalName,
    "supplierGstLegalName",
    documentType,
  );

  const sortedLines = [...document.lines].sort(
    (a, b) => a.lineNumber - b.lineNumber,
  );

  const lines: FinancialDocumentRenderLine[] = sortedLines.map((line) => {
    const description = requireNonEmpty(
      line.description,
      `lines[${line.lineNumber}].description`,
      documentType,
    );
    if (!Number.isInteger(line.lineNumber) || line.lineNumber <= 0) {
      throw new FinancialDocumentError(
        "RENDERING_FAILED",
        `Invalid sealed lineNumber: ${String(line.lineNumber)}`,
      );
    }

    const taxComponents = [...line.taxComponents]
      .sort((a, b) => a.taxType.localeCompare(b.taxType))
      .map((tax) =>
        mapTaxComponent({
          taxType: tax.taxType,
          rateBps: tax.rateBps,
          taxableAmountPaise: tax.taxableAmountPaise,
          taxAmountPaise: tax.taxAmountPaise,
        }),
      );

    return Object.freeze({
      lineNumber: line.lineNumber,
      description,
      quantity: line.quantity,
      unitPaise: line.unitPaise,
      unitDisplay: formatInrPaise(line.unitPaise),
      discountPaise: line.discountPaise,
      discountDisplay: formatInrPaise(line.discountPaise),
      chargePaise: line.chargePaise,
      chargeDisplay: formatInrPaise(line.chargePaise),
      taxableValuePaise: line.taxableValuePaise,
      taxableValueDisplay: formatInrPaise(line.taxableValuePaise),
      lineTotalPaise: line.lineTotalPaise,
      lineTotalDisplay: formatInrPaise(line.lineTotalPaise),
      sacCode: line.sacCode,
      hsnCode: line.hsnCode,
      taxComponents: Object.freeze(taxComponents),
    });
  });

  // Flatten sealed line tax components for summary display — no recomputation.
  const taxSummary = lines.flatMap((line) => [...line.taxComponents]);

  const scheme = document.supplierRegistrationScheme;

  // Type-aware RCM projection: required types render sealed Yes/No when present.
  // CREDIT_NOTE does not invent a mandatory RCM particular.
  // Pre-C1 historical rows may have null — omit rather than invent.
  let reverseChargeDisplay: string | null = null;
  if (documentRequiresReverseChargeIndication(documentType)) {
    if (typeof document.reverseChargeApplicable === "boolean") {
      reverseChargeDisplay = document.reverseChargeApplicable ? "Yes" : "No";
    }
  }

  // Inter-State State name: optional deterministic projection from sealed GST
  // code via local registry (TI/RV also require this at issuance; RFV/CN may
  // render it without making it an issuance prerequisite).
  // Intra-State current BOBA path remains code-only (no invented State name).
  const lineTaxTypes = document.lines.flatMap((line) =>
    line.taxComponents.map((component) => component.taxType),
  );
  const interState = isInterStatePlaceOfSupplyPath({
    supplierStateCode: document.supplierStateCode,
    placeOfSupplyStateCode: document.placeOfSupplyStateCode,
    lineTaxTypes,
  });
  let placeOfSupplyStateName: string | null = null;
  if (interState && document.placeOfSupplyStateCode) {
    placeOfSupplyStateName = resolveGstStateNameFromCode(
      document.placeOfSupplyStateCode,
    );
  }

  return Object.freeze({
    documentType,
    statutoryTitle: formatStatutoryDocumentTitle(documentType),
    statutoryDocumentNumber,
    issueAt: document.issueAt,
    issueDateDisplay: formatIssueDateUtc(document.issueAt),
    issueDateTimeDisplay: formatIssueDateTimeUtc(document.issueAt),
    financialYear,
    currency: "INR",
    supplier: Object.freeze({
      legalName: resolvedSupplierName,
      gstin: document.supplierGstin,
      registeredAddress: document.supplierRegisteredAddress,
      stateCode: document.supplierStateCode,
      registrationScheme: scheme,
      registrationSchemeDisplay: scheme
        ? formatRegistrationSchemeLabel(scheme)
        : null,
    }),
    recipient: Object.freeze({
      displayName: document.recipientDisplayName,
      phoneE164: document.recipientPhoneE164,
      address: document.recipientAddress,
    }),
    lines: Object.freeze(lines),
    tax: Object.freeze({
      placeOfSupplyStateCode: document.placeOfSupplyStateCode,
      placeOfSupplyStateName,
      reverseChargeApplicable:
        typeof document.reverseChargeApplicable === "boolean"
          ? document.reverseChargeApplicable
          : null,
      reverseChargeDisplay,
      components: Object.freeze(taxSummary),
    }),
    totals: Object.freeze({
      taxableTotalPaise: document.taxableTotalPaise,
      taxableTotalDisplay: formatInrPaise(document.taxableTotalPaise),
      discountTotalPaise: document.discountTotalPaise,
      discountTotalDisplay: formatInrPaise(document.discountTotalPaise),
      chargeTotalPaise: document.chargeTotalPaise,
      chargeTotalDisplay: formatInrPaise(document.chargeTotalPaise),
      taxTotalPaise: document.taxTotalPaise,
      taxTotalDisplay: formatInrPaise(document.taxTotalPaise),
      grandTotalPaise: document.grandTotalPaise,
      grandTotalDisplay: formatInrPaise(document.grandTotalPaise),
    }),
    priorDocument: projectPriorDocument(document, authority),
  });
}
