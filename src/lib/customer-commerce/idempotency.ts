/**
 * Browser-side Payment idempotency helpers (IMP-025 / D-360).
 *
 * Does not invent server semantics. Keys are JSON `idempotencyKey` values.
 * Duplicate UI clicks reuse the same logical key; a new logical action
 * (different checkout revision, method, or retry attempt) gets a new key.
 */

const START_PREFIX = "boba.payment.idempotency.start.v1";
const RETRY_PREFIX = "boba.payment.idempotency.retry.v1";
const ZERO_PREFIX = "boba.payment.idempotency.zero.v1";
const RECOVERY_KEY = "boba.payment.recovery.v1";

export type PaymentRecoveryState = Readonly<{
  paymentId: string;
  checkoutId: string;
  checkoutRevision: string;
}>;

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function newCommerceIdempotencyKey(): string {
  return globalThis.crypto.randomUUID();
}

function readStoredKey(storageKey: string): string | null {
  if (!canUseSessionStorage()) return null;
  try {
    const value = window.sessionStorage.getItem(storageKey);
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

function writeStoredKey(storageKey: string, value: string): void {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.setItem(storageKey, value);
  } catch {
    /* sessionStorage may be blocked */
  }
}

function removeStoredKey(storageKey: string): void {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    /* ignore */
  }
}

export function readOrCreateStartIdempotencyKey(input: {
  checkoutId: string;
  checkoutRevision: string;
  paymentMethodIntent: string;
}): string {
  const storageKey = `${START_PREFIX}:${input.checkoutId}:${input.checkoutRevision}:${input.paymentMethodIntent}`;
  const existing = readStoredKey(storageKey);
  if (existing) return existing;
  const created = newCommerceIdempotencyKey();
  writeStoredKey(storageKey, created);
  return created;
}

export function readOrCreateRetryIdempotencyKey(input: {
  paymentId: string;
  attemptId: string;
  checkoutRevision: string;
  paymentMethodIntent: string;
}): string {
  const storageKey = `${RETRY_PREFIX}:${input.paymentId}:${input.attemptId}:${input.checkoutRevision}:${input.paymentMethodIntent}`;
  const existing = readStoredKey(storageKey);
  if (existing) return existing;
  const created = newCommerceIdempotencyKey();
  writeStoredKey(storageKey, created);
  return created;
}

export function readOrCreateZeroPayableIdempotencyKey(input: {
  checkoutId: string;
  checkoutRevision: string;
}): string {
  const storageKey = `${ZERO_PREFIX}:${input.checkoutId}:${input.checkoutRevision}`;
  const existing = readStoredKey(storageKey);
  if (existing) return existing;
  const created = newCommerceIdempotencyKey();
  writeStoredKey(storageKey, created);
  return created;
}

export function clearStartIdempotencyKey(input: {
  checkoutId: string;
  checkoutRevision: string;
  paymentMethodIntent: string;
}): void {
  removeStoredKey(
    `${START_PREFIX}:${input.checkoutId}:${input.checkoutRevision}:${input.paymentMethodIntent}`,
  );
}

export function rememberPaymentRecovery(state: PaymentRecoveryState): void {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.setItem(RECOVERY_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function readPaymentRecovery(): PaymentRecoveryState | null {
  if (!canUseSessionStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(RECOVERY_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return null;
    }
    const obj = parsed as Record<string, unknown>;
    if (
      typeof obj.paymentId !== "string" ||
      typeof obj.checkoutId !== "string" ||
      typeof obj.checkoutRevision !== "string"
    ) {
      return null;
    }
    return {
      paymentId: obj.paymentId,
      checkoutId: obj.checkoutId,
      checkoutRevision: obj.checkoutRevision,
    };
  } catch {
    return null;
  }
}

export function clearPaymentRecovery(): void {
  removeStoredKey(RECOVERY_KEY);
}
