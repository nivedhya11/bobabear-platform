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
  enforceAccessMutationStepUp,
  enforceFinancialReversalStepUp,
  extractWorkforceSessionTokenFromIncomingHeaders,
  hashStepUpSessionToken,
  isStepUpError,
  resolveStepUpProofId,
  StepUpError,
  STEP_UP_ERROR_CODES,
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
  const sessionTokenHash = resolveSessionTokenHash(headers, deps.stepUpSessionHashSecret);
  const now = deps.now?.() ?? new Date();
  await deps.persistence.transaction((tx) =>
    enforceAccessMutationStepUp(tx, {
      proofId,
      sessionTokenHash,
      now,
      workforceUserId,
    }),
  );
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
  const sessionTokenHash = resolveSessionTokenHash(headers, deps.stepUpSessionHashSecret);
  const now = deps.now?.() ?? new Date();
  await deps.persistence.transaction((tx) =>
    enforceFinancialReversalStepUp(tx, {
      proofId,
      sessionTokenHash,
      now,
      workforceUserId,
    }),
  );
}

export { isStepUpError, StepUpError, STEP_UP_ERROR_CODES };
