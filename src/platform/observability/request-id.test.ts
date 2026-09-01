import { describe, expect, it } from "vitest";

import { generateRequestId } from "./request-id";

describe("generateRequestId", () => {
  it("returns unique UUID-shaped identifiers", () => {
    const first = generateRequestId();
    const second = generateRequestId();
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(second).toMatch(/^[0-9a-f-]{36}$/);
    expect(first).not.toBe(second);
  });
});
