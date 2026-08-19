/**
 * Canonical sealed-authority comparison helpers (IMP-028 / D-366 Slice 2).
 *
 * Compare durable sealed facts only — never actor, clock, or request metadata.
 */
import type {
  RefundStatutoryDisposition,
  RefundStatutoryNoSupplyAuthorityKind,
  RefundStatutoryReversalScope,
} from "./constants";

export type SealedBranchAuthority = Readonly<{
  disposition: RefundStatutoryDisposition;
  sealedPriorReceiptVoucherId: string | null;
  sealedPriorTaxInvoiceId: string | null;
  sealedSection34QualificationCode: string | null;
  sealedSection34QualificationFacts: string | null;
  sealedReversalScope: RefundStatutoryReversalScope | null;
  sealedReversalAmountPaise: bigint | null;
  sealedAllocationAuthority: string | null;
  sealedNoSupplyAuthorityKind: RefundStatutoryNoSupplyAuthorityKind | null;
  sealedNoStatutoryDocumentReasonCode: string | null;
  sealedNoStatutoryDocumentRationale: string | null;
  sealedReferencedCommercialFactRefs: string | null;
}>;

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalizeJsonValue(value));
}

export function canonicalizeJsonValue(value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalizeJsonValue(entry));
  }
  const record = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort()) {
    out[key] = canonicalizeJsonValue(record[key]);
  }
  return out;
}

export function sealedBranchAuthorityEquals(
  left: SealedBranchAuthority,
  right: SealedBranchAuthority,
): boolean {
  return (
    left.disposition === right.disposition &&
    left.sealedPriorReceiptVoucherId === right.sealedPriorReceiptVoucherId &&
    left.sealedPriorTaxInvoiceId === right.sealedPriorTaxInvoiceId &&
    left.sealedSection34QualificationCode ===
      right.sealedSection34QualificationCode &&
    left.sealedSection34QualificationFacts ===
      right.sealedSection34QualificationFacts &&
    left.sealedReversalScope === right.sealedReversalScope &&
    left.sealedReversalAmountPaise === right.sealedReversalAmountPaise &&
    left.sealedAllocationAuthority === right.sealedAllocationAuthority &&
    left.sealedNoSupplyAuthorityKind === right.sealedNoSupplyAuthorityKind &&
    left.sealedNoStatutoryDocumentReasonCode ===
      right.sealedNoStatutoryDocumentReasonCode &&
    left.sealedNoStatutoryDocumentRationale ===
      right.sealedNoStatutoryDocumentRationale &&
    left.sealedReferencedCommercialFactRefs ===
      right.sealedReferencedCommercialFactRefs
  );
}

export function sealedBranchAuthorityFromDecision(input: {
  disposition: RefundStatutoryDisposition | null;
  sealedPriorReceiptVoucherId: string | null;
  sealedPriorTaxInvoiceId: string | null;
  sealedSection34QualificationCode: string | null;
  sealedSection34QualificationFacts: string | null;
  sealedReversalScope: RefundStatutoryReversalScope | null;
  sealedReversalAmountPaise: bigint | null;
  sealedAllocationAuthority: string | null;
  sealedNoSupplyAuthorityKind: RefundStatutoryNoSupplyAuthorityKind | null;
  sealedNoStatutoryDocumentReasonCode: string | null;
  sealedNoStatutoryDocumentRationale: string | null;
  sealedReferencedCommercialFactRefs: string | null;
}): SealedBranchAuthority | null {
  if (input.disposition === null) {
    return null;
  }
  return Object.freeze({
    disposition: input.disposition,
    sealedPriorReceiptVoucherId: input.sealedPriorReceiptVoucherId,
    sealedPriorTaxInvoiceId: input.sealedPriorTaxInvoiceId,
    sealedSection34QualificationCode: input.sealedSection34QualificationCode,
    sealedSection34QualificationFacts: input.sealedSection34QualificationFacts,
    sealedReversalScope: input.sealedReversalScope,
    sealedReversalAmountPaise: input.sealedReversalAmountPaise,
    sealedAllocationAuthority: input.sealedAllocationAuthority,
    sealedNoSupplyAuthorityKind: input.sealedNoSupplyAuthorityKind,
    sealedNoStatutoryDocumentReasonCode:
      input.sealedNoStatutoryDocumentReasonCode,
    sealedNoStatutoryDocumentRationale: input.sealedNoStatutoryDocumentRationale,
    sealedReferencedCommercialFactRefs: input.sealedReferencedCommercialFactRefs,
  });
}
