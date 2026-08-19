/**
 * Indian financial-year derivation for Financial Document issuance
 * (IMP-028 / D-365).
 *
 * Convention: April–March labels matching FINANCIAL_YEAR_PATTERN (YYYY-YY).
 * Example: 2026-08-09 → "2026-27".
 */
import { FinancialDocumentError } from "./errors";
import { assertFinancialYear } from "./validate";

/**
 * Derive the Indian financial year label from a durable statutory issue date.
 * Uses UTC calendar components of the provided Date (issueAt is timestamptz).
 */
export function deriveIndianFinancialYear(issueAt: Date): string {
  if (!(issueAt instanceof Date) || Number.isNaN(issueAt.getTime())) {
    throw new FinancialDocumentError(
      "INVALID_FINANCIAL_YEAR",
      "Cannot derive financial year from an invalid issueAt Date.",
    );
  }
  const year = issueAt.getUTCFullYear();
  const month = issueAt.getUTCMonth(); // 0 = January
  // April (3) through December → FY starting this calendar year.
  // January–March → FY starting previous calendar year.
  const startYear = month >= 3 ? year : year - 1;
  const endYearShort = String((startYear + 1) % 100).padStart(2, "0");
  return assertFinancialYear(`${startYear}-${endYearShort}`);
}
