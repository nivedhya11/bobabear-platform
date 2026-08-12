/**
 * Unit tests for shared customer-auth HTTP response helpers (IMP-009),
 * including the one-`Set-Cookie`-per-cookie forwarding guarantee. Docker-
 * independent; no network, no database.
 */
import type { ServerResponse } from "node:http";

import { describe, expect, it } from "vitest";

import {
  generateRequestId,
  sendJson,
  sendMethodNotAllowed,
  sendNotFound,
} from "./response";

function fakeServerResponse(): ServerResponse & {
  headers: Record<string, string>;
  appendedCookies: string[];
  ended: boolean;
  endedBody: string | undefined;
} {
  const headers: Record<string, string> = {};
  const appendedCookies: string[] = [];
  const res = {
    statusCode: 0,
    writableEnded: false,
    headers,
    appendedCookies,
    ended: false,
    endedBody: undefined as string | undefined,
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value;
    },
    appendHeader(name: string, value: string) {
      if (name.toLowerCase() === "set-cookie") appendedCookies.push(value);
    },
    end(body?: string) {
      res.ended = true;
      res.writableEnded = true;
      res.endedBody = body;
    },
  };
  return res as unknown as ServerResponse & {
    headers: Record<string, string>;
    appendedCookies: string[];
    ended: boolean;
    endedBody: string | undefined;
  };
}

describe("generateRequestId", () => {
  it("returns a well-formed UUID", () => {
    const id = generateRequestId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it("returns a different value on each call", () => {
    expect(generateRequestId()).not.toBe(generateRequestId());
  });
});

describe("sendJson", () => {
  it("sets status, JSON content type, no-store cache control, and the request ID header", () => {
    const res = fakeServerResponse();
    sendJson(res, { ok: true }, { status: 202, requestId: "req-1" });
    expect(res.statusCode).toBe(202);
    expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.headers["x-request-id"]).toBe("req-1");
    expect(res.endedBody).toBe(JSON.stringify({ ok: true }));
  });

  it("sets Retry-After when retryAfterSeconds is provided, rounding up and clamping at zero", () => {
    const res = fakeServerResponse();
    sendJson(res, {}, { status: 429, requestId: "req-2", retryAfterSeconds: 4.2 });
    expect(res.headers["retry-after"]).toBe("5");
  });

  it("clamps a negative retryAfterSeconds to zero", () => {
    const res = fakeServerResponse();
    sendJson(res, {}, { status: 429, requestId: "req-3", retryAfterSeconds: -5 });
    expect(res.headers["retry-after"]).toBe("0");
  });

  it("sets Vary: Cookie only when varyCookie is true", () => {
    const withVary = fakeServerResponse();
    sendJson(withVary, {}, { status: 200, requestId: "req-4", varyCookie: true });
    expect(withVary.headers["vary"]).toBe("Cookie");

    const withoutVary = fakeServerResponse();
    sendJson(withoutVary, {}, { status: 200, requestId: "req-5" });
    expect(withoutVary.headers["vary"]).toBeUndefined();
  });

  it("forwards each cookie individually via appendHeader, never merged", () => {
    const res = fakeServerResponse();
    sendJson(res, {}, {
      status: 200,
      requestId: "req-6",
      setCookies: ["a=1; Path=/", "b=2; Path=/"],
    });
    expect(res.appendedCookies).toEqual(["a=1; Path=/", "b=2; Path=/"]);
  });

  it("does nothing when the response has already ended", () => {
    const res = fakeServerResponse();
    // `writableEnded` is a read-only getter on the real `ServerResponse`
    // type; the fake object underneath is a plain mutable property.
    (res as { writableEnded: boolean }).writableEnded = true;
    sendJson(res, { ok: true }, { status: 200, requestId: "req-7" });
    expect(res.ended).toBe(false);
  });
});

describe("sendMethodNotAllowed", () => {
  it("sets the Allow header, status 405, and METHOD_NOT_ALLOWED code", () => {
    const res = fakeServerResponse();
    sendMethodNotAllowed(res, ["GET", "POST"], "req-8");
    expect(res.statusCode).toBe(405);
    expect(res.headers["allow"]).toBe("GET, POST");
    expect(res.endedBody).toBe(JSON.stringify({ ok: false, code: "METHOD_NOT_ALLOWED" }));
  });
});

describe("sendNotFound", () => {
  it("sets status 404 and NOT_FOUND code", () => {
    const res = fakeServerResponse();
    sendNotFound(res, "req-9");
    expect(res.statusCode).toBe(404);
    expect(res.endedBody).toBe(JSON.stringify({ ok: false, code: "NOT_FOUND" }));
  });
});

describe("sendJson — never leaks a secret-shaped value into the body", () => {
  it("only serializes exactly the body object passed in", () => {
    const res = fakeServerResponse();
    const body = { ok: true, code: "OTP_REQUEST_ACCEPTED", retryAfterSeconds: 60 };
    sendJson(res, body, { status: 202, requestId: "req-10" });
    expect(JSON.parse(res.endedBody ?? "{}")).toEqual(body);
  });
});
