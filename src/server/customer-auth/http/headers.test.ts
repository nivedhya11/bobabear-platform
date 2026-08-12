/**
 * Unit tests for allowlisted header bridging between Node's `http` and the
 * WHATWG `Headers` Better Auth expects (IMP-009), including the
 * one-`Set-Cookie`-per-cookie forwarding guarantee. Docker-independent; no
 * network, no database.
 */
import type { IncomingHttpHeaders, ServerResponse } from "node:http";

import { describe, expect, it, vi } from "vitest";

import { buildBetterAuthRequestHeaders, forwardSetCookies } from "./headers";

// @types/node types `cookie`/`origin`/etc. as `string | undefined` even
// though Node's own runtime can (rarely) deliver a repeated header as a
// string array — this cast lets the tests below exercise that real,
// defensively-handled runtime shape.
function headersWithArray(value: Record<string, string | readonly string[] | undefined>): IncomingHttpHeaders {
  return value as IncomingHttpHeaders;
}

describe("buildBetterAuthRequestHeaders", () => {
  it("forwards allowlisted headers present on the incoming request", () => {
    const headers = buildBetterAuthRequestHeaders({
      cookie: "boba-customer.session_token=abc",
      origin: "https://example.test",
      "user-agent": "test-agent/1.0",
      host: "example.test",
    });
    expect(headers.get("cookie")).toBe("boba-customer.session_token=abc");
    expect(headers.get("origin")).toBe("https://example.test");
    expect(headers.get("user-agent")).toBe("test-agent/1.0");
    expect(headers.get("host")).toBe("example.test");
  });

  it("never forwards a header outside the allowlist", () => {
    const headers = buildBetterAuthRequestHeaders({
      "x-api-key": "super-secret-value",
      authorization: "Bearer whatever",
    });
    expect(headers.get("x-api-key")).toBeNull();
    expect(headers.get("authorization")).toBeNull();
  });

  it("joins a repeated cookie header (array) with a semicolon separator", () => {
    const headers = buildBetterAuthRequestHeaders(
      headersWithArray({ cookie: ["a=1", "b=2"] }),
    );
    expect(headers.get("cookie")).toBe("a=1; b=2");
  });

  it("joins a repeated non-cookie header (array) with a comma separator", () => {
    const headers = buildBetterAuthRequestHeaders({
      "x-forwarded-for": ["203.0.113.10", "198.51.100.5"],
    });
    expect(headers.get("x-forwarded-for")).toBe("203.0.113.10, 198.51.100.5");
  });

  it("ignores an empty string header value", () => {
    const headers = buildBetterAuthRequestHeaders({ cookie: "" });
    expect(headers.has("cookie")).toBe(false);
  });

  it("ignores an empty array header value", () => {
    const headers = buildBetterAuthRequestHeaders(headersWithArray({ cookie: [] }));
    expect(headers.has("cookie")).toBe(false);
  });

  it("returns an empty Headers object for an empty incoming request", () => {
    const headers = buildBetterAuthRequestHeaders({});
    expect([...headers.keys()]).toEqual([]);
  });
});

function fakeServerResponse(): ServerResponse & { appendHeader: ReturnType<typeof vi.fn> } {
  return { appendHeader: vi.fn() } as unknown as ServerResponse & {
    appendHeader: ReturnType<typeof vi.fn>;
  };
}

describe("forwardSetCookies", () => {
  it("forwards each cookie as its own Set-Cookie call, never merged", () => {
    const source = new Headers();
    source.append("set-cookie", "a=1; Path=/");
    source.append("set-cookie", "b=2; Path=/");
    const target = fakeServerResponse();

    forwardSetCookies(source, target);

    expect(target.appendHeader).toHaveBeenCalledTimes(2);
    expect(target.appendHeader).toHaveBeenNthCalledWith(1, "Set-Cookie", "a=1; Path=/");
    expect(target.appendHeader).toHaveBeenNthCalledWith(2, "Set-Cookie", "b=2; Path=/");
  });

  it("does nothing when there are no cookies to forward", () => {
    const source = new Headers();
    const target = fakeServerResponse();
    forwardSetCookies(source, target);
    expect(target.appendHeader).not.toHaveBeenCalled();
  });
});
