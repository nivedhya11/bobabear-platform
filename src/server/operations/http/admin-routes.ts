/**
 * Administration HTTP router (IMP-035 / D-373).
 *
 * Thin transport only: trusted workforce session → administration use-cases.
 */
import "server-only";

import type { IncomingMessage, ServerResponse } from "node:http";

import {
  adminCreateBrand,
  adminCreateLegalEntity,
  adminCreateMembership,
  adminCreateOrganization,
  adminCreateOutlet,
  adminCreateTerritory,
  adminGetBrand,
  adminGetEffectivePermissions,
  adminGetLegalEntity,
  adminGetMembership,
  adminGetOrganization,
  adminGetOutlet,
  adminGetTerritory,
  adminGrantRole,
  adminListAuditEvents,
  adminListBrands,
  adminListLegalEntities,
  adminListMemberships,
  adminListOrganizations,
  adminListOutlets,
  adminListRoleAssignments,
  adminListTerritories,
  adminRevokeRole,
  adminTransitionMembership,
  adminUpdateBrand,
  adminUpdateLegalEntity,
  adminUpdateOrganization,
  adminUpdateOutlet,
  adminUpdateTerritory,
  AdministrationError,
  getAdminSession,
} from "../../administration";
import { checkTrustedOrigin } from "../../workforce-auth/http/origin";
import type { WorkforceAuthRuntime } from "../../auth/workforce";
import type { Persistence } from "../../persistence";
import { resolveOperationsWorkforcePrincipal } from "./auth";
import { readOperationsJsonObjectBody } from "./body";
import { mapAdminError } from "./admin-error-map";
import { sendJson, sendMethodNotAllowed, sendNotFound } from "./response";

export type AdminRouteDependencies = Readonly<{
  runtime: WorkforceAuthRuntime;
  persistence: Persistence;
  trustedOrigin: string;
}>;

export type AdminRouteOutcome = Readonly<{
  operation: string;
  safeOutcomeCode: string;
  httpStatus: number;
}>;

type AdminRoute =
  | Readonly<{ kind: "session" }>
  | Readonly<{ kind: "resources"; resource: ResourceKind; id?: string }>
  | Readonly<{ kind: "memberships"; id?: string; action?: "transition" | "role-assignments" }>
  | Readonly<{ kind: "revoke-assignment"; id: string }>
  | Readonly<{ kind: "effective-permissions" }>
  | Readonly<{ kind: "audit-events" }>;

type ResourceKind = "brands" | "organizations" | "territories" | "legal-entities" | "outlets";

function parseUrl(req: IncomingMessage): URL {
  return new URL(req.url ?? "/", "http://admin.local");
}

function queryObject(url: URL): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of url.searchParams) {
    if (key in out) throw new AdministrationError("ADMIN_REQUEST_INVALID", "Repeated query parameters are unsupported.");
    out[key] = value;
  }
  return out;
}

export function classifyAdminRoute(pathname: string): AdminRoute | null {
  if (!pathname.startsWith("/api/admin/v1/")) return null;
  const parts = pathname.split("/").filter(Boolean); // api, admin, v1, ...
  if (parts.length === 3) return null;
  const rest = parts.slice(3);
  if (rest.length === 1 && rest[0] === "session") return { kind: "session" };
  if (rest.length === 1 && rest[0] === "effective-permissions") return { kind: "effective-permissions" };
  if (rest.length === 1 && rest[0] === "audit-events") return { kind: "audit-events" };
  if (rest[0] === "resources" && rest[1]) {
    const resource = rest[1] as ResourceKind;
    if (!["brands", "organizations", "territories", "legal-entities", "outlets"].includes(resource)) {
      return null;
    }
    if (rest.length === 2) return { kind: "resources", resource };
    if (rest.length === 3) return { kind: "resources", resource, id: rest[2] };
    return null;
  }
  if (rest[0] === "memberships") {
    if (rest.length === 1) return { kind: "memberships" };
    if (rest.length === 2) return { kind: "memberships", id: rest[1] };
    if (rest.length === 3 && (rest[2] === "transition" || rest[2] === "role-assignments")) {
      return { kind: "memberships", id: rest[1], action: rest[2] };
    }
    return null;
  }
  if (rest[0] === "role-assignments" && rest.length === 3 && rest[2] === "revoke") {
    return { kind: "revoke-assignment", id: rest[1] };
  }
  return null;
}

function isMutation(method: string): boolean {
  return method === "POST" || method === "PATCH";
}

function dateJson<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => (v instanceof Date ? v.toISOString() : v)),
  ) as T;
}

export async function routeAdminRequest(
  req: IncomingMessage,
  res: ServerResponse,
  deps: AdminRouteDependencies,
  requestId: string,
): Promise<AdminRouteOutcome> {
  const method = (req.method ?? "GET").toUpperCase();
  const url = parseUrl(req);
  const route = classifyAdminRoute(url.pathname);
  if (!route) {
    sendNotFound(res, requestId);
    return { operation: "admin_unknown", safeOutcomeCode: "NOT_FOUND", httpStatus: 404 };
  }

  const operation =
    route.kind === "resources"
      ? `admin_${route.resource}${route.id ? "_one" : ""}`
      : route.kind === "memberships"
        ? `admin_memberships${route.action ? `_${route.action}` : route.id ? "_one" : ""}`
        : `admin_${route.kind}`;

  try {
    if (url.search !== "" && route.kind !== "effective-permissions") {
      throw new AdministrationError("ADMIN_REQUEST_INVALID", "Query parameters are unsupported for this route.");
    }
    if (isMutation(method)) {
      if (!checkTrustedOrigin(req.headers, deps.trustedOrigin).ok) {
        sendJson(res, { ok: false, code: "ADMIN_REQUEST_INVALID", requestId }, { status: 403, requestId });
        return { operation, safeOutcomeCode: "ADMIN_REQUEST_INVALID", httpStatus: 403 };
      }
    }

    const principal = await resolveOperationsWorkforcePrincipal(deps.runtime, req.headers);

    if (route.kind === "session") {
      if (method !== "GET") {
        sendMethodNotAllowed(res, requestId, "GET");
        return { operation, safeOutcomeCode: "METHOD_NOT_ALLOWED", httpStatus: 405 };
      }
      const session = await getAdminSession(deps.persistence, principal);
      sendJson(res, { ok: true, session }, { status: 200, requestId });
      return { operation, safeOutcomeCode: "OK", httpStatus: 200 };
    }

    if (route.kind === "effective-permissions") {
      if (method !== "GET") {
        sendMethodNotAllowed(res, requestId, "GET");
        return { operation, safeOutcomeCode: "METHOD_NOT_ALLOWED", httpStatus: 405 };
      }
      const permissions = await adminGetEffectivePermissions(
        deps.persistence,
        principal,
        queryObject(url),
      );
      sendJson(res, { ok: true, permissions }, { status: 200, requestId });
      return { operation, safeOutcomeCode: "OK", httpStatus: 200 };
    }

    if (route.kind === "audit-events") {
      if (method !== "GET") {
        sendMethodNotAllowed(res, requestId, "GET");
        return { operation, safeOutcomeCode: "METHOD_NOT_ALLOWED", httpStatus: 405 };
      }
      const items = dateJson(await adminListAuditEvents(deps.persistence, principal));
      sendJson(res, { ok: true, items }, { status: 200, requestId });
      return { operation, safeOutcomeCode: "OK", httpStatus: 200 };
    }

    if (route.kind === "revoke-assignment") {
      if (method !== "POST") {
        sendMethodNotAllowed(res, requestId, "POST");
        return { operation, safeOutcomeCode: "METHOD_NOT_ALLOWED", httpStatus: 405 };
      }
      const body = await readOperationsJsonObjectBody(req);
      if (!body.ok) {
        sendJson(res, { ok: false, code: "ADMIN_REQUEST_INVALID", requestId }, { status: 400, requestId });
        return { operation, safeOutcomeCode: "ADMIN_REQUEST_INVALID", httpStatus: 400 };
      }
      const assignment = dateJson(
        await adminRevokeRole(deps.persistence, principal, route.id, body.value),
      );
      sendJson(res, { ok: true, assignment }, { status: 200, requestId });
      return { operation, safeOutcomeCode: "OK", httpStatus: 200 };
    }

    if (route.kind === "memberships") {
      if (!route.id && method === "GET") {
        const items = dateJson(await adminListMemberships(deps.persistence, principal));
        sendJson(res, { ok: true, items }, { status: 200, requestId });
        return { operation, safeOutcomeCode: "OK", httpStatus: 200 };
      }
      if (!route.id && method === "POST") {
        const body = await readOperationsJsonObjectBody(req);
        if (!body.ok) {
          sendJson(res, { ok: false, code: "ADMIN_REQUEST_INVALID", requestId }, { status: 400, requestId });
          return { operation, safeOutcomeCode: "ADMIN_REQUEST_INVALID", httpStatus: 400 };
        }
        const membership = dateJson(
          await adminCreateMembership(deps.persistence, principal, body.value),
        );
        sendJson(res, { ok: true, membership }, { status: 200, requestId });
        return { operation, safeOutcomeCode: "OK", httpStatus: 200 };
      }
      if (route.id && !route.action && method === "GET") {
        const membership = dateJson(
          await adminGetMembership(deps.persistence, principal, route.id),
        );
        sendJson(res, { ok: true, membership }, { status: 200, requestId });
        return { operation, safeOutcomeCode: "OK", httpStatus: 200 };
      }
      if (route.id && route.action === "transition" && method === "POST") {
        const body = await readOperationsJsonObjectBody(req);
        if (!body.ok) {
          sendJson(res, { ok: false, code: "ADMIN_REQUEST_INVALID", requestId }, { status: 400, requestId });
          return { operation, safeOutcomeCode: "ADMIN_REQUEST_INVALID", httpStatus: 400 };
        }
        const membership = dateJson(
          await adminTransitionMembership(deps.persistence, principal, route.id, body.value),
        );
        sendJson(res, { ok: true, membership }, { status: 200, requestId });
        return { operation, safeOutcomeCode: "OK", httpStatus: 200 };
      }
      if (route.id && route.action === "role-assignments" && method === "GET") {
        const items = dateJson(
          await adminListRoleAssignments(deps.persistence, principal, route.id),
        );
        sendJson(res, { ok: true, items }, { status: 200, requestId });
        return { operation, safeOutcomeCode: "OK", httpStatus: 200 };
      }
      if (route.id && route.action === "role-assignments" && method === "POST") {
        const body = await readOperationsJsonObjectBody(req);
        if (!body.ok) {
          sendJson(res, { ok: false, code: "ADMIN_REQUEST_INVALID", requestId }, { status: 400, requestId });
          return { operation, safeOutcomeCode: "ADMIN_REQUEST_INVALID", httpStatus: 400 };
        }
        const assignment = dateJson(
          await adminGrantRole(deps.persistence, principal, route.id, body.value),
        );
        sendJson(res, { ok: true, assignment }, { status: 200, requestId });
        return { operation, safeOutcomeCode: "OK", httpStatus: 200 };
      }
      sendMethodNotAllowed(res, requestId, "GET, POST");
      return { operation, safeOutcomeCode: "METHOD_NOT_ALLOWED", httpStatus: 405 };
    }

    // resources
    const resource = route.resource;
    if (!route.id && method === "GET") {
      const items = dateJson(
        resource === "brands"
          ? await adminListBrands(deps.persistence, principal)
          : resource === "organizations"
            ? await adminListOrganizations(deps.persistence, principal)
            : resource === "territories"
              ? await adminListTerritories(deps.persistence, principal)
              : resource === "legal-entities"
                ? await adminListLegalEntities(deps.persistence, principal)
                : await adminListOutlets(deps.persistence, principal),
      );
      sendJson(res, { ok: true, items }, { status: 200, requestId });
      return { operation, safeOutcomeCode: "OK", httpStatus: 200 };
    }
    if (!route.id && method === "POST") {
      const body = await readOperationsJsonObjectBody(req);
      if (!body.ok) {
        sendJson(res, { ok: false, code: "ADMIN_REQUEST_INVALID", requestId }, { status: 400, requestId });
        return { operation, safeOutcomeCode: "ADMIN_REQUEST_INVALID", httpStatus: 400 };
      }
      const item = dateJson(
        resource === "brands"
          ? await adminCreateBrand(deps.persistence, principal, body.value)
          : resource === "organizations"
            ? await adminCreateOrganization(deps.persistence, principal, body.value)
            : resource === "territories"
              ? await adminCreateTerritory(deps.persistence, principal, body.value)
              : resource === "legal-entities"
                ? await adminCreateLegalEntity(deps.persistence, principal, body.value)
                : await adminCreateOutlet(deps.persistence, principal, body.value),
      );
      sendJson(res, { ok: true, item }, { status: 200, requestId });
      return { operation, safeOutcomeCode: "OK", httpStatus: 200 };
    }
    if (route.id && method === "GET") {
      const item = dateJson(
        resource === "brands"
          ? await adminGetBrand(deps.persistence, principal, route.id)
          : resource === "organizations"
            ? await adminGetOrganization(deps.persistence, principal, route.id)
            : resource === "territories"
              ? await adminGetTerritory(deps.persistence, principal, route.id)
              : resource === "legal-entities"
                ? await adminGetLegalEntity(deps.persistence, principal, route.id)
                : await adminGetOutlet(deps.persistence, principal, route.id),
      );
      sendJson(res, { ok: true, item }, { status: 200, requestId });
      return { operation, safeOutcomeCode: "OK", httpStatus: 200 };
    }
    if (route.id && method === "PATCH") {
      const body = await readOperationsJsonObjectBody(req);
      if (!body.ok) {
        sendJson(res, { ok: false, code: "ADMIN_REQUEST_INVALID", requestId }, { status: 400, requestId });
        return { operation, safeOutcomeCode: "ADMIN_REQUEST_INVALID", httpStatus: 400 };
      }
      const item = dateJson(
        resource === "brands"
          ? await adminUpdateBrand(deps.persistence, principal, route.id, body.value)
          : resource === "organizations"
            ? await adminUpdateOrganization(deps.persistence, principal, route.id, body.value)
            : resource === "territories"
              ? await adminUpdateTerritory(deps.persistence, principal, route.id, body.value)
              : resource === "legal-entities"
                ? await adminUpdateLegalEntity(deps.persistence, principal, route.id, body.value)
                : await adminUpdateOutlet(deps.persistence, principal, route.id, body.value),
      );
      sendJson(res, { ok: true, item }, { status: 200, requestId });
      return { operation, safeOutcomeCode: "OK", httpStatus: 200 };
    }

    sendMethodNotAllowed(res, requestId, "GET, POST, PATCH");
    return { operation, safeOutcomeCode: "METHOD_NOT_ALLOWED", httpStatus: 405 };
  } catch (error) {
    const mapped = mapAdminError(error, requestId);
    sendJson(res, mapped.body, { status: mapped.status, requestId });
    return { operation, safeOutcomeCode: mapped.body.code, httpStatus: mapped.status };
  }
}
