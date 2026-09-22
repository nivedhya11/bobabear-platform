/**
 * Grant / consume workforce step-up proofs (IMP-038 / capability §11).
 *
 * Fail-closed, single-use, session + action-class bound. Replay rejected.
 */
import "server-only";

import { and, eq, gt, isNull } from "drizzle-orm";

import { workforceStepUpProofsTable } from "../../../platform/database/schema/workforce-step-up-proofs";
import { isTransactionContext } from "../../persistence/context-kind";
import type { PersistenceTransactionContext } from "../../persistence/types";
import { recordStepUpAudit } from "./audit";
import {
  isStepUpActionClass,
  isStepUpGrantMethod,
  STEP_UP_TTL_SECONDS,
  type StepUpActionClass,
  type StepUpGrantMethod,
} from "./constants";
import { StepUpError, STEP_UP_ERROR_CODES } from "./errors";
import { assertStepUpSessionTokenHash } from "./hash";

function assertApplicationTransaction(
  context: PersistenceTransactionContext,
  operation: string,
): void {
  if (context.role !== "application") {
    throw new StepUpError(
      STEP_UP_ERROR_CODES.STEP_UP_INVALID,
      `${operation} requires an application-role persistence transaction.`,
    );
  }
  if (!isTransactionContext(context)) {
    throw new StepUpError(
      STEP_UP_ERROR_CODES.STEP_UP_INVALID,
      `${operation} requires a persistence transaction context.`,
    );
  }
}

function assertValidNow(now: Date): void {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new StepUpError(STEP_UP_ERROR_CODES.STEP_UP_INVALID, "Invalid step-up now timestamp.");
  }
}

export type GrantStepUpProofInput = Readonly<{
  sessionTokenHash: string;
  workforceUserId: string;
  actionClass: StepUpActionClass;
  grantMethod: StepUpGrantMethod;
  now: Date;
  /** Override TTL for tests only; production callers must omit. */
  ttlSeconds?: number;
}>;

export type GrantStepUpProofResult = Readonly<{
  proofId: string;
  expiresAt: Date;
}>;

export type ConsumeStepUpProofInput = Readonly<{
  proofId: string;
  sessionTokenHash: string;
  actionClass: StepUpActionClass;
  now: Date;
  workforceUserId?: string;
}>;

export async function grantStepUpProof(
  tx: PersistenceTransactionContext,
  input: GrantStepUpProofInput,
): Promise<GrantStepUpProofResult> {
  assertApplicationTransaction(tx, "grantStepUpProof");
  assertValidNow(input.now);
  assertStepUpSessionTokenHash(input.sessionTokenHash);
  if (!isStepUpActionClass(input.actionClass)) {
    throw new StepUpError(STEP_UP_ERROR_CODES.STEP_UP_CLASS_MISMATCH);
  }
  if (!isStepUpGrantMethod(input.grantMethod)) {
    throw new StepUpError(STEP_UP_ERROR_CODES.STEP_UP_INVALID);
  }
  if (typeof input.workforceUserId !== "string" || input.workforceUserId.length === 0) {
    throw new StepUpError(STEP_UP_ERROR_CODES.STEP_UP_INVALID);
  }

  const ttlSeconds =
    typeof input.ttlSeconds === "number" && Number.isFinite(input.ttlSeconds) && input.ttlSeconds > 0
      ? Math.floor(input.ttlSeconds)
      : STEP_UP_TTL_SECONDS;
  if (ttlSeconds < 300 || ttlSeconds > 900) {
    throw new StepUpError(
      STEP_UP_ERROR_CODES.STEP_UP_INVALID,
      "Step-up TTL must be within 5–15 minutes.",
    );
  }

  const createdAt = input.now;
  const expiresAt = new Date(createdAt.getTime() + ttlSeconds * 1000);

  const rows = await tx.db
    .insert(workforceStepUpProofsTable)
    .values({
      sessionTokenHash: input.sessionTokenHash,
      workforceUserId: input.workforceUserId,
      actionClass: input.actionClass,
      expiresAt,
      consumedAt: null,
      createdAt,
      grantMethod: input.grantMethod,
    })
    .returning({ id: workforceStepUpProofsTable.id });

  const proofId = rows[0]?.id;
  if (typeof proofId !== "string" || proofId.length === 0) {
    throw new StepUpError(STEP_UP_ERROR_CODES.STEP_UP_INVALID, "Failed to grant step-up proof.");
  }

  await recordStepUpAudit(tx, {
    eventType: "grant",
    actionClass: input.actionClass,
    workforceUserId: input.workforceUserId,
    sessionTokenHash: input.sessionTokenHash,
    proofId,
    now: createdAt,
  });

  return Object.freeze({ proofId, expiresAt });
}

async function diagnoseConsumeFailure(
  tx: PersistenceTransactionContext,
  input: ConsumeStepUpProofInput,
): Promise<StepUpError> {
  const rows = await tx.db
    .select({
      id: workforceStepUpProofsTable.id,
      sessionTokenHash: workforceStepUpProofsTable.sessionTokenHash,
      actionClass: workforceStepUpProofsTable.actionClass,
      expiresAt: workforceStepUpProofsTable.expiresAt,
      consumedAt: workforceStepUpProofsTable.consumedAt,
      workforceUserId: workforceStepUpProofsTable.workforceUserId,
    })
    .from(workforceStepUpProofsTable)
    .where(eq(workforceStepUpProofsTable.id, input.proofId))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return new StepUpError(STEP_UP_ERROR_CODES.STEP_UP_REQUIRED);
  }
  if (row.sessionTokenHash !== input.sessionTokenHash) {
    return new StepUpError(STEP_UP_ERROR_CODES.STEP_UP_INVALID);
  }
  if (row.actionClass !== input.actionClass) {
    return new StepUpError(STEP_UP_ERROR_CODES.STEP_UP_CLASS_MISMATCH);
  }
  if (row.consumedAt !== null) {
    return new StepUpError(STEP_UP_ERROR_CODES.STEP_UP_REPLAY);
  }
  if (!(row.expiresAt instanceof Date) || row.expiresAt.getTime() <= input.now.getTime()) {
    return new StepUpError(STEP_UP_ERROR_CODES.STEP_UP_EXPIRED);
  }
  if (
    typeof input.workforceUserId === "string" &&
    input.workforceUserId.length > 0 &&
    row.workforceUserId !== input.workforceUserId
  ) {
    return new StepUpError(STEP_UP_ERROR_CODES.STEP_UP_INVALID);
  }
  return new StepUpError(STEP_UP_ERROR_CODES.STEP_UP_INVALID);
}

export async function consumeStepUpProof(
  tx: PersistenceTransactionContext,
  input: ConsumeStepUpProofInput,
): Promise<{ ok: true }> {
  assertApplicationTransaction(tx, "consumeStepUpProof");
  assertValidNow(input.now);
  assertStepUpSessionTokenHash(input.sessionTokenHash);
  if (!isStepUpActionClass(input.actionClass)) {
    throw new StepUpError(STEP_UP_ERROR_CODES.STEP_UP_CLASS_MISMATCH);
  }
  if (typeof input.proofId !== "string" || input.proofId.length === 0) {
    throw new StepUpError(STEP_UP_ERROR_CODES.STEP_UP_REQUIRED);
  }

  const updated = await tx.db
    .update(workforceStepUpProofsTable)
    .set({ consumedAt: input.now })
    .where(
      and(
        eq(workforceStepUpProofsTable.id, input.proofId),
        eq(workforceStepUpProofsTable.sessionTokenHash, input.sessionTokenHash),
        eq(workforceStepUpProofsTable.actionClass, input.actionClass),
        isNull(workforceStepUpProofsTable.consumedAt),
        gt(workforceStepUpProofsTable.expiresAt, input.now),
      ),
    )
    .returning({
      id: workforceStepUpProofsTable.id,
      workforceUserId: workforceStepUpProofsTable.workforceUserId,
    });

  const consumed = updated[0];
  if (!consumed) {
    // Do not record deny inside this transaction — callers that wrap consume
    // in Persistence.transaction() would roll the deny back on throw.
    // Wrappers must call persistStepUpDenyAudit after the failed transaction.
    throw await diagnoseConsumeFailure(tx, input);
  }

  await recordStepUpAudit(tx, {
    eventType: "consume",
    actionClass: input.actionClass,
    workforceUserId: consumed.workforceUserId,
    sessionTokenHash: input.sessionTokenHash,
    proofId: consumed.id,
    now: input.now,
  });

  return Object.freeze({ ok: true as const });
}

/**
 * Fail-closed wrapper: consume a proof or throw {@link StepUpError}.
 *
 * Deny audits are intentionally not written here so they survive when the
 * surrounding transaction rolls back. Call {@link buildStepUpDenyAuditInput}
 * + {@link recordStepUpAudit} in a committed transaction after catching.
 */
export async function requireStepUpProof(
  tx: PersistenceTransactionContext,
  input: ConsumeStepUpProofInput,
): Promise<void> {
  if (
    typeof input.proofId !== "string" ||
    input.proofId.trim().length === 0 ||
    typeof input.sessionTokenHash !== "string" ||
    input.sessionTokenHash.length === 0
  ) {
    throw new StepUpError(STEP_UP_ERROR_CODES.STEP_UP_REQUIRED);
  }

  await consumeStepUpProof(tx, input);
}

/**
 * Build a deny-audit payload for a failed step-up consume. Safe to persist
 * in a separate committed transaction after the consume transaction rolls back.
 */
export function buildStepUpDenyAuditInput(
  input: ConsumeStepUpProofInput,
  error: StepUpError,
): Parameters<typeof recordStepUpAudit>[1] {
  const sessionTokenHash =
    typeof input.sessionTokenHash === "string" && /^[0-9a-f]{64}$/.test(input.sessionTokenHash)
      ? input.sessionTokenHash
      : "0".repeat(64);
  return {
    eventType: "deny",
    actionClass: isStepUpActionClass(input.actionClass)
      ? input.actionClass
      : "CLASS_ACCESS_MUTATION",
    workforceUserId:
      typeof input.workforceUserId === "string" && input.workforceUserId.length > 0
        ? input.workforceUserId
        : "unknown",
    sessionTokenHash,
    proofId: typeof input.proofId === "string" ? input.proofId : null,
    reasonCode: error.code,
    now: input.now instanceof Date && !Number.isNaN(input.now.getTime()) ? input.now : new Date(),
  };
}
