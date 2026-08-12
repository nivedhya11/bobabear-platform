/**
 * Secret-safe configuration error.
 *
 * `ConfigurationError` deliberately never carries raw environment values,
 * raw Zod issues, or a full serialized source object. It only carries a
 * short list of `{ key, message }` pairs that are safe to log, print on a
 * CLI, or attach to a startup-failure state.
 */

export interface SafeConfigIssue {
  /** The offending variable/field name (e.g. "BOBA_BEAR_PUBLIC_ORIGIN"). */
  readonly key: string;
  /** A short, human-readable, value-free description of the problem. */
  readonly message: string;
}

export class ConfigurationError extends Error {
  readonly issues: readonly SafeConfigIssue[];

  constructor(issues: readonly SafeConfigIssue[]) {
    const summary = ConfigurationError.formatIssues(issues);
    super(summary);
    this.name = "ConfigurationError";
    this.issues = issues;

    // Keep the stack trace value-free: it points at this constructor, not
    // at arbitrary call sites carrying raw input.
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, ConfigurationError);
    }
  }

  private static formatIssues(issues: readonly SafeConfigIssue[]): string {
    if (issues.length === 0) {
      return "Invalid application configuration.";
    }
    const lines = issues.map((issue) => `- ${issue.key}: ${issue.message}`);
    return ["Invalid application configuration:", ...lines].join("\n");
  }

  /** Safe, serializable representation — no raw values, no Zod internals. */
  toSafeJSON(): { name: string; message: string; issues: SafeConfigIssue[] } {
    return {
      name: this.name,
      message: this.message,
      issues: this.issues.map((issue) => ({ ...issue })),
    };
  }
}
