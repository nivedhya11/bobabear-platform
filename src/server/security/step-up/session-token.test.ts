/**
 * Unit tests for workforce session cookie extraction (IMP-038).
 */
import { describe, expect, it } from "vitest";

import {
  extractWorkforceSessionTokenFromCookieHeader,
  extractWorkforceSessionTokenFromIncomingHeaders,
} from "./session-token";

describe("extractWorkforceSessionTokenFromCookieHeader", () => {
  it("reads the local/non-secure cookie name", () => {
    expect(
      extractWorkforceSessionTokenFromCookieHeader(
        "other=1; boba-workforce.session_token=local-token; x=y",
      ),
    ).toBe("local-token");
  });

  it("reads the production __Secure- cookie name", () => {
    expect(
      extractWorkforceSessionTokenFromCookieHeader(
        "__Secure-boba-workforce.session_token=prod-token; Path=/",
      ),
    ).toBe("prod-token");
  });

  it("decodes URI-encoded token values", () => {
    expect(
      extractWorkforceSessionTokenFromCookieHeader(
        "boba-workforce.session_token=a%2Fb%3Dc",
      ),
    ).toBe("a/b=c");
  });

  it("returns null when neither cookie is present", () => {
    expect(extractWorkforceSessionTokenFromCookieHeader("a=1; b=2")).toBeNull();
    expect(extractWorkforceSessionTokenFromCookieHeader("")).toBeNull();
    expect(extractWorkforceSessionTokenFromCookieHeader(null)).toBeNull();
  });
});

describe("extractWorkforceSessionTokenFromIncomingHeaders", () => {
  it("reads from Fetch Headers", () => {
    const headers = new Headers({
      cookie: "__Secure-boba-workforce.session_token=from-headers",
    });
    expect(extractWorkforceSessionTokenFromIncomingHeaders(headers)).toBe("from-headers");
  });
});
