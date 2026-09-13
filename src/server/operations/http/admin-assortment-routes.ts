/**
 * Assortment commercial authoring Admin HTTP routes (IMP-036F F4).
 *
 * Thin transport: trusted workforce session → Brand-scoped Assortment domain.
 * Path brandId is a locator only; authorization is server-side via
 * assortment.read / assortment.manage. Material mutations consume
 * expectedRuleRevision (null = reviewed absence).
 */
import "server-only";

import type { IncomingMessage } from "node:http";

import type { WorkforcePrincipal } from "../../access-control";
import type { WorkforceAuthRuntime } from "../../auth/workforce";
import {
  AssortmentValidationError,
  excludeModifierOptionAtScope,
  excludeProductAtScope,
  excludeVariantAtScope,
  includeBrandVariant,
  inspectBrandVariantAssortment,
  listBrandAssortmentRules,
  previewAssortmentConsequence,
  requireAssortmentManage,
  requireAssortmentRead,
  retireAssortmentRule,
} from "../../assortment";
import { isAssortmentScopeType } from "../../../shared/assortment";
import type { Persistence } from "../../persistence";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../../persistence/types";
import { resolveOperationsWorkforcePrincipal } from "./auth";
import { readOperationsJsonObjectBody } from "./body";
import { mapAssortmentAdminError } from "./admin-assortment-error-map";

export type AdminAssortmentRouteKind =
  | "list_rules"
  | "inspect_variant"
  | "consequence_preview"
  | "include_variant"
  | "exclude"
  | "retire_rule";

export type AdminAssortmentRoute = Readonly<{
  kind: AdminAssortmentRouteKind;
  brandId: string;
  variantId?: string;
  ruleId?: string;
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
      throw new AssortmentValidationError({
        message: "Caller-supplied authority fields are not accepted.",
      });
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

function requireString(body: Readonly<Record<string, unknown>>, field: string): string {
  const value = body[field];
  if (typeof value !== "string" || value.length === 0) {
    throw new AssortmentValidationError({ message: `${field} must be a non-empty string.` });
  }
  return value;
}

function optionalString(
  body: Readonly<Record<string, unknown>>,
  field: string,
): string | null | undefined {
  if (!(field in body)) return undefined;
  const value = body[field];
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new AssortmentValidationError({ message: `${field} must be a string or null.` });
  }
  return value;
}

function requireExpectedRuleRevision(
  body: Readonly<Record<string, unknown>>,
): string | null {
  if (!("expectedRuleRevision" in body)) {
    throw new AssortmentValidationError({
      message: "expectedRuleRevision is required (null for reviewed absence, or a positive decimal string).",
    });
  }
  const value = body.expectedRuleRevision;
  if (value === null) return null;
  if (typeof value === "string" && /^\d+$/.test(value) && value !== "0" && !/^0\d+/.test(value)) {
    return value;
  }
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
    return String(value);
  }
  throw new AssortmentValidationError({
    message:
      "expectedRuleRevision must be null (reviewed absence) or a non-empty positive decimal string.",
  });
}

export function classifyAdminAssortmentRoute(pathname: string): AdminAssortmentRoute | null {
  const segments = pathname.split("/").filter(Boolean);
  if (
    segments.length < 6 ||
    segments[0] !== "api" ||
    segments[1] !== "admin" ||
    segments[2] !== "v1" ||
    segments[3] !== "brands" ||
    !segments[4] ||
    segments[5] !== "assortment"
  ) {
    return null;
  }

  const brandId = segments[4];
  const rest = segments.slice(6);
  if (rest.length === 1 && rest[0] === "rules") {
    return { kind: "list_rules", brandId };
  }
  if (rest.length === 2 && rest[0] === "variants" && rest[1]) {
    return { kind: "inspect_variant", brandId, variantId: rest[1] };
  }
  if (rest.length === 1 && rest[0] === "consequence-preview") {
    return { kind: "consequence_preview", brandId };
  }
  if (rest.length === 1 && rest[0] === "include-variant") {
    return { kind: "include_variant", brandId };
  }
  if (rest.length === 1 && rest[0] === "exclude") {
    return { kind: "exclude", brandId };
  }
  if (rest.length === 3 && rest[0] === "rules" && rest[1] && rest[2] === "retire") {
    return { kind: "retire_rule", brandId, ruleId: rest[1] };
  }
  return null;
}

function allowedMethodFor(kind: AdminAssortmentRouteKind): "GET" | "POST" {
  switch (kind) {
    case "list_rules":
    case "inspect_variant":
      return "GET";
    default:
      return "POST";
  }
}

function isMutationKind(kind: AdminAssortmentRouteKind): boolean {
  return allowedMethodFor(kind) === "POST";
}

async function dispatchRead(
  context: PersistenceQueryContext,
  principal: WorkforcePrincipal,
  route: AdminAssortmentRoute,
): Promise<Record<string, unknown>> {
  await requireAssortmentRead(context, principal, route.brandId);
  switch (route.kind) {
    case "list_rules": {
      const result = await listBrandAssortmentRules(context, {
        actor: principal,
        brandId: route.brandId,
      });
      return { rules: result.rules };
    }
    case "inspect_variant": {
      const inspection = await inspectBrandVariantAssortment(context, {
        actor: principal,
        brandId: route.brandId,
        variantId: route.variantId!,
      });
      return { inspection };
    }
    default:
      throw new AssortmentValidationError({ message: "Unsupported assortment read route." });
  }
}

async function dispatchMutation(
  context: PersistenceTransactionContext,
  principal: WorkforcePrincipal,
  route: AdminAssortmentRoute,
  body: Readonly<Record<string, unknown>>,
): Promise<Record<string, unknown>> {
  await requireAssortmentManage(context, principal, route.brandId);

  switch (route.kind) {
    case "consequence_preview": {
      const mutationType = requireString(body, "mutationType");
      if (
        mutationType !== "include_variant" &&
        mutationType !== "exclude" &&
        mutationType !== "retire_rule"
      ) {
        throw new AssortmentValidationError({
          message: "mutationType must be include_variant, exclude, or retire_rule.",
        });
      }
      const scopeRaw = optionalString(body, "scopeType");
      if (scopeRaw && !isAssortmentScopeType(scopeRaw)) {
        throw new AssortmentValidationError({ message: "Invalid assortment scopeType." });
      }
      const preview = await previewAssortmentConsequence(context, {
        actor: principal,
        brandId: route.brandId,
        mutationType,
        variantId: optionalString(body, "variantId") ?? null,
        productId: optionalString(body, "productId") ?? null,
        modifierOptionId: optionalString(body, "modifierOptionId") ?? null,
        scopeType: scopeRaw && isAssortmentScopeType(scopeRaw) ? scopeRaw : null,
        territoryId: optionalString(body, "territoryId") ?? null,
        organizationId: optionalString(body, "organizationId") ?? null,
        outletId: optionalString(body, "outletId") ?? null,
        ruleId: optionalString(body, "ruleId") ?? route.ruleId ?? null,
      });
      return { preview };
    }

    case "include_variant": {
      const rule = await includeBrandVariant(context, {
        actor: principal,
        brandId: route.brandId,
        variantId: requireString(body, "variantId"),
        expectedRuleRevision: requireExpectedRuleRevision(body),
        reasonCode: optionalString(body, "reasonCode") ?? null,
      });
      return { rule };
    }

    case "exclude": {
      const scopeType = requireString(body, "scopeType");
      if (!isAssortmentScopeType(scopeType)) {
        throw new AssortmentValidationError({ message: "Invalid assortment scopeType." });
      }
      const expectedRuleRevision = requireExpectedRuleRevision(body);
      const reasonCode = optionalString(body, "reasonCode") ?? null;
      const base = {
        actor: principal,
        brandId: route.brandId,
        scopeType,
        expectedRuleRevision,
        territoryId: optionalString(body, "territoryId") ?? null,
        organizationId: optionalString(body, "organizationId") ?? null,
        outletId: optionalString(body, "outletId") ?? null,
        reasonCode,
      };
      if (body.variantId) {
        const rule = await excludeVariantAtScope(context, {
          ...base,
          variantId: requireString(body, "variantId"),
        });
        return { rule };
      }
      if (body.productId) {
        const rule = await excludeProductAtScope(context, {
          ...base,
          productId: requireString(body, "productId"),
        });
        return { rule };
      }
      if (body.modifierOptionId) {
        const rule = await excludeModifierOptionAtScope(context, {
          ...base,
          modifierOptionId: requireString(body, "modifierOptionId"),
        });
        return { rule };
      }
      throw new AssortmentValidationError({
        message: "exclude requires productId, variantId, or modifierOptionId.",
      });
    }

    case "retire_rule": {
      const rule = await retireAssortmentRule(context, {
        actor: principal,
        brandId: route.brandId,
        ruleId: route.ruleId!,
        expectedRuleRevision: requireExpectedRuleRevision(body),
      });
      return { rule };
    }

    default:
      throw new AssortmentValidationError({ message: "Unsupported assortment mutation route." });
  }
}

export async function handleAdminAssortmentRoute(
  req: IncomingMessage,
  route: AdminAssortmentRoute,
  deps: Readonly<{ runtime: WorkforceAuthRuntime; persistence: Persistence }>,
  requestId: string,
): Promise<{ status: number; body: Record<string, unknown>; operation: string; code: string }> {
  const method = (req.method ?? "GET").toUpperCase();
  const operation = route.kind;
  const allowed = allowedMethodFor(route.kind);
  if (method !== allowed) {
    return {
      status: 405,
      operation,
      code: "METHOD_NOT_ALLOWED",
      body: { ok: false, code: "ASSORTMENT_REQUEST_INVALID", requestId },
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

    if (isMutationKind(route.kind)) {
      const body = await readOperationsJsonObjectBody(req);
      if (!body.ok) {
        return {
          status: 400,
          operation,
          code: "ASSORTMENT_REQUEST_INVALID",
          body: { ok: false, code: "ASSORTMENT_REQUEST_INVALID", requestId },
        };
      }
      rejectForgedBody(body.value);
      const result = await deps.persistence.transaction((tx) =>
        dispatchMutation(tx, principal, route, body.value),
      );
      return {
        status: 200,
        operation,
        code: "OK",
        body: { ok: true, ...(dateJson(result) as Record<string, unknown>) },
      };
    }

    const result = await deps.persistence.withContext((ctx) =>
      dispatchRead(ctx, principal, route),
    );
    return {
      status: 200,
      operation,
      code: "OK",
      body: { ok: true, ...(dateJson(result) as Record<string, unknown>) },
    };
  } catch (error) {
    const mapped = mapAssortmentAdminError(error, requestId);
    return {
      status: mapped.status,
      operation,
      code: mapped.body.code,
      body: mapped.body as Record<string, unknown>,
    };
  }
}
