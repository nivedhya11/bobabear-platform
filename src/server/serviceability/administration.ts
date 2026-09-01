/**
 * Administrative Serviceability configuration operations (IMP-019).
 *
 * Authenticate → lock Outlet → authorize → revision check → mutate/audit.
 */
import {
  parseAddPinsInput,
  parseGetConfigurationInput,
  parseRemovePinsInput,
  parseReplacePinsInput,
  parseSetDistancePolicyInput,
  parseSetRoutingPriorityInput,
  ServiceabilityError,
  type OutletServiceabilityConfiguration,
} from "../../shared/serviceability";
import type { Persistence } from "../persistence/types";
import { insertServiceabilityAuditEvent } from "./audit";
import { isUniqueViolation } from "./assert-role";
import {
  requireServiceabilityManage,
  requireServiceabilityRead,
  requireServiceabilityWorkforceActor,
} from "./authorize";
import {
  deleteServiceabilityPins,
  findServiceabilityConfig,
  insertServiceabilityConfig,
  insertServiceabilityPins,
  listServiceabilityPins,
  lockOutletForServiceabilityMutation,
  lockServiceabilityConfigForUpdate,
  updateServiceabilityConfig,
  type ServiceabilityConfigRow,
} from "./repository";

function mapConcurrentConflict(error: unknown): never {
  if (error instanceof ServiceabilityError) throw error;
  if (isUniqueViolation(error)) {
    throw new ServiceabilityError(
      "SERVICEABILITY_CONFIGURATION_CONFLICT",
      "Serviceability configuration revision conflict.",
    );
  }
  throw error;
}

async function withConflictMapping<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    mapConcurrentConflict(error);
  }
}

function assertExpectedRevision(
  actual: bigint | null,
  expected: bigint | null,
): void {
  if (actual === null && expected === null) return;
  if (actual === null || expected === null || actual !== expected) {
    throw new ServiceabilityError(
      "SERVICEABILITY_CONFIGURATION_CONFLICT",
      "Serviceability configuration revision conflict.",
    );
  }
}

function toConfiguration(
  outletId: string,
  config: ServiceabilityConfigRow | null,
  postalCodes: readonly string[],
): OutletServiceabilityConfiguration {
  if (!config) {
    return Object.freeze({
      outletId,
      routingPriority: null,
      postalCodes: Object.freeze([...postalCodes]),
      revision: null,
      serviceOriginLatitude: null,
      serviceOriginLongitude: null,
      maxServiceDistanceMeters: null,
    });
  }
  return Object.freeze({
    outletId,
    routingPriority: config.routingPriority,
    postalCodes: Object.freeze([...postalCodes]),
    revision: config.revision,
    serviceOriginLatitude: config.serviceOriginLatitude,
    serviceOriginLongitude: config.serviceOriginLongitude,
    maxServiceDistanceMeters: config.maxServiceDistanceMeters,
  });
}

function setDifference(
  left: ReadonlySet<string>,
  right: ReadonlySet<string>,
): string[] {
  const out: string[] = [];
  for (const value of left) {
    if (!right.has(value)) out.push(value);
  }
  return out.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

export async function getOutletServiceabilityConfiguration(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
): Promise<OutletServiceabilityConfiguration> {
  const principal = requireServiceabilityWorkforceActor(actor);
  const { outletId } = parseGetConfigurationInput(input);

  return persistence.withContext(async (ctx) => {
    await requireServiceabilityRead(ctx, principal, outletId);
    const config = await findServiceabilityConfig(ctx, outletId);
    const postalCodes = config
      ? await listServiceabilityPins(ctx, outletId)
      : Object.freeze([] as string[]);
    return toConfiguration(outletId, config, postalCodes);
  });
}

export async function setOutletServiceabilityRoutingPriority(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
): Promise<OutletServiceabilityConfiguration> {
  const principal = requireServiceabilityWorkforceActor(actor);
  const parsed = parseSetRoutingPriorityInput(input);

  return persistence.transaction(async (tx) => {
    await lockOutletForServiceabilityMutation(tx, parsed.outletId);
    await requireServiceabilityManage(tx, principal, parsed.outletId);

    const config = await lockServiceabilityConfigForUpdate(tx, parsed.outletId);
    assertExpectedRevision(config?.revision ?? null, parsed.expectedRevision);

    const now = new Date();
    const postalCodes = config
      ? await listServiceabilityPins(tx, parsed.outletId)
      : Object.freeze([] as string[]);

    if (!config) {
      return withConflictMapping(async () => {
        await insertServiceabilityConfig(tx, {
          outletId: parsed.outletId,
          routingPriority: parsed.routingPriority,
          revision: BigInt(1),
        });
        await insertServiceabilityAuditEvent(tx, {
          actorId: principal.workforceUserId,
          outletId: parsed.outletId,
          action: "serviceability_routing_priority_set",
          previousRevision: null,
          newRevision: BigInt(1),
          previousRoutingPriority: null,
          newRoutingPriority: parsed.routingPriority,
          addedPostalCodes: [],
          removedPostalCodes: [],
          occurredAt: now,
        });
        return toConfiguration(
          parsed.outletId,
          {
            outletId: parsed.outletId,
            routingPriority: parsed.routingPriority,
            revision: BigInt(1),
            serviceOriginLatitude: null,
            serviceOriginLongitude: null,
            maxServiceDistanceMeters: null,
          },
          postalCodes,
        );
      });
    }

    if (config.routingPriority === parsed.routingPriority) {
      // Canonical no-op: no revision, no audit.
      return toConfiguration(parsed.outletId, config, postalCodes);
    }

    const newRevision = config.revision + BigInt(1);
    return withConflictMapping(async () => {
      await updateServiceabilityConfig(tx, {
        outletId: parsed.outletId,
        routingPriority: parsed.routingPriority,
        revision: newRevision,
      });
      await insertServiceabilityAuditEvent(tx, {
        actorId: principal.workforceUserId,
        outletId: parsed.outletId,
        action: "serviceability_routing_priority_set",
        previousRevision: config.revision,
        newRevision,
        previousRoutingPriority: config.routingPriority,
        newRoutingPriority: parsed.routingPriority,
        addedPostalCodes: [],
        removedPostalCodes: [],
        occurredAt: now,
      });
      return toConfiguration(
        parsed.outletId,
        { ...config, routingPriority: parsed.routingPriority, revision: newRevision },
        postalCodes,
      );
    });
  });
}

export async function addOutletServiceabilityPins(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
): Promise<OutletServiceabilityConfiguration> {
  const principal = requireServiceabilityWorkforceActor(actor);
  const parsed = parseAddPinsInput(input);

  return persistence.transaction(async (tx) => {
    await lockOutletForServiceabilityMutation(tx, parsed.outletId);
    await requireServiceabilityManage(tx, principal, parsed.outletId);

    const config = await lockServiceabilityConfigForUpdate(tx, parsed.outletId);
    assertExpectedRevision(config?.revision ?? null, parsed.expectedRevision);

    if (!config) {
      if (parsed.postalCodes.length === 0) {
        return toConfiguration(parsed.outletId, null, []);
      }
      throw new ServiceabilityError(
        "SERVICEABILITY_ROUTING_PRIORITY_REQUIRED",
        "Routing priority must be configured before adding coverage PINs.",
      );
    }

    const existing = await listServiceabilityPins(tx, parsed.outletId);
    const existingSet = new Set(existing);
    const requestedSet = new Set(parsed.postalCodes);
    const added = setDifference(requestedSet, existingSet);

    if (added.length === 0) {
      return toConfiguration(parsed.outletId, config, existing);
    }

    const newRevision = config.revision + BigInt(1);
    return withConflictMapping(async () => {
      await insertServiceabilityPins(tx, parsed.outletId, added);
      await updateServiceabilityConfig(tx, {
        outletId: parsed.outletId,
        routingPriority: config.routingPriority,
        revision: newRevision,
      });
      await insertServiceabilityAuditEvent(tx, {
        actorId: principal.workforceUserId,
        outletId: parsed.outletId,
        action: "serviceability_pins_added",
        previousRevision: config.revision,
        newRevision,
        previousRoutingPriority: null,
        newRoutingPriority: null,
        addedPostalCodes: added,
        removedPostalCodes: [],
        occurredAt: new Date(),
      });

      const nextPins = Object.freeze(
        [...existingSet, ...added].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
      );
      return toConfiguration(
        parsed.outletId,
        { ...config, revision: newRevision },
        nextPins,
      );
    });
  });
}

export async function removeOutletServiceabilityPins(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
): Promise<OutletServiceabilityConfiguration> {
  const principal = requireServiceabilityWorkforceActor(actor);
  const parsed = parseRemovePinsInput(input);

  return persistence.transaction(async (tx) => {
    await lockOutletForServiceabilityMutation(tx, parsed.outletId);
    await requireServiceabilityManage(tx, principal, parsed.outletId);

    const config = await lockServiceabilityConfigForUpdate(tx, parsed.outletId);
    assertExpectedRevision(config?.revision ?? null, parsed.expectedRevision);

    if (!config) {
      // Matching expectedRevision null + remove with no config = true no-op.
      return toConfiguration(parsed.outletId, null, []);
    }

    const existing = await listServiceabilityPins(tx, parsed.outletId);
    const existingSet = new Set(existing);
    const requestedSet = new Set(parsed.postalCodes);
    const actualRemoved = [...requestedSet]
      .filter((p) => existingSet.has(p))
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

    if (actualRemoved.length === 0) {
      return toConfiguration(parsed.outletId, config, existing);
    }

    const newRevision = config.revision + BigInt(1);
    return withConflictMapping(async () => {
      await deleteServiceabilityPins(tx, parsed.outletId, actualRemoved);
      await updateServiceabilityConfig(tx, {
        outletId: parsed.outletId,
        routingPriority: config.routingPriority,
        revision: newRevision,
      });
      await insertServiceabilityAuditEvent(tx, {
        actorId: principal.workforceUserId,
        outletId: parsed.outletId,
        action: "serviceability_pins_removed",
        previousRevision: config.revision,
        newRevision,
        previousRoutingPriority: null,
        newRoutingPriority: null,
        addedPostalCodes: [],
        removedPostalCodes: actualRemoved,
        occurredAt: new Date(),
      });

      const nextPins = Object.freeze(
        existing.filter((p) => !requestedSet.has(p)),
      );
      return toConfiguration(
        parsed.outletId,
        { ...config, revision: newRevision },
        nextPins,
      );
    });
  });
}

export async function replaceOutletServiceabilityPins(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
): Promise<OutletServiceabilityConfiguration> {
  const principal = requireServiceabilityWorkforceActor(actor);
  const parsed = parseReplacePinsInput(input);

  return persistence.transaction(async (tx) => {
    await lockOutletForServiceabilityMutation(tx, parsed.outletId);
    await requireServiceabilityManage(tx, principal, parsed.outletId);

    const config = await lockServiceabilityConfigForUpdate(tx, parsed.outletId);
    assertExpectedRevision(config?.revision ?? null, parsed.expectedRevision);

    if (!config) {
      if (parsed.postalCodes.length === 0) {
        return toConfiguration(parsed.outletId, null, []);
      }
      throw new ServiceabilityError(
        "SERVICEABILITY_ROUTING_PRIORITY_REQUIRED",
        "Routing priority must be configured before replacing coverage PINs.",
      );
    }

    const existing = await listServiceabilityPins(tx, parsed.outletId);
    const existingSet = new Set(existing);
    const nextSet = new Set(parsed.postalCodes);
    const added = setDifference(nextSet, existingSet);
    const removed = setDifference(existingSet, nextSet);

    if (added.length === 0 && removed.length === 0) {
      return toConfiguration(parsed.outletId, config, existing);
    }

    const newRevision = config.revision + BigInt(1);
    return withConflictMapping(async () => {
      if (removed.length > 0) {
        await deleteServiceabilityPins(tx, parsed.outletId, removed);
      }
      if (added.length > 0) {
        await insertServiceabilityPins(tx, parsed.outletId, added);
      }

      await updateServiceabilityConfig(tx, {
        outletId: parsed.outletId,
        routingPriority: config.routingPriority,
        revision: newRevision,
      });
      await insertServiceabilityAuditEvent(tx, {
        actorId: principal.workforceUserId,
        outletId: parsed.outletId,
        action: "serviceability_pins_replaced",
        previousRevision: config.revision,
        newRevision,
        previousRoutingPriority: null,
        newRoutingPriority: null,
        addedPostalCodes: added,
        removedPostalCodes: removed,
        occurredAt: new Date(),
      });

      return toConfiguration(
        parsed.outletId,
        { ...config, revision: newRevision },
        parsed.postalCodes,
      );
    });
  });
}

export async function setOutletServiceabilityDistancePolicy(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
): Promise<OutletServiceabilityConfiguration> {
  const principal = requireServiceabilityWorkforceActor(actor);
  const parsed = parseSetDistancePolicyInput(input);

  return persistence.transaction(async (tx) => {
    await lockOutletForServiceabilityMutation(tx, parsed.outletId);
    await requireServiceabilityManage(tx, principal, parsed.outletId);

    const config = await lockServiceabilityConfigForUpdate(tx, parsed.outletId);
    assertExpectedRevision(config?.revision ?? null, parsed.expectedRevision);

    if (!config) {
      if (parsed.maxServiceDistanceMeters === null) {
        return toConfiguration(parsed.outletId, null, []);
      }
      throw new ServiceabilityError(
        "SERVICEABILITY_ROUTING_PRIORITY_REQUIRED",
        "Routing priority must be configured before setting distance policy.",
      );
    }

    const postalCodes = await listServiceabilityPins(tx, parsed.outletId);
    const nextOriginLat = parsed.serviceOriginLatitude;
    const nextOriginLng = parsed.serviceOriginLongitude;
    const nextMaxDistance = parsed.maxServiceDistanceMeters;

    const unchanged =
      config.serviceOriginLatitude === nextOriginLat &&
      config.serviceOriginLongitude === nextOriginLng &&
      config.maxServiceDistanceMeters === nextMaxDistance;
    if (unchanged) {
      return toConfiguration(parsed.outletId, config, postalCodes);
    }

    const newRevision = config.revision + BigInt(1);
    return withConflictMapping(async () => {
      await updateServiceabilityConfig(tx, {
        outletId: parsed.outletId,
        routingPriority: config.routingPriority,
        revision: newRevision,
        serviceOriginLatitude: nextOriginLat,
        serviceOriginLongitude: nextOriginLng,
        maxServiceDistanceMeters: nextMaxDistance,
      });
      await insertServiceabilityAuditEvent(tx, {
        actorId: principal.workforceUserId,
        outletId: parsed.outletId,
        action: "serviceability_distance_policy_set",
        previousRevision: config.revision,
        newRevision,
        previousRoutingPriority: null,
        newRoutingPriority: null,
        addedPostalCodes: [],
        removedPostalCodes: [],
        previousServiceOriginLatitude: config.serviceOriginLatitude,
        newServiceOriginLatitude: nextOriginLat,
        previousServiceOriginLongitude: config.serviceOriginLongitude,
        newServiceOriginLongitude: nextOriginLng,
        previousMaxServiceDistanceMeters: config.maxServiceDistanceMeters,
        newMaxServiceDistanceMeters: nextMaxDistance,
        occurredAt: new Date(),
      });
      return toConfiguration(
        parsed.outletId,
        {
          outletId: parsed.outletId,
          routingPriority: config.routingPriority,
          revision: newRevision,
          serviceOriginLatitude: nextOriginLat,
          serviceOriginLongitude: nextOriginLng,
          maxServiceDistanceMeters: nextMaxDistance,
        },
        postalCodes,
      );
    });
  });
}
