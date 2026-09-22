/**
 * Step-up constants and action-class allowlist (IMP-038 / capability §11).
 */
import "server-only";

import { WORKFORCE_STEP_UP_ACTION_CLASSES } from "../../../shared/workforce-auth/contracts";

/** TTL within locked 5–15 minute band (capability §11.1). */
export const STEP_UP_TTL_SECONDS = 600 as const;

export const STEP_UP_ACTION_CLASSES = WORKFORCE_STEP_UP_ACTION_CLASSES;

export type StepUpActionClass = (typeof STEP_UP_ACTION_CLASSES)[number];

export const STEP_UP_GRANT_METHODS = Object.freeze([
  "totp",
  "password",
  "password_and_totp",
] as const);

export type StepUpGrantMethod = (typeof STEP_UP_GRANT_METHODS)[number];

export const STEP_UP_AUDIT_EVENT_TYPES = Object.freeze(["grant", "consume", "deny"] as const);

export type StepUpAuditEventType = (typeof STEP_UP_AUDIT_EVENT_TYPES)[number];

/** Request header carrying a granted proof id for admin/ops mutations. */
export const STEP_UP_PROOF_HEADER = "x-boba-step-up-proof" as const;

export const STEP_UP_SESSION_HASH_DOMAIN = "workforce-step-up-session:v1:" as const;

export function isStepUpActionClass(value: unknown): value is StepUpActionClass {
  return (
    typeof value === "string" &&
    (STEP_UP_ACTION_CLASSES as readonly string[]).includes(value)
  );
}

export function isStepUpGrantMethod(value: unknown): value is StepUpGrantMethod {
  return (
    typeof value === "string" &&
    (STEP_UP_GRANT_METHODS as readonly string[]).includes(value)
  );
}
