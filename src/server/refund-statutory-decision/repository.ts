/**
 * RefundStatutoryDecision persistence primitives (IMP-028 / D-366).
 *
 * PENDING create/ensure + BRANCH_FINALIZED seal + ISSUED association.
 * RFV/CN FinancialDocument insertion lives in issueRefundStatutoryReversal.
 * No automatic classification. Never mutates Refund/Payment/Order.
 */
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { refundStatutoryDecisionsTable } from "../../platform/database/schema/refund-statutory-decision";
import { refundsTable } from "../../platform/database/schema/refund";
import {
  buildRefundStatutoryReversalLogicalKey,
  RefundStatutoryDecisionError,
  type RefundStatutoryDecision,
  type RefundStatutoryDecisionStatus,
  type RefundStatutoryDisposition,
  type RefundStatutoryNoSupplyAuthorityKind,
  type RefundStatutoryReversalScope,
  type SealedBranchAuthority,
} from "../../shared/refund-statutory-decision";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../persistence/types";
import { assertApplicationRole, assertTransactionContext } from "./assert-role";

export type RefundStatutoryDecisionRow =
  typeof refundStatutoryDecisionsTable.$inferSelect;

export function newRefundStatutoryDecisionId(): string {
  return randomUUID();
}

export function mapRefundStatutoryDecisionRow(
  row: RefundStatutoryDecisionRow,
): RefundStatutoryDecision {
  return Object.freeze({
    id: row.id,
    refundId: row.refundId,
    status: row.status as RefundStatutoryDecisionStatus,
    disposition: (row.disposition as RefundStatutoryDisposition | null) ?? null,
    logicalIdempotencyKey: row.logicalIdempotencyKey,
    sealedPriorReceiptVoucherId: row.sealedPriorReceiptVoucherId,
    sealedPriorTaxInvoiceId: row.sealedPriorTaxInvoiceId,
    sealedSection34QualificationCode: row.sealedSection34QualificationCode,
    sealedSection34QualificationFacts: row.sealedSection34QualificationFacts,
    sealedReversalScope:
      (row.sealedReversalScope as RefundStatutoryReversalScope | null) ?? null,
    sealedReversalAmountPaise: row.sealedReversalAmountPaise,
    sealedAllocationAuthority: row.sealedAllocationAuthority,
    sealedNoSupplyAuthorityKind:
      (row.sealedNoSupplyAuthorityKind as RefundStatutoryNoSupplyAuthorityKind | null) ??
      null,
    sealedNoStatutoryDocumentReasonCode: row.sealedNoStatutoryDocumentReasonCode,
    sealedNoStatutoryDocumentRationale: row.sealedNoStatutoryDocumentRationale,
    sealedReferencedCommercialFactRefs: row.sealedReferencedCommercialFactRefs,
    branchFinalizedAt: row.branchFinalizedAt,
    branchFinalizedByActorKind: row.branchFinalizedByActorKind,
    branchFinalizedByActorId: row.branchFinalizedByActorId,
    issuedFinancialDocumentId: row.issuedFinancialDocumentId,
    issuedAt: row.issuedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    pendingAt: row.pendingAt,
  });
}

function extractPostgresDriverCode(error: unknown): string | null {
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

export async function findRefundStatutoryDecisionById(
  context: PersistenceQueryContext,
  decisionId: string,
): Promise<RefundStatutoryDecisionRow | null> {
  assertApplicationRole(context, "findRefundStatutoryDecisionById");
  const rows = await context.db
    .select()
    .from(refundStatutoryDecisionsTable)
    .where(eq(refundStatutoryDecisionsTable.id, decisionId))
    .limit(1);
  return rows[0] ?? null;
}

export async function findRefundStatutoryDecisionByRefundId(
  context: PersistenceQueryContext,
  refundId: string,
): Promise<RefundStatutoryDecisionRow | null> {
  assertApplicationRole(context, "findRefundStatutoryDecisionByRefundId");
  const rows = await context.db
    .select()
    .from(refundStatutoryDecisionsTable)
    .where(eq(refundStatutoryDecisionsTable.refundId, refundId))
    .limit(1);
  return rows[0] ?? null;
}

export async function loadRefundStatutoryDecisionByRefundId(
  context: PersistenceQueryContext,
  refundId: string,
): Promise<RefundStatutoryDecision | null> {
  const row = await findRefundStatutoryDecisionByRefundId(context, refundId);
  return row ? mapRefundStatutoryDecisionRow(row) : null;
}

export async function loadRefundStatutoryDecisionById(
  context: PersistenceQueryContext,
  decisionId: string,
): Promise<RefundStatutoryDecision | null> {
  const row = await findRefundStatutoryDecisionById(context, decisionId);
  return row ? mapRefundStatutoryDecisionRow(row) : null;
}

/**
 * Create or return the one durable RefundStatutoryDecision for a PROCESSED Refund.
 * Idempotent on refund_id / logical key. Never mutates Refund/Payment/Order.
 * Never infers disposition / branch.
 */
export async function ensureRefundStatutoryDecisionPending(
  context: PersistenceTransactionContext,
  input: {
    refundId: string;
    now: Date;
  },
): Promise<RefundStatutoryDecision> {
  assertTransactionContext(context, "ensureRefundStatutoryDecisionPending");

  const refundRows = await context.db
    .select({
      id: refundsTable.id,
      status: refundsTable.status,
    })
    .from(refundsTable)
    .where(eq(refundsTable.id, input.refundId))
    .limit(1);
  const refund = refundRows[0];
  if (!refund) {
    throw new RefundStatutoryDecisionError(
      "REFUND_NOT_FOUND",
      `Refund not found: ${input.refundId}`,
      { field: "refundId" },
    );
  }
  if (refund.status !== "PROCESSED") {
    throw new RefundStatutoryDecisionError(
      "REFUND_NOT_PROCESSED",
      `RefundStatutoryDecision PENDING may only be ensured for PROCESSED Refunds (got ${refund.status}).`,
      { field: "refundId" },
    );
  }

  const existing = await findRefundStatutoryDecisionByRefundId(
    context,
    input.refundId,
  );
  if (existing) {
    return mapRefundStatutoryDecisionRow(existing);
  }

  const logicalIdempotencyKey = buildRefundStatutoryReversalLogicalKey(
    input.refundId,
  );
  const id = newRefundStatutoryDecisionId();
  try {
    const rows = await context.db
      .insert(refundStatutoryDecisionsTable)
      .values({
        id,
        refundId: input.refundId,
        status: "PENDING",
        disposition: null,
        logicalIdempotencyKey,
        sealedPriorReceiptVoucherId: null,
        sealedPriorTaxInvoiceId: null,
        sealedSection34QualificationCode: null,
        sealedSection34QualificationFacts: null,
        sealedReversalScope: null,
        sealedReversalAmountPaise: null,
        sealedAllocationAuthority: null,
        sealedNoSupplyAuthorityKind: null,
        sealedNoStatutoryDocumentReasonCode: null,
        sealedNoStatutoryDocumentRationale: null,
        sealedReferencedCommercialFactRefs: null,
        branchFinalizedAt: null,
        branchFinalizedByActorKind: null,
        branchFinalizedByActorId: null,
        issuedFinancialDocumentId: null,
        issuedAt: null,
        createdAt: input.now,
        updatedAt: input.now,
        pendingAt: input.now,
      })
      .returning();
    return mapRefundStatutoryDecisionRow(rows[0]!);
  } catch (error) {
    const driverCode = extractPostgresDriverCode(error);
    const message =
      error instanceof Error
        ? `${error.message}\n${String((error as { cause?: unknown }).cause ?? "")}`
        : String(error);
    const isUnique =
      driverCode === "23505" || /duplicate key value/i.test(message);
    if (
      isUnique &&
      (/refund_statutory_decisions_refund_uidx/i.test(message) ||
        /refund_statutory_decisions_logical_key_uidx/i.test(message) ||
        /Key \(refund_id\)/i.test(message) ||
        /Key \(logical_idempotency_key\)/i.test(message))
    ) {
      const raced = await findRefundStatutoryDecisionByRefundId(
        context,
        input.refundId,
      );
      if (raced) {
        return mapRefundStatutoryDecisionRow(raced);
      }
    }
    throw error;
  }
}

export async function lockRefundStatutoryDecisionForUpdate(
  context: PersistenceTransactionContext,
  decisionId: string,
): Promise<RefundStatutoryDecisionRow | null> {
  assertTransactionContext(context, "lockRefundStatutoryDecisionForUpdate");
  const rows = await context.db
    .select()
    .from(refundStatutoryDecisionsTable)
    .where(eq(refundStatutoryDecisionsTable.id, decisionId))
    .for("update")
    .limit(1);
  return rows[0] ?? null;
}

export async function sealRefundStatutoryDecisionBranch(
  context: PersistenceTransactionContext,
  input: {
    id: string;
    now: Date;
    actorKind: string;
    actorId: string;
    authority: SealedBranchAuthority;
  },
): Promise<RefundStatutoryDecision> {
  assertTransactionContext(context, "sealRefundStatutoryDecisionBranch");
  const rows = await context.db
    .update(refundStatutoryDecisionsTable)
    .set({
      status: "BRANCH_FINALIZED",
      disposition: input.authority.disposition,
      sealedPriorReceiptVoucherId:
        input.authority.sealedPriorReceiptVoucherId,
      sealedPriorTaxInvoiceId: input.authority.sealedPriorTaxInvoiceId,
      sealedSection34QualificationCode:
        input.authority.sealedSection34QualificationCode,
      sealedSection34QualificationFacts:
        input.authority.sealedSection34QualificationFacts,
      sealedReversalScope: input.authority.sealedReversalScope,
      sealedReversalAmountPaise: input.authority.sealedReversalAmountPaise,
      sealedAllocationAuthority: input.authority.sealedAllocationAuthority,
      sealedNoSupplyAuthorityKind:
        input.authority.sealedNoSupplyAuthorityKind,
      sealedNoStatutoryDocumentReasonCode:
        input.authority.sealedNoStatutoryDocumentReasonCode,
      sealedNoStatutoryDocumentRationale:
        input.authority.sealedNoStatutoryDocumentRationale,
      sealedReferencedCommercialFactRefs:
        input.authority.sealedReferencedCommercialFactRefs,
      branchFinalizedAt: input.now,
      branchFinalizedByActorKind: input.actorKind,
      branchFinalizedByActorId: input.actorId,
      updatedAt: input.now,
    })
    .where(eq(refundStatutoryDecisionsTable.id, input.id))
    .returning();
  const sealed = rows[0];
  if (!sealed) {
    throw new RefundStatutoryDecisionError(
      "REFUND_STATUTORY_DECISION_NOT_FOUND",
      `RefundStatutoryDecision not found while sealing: ${input.id}`,
      { field: "decisionId" },
    );
  }
  return mapRefundStatutoryDecisionRow(sealed);
}

export async function sealRefundStatutoryDecisionIssued(
  context: PersistenceTransactionContext,
  input: {
    id: string;
    issuedFinancialDocumentId: string;
    issuedAt: Date;
  },
): Promise<RefundStatutoryDecision> {
  assertTransactionContext(context, "sealRefundStatutoryDecisionIssued");
  const rows = await context.db
    .update(refundStatutoryDecisionsTable)
    .set({
      status: "ISSUED",
      issuedFinancialDocumentId: input.issuedFinancialDocumentId,
      issuedAt: input.issuedAt,
      updatedAt: input.issuedAt,
    })
    .where(eq(refundStatutoryDecisionsTable.id, input.id))
    .returning();
  const issued = rows[0];
  if (!issued) {
    throw new RefundStatutoryDecisionError(
      "REFUND_STATUTORY_DECISION_NOT_FOUND",
      `RefundStatutoryDecision not found while sealing ISSUED: ${input.id}`,
      { field: "decisionId" },
    );
  }
  return mapRefundStatutoryDecisionRow(issued);
}
