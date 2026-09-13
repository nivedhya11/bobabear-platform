/**
 * Pricing commercial authoring Admin HTTP routes (IMP-036F F4).
 *
 * Thin transport: trusted workforce session → Brand-scoped Pricing domain.
 * Path brandId is a locator only. Material draft mutations and activate
 * consume expectedPriceBookRevision. Money is integer paise only.
 */
import "server-only";

import type { IncomingMessage } from "node:http";

import type { WorkforcePrincipal } from "../../access-control";
import type { WorkforceAuthRuntime } from "../../auth/workforce";
import type { Persistence } from "../../persistence";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../../persistence/types";
import {
  PricingValidationError,
  activatePriceBook,
  attachDraftModifierPrice,
  attachDraftVariantPrice,
  createDraftPriceBook,
  inspectBrandPriceBook,
  listBrandPriceBooks,
  previewPriceBookConsequence,
  requirePricingManage,
  requirePricingRead,
} from "../../pricing";
import {
  PRICE_BOOK_SCOPE_TYPES,
  TAX_INCLUSION_MODES,
  type PriceBookScopeType,
  type TaxInclusionMode,
} from "../../../shared/pricing";
import { resolveOperationsWorkforcePrincipal } from "./auth";
import { readOperationsJsonObjectBody } from "./body";
import { mapPricingAdminError } from "./admin-pricing-error-map";

export type AdminPricingRouteKind =
  | "list_price_books"
  | "create_price_book"
  | "get_price_book"
  | "attach_variant_price"
  | "attach_modifier_price"
  | "consequence_preview"
  | "activate";

export type AdminPricingRoute = Readonly<{
  kind: AdminPricingRouteKind;
  brandId: string;
  priceBookId?: string;
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

const PG_BIGINT_MAX = BigInt("9223372036854775807");

function rejectForgedBody(body: Readonly<Record<string, unknown>>): void {
  for (const key of Object.keys(body)) {
    if (FORBIDDEN_BODY_KEYS.has(key)) {
      throw new PricingValidationError({
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
    throw new PricingValidationError({ message: `${field} must be a non-empty string.` });
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
    throw new PricingValidationError({ message: `${field} must be a string or null.` });
  }
  return value;
}

function optionalBoolean(
  body: Readonly<Record<string, unknown>>,
  field: string,
): boolean | undefined {
  if (!(field in body)) return undefined;
  const value = body[field];
  if (typeof value !== "boolean") {
    throw new PricingValidationError({ message: `${field} must be a boolean.` });
  }
  return value;
}

function requireExpectedPriceBookRevision(body: Readonly<Record<string, unknown>>): string {
  const value = body.expectedPriceBookRevision;
  if (typeof value === "string" && /^\d+$/.test(value) && value !== "0" && !/^0\d+/.test(value)) {
    return value;
  }
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
    return String(value);
  }
  throw new PricingValidationError({
    message:
      "expectedPriceBookRevision must be a non-empty positive decimal string or safe positive integer.",
  });
}

function requirePaise(body: Readonly<Record<string, unknown>>, field: string): bigint {
  const value = body[field];
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Number.isNaN(value)) {
      throw new PricingValidationError({ message: `${field} must be a finite integer paise amount.` });
    }
    if (!Number.isSafeInteger(value)) {
      throw new PricingValidationError({ message: `${field} must be a safe integer paise amount.` });
    }
    if (value < 0) {
      throw new PricingValidationError({ message: `${field} must be >= 0.` });
    }
    return BigInt(value);
  }
  if (typeof value === "string") {
    if (!/^(0|[1-9]\d*)$/.test(value)) {
      throw new PricingValidationError({
        message: `${field} must be a non-negative integer paise decimal string.`,
      });
    }
    const parsed = BigInt(value);
    if (parsed > PG_BIGINT_MAX) {
      throw new PricingValidationError({ message: `${field} exceeds integer paise range.` });
    }
    return parsed;
  }
  throw new PricingValidationError({
    message: `${field} must be an integer paise amount (string or safe integer). Floating money is not accepted.`,
  });
}

function optionalPaise(
  body: Readonly<Record<string, unknown>>,
  field: string,
): bigint | null | undefined {
  if (!(field in body)) return undefined;
  if (body[field] === null) return null;
  return requirePaise(body, field);
}

function requireIsoDate(body: Readonly<Record<string, unknown>>, field: string): Date {
  const value = requireString(body, field);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new PricingValidationError({ message: `${field} must be an ISO-8601 timestamp.` });
  }
  return date;
}

function optionalIsoDate(
  body: Readonly<Record<string, unknown>>,
  field: string,
): Date | null | undefined {
  if (!(field in body)) return undefined;
  if (body[field] === null) return null;
  return requireIsoDate(body, field);
}

export function classifyAdminPricingRoute(pathname: string): AdminPricingRoute | null {
  const segments = pathname.split("/").filter(Boolean);
  if (
    segments.length < 6 ||
    segments[0] !== "api" ||
    segments[1] !== "admin" ||
    segments[2] !== "v1" ||
    segments[3] !== "brands" ||
    !segments[4] ||
    segments[5] !== "pricing"
  ) {
    return null;
  }
  const brandId = segments[4];
  const rest = segments.slice(6);
  if (rest.length === 1 && rest[0] === "price-books") {
    return { kind: "list_price_books", brandId };
  }
  if (rest.length === 2 && rest[0] === "price-books" && rest[1]) {
    return { kind: "get_price_book", brandId, priceBookId: rest[1] };
  }
  if (rest.length === 3 && rest[0] === "price-books" && rest[1] && rest[2] === "variant-prices") {
    return { kind: "attach_variant_price", brandId, priceBookId: rest[1] };
  }
  if (rest.length === 3 && rest[0] === "price-books" && rest[1] && rest[2] === "modifier-prices") {
    return { kind: "attach_modifier_price", brandId, priceBookId: rest[1] };
  }
  if (rest.length === 3 && rest[0] === "price-books" && rest[1] && rest[2] === "consequence-preview") {
    return { kind: "consequence_preview", brandId, priceBookId: rest[1] };
  }
  if (rest.length === 3 && rest[0] === "price-books" && rest[1] && rest[2] === "activate") {
    return { kind: "activate", brandId, priceBookId: rest[1] };
  }
  return null;
}

function resolveRouteForMethod(route: AdminPricingRoute, method: string): AdminPricingRoute {
  if (method === "POST" && route.kind === "list_price_books") {
    return { kind: "create_price_book", brandId: route.brandId };
  }
  return route;
}

function allowedMethodFor(kind: AdminPricingRouteKind): "GET" | "POST" {
  switch (kind) {
    case "list_price_books":
    case "get_price_book":
      return "GET";
    default:
      return "POST";
  }
}

function isMutationKind(kind: AdminPricingRouteKind): boolean {
  return allowedMethodFor(kind) === "POST";
}

async function dispatchRead(
  context: PersistenceQueryContext,
  principal: WorkforcePrincipal,
  route: AdminPricingRoute,
): Promise<Record<string, unknown>> {
  await requirePricingRead(context, principal, route.brandId);
  switch (route.kind) {
    case "list_price_books": {
      const result = await listBrandPriceBooks(context, {
        actor: principal,
        brandId: route.brandId,
      });
      return { priceBooks: result.priceBooks };
    }
    case "get_price_book": {
      const inspection = await inspectBrandPriceBook(context, {
        actor: principal,
        brandId: route.brandId,
        priceBookId: route.priceBookId!,
      });
      return { inspection };
    }
    default:
      throw new PricingValidationError({ message: "Unsupported pricing read route." });
  }
}

async function dispatchMutation(
  context: PersistenceTransactionContext,
  principal: WorkforcePrincipal,
  route: AdminPricingRoute,
  body: Readonly<Record<string, unknown>>,
): Promise<Record<string, unknown>> {
  await requirePricingManage(context, principal, route.brandId);

  if ("currency" in body && body.currency !== "INR") {
    throw new PricingValidationError({ message: "currency must be INR." });
  }

  switch (route.kind) {
    case "create_price_book": {
      const scopeType = requireString(body, "scopeType");
      if (!(PRICE_BOOK_SCOPE_TYPES as readonly string[]).includes(scopeType)) {
        throw new PricingValidationError({ message: "Invalid price book scopeType." });
      }
      let taxInclusionMode: TaxInclusionMode | undefined;
      if ("taxInclusionMode" in body) {
        const raw = requireString(body, "taxInclusionMode");
        if (!(TAX_INCLUSION_MODES as readonly string[]).includes(raw)) {
          throw new PricingValidationError({ message: "Invalid taxInclusionMode." });
        }
        taxInclusionMode = raw as TaxInclusionMode;
      }
      const created = await createDraftPriceBook(context, {
        actor: principal,
        brandId: route.brandId,
        scopeType: scopeType as PriceBookScopeType,
        territoryId: optionalString(body, "territoryId") ?? null,
        organizationId: optionalString(body, "organizationId") ?? null,
        outletId: optionalString(body, "outletId") ?? null,
        code: requireString(body, "code"),
        name: requireString(body, "name"),
        taxInclusionMode,
        effectiveFrom: requireIsoDate(body, "effectiveFrom"),
        effectiveTo: optionalIsoDate(body, "effectiveTo") ?? null,
      });
      return { priceBook: { id: created.id, revision: created.revision.toString(10) } };
    }

    case "attach_variant_price": {
      const attached = await attachDraftVariantPrice(context, {
        actor: principal,
        brandId: route.brandId,
        priceBookId: route.priceBookId!,
        expectedPriceBookRevision: requireExpectedPriceBookRevision(body),
        variantId: requireString(body, "variantId"),
        amountPaise: requirePaise(body, "amountPaise"),
        taxCategoryId: requireString(body, "taxCategoryId"),
        allowTerritoryOverride: optionalBoolean(body, "allowTerritoryOverride"),
        allowOrganizationOverride: optionalBoolean(body, "allowOrganizationOverride"),
        allowOutletOverride: optionalBoolean(body, "allowOutletOverride"),
        floorPaise: optionalPaise(body, "floorPaise"),
        ceilingPaise: optionalPaise(body, "ceilingPaise"),
      });
      return {
        variantPrice: { id: attached.id },
        priceBookRevision: attached.priceBookRevision.toString(10),
      };
    }

    case "attach_modifier_price": {
      const attached = await attachDraftModifierPrice(context, {
        actor: principal,
        brandId: route.brandId,
        priceBookId: route.priceBookId!,
        expectedPriceBookRevision: requireExpectedPriceBookRevision(body),
        variantModifierGroupId: requireString(body, "variantModifierGroupId"),
        modifierGroupOptionId: requireString(body, "modifierGroupOptionId"),
        priceDeltaPaise: requirePaise(body, "priceDeltaPaise"),
        allowTerritoryOverride: optionalBoolean(body, "allowTerritoryOverride"),
        allowOrganizationOverride: optionalBoolean(body, "allowOrganizationOverride"),
        allowOutletOverride: optionalBoolean(body, "allowOutletOverride"),
      });
      return {
        modifierPrice: { id: attached.id },
        priceBookRevision: attached.priceBookRevision.toString(10),
      };
    }

    case "consequence_preview": {
      const preview = await previewPriceBookConsequence(context, {
        actor: principal,
        brandId: route.brandId,
        priceBookId: route.priceBookId!,
      });
      return { preview };
    }

    case "activate": {
      const result = await activatePriceBook(context, {
        actor: principal,
        brandId: route.brandId,
        priceBookId: route.priceBookId!,
        expectedPriceBookRevision: requireExpectedPriceBookRevision(body),
      });
      return { revision: result.revision.toString(10) };
    }

    default:
      throw new PricingValidationError({ message: "Unsupported pricing mutation route." });
  }
}

export async function handleAdminPricingRoute(
  req: IncomingMessage,
  route: AdminPricingRoute,
  deps: Readonly<{ runtime: WorkforceAuthRuntime; persistence: Persistence }>,
  requestId: string,
): Promise<{ status: number; body: Record<string, unknown>; operation: string; code: string }> {
  const method = (req.method ?? "GET").toUpperCase();
  const effective = resolveRouteForMethod(route, method);
  const operation = effective.kind;
  const allowed = allowedMethodFor(effective.kind);
  if (method !== allowed) {
    return {
      status: 405,
      operation,
      code: "METHOD_NOT_ALLOWED",
      body: { ok: false, code: "PRICING_REQUEST_INVALID", requestId },
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

    if (isMutationKind(effective.kind)) {
      const body = await readOperationsJsonObjectBody(req);
      if (!body.ok) {
        return {
          status: 400,
          operation,
          code: "PRICING_REQUEST_INVALID",
          body: { ok: false, code: "PRICING_REQUEST_INVALID", requestId },
        };
      }
      rejectForgedBody(body.value);
      const result = await deps.persistence.transaction((tx) =>
        dispatchMutation(tx, principal, effective, body.value),
      );
      return {
        status: 200,
        operation,
        code: "OK",
        body: { ok: true, ...(dateJson(result) as Record<string, unknown>) },
      };
    }

    const result = await deps.persistence.withContext((ctx) =>
      dispatchRead(ctx, principal, effective),
    );
    return {
      status: 200,
      operation,
      code: "OK",
      body: { ok: true, ...(dateJson(result) as Record<string, unknown>) },
    };
  } catch (error) {
    const mapped = mapPricingAdminError(error, requestId);
    return {
      status: mapped.status,
      operation,
      code: mapped.body.code,
      body: mapped.body as Record<string, unknown>,
    };
  }
}
