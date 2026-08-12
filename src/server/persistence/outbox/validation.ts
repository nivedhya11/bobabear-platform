/**
 * Pure, Docker-independent validation helpers for the outbox store
 * (IMP-007). Every check here throws {@link OutboxValidationError} before a
 * single query runs — no partially-validated input ever reaches SQL.
 */
import { OutboxValidationError } from "./errors";
import { OUTBOX_MAX_BATCH_LIMIT, type JsonObject, type JsonValue } from "./types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TEXT_LENGTH = 200;
const MAX_ERROR_CODE_LENGTH = 100;
const SAFE_ERROR_CODE_PATTERN = /^[A-Za-z0-9_.:-]+$/;
const MAX_JSON_DEPTH = 32;

export function assertUuid(value: string, fieldName: string): void {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new OutboxValidationError({ message: `${fieldName} must be a valid UUID.` });
  }
}

export function assertNonEmptyBoundedText(value: string, fieldName: string): void {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_TEXT_LENGTH ||
    /[\r\n]/.test(value)
  ) {
    throw new OutboxValidationError({
      message: `${fieldName} must be a non-empty, single-line string of at most ${MAX_TEXT_LENGTH} characters.`,
    });
  }
}

export function assertOptionalNonEmptyBoundedText(
  value: string | null | undefined,
  fieldName: string,
): void {
  if (value === null || value === undefined) return;
  assertNonEmptyBoundedText(value, fieldName);
}

export function assertPositiveInteger(value: number, fieldName: string): void {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new OutboxValidationError({ message: `${fieldName} must be a positive integer.` });
  }
}

export function assertValidDate(value: Date, fieldName: string): void {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new OutboxValidationError({ message: `${fieldName} must be a valid Date.` });
  }
}

function isJsonValue(value: unknown, depth: number): value is JsonValue {
  if (depth > MAX_JSON_DEPTH) return false;
  if (value === null) return true;
  const type = typeof value;
  if (type === "string" || type === "boolean") return true;
  if (type === "number") return Number.isFinite(value as number);
  if (Array.isArray(value)) return value.every((item) => isJsonValue(item, depth + 1));
  if (type === "object") {
    const prototype = Object.getPrototypeOf(value as object);
    if (prototype !== Object.prototype && prototype !== null) return false;
    return Object.entries(value as Record<string, unknown>).every(
      ([key, item]) => typeof key === "string" && isJsonValue(item, depth + 1),
    );
  }
  return false;
}

/** Validates that `value` is a plain, JSON-safe object — no `undefined`,
 * `Date`, function, class instance, `NaN`/`Infinity`, or circular
 * reference. */
export function assertJsonObject(value: unknown, fieldName: string): void {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !isJsonValue(value, 0)
  ) {
    throw new OutboxValidationError({ message: `${fieldName} must be a JSON-safe object.` });
  }
}

/** A short, single-line, safe technical code — never a raw exception
 * message, stack trace, URL, or credential. */
export function assertSafeErrorCode(value: string, fieldName: string): void {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_ERROR_CODE_LENGTH ||
    !SAFE_ERROR_CODE_PATTERN.test(value)
  ) {
    throw new OutboxValidationError({
      message: `${fieldName} must be a short, single-line code (letters, digits, "_", ".", ":", "-" only).`,
    });
  }
}

/** Validates and normalizes a caller-supplied batch limit, applying the
 * documented default and rejecting zero, negative, fractional, NaN, and
 * excessive values. */
export function normalizeBatchLimit(limit: number | undefined, defaultLimit: number): number {
  if (limit === undefined) return defaultLimit;
  if (
    typeof limit !== "number" ||
    !Number.isInteger(limit) ||
    limit <= 0 ||
    limit > OUTBOX_MAX_BATCH_LIMIT
  ) {
    throw new OutboxValidationError({
      message: `limit must be an integer between 1 and ${OUTBOX_MAX_BATCH_LIMIT}.`,
    });
  }
  return limit;
}

export function assertCleanupLimit(limit: number, maxLimit: number): void {
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit <= 0 || limit > maxLimit) {
    throw new OutboxValidationError({
      message: `limit must be an integer between 1 and ${maxLimit}.`,
    });
  }
}

export function assertLeaseExpiresAfterNow(leaseExpiresAt: Date, now: Date, fieldName: string): void {
  assertValidDate(leaseExpiresAt, fieldName);
  assertValidDate(now, "now");
  if (leaseExpiresAt.getTime() <= now.getTime()) {
    throw new OutboxValidationError({ message: `${fieldName} must be strictly after now.` });
  }
}

/** Deep-freezes a shallow copy of a JSON object so the store never mutates
 * caller-supplied input (and callers cannot observe the store mutating it
 * either). */
export function freezeJsonObject(value: JsonObject): JsonObject {
  return Object.freeze({ ...value });
}
