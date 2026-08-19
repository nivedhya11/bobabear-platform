/**
 * Canonical PARTIAL issuance-allocation comparison (IMP-028 / D-366 Slice 3A).
 *
 * Set-based: equivalent input array order must not create a false conflict.
 * All money remains integer paise strings in canonical form.
 */
import type { RefundStatutoryIssuanceAllocationSourceDocumentType } from "./constants";

export type CanonicalIssuanceAllocationLine = Readonly<{
  sourceFinancialDocumentLineId: string;
  allocatedTaxableOrBaseAmountPaise: bigint;
}>;

export type CanonicalIssuanceAllocationTaxComponent = Readonly<{
  sourceFinancialDocumentTaxComponentId: string;
  sourceFinancialDocumentLineId: string;
  taxType: string;
  taxRateBps: number;
  allocatedTaxAmountPaise: bigint;
}>;

export type CanonicalIssuanceAllocationAuthority = Readonly<{
  refundStatutoryDecisionId: string;
  sourceFinancialDocumentId: string;
  sourceDocumentType: RefundStatutoryIssuanceAllocationSourceDocumentType;
  sealedReversalAmountPaise: bigint;
  lines: readonly CanonicalIssuanceAllocationLine[];
  taxComponents: readonly CanonicalIssuanceAllocationTaxComponent[];
}>;

function compareId(left: string, right: string): number {
  return left.localeCompare(right);
}

export function canonicalizeIssuanceAllocationLines(
  lines: readonly CanonicalIssuanceAllocationLine[],
): readonly CanonicalIssuanceAllocationLine[] {
  return Object.freeze(
    [...lines]
      .map((line) =>
        Object.freeze({
          sourceFinancialDocumentLineId: line.sourceFinancialDocumentLineId,
          allocatedTaxableOrBaseAmountPaise: line.allocatedTaxableOrBaseAmountPaise,
        }),
      )
      .sort((a, b) =>
        compareId(a.sourceFinancialDocumentLineId, b.sourceFinancialDocumentLineId),
      ),
  );
}

export function canonicalizeIssuanceAllocationTaxComponents(
  taxComponents: readonly CanonicalIssuanceAllocationTaxComponent[],
): readonly CanonicalIssuanceAllocationTaxComponent[] {
  return Object.freeze(
    [...taxComponents]
      .map((tax) =>
        Object.freeze({
          sourceFinancialDocumentTaxComponentId:
            tax.sourceFinancialDocumentTaxComponentId,
          sourceFinancialDocumentLineId: tax.sourceFinancialDocumentLineId,
          taxType: tax.taxType,
          taxRateBps: tax.taxRateBps,
          allocatedTaxAmountPaise: tax.allocatedTaxAmountPaise,
        }),
      )
      .sort((a, b) =>
        compareId(
          a.sourceFinancialDocumentTaxComponentId,
          b.sourceFinancialDocumentTaxComponentId,
        ),
      ),
  );
}

export function canonicalizeIssuanceAllocationAuthority(
  authority: CanonicalIssuanceAllocationAuthority,
): CanonicalIssuanceAllocationAuthority {
  return Object.freeze({
    refundStatutoryDecisionId: authority.refundStatutoryDecisionId,
    sourceFinancialDocumentId: authority.sourceFinancialDocumentId,
    sourceDocumentType: authority.sourceDocumentType,
    sealedReversalAmountPaise: authority.sealedReversalAmountPaise,
    lines: canonicalizeIssuanceAllocationLines(authority.lines),
    taxComponents: canonicalizeIssuanceAllocationTaxComponents(
      authority.taxComponents,
    ),
  });
}

export function issuanceAllocationAuthorityEquals(
  left: CanonicalIssuanceAllocationAuthority,
  right: CanonicalIssuanceAllocationAuthority,
): boolean {
  const a = canonicalizeIssuanceAllocationAuthority(left);
  const b = canonicalizeIssuanceAllocationAuthority(right);
  if (
    a.refundStatutoryDecisionId !== b.refundStatutoryDecisionId ||
    a.sourceFinancialDocumentId !== b.sourceFinancialDocumentId ||
    a.sourceDocumentType !== b.sourceDocumentType ||
    a.sealedReversalAmountPaise !== b.sealedReversalAmountPaise ||
    a.lines.length !== b.lines.length ||
    a.taxComponents.length !== b.taxComponents.length
  ) {
    return false;
  }
  for (let i = 0; i < a.lines.length; i += 1) {
    const leftLine = a.lines[i]!;
    const rightLine = b.lines[i]!;
    if (
      leftLine.sourceFinancialDocumentLineId !==
        rightLine.sourceFinancialDocumentLineId ||
      leftLine.allocatedTaxableOrBaseAmountPaise !==
        rightLine.allocatedTaxableOrBaseAmountPaise
    ) {
      return false;
    }
  }
  for (let i = 0; i < a.taxComponents.length; i += 1) {
    const leftTax = a.taxComponents[i]!;
    const rightTax = b.taxComponents[i]!;
    if (
      leftTax.sourceFinancialDocumentTaxComponentId !==
        rightTax.sourceFinancialDocumentTaxComponentId ||
      leftTax.sourceFinancialDocumentLineId !==
        rightTax.sourceFinancialDocumentLineId ||
      leftTax.taxType !== rightTax.taxType ||
      leftTax.taxRateBps !== rightTax.taxRateBps ||
      leftTax.allocatedTaxAmountPaise !== rightTax.allocatedTaxAmountPaise
    ) {
      return false;
    }
  }
  return true;
}
