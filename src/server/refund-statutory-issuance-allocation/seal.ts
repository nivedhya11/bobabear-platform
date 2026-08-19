/**
 * Seal PARTIAL statutory issuance-allocation authority
 * (IMP-028 / D-366 Slice 3A).
 *
 * Does not issue FinancialDocument, does not transition
 * RefundStatutoryDecision to ISSUED, and does not sign.
 */
import { and, asc, eq, inArray, ne, or } from "drizzle-orm";

import {
  financialDocumentLineTaxComponentsTable,
  financialDocumentLinesTable,
  financialDocumentsTable,
} from "../../platform/database/schema/financial-document";
import { refundStatutoryDecisionsTable } from "../../platform/database/schema/refund-statutory-decision";
import {
  issuanceAllocationAuthorityEquals,
  parseSealRefundStatutoryIssuanceAllocationCommand,
  RefundStatutoryIssuanceAllocationError,
  type CanonicalIssuanceAllocationAuthority,
  type ParsedSealRefundStatutoryIssuanceAllocationCommand,
  type RefundStatutoryIssuanceAllocation,
  type RefundStatutoryIssuanceAllocationSourceDocumentType,
  type SealRefundStatutoryIssuanceAllocationCommand,
} from "../../shared/refund-statutory-issuance-allocation";
import type {
  Persistence,
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../persistence/types";
import { lockRefundStatutoryDecisionForUpdate } from "../refund-statutory-decision/repository";
import {
  extractPostgresDriverCode,
  findRefundStatutoryIssuanceAllocationByDecisionId,
  insertRefundStatutoryIssuanceAllocation,
  loadRefundStatutoryIssuanceAllocationByDecisionId,
  loadRefundStatutoryIssuanceAllocationChildren,
  lockRefundStatutoryIssuanceAllocationsForSource,
  type InsertRefundStatutoryIssuanceAllocationTestHooks,
} from "./repository";

type SourceLine = Readonly<{
  id: string;
  financialDocumentId: string;
  taxableValuePaise: bigint;
}>;

type SourceTax = Readonly<{
  id: string;
  financialDocumentLineId: string;
  taxType: string;
  rateBps: number;
  taxAmountPaise: bigint;
}>;

function invalid(message: string, field: string): never {
  throw new RefundStatutoryIssuanceAllocationError(
    "REFUND_STATUTORY_ISSUANCE_ALLOCATION_INVALID_INPUT",
    message,
    { field },
  );
}

function notEligible(message: string, field: string): never {
  throw new RefundStatutoryIssuanceAllocationError(
    "REFUND_STATUTORY_ISSUANCE_ALLOCATION_NOT_ELIGIBLE",
    message,
    { field },
  );
}

function conflict(message: string): never {
  throw new RefundStatutoryIssuanceAllocationError(
    "REFUND_STATUTORY_ISSUANCE_ALLOCATION_CONFLICT",
    message,
    { field: "decisionId" },
  );
}

function incompleteAuthority(message: string): never {
  throw new RefundStatutoryIssuanceAllocationError(
    "CUMULATIVE_COMPONENT_AUTHORITY_INCOMPLETE",
    message,
    { field: "decisionId" },
  );
}

export type SealRefundStatutoryIssuanceAllocationOptions = Readonly<{
  now?: Date;
  /**
   * Test-only seam: invoked after child inserts and before parent insert,
   * inside the same Persistence transaction.
   */
  afterChildInserts?: () => Promise<void> | void;
}>;

export async function sealRefundStatutoryIssuanceAllocation(
  persistence: Persistence,
  command: SealRefundStatutoryIssuanceAllocationCommand,
  options: SealRefundStatutoryIssuanceAllocationOptions = {},
): Promise<RefundStatutoryIssuanceAllocation> {
  const parsed = parseSealRefundStatutoryIssuanceAllocationCommand(command);
  const now = options.now ?? new Date();
  const testHooks: InsertRefundStatutoryIssuanceAllocationTestHooks | undefined =
    options.afterChildInserts
      ? { afterChildInserts: options.afterChildInserts }
      : undefined;
  try {
    return await persistence.transaction((tx) =>
      sealRefundStatutoryIssuanceAllocationInTransaction(tx, parsed, now, testHooks),
    );
  } catch (error) {
    if (error instanceof RefundStatutoryIssuanceAllocationError) {
      throw error;
    }
    if (!isAllocationUniqueConflict(error)) {
      throw error;
    }
    const raced = await persistence.withContext((ctx) =>
      loadRefundStatutoryIssuanceAllocationByDecisionId(ctx, parsed.decisionId),
    );
    if (!raced) {
      throw error;
    }
    const projected = await persistence.withContext((ctx) =>
      projectAuthorityFromExistingSource(ctx, parsed, raced),
    );
    if (
      projected &&
      issuanceAllocationAuthorityEquals(authorityFromAllocation(raced), projected)
    ) {
      return raced;
    }
    conflict(
      "RefundStatutoryIssuanceAllocation is already sealed with different arithmetic authority.",
    );
  }
}

async function sealRefundStatutoryIssuanceAllocationInTransaction(
  tx: PersistenceTransactionContext,
  command: ParsedSealRefundStatutoryIssuanceAllocationCommand,
  now: Date,
  testHooks?: InsertRefundStatutoryIssuanceAllocationTestHooks,
): Promise<RefundStatutoryIssuanceAllocation> {
  const decision = await lockRefundStatutoryDecisionForUpdate(tx, command.decisionId);
  if (!decision) {
    throw new RefundStatutoryIssuanceAllocationError(
      "REFUND_STATUTORY_DECISION_NOT_FOUND",
      `RefundStatutoryDecision not found: ${command.decisionId}`,
      { field: "decisionId" },
    );
  }

  if (decision.status === "PENDING") {
    notEligible(
      "PENDING RefundStatutoryDecision cannot acquire issuance-allocation authority.",
      "status",
    );
  }
  if (decision.status !== "BRANCH_FINALIZED") {
    notEligible(
      `RefundStatutoryDecision status ${decision.status} cannot acquire issuance-allocation authority.`,
      "status",
    );
  }
  if (decision.disposition === "NO_STATUTORY_DOCUMENT") {
    notEligible(
      "NO_STATUTORY_DOCUMENT cannot acquire statutory issuance-allocation authority.",
      "disposition",
    );
  }
  if (
    decision.disposition !== "REFUND_VOUCHER" &&
    decision.disposition !== "CREDIT_NOTE"
  ) {
    notEligible(
      "Issuance allocation requires REFUND_VOUCHER or CREDIT_NOTE disposition.",
      "disposition",
    );
  }
  if (decision.sealedReversalScope === "FULL") {
    notEligible(
      "FULL reversal must derive issuance arithmetic from the sealed source FinancialDocument; PARTIAL issuance allocation is forbidden.",
      "reversalScope",
    );
  }
  if (decision.sealedReversalScope !== "PARTIAL") {
    notEligible(
      "Issuance allocation is required only for PARTIAL REFUND_VOUCHER or CREDIT_NOTE.",
      "reversalScope",
    );
  }
  if (
    decision.sealedReversalAmountPaise == null ||
    decision.sealedReversalAmountPaise <= BigInt(0)
  ) {
    invalid(
      "PARTIAL RefundStatutoryDecision is missing sealed reversal amount.",
      "decisionId",
    );
  }

  const source = await resolveAndLockSourceFinancialDocument(tx, decision);
  const sourceLines = await loadSourceLinesForUpdate(tx, source.id);
  const sourceTaxes = await loadSourceTaxesForUpdate(
    tx,
    sourceLines.map((line) => line.id),
  );
  await lockRefundStatutoryIssuanceAllocationsForSource(tx, source.id);

  const existingRow = await findRefundStatutoryIssuanceAllocationByDecisionId(
    tx,
    decision.id,
  );
  if (existingRow) {
    const existing = await loadRefundStatutoryIssuanceAllocationChildren(
      tx,
      existingRow,
    );
    const projected = projectCanonicalAuthority(
      command,
      decision.id,
      source.id,
      source.documentType,
      decision.sealedReversalAmountPaise,
      sourceLines,
      sourceTaxes,
      { onMismatch: "conflict" },
    );
    if (!issuanceAllocationAuthorityEquals(authorityFromAllocation(existing), projected)) {
      conflict(
        "RefundStatutoryIssuanceAllocation is already sealed with different arithmetic authority.",
      );
    }
    return existing;
  }

  const projected = projectCanonicalAuthority(
    command,
    decision.id,
    source.id,
    source.documentType,
    decision.sealedReversalAmountPaise,
    sourceLines,
    sourceTaxes,
    { onMismatch: "invalid" },
  );
  assertReconciliation(projected);
  await assertCumulativeCaps(tx, projected, source.id, sourceLines, sourceTaxes);

  try {
    return await insertRefundStatutoryIssuanceAllocation(
      tx,
      {
        refundStatutoryDecisionId: decision.id,
        sourceFinancialDocumentId: source.id,
        sourceDocumentType: source.documentType,
        sealedReversalAmountPaise: decision.sealedReversalAmountPaise,
        now,
        lines: projected.lines,
        taxComponents: projected.taxComponents,
      },
      testHooks,
    );
  } catch (error) {
    if (!isAllocationUniqueConflict(error)) {
      throw error;
    }
    const raced = await findRefundStatutoryIssuanceAllocationByDecisionId(
      tx,
      decision.id,
    );
    if (!raced) {
      throw error;
    }
    const existing = await loadRefundStatutoryIssuanceAllocationChildren(tx, raced);
    if (
      !issuanceAllocationAuthorityEquals(authorityFromAllocation(existing), projected)
    ) {
      conflict(
        "RefundStatutoryIssuanceAllocation is already sealed with different arithmetic authority.",
      );
    }
    return existing;
  }
}

function authorityFromAllocation(
  allocation: RefundStatutoryIssuanceAllocation,
): CanonicalIssuanceAllocationAuthority {
  return {
    refundStatutoryDecisionId: allocation.refundStatutoryDecisionId,
    sourceFinancialDocumentId: allocation.sourceFinancialDocumentId,
    sourceDocumentType: allocation.sourceDocumentType,
    sealedReversalAmountPaise: allocation.sealedReversalAmountPaise,
    lines: allocation.lines.map((line) => ({
      sourceFinancialDocumentLineId: line.sourceFinancialDocumentLineId,
      allocatedTaxableOrBaseAmountPaise: line.allocatedTaxableOrBaseAmountPaise,
    })),
    taxComponents: allocation.taxComponents.map((tax) => ({
      sourceFinancialDocumentTaxComponentId: tax.sourceFinancialDocumentTaxComponentId,
      sourceFinancialDocumentLineId: tax.sourceFinancialDocumentLineId,
      taxType: tax.taxType,
      taxRateBps: tax.taxRateBps,
      allocatedTaxAmountPaise: tax.allocatedTaxAmountPaise,
    })),
  };
}

async function projectAuthorityFromExistingSource(
  ctx: PersistenceQueryContext,
  command: ParsedSealRefundStatutoryIssuanceAllocationCommand,
  existing: RefundStatutoryIssuanceAllocation,
): Promise<CanonicalIssuanceAllocationAuthority | null> {
  try {
    const lines = await ctx.db
      .select({
        id: financialDocumentLinesTable.id,
        financialDocumentId: financialDocumentLinesTable.financialDocumentId,
        taxableValuePaise: financialDocumentLinesTable.taxableValuePaise,
      })
      .from(financialDocumentLinesTable)
      .where(
        eq(
          financialDocumentLinesTable.financialDocumentId,
          existing.sourceFinancialDocumentId,
        ),
      );
    const taxes = await loadSourceTaxes(
      ctx,
      lines.map((line) => line.id),
    );
    return projectCanonicalAuthority(
      command,
      existing.refundStatutoryDecisionId,
      existing.sourceFinancialDocumentId,
      existing.sourceDocumentType,
      existing.sealedReversalAmountPaise,
      lines,
      taxes,
      { onMismatch: "conflict" },
    );
  } catch {
    return null;
  }
}

async function resolveAndLockSourceFinancialDocument(
  tx: PersistenceTransactionContext,
  decision: {
    disposition: string | null;
    sealedPriorReceiptVoucherId: string | null;
    sealedPriorTaxInvoiceId: string | null;
  },
): Promise<{
  id: string;
  documentType: RefundStatutoryIssuanceAllocationSourceDocumentType;
}> {
  const expectedType: RefundStatutoryIssuanceAllocationSourceDocumentType =
    decision.disposition === "REFUND_VOUCHER" ? "RECEIPT_VOUCHER" : "TAX_INVOICE";
  const sourceId =
    decision.disposition === "REFUND_VOUCHER"
      ? decision.sealedPriorReceiptVoucherId
      : decision.sealedPriorTaxInvoiceId;
  if (!sourceId) {
    invalid(
      "RefundStatutoryDecision is missing sealed source FinancialDocument identity.",
      "decisionId",
    );
  }
  const rows = await tx.db
    .select({
      id: financialDocumentsTable.id,
      documentType: financialDocumentsTable.documentType,
    })
    .from(financialDocumentsTable)
    .where(eq(financialDocumentsTable.id, sourceId))
    .for("update")
    .limit(1);
  const row = rows[0];
  if (!row) {
    invalid(`Sealed source FinancialDocument not found: ${sourceId}`, "decisionId");
  }
  if (row.documentType !== expectedType) {
    invalid(
      `Sealed source FinancialDocument type ${row.documentType} does not match ${expectedType} required by ${decision.disposition}.`,
      "decisionId",
    );
  }
  return {
    id: row.id,
    documentType: expectedType,
  };
}

async function loadSourceLinesForUpdate(
  tx: PersistenceTransactionContext,
  financialDocumentId: string,
): Promise<readonly SourceLine[]> {
  return tx.db
    .select({
      id: financialDocumentLinesTable.id,
      financialDocumentId: financialDocumentLinesTable.financialDocumentId,
      taxableValuePaise: financialDocumentLinesTable.taxableValuePaise,
    })
    .from(financialDocumentLinesTable)
    .where(eq(financialDocumentLinesTable.financialDocumentId, financialDocumentId))
    .orderBy(asc(financialDocumentLinesTable.id))
    .for("update");
}

async function loadSourceTaxesForUpdate(
  tx: PersistenceTransactionContext,
  lineIds: readonly string[],
): Promise<readonly SourceTax[]> {
  if (lineIds.length === 0) {
    return [];
  }
  const sorted = [...lineIds].sort((a, b) => a.localeCompare(b));
  return tx.db
    .select({
      id: financialDocumentLineTaxComponentsTable.id,
      financialDocumentLineId:
        financialDocumentLineTaxComponentsTable.financialDocumentLineId,
      taxType: financialDocumentLineTaxComponentsTable.taxType,
      rateBps: financialDocumentLineTaxComponentsTable.rateBps,
      taxAmountPaise: financialDocumentLineTaxComponentsTable.taxAmountPaise,
    })
    .from(financialDocumentLineTaxComponentsTable)
    .where(
      inArray(financialDocumentLineTaxComponentsTable.financialDocumentLineId, sorted),
    )
    .orderBy(asc(financialDocumentLineTaxComponentsTable.id))
    .for("update");
}

async function loadSourceTaxes(
  ctx: PersistenceQueryContext,
  lineIds: readonly string[],
): Promise<readonly SourceTax[]> {
  if (lineIds.length === 0) {
    return [];
  }
  return ctx.db
    .select({
      id: financialDocumentLineTaxComponentsTable.id,
      financialDocumentLineId:
        financialDocumentLineTaxComponentsTable.financialDocumentLineId,
      taxType: financialDocumentLineTaxComponentsTable.taxType,
      rateBps: financialDocumentLineTaxComponentsTable.rateBps,
      taxAmountPaise: financialDocumentLineTaxComponentsTable.taxAmountPaise,
    })
    .from(financialDocumentLineTaxComponentsTable)
    .where(
      inArray(financialDocumentLineTaxComponentsTable.financialDocumentLineId, [
        ...lineIds,
      ]),
    );
}

function projectCanonicalAuthority(
  command: ParsedSealRefundStatutoryIssuanceAllocationCommand,
  decisionId: string,
  sourceFinancialDocumentId: string,
  sourceDocumentType: RefundStatutoryIssuanceAllocationSourceDocumentType,
  sealedReversalAmountPaise: bigint,
  sourceLines: readonly SourceLine[],
  sourceTaxes: readonly SourceTax[],
  mode: { onMismatch: "invalid" | "conflict" },
): CanonicalIssuanceAllocationAuthority {
  const fail = (message: string, field: string): never => {
    if (mode.onMismatch === "conflict") {
      conflict(message);
    }
    invalid(message, field);
  };
  const linesById = new Map(sourceLines.map((line) => [line.id, line]));
  const taxesById = new Map(sourceTaxes.map((tax) => [tax.id, tax]));

  const lines = command.lines.map((line, index) => {
    const source = linesById.get(line.sourceFinancialDocumentLineId);
    if (!source || source.financialDocumentId !== sourceFinancialDocumentId) {
      fail(
        "Allocation source line does not belong to the sealed source FinancialDocument.",
        `lines[${index}].sourceFinancialDocumentLineId`,
      );
    }
    return {
      sourceFinancialDocumentLineId: source.id,
      allocatedTaxableOrBaseAmountPaise: line.allocatedTaxableOrBaseAmountPaise,
    };
  });

  const taxComponents = command.taxComponents.map((tax, index) => {
    const source = taxesById.get(tax.sourceFinancialDocumentTaxComponentId);
    if (!source) {
      fail(
        "Allocation source tax component does not belong to the sealed source FinancialDocument.",
        `taxComponents[${index}].sourceFinancialDocumentTaxComponentId`,
      );
    }
    const parentLine = linesById.get(source.financialDocumentLineId);
    if (!parentLine || parentLine.financialDocumentId !== sourceFinancialDocumentId) {
      fail(
        "Allocation source tax component does not belong to the sealed source FinancialDocument.",
        `taxComponents[${index}].sourceFinancialDocumentTaxComponentId`,
      );
    }
    if (tax.taxType != null && tax.taxType !== source.taxType) {
      fail(
        "Caller cannot override sealed source tax type.",
        `taxComponents[${index}].taxType`,
      );
    }
    if (tax.taxRateBps != null && tax.taxRateBps !== source.rateBps) {
      fail(
        "Caller cannot override sealed source tax rate.",
        `taxComponents[${index}].taxRateBps`,
      );
    }
    if (
      tax.sourceFinancialDocumentLineId != null &&
      tax.sourceFinancialDocumentLineId !== source.financialDocumentLineId
    ) {
      fail(
        "Tax-component allocation must preserve the sealed source line relationship.",
        `taxComponents[${index}].sourceFinancialDocumentLineId`,
      );
    }
    return {
      sourceFinancialDocumentTaxComponentId: source.id,
      sourceFinancialDocumentLineId: source.financialDocumentLineId,
      taxType: source.taxType,
      taxRateBps: source.rateBps,
      allocatedTaxAmountPaise: tax.allocatedTaxAmountPaise,
    };
  });

  return {
    refundStatutoryDecisionId: decisionId,
    sourceFinancialDocumentId,
    sourceDocumentType,
    sealedReversalAmountPaise,
    lines,
    taxComponents,
  };
}

function assertReconciliation(authority: CanonicalIssuanceAllocationAuthority): void {
  let total = BigInt(0);
  for (const line of authority.lines) {
    total += line.allocatedTaxableOrBaseAmountPaise;
  }
  for (const tax of authority.taxComponents) {
    total += tax.allocatedTaxAmountPaise;
  }
  if (total !== authority.sealedReversalAmountPaise) {
    invalid(
      "Allocation totals must reconcile exactly to the sealed reversal amount.",
      "lines",
    );
  }
}

async function assertCumulativeCaps(
  tx: PersistenceTransactionContext,
  projected: CanonicalIssuanceAllocationAuthority,
  sourceFinancialDocumentId: string,
  sourceLines: readonly SourceLine[],
  sourceTaxes: readonly SourceTax[],
): Promise<void> {
  const lineCap = new Map(
    sourceLines.map((line) => [line.id, line.taxableValuePaise]),
  );
  const taxCap = new Map(sourceTaxes.map((tax) => [tax.id, tax.taxAmountPaise]));
  const usedLine = new Map<string, bigint>();
  const usedTax = new Map<string, bigint>();

  const priorAllocations = await lockRefundStatutoryIssuanceAllocationsForSource(
    tx,
    sourceFinancialDocumentId,
  );
  const allocationsByDecisionId = new Map(
    priorAllocations.map((row) => [row.refundStatutoryDecisionId, row]),
  );

  const otherSealed = await tx.db
    .select({
      id: refundStatutoryDecisionsTable.id,
      sealedReversalScope: refundStatutoryDecisionsTable.sealedReversalScope,
    })
    .from(refundStatutoryDecisionsTable)
    .where(
      and(
        inArray(refundStatutoryDecisionsTable.status, ["BRANCH_FINALIZED", "ISSUED"]),
        ne(refundStatutoryDecisionsTable.id, projected.refundStatutoryDecisionId),
        or(
          eq(
            refundStatutoryDecisionsTable.sealedPriorReceiptVoucherId,
            sourceFinancialDocumentId,
          ),
          eq(
            refundStatutoryDecisionsTable.sealedPriorTaxInvoiceId,
            sourceFinancialDocumentId,
          ),
        ),
      ),
    );

  for (const other of otherSealed) {
    if (other.sealedReversalScope === "FULL") {
      invalid(
        "Source FinancialDocument components are already fully consumed by a sealed FULL reversal.",
        "lines",
      );
    }
    if (other.sealedReversalScope !== "PARTIAL") {
      continue;
    }
    if (!allocationsByDecisionId.has(other.id)) {
      incompleteAuthority(
        "Another sealed PARTIAL RefundStatutoryDecision against the source FinancialDocument has no issuance-allocation authority; unknown component consumption is not zero consumption.",
      );
    }
  }

  for (const prior of priorAllocations) {
    if (prior.refundStatutoryDecisionId === projected.refundStatutoryDecisionId) {
      continue;
    }
    const loaded = await loadRefundStatutoryIssuanceAllocationChildren(tx, prior);
    for (const line of loaded.lines) {
      usedLine.set(
        line.sourceFinancialDocumentLineId,
        (usedLine.get(line.sourceFinancialDocumentLineId) ?? BigInt(0)) +
          line.allocatedTaxableOrBaseAmountPaise,
      );
    }
    for (const tax of loaded.taxComponents) {
      usedTax.set(
        tax.sourceFinancialDocumentTaxComponentId,
        (usedTax.get(tax.sourceFinancialDocumentTaxComponentId) ?? BigInt(0)) +
          tax.allocatedTaxAmountPaise,
      );
    }
  }

  for (const line of projected.lines) {
    const cap = lineCap.get(line.sourceFinancialDocumentLineId);
    if (cap == null) {
      invalid(
        "Allocation source line does not belong to the sealed source FinancialDocument.",
        "lines",
      );
    }
    const next =
      (usedLine.get(line.sourceFinancialDocumentLineId) ?? BigInt(0)) +
      line.allocatedTaxableOrBaseAmountPaise;
    if (next > cap) {
      invalid(
        "Cumulative allocated taxable/base amount exceeds the sealed source line amount.",
        "lines",
      );
    }
  }
  for (const tax of projected.taxComponents) {
    const cap = taxCap.get(tax.sourceFinancialDocumentTaxComponentId);
    if (cap == null) {
      invalid(
        "Allocation source tax component does not belong to the sealed source FinancialDocument.",
        "taxComponents",
      );
    }
    const next =
      (usedTax.get(tax.sourceFinancialDocumentTaxComponentId) ?? BigInt(0)) +
      tax.allocatedTaxAmountPaise;
    if (next > cap) {
      invalid(
        "Cumulative allocated tax amount exceeds the sealed source tax-component amount.",
        "taxComponents",
      );
    }
  }
}

function isAllocationUniqueConflict(error: unknown): boolean {
  const driverCode = extractPostgresDriverCode(error);
  const message =
    error instanceof Error
      ? `${error.message}\n${String((error as { cause?: unknown }).cause ?? "")}`
      : String(error);
  return (
    (driverCode === "23505" || /duplicate key value/i.test(message)) &&
    (/rsia_decision_uidx/i.test(message) ||
      /rsia_logical_key_uidx/i.test(message) ||
      /Key \(refund_statutory_decision_id\)/i.test(message) ||
      /Key \(logical_idempotency_key\)/i.test(message))
  );
}
