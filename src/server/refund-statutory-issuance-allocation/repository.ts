/**
 * RefundStatutoryIssuanceAllocation persistence primitives
 * (IMP-028 / D-366 Slice 3A).
 *
 * Write-once PARTIAL statutory arithmetic. No RFV/CN FinancialDocument
 * issuance and no RefundStatutoryDecision mutation.
 */
import { asc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import {
  refundStatutoryIssuanceAllocationLinesTable,
  refundStatutoryIssuanceAllocationTaxComponentsTable,
  refundStatutoryIssuanceAllocationsTable,
} from "../../platform/database/schema/refund-statutory-issuance-allocation";
import {
  buildRefundStatutoryIssuanceAllocationLogicalKey,
  RefundStatutoryIssuanceAllocationError,
  type RefundStatutoryIssuanceAllocation,
  type RefundStatutoryIssuanceAllocationLine,
  type RefundStatutoryIssuanceAllocationSourceDocumentType,
  type RefundStatutoryIssuanceAllocationTaxComponent,
} from "../../shared/refund-statutory-issuance-allocation";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../persistence/types";
import { assertApplicationRole, assertTransactionContext } from "./assert-role";

export type RefundStatutoryIssuanceAllocationRow =
  typeof refundStatutoryIssuanceAllocationsTable.$inferSelect;
export type RefundStatutoryIssuanceAllocationLineRow =
  typeof refundStatutoryIssuanceAllocationLinesTable.$inferSelect;
export type RefundStatutoryIssuanceAllocationTaxComponentRow =
  typeof refundStatutoryIssuanceAllocationTaxComponentsTable.$inferSelect;

export function newRefundStatutoryIssuanceAllocationId(): string {
  return randomUUID();
}

export function newRefundStatutoryIssuanceAllocationLineId(): string {
  return randomUUID();
}

export function newRefundStatutoryIssuanceAllocationTaxComponentId(): string {
  return randomUUID();
}

export function extractPostgresDriverCode(error: unknown): string | null {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (
      current &&
      typeof current === "object" &&
      "code" in current &&
      typeof (current as { code: unknown }).code === "string"
    ) {
      return (current as { code: string }).code;
    }
    if (current instanceof Error) {
      current = (current as { cause?: unknown }).cause;
      continue;
    }
    break;
  }
  return null;
}

function mapLine(
  row: RefundStatutoryIssuanceAllocationLineRow,
): RefundStatutoryIssuanceAllocationLine {
  return Object.freeze({
    id: row.id,
    allocationId: row.allocationId,
    sourceFinancialDocumentLineId: row.sourceFinancialDocumentLineId,
    allocatedTaxableOrBaseAmountPaise: row.allocatedTaxableOrBaseAmountPaise,
  });
}

function mapTax(
  row: RefundStatutoryIssuanceAllocationTaxComponentRow,
): RefundStatutoryIssuanceAllocationTaxComponent {
  return Object.freeze({
    id: row.id,
    allocationId: row.allocationId,
    sourceFinancialDocumentTaxComponentId: row.sourceFinancialDocumentTaxComponentId,
    sourceFinancialDocumentLineId: row.sourceFinancialDocumentLineId,
    taxType: row.taxType,
    taxRateBps: row.taxRateBps,
    allocatedTaxAmountPaise: row.allocatedTaxAmountPaise,
  });
}

export function mapRefundStatutoryIssuanceAllocation(
  row: RefundStatutoryIssuanceAllocationRow,
  lines: readonly RefundStatutoryIssuanceAllocationLineRow[],
  taxComponents: readonly RefundStatutoryIssuanceAllocationTaxComponentRow[],
): RefundStatutoryIssuanceAllocation {
  return Object.freeze({
    id: row.id,
    refundStatutoryDecisionId: row.refundStatutoryDecisionId,
    logicalIdempotencyKey: row.logicalIdempotencyKey,
    sourceFinancialDocumentId: row.sourceFinancialDocumentId,
    sourceDocumentType:
      row.sourceDocumentType as RefundStatutoryIssuanceAllocationSourceDocumentType,
    sealedReversalAmountPaise: row.sealedReversalAmountPaise,
    createdAt: row.createdAt,
    lines: Object.freeze(
      [...lines]
        .sort((a, b) =>
          a.sourceFinancialDocumentLineId.localeCompare(
            b.sourceFinancialDocumentLineId,
          ),
        )
        .map(mapLine),
    ),
    taxComponents: Object.freeze(
      [...taxComponents]
        .sort((a, b) =>
          a.sourceFinancialDocumentTaxComponentId.localeCompare(
            b.sourceFinancialDocumentTaxComponentId,
          ),
        )
        .map(mapTax),
    ),
  });
}

export async function findRefundStatutoryIssuanceAllocationByDecisionId(
  context: PersistenceQueryContext,
  decisionId: string,
): Promise<RefundStatutoryIssuanceAllocationRow | null> {
  assertApplicationRole(context, "findRefundStatutoryIssuanceAllocationByDecisionId");
  const rows = await context.db
    .select()
    .from(refundStatutoryIssuanceAllocationsTable)
    .where(eq(refundStatutoryIssuanceAllocationsTable.refundStatutoryDecisionId, decisionId))
    .limit(1);
  return rows[0] ?? null;
}

export async function loadRefundStatutoryIssuanceAllocationByDecisionId(
  context: PersistenceQueryContext,
  decisionId: string,
): Promise<RefundStatutoryIssuanceAllocation | null> {
  const row = await findRefundStatutoryIssuanceAllocationByDecisionId(
    context,
    decisionId,
  );
  if (!row) {
    return null;
  }
  return loadRefundStatutoryIssuanceAllocationChildren(context, row);
}

export async function loadRefundStatutoryIssuanceAllocationChildren(
  context: PersistenceQueryContext,
  row: RefundStatutoryIssuanceAllocationRow,
): Promise<RefundStatutoryIssuanceAllocation> {
  assertApplicationRole(context, "loadRefundStatutoryIssuanceAllocationChildren");
  const lines = await context.db
    .select()
    .from(refundStatutoryIssuanceAllocationLinesTable)
    .where(eq(refundStatutoryIssuanceAllocationLinesTable.allocationId, row.id))
    .orderBy(asc(refundStatutoryIssuanceAllocationLinesTable.sourceFinancialDocumentLineId));
  const taxComponents = await context.db
    .select()
    .from(refundStatutoryIssuanceAllocationTaxComponentsTable)
    .where(eq(refundStatutoryIssuanceAllocationTaxComponentsTable.allocationId, row.id))
    .orderBy(
      asc(
        refundStatutoryIssuanceAllocationTaxComponentsTable.sourceFinancialDocumentTaxComponentId,
      ),
    );
  return mapRefundStatutoryIssuanceAllocation(row, lines, taxComponents);
}

export async function lockRefundStatutoryIssuanceAllocationsForSource(
  context: PersistenceTransactionContext,
  sourceFinancialDocumentId: string,
): Promise<readonly RefundStatutoryIssuanceAllocationRow[]> {
  assertTransactionContext(context, "lockRefundStatutoryIssuanceAllocationsForSource");
  return context.db
    .select()
    .from(refundStatutoryIssuanceAllocationsTable)
    .where(
      eq(
        refundStatutoryIssuanceAllocationsTable.sourceFinancialDocumentId,
        sourceFinancialDocumentId,
      ),
    )
    .orderBy(asc(refundStatutoryIssuanceAllocationsTable.id))
    .for("update");
}

export type InsertRefundStatutoryIssuanceAllocationInput = Readonly<{
  refundStatutoryDecisionId: string;
  sourceFinancialDocumentId: string;
  sourceDocumentType: RefundStatutoryIssuanceAllocationSourceDocumentType;
  sealedReversalAmountPaise: bigint;
  now: Date;
  lines: readonly Readonly<{
    sourceFinancialDocumentLineId: string;
    allocatedTaxableOrBaseAmountPaise: bigint;
  }>[];
  taxComponents: readonly Readonly<{
    sourceFinancialDocumentTaxComponentId: string;
    sourceFinancialDocumentLineId: string;
    taxType: string;
    taxRateBps: number;
    allocatedTaxAmountPaise: bigint;
  }>[];
}>;

export type InsertRefundStatutoryIssuanceAllocationTestHooks = Readonly<{
  afterChildInserts?: () => Promise<void> | void;
}>;

/**
 * Insert parent + children atomically in the caller's Persistence transaction.
 * Children are inserted first (deferred parent FK) so a failure before parent
 * insert cannot leave a sealed parent. Append-closed triggers reject later
 * child inserts once the parent exists.
 */
export async function insertRefundStatutoryIssuanceAllocation(
  context: PersistenceTransactionContext,
  input: InsertRefundStatutoryIssuanceAllocationInput,
  testHooks?: InsertRefundStatutoryIssuanceAllocationTestHooks,
): Promise<RefundStatutoryIssuanceAllocation> {
  assertTransactionContext(context, "insertRefundStatutoryIssuanceAllocation");
  const id = newRefundStatutoryIssuanceAllocationId();
  const logicalIdempotencyKey = buildRefundStatutoryIssuanceAllocationLogicalKey(
    input.refundStatutoryDecisionId,
  );
  const lineRows: RefundStatutoryIssuanceAllocationLineRow[] = [];
  const taxRows: RefundStatutoryIssuanceAllocationTaxComponentRow[] = [];

  for (const line of input.lines) {
    const inserted = await context.db
      .insert(refundStatutoryIssuanceAllocationLinesTable)
      .values({
        id: newRefundStatutoryIssuanceAllocationLineId(),
        allocationId: id,
        sourceFinancialDocumentLineId: line.sourceFinancialDocumentLineId,
        allocatedTaxableOrBaseAmountPaise: line.allocatedTaxableOrBaseAmountPaise,
      })
      .returning();
    lineRows.push(inserted[0]!);
  }
  for (const tax of input.taxComponents) {
    const inserted = await context.db
      .insert(refundStatutoryIssuanceAllocationTaxComponentsTable)
      .values({
        id: newRefundStatutoryIssuanceAllocationTaxComponentId(),
        allocationId: id,
        sourceFinancialDocumentTaxComponentId: tax.sourceFinancialDocumentTaxComponentId,
        sourceFinancialDocumentLineId: tax.sourceFinancialDocumentLineId,
        taxType: tax.taxType,
        taxRateBps: tax.taxRateBps,
        allocatedTaxAmountPaise: tax.allocatedTaxAmountPaise,
      })
      .returning();
    taxRows.push(inserted[0]!);
  }

  if (testHooks?.afterChildInserts) {
    await testHooks.afterChildInserts();
  }

  const parent = await context.db
    .insert(refundStatutoryIssuanceAllocationsTable)
    .values({
      id,
      refundStatutoryDecisionId: input.refundStatutoryDecisionId,
      logicalIdempotencyKey,
      sourceFinancialDocumentId: input.sourceFinancialDocumentId,
      sourceDocumentType: input.sourceDocumentType,
      sealedReversalAmountPaise: input.sealedReversalAmountPaise,
      createdAt: input.now,
    })
    .returning();
  const row = parent[0];
  if (!row) {
    throw new RefundStatutoryIssuanceAllocationError(
      "REFUND_STATUTORY_ISSUANCE_ALLOCATION_INVALID_INPUT",
      "Failed to persist RefundStatutoryIssuanceAllocation parent.",
      { field: "decisionId" },
    );
  }
  return mapRefundStatutoryIssuanceAllocation(row, lineRows, taxRows);
}
