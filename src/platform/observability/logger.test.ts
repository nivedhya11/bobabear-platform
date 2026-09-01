import { describe, expect, it } from "vitest";

import { createStructuredLogger, STANDARD_HTTP_LOG_FIELDS } from "./logger";

describe("createStructuredLogger", () => {
  it("emits allowlisted fields only and honors log level", () => {
    const lines: string[] = [];
    const logger = createStructuredLogger({
      logLevel: "warn",
      allowFields: [...STANDARD_HTTP_LOG_FIELDS],
      service: "test-service",
    });
    const original = console.log;
    console.log = (line?: unknown) => {
      if (typeof line === "string") lines.push(line);
    };
    try {
      logger.info({ requestId: "a", operation: "health_live", secret: "nope" });
      logger.warn({
        requestId: "b",
        operation: "health_ready",
        safeOutcomeCode: "OK",
        httpStatus: 200,
        durationMs: 1,
        password: "hidden",
      });
      expect(lines).toHaveLength(1);
      const payload = JSON.parse(lines[0]!) as Record<string, unknown>;
      expect(payload.level).toBe("warn");
      expect(payload.service).toBe("test-service");
      expect(payload.requestId).toBe("b");
      expect(payload).not.toHaveProperty("password");
      expect(payload).not.toHaveProperty("secret");
    } finally {
      console.log = original;
    }
  });
});
