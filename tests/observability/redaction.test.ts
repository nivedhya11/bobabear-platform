import { describe, expect, it } from "vitest";

import { redactLogObject } from "../../src/platform/observability/redact-log";

const SENTINEL = "DO_NOT_LEAK_THIS_SECRET_74291";

describe("observability redaction", () => {
  it("removes sensitive nested values from arbitrary log objects", () => {
    const redacted = redactLogObject({
      requestId: "req-1",
      authorization: `Bearer ${SENTINEL}`,
      nested: { sessionToken: SENTINEL, count: 2 },
    });

    expect(JSON.stringify(redacted)).not.toContain(SENTINEL);
    expect((redacted as { requestId: string }).requestId).toBe("req-1");
  });
});
