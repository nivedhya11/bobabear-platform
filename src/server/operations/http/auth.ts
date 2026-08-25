/**
 * Operations workforce principal resolution (IMP-029 / D-372).
 *
 * Node request headers → trusted workforce identity → branded principal.
 * Caller-provided identity and authority fields are never accepted.
 */
import "server-only";

import type { IncomingHttpHeaders } from "node:http";

import {
  resolveTrustedWorkforceAuthIdentity,
  type WorkforceAuthRuntime,
} from "../../auth/workforce";
import {
  createWorkforcePrincipalFromTrustedIdentity,
  type WorkforcePrincipal,
} from "../../access-control/principal";
import { buildBetterAuthRequestHeaders } from "../../workforce-auth/http/headers";

export async function resolveOperationsWorkforcePrincipal(
  runtime: WorkforceAuthRuntime,
  incomingHeaders: IncomingHttpHeaders,
): Promise<WorkforcePrincipal | null> {
  const headers = buildBetterAuthRequestHeaders(incomingHeaders);
  const identity = await resolveTrustedWorkforceAuthIdentity(runtime, { headers });
  if (!identity) return null;

  return createWorkforcePrincipalFromTrustedIdentity(identity);
}
