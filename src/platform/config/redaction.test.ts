import { describe, expect, it } from "vitest";

import { isSensitiveKey, REDACTED, redactRecord, redactValue } from "./redaction";

const SENTINEL = "DO_NOT_LEAK_THIS_SECRET_74291";

const SENSITIVE_KEY_PATTERNS = [
  "SECRET",
  "TOKEN",
  "PASSWORD",
  "PASSCODE",
  "PRIVATE",
  "CREDENTIAL",
  "AUTH",
  "COOKIE",
  "SESSION",
  "DATABASE_URL",
  "CONNECTION_STRING",
  "API_KEY",
  "SIGNING_KEY",
];

describe("redaction", () => {
  it.each(SENSITIVE_KEY_PATTERNS)(
    "recognizes keys containing %s as sensitive (case-insensitive)",
    (pattern) => {
      expect(isSensitiveKey(`BOBA_BEAR_${pattern}`)).toBe(true);
      expect(isSensitiveKey(`boba_bear_${pattern.toLowerCase()}`)).toBe(true);
    },
  );

  it("does not flag an unrelated key as sensitive", () => {
    expect(isSensitiveKey("BOBA_BEAR_PUBLIC_ORIGIN")).toBe(false);
  });

  it.each(SENSITIVE_KEY_PATTERNS)(
    "redacts a sentinel value under a %s-shaped key",
    (pattern) => {
      const key = `BOBA_BEAR_${pattern}`;
      const redacted = redactValue(key, SENTINEL);
      expect(redacted).toBe(REDACTED);
      expect(redacted).not.toContain(SENTINEL);
    },
  );

  it("leaves non-sensitive values untouched", () => {
    expect(redactValue("BOBA_BEAR_PUBLIC_ORIGIN", "http://localhost:3000")).toBe(
      "http://localhost:3000",
    );
  });

  it("redacts a flat record without leaking sentinel values", () => {
    const redacted = redactRecord({
      BOBA_BEAR_SECRET_TOKEN: SENTINEL,
      BOBA_BEAR_PUBLIC_ORIGIN: "http://localhost:3000",
    });
    expect(redacted.BOBA_BEAR_SECRET_TOKEN).toBe(REDACTED);
    expect(redacted.BOBA_BEAR_PUBLIC_ORIGIN).toBe("http://localhost:3000");
    expect(JSON.stringify(redacted)).not.toContain(SENTINEL);
  });
});
