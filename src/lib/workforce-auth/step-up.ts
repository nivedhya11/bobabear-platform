/**
 * Browser-side step-up grant + retry helpers (IMP-038).
 *
 * Never imports `src/server/**`. Relies on same-origin cookies for session.
 */
import {
  WORKFORCE_AUTH_PUBLIC_PATHS,
  WORKFORCE_STEP_UP_PROOF_HEADER,
  type WorkforceAuthStepUpResponse,
  type WorkforceStepUpActionClass,
} from "@/shared/workforce-auth/contracts";

export { WORKFORCE_STEP_UP_PROOF_HEADER };

export type WorkforceStepUpClientError = Readonly<{
  ok: false;
  code: "NETWORK_ERROR" | "INVALID_RESPONSE" | string;
}>;

export type WorkforceStepUpGrantResult =
  | Readonly<{
      ok: true;
      proofId: string;
      expiresAt: string;
      actionClass: WorkforceStepUpActionClass;
    }>
  | WorkforceStepUpClientError;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Grant a single-use step-up proof via TOTP (and optional password) re-auth.
 */
export async function grantWorkforceStepUpProof(input: Readonly<{
  actionClass: WorkforceStepUpActionClass;
  code: string;
  password?: string;
}>): Promise<WorkforceStepUpGrantResult> {
  let response: Response;
  try {
    response = await fetch(WORKFORCE_AUTH_PUBLIC_PATHS.stepUp, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actionClass: input.actionClass,
        code: input.code,
        ...(typeof input.password === "string" && input.password.length > 0
          ? { password: input.password }
          : {}),
      }),
    });
  } catch {
    return { ok: false, code: "NETWORK_ERROR" };
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    return { ok: false, code: "INVALID_RESPONSE" };
  }

  if (!isPlainObject(parsed)) {
    return { ok: false, code: "INVALID_RESPONSE" };
  }

  if (parsed.ok === true && typeof parsed.proofId === "string") {
    const body = parsed as WorkforceAuthStepUpResponse & { ok: true };
    return {
      ok: true,
      proofId: body.proofId,
      expiresAt: body.expiresAt,
      actionClass: body.actionClass,
    };
  }

  if (parsed.ok === false && typeof parsed.code === "string") {
    return { ok: false, code: parsed.code };
  }
  return { ok: false, code: "INVALID_RESPONSE" };
}

export function isStepUpRequiredCode(code: string | undefined): boolean {
  return (
    code === "STEP_UP_REQUIRED" ||
    code === "STEP_UP_EXPIRED" ||
    code === "STEP_UP_REPLAY" ||
    code === "STEP_UP_INVALID" ||
    code === "STEP_UP_CLASS_MISMATCH"
  );
}

/**
 * Run a privileged mutation, granting a step-up proof when the server
 * demands one. `promptTotp` returns a TOTP code or null if the operator cancels.
 */
export async function withStepUpProof<T extends { ok: boolean; code?: string }>(
  actionClass: WorkforceStepUpActionClass,
  execute: (proofId: string | undefined) => Promise<T>,
  promptTotp: () => Promise<string | null>,
): Promise<T | WorkforceStepUpClientError> {
  const first = await execute(undefined);
  if (first.ok || !isStepUpRequiredCode(first.code)) {
    return first;
  }

  const code = await promptTotp();
  if (code === null || code.trim().length === 0) {
    return { ok: false, code: "STEP_UP_REQUIRED" };
  }

  const granted = await grantWorkforceStepUpProof({ actionClass, code: code.trim() });
  if (!granted.ok) {
    return granted;
  }

  return execute(granted.proofId);
}
