/**
 * CLI-only workforce operator auth boundary (IMP-010).
 *
 * Not part of the public `src/server/auth/workforce` HTTP-facing export
 * surface — import from this path only in operator tooling and tests.
 */
import "server-only";

export {
  createWorkforceOperatorUser,
  createResetTokenBridgeForUser,
  resetWorkforceOperatorPassword,
} from "./credentials";
export type {
  WorkforceOperatorCreateUserInput,
  WorkforceOperatorCreateUserResult,
  WorkforceOperatorResetPasswordInput,
  WorkforceOperatorResetPasswordResult,
} from "./credentials";
export {
  findWorkforceUserByEmail,
  setWorkforceOperatorLifecycleState,
  workforceUserHasCredentialAccount,
  countWorkforceSessionsForUser,
} from "./lifecycle";
export type { WorkforceLifecycleIdentity } from "./lifecycle";
export {
  buildWorkforceOperatorBetterAuthOptions,
  WORKFORCE_PASSWORD_RESET_IDENTIFIER_PREFIX,
} from "./options";
export {
  createWorkforceOperatorAuthRuntime,
} from "./runtime";
export type {
  WorkforceOperatorAuthRuntime,
  WorkforceOperatorAuthRuntimeConfig,
  WorkforceOperatorBetterAuthInstance,
  WorkforceOperatorSendResetPassword,
} from "./runtime";
export {
  WorkforceOperatorResetTokenBridge,
  WorkforceOperatorResetTokenBridgeError,
  WORKFORCE_OPERATOR_RESET_TOKEN_WAIT_MS,
} from "./reset-token-bridge";
