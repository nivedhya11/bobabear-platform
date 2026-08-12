import { describe, expect, it } from "vitest";

import {
  WorkforceOperatorResetTokenBridge,
  WorkforceOperatorResetTokenBridgeError,
} from "./reset-token-bridge";

describe("WorkforceOperatorResetTokenBridge", () => {
  it("captures exactly one token for the expected identity", async () => {
    const bridge = new WorkforceOperatorResetTokenBridge({
      userId: "user-1",
      email: "Ops@Example.Test",
    });

    await bridge.sendResetPassword({
      user: { id: "user-1", email: "ops@example.test" },
      url: "http://localhost/reset",
      token: "raw-token-value",
    });

    await expect(bridge.waitForToken(50)).resolves.toBe("raw-token-value");
    bridge.clear();
  });

  it("fails closed on unexpected callback identity", async () => {
    const bridge = new WorkforceOperatorResetTokenBridge({
      userId: "user-1",
      email: "ops@example.test",
    });

    await expect(
      bridge.sendResetPassword({
        user: { id: "user-2", email: "ops@example.test" },
        url: "http://localhost/reset",
        token: "raw-token-value",
      }),
    ).rejects.toBeInstanceOf(WorkforceOperatorResetTokenBridgeError);

    await expect(bridge.waitForToken(20)).rejects.toMatchObject({
      code: "UNEXPECTED_RESET_CALLBACK_IDENTITY",
    });
  });

  it("fails closed when the callback is invoked more than once", async () => {
    const bridge = new WorkforceOperatorResetTokenBridge({
      userId: "user-1",
      email: "ops@example.test",
    });

    await bridge.sendResetPassword({
      user: { id: "user-1", email: "ops@example.test" },
      url: "http://localhost/reset",
      token: "first-token",
    });

    await expect(
      bridge.sendResetPassword({
        user: { id: "user-1", email: "ops@example.test" },
        url: "http://localhost/reset",
        token: "second-token",
      }),
    ).rejects.toMatchObject({ code: "RESET_TOKEN_ALREADY_CAPTURED" });
  });

  it("discards the in-memory token reference on clear()", async () => {
    const bridge = new WorkforceOperatorResetTokenBridge({
      userId: "user-1",
      email: "ops@example.test",
    });
    await bridge.sendResetPassword({
      user: { id: "user-1", email: "ops@example.test" },
      url: "http://localhost/reset",
      token: "raw-token-value",
    });
    await expect(bridge.waitForToken(50)).resolves.toBe("raw-token-value");
    bridge.clear();
    await expect(bridge.waitForToken(30)).rejects.toMatchObject({
      code: "RESET_TOKEN_MISSING",
    });
  });
});
