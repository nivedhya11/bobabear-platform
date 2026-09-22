/**
 * Append-only workforce step-up audit events (IMP-038 / capability §11.1).
 *
 * Never logs raw session tokens, passwords, or TOTP codes — only the
 * session token hash and structured reason codes.
 */
import "server-only";

import {
  workforceStepUpAuditEventsTable,
} from "../../../platform/database/schema/workforce-step-up-proofs";
import { isTransactionContext } from "../../persistence/context-kind";
import type { PersistenceTransactionContext } from "../../persistence/types";
import {
  isStepUpActionClass,
  type StepUpActionClass,
  type StepUpAuditEventType,
} from "./constants";
import { assertStepUpSessionTokenHash } from "./hash";
import { StepUpError, STEP_UP_ERROR_CODES } from "./errors";

export type RecordStepUpAuditInput = Readonly<{
  eventType: StepUpAuditEventType;
  actionClass: StepUpActionClass;
  workforceUserId: string;
  sessionTokenHash: string;
  proofId?: string | null;
  reasonCode?: string | null;
  now?: Date;
}>;

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

export async function recordStepUpAudit(
  tx: PersistenceTransactionContext,
  input: RecordStepUpAuditInput,
): Promise<{ id: string }> {
  assertApplicationTransaction(tx, "recordStepUpAudit");
  if (!isStepUpActionClass(input.actionClass)) {
    throw new StepUpError(STEP_UP_ERROR_CODES.STEP_UP_CLASS_MISMATCH);
  }
  if (typeof input.workforceUserId !== "string" || input.workforceUserId.length === 0) {
    throw new StepUpError(STEP_UP_ERROR_CODES.STEP_UP_INVALID);
  }
  assertStepUpSessionTokenHash(input.sessionTokenHash);

  const now = input.now ?? new Date();
  const rows = await tx.db
    .insert(workforceStepUpAuditEventsTable)
    .values({
      eventType: input.eventType,
      proofId: input.proofId ?? null,
      actionClass: input.actionClass,
      workforceUserId: input.workforceUserId,
      sessionTokenHash: input.sessionTokenHash,
      reasonCode: input.reasonCode ?? null,
      createdAt: now,
    })
    .returning({ id: workforceStepUpAuditEventsTable.id });

  const id = rows[0]?.id;
  if (typeof id !== "string" || id.length === 0) {
    throw new StepUpError(STEP_UP_ERROR_CODES.STEP_UP_INVALID, "Failed to record step-up audit.");
  }
  return { id };
}
