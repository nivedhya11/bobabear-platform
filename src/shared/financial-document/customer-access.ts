/**
 * Customer Financial Document access contracts (IMP-028 Slice 5).
 *
 * Application-level read/access types only — no HTTP transport.
 * Listing returns minimal sealed metadata; full aggregates are for
 * authorized single-document access / artifact generation.
 */

import { FinancialDocumentError } from "./errors";
import type {
  FinancialDocument,
  FinancialDocumentStatutoryType,
} from "./types";

export type GetCustomerFinancialDocumentInput = Readonly<{
  financialDocumentId: string;
}>;

export type ListCustomerOrderFinancialDocumentsInput = Readonly<{
  orderId: string;
}>;

export type GenerateCustomerFinancialDocumentArtifactInput = Readonly<{
  financialDocumentId: string;
}>;

/**
 * Minimal listing projection — sealed public facts only.
 * Does not include issuerProfileId, numberingSeriesId, checkoutSnapshotId,
 * payment/refund internals, or other commercial-graph implementation metadata.
 */
export type CustomerFinancialDocumentListItem = Readonly<{
  financialDocumentId: string;
  documentType: FinancialDocumentStatutoryType;
  statutoryDocumentNumber: string;
  issueAt: Date;
  grandTotalPaise: bigint;
  currency: "INR";
  orderId: string | null;
}>;

/**
 * Authorized customer access result: immutable render authority set.
 * priorFinancialDocument is loaded only from the sealed priorFinancialDocumentId.
 */
export type CustomerFinancialDocumentAccess = Readonly<{
  document: FinancialDocument;
  priorFinancialDocument: FinancialDocument | null;
}>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rejectUnknownKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  context: string,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new FinancialDocumentError(
        "INVALID_ACCESS_INPUT",
        `Unknown field '${key}' is not permitted on ${context}.`,
      );
    }
  }
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new FinancialDocumentError(
      "INVALID_ACCESS_INPUT",
      `${field} must be a non-empty string.`,
    );
  }
  return value.trim();
}

function requireUuid(value: unknown, field: string): string {
  const s = requireNonEmptyString(value, field);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      s,
    )
  ) {
    throw new FinancialDocumentError(
      "INVALID_ACCESS_INPUT",
      `${field} must be a UUID.`,
    );
  }
  return s.toLowerCase();
}

export function parseGetCustomerFinancialDocumentInput(
  input: unknown,
): GetCustomerFinancialDocumentInput {
  if (!isPlainObject(input)) {
    throw new FinancialDocumentError(
      "INVALID_ACCESS_INPUT",
      "GetCustomerFinancialDocument input must be an object.",
    );
  }
  rejectUnknownKeys(input, ["financialDocumentId"], "GetCustomerFinancialDocument");
  return Object.freeze({
    financialDocumentId: requireUuid(input.financialDocumentId, "financialDocumentId"),
  });
}

export function parseListCustomerOrderFinancialDocumentsInput(
  input: unknown,
): ListCustomerOrderFinancialDocumentsInput {
  if (!isPlainObject(input)) {
    throw new FinancialDocumentError(
      "INVALID_ACCESS_INPUT",
      "ListCustomerOrderFinancialDocuments input must be an object.",
    );
  }
  rejectUnknownKeys(input, ["orderId"], "ListCustomerOrderFinancialDocuments");
  return Object.freeze({
    orderId: requireUuid(input.orderId, "orderId"),
  });
}

export function parseGenerateCustomerFinancialDocumentArtifactInput(
  input: unknown,
): GenerateCustomerFinancialDocumentArtifactInput {
  if (!isPlainObject(input)) {
    throw new FinancialDocumentError(
      "INVALID_ACCESS_INPUT",
      "GenerateCustomerFinancialDocumentArtifact input must be an object.",
    );
  }
  rejectUnknownKeys(
    input,
    ["financialDocumentId"],
    "GenerateCustomerFinancialDocumentArtifact",
  );
  return Object.freeze({
    financialDocumentId: requireUuid(input.financialDocumentId, "financialDocumentId"),
  });
}

export function toCustomerFinancialDocumentListItem(
  document: FinancialDocument,
): CustomerFinancialDocumentListItem {
  return Object.freeze({
    financialDocumentId: document.id,
    documentType: document.documentType,
    statutoryDocumentNumber: document.statutoryDocumentNumber,
    issueAt: document.issueAt,
    grandTotalPaise: document.grandTotalPaise,
    currency: document.currency,
    orderId: document.orderId,
  });
}
