/**
 * Sealed Financial Document arithmetic validation (IMP-028 Slice 2).
 * All money is integer paise — never floating point.
 *
 * Component tax amounts use the canonical BOBA exclusive GST rule from
 * `src/shared/pricing/money.ts`:
 *   tax_paise = round_half_up(taxable × rate_bps / 10000)
 * via `taxExclusivePaise`.
 */
import {
  FINANCIAL_DOCUMENT_TAX_TYPES,
  type FinancialDocumentTaxType,
} from "./constants";
import { FinancialDocumentError } from "./errors";
import { MoneyParseError, taxExclusivePaise } from "../pricing/money";

export type IssuanceLineArithmeticInput = Readonly<{
  lineNumber: number;
  description: string;
  quantity: number;
  unitPaise: bigint;
  discountPaise: bigint;
  chargePaise: bigint;
  taxableValuePaise: bigint;
  sacCode?: string | null;
  hsnCode?: string | null;
  historicalCatalogItemId?: string | null;
  taxComponents?: readonly Readonly<{
    taxType: string;
    rateBps: number;
    taxableAmountPaise: bigint;
    taxAmountPaise?: bigint;
  }>[];
}>;

export type SealedIssuanceLine = Readonly<{
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

export type SealedIssuanceTotals = Readonly<{
  taxableTotalPaise: bigint;
  taxTotalPaise: bigint;
  discountTotalPaise: bigint;
  chargeTotalPaise: bigint;
  grandTotalPaise: bigint;
  lines: readonly SealedIssuanceLine[];
}>;

function assertNonNegativePaise(value: bigint, field: string): void {
  if (value < BigInt(0)) {
    throw new FinancialDocumentError(
      "ARITHMETIC_INVALID",
      `${field} must be non-negative paise.`,
    );
  }
}

function assertTaxType(value: string): FinancialDocumentTaxType {
  if (!(FINANCIAL_DOCUMENT_TAX_TYPES as readonly string[]).includes(value)) {
    throw new FinancialDocumentError(
      "TAX_COMPONENT_INVALID",
      `Unsupported tax component type: ${value}`,
    );
  }
  return value as FinancialDocumentTaxType;
}

/**
 * Canonical per-component exclusive GST amount (IMP-015 pricing money).
 */
export function canonicalComponentTaxAmountPaise(
  taxableAmountPaise: bigint,
  rateBps: number,
): bigint {
  try {
    return taxExclusivePaise(taxableAmountPaise, rateBps);
  } catch (error) {
    if (error instanceof MoneyParseError) {
      throw new FinancialDocumentError("TAX_COMPONENT_INVALID", error.message);
    }
    throw error;
  }
}

/**
 * Validate line tax-component coherence using existing tax-domain boundaries:
 * CGST+SGST (or CGST+UTGST) versus IGST must not be mixed on one line.
 *
 * Does not invent CGST/SGST equal-rate pairing beyond structural coexistence
 * rules already enforced here; checkout policy rate-sum rules remain in pricing.
 */
export function assertLineTaxComponentStructure(
  lineNumber: number,
  taxTypes: readonly FinancialDocumentTaxType[],
): void {
  const set = new Set(taxTypes);
  const hasIgst = set.has("igst");
  const hasIntra =
    set.has("cgst") || set.has("sgst") || set.has("utgst");
  if (hasIgst && hasIntra) {
    throw new FinancialDocumentError(
      "TAX_COMPONENT_INVALID",
      `Line ${lineNumber}: IGST cannot be combined with CGST/SGST/UTGST on the same line.`,
    );
  }
  if (set.has("sgst") && set.has("utgst")) {
    throw new FinancialDocumentError(
      "TAX_COMPONENT_INVALID",
      `Line ${lineNumber}: SGST and UTGST cannot both apply on the same line.`,
    );
  }
  if (hasIntra && !set.has("cgst")) {
    throw new FinancialDocumentError(
      "TAX_COMPONENT_INVALID",
      `Line ${lineNumber}: intra-state tax components require CGST.`,
    );
  }
  if (set.has("cgst") && !set.has("sgst") && !set.has("utgst") && !hasIgst) {
    throw new FinancialDocumentError(
      "TAX_COMPONENT_INVALID",
      `Line ${lineNumber}: CGST requires SGST or UTGST companion component.`,
    );
  }
}

/**
 * Derive sealed line totals and header aggregates from sealed line primitives.
 * Caller-supplied header totals are not authoritative.
 * Component tax amounts are derived via canonical `taxExclusivePaise`.
 */
export function sealIssuanceArithmetic(
  lines: readonly IssuanceLineArithmeticInput[],
): SealedIssuanceTotals {
  if (lines.length === 0) {
    throw new FinancialDocumentError(
      "ARITHMETIC_INVALID",
      "Financial Document issuance requires at least one line.",
    );
  }

  const lineNumbers = new Set<number>();
  const sealedLines: SealedIssuanceLine[] = [];

  let taxableTotalPaise = BigInt(0);
  let taxTotalPaise = BigInt(0);
  let discountTotalPaise = BigInt(0);
  let chargeTotalPaise = BigInt(0);

  for (const line of lines) {
    if (!Number.isInteger(line.lineNumber) || line.lineNumber <= 0) {
      throw new FinancialDocumentError(
        "ARITHMETIC_INVALID",
        "lineNumber must be a positive integer.",
      );
    }
    if (lineNumbers.has(line.lineNumber)) {
      throw new FinancialDocumentError(
        "ARITHMETIC_INVALID",
        `Duplicate lineNumber ${line.lineNumber}.`,
      );
    }
    lineNumbers.add(line.lineNumber);

    if (typeof line.description !== "string" || line.description.trim().length === 0) {
      throw new FinancialDocumentError(
        "ARITHMETIC_INVALID",
        `Line ${line.lineNumber}: description must be non-empty.`,
      );
    }
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      throw new FinancialDocumentError(
        "ARITHMETIC_INVALID",
        `Line ${line.lineNumber}: quantity must be a positive integer.`,
      );
    }

    assertNonNegativePaise(line.unitPaise, `Line ${line.lineNumber} unitPaise`);
    assertNonNegativePaise(line.discountPaise, `Line ${line.lineNumber} discountPaise`);
    assertNonNegativePaise(line.chargePaise, `Line ${line.lineNumber} chargePaise`);
    assertNonNegativePaise(
      line.taxableValuePaise,
      `Line ${line.lineNumber} taxableValuePaise`,
    );

    const expectedTaxable =
      BigInt(line.quantity) * line.unitPaise - line.discountPaise + line.chargePaise;
    if (expectedTaxable !== line.taxableValuePaise) {
      throw new FinancialDocumentError(
        "ARITHMETIC_INVALID",
        `Line ${line.lineNumber}: taxableValuePaise must equal quantity*unitPaise - discountPaise + chargePaise.`,
      );
    }
    if (expectedTaxable < BigInt(0)) {
      throw new FinancialDocumentError(
        "ARITHMETIC_INVALID",
        `Line ${line.lineNumber}: taxable value would be negative.`,
      );
    }

    const taxTypes: FinancialDocumentTaxType[] = [];
    const seenTypes = new Set<string>();
    let lineTaxPaise = BigInt(0);
    const sealedTaxes: SealedIssuanceLine["taxComponents"][number][] = [];

    for (const tax of line.taxComponents ?? []) {
      const taxType = assertTaxType(tax.taxType);
      if (seenTypes.has(taxType)) {
        throw new FinancialDocumentError(
          "TAX_COMPONENT_INVALID",
          `Line ${line.lineNumber}: duplicate tax type ${taxType}.`,
        );
      }
      seenTypes.add(taxType);
      taxTypes.push(taxType);

      if (!Number.isInteger(tax.rateBps) || tax.rateBps < 0 || tax.rateBps > 10000) {
        throw new FinancialDocumentError(
          "TAX_COMPONENT_INVALID",
          `Line ${line.lineNumber}: rateBps must be an integer in [0, 10000].`,
        );
      }
      assertNonNegativePaise(
        tax.taxableAmountPaise,
        `Line ${line.lineNumber} tax taxableAmountPaise`,
      );
      if (tax.taxableAmountPaise !== line.taxableValuePaise) {
        throw new FinancialDocumentError(
          "TAX_COMPONENT_INVALID",
          `Line ${line.lineNumber}: tax component taxableAmountPaise must match line taxableValuePaise.`,
        );
      }

      const derivedTaxAmount = canonicalComponentTaxAmountPaise(
        tax.taxableAmountPaise,
        tax.rateBps,
      );
      if (tax.taxAmountPaise !== undefined && tax.taxAmountPaise !== derivedTaxAmount) {
        throw new FinancialDocumentError(
          "TAX_COMPONENT_INVALID",
          `Line ${line.lineNumber}: taxAmountPaise must equal canonical exclusive GST amount for taxableAmountPaise × rateBps.`,
        );
      }

      lineTaxPaise += derivedTaxAmount;
      sealedTaxes.push({
        taxType,
        rateBps: tax.rateBps,
        taxableAmountPaise: tax.taxableAmountPaise,
        taxAmountPaise: derivedTaxAmount,
      });
    }

    if (taxTypes.length > 0) {
      assertLineTaxComponentStructure(line.lineNumber, taxTypes);
    }

    const lineTotalPaise = line.taxableValuePaise + lineTaxPaise;
    sealedLines.push({
      lineNumber: line.lineNumber,
      description: line.description.trim(),
      quantity: line.quantity,
      unitPaise: line.unitPaise,
      discountPaise: line.discountPaise,
      chargePaise: line.chargePaise,
      taxableValuePaise: line.taxableValuePaise,
      lineTotalPaise,
      sacCode: line.sacCode ?? null,
      hsnCode: line.hsnCode ?? null,
      historicalCatalogItemId: line.historicalCatalogItemId ?? null,
      taxComponents: Object.freeze(sealedTaxes),
    });

    taxableTotalPaise += line.taxableValuePaise;
    taxTotalPaise += lineTaxPaise;
    discountTotalPaise += line.discountPaise;
    chargeTotalPaise += line.chargePaise;
  }

  const grandTotalPaise = taxableTotalPaise + taxTotalPaise;
  return Object.freeze({
    taxableTotalPaise,
    taxTotalPaise,
    discountTotalPaise,
    chargeTotalPaise,
    grandTotalPaise,
    lines: Object.freeze(sealedLines),
  });
}

/**
 * Reject caller-supplied header totals that disagree with derived sealed totals.
 */
export function assertCallerTotalsMatchDerived(
  derived: SealedIssuanceTotals,
  caller: {
    taxableTotalPaise?: bigint;
    taxTotalPaise?: bigint;
    discountTotalPaise?: bigint;
    chargeTotalPaise?: bigint;
    grandTotalPaise?: bigint;
  },
): void {
  const checks: Array<[keyof typeof caller, bigint]> = [
    ["taxableTotalPaise", derived.taxableTotalPaise],
    ["taxTotalPaise", derived.taxTotalPaise],
    ["discountTotalPaise", derived.discountTotalPaise],
    ["chargeTotalPaise", derived.chargeTotalPaise],
    ["grandTotalPaise", derived.grandTotalPaise],
  ];
  for (const [field, expected] of checks) {
    const actual = caller[field];
    if (actual !== undefined && actual !== expected) {
      throw new FinancialDocumentError(
        "ARITHMETIC_INVALID",
        `Caller-supplied ${field} does not match sealed line-derived total.`,
      );
    }
  }
}
