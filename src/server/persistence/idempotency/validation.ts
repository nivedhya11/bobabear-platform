/**
 * Pure, Docker-independent validation helpers for the idempotency store
 * (IMP-007). Every check here throws {@link IdempotencyValidationError}
 * before a single query runs.
 */
import { IdempotencyValidationError } from "./errors";
import type { JsonValue } from "./types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;
const NAMESPACE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/;
const MAX_NAMESPACE_LENGTH = 200;
const MAX_RESULT_CODE_LENGTH = 100;
const SAFE_RESULT_CODE_PATTERN = /^[A-Za-z0-9_.:-]+$/;
const MAX_JSON_DEPTH = 32;

export function assertUuid(value: string, fieldName: string): void {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new IdempotencyValidationError({ message: `${fieldName} must be a valid UUID.` });
  }
}

/** The namespace is a clear-text technical identifier, never secret data —
 * it must look like one: short, single-line, no whitespace. */
export function assertNamespace(value: string, fieldName = "namespace"): void {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_NAMESPACE_LENGTH ||
    !NAMESPACE_PATTERN.test(value)
  ) {
    throw new IdempotencyValidationError({
      message: `${fieldName} must be a short, single-line technical identifier.`,
    });
  }
}

export function assertSha256Hex(value: string, fieldName: string): void {
  if (typeof value !== "string" || !SHA256_HEX_PATTERN.test(value)) {
    throw new IdempotencyValidationError({
      message: `${fieldName} must be a lowercase 64-character SHA-256 hex digest.`,
    });
  }
}

export function assertNonEmptyString(value: string, fieldName: string): void {
  if (typeof value !== "string" || value.length === 0) {
    throw new IdempotencyValidationError({ message: `${fieldName} must be a non-empty string.` });
  }
}

export function assertValidDate(value: Date, fieldName: string): void {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new IdempotencyValidationError({ message: `${fieldName} must be a valid Date.` });
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

/** Validates that `value` is JSON-safe (a valid JSON scalar, array, or
 * plain object) or `null`. */
export function assertJsonSafeResult(value: unknown, fieldName: string): void {
  if (value !== null && !isJsonValue(value, 0)) {
    throw new IdempotencyValidationError({ message: `${fieldName} must be JSON-safe or null.` });
  }
}

/** A short, single-line, safe technical code — never a raw exception
 * message, stack trace, URL, or credential. */
export function assertSafeResultCode(value: string, fieldName: string): void {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_RESULT_CODE_LENGTH ||
    !SAFE_RESULT_CODE_PATTERN.test(value)
  ) {
    throw new IdempotencyValidationError({
      message: `${fieldName} must be a short, single-line code (letters, digits, "_", ".", ":", "-" only).`,
    });
  }
}

export function assertOptionalSafeResultCode(value: string | null | undefined, fieldName: string): void {
  if (value === null || value === undefined) return;
  assertSafeResultCode(value, fieldName);
}

export function assertLeaseBeforeExpiry(leaseExpiresAt: Date, expiresAt: Date): void {
  if (leaseExpiresAt.getTime() >= expiresAt.getTime()) {
    throw new IdempotencyValidationError({ message: "leaseExpiresAt must be strictly before expiresAt." });
  }
}

export function assertAfterNow(value: Date, now: Date, fieldName: string): void {
  if (value.getTime() <= now.getTime()) {
    throw new IdempotencyValidationError({ message: `${fieldName} must be strictly after now.` });
  }
}

export function assertCleanupLimit(limit: number, maxLimit: number): void {
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit <= 0 || limit > maxLimit) {
    throw new IdempotencyValidationError({
      message: `limit must be an integer between 1 and ${maxLimit}.`,
    });
  }
}
