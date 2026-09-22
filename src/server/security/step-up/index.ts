/**
 * Workforce step-up authentication core (IMP-038 / D-375 / capability §11).
 *
 * Reuses the workforce-auth session. Does not create a second identity
 * system, roles, or permissions.
 */
import "server-only";

export {
  STEP_UP_TTL_SECONDS,
  STEP_UP_ACTION_CLASSES,
  STEP_UP_GRANT_METHODS,
  STEP_UP_AUDIT_EVENT_TYPES,
  STEP_UP_PROOF_HEADER,
  STEP_UP_SESSION_HASH_DOMAIN,
  isStepUpActionClass,
  isStepUpGrantMethod,
  type StepUpActionClass,
  type StepUpGrantMethod,
  type StepUpAuditEventType,
} from "./constants";

export { hashStepUpSessionToken, assertStepUpSessionTokenHash } from "./hash";

export {
  StepUpError,
  STEP_UP_ERROR_CODES,
  isStepUpError,
  type StepUpErrorCode,
} from "./errors";

export {
  grantStepUpProof,
  consumeStepUpProof,
  requireStepUpProof,
  type GrantStepUpProofInput,
  type GrantStepUpProofResult,
  type ConsumeStepUpProofInput,
} from "./proofs";

export { recordStepUpAudit, type RecordStepUpAuditInput } from "./audit";

export {
  resolveStepUpProofId,
  enforceStepUpClass,
  enforceAccessMutationStepUp,
  enforceCredentialSecurityStepUp,
  enforcePrivacyDestructiveStepUp,
  enforceFinancialReversalStepUp,
  type EnforceStepUpInput,
} from "./enforce";

export {
  extractWorkforceSessionTokenFromCookieHeader,
  extractWorkforceSessionTokenFromIncomingHeaders,
} from "./session-token";
