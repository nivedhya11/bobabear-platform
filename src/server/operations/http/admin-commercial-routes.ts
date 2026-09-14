/**
 * Commercial inspection / diagnosis / verification Admin HTTP (IMP-036F F6A).
 *
 * Read/composition only. No /api/commercial/*. No mutations. No new permissions.
 */
import "server-only";

import type { IncomingMessage } from "node:http";

import type { WorkforceAuthRuntime } from "../../auth/workforce";
import {
  composeCommercialActivity,
  diagnoseSellability,
  inspectCommercialOffering,
  verifyCustomerCommercialTruth,
} from "../../administration/commercial";
import { AdministrationError } from "../../administration/errors";
import type { Persistence } from "../../persistence";
import { parseNonNegativePaiseIntegerString } from "../../../shared/pricing/delivery-fee-policy";
import { resolveOperationsWorkforcePrincipal } from "./auth";
import { readOperationsJsonObjectBody } from "./body";
import { mapCommercialAdminError } from "./admin-commercial-error-map";

export type AdminCommercialRouteKind =
  | "inspection"
  | "inspection_outlet"
  | "diagnosis"
  | "verification"
  | "activity";

export type AdminCommercialRoute = Readonly<{
  kind: AdminCommercialRouteKind;
  brandId: string;
  variantId?: string;
  outletId?: string;
}>;

const FORBIDDEN_BODY_KEYS = new Set([
  "actor",
  "actorId",
  "principal",
  "permission",
  "permissions",
  "role",
  "roles",
  "scope",
  "scopeApproved",
  "authorized",
  "workforceUserId",
  "workforceUserIdAuthority",
  "brandId",
]);

function rejectForgedBody(body: Readonly<Record<string, unknown>>): void {
  for (const key of Object.keys(body)) {
    if (FORBIDDEN_BODY_KEYS.has(key)) {
      throw new AdministrationError(
        "ADMIN_REQUEST_INVALID",
        "Caller-supplied authority fields are not accepted.",
      );
    }
  }
}

function dateJson(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => {
      if (typeof v === "bigint") return v.toString(10);
      if (v instanceof Date) return v.toISOString();
      return v;
    }),
  );
}

function optionalCoordinates(
  body: Readonly<Record<string, unknown>>,
  field: string,
): { latitude: string; longitude: string } | null {
  if (!(field in body) || body[field] == null) return null;
  const value = body[field];
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new AdministrationError(
      "ADMIN_REQUEST_INVALID",
      `${field} must be an object with latitude and longitude strings.`,
      { field },
    );
  }
  const obj = value as Record<string, unknown>;
  if (typeof obj.latitude !== "string" || typeof obj.longitude !== "string") {
    throw new AdministrationError(
      "ADMIN_REQUEST_INVALID",
      `${field}.latitude and ${field}.longitude must be strings.`,
      { field },
    );
  }
  return { latitude: obj.latitude, longitude: obj.longitude };
}

/**
 * Absent / null → optional missing context.
 * Any other supplied value must be a canonical non-negative integer string.
 */
function optionalOrderSubtotalPaise(
  body: Readonly<Record<string, unknown>>,
): string | null {
  if (!("orderSubtotalPaise" in body) || body.orderSubtotalPaise == null) {
    return null;
  }
  const parsed = parseNonNegativePaiseIntegerString(body.orderSubtotalPaise);
  if (!parsed.ok) {
    throw new AdministrationError(
      "ADMIN_REQUEST_INVALID",
      "orderSubtotalPaise must be a non-negative integer string.",
      { field: "orderSubtotalPaise" },
    );
  }
  return parsed.paise.toString(10);
}

export function classifyAdminCommercialRoute(pathname: string): AdminCommercialRoute | null {
  const segments = pathname.split("/").filter(Boolean);
  if (
    segments.length < 6 ||
    segments[0] !== "api" ||
    segments[1] !== "admin" ||
    segments[2] !== "v1" ||
    segments[3] !== "brands" ||
    !segments[4] ||
    segments[5] !== "commercial"
  ) {
    return null;
  }

  const brandId = segments[4]!;
  const rest = segments.slice(6);

  if (rest.length === 1 && rest[0] === "activity") {
    return { kind: "activity", brandId };
  }

  if (rest.length === 3 && rest[0] === "variants" && rest[1] && rest[2] === "inspection") {
    return { kind: "inspection", brandId, variantId: rest[1] };
  }

  if (
    rest.length === 5 &&
    rest[0] === "variants" &&
    rest[1] &&
    rest[2] === "outlets" &&
    rest[3] &&
    rest[4] === "inspection"
  ) {
    return {
      kind: "inspection_outlet",
      brandId,
      variantId: rest[1],
      outletId: rest[3],
    };
  }

  if (rest.length === 3 && rest[0] === "variants" && rest[1] && rest[2] === "diagnosis") {
    return { kind: "diagnosis", brandId, variantId: rest[1] };
  }

  if (rest.length === 3 && rest[0] === "variants" && rest[1] && rest[2] === "verification") {
    return { kind: "verification", brandId, variantId: rest[1] };
  }

  return null;
}

function allowedMethodFor(kind: AdminCommercialRouteKind): "GET" | "POST" {
  switch (kind) {
    case "inspection":
    case "inspection_outlet":
    case "activity":
      return "GET";
    case "diagnosis":
    case "verification":
      return "POST";
  }
}

/**
 * Diagnosis/verification POST bodies are read-only composition inputs.
 * They must not mutate commercial state.
 */
function isReadOnlyPost(kind: AdminCommercialRouteKind): boolean {
  return kind === "diagnosis" || kind === "verification";
}

export async function handleAdminCommercialRoute(
  req: IncomingMessage,
  route: AdminCommercialRoute,
  deps: Readonly<{ runtime: WorkforceAuthRuntime; persistence: Persistence }>,
  requestId: string,
): Promise<{ status: number; body: Record<string, unknown>; operation: string; code: string }> {
  const method = (req.method ?? "GET").toUpperCase();
  const operation = `commercial_${route.kind}`;
  const allowed = allowedMethodFor(route.kind);
  if (method !== allowed) {
    return {
      status: 405,
      operation,
      code: "METHOD_NOT_ALLOWED",
      body: { ok: false, code: "COMMERCIAL_REQUEST_INVALID", requestId },
    };
  }

  try {
    const principal = await resolveOperationsWorkforcePrincipal(deps.runtime, req.headers);
    if (!principal) {
      return {
        status: 401,
        operation,
        code: "WORKFORCE_AUTH_REQUIRED",
        body: { ok: false, code: "WORKFORCE_AUTH_REQUIRED", requestId },
      };
    }

    if (isReadOnlyPost(route.kind)) {
      const body = await readOperationsJsonObjectBody(req);
      if (!body.ok) {
        return {
          status: 400,
          operation,
          code: "COMMERCIAL_REQUEST_INVALID",
          body: { ok: false, code: "COMMERCIAL_REQUEST_INVALID", requestId },
        };
      }
      rejectForgedBody(body.value);

      if (route.kind === "diagnosis") {
        const outletId = body.value.outletId;
        if (typeof outletId !== "string") {
          throw new AdministrationError("ADMIN_REQUEST_INVALID", "outletId is required.", {
            field: "outletId",
          });
        }
        const result = await diagnoseSellability(deps.persistence, {
          actor: principal,
          brandId: route.brandId,
          variantId: route.variantId!,
          outletId,
          customerLocation: optionalCoordinates(body.value, "customerLocation"),
        });
        return {
          status: 200,
          operation,
          code: "OK",
          body: { ok: true, ...(dateJson(result) as Record<string, unknown>) },
        };
      }

      const outletId = body.value.outletId;
      if (typeof outletId !== "string") {
        throw new AdministrationError("ADMIN_REQUEST_INVALID", "outletId is required.", {
          field: "outletId",
        });
      }
      // Validate supplied subtotal before destination context branching.
      const orderSubtotalPaise = optionalOrderSubtotalPaise(body.value);
      const result = await verifyCustomerCommercialTruth(deps.persistence, {
        actor: principal,
        brandId: route.brandId,
        variantId: route.variantId!,
        outletId,
        destinationCoordinates: optionalCoordinates(body.value, "destinationCoordinates"),
        orderSubtotalPaise,
      });
      return {
        status: 200,
        operation,
        code: "OK",
        body: { ok: true, ...(dateJson(result) as Record<string, unknown>) },
      };
    }

    const result = await deps.persistence.withContext(async (ctx) => {
      if (route.kind === "activity") {
        return composeCommercialActivity(ctx, {
          actor: principal,
          brandId: route.brandId,
        });
      }
      if (route.kind === "inspection_outlet") {
        return inspectCommercialOffering(ctx, {
          actor: principal,
          brandId: route.brandId,
          variantId: route.variantId!,
          outletId: route.outletId!,
        });
      }
      return inspectCommercialOffering(ctx, {
        actor: principal,
        brandId: route.brandId,
        variantId: route.variantId!,
      });
    });

    return {
      status: 200,
      operation,
      code: "OK",
      body: { ok: true, ...(dateJson(result) as Record<string, unknown>) },
    };
  } catch (error) {
    const mapped = mapCommercialAdminError(error, requestId);
    return {
      status: mapped.status,
      operation,
      code: mapped.body.code,
      body: mapped.body,
    };
  }
}
