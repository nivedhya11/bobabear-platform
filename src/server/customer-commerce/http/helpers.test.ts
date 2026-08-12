/**
 * Unit tests for customer-commerce HTTP helpers (IMP-024).
 */
import { describe, expect, it } from "vitest";

import { CartError } from "../../../shared/cart";
import { PaymentError } from "../../../shared/payment";
import { mapCommerceError } from "./error-map";
import { coerceRevisionFields } from "./revisions";
import { extractGuestCartToken } from "./guest-token";
import { sendJson } from "./response";

describe("IMP-024 error-map", () => {
  it("maps CUSTOMER_AUTH_REQUIRED to 401 with envelope fields only", () => {
    const mapped = mapCommerceError(
      new CartError("CUSTOMER_AUTH_REQUIRED", "need auth"),
      "req-1",
    );
    expect(mapped.status).toBe(401);
    expect(mapped.body).toEqual({
      ok: false,
      code: "CUSTOMER_AUTH_REQUIRED",
      requestId: "req-1",
    });
    expect(mapped.body).not.toHaveProperty("message");
    expect(mapped.body).not.toHaveProperty("retryable");
  });

  it("maps CART_CONFLICT to 409 and preserves field metadata", () => {
    const mapped = mapCommerceError(
      new CartError("CART_CONFLICT", "rev", { field: "expectedRevision" }),
      "req-2",
    );
    expect(mapped.status).toBe(409);
    expect(mapped.body.field).toBe("expectedRevision");
  });

  it("never invents PAYMENT_NOT_RETRYABLE", () => {
    const mapped = mapCommerceError(
      new PaymentError("PAYMENT_TERMINAL", "done"),
      "req-3",
    );
    expect(mapped.body.code).toBe("PAYMENT_TERMINAL");
    expect(mapped.body).not.toHaveProperty("retryable");
    expect(JSON.stringify(mapped.body)).not.toContain("PAYMENT_NOT_RETRYABLE");
  });

  it("maps unknown errors to INTERNAL_ERROR 500", () => {
    const mapped = mapCommerceError(new Error("boom"), "req-4");
    expect(mapped).toEqual({
      status: 500,
      body: { ok: false, code: "INTERNAL_ERROR", requestId: "req-4" },
    });
  });
});

describe("IMP-024 revision coercion", () => {
  it("converts decimal string revisions to bigint", () => {
    const out = coerceRevisionFields({
      expectedRevision: "12",
      expectedCheckoutRevision: "3",
      other: "x",
    });
    expect(out.expectedRevision).toBe(BigInt(12));
    expect(out.expectedCheckoutRevision).toBe(BigInt(3));
    expect(out.other).toBe("x");
  });
});

describe("IMP-024 guest token header", () => {
  it("extracts X-Boba-Guest-Cart-Token", () => {
    expect(
      extractGuestCartToken({ "x-boba-guest-cart-token": "tok-abc" }),
    ).toBe("tok-abc");
  });

  it("returns undefined when missing", () => {
    expect(extractGuestCartToken({})).toBeUndefined();
  });
});

describe("IMP-024 JSON bigint serialization", () => {
  it("serializes bigint as decimal string", () => {
    const chunks: Buffer[] = [];
    const headers = new Map<string, string>();
    const res = {
      writableEnded: false,
      statusCode: 0,
      setHeader(name: string, value: string) {
        headers.set(name.toLowerCase(), value);
      },
      end(payload?: string | Buffer) {
        if (payload) {
          chunks.push(Buffer.isBuffer(payload) ? payload : Buffer.from(payload));
        }
        this.writableEnded = true;
      },
    };
    sendJson(
      res as never,
      { ok: true, cart: { revision: BigInt(42) } },
      { status: 200, requestId: "r1" },
    );
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    expect(body.cart.revision).toBe("42");
    expect(typeof body.cart.revision).toBe("string");
    expect(headers.get("x-request-id")).toBe("r1");
    expect(headers.get("cache-control")).toBe("no-store");
  });
});
