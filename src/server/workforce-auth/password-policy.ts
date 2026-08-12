/**
 * Workforce password policy (IMP-010).
 *
 * Length only (15–128 characters). No composition / complexity rules.
 */
import {
  WORKFORCE_PASSWORD_MAX_LENGTH,
  WORKFORCE_PASSWORD_MIN_LENGTH,
} from "../auth/shared/workforce-session-policy";

export type WorkforcePasswordPolicyResult =
  | Readonly<{ ok: true }>
  | Readonly<{
      ok: false;
      reason: "too_short" | "too_long" | "invalid_type";
    }>;

export function validateWorkforcePassword(raw: unknown): WorkforcePasswordPolicyResult {
  if (typeof raw !== "string") {
    return { ok: false, reason: "invalid_type" };
  }
  if (raw.length < WORKFORCE_PASSWORD_MIN_LENGTH) {
    return { ok: false, reason: "too_short" };
  }
  if (raw.length > WORKFORCE_PASSWORD_MAX_LENGTH) {
    return { ok: false, reason: "too_long" };
  }
  return { ok: true };
}

export {
  WORKFORCE_PASSWORD_MAX_LENGTH,
  WORKFORCE_PASSWORD_MIN_LENGTH,
};
