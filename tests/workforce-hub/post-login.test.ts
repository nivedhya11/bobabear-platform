import { describe, expect, it } from "vitest";

import { resolvePostLoginLocation } from "../../src/lib/workforce-hub/post-login";

describe("post-login landing", () => {
  it("sends multi-application principals to the workforce hub when returnTo is absent", () => {
    const result = resolvePostLoginLocation({
      returnTo: null,
      session: { ok: true, capabilities: { "order.read": true, "access.membership.read": true } },
    });
    expect(result).toEqual({ kind: "redirect", href: "/workforce/" });
  });

  it("sends a single-destination principal directly to that application", () => {
    expect(
      resolvePostLoginLocation({
        returnTo: null,
        session: { ok: true, capabilities: { "order.read": true } },
      }),
    ).toEqual({ kind: "redirect", href: "/workforce/operations/" });
    expect(
      resolvePostLoginLocation({
        returnTo: null,
        session: { ok: true, capabilities: { "access.audit.read": true } },
      }),
    ).toEqual({ kind: "redirect", href: "/workforce/admin/" });
  });

  it("honors an explicit safe returnTo", () => {
    expect(
      resolvePostLoginLocation({
        returnTo: "/workforce/admin/resources/",
        session: { ok: true, capabilities: { "order.read": true, "access.membership.read": true } },
      }),
    ).toEqual({ kind: "redirect", href: "/workforce/admin/resources/" });
  });

  it("rejects unsafe returnTo and falls through to destination count", () => {
    expect(
      resolvePostLoginLocation({
        returnTo: "https://evil.example/workforce/",
        session: { ok: true, capabilities: { "order.read": true } },
      }),
    ).toEqual({ kind: "redirect", href: "/workforce/operations/" });
  });

  it("does not invent a no-access landing from a session service failure", () => {
    expect(
      resolvePostLoginLocation({
        returnTo: null,
        session: { ok: false, status: 500, code: "INVALID_RESPONSE" },
      }),
    ).toEqual({ kind: "service_failure" });
  });
});
