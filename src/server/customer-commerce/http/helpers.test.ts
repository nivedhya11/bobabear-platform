/**
 * Unit tests for customer-commerce HTTP helpers (IMP-024 / IMP-028 Slice 6).
 */
import { describe, expect, it } from "vitest";

import { CartError } from "../../../shared/cart";
import { FinancialDocumentError } from "../../../shared/financial-document";
import { PaymentError } from "../../../shared/payment";
import { mapCommerceError } from "./error-map";
import { LocationError } from "../location/errors";
import { coerceRevisionFields } from "./revisions";
import { extractGuestCartToken } from "./guest-token";
import {
  buildAttachmentContentDisposition,
  sendJson,
  sendPdf,
} from "./response";

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

  it("maps LOCATION_PROVIDER_UNAVAILABLE to 503 without provider details", () => {
    const mapped = mapCommerceError(
      new LocationError("LOCATION_PROVIDER_UNAVAILABLE", "Places API 429 RESOURCE_EXHAUSTED"),
      "req-loc-1",
    );
    expect(mapped.status).toBe(503);
    expect(mapped.body).toEqual({
      ok: false,
      code: "LOCATION_PROVIDER_UNAVAILABLE",
      requestId: "req-loc-1",
    });
    expect(JSON.stringify(mapped.body)).not.toContain("Places");
    expect(JSON.stringify(mapped.body)).not.toContain("429");
  });

  it("maps Financial Document DOCUMENT_NOT_FOUND to 404 without message", () => {
    const mapped = mapCommerceError(
      new FinancialDocumentError("DOCUMENT_NOT_FOUND", "secret prior id abc"),
      "req-fd-1",
    );
    expect(mapped.status).toBe(404);
    expect(mapped.body).toEqual({
      ok: false,
      code: "DOCUMENT_NOT_FOUND",
      requestId: "req-fd-1",
    });
    expect(JSON.stringify(mapped.body)).not.toContain("secret prior id");
  });

  it("maps Financial Document AUTHORITY_INCONSISTENT to 500 without message", () => {
    const mapped = mapCommerceError(
      new FinancialDocumentError(
        "AUTHORITY_INCONSISTENT",
        "prior 00000000-0000-4000-8000-000000000001 leaked",
      ),
      "req-fd-2",
    );
    expect(mapped.status).toBe(500);
    expect(mapped.body).toEqual({
      ok: false,
      code: "AUTHORITY_INCONSISTENT",
      requestId: "req-fd-2",
    });
    expect(JSON.stringify(mapped.body)).not.toContain("00000000-0000-4000-8000");
  });

  it("maps Financial Document INVALID_ACCESS_INPUT to 400", () => {
    const mapped = mapCommerceError(
      new FinancialDocumentError("INVALID_ACCESS_INPUT", "bad uuid"),
      "req-fd-3",
    );
    expect(mapped.status).toBe(400);
    expect(mapped.body.code).toBe("INVALID_ACCESS_INPUT");
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

describe("IMP-028 Content-Disposition safety", () => {
  it("builds attachment header from safe Slice-4 filename", () => {
    expect(
      buildAttachmentContentDisposition("BOBA-Tax-Invoice-BB-TI-2526-000001.pdf"),
    ).toBe('attachment; filename="BOBA-Tax-Invoice-BB-TI-2526-000001.pdf"');
  });

  it("rejects header injection via quotes / CR / LF / control chars", () => {
    const malicious = [
      'evil.pdf"\r\nX-Injected: yes',
      "evil.pdf\r\nX-Injected: yes",
      "evil.pdf\nX-Injected: yes",
      'a"b.pdf',
      "evil.pdf\0.pdf",
      "../../../etc/passwd.pdf",
      "BOBA Tax Invoice.pdf",
      "",
    ];
    for (const filename of malicious) {
      expect(() => buildAttachmentContentDisposition(filename)).toThrow(
        "UNSAFE_CONTENT_DISPOSITION_FILENAME",
      );
    }
  });

  it("sendPdf sets private no-store PDF headers and safe disposition", () => {
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
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
    sendPdf(
      res as never,
      {
        bytes,
        byteLength: bytes.byteLength,
        suggestedFilename: "BOBA-Tax-Invoice-BB-TI-2526-000001.pdf",
      },
      { status: 200, requestId: "pdf-1" },
    );
    expect(res.statusCode).toBe(200);
    expect(headers.get("content-type")).toBe("application/pdf");
    expect(headers.get("content-length")).toBe("5");
    expect(headers.get("content-disposition")).toBe(
      'attachment; filename="BOBA-Tax-Invoice-BB-TI-2526-000001.pdf"',
    );
    expect(headers.get("cache-control")).toBe("no-store");
    expect(headers.get("x-request-id")).toBe("pdf-1");
    expect(Buffer.concat(chunks).equals(Buffer.from(bytes))).toBe(true);
  });
});
