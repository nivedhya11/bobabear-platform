/**
 * Immutable Financial Document issuance-intent fingerprint (IMP-028 Slice 2).
 *
 * Uses explicit semantic request fields only — never JSON.stringify of caller
 * input, never volatile clocks / issueAt / statutory numbers, never current
 * issuer-profile resolution identity (profile id/version are issuance
 * results, not request identity).
 */
import { createHash } from "node:crypto";

import type { FinancialDocumentStatutoryType, FinancialDocumentTaxType } from "./constants";
import type { FinancialDocument } from "./types";

export type IssuanceIntentLineFingerprintInput = Readonly<{
  lineNumber: number;
  description: string;
  quantity: number;
  unitPaise: bigint;
  discountPaise: bigint;
  chargePaise: bigint;
  taxableValuePaise: bigint;
  lineTotalPaise: bigint;
  sacCode: string | null;
  hsnCode: string | null;
  historicalCatalogItemId: string | null;
  taxComponents: readonly Readonly<{
    taxType: FinancialDocumentTaxType;
    rateBps: number;
    taxableAmountPaise: bigint;
    taxAmountPaise: bigint;
  }>[];
}>;

export type IssuanceIntentFingerprintInput = Readonly<{
  documentType: FinancialDocumentStatutoryType;
  legalEntityId: string;
  financialYear: string;
  numberingSeriesId: string;
  taxableTotalPaise: bigint;
  taxTotalPaise: bigint;
  discountTotalPaise: bigint;
  chargeTotalPaise: bigint;
  grandTotalPaise: bigint;
  placeOfSupplyStateCode: string | null;
  checkoutId: string | null;
  checkoutSnapshotId: string | null;
  paymentId: string | null;
  refundId: string | null;
  orderId: string | null;
  priorFinancialDocumentId: string | null;
  priorDocumentType: FinancialDocumentStatutoryType | null;
  recipientDisplayName: string | null;
  recipientPhoneE164: string | null;
  recipientAddress: string | null;
  lines: readonly IssuanceIntentLineFingerprintInput[];
}>;

function nullToEmpty(value: string | null | undefined): string {
  return value ?? "";
}

function serializeLine(line: IssuanceIntentLineFingerprintInput): string {
  const taxes = [...line.taxComponents]
    .sort((a, b) => a.taxType.localeCompare(b.taxType))
    .map(
      (t) =>
        `${t.taxType}:${t.rateBps}:${t.taxableAmountPaise.toString()}:${t.taxAmountPaise.toString()}`,
    )
    .join(",");
  return [
    `n=${line.lineNumber}`,
    `d=${line.description}`,
    `q=${line.quantity}`,
    `u=${line.unitPaise.toString()}`,
    `disc=${line.discountPaise.toString()}`,
    `chg=${line.chargePaise.toString()}`,
    `tv=${line.taxableValuePaise.toString()}`,
    `lt=${line.lineTotalPaise.toString()}`,
    `sac=${nullToEmpty(line.sacCode)}`,
    `hsn=${nullToEmpty(line.hsnCode)}`,
    `hist=${nullToEmpty(line.historicalCatalogItemId)}`,
    `tax=${taxes}`,
  ].join("|");
}

export function hashFinancialDocumentIssuanceIntent(
  input: IssuanceIntentFingerprintInput,
): string {
  const lines = [...input.lines]
    .sort((a, b) => a.lineNumber - b.lineNumber)
    .map(serializeLine);
  const fields: Record<string, string> = {
    documentType: input.documentType,
    legalEntityId: input.legalEntityId,
    financialYear: input.financialYear,
    numberingSeriesId: input.numberingSeriesId,
    taxableTotalPaise: input.taxableTotalPaise.toString(),
    taxTotalPaise: input.taxTotalPaise.toString(),
    discountTotalPaise: input.discountTotalPaise.toString(),
    chargeTotalPaise: input.chargeTotalPaise.toString(),
    grandTotalPaise: input.grandTotalPaise.toString(),
    placeOfSupplyStateCode: nullToEmpty(input.placeOfSupplyStateCode),
    checkoutId: nullToEmpty(input.checkoutId),
    checkoutSnapshotId: nullToEmpty(input.checkoutSnapshotId),
    paymentId: nullToEmpty(input.paymentId),
    refundId: nullToEmpty(input.refundId),
    orderId: nullToEmpty(input.orderId),
    priorFinancialDocumentId: nullToEmpty(input.priorFinancialDocumentId),
    priorDocumentType: nullToEmpty(input.priorDocumentType),
    recipientDisplayName: nullToEmpty(input.recipientDisplayName),
    recipientPhoneE164: nullToEmpty(input.recipientPhoneE164),
    recipientAddress: nullToEmpty(input.recipientAddress),
    lines: lines.join(";"),
  };
  const keys = Object.keys(fields).sort();
  const canonical = [
    "op=issue_financial_document",
    ...keys.map((k) => `${k}=${fields[k]!}`),
  ].join("\n");
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export function issuanceIntentFingerprintFromDocument(
  document: FinancialDocument,
): string {
  return hashFinancialDocumentIssuanceIntent({
    documentType: document.documentType,
    legalEntityId: document.legalEntityId,
    financialYear: document.financialYear,
    numberingSeriesId: document.numberingSeriesId,
    taxableTotalPaise: document.taxableTotalPaise,
    taxTotalPaise: document.taxTotalPaise,
    discountTotalPaise: document.discountTotalPaise,
    chargeTotalPaise: document.chargeTotalPaise,
    grandTotalPaise: document.grandTotalPaise,
    placeOfSupplyStateCode: document.placeOfSupplyStateCode,
    checkoutId: document.checkoutId,
    checkoutSnapshotId: document.checkoutSnapshotId,
    paymentId: document.paymentId,
    refundId: document.refundId,
    orderId: document.orderId,
    priorFinancialDocumentId: document.priorFinancialDocumentId,
    priorDocumentType: document.priorDocumentType,
    recipientDisplayName: document.recipientDisplayName,
    recipientPhoneE164: document.recipientPhoneE164,
    recipientAddress: document.recipientAddress,
    lines: document.lines.map((line) => ({
      lineNumber: line.lineNumber,
      description: line.description,
      quantity: line.quantity,
      unitPaise: line.unitPaise,
      discountPaise: line.discountPaise,
      chargePaise: line.chargePaise,
      taxableValuePaise: line.taxableValuePaise,
      lineTotalPaise: line.lineTotalPaise,
      sacCode: line.sacCode,
      hsnCode: line.hsnCode,
      historicalCatalogItemId: line.historicalCatalogItemId,
      taxComponents: line.taxComponents.map((t) => ({
        taxType: t.taxType,
        rateBps: t.rateBps,
        taxableAmountPaise: t.taxableAmountPaise,
        taxAmountPaise: t.taxAmountPaise,
      })),
    })),
  });
}
