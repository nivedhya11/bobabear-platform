import { describe, expect, it } from "vitest";

import {
  ORDER_NUMBER_PATTERN,
  parseAcceptOrderInput,
  parseOrderRevisionTransport,
  serializeMoneyMinor,
  serializeOrderRevision,
} from "./index";
import {
  encodeCrockford60,
  generateOrderNumber,
} from "../../server/order/order-number";

describe("IMP-023 order smoke", () => {
  it("generates canonical Order numbers", () => {
    const n = generateOrderNumber();
    expect(ORDER_NUMBER_PATTERN.test(n)).toBe(true);
    expect(encodeCrockford60(BigInt(0)).length).toBe(12);
  });

  it("parses transport revisions strictly", () => {
    expect(parseOrderRevisionTransport("1")).toBe(BigInt(1));
    expect(parseOrderRevisionTransport("9223372036854775807")).toBe(
      BigInt("9223372036854775807"),
    );
    expect(() => parseOrderRevisionTransport("0")).toThrow();
    expect(() => parseOrderRevisionTransport("01")).toThrow();
    expect(() => parseOrderRevisionTransport(1)).toThrow();
    expect(() => parseOrderRevisionTransport("9223372036854775808")).toThrow();
  });

  it("serializes money and revision as decimal strings", () => {
    expect(serializeOrderRevision(BigInt(2))).toBe("2");
    expect(serializeMoneyMinor(BigInt(84200))).toBe("84200");
  });

  it("rejects unknown accept fields", () => {
    expect(() =>
      parseAcceptOrderInput("11111111-1111-4111-8111-111111111111", {
        expectedOrderRevision: "1",
        status: "ACCEPTED",
      }),
    ).toThrow();
    const ok = parseAcceptOrderInput(
      "11111111-1111-4111-8111-111111111111",
      { expectedOrderRevision: "1" },
    );
    expect(ok.expectedOrderRevision).toBe(BigInt(1));
  });
});
