/**
 * Secret-safe workforce authentication errors (IMP-010).
 *
 * Never attach an email, password, IP, hash, cookie, session token, TOTP
 * code, backup code, user ID, or raw driver / Better Auth error.
 */

export type WorkforceAuthSafeIssue = Readonly<{
  key: string;
  message: string;
}>;

function formatIssues(issues: readonly WorkforceAuthSafeIssue[]): string {
  if (issues.length === 0) {
    return "Invalid workforce authentication configuration.";
  }
  const lines = issues.map((issue) => `- ${issue.key}: ${issue.message}`);
  return ["Invalid workforce authentication configuration:", ...lines].join("\n");
}

export class WorkforceAuthConfigurationError extends Error {
  readonly issues: readonly WorkforceAuthSafeIssue[];
  readonly code: string;

  constructor(
    issues: readonly WorkforceAuthSafeIssue[],
    code = "WORKFORCE_AUTH_CONFIGURATION_INVALID",
  ) {
    super(formatIssues(issues));
    this.name = "WorkforceAuthConfigurationError";
    this.issues = issues;
    this.code = code;
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, WorkforceAuthConfigurationError);
    }
  }

  toSafeJSON(): {
    name: string;
    message: string;
    code: string;
    issues: WorkforceAuthSafeIssue[];
  } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      issues: this.issues.map((issue) => ({ ...issue })),
    };
  }
}

export class WorkforceAuthServiceError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(details: {
    readonly message: string;
    readonly code: string;
    readonly httpStatus: number;
  }) {
    super(details.message);
    this.name = "WorkforceAuthServiceError";
    this.code = details.code;
    this.httpStatus = details.httpStatus;
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, WorkforceAuthServiceError);
    }
  }

  toSafeJSON(): {
    name: string;
    message: string;
    code: string;
    httpStatus: number;
  } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      httpStatus: this.httpStatus,
    };
  }
}
