/**
 * Logical issuance request-intent comparison (IMP-028 Slice 2 correction).
 *
 * Distinguishes REQUEST INTENT from CURRENT CONFIGURATION RESOLUTION.
 * Issuer profile id/version and current profile defaults are not part of
 * request identity — historical issued truth wins on retry.
 */
import type { SealedIssuanceTotals } from "./arithmetic";
import type { FinancialDocument, IssueFinancialDocumentCommand } from "./types";

function sameNullableString(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  return (left ?? null) === (right ?? null);
}

/**
 * True when the retry command is the same logical issuance request that
 * produced `document`, ignoring current mutable issuer-profile selection.
 *
 * Caller-omitted SAC/HSN may match historically defaulted sealed values.
 * Explicit caller SAC/HSN must match sealed values exactly.
 */
export function logicalIssuanceRequestMatches(
  command: IssueFinancialDocumentCommand,
  sealed: SealedIssuanceTotals,
  document: FinancialDocument,
): boolean {
  if (command.documentType !== document.documentType) return false;
  if (command.legalEntityId !== document.legalEntityId) return false;
  if (command.financialYear !== document.financialYear) return false;
  if (command.numberingSeriesId !== document.numberingSeriesId) return false;
  if (!sameNullableString(command.placeOfSupplyStateCode, document.placeOfSupplyStateCode)) {
    return false;
  }
  if (!sameNullableString(command.recipientDisplayName, document.recipientDisplayName)) {
    return false;
  }
  if (!sameNullableString(command.recipientPhoneE164, document.recipientPhoneE164)) {
    return false;
  }
  if (!sameNullableString(command.recipientAddress, document.recipientAddress)) {
    return false;
  }
  if (!sameNullableString(command.checkoutId, document.checkoutId)) return false;
  if (!sameNullableString(command.checkoutSnapshotId, document.checkoutSnapshotId)) {
    return false;
  }
  if (!sameNullableString(command.paymentId, document.paymentId)) return false;
  if (!sameNullableString(command.refundId, document.refundId)) return false;
  if (!sameNullableString(command.orderId, document.orderId)) return false;
  if (
    !sameNullableString(
      command.priorFinancialDocumentId,
      document.priorFinancialDocumentId,
    )
  ) {
    return false;
  }

  if (sealed.taxableTotalPaise !== document.taxableTotalPaise) return false;
  if (sealed.taxTotalPaise !== document.taxTotalPaise) return false;
  if (sealed.discountTotalPaise !== document.discountTotalPaise) return false;
  if (sealed.chargeTotalPaise !== document.chargeTotalPaise) return false;
  if (sealed.grandTotalPaise !== document.grandTotalPaise) return false;

  if (sealed.lines.length !== document.lines.length) return false;
  const commandByNumber = new Map(
    command.lines.map((line) => [line.lineNumber, line] as const),
  );
  const documentByNumber = new Map(
    document.lines.map((line) => [line.lineNumber, line] as const),
  );

  for (const sealedLine of sealed.lines) {
    const docLine = documentByNumber.get(sealedLine.lineNumber);
    const cmdLine = commandByNumber.get(sealedLine.lineNumber);
    if (!docLine || !cmdLine) return false;

    if (sealedLine.description !== docLine.description) return false;
    if (sealedLine.quantity !== docLine.quantity) return false;
    if (sealedLine.unitPaise !== docLine.unitPaise) return false;
    if (sealedLine.discountPaise !== docLine.discountPaise) return false;
    if (sealedLine.chargePaise !== docLine.chargePaise) return false;
    if (sealedLine.taxableValuePaise !== docLine.taxableValuePaise) return false;
    if (sealedLine.lineTotalPaise !== docLine.lineTotalPaise) return false;
    if (
      !sameNullableString(
        sealedLine.historicalCatalogItemId,
        docLine.historicalCatalogItemId,
      )
    ) {
      return false;
    }

    const callerSac = cmdLine.sacCode ?? null;
    if (callerSac !== null && callerSac !== docLine.sacCode) return false;
    const callerHsn = cmdLine.hsnCode ?? null;
    if (callerHsn !== null && callerHsn !== docLine.hsnCode) return false;

    if (sealedLine.taxComponents.length !== docLine.taxComponents.length) {
      return false;
    }
    const sealedTaxes = [...sealedLine.taxComponents].sort((a, b) =>
      a.taxType.localeCompare(b.taxType),
    );
    const docTaxes = [...docLine.taxComponents].sort((a, b) =>
      a.taxType.localeCompare(b.taxType),
    );
    for (let i = 0; i < sealedTaxes.length; i++) {
      const left = sealedTaxes[i]!;
      const right = docTaxes[i]!;
      if (left.taxType !== right.taxType) return false;
      if (left.rateBps !== right.rateBps) return false;
      if (left.taxableAmountPaise !== right.taxableAmountPaise) return false;
      if (left.taxAmountPaise !== right.taxAmountPaise) return false;
    }
  }

  return true;
}
