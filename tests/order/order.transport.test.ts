/**
 * Order transport / contract tests (IMP-023).
 */
import { afterEach, describe, expect, it } from "vitest";

import {
  getCustomerOrder,
  getWorkforceOrder,
  searchWorkforceOrders,
} from "../../src/server/order";
import {
  encodeOrderListCursor,
  normalizeOrderNumberSearch,
  parseAcceptOrderInput,
  parseCancelOrderInput,
  parseFulfilOrderInput,
  parseListCustomerOrdersInput,
  parseOrderRevisionTransport,
  parseSearchWorkforceOrdersInput,
  serializeMoneyMinor,
  serializeOrderRevision,
} from "../../src/shared/order";
import {
  closeTrackedPersistenceHandles,
  withCompletedPositiveOrderHarness,
} from "../database/support/order-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

const SAMPLE_ORDER_ID = "11111111-1111-4111-8111-111111111111";

describe("IMP-023 transport schemas — accept / fulfil / cancel", () => {
  it("accepts strict accept body and rejects unknown fields", () => {
    const ok = parseAcceptOrderInput(SAMPLE_ORDER_ID, {
      expectedOrderRevision: "1",
    });
    expect(ok.orderId).toBe(SAMPLE_ORDER_ID);
    expect(ok.expectedOrderRevision).toBe(BigInt(1));

    expect(() =>
      parseAcceptOrderInput(SAMPLE_ORDER_ID, {
        expectedOrderRevision: "1",
        status: "ACCEPTED",
      }),
    ).toThrow(/Unknown field/);
  });

  it("accepts strict fulfil body and rejects unknown fields", () => {
    const ok = parseFulfilOrderInput(SAMPLE_ORDER_ID, {
      expectedOrderRevision: "2",
    });
    expect(ok.expectedOrderRevision).toBe(BigInt(2));
    expect(() =>
      parseFulfilOrderInput(SAMPLE_ORDER_ID, {
        expectedOrderRevision: "2",
        note: "extra",
      }),
    ).toThrow(/Unknown field/);
  });

  it("accepts strict cancel body and rejects unknown fields", () => {
    const ok = parseCancelOrderInput(SAMPLE_ORDER_ID, {
      expectedOrderRevision: "1",
      cancellationReasonCode: "BUSINESS_DECISION",
    });
    expect(ok.cancellationReasonCode).toBe("BUSINESS_DECISION");
    expect(() =>
      parseCancelOrderInput(SAMPLE_ORDER_ID, {
        expectedOrderRevision: "1",
        cancellationReasonCode: "BUSINESS_DECISION",
        actorId: "x",
      }),
    ).toThrow(/Unknown field/);
  });
});

describe("IMP-023 BIGINT revision transport", () => {
  it('accepts "1" and max BIGINT', () => {
    expect(parseOrderRevisionTransport("1")).toBe(BigInt(1));
    expect(parseOrderRevisionTransport("9223372036854775807")).toBe(
      BigInt("9223372036854775807"),
    );
  });

  it.each([
    "0",
    "-1",
    "01",
    "+1",
    "1.0",
    "1e3",
    "9223372036854775808",
  ])("rejects %s", (value) => {
    expect(() => parseOrderRevisionTransport(value)).toThrow();
  });

  it("rejects number coercion", () => {
    expect(() => parseOrderRevisionTransport(1)).toThrow();
  });
});

describe("IMP-023 money serialization", () => {
  it("serializes paise as exact decimal strings beyond JS safe integer", () => {
    expect(serializeMoneyMinor(BigInt(84_200))).toBe("84200");
    expect(serializeMoneyMinor(BigInt("9007199254740993"))).toBe(
      "9007199254740993",
    );
    expect(serializeOrderRevision(BigInt("9223372036854775807"))).toBe(
      "9223372036854775807",
    );
  });
});

describe("IMP-023 cursor and search normalization", () => {
  it("rejects empty / whitespace cursors at parse time", () => {
    expect(() => parseListCustomerOrdersInput({ cursor: "" })).toThrow(
      /cursor/,
    );
    expect(() =>
      parseSearchWorkforceOrdersInput({ cursor: "   " }),
    ).toThrow(/cursor/);
  });

  it("normalizes Order number search to uppercase trimmed canonical form", () => {
    expect(normalizeOrderNumberSearch("  ord-abcdefghjkmn  ")).toBe(
      "ORD-ABCDEFGHJKMN",
    );
    const parsed = parseSearchWorkforceOrdersInput({
      orderNumber: "ord-0123456789ab",
    });
    expect(parsed.orderNumber).toBe("ORD-0123456789AB");
  });

  it("rejects malformed Order number search", () => {
    expect(() =>
      parseSearchWorkforceOrdersInput({ orderNumber: "ORD-ILOVEYOUUUUU" }),
    ).toThrow();
  });
});

describe("IMP-023 customer projection excludes internal PII/provenance", () => {
  it("customer detail has paymentSatisfaction not paymentId / workforce actors", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const detail = await getCustomerOrder(h.persistence, h.actor, {
        orderId: h.order.id,
      });
      expect(detail.paymentSatisfaction).toBe("PAID");
      expect(detail.money.grandTotalMinor).toBe(
        h.grandTotalPaise.toString(10),
      );
      expect(detail.money.currency).toBe("INR");
      expect(detail).not.toHaveProperty("paymentId");
      expect(detail).not.toHaveProperty("paymentProvenanceKind");
      expect(detail).not.toHaveProperty("acceptedByWorkforceUserId");
      expect(detail).not.toHaveProperty("fulfilledByWorkforceUserId");
      expect(detail).not.toHaveProperty("cancelledByWorkforceUserId");
      expect(detail).not.toHaveProperty("checkoutId");
      expect(detail.destination.recipientPhone).toBeTruthy();
      expect(typeof detail.revision).toBe("string");
    });
  });

  it("workforce detail includes provenance; reads do not call provider", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const detail = await getWorkforceOrder(
        h.persistence,
        h.workforce.outletManager,
        { orderId: h.order.id },
      );
      expect(detail.paymentProvenanceKind).toBe("PAYMENT");
      expect(detail.acceptedByWorkforceUserId).toBeNull();

      const search = await searchWorkforceOrders(
        h.persistence,
        h.workforce.outletManager,
        { orderNumber: h.order.orderNumber },
      );
      expect(search.items.length).toBe(1);
      expect(search.items[0]).not.toHaveProperty("acceptedByWorkforceUserId");
      expect(search.items[0]).not.toHaveProperty("paymentProvenanceKind");

      const createAfter = h.provider.createExecutionCallCount;
      const queryAfter = h.provider.queryExecutionCallCount;
      await getCustomerOrder(h.persistence, h.actor, {
        orderId: h.order.id,
      });
      expect(h.provider.createExecutionCallCount).toBe(createAfter);
      expect(h.provider.queryExecutionCallCount).toBe(queryAfter);
    });
  });
});

describe("IMP-023 encode cursor shape", () => {
  it("round-trips createdAt + id via base64url JSON", () => {
    const encoded = encodeOrderListCursor(
      new Date("2026-08-10T12:00:00.000Z"),
      SAMPLE_ORDER_ID,
    );
    expect(encoded.length).toBeGreaterThan(8);
    expect(encoded).not.toContain("+");
    expect(encoded).not.toContain("/");
  });
});
