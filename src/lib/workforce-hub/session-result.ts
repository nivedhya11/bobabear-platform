/**
 * Distinguish auth required vs genuine denial vs session/capability service failure.
 */

export type PortalSessionOutcome =
  | "authenticated"
  | "authentication_required"
  | "service_failure";

export function classifyPortalSessionResult(input: Readonly<{
  ok: boolean;
  status?: number;
  code?: string;
}>): PortalSessionOutcome {
  if (input.ok) return "authenticated";
  if (input.status === 401 || input.code === "WORKFORCE_AUTH_REQUIRED") {
    return "authentication_required";
  }
  return "service_failure";
}
