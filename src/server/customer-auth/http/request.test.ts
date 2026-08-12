/**
 * Unit tests for strict JSON request-body reading and query-param rejection
 * (IMP-009). Docker-independent; no network, no database. Uses a minimal
 * `Readable`-backed fake `IncomingMessage` rather than a real HTTP socket.
 */
import { Readable } from "node:stream";
import type { IncomingMessage } from "node:http";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  hasDisallowedQueryParams,
  MAX_JSON_BODY_BYTES,
  readJsonObjectBody,
} from "./request";

function makeRequest(
  headers: Record<string, string | string[] | undefined>,
  body?: string | Buffer,
): IncomingMessage {
  const req = new Readable({ read() {} }) as unknown as IncomingMessage;
  (req as unknown as { headers: typeof headers }).headers = headers;
  if (body !== undefined) {
    process.nextTick(() => {
      req.push(typeof body === "string" ? Buffer.from(body, "utf8") : body);
      req.push(null);
    });
  }
  return req;
}

const JSON_HEADERS = { "content-type": "application/json" };

describe("readJsonObjectBody — content-type", () => {
  it("rejects a missing Content-Type header", async () => {
    const req = makeRequest({}, "{}");
    const result = await readJsonObjectBody(req, []);
    expect(result).toEqual({ ok: false, reason: "content_type_invalid" });
  });

  it("rejects a non-JSON Content-Type", async () => {
    const req = makeRequest({ "content-type": "text/plain" }, "{}");
    const result = await readJsonObjectBody(req, []);
    expect(result).toEqual({ ok: false, reason: "content_type_invalid" });
  });

  it("accepts application/json with a charset parameter", async () => {
    const req = makeRequest({ "content-type": "application/json; charset=utf-8" }, "{}");
    const result = await readJsonObjectBody(req, []);
    expect(result).toEqual({ ok: true, value: {} });
  });

  it("is case-insensitive for the Content-Type value", async () => {
    const req = makeRequest({ "content-type": "Application/JSON" }, "{}");
    const result = await readJsonObjectBody(req, []);
    expect(result.ok).toBe(true);
  });
});

describe("readJsonObjectBody — shape validation", () => {
  it("accepts an object with only allowlisted fields", async () => {
    const req = makeRequest(JSON_HEADERS, JSON.stringify({ phoneNumber: "9876543210" }));
    const result = await readJsonObjectBody(req, ["phoneNumber"]);
    expect(result).toEqual({ ok: true, value: { phoneNumber: "9876543210" } });
  });

  it("rejects a field outside the allowlist", async () => {
    const req = makeRequest(
      JSON_HEADERS,
      JSON.stringify({ phoneNumber: "9876543210", extra: "nope" }),
    );
    const result = await readJsonObjectBody(req, ["phoneNumber"]);
    expect(result).toEqual({ ok: false, reason: "invalid_shape" });
  });

  it("rejects a JSON array body", async () => {
    const req = makeRequest(JSON_HEADERS, "[]");
    const result = await readJsonObjectBody(req, []);
    expect(result).toEqual({ ok: false, reason: "invalid_shape" });
  });

  it("rejects a JSON null body", async () => {
    const req = makeRequest(JSON_HEADERS, "null");
    const result = await readJsonObjectBody(req, []);
    expect(result).toEqual({ ok: false, reason: "invalid_shape" });
  });

  it("rejects a JSON primitive body", async () => {
    const req = makeRequest(JSON_HEADERS, '"just a string"');
    const result = await readJsonObjectBody(req, []);
    expect(result).toEqual({ ok: false, reason: "invalid_shape" });
  });

  it("rejects a completely empty body as an invalid shape (not a JSON object)", async () => {
    const req = makeRequest(JSON_HEADERS, "");
    const result = await readJsonObjectBody(req, []);
    expect(result).toEqual({ ok: false, reason: "invalid_shape" });
  });

  it("accepts an explicit empty JSON object body", async () => {
    const req = makeRequest(JSON_HEADERS, "{}");
    const result = await readJsonObjectBody(req, []);
    expect(result).toEqual({ ok: true, value: {} });
  });

  it("rejects malformed JSON", async () => {
    const req = makeRequest(JSON_HEADERS, "{not valid json");
    const result = await readJsonObjectBody(req, []);
    expect(result).toEqual({ ok: false, reason: "malformed_json" });
  });

  it("rejects a body containing disallowed control characters", async () => {
    const req = makeRequest(JSON_HEADERS, '{"phoneNumber":"98765\u000043210"}');
    const result = await readJsonObjectBody(req, ["phoneNumber"]);
    expect(result).toEqual({ ok: false, reason: "malformed_json" });
  });

  it("returns a frozen value object", async () => {
    const req = makeRequest(JSON_HEADERS, JSON.stringify({ code: "123456" }));
    const result = await readJsonObjectBody(req, ["code"]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.isFrozen(result.value)).toBe(true);
    }
  });
});

describe("readJsonObjectBody — size limit", () => {
  it("rejects a body larger than MAX_JSON_BODY_BYTES", async () => {
    const oversized = `{"phoneNumber":"${"9".repeat(MAX_JSON_BODY_BYTES)}"}`;
    const req = makeRequest(JSON_HEADERS, oversized);
    const result = await readJsonObjectBody(req, ["phoneNumber"]);
    expect(result).toEqual({ ok: false, reason: "too_large" });
  });

  it("accepts a body right at the boundary when it is still valid JSON", async () => {
    const padding = "9".repeat(Math.max(0, MAX_JSON_BODY_BYTES - 40));
    const body = JSON.stringify({ phoneNumber: padding });
    expect(Buffer.byteLength(body, "utf8")).toBeLessThanOrEqual(MAX_JSON_BODY_BYTES);
    const req = makeRequest(JSON_HEADERS, body);
    const result = await readJsonObjectBody(req, ["phoneNumber"]);
    expect(result.ok).toBe(true);
  });
});

describe("readJsonObjectBody — stream error", () => {
  it("resolves malformed_json when the request stream errors", async () => {
    const req = new Readable({ read() {} }) as unknown as IncomingMessage;
    (req as unknown as { headers: typeof JSON_HEADERS }).headers = JSON_HEADERS;
    const promise = readJsonObjectBody(req, []);
    (req as unknown as Readable).emit("error", new Error("boom"));
    await expect(promise).resolves.toEqual({ ok: false, reason: "malformed_json" });
  });
});

describe("readJsonObjectBody — timeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves timeout if the body never finishes arriving", async () => {
    const req = new Readable({ read() {} }) as unknown as IncomingMessage;
    (req as unknown as { headers: typeof JSON_HEADERS }).headers = JSON_HEADERS;
    (req as unknown as { destroy: () => void }).destroy = vi.fn();

    const promise = readJsonObjectBody(req, []);
    await vi.advanceTimersByTimeAsync(5_000);
    await expect(promise).resolves.toEqual({ ok: false, reason: "timeout" });
  });
});

describe("hasDisallowedQueryParams", () => {
  it("returns false when none of the disallowed fields are present", () => {
    const url = new URL("http://customer-auth.internal/api/customer-auth/send-otp");
    expect(hasDisallowedQueryParams(url, ["phoneNumber", "code"])).toBe(false);
  });

  it("returns true when a disallowed field is present in the query string", () => {
    const url = new URL("http://customer-auth.internal/x?phoneNumber=9876543210");
    expect(hasDisallowedQueryParams(url, ["phoneNumber", "code"])).toBe(true);
  });

  it("returns true even when the disallowed field's value is empty", () => {
    const url = new URL("http://customer-auth.internal/x?code=");
    expect(hasDisallowedQueryParams(url, ["code"])).toBe(true);
  });

  it("returns false for an unrelated query parameter", () => {
    const url = new URL("http://customer-auth.internal/x?utm_source=test");
    expect(hasDisallowedQueryParams(url, ["phoneNumber", "code", "otp"])).toBe(false);
  });
});
