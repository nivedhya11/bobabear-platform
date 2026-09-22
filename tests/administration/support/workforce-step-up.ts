/**
 * Shared helpers to mint single-use workforce step-up proofs for HTTP integration tests (IMP-038).
 *
 * Prefer DB grant over the MFA HTTP grant path so suites stay focused on the protected
 * mutation contracts. Does not bypass consume/enforce — callers must attach the proof.
 */
import {
  extractWorkforceSessionTokenFromCookieHeader,
  grantStepUpProof,
  hashStepUpSessionToken,
  type StepUpActionClass,
} from "../../../src/server/security/step-up";
import { WORKFORCE_STEP_UP_PROOF_HEADER } from "../../../src/shared/workforce-auth/contracts";
import type { Persistence } from "../../../src/server/persistence";

export { WORKFORCE_STEP_UP_PROOF_HEADER };

export type MintStepUpProofInput = Readonly<{
  persistence: Persistence;
  /** Same secret as Ops/Admin `stepUpSessionHashSecret` / WORKFORCE_AUTH_SECRET. */
  sessionHashSecret: string;
  workforceUserId: string;
  /** Cookie header value (`name=value` or full Cookie header). */
  cookieHeader: string;
  actionClass: StepUpActionClass;
  now?: Date;
}>;

/**
 * Grant a session-bound, single-use proof for the cookie on the wire.
 * Hash the extracted cookie value — not the raw adapter session token alone.
 */
export async function mintStepUpProofId(input: MintStepUpProofInput): Promise<string> {
  const sessionToken = extractWorkforceSessionTokenFromCookieHeader(input.cookieHeader);
  if (!sessionToken) {
    throw new Error("mintStepUpProofId: missing workforce session cookie");
  }
  const sessionTokenHash = hashStepUpSessionToken(input.sessionHashSecret, sessionToken);
  const granted = await input.persistence.transaction((tx) =>
    grantStepUpProof(tx, {
      sessionTokenHash,
      workforceUserId: input.workforceUserId,
      actionClass: input.actionClass,
      grantMethod: "totp",
      now: input.now ?? new Date(),
    }),
  );
  return granted.proofId;
}

/** Attach proof header for a protected mutation (one proof per mutation). */
export function withStepUpProofHeader(
  headers: Record<string, string>,
  proofId: string,
): Record<string, string> {
  return {
    ...headers,
    [WORKFORCE_STEP_UP_PROOF_HEADER]: proofId,
  };
}

export async function headersWithAccessMutationStepUp(opts: {
  persistence: Persistence;
  sessionHashSecret: string;
  workforceUserId: string;
  headers: Record<string, string>;
}): Promise<Record<string, string>> {
  const proofId = await mintStepUpProofId({
    persistence: opts.persistence,
    sessionHashSecret: opts.sessionHashSecret,
    workforceUserId: opts.workforceUserId,
    cookieHeader: opts.headers.cookie ?? "",
    actionClass: "CLASS_ACCESS_MUTATION",
  });
  return withStepUpProofHeader(opts.headers, proofId);
}

export async function headersWithFinancialReversalStepUp(opts: {
  persistence: Persistence;
  sessionHashSecret: string;
  workforceUserId: string;
  headers: Record<string, string>;
}): Promise<Record<string, string>> {
  const proofId = await mintStepUpProofId({
    persistence: opts.persistence,
    sessionHashSecret: opts.sessionHashSecret,
    workforceUserId: opts.workforceUserId,
    cookieHeader: opts.headers.cookie ?? "",
    actionClass: "CLASS_FINANCIAL_REVERSAL",
  });
  return withStepUpProofHeader(opts.headers, proofId);
}
