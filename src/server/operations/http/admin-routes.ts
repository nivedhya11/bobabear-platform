/**
 * Administration HTTP router (IMP-035 / IMP-036G / D-373).
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
  adminGetBrandScheduledCancellationPolicy,
  adminGetEffectivePermissions,
  adminGetLegalEntity,
  adminGetMembership,
  adminGetOrganization,
  adminGetOutlet,
  adminGetOverview,
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
  adminUpdateBrandScheduledCancellationPolicy,
  adminUpdateLegalEntity,
  adminUpdateOrganization,
  adminUpdateOutlet,
  adminUpdateTerritory,
  AdministrationError,
  getAdminSession,
} from "../../administration";
import { checkTrustedOrigin } from "../../workforce-auth/http/origin";
import type { WorkerHealthReporter } from "../../../platform/observability/worker-health";
import type { WorkforceAuthRuntime } from "../../auth/workforce";
import type { WorkforceAuthSecret } from "../../auth/shared/types";
import type { Persistence } from "../../persistence";
import { resolveOperationsWorkforcePrincipal } from "./auth";
import { readOperationsJsonObjectBody } from "./body";
import { mapAdminError } from "./admin-error-map";
import { sendJson, sendMethodNotAllowed, sendNotFound } from "./response";
import {
  consumeAccessMutationStepUpForOpsRequest,
  isStepUpError,
} from "./step-up";

export type AdminRouteDependencies = Readonly<{
  runtime: WorkforceAuthRuntime;
  persistence: Persistence;
  trustedOrigin: string;
  stepUpSessionHashSecret: WorkforceAuthSecret;
  /** Ops runtime identity so Admin overview composes the same status projection as Ops. */
  serviceName?: string;
  startedAt?: Date;
  workers?: readonly WorkerHealthReporter[];
}>;

export type AdminRouteOutcome = Readonly<{
  operation: string;
  safeOutcomeCode: string;
  httpStatus: number;
}>;

type AdminRoute =
  | Readonly<{ kind: "session" }>
  | Readonly<{ kind: "overview" }>
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
  if (rest.length === 1 && rest[0] === "overview") return { kind: "overview" };
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
    JSON.stringify(value, (_k, v) => {
      if (v instanceof Date) return v.toISOString();
      if (typeof v === "bigint") return v.toString(10);
      return v;
    }),
  ) as T;
}

function assertAllowedQueryKeys(
  query: Readonly<Record<string, string>>,
  allowed: ReadonlySet<string>,
): void {
  for (const key of Object.keys(query)) {
    if (!allowed.has(key)) {
      throw new AdministrationError("ADMIN_REQUEST_INVALID", "Unknown query parameter.", {
        field: key,
      });
    }
  }
}

function continuationEnvelope<T>(page: {
  items: T;
  nextCursor: string | null;
  more: boolean;
}): { ok: true; items: T; nextCursor: string | null; more: boolean } {
  return {
    ok: true,
    items: page.items,
    nextCursor: page.nextCursor,
    more: page.more,
  };
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
      if (url.search !== "") {
        throw new AdministrationError("ADMIN_REQUEST_INVALID", "Query parameters are unsupported for this route.");
      }
      const session = await getAdminSession(deps.persistence, principal);
      sendJson(res, { ok: true, session }, { status: 200, requestId });
      return { operation, safeOutcomeCode: "OK", httpStatus: 200 };
    }

    if (route.kind === "overview") {
      if (method !== "GET") {
        sendMethodNotAllowed(res, requestId, "GET");
        return { operation, safeOutcomeCode: "METHOD_NOT_ALLOWED", httpStatus: 405 };
      }
      if (url.search !== "") {
        throw new AdministrationError("ADMIN_REQUEST_INVALID", "Query parameters are unsupported for this route.");
      }
      const overview = dateJson(
        await adminGetOverview(deps.persistence, principal, {
          ...(deps.serviceName ? { serviceName: deps.serviceName } : {}),
          ...(deps.startedAt ? { startedAt: deps.startedAt } : {}),
          ...(deps.workers ? { workers: deps.workers } : {}),
        }),
      );
      sendJson(res, { ok: true, overview }, { status: 200, requestId });
      return { operation, safeOutcomeCode: "OK", httpStatus: 200 };
    }

    if (route.kind === "effective-permissions") {
      if (method !== "GET") {
        sendMethodNotAllowed(res, requestId, "GET");
        return { operation, safeOutcomeCode: "METHOD_NOT_ALLOWED", httpStatus: 405 };
      }
      const query = queryObject(url);
      const result = dateJson(
        await adminGetEffectivePermissions(deps.persistence, principal, query),
      );
      if (Array.isArray(result)) {
        sendJson(res, { ok: true, permissions: result }, { status: 200, requestId });
      } else {
        sendJson(
          res,
          {
            ok: true,
            subject: result.subject,
            resource: result.resource,
            permissions: result.permissions,
          },
          { status: 200, requestId },
        );
      }
      return { operation, safeOutcomeCode: "OK", httpStatus: 200 };
    }

    if (route.kind === "audit-events") {
      if (method !== "GET") {
        sendMethodNotAllowed(res, requestId, "GET");
        return { operation, safeOutcomeCode: "METHOD_NOT_ALLOWED", httpStatus: 405 };
      }
      const query = url.search !== "" ? queryObject(url) : {};
      assertAllowedQueryKeys(
        query,
        new Set(["cursor", "actorWorkforceUserId", "action", "occurredFrom", "occurredTo"]),
      );
      const page = dateJson(
        await adminListAuditEvents(deps.persistence, principal, {
          cursor: query.cursor,
          actorWorkforceUserId: query.actorWorkforceUserId,
          action: query.action,
          occurredFrom: query.occurredFrom,
          occurredTo: query.occurredTo,
        }),
      );
      sendJson(res, continuationEnvelope(page), { status: 200, requestId });
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
      if (!principal) {
        throw new AdministrationError("WORKFORCE_AUTH_REQUIRED", "Workforce authentication required.");
      }
      await consumeAccessMutationStepUpForOpsRequest(
        {
          persistence: deps.persistence,
          stepUpSessionHashSecret: deps.stepUpSessionHashSecret,
        },
        req.headers,
        body.value,
        principal.workforceUserId,
      );
      const assignment = dateJson(
        await adminRevokeRole(deps.persistence, principal, route.id, body.value),
      );
      sendJson(res, { ok: true, assignment }, { status: 200, requestId });
      return { operation, safeOutcomeCode: "OK", httpStatus: 200 };
    }

    if (route.kind === "memberships") {
      if (!route.id && method === "GET") {
        const query = url.search !== "" ? queryObject(url) : {};
        assertAllowedQueryKeys(query, new Set(["outletId", "cursor"]));
        const filter =
          typeof query.outletId === "string" && query.outletId.length > 0
            ? { outletId: query.outletId, cursor: query.cursor }
            : query.cursor
              ? { cursor: query.cursor }
              : undefined;
        if (query.outletId !== undefined && (!filter || !("outletId" in filter))) {
          throw new AdministrationError("ADMIN_REQUEST_INVALID", "outletId must be a non-empty string.", {
            field: "outletId",
          });
        }
        const page = dateJson(await adminListMemberships(deps.persistence, principal, filter));
        sendJson(res, continuationEnvelope(page), { status: 200, requestId });
        return { operation, safeOutcomeCode: "OK", httpStatus: 200 };
      }
      if (!route.id && method === "POST") {
        const body = await readOperationsJsonObjectBody(req);
        if (!body.ok) {
          sendJson(res, { ok: false, code: "ADMIN_REQUEST_INVALID", requestId }, { status: 400, requestId });
          return { operation, safeOutcomeCode: "ADMIN_REQUEST_INVALID", httpStatus: 400 };
        }
        if (!principal) {
          throw new AdministrationError("WORKFORCE_AUTH_REQUIRED", "Workforce authentication required.");
        }
        await consumeAccessMutationStepUpForOpsRequest(
          {
            persistence: deps.persistence,
            stepUpSessionHashSecret: deps.stepUpSessionHashSecret,
          },
          req.headers,
          body.value,
          principal.workforceUserId,
        );
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
        if (!principal) {
          throw new AdministrationError("WORKFORCE_AUTH_REQUIRED", "Workforce authentication required.");
        }
        await consumeAccessMutationStepUpForOpsRequest(
          {
            persistence: deps.persistence,
            stepUpSessionHashSecret: deps.stepUpSessionHashSecret,
          },
          req.headers,
          body.value,
          principal.workforceUserId,
        );
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
        if (!principal) {
          throw new AdministrationError("WORKFORCE_AUTH_REQUIRED", "Workforce authentication required.");
        }
        await consumeAccessMutationStepUpForOpsRequest(
          {
            persistence: deps.persistence,
            stepUpSessionHashSecret: deps.stepUpSessionHashSecret,
          },
          req.headers,
          body.value,
          principal.workforceUserId,
        );
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
      const query = url.search !== "" ? queryObject(url) : {};
      assertAllowedQueryKeys(query, new Set(["cursor"]));
      const listQuery = query.cursor ? { cursor: query.cursor } : {};
      const page = dateJson(
        resource === "brands"
          ? await adminListBrands(deps.persistence, principal, listQuery)
          : resource === "organizations"
            ? await adminListOrganizations(deps.persistence, principal, listQuery)
            : resource === "territories"
              ? await adminListTerritories(deps.persistence, principal, listQuery)
              : resource === "legal-entities"
                ? await adminListLegalEntities(deps.persistence, principal, listQuery)
                : await adminListOutlets(deps.persistence, principal, listQuery),
      );
      sendJson(res, continuationEnvelope(page), { status: 200, requestId });
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
      const scheduledCancellationPolicy =
        resource === "brands"
          ? dateJson(
              await adminGetBrandScheduledCancellationPolicy(
                deps.persistence,
                principal,
                route.id,
              ),
            )
          : undefined;
      sendJson(
        res,
        {
          ok: true,
          item,
          ...(scheduledCancellationPolicy ? { scheduledCancellationPolicy } : {}),
        },
        { status: 200, requestId },
      );
      return { operation, safeOutcomeCode: "OK", httpStatus: 200 };
    }
    if (route.id && method === "PATCH") {
      const body = await readOperationsJsonObjectBody(req);
      if (!body.ok) {
        sendJson(res, { ok: false, code: "ADMIN_REQUEST_INVALID", requestId }, { status: 400, requestId });
        return { operation, safeOutcomeCode: "ADMIN_REQUEST_INVALID", httpStatus: 400 };
      }
      const policyBody = body.value.scheduledCancellationPolicy;
      const hasPolicy = policyBody !== undefined;
      if (hasPolicy && resource !== "brands") {
        throw new AdministrationError(
          "ADMIN_REQUEST_INVALID",
          "Cancellation cutoff is Brand-scoped. Outlet override is not available.",
          { field: "scheduledCancellationPolicy" },
        );
      }
      if (hasPolicy && (typeof policyBody !== "object" || policyBody === null || Array.isArray(policyBody))) {
        throw new AdministrationError(
          "ADMIN_REQUEST_INVALID",
          "scheduledCancellationPolicy must be an object.",
          { field: "scheduledCancellationPolicy" },
        );
      }
      if (resource === "brands") {
        const brandFields = { ...body.value };
        delete brandFields.scheduledCancellationPolicy;
        const hasBrandFields = brandFields.name !== undefined || brandFields.status !== undefined;
        if (!hasBrandFields && !hasPolicy) {
          throw new AdministrationError(
            "ADMIN_REQUEST_INVALID",
            "Brand update requires name, status, and/or scheduledCancellationPolicy.",
          );
        }
        const scheduledCancellationPolicy = hasPolicy
          ? dateJson(
              await adminUpdateBrandScheduledCancellationPolicy(
                deps.persistence,
                principal,
                route.id,
                policyBody as Record<string, unknown>,
              ),
            )
          : dateJson(
              await adminGetBrandScheduledCancellationPolicy(
                deps.persistence,
                principal,
                route.id,
              ),
            );
        const item = dateJson(
          hasBrandFields
            ? await adminUpdateBrand(deps.persistence, principal, route.id, brandFields)
            : await adminGetBrand(deps.persistence, principal, route.id),
        );
        sendJson(
          res,
          { ok: true, item, scheduledCancellationPolicy },
          { status: 200, requestId },
        );
        return { operation, safeOutcomeCode: "OK", httpStatus: 200 };
      }
      const item = dateJson(
        resource === "organizations"
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
    if (isStepUpError(error)) {
      sendJson(
        res,
        { ok: false, code: error.code, requestId },
        { status: error.httpStatus, requestId },
      );
      return { operation, safeOutcomeCode: error.code, httpStatus: error.httpStatus };
    }
    const mapped = mapAdminError(error, requestId);
    sendJson(res, mapped.body, { status: mapped.status, requestId });
    return { operation, safeOutcomeCode: mapped.body.code, httpStatus: mapped.status };
  }
}
