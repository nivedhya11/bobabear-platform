/**
 * Delivery application operations (IMP-031 / ARCH-G24 Boundary C).
 *
 * Booking safety: REQUESTED → BOOKING_OUTCOME_UNKNOWN commits before any
 * provider I/O. Recovery uses queryBooking only while UNKNOWN. Delivery never
 * mutates Order / Refund / Payment / inventory.
 */
import "server-only";

import { randomUUID } from "node:crypto";

import {
  DeliveryError,
  DELIVERY_CURRENCY,
  isAllowedDeliveryExecutionTransition,
  isAllowedDeliveryReturnTransition,
  isDeliveryCancellationAllowed,
  isDeliveryReturnEligible,
  parseAdvanceReturnInput,
  parseBeginBookingInput,
  parseBeginReturnInput,
  parseCancelDeliveryInput,
  parseConfirmManualBookingInput,
  parseConfirmPickupInput,
  parseCreateDeliveryInput,
  parseFailDeliveryInput,
  parseRecordAssignmentInput,
  parseRecordBookingOutcomeInput,
  parseRecordProofAndDeliverInput,
  parseRecordProviderCostFactInput,
  parseRecordProviderObservationInput,
  parseReconcileAmbiguousBookingInput,
  parseResolveManualBookingCancellationInput,
  parseResolveManualBookingFailureInput,
  parseUpdateTrackingReferenceInput,
  type Delivery,
  type DeliveryExecutionStatus,
  type DeliveryObservationDisposition,
  type DeliveryObservationMeaning,
  type DeliveryReturn,
  type NormalizedDeliveryBookingEvidence,
  type RecordProviderObservationResult,
} from "../../shared/delivery";
import type { Persistence } from "../persistence/types";
import { systemDeliveryClock, type DeliveryClock } from "./clock";
import {
  disabledDeliveryProvider,
  type DeliveryProvider,
} from "./provider";
import { isUniqueViolation } from "./assert-role";
import {
  findActiveDeliveryForOrder,
  findActiveReturnForDelivery,
  findDeliveryById,
  findDeliveryByOrderAndFingerprint,
  findOrderLifecycleById,
  insertAssignment,
  insertDelivery,
  insertObservation,
  insertProviderCost,
  insertProviderReferences,
  insertReturn,
  lockDeliveryForUpdate,
  lockOrderForDelivery,
  lockReturnForUpdate,
  mapDeliveryRow,
  mapObservationRow,
  mapProviderCostRow,
  mapReturnRow,
  newBookingCorrelationId,
  newDeliveryId,
  newDeliveryReturnId,
  supersedeOpenAssignments,
  updateDeliveryRow,
  updateObservationDisposition,
  updateReturnRow,
  upsertTrackingReference,
  type DeliveryRow,
} from "./repository";

export type DeliveryOperationOptions = Readonly<{
  clock?: DeliveryClock;
  provider?: DeliveryProvider;
}>;

function clockOf(options: DeliveryOperationOptions): DeliveryClock {
  return options.clock ?? systemDeliveryClock;
}

function providerOf(options: DeliveryOperationOptions): DeliveryProvider {
  return options.provider ?? disabledDeliveryProvider;
}

function requireRevisionMatch(
  row: DeliveryRow,
  expectedRevision: bigint,
): void {
  if (row.revision !== expectedRevision) {
    throw new DeliveryError(
      "DELIVERY_REVISION_CONFLICT",
      "Delivery revision does not match expectedRevision.",
      { field: "expectedRevision" },
    );
  }
}

function requireTransition(
  from: DeliveryExecutionStatus,
  to: DeliveryExecutionStatus,
): void {
  if (!isAllowedDeliveryExecutionTransition(from, to) || from === to) {
    throw new DeliveryError(
      "DELIVERY_TRANSITION_NOT_ALLOWED",
      `Delivery transition ${from} → ${to} is not allowed.`,
    );
  }
}

function nextRevision(row: DeliveryRow): bigint {
  return row.revision + BigInt(1);
}

async function loadMappedDelivery(
  persistence: Persistence,
  deliveryId: string,
): Promise<Delivery> {
  return persistence.withContext(async (ctx) => {
    const row = await findDeliveryById(ctx, deliveryId);
    if (!row) {
      throw new DeliveryError("DELIVERY_NOT_FOUND", "Delivery not found.");
    }
    return mapDeliveryRow(row);
  });
}

/**
 * Create one stable Delivery request. Same Order + fingerprint is idempotent.
 * Competing distinct active requests for the same Order cannot both succeed.
 */
export async function createDelivery(
  persistence: Persistence,
  input: unknown,
  options: DeliveryOperationOptions = {},
): Promise<Delivery> {
  const parsed = parseCreateDeliveryInput(input);
  const now = clockOf(options).now();

  try {
    return await persistence.transaction(async (tx) => {
      const order = await lockOrderForDelivery(tx, parsed.orderId);
      if (!order) {
        throw new DeliveryError(
          "DELIVERY_ORDER_NOT_ELIGIBLE",
          "Order not found for Delivery request.",
          { field: "orderId" },
        );
      }
      if (order.status === "CANCELLED" || order.status === "FULFILLED") {
        throw new DeliveryError(
          "DELIVERY_ORDER_NOT_ELIGIBLE",
          "Order is not eligible for a new Delivery request.",
          { field: "orderId" },
        );
      }

      const existing = await findDeliveryByOrderAndFingerprint(
        tx,
        parsed.orderId,
        parsed.requestFingerprint,
      );
      if (existing) {
        return mapDeliveryRow(existing);
      }

      const active = await findActiveDeliveryForOrder(tx, parsed.orderId);
      if (active) {
        throw new DeliveryError(
          "DELIVERY_ACTIVE_EXISTS",
          "An active Delivery already exists for this Order.",
          { field: "orderId" },
        );
      }

      const priorDeliveryId = parsed.priorDeliveryId ?? null;
      if (priorDeliveryId) {
        const prior = await findDeliveryById(tx, priorDeliveryId);
        if (!prior || prior.orderId !== parsed.orderId) {
          throw new DeliveryError(
            "DELIVERY_INVALID_INPUT",
            "priorDeliveryId must reference a prior Delivery for the same Order.",
            { field: "priorDeliveryId" },
          );
        }
        if (
          prior.status !== "DELIVERED" &&
          prior.status !== "FAILED" &&
          prior.status !== "CANCELLED"
        ) {
          throw new DeliveryError(
            "DELIVERY_STATE_CONFLICT",
            "Replacement requires the prior Delivery to be terminal.",
            { field: "priorDeliveryId" },
          );
        }
      }

      const row = await insertDelivery(tx, {
        id: newDeliveryId(),
        orderId: parsed.orderId,
        priorDeliveryId,
        requestFingerprint: parsed.requestFingerprint,
        now,
      });
      return mapDeliveryRow(row);
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      const recovered = await persistence.withContext(async (ctx) =>
        findDeliveryByOrderAndFingerprint(
          ctx,
          parsed.orderId,
          parsed.requestFingerprint,
        ),
      );
      if (recovered) return mapDeliveryRow(recovered);
      throw new DeliveryError(
        "DELIVERY_ACTIVE_EXISTS",
        "An active Delivery already exists for this Order.",
        { field: "orderId" },
      );
    }
    throw error;
  }
}

/**
 * Transition REQUESTED → BOOKING_OUTCOME_UNKNOWN with stable correlation, then
 * invoke provider createBooking only after commit. Never holds a DB lock across I/O.
 */
export async function beginBooking(
  persistence: Persistence,
  input: unknown,
  options: DeliveryOperationOptions = {},
): Promise<{
  delivery: Delivery;
  evidence: NormalizedDeliveryBookingEvidence;
}> {
  const parsed = parseBeginBookingInput(input);
  const clock = clockOf(options);
  const provider = providerOf(options);
  const now = clock.now();

  const prepared = await persistence.transaction(async (tx) => {
    const row = await lockDeliveryForUpdate(tx, parsed.deliveryId);
    if (!row) {
      throw new DeliveryError("DELIVERY_NOT_FOUND", "Delivery not found.");
    }
    requireRevisionMatch(row, parsed.expectedRevision);
    if (row.status !== "REQUESTED") {
      throw new DeliveryError(
        "DELIVERY_STATE_CONFLICT",
        "beginBooking requires REQUESTED status.",
      );
    }
    requireTransition("REQUESTED", "BOOKING_OUTCOME_UNKNOWN");

    const bookingCorrelationId =
      parsed.bookingCorrelationId ?? newBookingCorrelationId();
    const updated = await updateDeliveryRow(tx, row.id, {
      status: "BOOKING_OUTCOME_UNKNOWN",
      revision: nextRevision(row),
      bookingCorrelationId,
      provider: parsed.provider,
      bookingOutcomeUnknownAt: now,
      updatedAt: now,
    });
    return {
      delivery: mapDeliveryRow(updated),
      bookingCorrelationId,
      orderId: row.orderId,
      requestFingerprint: row.requestFingerprint,
    };
  });

  // Provider I/O strictly after UNKNOWN commit.
  const evidence = await provider.createBooking({
    deliveryId: prepared.delivery.id,
    orderId: prepared.orderId,
    bookingCorrelationId: prepared.bookingCorrelationId,
    requestFingerprint: prepared.requestFingerprint,
  });

  const resolved = await recordBookingOutcome(
    persistence,
    {
      deliveryId: prepared.delivery.id,
      expectedRevision: prepared.delivery.revision,
      evidence,
    },
    options,
  );

  return { delivery: resolved, evidence };
}

/**
 * Resolve BOOKING_OUTCOME_UNKNOWN (or REQUESTED → BOOKED/FAILED/CANCELLED)
 * from normalized booking evidence. Timeout/AMBIGUOUS never fabricates FAILED.
 */
export async function recordBookingOutcome(
  persistence: Persistence,
  input: unknown,
  options: DeliveryOperationOptions = {},
): Promise<Delivery> {
  const parsed = parseRecordBookingOutcomeInput(input);
  const now = clockOf(options).now();

  return persistence.transaction(async (tx) => {
    const row = await lockDeliveryForUpdate(tx, parsed.deliveryId);
    if (!row) {
      throw new DeliveryError("DELIVERY_NOT_FOUND", "Delivery not found.");
    }
    requireRevisionMatch(row, parsed.expectedRevision);

    const evidence = parsed.evidence;
    if (
      row.bookingCorrelationId &&
      evidence.bookingCorrelationId !== row.bookingCorrelationId
    ) {
      throw new DeliveryError(
        "DELIVERY_STATE_CONFLICT",
        "Booking correlation identity mismatch.",
        { field: "evidence.bookingCorrelationId" },
      );
    }

    if (evidence.outcome === "AMBIGUOUS") {
      if (row.status !== "BOOKING_OUTCOME_UNKNOWN") {
        throw new DeliveryError(
          "DELIVERY_BOOKING_AMBIGUOUS",
          "Ambiguous booking evidence cannot force a definitive transition.",
        );
      }
      return mapDeliveryRow(row);
    }

    const target: DeliveryExecutionStatus =
      evidence.outcome === "BOOKED"
        ? "BOOKED"
        : evidence.outcome === "FAILED"
          ? "FAILED"
          : "CANCELLED";

    if (row.status === target) {
      return mapDeliveryRow(row);
    }
    requireTransition(row.status as DeliveryExecutionStatus, target);

    const patch: Partial<DeliveryRow> = {
      status: target,
      revision: nextRevision(row),
      provider: evidence.provider,
      bookingCorrelationId:
        row.bookingCorrelationId ?? evidence.bookingCorrelationId,
      externalBookingReference:
        evidence.externalBookingReference ?? row.externalBookingReference,
      updatedAt: now,
    };

    if (target === "BOOKED") {
      patch.bookedAt = now;
      patch.failureCode = null;
      patch.failureReason = null;
      patch.failedAt = null;
      patch.cancellationCode = null;
      patch.cancellationReason = null;
      patch.cancelledAt = null;
    } else if (target === "FAILED") {
      patch.failedAt = now;
      patch.failureCode = evidence.failureCode ?? "BOOKING_FAILED";
      patch.failureReason =
        evidence.failureReason ?? "Booking failed with definitive evidence.";
    } else {
      patch.cancelledAt = now;
      patch.cancellationCode = "BOOKING_CANCELLED";
      patch.cancellationReason =
        evidence.failureReason ?? "Booking cancelled with definitive evidence.";
    }

    const updated = await updateDeliveryRow(tx, row.id, patch);
    if (evidence.references && evidence.references.length > 0) {
      await insertProviderReferences(
        tx,
        row.id,
        evidence.provider,
        evidence.references,
        now,
      );
    } else if (evidence.externalBookingReference) {
      await insertProviderReferences(
        tx,
        row.id,
        evidence.provider,
        [
          {
            kind: "external_booking_reference",
            value: evidence.externalBookingReference,
          },
        ],
        now,
      );
    }
    return mapDeliveryRow(updated);
  });
}

/**
 * Recover BOOKING_OUTCOME_UNKNOWN via queryBooking only.
 * Never issues a second createBooking.
 */
export async function reconcileAmbiguousBooking(
  persistence: Persistence,
  input: unknown,
  options: DeliveryOperationOptions = {},
): Promise<Delivery> {
  const parsed = parseReconcileAmbiguousBookingInput(input);
  const provider = providerOf(options);

  const current = await persistence.withContext(async (ctx) => {
    const row = await findDeliveryById(ctx, parsed.deliveryId);
    if (!row) {
      throw new DeliveryError("DELIVERY_NOT_FOUND", "Delivery not found.");
    }
    requireRevisionMatch(row, parsed.expectedRevision);
    if (row.status !== "BOOKING_OUTCOME_UNKNOWN") {
      throw new DeliveryError(
        "DELIVERY_STATE_CONFLICT",
        "reconcileAmbiguousBooking requires BOOKING_OUTCOME_UNKNOWN.",
      );
    }
    if (!row.bookingCorrelationId || !row.provider) {
      throw new DeliveryError(
        "DELIVERY_STATE_CONFLICT",
        "Ambiguous booking recovery requires durable correlation identity.",
      );
    }
    return mapDeliveryRow(row);
  });

  const evidence = await provider.queryBooking({
    bookingCorrelationId: current.bookingCorrelationId!,
    provider: current.provider!,
    externalBookingReference: current.externalBookingReference,
  });

  return recordBookingOutcome(
    persistence,
    {
      deliveryId: current.id,
      expectedRevision: current.revision,
      evidence,
    },
    options,
  );
}

function targetFromObservationMeaning(
  meaning: DeliveryObservationMeaning,
): DeliveryExecutionStatus | null {
  switch (meaning) {
    case "BOOKING_ACTIVE":
      return "BOOKED";
    case "BOOKING_INACTIVE_FAILED":
    case "FAILED":
      return "FAILED";
    case "BOOKING_INACTIVE_CANCELLED":
    case "CANCELLED":
      return "CANCELLED";
    case "PICKED_UP":
      return "PICKED_UP";
    case "DELIVERED":
      return "DELIVERED";
    default:
      return null;
  }
}

/**
 * BOOKED → FAILED / CANCELLED require confirmed inactive-booking evidence.
 * Plain FAILED/CANCELLED meanings are insufficient for pre-pickup BOOKED.
 * UNKNOWN → FAILED/CANCELLED likewise require inactive-confirmed meanings
 * (or reconcileAmbiguousBooking / cancelDelivery orchestration).
 */
function observationSatisfiesInactiveBookingPrerequisite(
  status: DeliveryExecutionStatus,
  meaning: DeliveryObservationMeaning,
  target: DeliveryExecutionStatus,
): boolean {
  if (target === "FAILED") {
    if (status === "BOOKED") {
      return meaning === "BOOKING_INACTIVE_FAILED";
    }
    if (status === "BOOKING_OUTCOME_UNKNOWN") {
      return (
        meaning === "BOOKING_INACTIVE_FAILED" || meaning === "FAILED"
      );
    }
    return true;
  }
  if (target === "CANCELLED") {
    if (status === "BOOKED" || status === "BOOKING_OUTCOME_UNKNOWN") {
      return meaning === "BOOKING_INACTIVE_CANCELLED";
    }
    return true;
  }
  return true;
}

function isInactiveBookingEvidence(
  evidence: NormalizedDeliveryBookingEvidence,
): boolean {
  return evidence.outcome === "FAILED" || evidence.outcome === "CANCELLED";
}

/**
 * Deduplicate → correlate → validate → apply at most one allowed transition.
 * Duplicate observationKey applies ZERO additional transitions.
 *
 * First-seen observation evidence is durable even when revision/lifecycle
 * preconditions prevent an authoritative transition (UNAPPLIED_*).
 */
export async function recordProviderObservation(
  persistence: Persistence,
  input: unknown,
  options: DeliveryOperationOptions = {},
): Promise<RecordProviderObservationResult> {
  const parsed = parseRecordProviderObservationInput(input);
  const now = clockOf(options).now();
  const observedAt = parsed.observedAt ?? now;

  return persistence.transaction(async (tx) => {
    const row = await lockDeliveryForUpdate(tx, parsed.deliveryId);
    if (!row) {
      throw new DeliveryError("DELIVERY_NOT_FOUND", "Delivery not found.");
    }

    const duplicateProbe = await insertObservation(tx, {
      deliveryId: row.id,
      provider: parsed.provider,
      observationSource: parsed.observationSource,
      observationKey: parsed.observationKey,
      providerEventId: parsed.providerEventId ?? null,
      normalizedMeaning: parsed.normalizedMeaning,
      disposition: "DUPLICATE",
      payloadDigest: parsed.payloadDigest ?? null,
      observedAt,
      createdAt: now,
    });

    if (!duplicateProbe.inserted) {
      return Object.freeze({
        delivery: mapDeliveryRow(row),
        observation: mapObservationRow(duplicateProbe.row),
        transitionApplied: false,
      });
    }

    // First-seen evidence must survive revision/lifecycle races: classify as
    // unapplied/recoverable rather than throwing (which would roll back the row).
    let disposition: DeliveryObservationDisposition = "UNAPPLIED_NO_TRANSITION";
    let transitionApplied = false;
    let delivery = row;

    if (row.revision !== parsed.expectedRevision) {
      disposition = "UNAPPLIED_CONFLICT";
    } else if (parsed.normalizedMeaning === "ASSIGNMENT") {
      if (row.status !== "BOOKED" && row.status !== "PICKED_UP") {
        disposition = "UNAPPLIED_UNSAFE";
      } else if (!parsed.assignmentKey) {
        disposition = "UNAPPLIED_UNSAFE";
      } else {
        await supersedeOpenAssignments(tx, row.id, parsed.assignmentKey, now);
        await insertAssignment(tx, {
          deliveryId: row.id,
          provider: parsed.provider,
          assignmentKey: parsed.assignmentKey,
          courierReference: parsed.courierReference ?? null,
          observedAt,
          createdAt: now,
        });
        disposition = "APPLIED";
        // Assignment is evidence/history — no execution transition, no revision bump.
      }
    } else if (
      parsed.normalizedMeaning === "UNKNOWN" ||
      parsed.normalizedMeaning === "BOOKING_AMBIGUOUS"
    ) {
      disposition = "UNAPPLIED_UNKNOWN";
    } else {
      const target = targetFromObservationMeaning(parsed.normalizedMeaning);
      if (!target) {
        disposition = "UNAPPLIED_UNKNOWN";
      } else if (row.status === target) {
        disposition = "UNAPPLIED_NO_TRANSITION";
      } else if (
        !isAllowedDeliveryExecutionTransition(
          row.status as DeliveryExecutionStatus,
          target,
        )
      ) {
        disposition =
          isAllowedDeliveryExecutionTransition(target, row.status as DeliveryExecutionStatus)
            ? "UNAPPLIED_CONFLICT"
            : "UNAPPLIED_UNSAFE";
      } else if (
        target === "CANCELLED" &&
        !isDeliveryCancellationAllowed(row.status as DeliveryExecutionStatus)
      ) {
        disposition = "UNAPPLIED_UNSAFE";
      } else if (target === "PICKED_UP" || target === "DELIVERED") {
        // Boundary C keeps pickup/delivery on explicit coordinated commands.
        disposition = "UNAPPLIED_UNSAFE";
      } else if (
        !observationSatisfiesInactiveBookingPrerequisite(
          row.status as DeliveryExecutionStatus,
          parsed.normalizedMeaning,
          target,
        )
      ) {
        disposition = "UNAPPLIED_UNSAFE";
      } else {
        const patch: Partial<DeliveryRow> = {
          status: target,
          revision: nextRevision(row),
          provider: parsed.provider,
          updatedAt: now,
        };
        if (parsed.externalBookingReference) {
          patch.externalBookingReference = parsed.externalBookingReference;
        }
        if (target === "BOOKED") {
          patch.bookedAt = now;
        } else if (target === "FAILED") {
          patch.failedAt = now;
          patch.failureCode = parsed.failureCode ?? "PROVIDER_FAILED";
          patch.failureReason =
            parsed.failureReason ?? "Delivery failed from validated observation.";
        } else if (target === "CANCELLED") {
          patch.cancelledAt = now;
          patch.cancellationCode = parsed.cancellationCode ?? "PROVIDER_CANCELLED";
          patch.cancellationReason =
            parsed.cancellationReason ??
            "Delivery cancelled from validated observation.";
        }
        delivery = await updateDeliveryRow(tx, row.id, patch);
        transitionApplied = true;
        disposition = "APPLIED";
      }
    }

    const observationRow = await updateObservationDisposition(
      tx,
      duplicateProbe.row.id,
      disposition,
    );
    const observation = mapObservationRow(observationRow);

    return Object.freeze({
      delivery: mapDeliveryRow(delivery),
      observation,
      transitionApplied,
    });
  });
}

export async function recordAssignment(
  persistence: Persistence,
  input: unknown,
  options: DeliveryOperationOptions = {},
): Promise<{ delivery: Delivery; assignmentKey: string }> {
  const parsed = parseRecordAssignmentInput(input);
  const now = clockOf(options).now();
  const observedAt = parsed.observedAt ?? now;

  return persistence.transaction(async (tx) => {
    const row = await lockDeliveryForUpdate(tx, parsed.deliveryId);
    if (!row) {
      throw new DeliveryError("DELIVERY_NOT_FOUND", "Delivery not found.");
    }
    requireRevisionMatch(row, parsed.expectedRevision);
    if (row.status !== "BOOKED" && row.status !== "PICKED_UP") {
      throw new DeliveryError(
        "DELIVERY_STATE_CONFLICT",
        "Assignment may only be recorded while BOOKED or PICKED_UP.",
      );
    }
    await supersedeOpenAssignments(tx, row.id, parsed.assignmentKey, now);
    await insertAssignment(tx, {
      deliveryId: row.id,
      provider: parsed.provider,
      assignmentKey: parsed.assignmentKey,
      courierReference: parsed.courierReference ?? null,
      observedAt,
      createdAt: now,
    });
    // Assignment is not lifecycle progression — revision unchanged.
    return {
      delivery: mapDeliveryRow(row),
      assignmentKey: parsed.assignmentKey,
    };
  });
}

export async function confirmPickup(
  persistence: Persistence,
  input: unknown,
  options: DeliveryOperationOptions = {},
): Promise<Delivery> {
  const parsed = parseConfirmPickupInput(input);
  const now = clockOf(options).now();

  return persistence.transaction(async (tx) => {
    const row = await lockDeliveryForUpdate(tx, parsed.deliveryId);
    if (!row) {
      throw new DeliveryError("DELIVERY_NOT_FOUND", "Delivery not found.");
    }
    requireRevisionMatch(row, parsed.expectedRevision);
    requireTransition(row.status as DeliveryExecutionStatus, "PICKED_UP");
    const updated = await updateDeliveryRow(tx, row.id, {
      status: "PICKED_UP",
      revision: nextRevision(row),
      handoffReference: parsed.handoffReference,
      pickedUpAt: now,
      updatedAt: now,
    });
    return mapDeliveryRow(updated);
  });
}

export async function recordProofAndDeliver(
  persistence: Persistence,
  input: unknown,
  options: DeliveryOperationOptions = {},
): Promise<Delivery> {
  const parsed = parseRecordProofAndDeliverInput(input);
  const now = clockOf(options).now();

  return persistence.transaction(async (tx) => {
    const row = await lockDeliveryForUpdate(tx, parsed.deliveryId);
    if (!row) {
      throw new DeliveryError("DELIVERY_NOT_FOUND", "Delivery not found.");
    }
    requireRevisionMatch(row, parsed.expectedRevision);
    requireTransition(row.status as DeliveryExecutionStatus, "DELIVERED");
    // Delivery DELIVERED only — never call fulfilOrder or mutate Order.
    const updated = await updateDeliveryRow(tx, row.id, {
      status: "DELIVERED",
      revision: nextRevision(row),
      proofReference: parsed.proofReference,
      deliveredAt: now,
      updatedAt: now,
    });
    return mapDeliveryRow(updated);
  });
}

/**
 * Generic failDelivery is valid only when no external booking ambiguity exists:
 * REQUESTED (pre-booking) and PICKED_UP (post-pickup definitive non-delivery).
 *
 * BOOKING_OUTCOME_UNKNOWN → FAILED requires reconcileAmbiguousBooking
 * (stable-identity query). BOOKED → FAILED requires validated inactive-booking
 * evidence (observation / booking-outcome path) — not a caller reason alone.
 */
export async function failDelivery(
  persistence: Persistence,
  input: unknown,
  options: DeliveryOperationOptions = {},
): Promise<Delivery> {
  const parsed = parseFailDeliveryInput(input);
  const now = clockOf(options).now();

  return persistence.transaction(async (tx) => {
    const row = await lockDeliveryForUpdate(tx, parsed.deliveryId);
    if (!row) {
      throw new DeliveryError("DELIVERY_NOT_FOUND", "Delivery not found.");
    }
    requireRevisionMatch(row, parsed.expectedRevision);
    const status = row.status as DeliveryExecutionStatus;

    if (status === "BOOKING_OUTCOME_UNKNOWN") {
      throw new DeliveryError(
        "DELIVERY_BOOKING_AMBIGUOUS",
        "BOOKING_OUTCOME_UNKNOWN cannot be failed via generic failDelivery; use reconcileAmbiguousBooking with stable-identity queryBooking evidence.",
      );
    }
    if (status === "BOOKED") {
      throw new DeliveryError(
        "DELIVERY_STATE_CONFLICT",
        "BOOKED → FAILED requires validated definitive failure evidence with confirmed inactive booking; use recordProviderObservation (BOOKING_INACTIVE_FAILED) or recordBookingOutcome from queryBooking.",
      );
    }

    requireTransition(status, "FAILED");
    const updated = await updateDeliveryRow(tx, row.id, {
      status: "FAILED",
      revision: nextRevision(row),
      failureCode: parsed.failureCode,
      failureReason: parsed.failureReason,
      failedAt: now,
      updatedAt: now,
    });
    return mapDeliveryRow(updated);
  });
}

/**
 * Cancel Delivery while preserving the one-active-booking invariant.
 *
 * REQUESTED → CANCELLED may occur directly (no external booking attempt).
 * UNKNOWN / BOOKED require queryBooking (and cancelBooking when still active)
 * with confirmed inactive evidence before CANCELLED. Ambiguity never unlocks
 * replacement. Provider I/O never holds a DB transaction.
 */
export async function cancelDelivery(
  persistence: Persistence,
  input: unknown,
  options: DeliveryOperationOptions = {},
): Promise<Delivery> {
  const parsed = parseCancelDeliveryInput(input);
  const clock = clockOf(options);
  const provider = providerOf(options);
  const now = clock.now();

  const prepared = await persistence.transaction(async (tx) => {
    const row = await lockDeliveryForUpdate(tx, parsed.deliveryId);
    if (!row) {
      throw new DeliveryError("DELIVERY_NOT_FOUND", "Delivery not found.");
    }
    requireRevisionMatch(row, parsed.expectedRevision);
    const status = row.status as DeliveryExecutionStatus;
    if (!isDeliveryCancellationAllowed(status)) {
      throw new DeliveryError(
        "DELIVERY_TRANSITION_NOT_ALLOWED",
        "Cancellation is prohibited after pickup.",
      );
    }
    requireTransition(status, "CANCELLED");

    if (status === "REQUESTED") {
      const updated = await updateDeliveryRow(tx, row.id, {
        status: "CANCELLED",
        revision: nextRevision(row),
        cancellationCode: parsed.cancellationCode,
        cancellationReason: parsed.cancellationReason,
        cancelledAt: now,
        updatedAt: now,
      });
      return { kind: "done" as const, delivery: mapDeliveryRow(updated) };
    }

    if (!row.bookingCorrelationId || !row.provider) {
      throw new DeliveryError(
        "DELIVERY_STATE_CONFLICT",
        "Cancellation after a booking attempt requires durable booking correlation identity.",
      );
    }

    return {
      kind: "needs_provider" as const,
      delivery: mapDeliveryRow(row),
      bookingCorrelationId: row.bookingCorrelationId,
      providerName: row.provider,
      externalBookingReference: row.externalBookingReference,
    };
  });

  if (prepared.kind === "done") {
    return prepared.delivery;
  }

  // Provider I/O strictly outside the transaction.
  let evidence = await provider.queryBooking({
    bookingCorrelationId: prepared.bookingCorrelationId,
    provider: prepared.providerName,
    externalBookingReference: prepared.externalBookingReference,
  });

  if (evidence.outcome === "BOOKED") {
    evidence = await provider.cancelBooking({
      bookingCorrelationId: prepared.bookingCorrelationId,
      provider: prepared.providerName,
      externalBookingReference:
        evidence.externalBookingReference ?? prepared.externalBookingReference,
    });
  }

  if (!isInactiveBookingEvidence(evidence)) {
    throw new DeliveryError(
      "DELIVERY_BOOKING_AMBIGUOUS",
      "Cancellation cannot terminalize while external booking inactivity is unconfirmed; Delivery remains active and replacement stays blocked.",
    );
  }

  if (
    evidence.bookingCorrelationId !== prepared.bookingCorrelationId
  ) {
    throw new DeliveryError(
      "DELIVERY_STATE_CONFLICT",
      "Booking correlation identity mismatch during cancellation reconciliation.",
      { field: "evidence.bookingCorrelationId" },
    );
  }

  const applyNow = clock.now();
  return persistence.transaction(async (tx) => {
    const row = await lockDeliveryForUpdate(tx, prepared.delivery.id);
    if (!row) {
      throw new DeliveryError("DELIVERY_NOT_FOUND", "Delivery not found.");
    }
    // Retry after lost post-I/O resolution uses the same expectedRevision
    // (unchanged while still active). Reject if another writer advanced it.
    requireRevisionMatch(row, prepared.delivery.revision);
    const status = row.status as DeliveryExecutionStatus;
    if (status === "CANCELLED") {
      return mapDeliveryRow(row);
    }
    if (!isDeliveryCancellationAllowed(status)) {
      throw new DeliveryError(
        "DELIVERY_TRANSITION_NOT_ALLOWED",
        "Cancellation is prohibited after pickup.",
      );
    }
    requireTransition(status, "CANCELLED");
    const updated = await updateDeliveryRow(tx, row.id, {
      status: "CANCELLED",
      revision: nextRevision(row),
      cancellationCode: parsed.cancellationCode,
      cancellationReason: parsed.cancellationReason,
      cancelledAt: applyNow,
      updatedAt: applyNow,
      externalBookingReference:
        evidence.externalBookingReference ?? row.externalBookingReference,
    });
    return mapDeliveryRow(updated);
  });
}

export async function beginReturn(
  persistence: Persistence,
  input: unknown,
  options: DeliveryOperationOptions = {},
): Promise<DeliveryReturn> {
  const parsed = parseBeginReturnInput(input);
  const now = clockOf(options).now();

  try {
    return await persistence.transaction(async (tx) => {
      const row = await lockDeliveryForUpdate(tx, parsed.deliveryId);
      if (!row) {
        throw new DeliveryError("DELIVERY_NOT_FOUND", "Delivery not found.");
      }
      if (
        !isDeliveryReturnEligible({
          executionStatus: row.status as DeliveryExecutionStatus,
          hadCourierCustody: parsed.hadCourierCustody,
        })
      ) {
        throw new DeliveryError(
          "DELIVERY_RETURN_NOT_ELIGIBLE",
          "Return requires FAILED Delivery with courier custody facts.",
        );
      }
      const active = await findActiveReturnForDelivery(tx, row.id);
      if (active) {
        throw new DeliveryError(
          "DELIVERY_RETURN_ACTIVE_EXISTS",
          "An active return attempt already exists for this Delivery.",
        );
      }
      const created = await insertReturn(tx, {
        id: newDeliveryReturnId(),
        deliveryId: row.id,
        reason: parsed.reason,
        returnDestination: parsed.returnDestination,
        now,
      });
      return mapReturnRow(created);
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new DeliveryError(
        "DELIVERY_RETURN_ACTIVE_EXISTS",
        "An active return attempt already exists for this Delivery.",
      );
    }
    throw error;
  }
}

export async function advanceReturn(
  persistence: Persistence,
  input: unknown,
  options: DeliveryOperationOptions = {},
): Promise<DeliveryReturn> {
  const parsed = parseAdvanceReturnInput(input);
  const now = clockOf(options).now();

  return persistence.transaction(async (tx) => {
    const row = await lockReturnForUpdate(tx, parsed.returnId);
    if (!row) {
      throw new DeliveryError(
        "DELIVERY_RETURN_NOT_FOUND",
        "Delivery return not found.",
      );
    }
    if (
      !isAllowedDeliveryReturnTransition(
        row.status as import("../../shared/delivery").DeliveryReturnStatus,
        parsed.toStatus,
      ) ||
      row.status === parsed.toStatus
    ) {
      throw new DeliveryError(
        "DELIVERY_TRANSITION_NOT_ALLOWED",
        `Return transition ${row.status} → ${parsed.toStatus} is not allowed.`,
      );
    }

    const patch: Partial<typeof row> = {
      status: parsed.toStatus,
      updatedAt: now,
    };
    if (parsed.toStatus === "RETURNING") {
      patch.returningAt = now;
    } else if (parsed.toStatus === "RETURNED") {
      if (!row.returningAt) patch.returningAt = now;
      patch.returnedAt = now;
    } else if (parsed.toStatus === "RETURN_FAILED") {
      patch.returnFailedAt = now;
      patch.failureReason =
        parsed.failureReason ?? "Return attempt failed.";
    }

    const updated = await updateReturnRow(tx, row.id, patch);
    return mapReturnRow(updated);
  });
}

export async function recordProviderCostFact(
  persistence: Persistence,
  input: unknown,
  options: DeliveryOperationOptions = {},
): Promise<ReturnType<typeof mapProviderCostRow>> {
  const parsed = parseRecordProviderCostFactInput(input);
  const now = clockOf(options).now();

  return persistence.transaction(async (tx) => {
    const row = await lockDeliveryForUpdate(tx, parsed.deliveryId);
    if (!row) {
      throw new DeliveryError("DELIVERY_NOT_FOUND", "Delivery not found.");
    }
    const cost = await insertProviderCost(tx, {
      deliveryId: row.id,
      kind: parsed.kind,
      amountPaise: parsed.amountPaise,
      currency: parsed.currency ?? DELIVERY_CURRENCY,
      provider: parsed.provider ?? null,
      note: parsed.note ?? null,
      createdAt: now,
    });
    return mapProviderCostRow(cost);
  });
}

export async function getDelivery(
  persistence: Persistence,
  deliveryId: string,
): Promise<Delivery> {
  return loadMappedDelivery(persistence, deliveryId);
}

export async function getOrderLifecycleSnapshot(
  persistence: Persistence,
  orderId: string,
): Promise<{ id: string; status: string; revision: bigint; updatedAt: Date }> {
  return persistence.withContext(async (ctx) => {
    const order = await findOrderLifecycleById(ctx, orderId);
    if (!order) {
      throw new DeliveryError(
        "DELIVERY_ORDER_NOT_ELIGIBLE",
        "Order not found.",
        { field: "orderId" },
      );
    }
    return order;
  });
}

/** Test helper: allocate a correlation id without importing crypto in callers. */
export function allocateBookingCorrelationId(): string {
  return randomUUID();
}

/**
 * IMP-032 manual mode: REQUESTED → BOOKING_OUTCOME_UNKNOWN with stable
 * correlation identity. Performs NO provider I/O — external booking may
 * only be attempted after this transaction commits.
 */
export async function beginManualBooking(
  persistence: Persistence,
  input: unknown,
  options: DeliveryOperationOptions = {},
): Promise<Delivery> {
  const parsed = parseBeginBookingInput(input);
  const now = clockOf(options).now();

  return persistence.transaction(async (tx) => {
    const row = await lockDeliveryForUpdate(tx, parsed.deliveryId);
    if (!row) {
      throw new DeliveryError("DELIVERY_NOT_FOUND", "Delivery not found.");
    }
    requireRevisionMatch(row, parsed.expectedRevision);
    if (row.status !== "REQUESTED") {
      throw new DeliveryError(
        "DELIVERY_STATE_CONFLICT",
        "beginManualBooking requires REQUESTED status.",
      );
    }
    requireTransition("REQUESTED", "BOOKING_OUTCOME_UNKNOWN");

    const bookingCorrelationId =
      parsed.bookingCorrelationId ?? newBookingCorrelationId();
    const updated = await updateDeliveryRow(tx, row.id, {
      status: "BOOKING_OUTCOME_UNKNOWN",
      revision: nextRevision(row),
      bookingCorrelationId,
      provider: parsed.provider,
      bookingOutcomeUnknownAt: now,
      updatedAt: now,
    });
    return mapDeliveryRow(updated);
  });
}

/**
 * IMP-032: UNKNOWN → BOOKED from operator-attested evidence. No provider I/O.
 */
export async function confirmManualBooking(
  persistence: Persistence,
  input: unknown,
  options: DeliveryOperationOptions = {},
): Promise<Delivery> {
  const parsed = parseConfirmManualBookingInput(input);

  const current = await persistence.withContext(async (ctx) => {
    const row = await findDeliveryById(ctx, parsed.deliveryId);
    if (!row) {
      throw new DeliveryError("DELIVERY_NOT_FOUND", "Delivery not found.");
    }
    if (row.status !== "BOOKING_OUTCOME_UNKNOWN") {
      throw new DeliveryError(
        "DELIVERY_STATE_CONFLICT",
        "confirmManualBooking requires BOOKING_OUTCOME_UNKNOWN.",
      );
    }
    if (!row.bookingCorrelationId || !row.provider) {
      throw new DeliveryError(
        "DELIVERY_STATE_CONFLICT",
        "Manual booking confirmation requires durable correlation identity.",
      );
    }
    return mapDeliveryRow(row);
  });

  const references = parsed.trackingUrl
    ? [{ kind: "tracking_url" as const, value: parsed.trackingUrl }]
    : undefined;

  return recordBookingOutcome(
    persistence,
    {
      deliveryId: parsed.deliveryId,
      expectedRevision: parsed.expectedRevision,
      evidence: {
        outcome: "BOOKED",
        provider: current.provider!,
        bookingCorrelationId: current.bookingCorrelationId!,
        externalBookingReference: parsed.externalBookingReference,
        providerStatusCode: null,
        providerTimestamp: clockOf(options).now(),
        references,
      },
    },
    options,
  );
}

/**
 * IMP-032: UNKNOWN → FAILED with definitive inactive-booking attestation.
 * No provider I/O.
 */
export async function resolveManualBookingFailure(
  persistence: Persistence,
  input: unknown,
  options: DeliveryOperationOptions = {},
): Promise<Delivery> {
  const parsed = parseResolveManualBookingFailureInput(input);

  const current = await persistence.withContext(async (ctx) => {
    const row = await findDeliveryById(ctx, parsed.deliveryId);
    if (!row) {
      throw new DeliveryError("DELIVERY_NOT_FOUND", "Delivery not found.");
    }
    if (row.status !== "BOOKING_OUTCOME_UNKNOWN") {
      throw new DeliveryError(
        "DELIVERY_STATE_CONFLICT",
        "resolveManualBookingFailure requires BOOKING_OUTCOME_UNKNOWN.",
      );
    }
    if (!row.bookingCorrelationId || !row.provider) {
      throw new DeliveryError(
        "DELIVERY_STATE_CONFLICT",
        "Manual failure resolution requires durable correlation identity.",
      );
    }
    return mapDeliveryRow(row);
  });

  return recordBookingOutcome(
    persistence,
    {
      deliveryId: parsed.deliveryId,
      expectedRevision: parsed.expectedRevision,
      evidence: {
        outcome: "FAILED",
        provider: current.provider!,
        bookingCorrelationId: current.bookingCorrelationId!,
        externalBookingReference: current.externalBookingReference,
        providerStatusCode: null,
        providerTimestamp: clockOf(options).now(),
        failureCode: parsed.failureCode,
        failureReason: parsed.failureReason,
      },
    },
    options,
  );
}

/**
 * IMP-032: UNKNOWN/BOOKED → CANCELLED after operator confirms external
 * booking is inactive. No provider I/O.
 */
export async function resolveManualBookingCancellation(
  persistence: Persistence,
  input: unknown,
  options: DeliveryOperationOptions = {},
): Promise<Delivery> {
  const parsed = parseResolveManualBookingCancellationInput(input);
  const now = clockOf(options).now();

  const current = await persistence.withContext(async (ctx) => {
    const row = await findDeliveryById(ctx, parsed.deliveryId);
    if (!row) {
      throw new DeliveryError("DELIVERY_NOT_FOUND", "Delivery not found.");
    }
    const status = row.status as DeliveryExecutionStatus;
    if (status === "REQUESTED") {
      throw new DeliveryError(
        "DELIVERY_STATE_CONFLICT",
        "Use cancelDelivery for REQUESTED cancellation.",
      );
    }
    if (status !== "BOOKING_OUTCOME_UNKNOWN" && status !== "BOOKED") {
      throw new DeliveryError(
        "DELIVERY_TRANSITION_NOT_ALLOWED",
        "Manual booking cancellation is not allowed from the current status.",
      );
    }
    if (!row.bookingCorrelationId || !row.provider) {
      throw new DeliveryError(
        "DELIVERY_STATE_CONFLICT",
        "Manual cancellation requires durable booking correlation identity.",
      );
    }
    return mapDeliveryRow(row);
  });

  if (current.status === "BOOKING_OUTCOME_UNKNOWN") {
    return recordBookingOutcome(
      persistence,
      {
        deliveryId: parsed.deliveryId,
        expectedRevision: parsed.expectedRevision,
        evidence: {
          outcome: "CANCELLED",
          provider: current.provider!,
          bookingCorrelationId: current.bookingCorrelationId!,
          externalBookingReference: current.externalBookingReference,
          providerStatusCode: null,
          providerTimestamp: now,
          failureReason: parsed.cancellationReason,
        },
      },
      options,
    );
  }

  return persistence.transaction(async (tx) => {
    const row = await lockDeliveryForUpdate(tx, parsed.deliveryId);
    if (!row) {
      throw new DeliveryError("DELIVERY_NOT_FOUND", "Delivery not found.");
    }
    requireRevisionMatch(row, parsed.expectedRevision);
    requireTransition(row.status as DeliveryExecutionStatus, "CANCELLED");
    const updated = await updateDeliveryRow(tx, row.id, {
      status: "CANCELLED",
      revision: nextRevision(row),
      cancellationCode: parsed.cancellationCode,
      cancellationReason: parsed.cancellationReason,
      cancelledAt: now,
      updatedAt: now,
    });
    return mapDeliveryRow(updated);
  });
}

/**
 * IMP-032: update validated tracking URL without lifecycle mutation.
 */
export async function updateTrackingReference(
  persistence: Persistence,
  input: unknown,
  options: DeliveryOperationOptions = {},
): Promise<Delivery> {
  const parsed = parseUpdateTrackingReferenceInput(input);
  const now = clockOf(options).now();

  return persistence.transaction(async (tx) => {
    const row = await lockDeliveryForUpdate(tx, parsed.deliveryId);
    if (!row) {
      throw new DeliveryError("DELIVERY_NOT_FOUND", "Delivery not found.");
    }
    requireRevisionMatch(row, parsed.expectedRevision);
    if (!row.provider) {
      throw new DeliveryError(
        "DELIVERY_STATE_CONFLICT",
        "Tracking reference requires a provider label on the Delivery.",
      );
    }
    await upsertTrackingReference(
      tx,
      row.id,
      row.provider,
      parsed.trackingUrl,
      now,
    );
    // Tracking URL is evidence only — revision unchanged.
    return mapDeliveryRow(row);
  });
}
