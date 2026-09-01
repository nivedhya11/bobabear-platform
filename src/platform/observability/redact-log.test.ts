import { describe, expect, it } from "vitest";

import { redactLogObject } from "./redact-log";

const SENTINEL = "DO_NOT_LEAK_THIS_SECRET_74291";

describe("redactLogObject", () => {
  it("redacts sensitive keys and auth-shaped values deeply", () => {
    const redacted = redactLogObject({
      requestId: "req-1",
      headers: {
        authorization: `Bearer ${SENTINEL}`,
        apiToken: SENTINEL,
      },
      nested: {
        sessionToken: SENTINEL,
        safe: "visible",
      },
    }) as Record<string, unknown>;

    expect(redacted.requestId).toBe("req-1");
    expect(JSON.stringify(redacted)).not.toContain(SENTINEL);
    expect((redacted.nested as Record<string, unknown>).safe).toBe("visible");
  });
});
