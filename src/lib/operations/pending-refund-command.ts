/**
 * Client-side pending logical Refund command (IMP-036D).
 *
 * Preserves one stable refundRequestId across ambiguous transport results.
 * Browser storage is UX recovery only — server Refund authority remains final.
 * Never stores secrets.
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

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function storageKey(orderId: string): string {
  return `${STORAGE_PREFIX}:${orderId}`;
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

export function readPendingRefundCommand(orderId: string): PendingRefundCommand | null {
  if (!canUseSessionStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(orderId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isPendingRefundCommand(parsed) || parsed.facts.orderId !== orderId) return null;
    return Object.freeze({
      refundRequestId: parsed.refundRequestId,
      facts: Object.freeze({ ...parsed.facts }),
      ambiguous: parsed.ambiguous,
    });
  } catch {
    return null;
  }
}

function writePendingRefundCommand(command: PendingRefundCommand): void {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.setItem(storageKey(command.facts.orderId), JSON.stringify(command));
  } catch {
    /* sessionStorage may be blocked */
  }
}

export function clearPendingRefundCommand(orderId: string): void {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.removeItem(storageKey(orderId));
  } catch {
    /* ignore */
  }
}

/**
 * Bind a UUID to immutable command facts for one logical Refund.
 * Reuses the pending UUID only when facts match; otherwise starts a new command.
 */
export function bindPendingRefundCommand(
  facts: PendingRefundCommandFacts,
  createId: () => string = createRefundRequestId,
): PendingRefundCommand {
  const existing = readPendingRefundCommand(facts.orderId);
  if (existing && pendingRefundFactsEqual(existing.facts, facts)) {
    return existing;
  }
  const command: PendingRefundCommand = Object.freeze({
    refundRequestId: createId(),
    facts,
    ambiguous: false,
  });
  writePendingRefundCommand(command);
  return command;
}

export function markPendingRefundCommandAmbiguous(orderId: string): PendingRefundCommand | null {
  const existing = readPendingRefundCommand(orderId);
  if (!existing) return null;
  const next: PendingRefundCommand = Object.freeze({
    ...existing,
    facts: Object.freeze({ ...existing.facts }),
    ambiguous: true,
  });
  writePendingRefundCommand(next);
  return next;
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
