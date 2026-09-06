import { afterEach, describe, expect, it, vi } from "vitest";

import {
  bindPendingRefundCommand,
  buildPendingRefundCommandFacts,
  clearPendingRefundCommand,
  dropPendingRefundCommandMemoryForTests,
  findPendingRefundInList,
  isAmbiguousRefundTransportFailure,
  markPendingRefundCommandAmbiguous,
  pendingRefundFactsEqual,
  readPendingRefundCommand,
} from "./pending-refund-command";

const ORDER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function createIdFactory() {
  let n = 0;
  return () => {
    n += 1;
    return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  };
}

function baseFacts(overrides: Partial<{ amountPaise: string; reason: string; operatorNote: string }> = {}) {
  return buildPendingRefundCommandFacts({
    orderId: ORDER_ID,
    amountPaise: overrides.amountPaise ?? "50000",
    reason: overrides.reason ?? "customer complaint",
    operatorNote: overrides.operatorNote ?? "",
  });
}

afterEach(() => {
  dropPendingRefundCommandMemoryForTests();
  window.sessionStorage.clear();
  clearPendingRefundCommand(ORDER_ID);
});

describe("pending refund command model", () => {
  it("binds one UUID for one logical command and reuses it for the same facts", () => {
    const createId = createIdFactory();
    const facts = baseFacts();
    const first = bindPendingRefundCommand(facts, createId);
    const second = bindPendingRefundCommand(facts, createId);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.command.refundRequestId).toBe("00000000-0000-4000-8000-000000000001");
    expect(second.command.refundRequestId).toBe(first.command.refundRequestId);
  });

  it("issues a new UUID when immutable facts change after a non-ambiguous command", () => {
    const createId = createIdFactory();
    const first = bindPendingRefundCommand(baseFacts({ amountPaise: "50000", reason: "reason a" }), createId);
    const second = bindPendingRefundCommand(baseFacts({ amountPaise: "25000", reason: "reason a" }), createId);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.command.refundRequestId).not.toBe(first.command.refundRequestId);
  });

  it("retains the same UUID across ambiguous transport recovery", () => {
    const facts = baseFacts({ reason: "network retry", operatorNote: "note" });
    const bound = bindPendingRefundCommand(facts, () => "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    expect(bound.ok).toBe(true);
    if (!bound.ok) return;
    const ambiguous = markPendingRefundCommandAmbiguous(ORDER_ID);
    expect(ambiguous?.ambiguous).toBe(true);
    expect(ambiguous?.refundRequestId).toBe(bound.command.refundRequestId);
    const retry = bindPendingRefundCommand(facts, () => "cccccccc-cccc-4ccc-8ccc-cccccccccccc");
    expect(retry.ok).toBe(true);
    if (!retry.ok) return;
    expect(retry.command.refundRequestId).toBe(bound.command.refundRequestId);
    expect(isAmbiguousRefundTransportFailure("NETWORK_ERROR")).toBe(true);
  });

  it("protects an unresolved ambiguous command from silent overwrite with changed facts", () => {
    const facts = baseFacts({ amountPaise: "50000", reason: "first" });
    const bound = bindPendingRefundCommand(facts, () => "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    expect(bound.ok).toBe(true);
    if (!bound.ok) return;
    markPendingRefundCommandAmbiguous(ORDER_ID);
    const blocked = bindPendingRefundCommand(
      baseFacts({ amountPaise: "25000", reason: "changed" }),
      () => "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    );
    expect(blocked).toEqual({
      ok: false,
      code: "AMBIGUOUS_PENDING_FACTS_CHANGED",
      pending: expect.objectContaining({
        refundRequestId: bound.command.refundRequestId,
        ambiguous: true,
      }),
    });
    expect(readPendingRefundCommand(ORDER_ID)?.refundRequestId).toBe(bound.command.refundRequestId);
  });

  it("reconciles to an existing refund without creating another command id", () => {
    const facts = baseFacts({ reason: "already reserved" });
    const bound = bindPendingRefundCommand(facts, () => "dddddddd-dddd-4ddd-8ddd-dddddddddddd");
    expect(bound.ok).toBe(true);
    if (!bound.ok) return;
    markPendingRefundCommandAmbiguous(ORDER_ID);
    const found = findPendingRefundInList(
      [{ refundId: bound.command.refundRequestId }, { refundId: "other" }],
      bound.command.refundRequestId,
    );
    expect(found?.refundId).toBe(bound.command.refundRequestId);
    clearPendingRefundCommand(ORDER_ID);
    expect(readPendingRefundCommand(ORDER_ID)).toBeNull();
  });

  it("treats whitespace-normalized notes as the same facts", () => {
    const a = buildPendingRefundCommandFacts({
      orderId: ORDER_ID,
      amountPaise: "1",
      reason: "  partial   refund ",
      operatorNote: "  keep  for audit ",
    });
    const b = buildPendingRefundCommandFacts({
      orderId: ORDER_ID,
      amountPaise: "1",
      reason: "partial refund",
      operatorNote: "keep for audit",
    });
    expect(pendingRefundFactsEqual(a, b)).toBe(true);
  });

  it("A: setItem throw — NETWORK_ERROR retry reuses the same in-memory UUID", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("setItem blocked");
    });
    const createId = createIdFactory();
    const facts = baseFacts({ reason: "storage set failure" });
    const first = bindPendingRefundCommand(facts, createId);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.command.refundRequestId).toBe("00000000-0000-4000-8000-000000000001");
    markPendingRefundCommandAmbiguous(ORDER_ID);
    const retry = bindPendingRefundCommand(facts, createId);
    expect(retry.ok).toBe(true);
    if (!retry.ok) return;
    expect(retry.command.refundRequestId).toBe(first.command.refundRequestId);
    setItem.mockRestore();
  });

  it("B: getItem throw — mounted in-memory ambiguous command still reuses UUID", () => {
    const createId = createIdFactory();
    const facts = baseFacts({ reason: "storage get failure" });
    const first = bindPendingRefundCommand(facts, createId);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    markPendingRefundCommandAmbiguous(ORDER_ID);

    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("getItem blocked");
    });
    const retry = bindPendingRefundCommand(facts, createId);
    expect(retry.ok).toBe(true);
    if (!retry.ok) return;
    expect(retry.command.refundRequestId).toBe(first.command.refundRequestId);
    expect(readPendingRefundCommand(ORDER_ID)?.refundRequestId).toBe(first.command.refundRequestId);
    getItem.mockRestore();
  });

  it("C: removeItem throw — clear still drops in-memory so a later logical Refund gets a new UUID", () => {
    const createId = createIdFactory();
    const facts = baseFacts({ reason: "storage remove failure" });
    const first = bindPendingRefundCommand(facts, createId);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const removeItem = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("removeItem blocked");
    });
    clearPendingRefundCommand(ORDER_ID);
    expect(readPendingRefundCommand(ORDER_ID)).toBeNull();

    const second = bindPendingRefundCommand(facts, createId);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.command.refundRequestId).not.toBe(first.command.refundRequestId);
    removeItem.mockRestore();
  });

  it("D: working storage still preserves reload recovery", () => {
    const facts = baseFacts({ reason: "reload recovery" });
    const bound = bindPendingRefundCommand(facts, () => "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee");
    expect(bound.ok).toBe(true);
    if (!bound.ok) return;
    markPendingRefundCommandAmbiguous(ORDER_ID);

    dropPendingRefundCommandMemoryForTests();
    expect(memoryGoneButStoragePresent()).toBe(true);

    const recovered = readPendingRefundCommand(ORDER_ID);
    expect(recovered?.refundRequestId).toBe(bound.command.refundRequestId);
    expect(recovered?.ambiguous).toBe(true);

    const retry = bindPendingRefundCommand(facts, () => "ffffffff-ffff-4fff-8fff-ffffffffffff");
    expect(retry.ok).toBe(true);
    if (!retry.ok) return;
    expect(retry.command.refundRequestId).toBe(bound.command.refundRequestId);
  });

  it("E: ambiguous stored/in-memory command + exact facts → same UUID", () => {
    const facts = baseFacts({ reason: "exact retry" });
    const bound = bindPendingRefundCommand(facts, () => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1");
    expect(bound.ok).toBe(true);
    if (!bound.ok) return;
    markPendingRefundCommandAmbiguous(ORDER_ID);
    const retry = bindPendingRefundCommand(facts, () => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2");
    expect(retry.ok).toBe(true);
    if (!retry.ok) return;
    expect(retry.command.refundRequestId).toBe(bound.command.refundRequestId);
  });

  it("F: resolved command + genuinely new logical Refund → new UUID", () => {
    const createId = createIdFactory();
    const firstFacts = baseFacts({ reason: "first logical" });
    const first = bindPendingRefundCommand(firstFacts, createId);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    clearPendingRefundCommand(ORDER_ID);

    const second = bindPendingRefundCommand(baseFacts({ reason: "second logical" }), createId);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.command.refundRequestId).not.toBe(first.command.refundRequestId);
  });
});

function memoryGoneButStoragePresent(): boolean {
  const raw = window.sessionStorage.getItem(`boba.operations.pending-refund.v1:${ORDER_ID}`);
  return typeof raw === "string" && raw.length > 0;
}
