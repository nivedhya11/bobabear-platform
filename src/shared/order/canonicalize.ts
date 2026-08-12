/**
 * Canonical Order helpers (IMP-023).
 */

import {
  BIGINT_MAX,
  ORDER_CANCELLATION_REASON_CODES,
  ORDER_NUMBER_PATTERN,
  ORDER_STATUSES,
  type OrderCancellationReasonCode,
  type OrderStatus,
} from "./constants";
import { OrderError } from "./errors";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertOrderUuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    throw new OrderError(
      "ORDER_REQUEST_INVALID",
      `${field} must be a UUID.`,
      { field },
    );
  }
  return value.toLowerCase();
}

/**
 * Transport revision: decimal string matching /^[1-9][0-9]*$/ only.
 * Never coerce through JavaScript Number.
 */
export function parseOrderRevisionTransport(
  value: unknown,
  field = "expectedOrderRevision",
): bigint {
  if (typeof value !== "string" || !/^[1-9][0-9]*$/.test(value)) {
    throw new OrderError(
      "ORDER_REQUEST_INVALID",
      `${field} must be a positive decimal integer string.`,
      { field },
    );
  }
  const parsed = BigInt(value);
  if (parsed > BIGINT_MAX) {
    throw new OrderError(
      "ORDER_REQUEST_INVALID",
      `${field} exceeds BIGINT maximum.`,
      { field },
    );
  }
  return parsed;
}

/** Domain bigint revision (already typed) — positive and within BIGINT. */
export function requirePositiveOrderRevision(
  value: unknown,
  field = "expectedOrderRevision",
): bigint {
  if (typeof value === "bigint") {
    if (value <= BigInt(0) || value > BIGINT_MAX) {
      throw new OrderError(
        "ORDER_REQUEST_INVALID",
        `${field} must be a positive BIGINT.`,
        { field },
      );
    }
    return value;
  }
  return parseOrderRevisionTransport(value, field);
}

export function serializeOrderRevision(revision: bigint): string {
  if (revision <= BigInt(0) || revision > BIGINT_MAX) {
    throw new OrderError(
      "ORDER_REQUEST_INVALID",
      "revision is outside the serializable BIGINT range.",
    );
  }
  return revision.toString(10);
}

export function serializeMoneyMinor(paise: bigint): string {
  if (typeof paise !== "bigint") {
    throw new OrderError(
      "ORDER_REQUEST_INVALID",
      "Money values must be bigint paise.",
    );
  }
  return paise.toString(10);
}

export function normalizeOrderNumberSearch(value: string): string {
  return value.trim().toUpperCase();
}

export function assertCanonicalOrderNumber(value: string, field = "orderNumber"): string {
  const normalized = normalizeOrderNumberSearch(value);
  if (!ORDER_NUMBER_PATTERN.test(normalized)) {
    throw new OrderError(
      "ORDER_REQUEST_INVALID",
      `${field} must match ORD- + 12 Crockford Base32 characters.`,
      { field },
    );
  }
  return normalized;
}

export function requireOrderStatus(value: unknown, field = "status"): OrderStatus {
  if (
    typeof value !== "string" ||
    !(ORDER_STATUSES as readonly string[]).includes(value)
  ) {
    throw new OrderError(
      "ORDER_REQUEST_INVALID",
      `${field} must be a valid Order status.`,
      { field },
    );
  }
  return value as OrderStatus;
}

export function requireCancellationReasonCode(
  value: unknown,
  field = "cancellationReasonCode",
): OrderCancellationReasonCode {
  if (
    typeof value !== "string" ||
    !(ORDER_CANCELLATION_REASON_CODES as readonly string[]).includes(value)
  ) {
    throw new OrderError(
      "ORDER_CANCELLATION_REASON_INVALID",
      `${field} must be a canonical cancellation reason.`,
      { field },
    );
  }
  return value as OrderCancellationReasonCode;
}
