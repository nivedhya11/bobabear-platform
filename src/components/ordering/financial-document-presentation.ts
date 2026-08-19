/**
 * Customer-facing Financial Document presentation (IMP-028 Slice 7).
 * Display labels only — not issuance or authorization authority.
 */

import { formatStatutoryDocumentTitle } from "@/shared/financial-document/format";
import type { FinancialDocumentStatutoryType } from "@/shared/financial-document/constants";

const KNOWN_TYPES = new Set<string>([
  "TAX_INVOICE",
  "BILL_OF_SUPPLY",
  "RECEIPT_VOUCHER",
  "REFUND_VOUCHER",
  "CREDIT_NOTE",
]);

/** Map sealed statutory type → customer title. Never "Tax Receipt". */
export function financialDocumentCustomerTitle(documentType: string): string {
  if (documentType === "TAX_RECEIPT") {
    // Forbidden statutory / customer label — fail closed to a neutral fallback.
    return "Document";
  }
  if (!KNOWN_TYPES.has(documentType)) {
    return "Document";
  }
  return formatStatutoryDocumentTitle(documentType as FinancialDocumentStatutoryType);
}

/** Presentation-only issued date; does not alter sealed issueAt authority. */
export function formatFinancialDocumentIssuedAt(issueAt: string): string {
  if (!issueAt) return "";
  const parsed = new Date(issueAt);
  if (Number.isNaN(parsed.getTime())) return "";
  return `Issued ${parsed.toLocaleString()}`;
}

export function financialDocumentDownloadAccessibleName(
  documentType: string,
  statutoryDocumentNumber: string,
): string {
  const title = financialDocumentCustomerTitle(documentType);
  return `Download ${title} PDF ${statutoryDocumentNumber}`;
}
