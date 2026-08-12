/**
 * In-process password-reset token bridge for workforce operator CLIs
 * (IMP-010 supported credential flow).
 *
 * Captures the raw Better Auth reset token from `sendResetPassword` in
 * memory only for the currently executing CLI operation. Never logs,
 * prints, persists, or returns the token outside this process.
 */
import "server-only";

export const WORKFORCE_OPERATOR_RESET_TOKEN_WAIT_MS = 5_000;

export class WorkforceOperatorResetTokenBridgeError extends Error {
  readonly code:
    | "UNEXPECTED_RESET_CALLBACK_IDENTITY"
    | "RESET_TOKEN_ALREADY_CAPTURED"
    | "RESET_TOKEN_WAIT_TIMEOUT"
    | "RESET_TOKEN_MISSING";

  constructor(
    code: WorkforceOperatorResetTokenBridgeError["code"],
    message: string,
  ) {
    super(message);
    this.name = "WorkforceOperatorResetTokenBridgeError";
    this.code = code;
  }
}

export type WorkforceOperatorResetPasswordCallbackInput = Readonly<{
  user: { id: string; email: string };
  url: string;
  token: string;
}>;

/**
 * Single-shot, fail-closed token capture for one operator reset operation.
 * Construct a fresh bridge per CLI invocation.
 */
export class WorkforceOperatorResetTokenBridge {
  private readonly expectedUserId: string;
  private readonly expectedEmail: string;
  private token: string | undefined;
  private discarded = false;
  private settle:
    | { resolve: (token: string) => void; reject: (error: Error) => void }
    | undefined;
  private readonly waitPromise: Promise<string>;

  constructor(expected: Readonly<{ userId: string; email: string }>) {
    this.expectedUserId = expected.userId;
    this.expectedEmail = expected.email.toLowerCase();
    this.waitPromise = new Promise<string>((resolve, reject) => {
      this.settle = { resolve, reject };
    });
    // Prevent an unhandled rejection if the CLI never awaits the wait.
    this.waitPromise.catch(() => undefined);
  }

  /**
   * Better Auth `emailAndPassword.sendResetPassword` callback. Does not
   * send email — only captures the token for the in-process reset.
   */
  readonly sendResetPassword = async (
    data: WorkforceOperatorResetPasswordCallbackInput,
  ): Promise<void> => {
    const email = typeof data.user?.email === "string" ? data.user.email.toLowerCase() : "";
    const userId = typeof data.user?.id === "string" ? data.user.id : "";
    if (userId !== this.expectedUserId || email !== this.expectedEmail) {
      const error = new WorkforceOperatorResetTokenBridgeError(
        "UNEXPECTED_RESET_CALLBACK_IDENTITY",
        "Password-reset callback received an unexpected workforce identity.",
      );
      this.settle?.reject(error);
      this.settle = undefined;
      throw error;
    }
    if (this.token !== undefined || this.discarded) {
      const error = new WorkforceOperatorResetTokenBridgeError(
        "RESET_TOKEN_ALREADY_CAPTURED",
        "Password-reset callback invoked more than once for this operation.",
      );
      this.settle?.reject(error);
      this.settle = undefined;
      throw error;
    }
    if (typeof data.token !== "string" || data.token.length === 0) {
      const error = new WorkforceOperatorResetTokenBridgeError(
        "RESET_TOKEN_MISSING",
        "Password-reset callback did not supply a token.",
      );
      this.settle?.reject(error);
      this.settle = undefined;
      throw error;
    }
    this.token = data.token;
    this.settle?.resolve(data.token);
    this.settle = undefined;
  };

  /**
   * Wait until Better Auth delivers the token (synchronous await path or
   * a short bounded wait if delivery is deferred). Never returns the token
   * to callers that log it — CLI code must pass it straight into
   * `resetPassword` and then {@link clear}.
   */
  async waitForToken(
    timeoutMs: number = WORKFORCE_OPERATOR_RESET_TOKEN_WAIT_MS,
  ): Promise<string> {
    if (this.discarded) {
      throw new WorkforceOperatorResetTokenBridgeError(
        "RESET_TOKEN_MISSING",
        "Password-reset token was cleared and is no longer available.",
      );
    }
    if (this.token !== undefined) {
      return this.token;
    }
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        this.waitPromise,
        new Promise<string>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(
              new WorkforceOperatorResetTokenBridgeError(
                "RESET_TOKEN_WAIT_TIMEOUT",
                "Timed out waiting for the password-reset token callback.",
              ),
            );
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  }

  /** Discard the in-memory token reference after the reset completes. */
  clear(): void {
    this.token = undefined;
    this.discarded = true;
  }
}
