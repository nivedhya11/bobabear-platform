/**
 * Deterministic Financial Document formatting (IMP-028 Slice 3).
 *
 * No browser/Intl locale dependence. Money uses integer paise only —
 * never floating point and never recalculated from live configuration.
 */

import type { FinancialDocumentRegistrationScheme } from "./constants";
import type { FinancialDocumentStatutoryType } from "./constants";
import type { FinancialDocumentTaxType } from "./constants";

const STATUTORY_TITLE: Readonly<Record<FinancialDocumentStatutoryType, string>> =
  Object.freeze({
    TAX_INVOICE: "Tax Invoice",
    BILL_OF_SUPPLY: "Bill of Supply",
    RECEIPT_VOUCHER: "Receipt Voucher",
    REFUND_VOUCHER: "Refund Voucher",
    CREDIT_NOTE: "Credit Note",
  });

const TAX_COMPONENT_LABEL: Readonly<Record<FinancialDocumentTaxType, string>> =
  Object.freeze({
    cgst: "CGST",
    sgst: "SGST",
    utgst: "UTGST",
    igst: "IGST",
  });

const SCHEME_LABEL: Readonly<
  Record<FinancialDocumentRegistrationScheme, string>
> = Object.freeze({
  regular: "Regular",
  composition: "Composition",
});

/** Statutory display title for a locked document type. */
export function formatStatutoryDocumentTitle(
  documentType: FinancialDocumentStatutoryType,
): string {
  const title = STATUTORY_TITLE[documentType];
  if (!title) {
    throw new RangeError(`Unsupported statutory document type for title: ${String(documentType)}`);
  }
  return title;
}

export function formatTaxComponentLabel(taxType: FinancialDocumentTaxType): string {
  return TAX_COMPONENT_LABEL[taxType];
}

export function formatRegistrationSchemeLabel(
  scheme: FinancialDocumentRegistrationScheme,
): string {
  return SCHEME_LABEL[scheme];
}

/**
 * Format INR from exact integer paise.
 * Example: 10500n → "₹105.00"; 123456789n → "₹12,34,567.89"
 */
export function formatInrPaise(paise: bigint): string {
  const negative = paise < BigInt(0);
  const abs = negative ? -paise : paise;
  const rupees = abs / BigInt(100);
  const fraction = abs % BigInt(100);
  const grouped = formatIndianIntegerGrouping(rupees);
  return `${negative ? "-" : ""}₹${grouped}.${fraction.toString().padStart(2, "0")}`;
}

/** Indian digit grouping for the integer rupee portion (deterministic). */
export function formatIndianIntegerGrouping(value: bigint): string {
  if (value < BigInt(0)) {
    throw new RangeError("formatIndianIntegerGrouping expects a non-negative value");
  }
  const digits = value.toString();
  if (digits.length <= 3) {
    return digits;
  }
  const lastThree = digits.slice(-3);
  let head = digits.slice(0, -3);
  const groups: string[] = [];
  while (head.length > 2) {
    groups.unshift(head.slice(-2));
    head = head.slice(0, -2);
  }
  if (head.length > 0) {
    groups.unshift(head);
  }
  return `${groups.join(",")},${lastThree}`;
}

/**
 * Format tax rate from integer basis points.
 * 250 → "2.50%"; 1800 → "18.00%"; 0 → "0.00%"
 */
export function formatRateBps(rateBps: number): string {
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10000) {
    throw new RangeError(`rateBps out of range: ${rateBps}`);
  }
  const whole = Math.floor(rateBps / 100);
  const frac = rateBps % 100;
  return `${whole}.${frac.toString().padStart(2, "0")}%`;
}

/**
 * Deterministic UTC calendar/time formatting (no locale).
 * Example: 2025-08-15T10:30:00.000Z → "2025-08-15 10:30:00 UTC"
 */
export function formatIssueDateTimeUtc(issueAt: Date): string {
  if (!(issueAt instanceof Date) || Number.isNaN(issueAt.getTime())) {
    throw new RangeError("issueAt must be a valid Date");
  }
  const iso = issueAt.toISOString(); // always UTC Z
  const date = iso.slice(0, 10);
  const time = iso.slice(11, 19);
  return `${date} ${time} UTC`;
}

export function formatIssueDateUtc(issueAt: Date): string {
  if (!(issueAt instanceof Date) || Number.isNaN(issueAt.getTime())) {
    throw new RangeError("issueAt must be a valid Date");
  }
  return issueAt.toISOString().slice(0, 10);
}

/** Escape text for embedding in HTML attribute/text nodes. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
