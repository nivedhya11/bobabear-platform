/**
 * Client-side pending logical Refund command (IMP-036D).
 *
 * Preserves one stable refundRequestId across ambiguous transport results.
 *
 * Identity layers:
 *   1. In-memory map — primary for the current tab / mounted execution
 *   2. sessionStorage — optional reload recovery only
 *
 * Browser storage failure must never destroy same-page command identity.
 * Server Refund authority remains final. Never stores secrets.
 */
import { createRefundRequestId } from "./refunds";

const STORAGE_PREFIX = "boba.operations.pending-refund.v1";

export type PendingRefundCommandFacts = Readonly<{
  orderId: string;
  amountPaise: string;
  reason: string;
  operatorNote: string | null;
}>;

export type PendingRefundCommand = Readonly<{
  refundRequestId: string;
  facts: PendingRefundCommandFacts;
  ambiguous: boolean;
}>;

export type BindPendingRefundCommandResult =
  | Readonly<{ ok: true; command: PendingRefundCommand }>
  | Readonly<{
      ok: false;
      code: "AMBIGUOUS_PENDING_FACTS_CHANGED";
      pending: PendingRefundCommand;
    }>;

/**
 * Primary identity for the current tab execution. sessionStorage is optional mirror only.
 * `null` is an intentional clear tombstone: do not re-hydrate from stale storage after
 * removeItem fails on the same mounted page.
 */
const memoryByOrderId = new Map<string, PendingRefundCommand | null>();

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function storageKey(orderId: string): string {
  return `${STORAGE_PREFIX}:${orderId}`;
}

function freezeCommand(command: PendingRefundCommand): PendingRefundCommand {
  return Object.freeze({
    refundRequestId: command.refundRequestId,
    facts: Object.freeze({ ...command.facts }),
    ambiguous: command.ambiguous,
  });
}

/** Collapse whitespace the same way server reason/note normalization does. */
export function normalizePendingRefundText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizePendingRefundOperatorNote(value: string): string | null {
  const normalized = normalizePendingRefundText(value);
  return normalized.length === 0 ? null : normalized;
}

export function buildPendingRefundCommandFacts(input: {
  orderId: string;
  amountPaise: string;
  reason: string;
  operatorNote: string;
}): PendingRefundCommandFacts {
  return Object.freeze({
    orderId: input.orderId,
    amountPaise: input.amountPaise,
    reason: normalizePendingRefundText(input.reason),
    operatorNote: normalizePendingRefundOperatorNote(input.operatorNote),
  });
}

export function pendingRefundFactsEqual(
  a: PendingRefundCommandFacts,
  b: PendingRefundCommandFacts,
): boolean {
  return (
    a.orderId === b.orderId &&
    a.amountPaise === b.amountPaise &&
    a.reason === b.reason &&
    a.operatorNote === b.operatorNote
  );
}

function isPendingRefundCommand(value: unknown): value is PendingRefundCommand {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (typeof record.refundRequestId !== "string" || typeof record.ambiguous !== "boolean") {
    return false;
  }
  const facts = record.facts;
  if (typeof facts !== "object" || facts === null || Array.isArray(facts)) return false;
  const f = facts as Record<string, unknown>;
  return (
    typeof f.orderId === "string" &&
    typeof f.amountPaise === "string" &&
    typeof f.reason === "string" &&
    (f.operatorNote === null || typeof f.operatorNote === "string")
  );
}

function readFromSessionStorage(orderId: string): PendingRefundCommand | null {
  if (!canUseSessionStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(orderId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isPendingRefundCommand(parsed) || parsed.facts.orderId !== orderId) return null;
    return freezeCommand(parsed);
  } catch {
    return null;
  }
}

function writeToSessionStorage(command: PendingRefundCommand): void {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.setItem(storageKey(command.facts.orderId), JSON.stringify(command));
  } catch {
    /* sessionStorage may be blocked — in-memory identity remains authoritative */
  }
}

function removeFromSessionStorage(orderId: string): void {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.removeItem(storageKey(orderId));
  } catch {
    /* ignore — in-memory clear still proceeds */
  }
}

function persistCommand(command: PendingRefundCommand): PendingRefundCommand {
  const frozen = freezeCommand(command);
  memoryByOrderId.set(frozen.facts.orderId, frozen);
  writeToSessionStorage(frozen);
  return frozen;
}

export function readPendingRefundCommand(orderId: string): PendingRefundCommand | null {
  if (memoryByOrderId.has(orderId)) {
    return memoryByOrderId.get(orderId) ?? null;
  }

  const fromStorage = readFromSessionStorage(orderId);
  if (!fromStorage) return null;

  // Hydrate memory so subsequent same-tab reads do not depend on storage availability.
  memoryByOrderId.set(orderId, fromStorage);
  return fromStorage;
}

export function clearPendingRefundCommand(orderId: string): void {
  // Tombstone prevents same-page re-hydration if sessionStorage.removeItem throws.
  memoryByOrderId.set(orderId, null);
  removeFromSessionStorage(orderId);
}

/**
 * Test helper: drop in-memory entries without touching sessionStorage.
 * Simulates a full page reload where only storage recovery remains.
 */
export function dropPendingRefundCommandMemoryForTests(): void {
  memoryByOrderId.clear();
}

/**
 * Bind a UUID to immutable command facts for one logical Refund.
 * Reuses the pending UUID only when facts match.
 * Unresolved ambiguous commands are not silently replaced by changed facts.
 */
export function bindPendingRefundCommand(
  facts: PendingRefundCommandFacts,
  createId: () => string = createRefundRequestId,
): BindPendingRefundCommandResult {
  const existing = readPendingRefundCommand(facts.orderId);
  if (existing && pendingRefundFactsEqual(existing.facts, facts)) {
    return { ok: true, command: existing };
  }
  if (existing?.ambiguous) {
    return {
      ok: false,
      code: "AMBIGUOUS_PENDING_FACTS_CHANGED",
      pending: existing,
    };
  }
  const command = persistCommand({
    refundRequestId: createId(),
    facts,
    ambiguous: false,
  });
  return { ok: true, command };
}

export function markPendingRefundCommandAmbiguous(orderId: string): PendingRefundCommand | null {
  const existing = readPendingRefundCommand(orderId);
  if (!existing) return null;
  return persistCommand({
    ...existing,
    facts: Object.freeze({ ...existing.facts }),
    ambiguous: true,
  });
}

export function findPendingRefundInList<T extends { refundId: string }>(
  refunds: readonly T[],
  refundRequestId: string,
): T | undefined {
  return refunds.find((refund) => refund.refundId === refundRequestId);
}

export function isAmbiguousRefundTransportFailure(code: string): boolean {
  return code === "NETWORK_ERROR" || code === "INVALID_RESPONSE";
}
