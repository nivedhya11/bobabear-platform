/**
 * Secret-safe customer phone OTP errors (IMP-009).
 *
 * Never attach a phone number, OTP, IP, hash, cookie, session token,
 * temporary email, provider credential, DLT identifier, or raw driver /
 * Better Auth / provider error.
 */

export type CustomerAuthSafeIssue = Readonly<{
  key: string;
  message: string;
}>;

function formatIssues(issues: readonly CustomerAuthSafeIssue[]): string {
  if (issues.length === 0) {
    return "Invalid customer phone authentication configuration.";
  }
  const lines = issues.map((issue) => `- ${issue.key}: ${issue.message}`);
  return ["Invalid customer phone authentication configuration:", ...lines].join(
    "\n",
  );
}

export class CustomerAuthConfigurationError extends Error {
  readonly issues: readonly CustomerAuthSafeIssue[];
  readonly code: string;

  constructor(
    issues: readonly CustomerAuthSafeIssue[],
    code = "CUSTOMER_AUTH_CONFIGURATION_INVALID",
  ) {
    super(formatIssues(issues));
    this.name = "CustomerAuthConfigurationError";
    this.issues = issues;
    this.code = code;
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, CustomerAuthConfigurationError);
    }
  }

  toSafeJSON(): {
    name: string;
    message: string;
    code: string;
    issues: CustomerAuthSafeIssue[];
  } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      issues: this.issues.map((issue) => ({ ...issue })),
    };
  }
}

export class CustomerOtpProviderError extends Error {
  readonly code: string;

  constructor(
    message: string,
    code = "CUSTOMER_OTP_PROVIDER_UNAVAILABLE",
  ) {
    super(message);
    this.name = "CustomerOtpProviderError";
    this.code = code;
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, CustomerOtpProviderError);
    }
  }

  toSafeJSON(): { name: string; message: string; code: string } {
    return { name: this.name, message: this.message, code: this.code };
  }
}

export class CustomerAuthServiceError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(details: {
    readonly message: string;
    readonly code: string;
    readonly httpStatus: number;
  }) {
    super(details.message);
    this.name = "CustomerAuthServiceError";
    this.code = details.code;
    this.httpStatus = details.httpStatus;
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, CustomerAuthServiceError);
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
