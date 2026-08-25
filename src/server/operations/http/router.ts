/**
 * Operations Order read HTTP router (IMP-029).
 *
 * Thin transport only: trusted workforce session → existing Order authority.
 */
import "server-only";

import type { IncomingMessage, ServerResponse } from "node:http";

import type { WorkforceAuthRuntime } from "../../auth/workforce";
import { getWorkforceOrder, searchWorkforceOrders } from "../../order";
import type { Persistence } from "../../persistence";
import { resolveOperationsWorkforcePrincipal } from "./auth";
import { mapOperationsError } from "./error-map";
import { sendJson, sendMethodNotAllowed, sendNotFound } from "./response";

export type OperationsRouteDependencies = Readonly<{
  runtime: WorkforceAuthRuntime;
  persistence: Persistence;
}>;

function parseUrl(req: IncomingMessage): URL {
  return new URL(req.url ?? "/", "http://operations.local");
}

function searchInput(url: URL): Record<string, string> {
  const input: Record<string, string> = {};
  for (const [key, value] of url.searchParams) input[key] = value;
  return input;
}

function detailOrderId(pathname: string): string | null {
  const prefix = "/api/operations/v1/orders/";
  if (!pathname.startsWith(prefix)) return null;
  const orderId = pathname.slice(prefix.length);
  return orderId.length > 0 && !orderId.includes("/") ? orderId : null;
}

export async function routeOperationsRequest(
  req: IncomingMessage,
  res: ServerResponse,
  deps: OperationsRouteDependencies,
  requestId: string,
): Promise<void> {
  const method = (req.method ?? "GET").toUpperCase();
  const url = parseUrl(req);
  const detailId = detailOrderId(url.pathname);
  const isCollection = url.pathname === "/api/operations/v1/orders";

  if (!isCollection && detailId === null) {
    sendNotFound(res, requestId);
    return;
  }
  if (method !== "GET") {
    sendMethodNotAllowed(res, requestId);
    return;
  }

  try {
    const principal = await resolveOperationsWorkforcePrincipal(
      deps.runtime,
      req.headers,
    );
    if (isCollection) {
      const result = await searchWorkforceOrders(
        deps.persistence,
        principal,
        searchInput(url),
      );
      sendJson(
        res,
        { ok: true, items: result.items, nextCursor: result.nextCursor },
        { status: 200, requestId },
      );
      return;
    }

    const order = await getWorkforceOrder(deps.persistence, principal, {
      orderId: detailId,
    });
    sendJson(res, { ok: true, order }, { status: 200, requestId });
  } catch (error) {
    const mapped = mapOperationsError(error, requestId);
    sendJson(res, mapped.body, { status: mapped.status, requestId });
  }
}
