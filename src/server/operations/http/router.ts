/**
 * Operations Order HTTP router (IMP-029).
 *
 * Thin transport only: trusted workforce session → existing Order authority.
 */
import "server-only";

import type { IncomingMessage, ServerResponse } from "node:http";

import type { WorkforceAuthRuntime } from "../../auth/workforce";
import {
  acceptOrder,
  cancelOrder,
  fulfilOrder,
  OrderError,
  getWorkforceOrder,
  searchWorkforceOrders,
} from "../../order";
import {
  parseAcceptOrderInput,
  parseCancelOrderInput,
  parseFulfilOrderInput,
} from "../../../shared/order";
import type { Persistence } from "../../persistence";
import { checkTrustedOrigin } from "../../workforce-auth/http/origin";
import { resolveOperationsWorkforcePrincipal } from "./auth";
import { readOperationsJsonObjectBody } from "./body";
import { classifyDeliveryRoute, handleDeliveryRoute } from "./delivery-routes";
import { classifyAdminRoute, routeAdminRequest } from "./admin-routes";
import { mapOperationsError } from "./error-map";
import { sendJson, sendMethodNotAllowed, sendNotFound } from "./response";

export type OperationsRouteDependencies = Readonly<{
  runtime: WorkforceAuthRuntime;
  persistence: Persistence;
  trustedOrigin: string;
}>;

export type OperationsRouteOutcome = Readonly<{
  operation: string;
  safeOutcomeCode: string;
  httpStatus: number;
}>;

type OperationsRoute =
  | Readonly<{ kind: "collection" }>
  | Readonly<{ kind: "detail"; orderId: string }>
  | Readonly<{ kind: "accept" | "fulfil" | "cancel"; orderId: string }>;

function parseUrl(req: IncomingMessage): URL {
  return new URL(req.url ?? "/", "http://operations.local");
}

function searchInput(url: URL): Record<string, string> {
  const input: Record<string, string> = {};
  for (const [key, value] of url.searchParams) {
    if (key in input) {
      throw new OrderError(
        "ORDER_REQUEST_INVALID",
        "Repeated query parameters are not supported.",
        { field: key },
      );
    }
    input[key] = value;
  }
  return input;
}

function classifyRoute(pathname: string): OperationsRoute | null {
  if (pathname === "/api/operations/v1/orders") return { kind: "collection" };
  const segments = pathname.split("/");
  if (segments.slice(1, 5).join("/") !== "api/operations/v1/orders" || !segments[5]) return null;
  if (segments.length === 6) return { kind: "detail", orderId: segments[5] };
  if (segments.length === 7) {
    const action = segments[6];
    if (action === "accept" || action === "fulfil" || action === "cancel") {
      return { kind: action, orderId: segments[5] };
    }
  }
  return null;
}

function isMutationRoute(route: OperationsRoute): route is Extract<OperationsRoute, { kind: "accept" | "fulfil" | "cancel" }> {
  return route.kind === "accept" || route.kind === "fulfil" || route.kind === "cancel";
}

export async function routeOperationsRequest(
  req: IncomingMessage,
  res: ServerResponse,
  deps: OperationsRouteDependencies,
  requestId: string,
): Promise<OperationsRouteOutcome> {
  const method = (req.method ?? "GET").toUpperCase();
  const url = parseUrl(req);

  if (url.pathname === "/health/live") {
    if (method !== "GET") {
      sendMethodNotAllowed(res, requestId, "GET");
      return { operation: "health_live", safeOutcomeCode: "METHOD_NOT_ALLOWED", httpStatus: 405 };
    }
    sendJson(res, { ok: true }, { status: 200, requestId });
    return { operation: "health_live", safeOutcomeCode: "OK", httpStatus: 200 };
  }
  if (url.pathname === "/health/ready") {
    if (method !== "GET") {
      sendMethodNotAllowed(res, requestId, "GET");
      return { operation: "health_ready", safeOutcomeCode: "METHOD_NOT_ALLOWED", httpStatus: 405 };
    }
    try {
      const availability = await deps.persistence.checkAvailability();
      if (!availability.ok) {
        sendJson(res, { ok: false }, { status: 503, requestId });
        return { operation: "health_ready", safeOutcomeCode: "INTERNAL_ERROR", httpStatus: 503 };
      }
      sendJson(res, { ok: true }, { status: 200, requestId });
      return { operation: "health_ready", safeOutcomeCode: "OK", httpStatus: 200 };
    } catch {
      sendJson(res, { ok: false }, { status: 503, requestId });
      return { operation: "health_ready", safeOutcomeCode: "INTERNAL_ERROR", httpStatus: 503 };
    }
  }
  const route = classifyRoute(url.pathname);
  const deliveryRoute = classifyDeliveryRoute(url.pathname);
  const adminRoute = classifyAdminRoute(url.pathname);

  if (adminRoute) {
    return routeAdminRequest(req, res, deps, requestId);
  }

  if (deliveryRoute) {
    if (url.search !== "" && deliveryRoute.kind !== "get_delivery") {
      sendJson(res, { ok: false, code: "DELIVERY_REQUEST_INVALID", requestId }, { status: 400, requestId });
      return { operation: deliveryRoute.kind, safeOutcomeCode: "DELIVERY_REQUEST_INVALID", httpStatus: 400 };
    }
    if (deliveryRoute.kind !== "get_delivery") {
      if (!checkTrustedOrigin(req.headers, deps.trustedOrigin).ok) {
        sendJson(res, { ok: false, code: "DELIVERY_REQUEST_INVALID", requestId }, { status: 403, requestId });
        return { operation: deliveryRoute.kind, safeOutcomeCode: "DELIVERY_REQUEST_INVALID", httpStatus: 403 };
      }
    }
    const outcome = await handleDeliveryRoute(req, deliveryRoute, deps, requestId);
    sendJson(res, outcome.body, { status: outcome.status, requestId });
    return {
      operation: outcome.operation,
      safeOutcomeCode: outcome.code,
      httpStatus: outcome.status,
    };
  }

  if (!route) {
    sendNotFound(res, requestId);
    return { operation: "unknown", safeOutcomeCode: "NOT_FOUND", httpStatus: 404 };
  }
  const operation = route.kind === "collection" ? "list_orders" : route.kind === "detail" ? "get_order" : `${route.kind}_order`;
  const allowedMethod = isMutationRoute(route) ? "POST" : "GET";
  if (method !== allowedMethod) {
    sendMethodNotAllowed(res, requestId, allowedMethod);
    return { operation, safeOutcomeCode: "METHOD_NOT_ALLOWED", httpStatus: 405 };
  }

  try {
    if (isMutationRoute(route)) {
      if (url.search !== "") {
        throw new OrderError("ORDER_REQUEST_INVALID", "Mutation query parameters are not supported.");
      }
      if (!checkTrustedOrigin(req.headers, deps.trustedOrigin).ok) {
        sendJson(res, { ok: false, code: "ORDER_REQUEST_INVALID", requestId }, { status: 403, requestId });
        return { operation, safeOutcomeCode: "ORDER_REQUEST_INVALID", httpStatus: 403 };
      }
    }
    const principal = await resolveOperationsWorkforcePrincipal(
      deps.runtime,
      req.headers,
    );
    if (route.kind === "collection") {
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
      return { operation, safeOutcomeCode: "OK", httpStatus: 200 };
    }

    if (route.kind === "detail") {
      const order = await getWorkforceOrder(deps.persistence, principal, { orderId: route.orderId });
      sendJson(res, { ok: true, order }, { status: 200, requestId });
      return { operation, safeOutcomeCode: "OK", httpStatus: 200 };
    }

    const body = await readOperationsJsonObjectBody(req);
    if (!body.ok) {
      sendJson(res, { ok: false, code: "ORDER_REQUEST_INVALID", requestId }, { status: 400, requestId });
      return { operation, safeOutcomeCode: "ORDER_REQUEST_INVALID", httpStatus: 400 };
    }
    const result = route.kind === "accept"
      ? await acceptOrder(deps.persistence, principal, parseAcceptOrderInput(route.orderId, body.value))
      : route.kind === "fulfil"
        ? await fulfilOrder(deps.persistence, principal, parseFulfilOrderInput(route.orderId, body.value))
        : await cancelOrder(deps.persistence, principal, parseCancelOrderInput(route.orderId, body.value));
    sendJson(res, { ok: true, order: result }, { status: 200, requestId });
    return { operation, safeOutcomeCode: "OK", httpStatus: 200 };
  } catch (error) {
    const mapped = mapOperationsError(error, requestId);
    sendJson(res, mapped.body, { status: mapped.status, requestId });
    return { operation, safeOutcomeCode: mapped.body.code, httpStatus: mapped.status };
  }
}
