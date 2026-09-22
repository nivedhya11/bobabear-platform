/**
 * Wire helpers for consuming step-up proofs on high-consequence surfaces
 * (IMP-038 / capability §11.2).
 *
 * Exported for admin/ops/workforce-auth routers. Parallel agents may import
 * these without editing contested route bodies immediately.
 */
import "server-only";

import type { IncomingHttpHeaders } from "node:http";

import type { PersistenceTransactionContext } from "../../persistence/types";
import {
  STEP_UP_PROOF_HEADER,
  type StepUpActionClass,
} from "./constants";
import { StepUpError, STEP_UP_ERROR_CODES } from "./errors";
import { requireStepUpProof } from "./proofs";

function firstHeaderValue(value: string | readonly string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

/**
 * Resolve a proof id from `x-boba-step-up-proof` header or body `stepUpProofId`.
 */
export function resolveStepUpProofId(input: Readonly<{
  headers?: IncomingHttpHeaders | Headers;
  body?: Readonly<Record<string, unknown>> | null;
}>): string | null {
  if (input.headers) {
    if (input.headers instanceof Headers) {
      const header = input.headers.get(STEP_UP_PROOF_HEADER);
      if (typeof header === "string" && header.trim().length > 0) {
        return header.trim();
      }
    } else {
      const header = firstHeaderValue(input.headers[STEP_UP_PROOF_HEADER]);
      if (typeof header === "string" && header.trim().length > 0) {
        return header.trim();
      }
    }
  }
  const fromBody = input.body?.stepUpProofId;
  if (typeof fromBody === "string" && fromBody.trim().length > 0) {
    return fromBody.trim();
  }
  return null;
}

export type EnforceStepUpInput = Readonly<{
  proofId: string | null | undefined;
  sessionTokenHash: string;
  actionClass: StepUpActionClass;
  now: Date;
  workforceUserId?: string;
}>;

export async function enforceStepUpClass(
  tx: PersistenceTransactionContext,
  input: EnforceStepUpInput,
): Promise<void> {
  if (typeof input.proofId !== "string" || input.proofId.trim().length === 0) {
    throw new StepUpError(STEP_UP_ERROR_CODES.STEP_UP_REQUIRED);
  }
  await requireStepUpProof(tx, {
    proofId: input.proofId.trim(),
    sessionTokenHash: input.sessionTokenHash,
    actionClass: input.actionClass,
    now: input.now,
    workforceUserId: input.workforceUserId,
  });
}

/** CLASS_ACCESS_MUTATION — membership create/lifecycle; role grant/revoke. */
export async function enforceAccessMutationStepUp(
  tx: PersistenceTransactionContext,
  input: Omit<EnforceStepUpInput, "actionClass">,
): Promise<void> {
  await enforceStepUpClass(tx, { ...input, actionClass: "CLASS_ACCESS_MUTATION" });
}

/** CLASS_CREDENTIAL_SECURITY — password change; MFA enroll/reset/disable. */
export async function enforceCredentialSecurityStepUp(
  tx: PersistenceTransactionContext,
  input: Omit<EnforceStepUpInput, "actionClass">,
): Promise<void> {
  await enforceStepUpClass(tx, { ...input, actionClass: "CLASS_CREDENTIAL_SECURITY" });
}

/**
 * CLASS_PRIVACY_DESTRUCTIVE — operator-mediated erasure.
 * No product mutation surface yet; export for future wiring + tests only.
 */
export async function enforcePrivacyDestructiveStepUp(
  tx: PersistenceTransactionContext,
  input: Omit<EnforceStepUpInput, "actionClass">,
): Promise<void> {
  await enforceStepUpClass(tx, { ...input, actionClass: "CLASS_PRIVACY_DESTRUCTIVE" });
}

/** CLASS_FINANCIAL_REVERSAL — refund create/initiate. */
export async function enforceFinancialReversalStepUp(
  tx: PersistenceTransactionContext,
  input: Omit<EnforceStepUpInput, "actionClass">,
): Promise<void> {
  await enforceStepUpClass(tx, { ...input, actionClass: "CLASS_FINANCIAL_REVERSAL" });
}
