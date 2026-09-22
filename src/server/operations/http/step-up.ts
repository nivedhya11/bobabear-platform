/**
 * Operations / Admin step-up consumption helpers (IMP-038).
 *
 * Resolves the workforce session token from cookies, hashes it with the
 * shared WORKFORCE_AUTH_SECRET, and consumes the required action class.
 */
import "server-only";

import type { IncomingHttpHeaders } from "node:http";

import type { WorkforceAuthSecret } from "../../auth/shared/types";
import type { Persistence } from "../../persistence";
import {
  buildStepUpDenyAuditInput,
  enforceAccessMutationStepUp,
  enforceFinancialReversalStepUp,
  extractWorkforceSessionTokenFromIncomingHeaders,
  hashStepUpSessionToken,
  isStepUpError,
  recordStepUpAudit,
  resolveStepUpProofId,
  StepUpError,
  STEP_UP_ERROR_CODES,
  type StepUpActionClass,
} from "../../security/step-up";

export type OpsStepUpDependencies = Readonly<{
  persistence: Persistence;
  stepUpSessionHashSecret: WorkforceAuthSecret;
  now?: () => Date;
}>;

function resolveSessionTokenHash(
  headers: IncomingHttpHeaders,
  secret: WorkforceAuthSecret,
): string {
  const token = extractWorkforceSessionTokenFromIncomingHeaders(headers);
  if (!token) {
    throw new StepUpError(STEP_UP_ERROR_CODES.STEP_UP_REQUIRED);
  }
  return hashStepUpSessionToken(secret, token);
}

async function persistDenyAfterRollback(
  persistence: Persistence,
  input: Readonly<{
    proofId: string | null;
    sessionTokenHash: string;
    actionClass: StepUpActionClass;
    now: Date;
    workforceUserId: string;
  }>,
  error: StepUpError,
): Promise<void> {
  try {
    await persistence.transaction((tx) =>
      recordStepUpAudit(
        tx,
        buildStepUpDenyAuditInput(
          {
            proofId: input.proofId ?? "",
            sessionTokenHash: input.sessionTokenHash,
            actionClass: input.actionClass,
            now: input.now,
            workforceUserId: input.workforceUserId,
          },
          error,
        ),
      ),
    );
  } catch {
    // Audit failure must not mask the authoritative step-up denial.
  }
}

/**
 * Require and consume CLASS_ACCESS_MUTATION for admin membership/role mutations.
 */
export async function consumeAccessMutationStepUpForOpsRequest(
  deps: OpsStepUpDependencies,
  headers: IncomingHttpHeaders,
  body: Readonly<Record<string, unknown>> | null | undefined,
  workforceUserId: string,
): Promise<void> {
  const proofId = resolveStepUpProofId({ headers, body: body ?? undefined });
  let sessionTokenHash: string;
  try {
    sessionTokenHash = resolveSessionTokenHash(headers, deps.stepUpSessionHashSecret);
  } catch (error) {
    if (isStepUpError(error)) {
      await persistDenyAfterRollback(
        deps.persistence,
        {
          proofId,
          sessionTokenHash: "0".repeat(64),
          actionClass: "CLASS_ACCESS_MUTATION",
          now: deps.now?.() ?? new Date(),
          workforceUserId,
        },
        error,
      );
    }
    throw error;
  }
  const now = deps.now?.() ?? new Date();
  try {
    await deps.persistence.transaction((tx) =>
      enforceAccessMutationStepUp(tx, {
        proofId,
        sessionTokenHash,
        now,
        workforceUserId,
      }),
    );
  } catch (error) {
    if (isStepUpError(error)) {
      await persistDenyAfterRollback(
        deps.persistence,
        {
          proofId,
          sessionTokenHash,
          actionClass: "CLASS_ACCESS_MUTATION",
          now,
          workforceUserId,
        },
        error,
      );
    }
    throw error;
  }
}

/**
 * Require and consume CLASS_FINANCIAL_REVERSAL for refund create.
 */
export async function consumeFinancialReversalStepUpForOpsRequest(
  deps: OpsStepUpDependencies,
  headers: IncomingHttpHeaders,
  body: Readonly<Record<string, unknown>> | null | undefined,
  workforceUserId: string,
): Promise<void> {
  const proofId = resolveStepUpProofId({ headers, body: body ?? undefined });
  let sessionTokenHash: string;
  try {
    sessionTokenHash = resolveSessionTokenHash(headers, deps.stepUpSessionHashSecret);
  } catch (error) {
    if (isStepUpError(error)) {
      await persistDenyAfterRollback(
        deps.persistence,
        {
          proofId,
          sessionTokenHash: "0".repeat(64),
          actionClass: "CLASS_FINANCIAL_REVERSAL",
          now: deps.now?.() ?? new Date(),
          workforceUserId,
        },
        error,
      );
    }
    throw error;
  }
  const now = deps.now?.() ?? new Date();
  try {
    await deps.persistence.transaction((tx) =>
      enforceFinancialReversalStepUp(tx, {
        proofId,
        sessionTokenHash,
        now,
        workforceUserId,
      }),
    );
  } catch (error) {
    if (isStepUpError(error)) {
      await persistDenyAfterRollback(
        deps.persistence,
        {
          proofId,
          sessionTokenHash,
          actionClass: "CLASS_FINANCIAL_REVERSAL",
          now,
          workforceUserId,
        },
        error,
      );
    }
    throw error;
  }
}

export { isStepUpError, StepUpError, STEP_UP_ERROR_CODES };
