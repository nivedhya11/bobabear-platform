/**
 * Operator-supplied PARTIAL statutory issuance-allocation command
 * (IMP-028 / D-366 Slice 3A).
 *
 * Caller supplies explicit line/tax-component amounts. BOBA validates them
 * against sealed source FinancialDocument authority. No proportional split.
 */
import { FINANCIAL_DOCUMENT_TAX_TYPES } from "../financial-document/constants";
import { canonicalizeIssuanceAllocationLines } from "./canonical";
import { RefundStatutoryIssuanceAllocationError } from "./errors";
import { assertRefundStatutoryIssuanceAllocationUuid } from "./logical-key";

export type SealRefundStatutoryIssuanceAllocationLineInput = Readonly<{
  sourceFinancialDocumentLineId: string;
  allocatedTaxableOrBaseAmountPaise: bigint | number | string;
}>;

export type SealRefundStatutoryIssuanceAllocationTaxComponentInput = Readonly<{
  sourceFinancialDocumentTaxComponentId: string;
  allocatedTaxAmountPaise: bigint | number | string;
  /** Optional validation convenience only. Source FinancialDocument is canonical. */
  taxType?: string | null;
  /** Optional validation convenience only. Source FinancialDocument is canonical. */
  taxRateBps?: number | null;
  /** Optional validation convenience only. Source line relationship is canonical. */
  sourceFinancialDocumentLineId?: string | null;
}>;

export type SealRefundStatutoryIssuanceAllocationCommand = Readonly<{
  decisionId: string;
  lines?: readonly SealRefundStatutoryIssuanceAllocationLineInput[] | null;
  taxComponents?:
    | readonly SealRefundStatutoryIssuanceAllocationTaxComponentInput[]
    | null;
}>;

export type ParsedSealRefundStatutoryIssuanceAllocationLine = Readonly<{
  sourceFinancialDocumentLineId: string;
  allocatedTaxableOrBaseAmountPaise: bigint;
}>;

export type ParsedSealRefundStatutoryIssuanceAllocationTaxComponent = Readonly<{
  sourceFinancialDocumentTaxComponentId: string;
  allocatedTaxAmountPaise: bigint;
  taxType: string | null;
  taxRateBps: number | null;
  sourceFinancialDocumentLineId: string | null;
}>;

export type ParsedSealRefundStatutoryIssuanceAllocationCommand = Readonly<{
  decisionId: string;
  lines: readonly ParsedSealRefundStatutoryIssuanceAllocationLine[];
  taxComponents: readonly ParsedSealRefundStatutoryIssuanceAllocationTaxComponent[];
}>;

function invalid(message: string, field: string): never {
  throw new RefundStatutoryIssuanceAllocationError(
    "REFUND_STATUTORY_ISSUANCE_ALLOCATION_INVALID_INPUT",
    message,
    { field },
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Positive integer paise. Rejects zero, negative, non-integers, and floats.
 * Never uses floating-point arithmetic.
 */
export function parsePositivePaise(value: unknown, field: string): bigint {
  if (typeof value === "bigint") {
    if (value <= BigInt(0)) {
      invalid(`${field} must be a positive integer paise amount.`, field);
    }
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isInteger(value) || value <= 0) {
      invalid(`${field} must be a positive integer paise amount.`, field);
    }
    return BigInt(value);
  }
  if (typeof value === "string" && /^[1-9][0-9]*$/.test(value.trim())) {
    return BigInt(value.trim());
  }
  invalid(`${field} must be a positive integer paise amount.`, field);
}

export function parseOptionalTaxType(
  value: string | null | undefined,
  field: string,
): string | null {
  if (value == null) {
    return null;
  }
  if (typeof value !== "string") {
    invalid(`${field} must be a canonical tax type when supplied.`, field);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (!(FINANCIAL_DOCUMENT_TAX_TYPES as readonly string[]).includes(trimmed)) {
    invalid(`${field} must be one of cgst, sgst, utgst, igst.`, field);
  }
  return trimmed;
}

export function parseOptionalTaxRateBps(
  value: number | null | undefined,
  field: string,
): number | null {
  if (value == null) {
    return null;
  }
  if (typeof value !== "number" || !Number.isInteger(value)) {
    invalid(`${field} must be an integer basis-point rate when supplied.`, field);
  }
  if (value < 0 || value > 10000) {
    invalid(`${field} must be between 0 and 10000 inclusive.`, field);
  }
  return value;
}

function parseOptionalUuid(
  value: string | null | undefined,
  field: string,
): string | null {
  if (value == null) {
    return null;
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  return assertRefundStatutoryIssuanceAllocationUuid(value, field);
}

export function parseSealRefundStatutoryIssuanceAllocationCommand(
  command: SealRefundStatutoryIssuanceAllocationCommand,
): ParsedSealRefundStatutoryIssuanceAllocationCommand {
  const decisionId = assertRefundStatutoryIssuanceAllocationUuid(
    command.decisionId,
    "decisionId",
  );
  const rawLines = command.lines ?? [];
  const rawTaxes = command.taxComponents ?? [];
  if (!Array.isArray(rawLines)) {
    invalid("lines must be an array.", "lines");
  }
  if (!Array.isArray(rawTaxes)) {
    invalid("taxComponents must be an array.", "taxComponents");
  }
  if (rawLines.length === 0 && rawTaxes.length === 0) {
    invalid(
      "PARTIAL issuance allocation requires at least one source line or tax component.",
      "lines",
    );
  }

  const seenLines = new Set<string>();
  const lines: ParsedSealRefundStatutoryIssuanceAllocationLine[] = [];
  for (const [index, entry] of rawLines.entries()) {
    if (!isPlainObject(entry)) {
      invalid(
        "lines entries must be structured source-line allocations.",
        `lines[${index}]`,
      );
    }
    const sourceFinancialDocumentLineId = assertRefundStatutoryIssuanceAllocationUuid(
      String(entry.sourceFinancialDocumentLineId ?? ""),
      `lines[${index}].sourceFinancialDocumentLineId`,
    );
    if (seenLines.has(sourceFinancialDocumentLineId)) {
      invalid(
        "Duplicate source line references are not allowed.",
        `lines[${index}].sourceFinancialDocumentLineId`,
      );
    }
    seenLines.add(sourceFinancialDocumentLineId);
    lines.push(
      Object.freeze({
        sourceFinancialDocumentLineId,
        allocatedTaxableOrBaseAmountPaise: parsePositivePaise(
          entry.allocatedTaxableOrBaseAmountPaise,
          `lines[${index}].allocatedTaxableOrBaseAmountPaise`,
        ),
      }),
    );
  }

  const seenTaxes = new Set<string>();
  const taxComponents: ParsedSealRefundStatutoryIssuanceAllocationTaxComponent[] =
    [];
  for (const [index, entry] of rawTaxes.entries()) {
    if (!isPlainObject(entry)) {
      invalid(
        "taxComponents entries must be structured source tax-component allocations.",
        `taxComponents[${index}]`,
      );
    }
    const sourceFinancialDocumentTaxComponentId =
      assertRefundStatutoryIssuanceAllocationUuid(
        String(entry.sourceFinancialDocumentTaxComponentId ?? ""),
        `taxComponents[${index}].sourceFinancialDocumentTaxComponentId`,
      );
    if (seenTaxes.has(sourceFinancialDocumentTaxComponentId)) {
      invalid(
        "Duplicate source tax-component references are not allowed.",
        `taxComponents[${index}].sourceFinancialDocumentTaxComponentId`,
      );
    }
    seenTaxes.add(sourceFinancialDocumentTaxComponentId);
    taxComponents.push(
      Object.freeze({
        sourceFinancialDocumentTaxComponentId,
        allocatedTaxAmountPaise: parsePositivePaise(
          entry.allocatedTaxAmountPaise,
          `taxComponents[${index}].allocatedTaxAmountPaise`,
        ),
        taxType: parseOptionalTaxType(
          entry.taxType as string | null | undefined,
          `taxComponents[${index}].taxType`,
        ),
        taxRateBps: parseOptionalTaxRateBps(
          entry.taxRateBps as number | null | undefined,
          `taxComponents[${index}].taxRateBps`,
        ),
        sourceFinancialDocumentLineId: parseOptionalUuid(
          entry.sourceFinancialDocumentLineId as string | null | undefined,
          `taxComponents[${index}].sourceFinancialDocumentLineId`,
        ),
      }),
    );
  }

  return Object.freeze({
    decisionId,
    lines: canonicalizeIssuanceAllocationLines(lines),
    taxComponents: Object.freeze(
      [...taxComponents].sort((a, b) =>
        a.sourceFinancialDocumentTaxComponentId.localeCompare(
          b.sourceFinancialDocumentTaxComponentId,
        ),
      ),
    ),
  });
}
