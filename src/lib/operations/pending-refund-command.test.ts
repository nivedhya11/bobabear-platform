import { afterEach, describe, expect, it } from "vitest";

import {
  bindPendingRefundCommand,
  buildPendingRefundCommandFacts,
  clearPendingRefundCommand,
  findPendingRefundInList,
  isAmbiguousRefundTransportFailure,
  markPendingRefundCommandAmbiguous,
  pendingRefundFactsEqual,
  readPendingRefundCommand,
} from "./pending-refund-command";

const ORDER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

afterEach(() => {
  window.sessionStorage.clear();
  clearPendingRefundCommand(ORDER_ID);
});

describe("pending refund command model", () => {
  it("binds one UUID for one logical command and reuses it for the same facts", () => {
    let n = 0;
    const createId = () => {
      n += 1;
      return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
    };
    const facts = buildPendingRefundCommandFacts({
      orderId: ORDER_ID,
      amountPaise: "50000",
      reason: "customer complaint",
      operatorNote: "",
    });
    const first = bindPendingRefundCommand(facts, createId);
    const second = bindPendingRefundCommand(facts, createId);
    expect(first.refundRequestId).toBe("00000000-0000-4000-8000-000000000001");
    expect(second.refundRequestId).toBe(first.refundRequestId);
    expect(n).toBe(1);
  });

  it("issues a new UUID when immutable facts change", () => {
    let n = 0;
    const createId = () => {
      n += 1;
      return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
    };
    const first = bindPendingRefundCommand(
      buildPendingRefundCommandFacts({
        orderId: ORDER_ID,
        amountPaise: "50000",
        reason: "reason a",
        operatorNote: "",
      }),
      createId,
    );
    const second = bindPendingRefundCommand(
      buildPendingRefundCommandFacts({
        orderId: ORDER_ID,
        amountPaise: "25000",
        reason: "reason a",
        operatorNote: "",
      }),
      createId,
    );
    expect(second.refundRequestId).not.toBe(first.refundRequestId);
    expect(n).toBe(2);
  });

  it("retains the same UUID across ambiguous transport recovery", () => {
    const facts = buildPendingRefundCommandFacts({
      orderId: ORDER_ID,
      amountPaise: "50000",
      reason: "network retry",
      operatorNote: "note",
    });
    const bound = bindPendingRefundCommand(facts, () => "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    const ambiguous = markPendingRefundCommandAmbiguous(ORDER_ID);
    expect(ambiguous?.ambiguous).toBe(true);
    expect(ambiguous?.refundRequestId).toBe(bound.refundRequestId);
    const retry = bindPendingRefundCommand(facts, () => "cccccccc-cccc-4ccc-8ccc-cccccccccccc");
    expect(retry.refundRequestId).toBe(bound.refundRequestId);
    expect(isAmbiguousRefundTransportFailure("NETWORK_ERROR")).toBe(true);
  });

  it("reconciles to an existing refund without creating another command id", () => {
    const facts = buildPendingRefundCommandFacts({
      orderId: ORDER_ID,
      amountPaise: "50000",
      reason: "already reserved",
      operatorNote: "",
    });
    const bound = bindPendingRefundCommand(facts, () => "dddddddd-dddd-4ddd-8ddd-dddddddddddd");
    markPendingRefundCommandAmbiguous(ORDER_ID);
    const found = findPendingRefundInList(
      [{ refundId: bound.refundRequestId }, { refundId: "other" }],
      bound.refundRequestId,
    );
    expect(found?.refundId).toBe(bound.refundRequestId);
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
});
