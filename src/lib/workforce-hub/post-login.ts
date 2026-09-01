import { parseSafeWorkforceReturnPath } from "./return-to";
import { resolveNeutralPostLoginHref } from "./destinations";
import { classifyPortalSessionResult } from "./session-result";

export type PostLoginResolution =
  | Readonly<{ kind: "redirect"; href: string }>
  | Readonly<{ kind: "service_failure" }>
  | Readonly<{ kind: "authentication_required" }>;

/**
 * Neutral login uses destination count. Explicit safe returnTo is honored;
 * destination authorization still occurs on the target route/API.
 */
export function resolvePostLoginLocation(input: Readonly<{
  returnTo: string | null | undefined;
  session: Readonly<{ ok: boolean; status?: number; code?: string; capabilities?: Readonly<Record<string, boolean>> }>;
}>): PostLoginResolution {
  const returnTo = parseSafeWorkforceReturnPath(input.returnTo);
  if (returnTo) {
    return { kind: "redirect", href: returnTo };
  }
  const outcome = classifyPortalSessionResult(input.session);
  if (outcome === "authentication_required") return { kind: "authentication_required" };
  if (outcome === "service_failure") return { kind: "service_failure" };
  return {
    kind: "redirect",
    href: resolveNeutralPostLoginHref(input.session.capabilities ?? {}),
  };
}
