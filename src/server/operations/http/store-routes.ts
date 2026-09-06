/**
 * Store Operations HTTP routes (IMP-036E).
 *
 * Thin transport: trusted workforce session → existing Assortment / Availability /
 * Operating / Serviceability / Access authority. Outlet path id is locator only.
 */
import "server-only";

import type { IncomingMessage } from "node:http";

import type { PermissionKey } from "../../../shared/access-control";
import { isAvailabilityState } from "../../../shared/assortment";
import { authorize, type WorkforcePrincipal } from "../../access-control";
import {
  configureOutletOperatingProfile,
  findOutletOperatingProfile,
  getModifierOptionAvailability,
  getVariantAvailability,
  listOutletOperatingIntervals,
  pauseOutlet,
  replaceOutletOperatingSchedule,
  requireOperatingScheduleRead,
  requireOperatingStateRead,
  resolveOutletOperatingState,
  resumeOutlet,
  setModifierOptionAvailability,
  setVariantAvailability,
  suspendOutlet,
  unsuspendOutlet,
} from "../../assortment";
import { AssortmentNotFoundError, AssortmentValidationError } from "../../assortment/errors";
import type { OperatingIntervalInput } from "../../assortment/types";
import type { WorkforceAuthRuntime } from "../../auth/workforce";
import { findOutletById } from "../../organization/outlets";
import type { Persistence } from "../../persistence";
import {
  getOutletServiceabilityConfiguration,
  setOutletServiceabilityDistancePolicy,
} from "../../serviceability";
import { resolveOperationsWorkforcePrincipal } from "./auth";
import { readOperationsJsonObjectBody } from "./body";
import { mapStoreOperationsError } from "./store-error-map";
import {
  listStoreAssortmentProjection,
  listStoreAvailabilityProjection,
} from "./store-projections";

export type StoreRouteKind =
  | "capabilities"
  | "assortment"
  | "availability_list"
  | "availability_variant_get"
  | "availability_variant_set"
  | "availability_modifier_get"
  | "availability_modifier_set"
  | "operating_state_get"
  | "operating_state_pause"
  | "operating_state_resume"
  | "operating_state_suspend"
  | "operating_state_unsuspend"
  | "operating_profile_get"
  | "operating_profile_set"
  | "operating_schedule_get"
  | "operating_schedule_set"
  | "serviceability_get"
  | "serviceability_distance_policy";

export type StoreRoute = Readonly<{
  kind: StoreRouteKind;
  outletId: string;
  variantId?: string;
  modifierOptionId?: string;
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
  "workforceUserIdAuthority",
  "brandId",
  "organizationId",
  "territoryId",
  "outletId",
]);

const OUTLET_CAPABILITY_KEYS = [
  "outlet.read",
  "availability.read",
  "availability.manage",
  "outlet.operating_state.read",
  "outlet.operating_state.pause",
  "outlet.operating_state.suspend",
  "outlet.operating_schedule.read",
  "outlet.operating_schedule.manage",
  "serviceability.read",
  "serviceability.manage",
  "access.membership.read",
  "access.membership.manage",
  "access.role_assignment.read",
  "access.role_assignment.grant",
  "access.role_assignment.revoke",
  "access.audit.read",
] as const satisfies readonly PermissionKey[];

const BRAND_CAPABILITY_KEYS = [
  "assortment.read",
  "assortment.manage",
] as const satisfies readonly PermissionKey[];

function rejectForgedStoreBody(body: Readonly<Record<string, unknown>>): void {
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

function parseOptionalDate(value: unknown, field: string): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string" && !(value instanceof Date)) {
    throw new AssortmentValidationError({
      message: `${field} must be an ISO date string or null.`,
    });
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AssortmentValidationError({ message: `${field} must be a valid date.` });
  }
  return date;
}

function parseIntervals(raw: unknown): readonly OperatingIntervalInput[] {
  if (!Array.isArray(raw)) {
    throw new AssortmentValidationError({ message: "intervals must be an array." });
  }
  return raw.map((item, index) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new AssortmentValidationError({ message: `intervals[${index}] must be an object.` });
    }
    const row = item as Record<string, unknown>;
    const dayOfWeek = row.dayOfWeek;
    const startMinute = row.startMinute;
    const endMinute = row.endMinute;
    if (
      typeof dayOfWeek !== "number" ||
      !Number.isInteger(dayOfWeek) ||
      dayOfWeek < 0 ||
      dayOfWeek > 6
    ) {
      throw new AssortmentValidationError({
        message: `intervals[${index}].dayOfWeek is invalid.`,
      });
    }
    if (typeof startMinute !== "number" || !Number.isInteger(startMinute)) {
      throw new AssortmentValidationError({
        message: `intervals[${index}].startMinute is invalid.`,
      });
    }
    if (typeof endMinute !== "number" || !Number.isInteger(endMinute)) {
      throw new AssortmentValidationError({
        message: `intervals[${index}].endMinute is invalid.`,
      });
    }
    return {
      dayOfWeek: dayOfWeek as OperatingIntervalInput["dayOfWeek"],
      startMinute,
      endMinute,
    };
  });
}

function projectServiceability(
  config: Awaited<ReturnType<typeof getOutletServiceabilityConfiguration>>,
): Record<string, unknown> {
  return {
    serviceOriginLatitude: config.serviceOriginLatitude,
    serviceOriginLongitude: config.serviceOriginLongitude,
    maxServiceDistanceMeters: config.maxServiceDistanceMeters,
    revision: config.revision === null ? null : config.revision.toString(10),
    configured:
      config.serviceOriginLatitude !== null &&
      config.serviceOriginLongitude !== null &&
      config.maxServiceDistanceMeters !== null,
    routingPriorityConfigured: config.routingPriority !== null,
  };
}

export function classifyStoreRoute(pathname: string): StoreRoute | null {
  const segments = pathname.split("/");
  if (segments.slice(1, 5).join("/") !== "api/operations/v1/outlets" || !segments[5]) {
    return null;
  }
  const outletId = segments[5];
  const rest = segments.slice(6);

  if (rest.length === 1 && rest[0] === "capabilities") {
    return { kind: "capabilities", outletId };
  }
  if (rest.length === 1 && rest[0] === "assortment") {
    return { kind: "assortment", outletId };
  }
  if (rest.length === 1 && rest[0] === "availability") {
    return { kind: "availability_list", outletId };
  }
  if (rest.length === 3 && rest[0] === "availability" && rest[1] === "variants" && rest[2]) {
    return { kind: "availability_variant_get", outletId, variantId: rest[2] };
  }
  if (
    rest.length === 3 &&
    rest[0] === "availability" &&
    rest[1] === "modifier-options" &&
    rest[2]
  ) {
    return { kind: "availability_modifier_get", outletId, modifierOptionId: rest[2] };
  }
  if (rest.length === 1 && rest[0] === "operating-state") {
    return { kind: "operating_state_get", outletId };
  }
  if (rest.length === 2 && rest[0] === "operating-state") {
    const action = rest[1];
    if (action === "pause") return { kind: "operating_state_pause", outletId };
    if (action === "resume") return { kind: "operating_state_resume", outletId };
    if (action === "suspend") return { kind: "operating_state_suspend", outletId };
    if (action === "unsuspend") return { kind: "operating_state_unsuspend", outletId };
    return null;
  }
  if (rest.length === 1 && rest[0] === "operating-profile") {
    return { kind: "operating_profile_get", outletId };
  }
  if (rest.length === 1 && rest[0] === "operating-schedule") {
    return { kind: "operating_schedule_get", outletId };
  }
  if (rest.length === 1 && rest[0] === "serviceability") {
    return { kind: "serviceability_get", outletId };
  }
  if (rest.length === 2 && rest[0] === "serviceability" && rest[1] === "distance-policy") {
    return { kind: "serviceability_distance_policy", outletId };
  }
  return null;
}

/** Dual-method paths are classified as GET kinds; POST upgrades to set kinds. */
function resolveRouteForMethod(route: StoreRoute, method: string): StoreRoute {
  if (method === "POST") {
    if (route.kind === "availability_variant_get" && route.variantId) {
      return {
        kind: "availability_variant_set",
        outletId: route.outletId,
        variantId: route.variantId,
      };
    }
    if (route.kind === "availability_modifier_get" && route.modifierOptionId) {
      return {
        kind: "availability_modifier_set",
        outletId: route.outletId,
        modifierOptionId: route.modifierOptionId,
      };
    }
    if (route.kind === "operating_profile_get") {
      return { kind: "operating_profile_set", outletId: route.outletId };
    }
    if (route.kind === "operating_schedule_get") {
      return { kind: "operating_schedule_set", outletId: route.outletId };
    }
  }
  return route;
}

function allowedMethodFor(kind: StoreRouteKind): "GET" | "POST" {
  switch (kind) {
    case "availability_variant_set":
    case "availability_modifier_set":
    case "operating_state_pause":
    case "operating_state_resume":
    case "operating_state_suspend":
    case "operating_state_unsuspend":
    case "operating_profile_set":
    case "operating_schedule_set":
    case "serviceability_distance_policy":
      return "POST";
    default:
      return "GET";
  }
}

function isMutationKind(kind: StoreRouteKind): boolean {
  return allowedMethodFor(kind) === "POST";
}

export async function handleStoreRoute(
  req: IncomingMessage,
  route: StoreRoute,
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
      body: { ok: false, code: "STORE_REQUEST_INVALID", requestId },
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
          code: "STORE_REQUEST_INVALID",
          body: { ok: false, code: "STORE_REQUEST_INVALID", requestId },
        };
      }
      rejectForgedStoreBody(body.value);
      const result = await dispatchMutation(deps.persistence, principal, effective, body.value);
      return {
        status: 200,
        operation,
        code: "OK",
        body: { ok: true, ...(result as Record<string, unknown>) },
      };
    }

    const result = await dispatchRead(deps.persistence, principal, effective);
    return {
      status: 200,
      operation,
      code: "OK",
      body: { ok: true, ...(result as Record<string, unknown>) },
    };
  } catch (error) {
    const mapped = mapStoreOperationsError(error, requestId);
    return {
      status: mapped.status,
      operation,
      code: mapped.body.code,
      body: mapped.body as Record<string, unknown>,
    };
  }
}

async function dispatchRead(
  persistence: Persistence,
  principal: WorkforcePrincipal,
  route: StoreRoute,
): Promise<Record<string, unknown>> {
  switch (route.kind) {
    case "capabilities":
      return persistence.withContext(async (context) => {
        const outlet = await findOutletById(context, route.outletId);
        if (!outlet) throw new AssortmentNotFoundError("outlet");
        const outletResource = {
          type: "outlet" as const,
          brandId: outlet.brandId,
          organizationId: outlet.organizationId,
          territoryId: outlet.territoryId,
          outletId: outlet.id,
        };
        const brandResource = { type: "brand" as const, brandId: outlet.brandId };
        const capabilities: Record<string, boolean> = {};
        for (const permission of OUTLET_CAPABILITY_KEYS) {
          const decision = await authorize(context, {
            actor: principal,
            permission,
            resource: outletResource,
          });
          capabilities[permission] = decision.allowed;
        }
        for (const permission of BRAND_CAPABILITY_KEYS) {
          const decision = await authorize(context, {
            actor: principal,
            permission,
            resource: brandResource,
          });
          capabilities[permission] = decision.allowed;
        }
        return { capabilities };
      });

    case "assortment":
      return persistence.withContext(async (context) => {
        const projection = await listStoreAssortmentProjection(
          context,
          principal,
          route.outletId,
        );
        return dateJson(projection) as Record<string, unknown>;
      });

    case "availability_list":
      return persistence.withContext(async (context) => {
        const projection = await listStoreAvailabilityProjection(
          context,
          principal,
          route.outletId,
        );
        return dateJson(projection) as Record<string, unknown>;
      });

    case "availability_variant_get":
      return persistence.withContext(async (context) => {
        const record = await getVariantAvailability(context, {
          actor: principal,
          outletId: route.outletId,
          variantId: route.variantId!,
        });
        return { availability: dateJson(record) };
      });

    case "availability_modifier_get":
      return persistence.withContext(async (context) => {
        const record = await getModifierOptionAvailability(context, {
          actor: principal,
          outletId: route.outletId,
          modifierOptionId: route.modifierOptionId!,
        });
        return { availability: dateJson(record) };
      });

    case "operating_state_get":
      return persistence.withContext(async (context) => {
        await requireOperatingStateRead(context, principal, route.outletId);
        const profile = await findOutletOperatingProfile(context, route.outletId);
        const resolved = await resolveOutletOperatingState(context, {
          outletId: route.outletId,
          context: { now: new Date() },
        });
        return dateJson({
          controlState: resolved.controlState ?? profile?.controlState ?? null,
          effectiveState: resolved.effectiveState,
          timezone: resolved.timezone ?? profile?.timezone ?? null,
          pausedUntil: profile?.pausedUntil ?? null,
          code: resolved.code,
        }) as Record<string, unknown>;
      });

    case "operating_profile_get":
      return persistence.withContext(async (context) => {
        await requireOperatingScheduleRead(context, principal, route.outletId);
        const profile = await findOutletOperatingProfile(context, route.outletId);
        return { profile: dateJson(profile) };
      });

    case "operating_schedule_get":
      return persistence.withContext(async (context) => {
        await requireOperatingScheduleRead(context, principal, route.outletId);
        const intervals = await listOutletOperatingIntervals(context, route.outletId);
        return { intervals: dateJson(intervals) };
      });

    case "serviceability_get": {
      const config = await getOutletServiceabilityConfiguration(persistence, principal, {
        outletId: route.outletId,
      });
      return { serviceability: projectServiceability(config) };
    }

    default:
      throw new AssortmentValidationError({ message: "Unsupported store read route." });
  }
}

async function dispatchMutation(
  persistence: Persistence,
  principal: WorkforcePrincipal,
  route: StoreRoute,
  body: Readonly<Record<string, unknown>>,
): Promise<Record<string, unknown>> {
  switch (route.kind) {
    case "availability_variant_set": {
      if (typeof body.state !== "string" || !isAvailabilityState(body.state)) {
        throw new AssortmentValidationError({ message: "Invalid availability state." });
      }
      const state = body.state;
      const unavailableUntil = parseOptionalDate(body.unavailableUntil, "unavailableUntil");
      const record = await persistence.transaction(async (tx) =>
        setVariantAvailability(tx, {
          actor: principal,
          outletId: route.outletId,
          variantId: route.variantId!,
          state,
          ...(unavailableUntil !== undefined ? { unavailableUntil } : {}),
          ...(typeof body.reasonCode === "string" || body.reasonCode === null
            ? { reasonCode: body.reasonCode as string | null }
            : {}),
          ...(typeof body.note === "string" || body.note === null
            ? { note: body.note as string | null }
            : {}),
        }),
      );
      return { availability: dateJson(record) };
    }

    case "availability_modifier_set": {
      if (typeof body.state !== "string" || !isAvailabilityState(body.state)) {
        throw new AssortmentValidationError({ message: "Invalid availability state." });
      }
      const state = body.state;
      const unavailableUntil = parseOptionalDate(body.unavailableUntil, "unavailableUntil");
      const record = await persistence.transaction(async (tx) =>
        setModifierOptionAvailability(tx, {
          actor: principal,
          outletId: route.outletId,
          modifierOptionId: route.modifierOptionId!,
          state,
          ...(unavailableUntil !== undefined ? { unavailableUntil } : {}),
          ...(typeof body.reasonCode === "string" || body.reasonCode === null
            ? { reasonCode: body.reasonCode as string | null }
            : {}),
          ...(typeof body.note === "string" || body.note === null
            ? { note: body.note as string | null }
            : {}),
        }),
      );
      return { availability: dateJson(record) };
    }

    case "operating_state_pause": {
      const pausedUntil = parseOptionalDate(body.pausedUntil, "pausedUntil");
      const profile = await persistence.transaction(async (tx) =>
        pauseOutlet(tx, {
          actor: principal,
          outletId: route.outletId,
          ...(pausedUntil !== undefined ? { pausedUntil } : {}),
          ...(typeof body.reasonCode === "string" || body.reasonCode === null
            ? { reasonCode: body.reasonCode as string | null }
            : {}),
          ...(typeof body.note === "string" || body.note === null
            ? { note: body.note as string | null }
            : {}),
        }),
      );
      return { profile: dateJson(profile) };
    }

    case "operating_state_resume": {
      const profile = await persistence.transaction(async (tx) =>
        resumeOutlet(tx, {
          actor: principal,
          outletId: route.outletId,
          ...(typeof body.reasonCode === "string" || body.reasonCode === null
            ? { reasonCode: body.reasonCode as string | null }
            : {}),
          ...(typeof body.note === "string" || body.note === null
            ? { note: body.note as string | null }
            : {}),
        }),
      );
      return { profile: dateJson(profile) };
    }

    case "operating_state_suspend": {
      const profile = await persistence.transaction(async (tx) =>
        suspendOutlet(tx, {
          actor: principal,
          outletId: route.outletId,
          ...(typeof body.reasonCode === "string" || body.reasonCode === null
            ? { reasonCode: body.reasonCode as string | null }
            : {}),
          ...(typeof body.note === "string" || body.note === null
            ? { note: body.note as string | null }
            : {}),
        }),
      );
      return { profile: dateJson(profile) };
    }

    case "operating_state_unsuspend": {
      const profile = await persistence.transaction(async (tx) =>
        unsuspendOutlet(tx, {
          actor: principal,
          outletId: route.outletId,
          ...(typeof body.reasonCode === "string" || body.reasonCode === null
            ? { reasonCode: body.reasonCode as string | null }
            : {}),
          ...(typeof body.note === "string" || body.note === null
            ? { note: body.note as string | null }
            : {}),
        }),
      );
      return { profile: dateJson(profile) };
    }

    case "operating_profile_set": {
      if (typeof body.timezone !== "string") {
        throw new AssortmentValidationError({ message: "timezone is required." });
      }
      const timezone = body.timezone;
      const profile = await persistence.transaction(async (tx) =>
        configureOutletOperatingProfile(tx, {
          actor: principal,
          outletId: route.outletId,
          timezone,
          ...(typeof body.reasonCode === "string" || body.reasonCode === null
            ? { reasonCode: body.reasonCode as string | null }
            : {}),
          ...(typeof body.note === "string" || body.note === null
            ? { note: body.note as string | null }
            : {}),
        }),
      );
      return { profile: dateJson(profile) };
    }

    case "operating_schedule_set": {
      const intervals = parseIntervals(body.intervals);
      const result = await persistence.transaction(async (tx) =>
        replaceOutletOperatingSchedule(tx, {
          actor: principal,
          outletId: route.outletId,
          intervals,
        }),
      );
      return { intervals: dateJson(result) };
    }

    case "serviceability_distance_policy": {
      // Path outletId is authoritative; body must not supply authority fields
      // (outletId already rejected by rejectForgedStoreBody).
      // JSON cannot carry bigint — coerce digit-string expectedRevision like
      // customer-commerce wire revisions before domain parse.
      const expectedRevisionRaw = body.expectedRevision;
      let expectedRevision: unknown = expectedRevisionRaw;
      if (typeof expectedRevisionRaw === "string" && /^\d+$/.test(expectedRevisionRaw)) {
        expectedRevision = BigInt(expectedRevisionRaw);
      } else if (
        typeof expectedRevisionRaw === "number" &&
        Number.isInteger(expectedRevisionRaw) &&
        expectedRevisionRaw > 0
      ) {
        expectedRevision = BigInt(expectedRevisionRaw);
      }
      const config = await setOutletServiceabilityDistancePolicy(persistence, principal, {
        ...body,
        expectedRevision,
        outletId: route.outletId,
      });
      return { serviceability: projectServiceability(config) };
    }

    default:
      throw new AssortmentValidationError({ message: "Unsupported store mutation route." });
  }
}
