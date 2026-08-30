/**
 * Delivery lifecycle transitions (IMP-031 §4).
 *
 * Assignment is not an execution transition. Terminal states never transition.
 */
import type {
  DeliveryExecutionStatus,
  DeliveryReturnStatus,
} from "./constants";
import {
  DELIVERY_ACTIVE_STATUSES,
  DELIVERY_TERMINAL_STATUSES,
} from "./constants";

const EXECUTION_ALLOWED: Readonly<
  Record<DeliveryExecutionStatus, readonly DeliveryExecutionStatus[]>
> = {
  REQUESTED: ["BOOKING_OUTCOME_UNKNOWN", "BOOKED", "FAILED", "CANCELLED"],
  BOOKING_OUTCOME_UNKNOWN: ["BOOKED", "FAILED", "CANCELLED"],
  BOOKED: ["PICKED_UP", "FAILED", "CANCELLED"],
  PICKED_UP: ["DELIVERED", "FAILED"],
  DELIVERED: [],
  FAILED: [],
  CANCELLED: [],
};

const RETURN_ALLOWED: Readonly<
  Record<DeliveryReturnStatus, readonly DeliveryReturnStatus[]>
> = {
  RETURN_REQUESTED: ["RETURNING", "RETURN_FAILED"],
  RETURNING: ["RETURNED", "RETURN_FAILED"],
  RETURNED: [],
  RETURN_FAILED: [],
};

export function isAllowedDeliveryExecutionTransition(
  from: DeliveryExecutionStatus,
  to: DeliveryExecutionStatus,
): boolean {
  if (from === to) return true;
  return EXECUTION_ALLOWED[from].includes(to);
}

export function isAllowedDeliveryReturnTransition(
  from: DeliveryReturnStatus,
  to: DeliveryReturnStatus,
): boolean {
  if (from === to) return true;
  return RETURN_ALLOWED[from].includes(to);
}

export function isDeliveryTerminalStatus(
  status: DeliveryExecutionStatus,
): boolean {
  return (DELIVERY_TERMINAL_STATUSES as readonly string[]).includes(status);
}

export function isDeliveryActiveStatus(
  status: DeliveryExecutionStatus,
): boolean {
  return (DELIVERY_ACTIVE_STATUSES as readonly string[]).includes(status);
}

/** Cancellation is prohibited once pickup has occurred. */
export function isDeliveryCancellationAllowed(
  status: DeliveryExecutionStatus,
): boolean {
  return status === "REQUESTED" ||
    status === "BOOKING_OUTCOME_UNKNOWN" ||
    status === "BOOKED";
}

/**
 * Return requires a FAILED Delivery with custody/handoff facts that genuinely
 * require return movement. Pre-pickup failure without custody is ineligible.
 */
export function isDeliveryReturnEligible(input: {
  executionStatus: DeliveryExecutionStatus;
  hadCourierCustody: boolean;
}): boolean {
  return input.executionStatus === "FAILED" && input.hadCourierCustody;
}
